import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useAuthStore } from './auth'
import { createDataService } from '@/utils/dataService'
import { db, initializeDB } from '@/utils/db'
import apiClient from '@/api'

const toast = useToast()

// Debug helper (enable by running: localStorage.setItem('debug_sync', 'true'))
const __isDebugEnabled = () => {
  try { return JSON.parse(localStorage.getItem('debug_sync') ?? 'false') } catch { return !!localStorage.getItem('debug_sync') }
}
const dlog = (...args) => { if (__isDebugEnabled()) console.log('[DEBUG][template]', ...args) }
const SCHEDULE_DB_KEY = 'currentUserSchedule' // Use a fixed key for the single schedule object

export const useTemplateStore = defineStore('template', () => {
  const templates = ref([])
  const schedule = ref({})
  const daysOfWeek = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
  const authStore = useAuthStore()

  const templateService = computed(() => createDataService(authStore, {
    storageKey: 'guest_templates',
    apiEndpoint: '/templates',
    dbTable: 'templates'
  }))

  const getTemplateById = computed(() => {
    return (templateId) => templates.value.find((t) => t._id === templateId)
  })

  async function fetchTemplates() {
    dlog('fetchTemplates: start', { isGuest: authStore.isGuest, online: navigator.onLine })
    try {
      const data = await templateService.value.fetchAll()
      templates.value = data
      console.log(`✅ Fetched ${data.length} templates`)
    } catch (error) {
      console.error('❌ Failed to fetch templates:', error)
      toast.error('無法載入課表範本')
      // 確保即使出錯也有空陣列
      templates.value = []
    }
  }

  async function addTemplate(templateData) {
    dlog('addTemplate: called', { templateData, online: navigator.onLine, isGuest: authStore.isGuest })
    try {
      console.log('📋 Creating template with data:', templateData)
      console.log('🌐 Network status:', navigator.onLine ? 'Online' : 'Offline')
      console.log('👤 Auth mode:', authStore.isGuest ? 'Guest' : 'Registered User')
      
      const newTemplate = await templateService.value.add(templateData)
      templates.value.unshift(newTemplate)
      toast.success(`課表 "${templateData.name}" 已建立！`)
      console.log('✅ Template created successfully:', newTemplate)
      return newTemplate
    } catch (error) {
      console.error('❌ Failed to create template:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      })
      // 不在這裡顯示 toast，讓調用者處理
      throw error
    }
  }

  async function updateTemplate(templateId, templateData) {
    try {
      const updatedTemplate = await templateService.value.update(templateId, templateData)
      const index = templates.value.findIndex((t) => t._id === templateId)
      if (index !== -1) {
        templates.value[index] = updatedTemplate
      }
      await fetchSchedule()
      toast.success(`課表 "${templateData.name}" 已更新！`)
    } catch (error) {
      toast.error(error.response?.data?.message || '更新課表失敗')
    }
  }

  async function deleteTemplate(templateId) {
    // Optimistic local removal first to avoid flicker
    const toDelete = templates.value.find(t => t._id === templateId)
    templates.value = templates.value.filter((t) => t._id !== templateId)
    try {
      console.log('🗑️ Deleting template:', templateId)
      console.log('🌐 Network status:', navigator.onLine ? 'Online' : 'Offline')
      
      const deletedTemplateName = templates.value.find(t => t._id === templateId)?.name || '範本'
      await templateService.value.delete(templateId)
      // Notify local-data-changed with delete action to prevent refetch flicker
      try { window.dispatchEvent(new CustomEvent('rovodev:local-data-changed', { detail: { table: 'templates', action: 'delete', id: templateId } })) } catch {}
      templates.value = templates.value.filter((t) => t._id !== templateId)
      
      let scheduleNeedsUpdate = false
      for (const day in schedule.value) {
        // 確保 schedule.value[day] 是陣列
        if (!Array.isArray(schedule.value[day])) {
          continue
        }
        
        const initialLength = schedule.value[day].length
        schedule.value[day] = schedule.value[day].filter(t => t._id !== templateId)
        if(schedule.value[day].length < initialLength) {
          scheduleNeedsUpdate = true
        }
      }
      if(scheduleNeedsUpdate) {
        // Persist schedule immediately for offline and to make UI consistent
        try {
          await initializeDB()
          const cleanSchedule = JSON.parse(JSON.stringify(schedule.value))
          await db.schedules.put({ _id: SCHEDULE_DB_KEY, ...cleanSchedule, userId: authStore.user?._id || 'guest' })
        } catch (e) { console.warn('Failed to persist schedule after template delete:', e) }
        await updateScheduleOnBackend()
      }

      toast.success(`課表 "${deletedTemplateName}" 已刪除！`)
      console.log('✅ Template deleted successfully:', templateId)
    } catch (error) {
      console.error('❌ Failed to delete template:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      })
      toast.error(error.response?.data?.message || error.message || '刪除課表失敗')
    }
  }

  // --- DEDICATED SCHEDULE LOGIC ---

  async function fetchSchedule() {
     dlog('fetchSchedule: start', { isGuest: authStore.isGuest, online: navigator.onLine })
     // Helper: read schedule from IndexedDB using fixed key, with migration fallback
     const readScheduleFromIDB = async () => {
       // Ensure DB ready
       await initializeDB()
       let record = await db.schedules.get(SCHEDULE_DB_KEY)
       if (!record) {
         // Migration path: find any existing schedule record saved with a different key (e.g., server _id)
         const all = await db.schedules.toArray()
         if (all && all.length > 0) {
           // Prefer the most recently updated/created one if metadata exists
           const pick = all.reduce((best, cur) => {
             const bestTs = new Date(best.updatedAt || best.createdAt || 0).getTime()
             const curTs = new Date(cur.updatedAt || cur.createdAt || 0).getTime()
             return curTs > bestTs ? cur : best
           }, all[0])
           // Normalize into fixed-key record, preserve remote id
           const { _id: legacyId, remoteId: legacyRemote, ...fields } = pick
           await db.schedules.put({ _id: SCHEDULE_DB_KEY, ...fields, remoteId: legacyRemote || legacyId })
           record = await db.schedules.get(SCHEDULE_DB_KEY)
         }
       }
       if (!record) return {}
       // Strip db-only properties when hydrating into store
       const { _id, remoteId, ...scheduleFields } = record
       return scheduleFields
     }
    if (authStore.isGuest) {
        const guestScheduleIds = JSON.parse(localStorage.getItem('guest_schedule')) || {}
        const guestTemplates = JSON.parse(localStorage.getItem('guest_templates')) || []
        const populatedSchedule = {}
        
        console.log('📅 Guest schedule IDs:', guestScheduleIds)
        console.log('📋 Guest templates:', guestTemplates.length, 'items')
        
        for (const day in guestScheduleIds) {
            populatedSchedule[day] = guestScheduleIds[day]
            .map((id) => {
                const template = guestTemplates.find((t) => t._id === id)
                if (!template) {
                    console.warn(`⚠️ Template with ID ${id} not found for ${day}`)
                }
                return template
            })
            .filter(Boolean)
        }
        schedule.value = populatedSchedule
        console.log('✅ Guest schedule populated:', populatedSchedule)
        return
    }

    // 確保資料庫已初始化
    await initializeDB()

    if (navigator.onLine) {
        dlog('fetchSchedule: online -> fetching /schedule')
        try {
            const response = await apiClient.get('/schedule')
            const scheduleData = response.data.data || response.data || {}
            // Ensure we don't overwrite the fixed key with the server's _id
            const { _id: remoteId, ...scheduleFields } = scheduleData
            await db.schedules.put({ _id: SCHEDULE_DB_KEY, ...scheduleFields, remoteId, userId: authStore.user?._id || 'guest' })
            schedule.value = scheduleFields
            console.log('✅ Schedule fetched from server and cached')
        } catch (error) {
            console.warn('Failed to fetch schedule from server, falling back to local data')
            const localSchedule = await readScheduleFromIDB()
            schedule.value = localSchedule
        }
    } else {
        dlog('fetchSchedule: offline -> reading IndexedDB')
        console.log('Offline: Reading schedule from IndexedDB')
        const localSchedule = await readScheduleFromIDB()
        schedule.value = localSchedule
    }
  }

  async function updateScheduleOnBackend(options = {}) {
    const { waitForServer = false } = options
    dlog('updateScheduleOnBackend: start', { isGuest: authStore.isGuest, online: navigator.onLine })

    // Ensure DB for id_map lookups and local schedule read
    try { await initializeDB() } catch (e) { dlog('updateScheduleOnBackend: initializeDB error', e) }

    // Snapshot current in-memory schedule
    try { dlog('updateScheduleOnBackend: store schedule snapshot', JSON.parse(JSON.stringify(schedule.value))) } catch {}

    // Read local cached schedule record (may contain entries not in memory yet)
    let localRecord = null
    try {
      localRecord = await db.schedules.get(SCHEDULE_DB_KEY)
      try { dlog('updateScheduleOnBackend: local record snapshot', JSON.parse(JSON.stringify(localRecord))) } catch {}
    } catch (e) {
      dlog('updateScheduleOnBackend: failed to read local schedule record', e)
    }

    // Helper to map possibly-offline ID to server ID
    const mapId = async (id) => {
      if (!id) return null
      const s = String(id)
      if (s.startsWith('offline_') || s.startsWith('temp_')) {
        try {
          const map = await db.id_map.get(s)
          if (map?.serverId) {
            dlog('updateScheduleOnBackend: id mapped', { from: s, to: map.serverId })
          } else {
            dlog('updateScheduleOnBackend: id not mapped yet', s)
          }
          return map?.serverId || null
        } catch (e) {
          dlog('updateScheduleOnBackend: id_map lookup error', s, e)
          return null
        }
      }
      return s
    }

    // Merge day keys from in-memory and local record
    const keysFrom = (obj) => Object.keys(obj || {}).filter(k => !['_id','userId','remoteId','createdAt','updatedAt'].includes(k))
    const days = Array.from(new Set([...keysFrom(schedule.value), ...keysFrom(localRecord)]))
    dlog('updateScheduleOnBackend: days to process', days)

    const collect = (arr) => {
      const out = []
      if (!Array.isArray(arr)) return out
      for (const entry of arr) {
        out.push(typeof entry === 'object' ? entry._id : entry)
      }
      return out
    }

    const idOnlySchedule = {}
    const unresolvedByDay = {}

    for (const day of days) {
      const storeIds = collect(schedule.value?.[day])
      const localIds = collect(localRecord?.[day])
      // Base on in-memory store (source of truth). Only consider localRecord entries
      // that represent unsynced offline/temp IDs to avoid resurrecting removed items.
      const combined = [...storeIds]
      for (const lid of localIds) {
        const s = String(lid)
        if ((s.startsWith('offline_') || s.startsWith('temp_')) && !combined.includes(lid)) {
          combined.push(lid)
        }
      }
      const mappedIds = []
      for (const id of combined) {
        const mapped = await mapId(id)
        if (mapped && !mapped.toString().startsWith('offline_') && !mapped.toString().startsWith('temp_')) {
          if (!mappedIds.includes(mapped)) mappedIds.push(mapped)
        } else if (!mapped) {
          if (!unresolvedByDay[day]) unresolvedByDay[day] = []
          if (!unresolvedByDay[day].includes(id)) unresolvedByDay[day].push(id)
        }
      }
      // Always include the day, even if empty, so backend can clear removed entries
      idOnlySchedule[day] = mappedIds
      dlog('updateScheduleOnBackend: day result', { day, storeIds, localIds, combined, mappedIds, unresolved: unresolvedByDay[day] || [] })
    }

    dlog('updateScheduleOnBackend: final payload', idOnlySchedule)

    if (authStore.isGuest) {
      localStorage.setItem('guest_schedule', JSON.stringify(idOnlySchedule))
      console.log('✅ Guest schedule saved:', idOnlySchedule)
      return
    }

    // Optimistic save of current schedule state (unmapped entries remain locally)
    try {
      const cleanSchedule = JSON.parse(JSON.stringify(schedule.value))
      const scheduleToSave = { _id: SCHEDULE_DB_KEY, ...cleanSchedule, userId: authStore.user?._id || 'guest' }
      await db.schedules.put(scheduleToSave)
    } catch (e) {
      dlog('updateScheduleOnBackend: failed to persist local schedule snapshot', e)
    }

    if (!navigator.onLine) {
        console.log("🔌 Offline: Queuing schedule update for endpoint: /schedule")
        console.log("📋 Schedule payload:", idOnlySchedule)
        try {
          const job = {
              action: 'update',
              endpoint: '/schedule',
              payload: idOnlySchedule,
              timestamp: new Date().toISOString()
          }
          await db.sync_queue.add(job);
          console.log('📤 Schedule job added to sync queue:', job)
          
          // Trigger sync queue count update
          try { window.dispatchEvent(new CustomEvent('rovodev:sync-queue-changed')) } catch {}
        } catch (queueError) {
          console.error('❌ Failed to queue schedule update for sync:', queueError)
        }
        return 
    }

    // Online: background sync for better UX
    const putPromise = apiClient.put('/schedule', idOnlySchedule, { headers: { 'X-Background-Sync': 'true' } })
      .then(async (response) => {
        const updatedScheduleData = response.data.data || response.data
        const { _id: remoteId, ...scheduleFields } = updatedScheduleData
        await db.schedules.put({ _id: SCHEDULE_DB_KEY, ...scheduleFields, remoteId })
        dlog('updateScheduleOnBackend: server updated OK, cached', { remoteId })
      })
      .catch(async (error) => {
        console.error('❌ Failed to update schedule online, queuing for retry:', error)
        try {
          const retryJob = {
            action: 'update',
            endpoint: '/schedule',
            payload: idOnlySchedule,
            timestamp: new Date().toISOString()
          }
          await db.sync_queue.add(retryJob)
          console.log('📤 Schedule retry job added to sync queue:', retryJob)
          
          // Trigger sync queue count update
          try { window.dispatchEvent(new CustomEvent('rovodev:sync-queue-changed')) } catch {}
        } catch (e) {
          console.error('❌ Failed to enqueue schedule update:', e)
        }
      })

    if (waitForServer) {
      try {
        const res = await putPromise
        const updatedScheduleData = res.data.data || res.data
        const { _id: remoteId, ...scheduleFields } = updatedScheduleData
        schedule.value = scheduleFields
        try {
          await db.schedules.put({ _id: SCHEDULE_DB_KEY, ...scheduleFields, remoteId, userId: authStore.user?._id || 'guest' })
        } catch {}
      } catch (e) {
        console.warn('waitForServer: schedule update failed, UI will stay optimistic', e)
      }
    }
  }

  // --- END DEDICATED SCHEDULE LOGIC ---

  async function addTemplateToSchedule(day, templateId) {
    if (!day || !templateId) return
    const template = getTemplateById.value(templateId)
    if (!template) return

    if (!schedule.value[day]) {
      schedule.value[day] = []
    }

    const currentIds = schedule.value[day].map((t) => t._id)
    if (currentIds.includes(templateId)) {
      toast.warning('這個課表已經在排程中了')
      return
    }

    schedule.value[day].push(template)
    toast.success(`已將 "${template.name}" 加入 ${day} 的排程`)
    // Optimistic local save to ensure offline refresh persists immediately
    try {
      await initializeDB()
      const cleanSchedule = JSON.parse(JSON.stringify(schedule.value))
      await db.schedules.put({ _id: SCHEDULE_DB_KEY, ...cleanSchedule, userId: authStore.user?._id || 'guest' })
    } catch (e) {
      console.warn('Failed to persist schedule locally after add:', e)
    }
    updateScheduleOnBackend()
  }

  async function removeTemplateFromSchedule(day, index) {
    if (!schedule.value[day] || schedule.value[day][index] === undefined) return
    const template = schedule.value[day][index]
    schedule.value[day].splice(index, 1)
    toast.info(`已從 ${day} 的排程中移除 "${template.name}"`)
    // Persist immediately for offline refresh
    try {
      await initializeDB()
      const cleanSchedule = JSON.parse(JSON.stringify(schedule.value))
      await db.schedules.put({ _id: SCHEDULE_DB_KEY, ...cleanSchedule, userId: authStore.user?._id || 'guest' })
    } catch (e) {
      console.warn('Failed to persist schedule locally after remove:', e)
    }
    updateScheduleOnBackend()
  }

  async function updateScheduleOrder(day, oldIndex, newIndex) {
    if (!schedule.value[day]) return
    const [movedItem] = schedule.value[day].splice(oldIndex, 1)
    schedule.value[day].splice(newIndex, 0, movedItem)
    updateScheduleOnBackend()
  }

  async function removeExerciseFromAllTemplates(exerciseId) {
    templates.value.forEach((template) => {
      const initialLength = template.exercises.length
      template.exercises = template.exercises.filter((ex) => ex.exercise !== exerciseId)
      if (template.exercises.length < initialLength) {
        updateTemplate(template._id, template)
      }
    })
  }

  return {
    templates,
    schedule,
    daysOfWeek,
    getTemplateById,
    fetchTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    fetchSchedule,
    updateScheduleOnBackend,
    addTemplateToSchedule,
    removeTemplateFromSchedule,
    updateScheduleOrder,
    removeExerciseFromAllTemplates,
  }
})