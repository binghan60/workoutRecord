<template>
  <v-dialog :model-value="modalStore.isBodyMetricsModalOpen" @update:model-value="modalStore.hideBodyMetricsModal()" max-width="600px">
    <v-card>
      <v-card-title>
        <span class="text-h5">新增身體數值紀錄</span>
      </v-card-title>
      <v-card-text>
        <v-container>
          <v-form @submit.prevent="handleSubmit">
            <v-row>
              <v-col cols="12">
                <v-text-field v-model="newRecord.date" label="日期" type="date" variant="outlined" density="compact"></v-text-field>
              </v-col>
              <v-col v-for="(label, key) in metricLabels" :key="key" cols="12" sm="6">
                <v-text-field v-model="newRecord[key]" :label="label" type="number" step="0.1" variant="outlined" density="compact"></v-text-field>
              </v-col>
            </v-row>
          </v-form>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey-darken-1" text @click="modalStore.hideBodyMetricsModal()">取消</v-btn>
        <v-btn color="primary" @click="handleSubmit">儲存紀錄</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useBodyMetricsStore } from '@/stores/bodyMetrics'
import { useModalStore } from '@/stores/modal'
import { useToast } from 'vue-toastification'

const bodyMetricsStore = useBodyMetricsStore()
const modalStore = useModalStore()
const toast = useToast()

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
    const value = newRecord.value[key]
    if (value !== null && value !== '' && !isNaN(parseFloat(value))) {
      recordData[key] = parseFloat(value)
      hasData = true
    }
  }

  if (hasData) {
    bodyMetricsStore.addRecord(recordData)
    modalStore.hideBodyMetricsModal()
    toast.success('身體數值已成功儲存！')
  } else {
    toast.error('請至少填寫一項有效的身體數值')
  }
}
</script>
