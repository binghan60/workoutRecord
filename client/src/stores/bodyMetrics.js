import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useModalStore } from './modal'
import { useAuthStore } from './auth'
import { createDataService } from '@/utils/dataService'

const toast = useToast()

export const useBodyMetricsStore = defineStore('bodyMetrics', () => {
  const records = ref([])
  const modalStore = useModalStore()
  const authStore = useAuthStore()

  // --- Data Service ---
  const dataService = computed(() => createDataService(authStore, {
    storageKey: 'guest_body_metrics',
    apiEndpoint: '/body-metrics',
    dbTable: 'bodyMetrics'
  }))
  // ---

  const sortedRecords = computed(() => {
    return [...records.value].sort((a, b) => new Date(b.date) - new Date(a.date))
  })

  async function fetchRecords() {
    try {
      const data = await dataService.value.fetchAll()
      records.value = data
    } catch (error) {
      toast.error('無法載入身體數值紀錄')
    }
  }

  async function addRecord(record) {
    const recordDateStr = new Date(record.date).toISOString().split('T')[0]

    const existingRecord = records.value.find((r) => {
      const existingDateStr = new Date(r.date).toISOString().split('T')[0]
      return existingDateStr === recordDateStr
    })

    const saveAction = async () => {
      try {
        const result = await dataService.value.add(record)
        // Optimistically update or add the record in the local state
        const index = records.value.findIndex(r => r._id === result._id || new Date(r.date).toISOString().split('T')[0] === recordDateStr)
        if (index !== -1) {
          records.value[index] = { ...records.value[index], ...result }
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

  return { records: sortedRecords, fetchRecords, addRecord, deleteRecord }
})
