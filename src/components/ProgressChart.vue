<script setup>
import { ref, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { useWorkoutStore } from '@/stores/workout'
import Highcharts from 'highcharts'



// --- Chart Containers and Instances ---
const volumeChartContainer = ref(null)
const strengthChartContainer = ref(null)
let volumeChartInstance = null
let strengthChartInstance = null

// --- Props ---
const props = defineProps({
  exerciseName: {
    type: String,
    required: true,
  },
})

// --- Stores ---
const workoutStore = useWorkoutStore()

// --- Highcharts Custom Theme ---
const darkThemeOptions = {
  colors: ['#22d3ee', '#a78bfa', '#f87171', '#4ade80', '#facc15', '#fb923c'],
  chart: {
    backgroundColor: '#1f2937',
    style: { fontFamily: 'sans-serif' },
    animation: false, // 禁用動畫以避免潛在問題
  },
  title: { style: { color: '#ffffff' } },
  xAxis: {
    gridLineColor: '#374151',
    labels: { style: { color: '#d1d5db' } },
    lineColor: '#4b5563',
    tickColor: '#4b5563',
    title: { style: { color: '#9ca3af' } },
  },
  yAxis: {
    gridLineColor: '#374151',
    labels: { style: { color: '#d1d5db' } },
    lineColor: '#4b5563',
    tickColor: '#4b5563',
    title: { style: { color: '#9ca3af' } },
  },
  tooltip: {
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
    style: { color: '#ffffff' },
    borderWidth: 0,
    useHTML: false, // 避免 HTML 相關問題
  },
  legend: {
    itemStyle: { color: '#e5e7eb' },
    itemHoverStyle: { color: '#ffffff' },
  },
  credits: { enabled: false },
  plotOptions: {
    series: {
      animation: false, // 禁用系列動畫
      states: {
        hover: {
          enabled: true,
        },
      },
    },
  },
}

// --- Data Processing ---
const chartData = computed(() => {
  if (!props.exerciseName) return null

  try {
    const history = []
    workoutStore.workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        if (exercise.name === props.exerciseName) {
          let totalVolume = 0,
            maxWeight = 0,
            estimated1RM = 0
          exercise.sets.forEach((set) => {
            const weight = parseFloat(set.weight) || 0
            const reps = parseInt(set.reps) || 0
            if (weight > 0 && reps > 0) {
              totalVolume += weight * reps
              if (weight > maxWeight) maxWeight = weight
              const current1RM = weight * (1 + reps / 30)
              if (current1RM > estimated1RM) estimated1RM = current1RM
            }
          })
          if (totalVolume > 0) {
            history.push({
              date: new Date(workout.createdAt).getTime(),
              volume: totalVolume,
              maxWeight: maxWeight,
              estimated1RM: Math.round(estimated1RM * 100) / 100,
            })
          }
        }
      })
    })

    history.sort((a, b) => a.date - b.date)

    return {
      dates: history.map((h) => h.date),
      volumes: history.map((h) => h.volume),
      maxWeights: history.map((h) => h.maxWeight),
      estimated1RMs: history.map((h) => h.estimated1RM),
    }
  } catch (error) {
    console.error('Error processing chart data:', error)
    return null
  }
})

// --- Chart Creation Functions ---
const createVolumeChart = (data) => {
  if (!volumeChartContainer.value) return null

  const volumeOptions = {
    ...darkThemeOptions,
    title: {
      ...darkThemeOptions.title,
      text: `${props.exerciseName} - 訓練總量趨勢`,
    },
    xAxis: {
      ...darkThemeOptions.xAxis,
      type: 'datetime',
      title: { text: '日期' },
      labels: {
        ...darkThemeOptions.xAxis.labels,
        formatter: function () {
          return Highcharts.dateFormat('%Y-%m-%d', this.value)
        },
      },
    },
    yAxis: {
      ...darkThemeOptions.yAxis,
      title: { text: '總量 (kg)' },
      labels: {
        ...darkThemeOptions.yAxis.labels,
        formatter: function () {
          return this.value.toFixed(1) + ' kg'
        },
      },
    },
    series: [
      {
        name: '訓練總量',
        data: data.dates.map((date, i) => [date, data.volumes[i]]),
        color: darkThemeOptions.colors[0],
        marker: {
          enabled: true,
          radius: 4,
        },
      },
    ],
    tooltip: {
      ...darkThemeOptions.tooltip,
      formatter: function () {
        return '<b>' + this.series.name + '</b><br/>' + Highcharts.dateFormat('%Y-%m-%d', this.x) + ': ' + this.y.toFixed(2) + ' kg'
      },
    },
  }

  try {
    return Highcharts.chart(volumeChartContainer.value, volumeOptions)
  } catch (error) {
    console.error('Error creating volume chart:', error)
    return null
  }
}

