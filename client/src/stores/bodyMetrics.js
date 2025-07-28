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
    if (authStore.isGuest) {
      const guestData = JSON.parse(localStorage.getItem(GUEST_RECORDS_KEY)) || []
      const existingRecordIndex = guestData.findIndex((r) => r.date === record.date)
      if (existingRecordIndex !== -1) {
        // Update existing record for the same day
        guestData[existingRecordIndex] = { ...guestData[existingRecordIndex], ...record }
      } else {
        // Add new record with a temporary ID
        guestData.push({ ...record, _id: `guest_${new Date().getTime()}` })
      }
      localStorage.setItem(GUEST_RECORDS_KEY, JSON.stringify(guestData))
      records.value = guestData
      toast.success('身體數值已成功儲存！')
      modalStore.hideBodyMetricsModal()
      return
    }
    try {
      // The backend handles the logic of merging/updating if the date exists
      await apiClient.post('/body-metrics', record)
      await fetchRecords() // Refetch to get the updated list
      toast.success('身體數值已成功儲存！')
      modalStore.hideBodyMetricsModal()
    } catch (error) {
      toast.error(error.response?.data?.message || '儲存身體數值失敗')
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

