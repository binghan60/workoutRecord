<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick, onMounted } from 'vue'
import { useWorkoutStore } from '@/stores/workout'
import Highcharts from 'highcharts'
import { useHighchartsTheme } from '@/composables/useHighchartsTheme'

// --- Chart Container and Instance ---
const chartContainer = ref(null)
let chartInstance = null

// --- Stores & Composables ---
const workoutStore = useWorkoutStore()
const { highchartsTheme } = useHighchartsTheme()

// --- Data Processing ---
const chartData = computed(() => {
  const workoutCounts = {} // { 'YYYY-MM': count }
  workoutStore.workouts.forEach((workout) => {
    const date = new Date(workout.createdAt)
    const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
    workoutCounts[yearMonth] = (workoutCounts[yearMonth] || 0) + 1
  })

  // Sort by date and format for Highcharts
  const sortedMonths = Object.keys(workoutCounts).sort()
  const categories = sortedMonths.map((ym) => ym.replace('-', '年') + '月')
  const data = sortedMonths.map((ym) => workoutCounts[ym])

  return { categories, data }
})

// --- Chart Logic ---
const updateChart = async () => {
  await nextTick()

  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
  if (!chartData.value || chartData.value.data.length === 0) {
    return
  }

  if (chartContainer.value) {
    chartInstance = Highcharts.chart(chartContainer.value, {
      ...highchartsTheme.value,
      chart: { ...highchartsTheme.value.chart, type: 'column' },
      title: { ...highchartsTheme.value.title, text: '每月訓練次數' },
      xAxis: {
        ...highchartsTheme.value.xAxis,
        categories: chartData.value.categories,
        title: { text: '月份' },
      },
      yAxis: {
        ...highchartsTheme.value.yAxis,
        title: { text: '訓練次數' },
        allowDecimals: false,
      },
      series: [
        {
          type: 'column',
          name: '訓練次數',
          data: chartData.value.data,
          color: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, Highcharts.color(highchartsTheme.value.colors[0]).setOpacity(0.5).get('rgba')],
              [1, Highcharts.color(highchartsTheme.value.colors[0]).setOpacity(0).get('rgba')],
            ],
          },
        },
      ],
      tooltip: {
        ...highchartsTheme.value.tooltip,
        pointFormat: '<b>{point.y} 次</b>',
      },
      plotOptions: {
        column: {
          dataLabels: {
            enabled: true,
            color: highchartsTheme.value.title.style.color,
          },
        },
      },
    })
  }
}

// --- Watchers ---
watch(
  () => [workoutStore.workouts, highchartsTheme.value],
  () => {
    updateChart()
  },
  { deep: true },
)

// --- Lifecycle Hooks ---
onMounted(updateChart)

onBeforeUnmount(() => {
  if (chartInstance) chartInstance.destroy()
})
</script>

<template>
  <div class="rounded-lg">
    <div v-if="chartData && chartData.data.length > 0">
      <div ref="chartContainer" class="h-72 md:h-96 w-full"></div>
    </div>
    <div v-else class="text-center text-medium-emphasis py-10">
      <p>資料不足繪製每月訓練次數圖表</p>
      <p>請增加更多訓練紀錄！</p>
    </div>
  </div>
</template>
