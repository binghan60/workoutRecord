import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useAuthStore } from './auth'
import { createDataService } from '@/utils/dataService'
import { db } from '@/utils/db'
import apiClient from '@/api'

const toast = useToast()
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
    try {
      const data = await templateService.value.fetchAll()
      templates.value = data
    } catch (error) {
      toast.error('無法載入課表範本')
    }
  }

  async function addTemplate(templateData) {
    try {
      const newTemplate = await templateService.value.add(templateData)
      templates.value.unshift(newTemplate)
      toast.success(`課表 "${templateData.name}" 已建立！`)
    } catch (error) {
      toast.error(error.response?.data?.message || '建立課表失敗')
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
    try {
      const deletedTemplateName = templates.value.find(t => t._id === templateId)?.name || '範本'
      await templateService.value.delete(templateId)
      templates.value = templates.value.filter((t) => t._id !== templateId)
      
      let scheduleNeedsUpdate = false
      for (const day in schedule.value) {
        const initialLength = schedule.value[day]?.length || 0
        schedule.value[day] = schedule.value[day]?.filter(t => t._id !== templateId)
        if(schedule.value[day]?.length < initialLength) {
          scheduleNeedsUpdate = true
        }
      }
      if(scheduleNeedsUpdate) {
        await updateScheduleOnBackend()
      }

      toast.success(`課表 "${deletedTemplateName}" 已刪除！`)
    } catch (error) {
      toast.error(error.response?.data?.message || '刪除課表失敗')
    }
  }

  // --- DEDICATED SCHEDULE LOGIC ---

  async function fetchSchedule() {
    if (authStore.isGuest) {
        const guestScheduleIds = JSON.parse(localStorage.getItem('guest_schedule')) || {}
        const guestTemplates = JSON.parse(localStorage.getItem('guest_templates')) || []
        const populatedSchedule = {}
        for (const day in guestScheduleIds) {
            populatedSchedule[day] = guestScheduleIds[day]
            .map((id) => guestTemplates.find((t) => t._id === id))
            .filter(Boolean)
        }
        schedule.value = populatedSchedule
        return
    }

    if (navigator.onLine) {
        try {
            const response = await apiClient.get('/schedule')
            const scheduleData = response.data.data || response.data || {}
            // Use .put() to save the single schedule object with a fixed key
            await db.schedules.put({ _id: SCHEDULE_DB_KEY, ...scheduleData })
            schedule.value = scheduleData
        } catch (error) {
            toast.error('無法從伺服器載入訓練排程，嘗試從本地讀取。')
            const localSchedule = await db.schedules.get(SCHEDULE_DB_KEY)
            schedule.value = localSchedule || {}
        }
    } else {
        const localSchedule = await db.schedules.get(SCHEDULE_DB_KEY)
        schedule.value = localSchedule || {}
    }
  }

  async function updateScheduleOnBackend() {
    const idOnlySchedule = {}
    for (const day in schedule.value) {
      if (Array.isArray(schedule.value[day])) {
        idOnlySchedule[day] = schedule.value[day].map((template) => template._id || template)
      }
    }

    if (authStore.isGuest) {
      localStorage.setItem('guest_schedule', JSON.stringify(idOnlySchedule))
      return
    }

    const scheduleToSave = { _id: SCHEDULE_DB_KEY, ...schedule.value }
    await db.schedules.put(scheduleToSave) // Optimistic update to local DB

    if (!navigator.onLine) {
        console.log("Offline: Queuing schedule update.")
        await db.sync_queue.put({
            id: 'singleton_schedule_update',
            action: 'update',
            endpoint: '/schedule',
            payload: idOnlySchedule,
            timestamp: new Date().toISOString()
        })
        return 
    }

    try {
      const response = await apiClient.put('/schedule', idOnlySchedule)
      const updatedScheduleData = response.data.data || response.data
      await db.schedules.put({ _id: SCHEDULE_DB_KEY, ...updatedScheduleData })
      schedule.value = updatedScheduleData
    } catch (error) {
      toast.error('更新排程失敗')
    }
  }

  // --- END DEDICATED SCHEDULE LOGIC ---

  function addTemplateToSchedule(day, templateId) {
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
    updateScheduleOnBackend()
  }

  function removeTemplateFromSchedule(day, index) {
    if (!schedule.value[day] || schedule.value[day][index] === undefined) return
    const template = schedule.value[day][index]
    schedule.value[day].splice(index, 1)
    toast.info(`已從 ${day} 的排程中移除 "${template.name}"`)
    updateScheduleOnBackend()
  }

  function updateScheduleOrder(day, oldIndex, newIndex) {
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
    addTemplateToSchedule,
    removeTemplateFromSchedule,
    updateScheduleOrder,
    removeExerciseFromAllTemplates,
  }
})