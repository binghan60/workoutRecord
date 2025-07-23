<script setup>
import { ref, watch } from 'vue'
import { useBodyMetricsStore } from '@/stores/bodyMetrics'
import { useModalStore } from '@/stores/modal'

const bodyMetricsStore = useBodyMetricsStore()
const modalStore = useModalStore()

const getTodayString = () => new Date().toISOString().split('T')[0]

const newRecord = ref({
  date: getTodayString(),
  weight: null,
  bodyFat: null,
  chest: null,
  waist: null,
  shoulder: null,
  arm: null,
  thigh: null,
})

// Reset the form when the modal opens
watch(
  () => modalStore.isBodyMetricsModalOpen,
  (isOpen) => {
    if (isOpen) {
      newRecord.value = {
        date: getTodayString(),
        weight: null,
        bodyFat: null,
        chest: null,
        waist: null,
        shoulder: null,
        arm: null,
        thigh: null,
      }
    }
  },
)

const metricLabels = {
  weight: '體重 (kg)',
  bodyFat: '體脂 (%)',
  chest: '胸圍 (cm)',
  waist: '腰圍 (cm)',
  shoulder: '肩寬 (cm)',
  arm: '手臂 (cm)',
  thigh: '大腿 (cm)',
}

const handleSubmit = () => {
  const recordData = {
    date: newRecord.value.date,
  }
  let hasData = false
  // Start from index 1 to skip the date field
  for (const key in newRecord.value) {
    if (key === 'date') continue
    if (newRecord.value[key] !== null && newRecord.value[key] !== '') {
      recordData[key] = parseFloat(newRecord.value[key])
      hasData = true
    }
  }

  if (hasData) {
    bodyMetricsStore.addRecord(recordData)
    modalStore.hideBodyMetricsModal()
  } else {
    // You might want to use a toast notification here
    alert('請至少填寫一項身體數值')
  }
}
</script>

<template>
  <div v-if="modalStore.isBodyMetricsModalOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="modalStore.hideBodyMetricsModal">
    <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
      <div class="p-6">
        <h3 class="text-xl font-bold text-white text-center mb-6">新增身體數值紀錄</h3>
        <form @submit.prevent="handleSubmit" class="grid grid-cols-2 gap-4">
          <!-- Date Picker -->
          <div class="col-span-2">
            <label for="modal-date" class="block text-sm font-medium text-gray-300">日期</label>
            <input type="date" id="modal-date" v-model="newRecord.date" class="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-cyan-500 focus:border-cyan-500" />
          </div>

          <div v-for="(label, key) in metricLabels" :key="key">
            <label :for="`modal-${key}`" class="block text-sm font-medium text-gray-300">{{ label }}</label>
            <input type="number" step="0.1" :id="`modal-${key}`" v-model="newRecord[key]" class="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-cyan-500 focus:border-cyan-500" />
          </div>
          <div class="col-span-2 mt-4 flex justify-end gap-x-4">
            <button type="button" @click="modalStore.hideBodyMetricsModal" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded">取消</button>
            <button type="submit" class="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded">儲存紀錄</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
