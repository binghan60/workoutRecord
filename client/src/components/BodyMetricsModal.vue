<template>
  <v-dialog :model-value="modalStore.isBodyMetricsModalOpen" @update:model-value="modalStore.hideBodyMetricsModal()" max-width="600px">
    <v-card>
      <v-card-title>
        <span class="text-h5">{{ modalStore.bodyMetricToEdit ? '編輯身體數值紀錄' : '新增身體數值紀錄' }}</span>
      </v-card-title>
      <v-card-text>
        <v-container>
          <v-form @submit.prevent="handleSubmit">
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="newRecord.date"
                  label="日期"
                  type="date"
                  variant="outlined"
                  density="compact"
                  :readonly="isEditing"
                  :hint="isEditing ? '編輯模式不可修改日期' : ''"
                  :persistent-hint="isEditing"
                  :append-inner-icon="isEditing ? 'mdi-lock' : undefined"
                ></v-text-field>
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
import { ref, watch, computed } from 'vue'
import { useBodyMetricsStore } from '@/stores/bodyMetrics'
import { useModalStore } from '@/stores/modal'
import { useToast } from 'vue-toastification'

const bodyMetricsStore = useBodyMetricsStore()
const modalStore = useModalStore()
const toast = useToast()

const isEditing = computed(() => !!modalStore.bodyMetricToEdit)

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
      if (modalStore.bodyMetricToEdit) {
        // 編輯模式：將資料填入表單，日期輸入使用 YYYY-MM-DD
        const editing = modalStore.bodyMetricToEdit
        const toYMD = (value) => {
          const d = new Date(value)
          const pad2 = (n) => String(n).padStart(2, '0')
          return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
        }
        newRecord.value = {
          date: toYMD(editing.date),
          weight: editing.weight ?? null,
          bodyFat: editing.bodyFat ?? null,
          chest: editing.chest ?? null,
          waist: editing.waist ?? null,
          shoulder: editing.shoulder ?? null,
          arm: editing.arm ?? null,
          thigh: editing.thigh ?? null,
        }
      } else {
        // 新增模式：預設為今日
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
  // 若為編輯模式，且日期未變更，將直接透過同日比對找到既有紀錄並執行更新

  console.log('saveRecord', data)
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
    bodyMetricsStore.saveOrUpdateRecord(recordData)
  } else {
    toast.error('請至少填寫一項有效的身體數值')
  }
}

const handleSubmit = () => {
  // 將衝突檢查與覆蓋確認統一交由 store 處理，避免重複彈框
  saveRecord(newRecord.value)
}
</script>
