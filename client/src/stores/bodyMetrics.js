import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useToast } from 'vue-toastification'
import { useModalStore } from './modal'
import apiClient from '@/api'

const toast = useToast()

export const useBodyMetricsStore = defineStore('bodyMetrics', () => {
  const records = ref([])
  const modalStore = useModalStore()

  async function fetchRecords() {
    try {
      const response = await apiClient.get('/body-metrics')
      records.value = response.data
    } catch (error) {
      toast.error('無法載入身體數值紀錄')
    }
  }

  async function addRecord(record) {
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

