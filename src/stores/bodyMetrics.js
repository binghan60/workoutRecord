import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useToast } from 'vue-toastification'

const toast = useToast()

export const useBodyMetricsStore = defineStore('bodyMetrics', () => {
  // Load from localStorage
  const records = ref(JSON.parse(localStorage.getItem('bodyMetricsRecords')) || [])

  // Watch for changes and save to localStorage
  watch(
    records,
    (newRecords) => {
      localStorage.setItem('bodyMetricsRecords', JSON.stringify(newRecords))
    },
    { deep: true },
  )

  // Add a new record
  function addRecord(record) {
    const newRecord = {
      id: `bm-${Date.now()}`,
      ...record, // record should now contain the date
    }
    records.value.unshift(newRecord) // Add to the beginning of the array
    toast.success('身體數值已成功紀錄！')
  }

  // Delete a record
  function deleteRecord(id) {
    const index = records.value.findIndex((r) => r.id === id)
    if (index !== -1) {
      records.value.splice(index, 1)
      toast.success('紀錄已刪除！')
    }
  }

  return { records, addRecord, deleteRecord }
})
