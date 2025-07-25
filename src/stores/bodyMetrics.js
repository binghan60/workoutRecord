import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { useModalStore } from './modal' // Import modal store

const toast = useToast()

export const useBodyMetricsStore = defineStore('bodyMetrics', () => {
  const records = ref(JSON.parse(localStorage.getItem('bodyMetricsRecords')) || [])
  const modalStore = useModalStore() // Initialize modal store

  watch(
    records,
    (newRecords) => {
      localStorage.setItem('bodyMetricsRecords', JSON.stringify(newRecords))
    },
    { deep: true },
  )

  function addRecord(record) {
    const existingRecordIndex = records.value.findIndex((r) => r.date === record.date)

    if (existingRecordIndex !== -1) {
      const existingRecord = records.value[existingRecordIndex]
      const newKeys = Object.keys(record).filter((k) => k !== 'date')
      const overlappingKeys = newKeys.filter((key) => existingRecord[key] != null)

      if (overlappingKeys.length > 0) {
        // Overlapping data, ask for confirmation
        const metricLabels = {
          weight: '體重',
          bodyFat: '體脂',
          chest: '胸圍',
          waist: '腰圍',
          shoulder: '肩寬',
          arm: '手臂',
          thigh: '大腿',
        }
        const overlappingLabels = overlappingKeys.map((key) => metricLabels[key] || key).join(', ')

        modalStore.showConfirmation('覆蓋確認', `您在 ${record.date} 已有 ${overlappingLabels} 的紀錄。要用新資料覆蓋嗎？`, () => {
          // User confirmed, merge and overwrite
          const updatedRecord = { ...existingRecord, ...record }
          records.value.splice(existingRecordIndex, 1, updatedRecord)
          toast.success('紀錄已成功更新！')
          modalStore.hideBodyMetricsModal() // Close modal on success
        })
      } else {
        // No overlap, just merge
        const mergedRecord = { ...existingRecord, ...record }
        records.value.splice(existingRecordIndex, 1, mergedRecord)
        toast.success('紀錄已成功合併！')
        modalStore.hideBodyMetricsModal() // Close modal on success
      }
    } else {
      // No existing record for this date, add as new
      const newRecord = {
        id: `bm-${Date.now()}`,
        ...record,
      }
      records.value.unshift(newRecord)
      records.value.sort((a, b) => new Date(b.date) - new Date(a.date)) // Keep sorted
      toast.success('身體數值已成功紀錄！')
      modalStore.hideBodyMetricsModal() // Close modal on success
    }
  }

  function deleteRecord(id) {
    const index = records.value.findIndex((r) => r.id === id)
    if (index !== -1) {
      records.value.splice(index, 1)
      toast.success('紀錄已刪除！')
    }
  }

  return { records, addRecord, deleteRecord }
})