const createStrengthChart = (data) => {
  if (!strengthChartContainer.value) return null

  const strengthOptions = {
    ...darkThemeOptions,
    title: {
      ...darkThemeOptions.title,
      text: `${props.exerciseName} - 力量成長趨勢`,
    },
    xAxis: {
      ...darkThemeOptions.xAxis,
      type: 'datetime',
      title: { text: '日期' },
      labels: {
        ...darkThemeOptions.xAxis.labels,
        formatter: function () {
          return Highcharts.dateFormat('%Y-%m-%d', this.value)
        },
      },
    },
    yAxis: {
      ...darkThemeOptions.yAxis,
      title: { text: '重量 (kg)' },
      labels: {
        ...darkThemeOptions.yAxis.labels,
        formatter: function () {
          return this.value.toFixed(1) + ' kg'
        },
      },
    },
    series: [
      {
        name: '最大重量',
        data: data.dates.map((date, i) => [date, data.maxWeights[i]]),
        color: darkThemeOptions.colors[1],
        marker: {
          enabled: true,
          radius: 4,
        },
      },
      {
        name: '預估 1RM',
        data: data.dates.map((date, i) => [date, data.estimated1RMs[i]]),
        color: darkThemeOptions.colors[2],
        marker: {
          enabled: true,
          radius: 4,
        },
      },
    ],
    tooltip: {
      ...darkThemeOptions.tooltip,
      formatter: function () {
        return '<b>' + this.series.name + '</b><br/>' + Highcharts.dateFormat('%Y-%m-%d', this.x) + ': ' + this.y.toFixed(2) + ' kg'
      },
    },
  }

  try {
    return Highcharts.chart(strengthChartContainer.value, strengthOptions)
  } catch (error) {
    console.error('Error creating strength chart:', error)
    return null
  }
}

// --- Chart Logic ---
const updateCharts = async () => {
  try {
    // 等待 DOM 更新完成
    // await nextTick()

    // 清理現有圖表
    if (volumeChartInstance) {
      volumeChartInstance.destroy()
      volumeChartInstance = null
    }
    if (strengthChartInstance) {
      strengthChartInstance.destroy()
      strengthChartInstance = null
    }

    // 檢查數據是否足夠
    if (!chartData.value || chartData.value.dates.length < 2) {
      return
    }

    // ��建新圖表
    volumeChartInstance = createVolumeChart(chartData.value)
    strengthChartInstance = createStrengthChart(chartData.value)
  } catch (error) {
    console.error('Error updating charts:', error)
  }
}

// --- Watchers ---
watch(chartData, updateCharts, { immediate: true })
watch(() => props.exerciseName, updateCharts, { immediate: true }) // Add watcher for exerciseName

// --- Lifecycle Hooks ---
onMounted(() => {
  // 確保在組件掛載後再創建圖表
  if (chartData.value && chartData.value.dates.length >= 2) {
    updateCharts()
  }
})

onBeforeUnmount(() => {
  try {
    if (volumeChartInstance) {
      volumeChartInstance.destroy()
      volumeChartInstance = null
    }
    if (strengthChartInstance) {
      strengthChartInstance.destroy()
      strengthChartInstance = null
    }
  } catch (error) {
    console.error('Error destroying charts:', error)
  }
})
</script>

<template>
  <div class="max-w-6xl mx-auto bg-gray-800 p-8 rounded-lg shadow-xl">
    <div v-if="chartData && chartData.dates.length > 1">
      <div ref="volumeChartContainer" class="mb-8" style="height: 400px; width: 100%"></div>
      <div ref="strengthChartContainer" style="height: 400px; width: 100%"></div>
    </div>

    <div v-else class="text-center text-gray-400 py-10">
      <p>關於「{{ props.exerciseName }}」的訓練紀錄不足（至少需要兩次紀錄才能繪製趨勢圖）。</p>
      <p>請增加更多訓練紀錄！</p>
    </div>
  </div>
</template>
