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

const saveRecord = (data) => {
  let hasData = false
  const recordData = { date: data.date }

  for (const key in data) {
    if (key === 'date') continue
    const value = data[key]
    if (value !== null && value !== '' && !isNaN(parseFloat(value))) {
      recordData[key] = parseFloat(value)
      hasData = true
    }
  }

  if (hasData) {
    bodyMetricsStore.addRecord(recordData)
  } else {
    toast.error('請至少填寫一項有效的身體數值')
  }
}

const handleSubmit = () => {
  const newDate = new Date(newRecord.value.date)
  const existingRecord = bodyMetricsStore.records.find((record) => {
    const existingDate = new Date(record.date)
    return (
      existingDate.getFullYear() === newDate.getFullYear() &&
      existingDate.getMonth() === newDate.getMonth() &&
      existingDate.getDate() === newDate.getDate()
    )
  })

  if (!existingRecord) {
    saveRecord(newRecord.value)
    return
  }

  const conflictingMetrics = []
  for (const key in newRecord.value) {
    if (key === 'date') continue
    const newValue = newRecord.value[key]
    const existingValue = existingRecord[key]

    if (newValue !== null && newValue !== '' && !isNaN(parseFloat(newValue)) && existingValue != null) {
      const newDisplayValue = parseFloat(newValue)
      const metricLabel = metricLabels[key].split(' ')[0] // e.g., "體重"
      conflictingMetrics.push(`${metricLabel}: ${existingValue} → ${newDisplayValue}`)
    }
  }

  if (conflictingMetrics.length > 0) {
    const message = `您選擇的日期已有紀錄，確定要覆蓋嗎？<br/><br/><b>變更如下：</b><br/>- ${conflictingMetrics.join('<br/>- ')}`
    modalStore.showConfirmation('覆蓋確認', message, () => {
      saveRecord(newRecord.value)
    })
  } else {
    saveRecord(newRecord.value)
  }
}
</script>
