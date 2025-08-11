import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useModalStore } from './modal'
import { useAuthStore } from './auth'
import { createDataService } from '@/utils/dataService'

const toast = useToast()

export const useBodyMetricsStore = defineStore('bodyMetrics', () => {
  // --- Helpers: robust same-day comparison without timezone pitfalls ---
  const pad2 = (n) => String(n).padStart(2, '0')
  const toDayKey = (value) => {
    if (!value) return ''
    // If it's a plain date string (YYYY-MM-DD), treat it as that day directly
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    // Otherwise, parse and use LOCAL components so it matches how backend saved local-midnight dates
    const d = new Date(value)
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  }

  const records = ref([])
  const modalStore = useModalStore()
  const authStore = useAuthStore()

  // --- Data Service ---
  const dataService = computed(() =>
    createDataService(authStore, {
      storageKey: 'guest_body_metrics',
      apiEndpoint: '/body-metrics',
      dbTable: 'bodyMetrics',
    }),
  )
  // ---

  const sortedRecords = computed(() => {
    return [...records.value].sort((a, b) => new Date(b.date) - new Date(a.date))
  })

  async function fetchRecords(forceRefresh = false) {
    // Skip if data already exists unless forced refresh
    if (!forceRefresh && records.value.length > 0) {
      return
    }
    try {
      const data = await dataService.value.fetchAll()
      records.value = data
    } catch (error) {
      toast.error('無法載入身體數值紀錄')
    }
  }

  async function saveOrUpdateRecord(record) {
    const recordDateStr = toDayKey(record.date)
    console.log('[BodyMetrics] recordDateStr:', recordDateStr)
    console.log('[BodyMetrics] records length:', records.value.length)
    console.log('[BodyMetrics] dayKeys in store:', records.value.map(r => toDayKey(r.date)))
    const existingRecord = records.value.find((r) => toDayKey(r.date) === recordDateStr)
    console.log('[BodyMetrics] matched existingRecord?', !!existingRecord)

    const saveAction = async () => {
      console.log('[BodyMetrics] saveAction -> existingRecord:', existingRecord)
      console.log('[BodyMetrics] saveAction -> payload:', record)

      try {
        // Guest mode: update existing record in localStorage to prevent duplicates
        const isGuest = dataService.value.isGuest
        let result
        if (existingRecord) {
          // 前端已確認要覆蓋同日紀錄：
          // - 訪客模式：更新 localStorage
          // - 登入模式：呼叫 PUT /body-metrics/:id 以覆蓋同日紀錄
          if (isGuest) {
            result = await dataService.value.update(existingRecord._id, record)
          } else {
            result = await dataService.value.update(existingRecord._id, record)
          }
        } else {
          // 新增
          result = await dataService.value.add(record)
        }

        // Optimistically update or add the record in the local state
        const index = records.value.findIndex((r) => r._id === (result._id || existingRecord?._id) || new Date(r.date).toISOString().split('T')[0] === recordDateStr)
        if (index !== -1) {
          // Preserve original _id when merging
          const preservedId = records.value[index]._id
          records.value[index] = { ...records.value[index], ...result, _id: preservedId }
        } else {
          records.value.push(result)
        }
        toast.success('身體數值已成功儲存！')
        modalStore.hideBodyMetricsModal()
      } catch (error) {
        toast.error(error.response?.data?.message || '儲存身體數值失敗')
      }
    }

    if (existingRecord) {
      const conflictingKeys = Object.keys(record).filter((key) => key !== 'date' && existingRecord[key] != null && record[key] != null)

      if (conflictingKeys.length > 0) {
        // Show confirmation modal to overwrite
        // This part remains the same
        const metricLabels = { weight: '體重 (kg)', bodyFat: '體脂 (%)', chest: '胸圍 (cm)', waist: '腰圍 (cm)', shoulder: '肩寬 (cm)', arm: '手臂 (cm)', thigh: '大腿 (cm)' }
        let comparisonHtml = `您在 <b>${recordDateStr}</b> 的以下紀錄已存在，確定要覆蓋嗎？<br/><br/>`
        comparisonHtml += '<table style="width: 100%; text-align: left; border-collapse: collapse;">'
        comparisonHtml += '<tr style="background-color: #4eb7ac26;"><th style="padding: 8px;">指標</th><th style="padding: 8px;">舊數值</th><th style="padding: 8px;">新數值</th></tr>'
        for (const key of conflictingKeys) {
          const label = metricLabels[key] || key
          const oldValue = existingRecord[key]
          const newValue = record[key]
          comparisonHtml += `<tr><td style="padding: 8px;">${label}</td><td style="padding: 8px;">${oldValue}</td><td style="padding: 8px;"><b>${newValue}</b></td></tr>`
        }
        comparisonHtml += '</table>'
        modalStore.showConfirmation('確認取代資料', comparisonHtml, saveAction)
      } else {
        await saveAction()
      }
    } else {
      await saveAction()
    }
  }

  async function deleteRecord(id) {
    try {
      await dataService.value.delete(id)
      const index = records.value.findIndex((r) => r._id === id)
      if (index !== -1) {
        records.value.splice(index, 1)
        toast.success('紀錄已刪除！')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || '刪除紀錄失敗')
    }
  }

  return { records: sortedRecords, fetchRecords, saveOrUpdateRecord, deleteRecord }
})
