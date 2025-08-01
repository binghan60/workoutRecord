import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useToast } from 'vue-toastification'
import { useModalStore } from './modal'
import { useAuthStore } from './auth'
import apiClient from '@/api'

const toast = useToast()
const GUEST_RECORDS_KEY = 'guest_body_metrics'

export const useBodyMetricsStore = defineStore('bodyMetrics', () => {
  const records = ref([])
  const modalStore = useModalStore()
  const authStore = useAuthStore()

  async function fetchRecords() {
    if (authStore.isGuest) {
      const guestData = JSON.parse(localStorage.getItem(GUEST_RECORDS_KEY)) || []
      records.value = guestData
      return
    }
    try {
      const response = await apiClient.get('/body-metrics')
      records.value = response.data
    } catch (error) {
      toast.error('無法載入身體數值紀錄')
    }
  }

  async function addRecord(record) {
    const recordDateStr = record.date.split('T')[0]

    const existingRecord = records.value.find((r) => {
      const existingDateStr = new Date(r.date).toISOString().split('T')[0]
      return existingDateStr === recordDateStr
    })

    const saveAction = async () => {
      if (authStore.isGuest) {
        const guestData = JSON.parse(localStorage.getItem(GUEST_RECORDS_KEY)) || []
        const existingRecordIndex = guestData.findIndex((r) => new Date(r.date).toISOString().split('T')[0] === recordDateStr)

        if (existingRecordIndex !== -1) {
          const updatedRecord = { ...guestData[existingRecordIndex], ...record }
          guestData[existingRecordIndex] = updatedRecord
        } else {
          guestData.push({ ...record, _id: `guest_${new Date().getTime()}` })
        }
        localStorage.setItem(GUEST_RECORDS_KEY, JSON.stringify(guestData))
        await fetchRecords()
        toast.success('身體數值已成功儲存！')
        modalStore.hideBodyMetricsModal()
        return
      }

      try {
        await apiClient.post('/body-metrics', record)
        await fetchRecords()
        toast.success('身體數值已成功儲存！')
        modalStore.hideBodyMetricsModal()
      } catch (error) {
        toast.error(error.response?.data?.message || '儲存身體數值失敗')
      }
    }

    if (existingRecord) {
      const conflictingKeys = Object.keys(record).filter((key) => key !== 'date' && existingRecord[key] != null && record[key] != null)

      if (conflictingKeys.length > 0) {
        const metricLabels = {
          weight: '體重 (kg)',
          bodyFat: '體脂 (%)',
          chest: '胸圍 (cm)',
          waist: '腰圍 (cm)',
          shoulder: '肩寬 (cm)',
          arm: '手臂 (cm)',
          thigh: '大腿 (cm)',
        }

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
    if (authStore.isGuest) {
      const guestData = JSON.parse(localStorage.getItem(GUEST_RECORDS_KEY)) || []
      const updatedData = guestData.filter((r) => r._id !== id)
      localStorage.setItem(GUEST_RECORDS_KEY, JSON.stringify(updatedData))
      records.value = updatedData
      toast.success('紀錄已刪除！')
      return
    }
    try {
      await apiClient.delete(`/body-metrics/${id}`)
      const index = records.value.findIndex((r) => r._id === id)
      if (index !== -1) {
        records.value.splice(index, 1)
        toast.success('紀錄已刪除！')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || '刪除紀錄失敗')
    }
  }

  return { records, fetchRecords, addRecord, deleteRecord }
})
