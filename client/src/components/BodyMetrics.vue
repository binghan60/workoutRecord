<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" class="text-right">
        <v-btn color="primary" @click="modalStore.showBodyMetricsModal()">
          <v-icon left>mdi-plus</v-icon>
          新增身體數值紀錄
        </v-btn>
      </v-col>

      <!-- Chart -->
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-row align="center">
              <v-col cols="12" sm="6">
                <span class="text-h6">趨勢圖</span>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="selectedMetric" :items="metricOptions" item-title="label" item-value="key" label="選擇指標" dense hide-details></v-select>
              </v-col>
            </v-row>
          </v-card-title>
          <v-card-text>
            <div v-if="bodyMetricsStore.records.length > 0">
              <Chart :options="chartOptions" />
            </div>
            <div v-else class="text-center text-medium-emphasis py-10">
              <p>尚無紀錄可顯示圖表</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- History Table -->
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <span class="text-h6">歷史紀錄</span>
          </v-card-title>
          <v-card-text>
            <v-data-table :headers="tableHeaders" :items="bodyMetricsStore.records" item-key="id" class="elevation-1" :no-data-text="'尚無任何歷史紀錄'">
              <!-- 格式化日期顯示 -->
              <template v-slot:[`item.date`]="{ item }">
                {{ formatDate(item.date) }}
              </template>

              <template v-slot:[`item.actions`]="{ item }">
                <template v-if="xs">
                  <v-menu location="bottom end">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" icon color="primary" size="small" aria-label="更多操作">
                        <v-icon>mdi-dots-vertical</v-icon>
                      </v-btn>
                    </template>
                    <v-list density="compact">
                      <v-list-item @click="handleEdit(item)" prepend-icon="mdi-pencil" title="編輯" />
                      <v-list-item @click="handleDelete(item._id)" prepend-icon="mdi-delete" title="刪除" />
                    </v-list>
                  </v-menu>
                </template>
                <template v-else>
                  <div class="d-flex align-center justify-end" style="gap: 8px;">
                    <v-btn icon color="primary" size="small" aria-label="編輯" @click="handleEdit(item)">
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                    <v-btn icon color="red" size="small" aria-label="刪除" @click="handleDelete(item._id)">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </template>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useResponsiveDesign } from '@/composables/useResponsiveDesign'
import { useBodyMetricsStore } from '@/stores/bodyMetrics'
import { useModalStore } from '@/stores/modal'
import { Chart } from 'highcharts-vue'
import { useHighchartsTheme } from '@/composables/useHighchartsTheme'

const bodyMetricsStore = useBodyMetricsStore()
const modalStore = useModalStore()
const { highchartsTheme } = useHighchartsTheme()
const { xs } = useResponsiveDesign()

const metricLabels = {
  weight: '體重 (kg)',
  bodyFat: '體脂 (%)',
  chest: '胸圍 (cm)',
  waist: '腰圍 (cm)',
  shoulder: '肩寬 (cm)',
  arm: '手臂 (cm)',
  thigh: '大腿 (cm)',
}

const metricOptions = Object.entries(metricLabels).map(([key, label]) => ({ key, label }))
const selectedMetric = ref('weight')

// 格式化日期的函數
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const handleDelete = (id) => {
  modalStore.showConfirmation('確認刪除', '您確定要刪除這筆紀錄嗎？此操作無法復原。', () => {
    bodyMetricsStore.deleteRecord(id)
  })
}

const handleEdit = (item) => {
  // 開啟 Modal 並帶入欲編輯的紀錄
  modalStore.showBodyMetricsModal(item)
}

const tableHeaders = [
  { title: '日期', value: 'date', sortable: true },
  ...Object.entries(metricLabels).map(([key, label]) => ({
    title: label,
    value: key,
  })),
  { title: '操作', value: 'actions', sortable: false, align: 'end' },
]

const chartOptions = computed(() => {
  console.log(bodyMetricsStore.records)
  const sortedRecords = [...bodyMetricsStore.records].sort((a, b) => new Date(a.date) - new Date(b.date))
  return {
    ...highchartsTheme.value,
    chart: {
      ...highchartsTheme.value.chart,
      type: 'line',
    },
    title: {
      ...highchartsTheme.value.title,
      text: `${metricLabels[selectedMetric.value]} 趨勢圖`,
    },
    xAxis: {
      ...highchartsTheme.value.xAxis,
      categories: sortedRecords.map((r) =>
        new Date(r.date).toLocaleDateString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }),
      ),
    },
    yAxis: {
      ...highchartsTheme.value.yAxis,
      title: {
        text: metricLabels[selectedMetric.value],
      },
    },
    series: [
      {
        name: metricLabels[selectedMetric.value],
        data: sortedRecords.map((r) => r[selectedMetric.value]).filter((d) => d != null),
      },
    ],
    legend: {
      enabled: false,
    },
  }
})
onMounted(() => {
  bodyMetricsStore.fetchRecords()
})
</script>
