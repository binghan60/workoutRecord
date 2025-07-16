<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick, onMounted, defineProps } from 'vue'
import { useWorkoutStore } from '@/stores/workout'
import Highcharts from 'highcharts'

// --- Props ---
const props = defineProps({
  exerciseName: {
    type: String,
    required: true,
  },
})

// --- Chart Containers and Instances ---
const volumeChartContainer = ref(null)
const strengthChartContainer = ref(null)
let volumeChartInstance = null
let strengthChartInstance = null

// --- Stores ---
const workoutStore = useWorkoutStore()

// --- Highcharts Custom Theme ---
const darkThemeOptions = {
  colors: ['#22d3ee', '#a78bfa', '#f87171', '#4ade80', '#facc15', '#fb923c'],
  chart: { backgroundColor: 'transparent', style: { fontFamily: 'sans-serif' } },
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
  tooltip: { backgroundColor: 'rgba(31, 41, 55, 0.9)', style: { color: '#ffffff' }, borderWidth: 0 },
  legend: { itemStyle: { color: '#e5e7eb' }, itemHoverStyle: { color: '#ffffff' } },
  credits: { enabled: false },
}

// --- Data Processing ---
const chartData = computed(() => {
  if (!props.exerciseName) return null
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
})

// --- Chart Logic ---
const updateCharts = async () => {
  await nextTick()

  if (volumeChartInstance) {
    volumeChartInstance.destroy()
    volumeChartInstance = null
  }
  if (strengthChartInstance) {
    strengthChartInstance.destroy()
    strengthChartInstance = null
  }

  if (!chartData.value || chartData.value.dates.length < 2) {
    return
  }

  // Volume Chart
  if (volumeChartContainer.value) {
    volumeChartInstance = Highcharts.chart(volumeChartContainer.value, {
      ...darkThemeOptions,
      title: { ...darkThemeOptions.title, text: `訓練總量趨勢` },
      xAxis: { ...darkThemeOptions.xAxis, type: 'datetime' },
      yAxis: { ...darkThemeOptions.yAxis, title: { text: '總量 (kg)' } },
      series: [{ name: '訓練總量', data: chartData.value.dates.map((date, i) => [date, chartData.value.volumes[i]]), color: darkThemeOptions.colors[0] }],
      tooltip: { ...darkThemeOptions.tooltip, pointFormat: '{series.name}: <b>{point.y:.2f} kg</b>' },
    })
  }

  // Strength Chart
  if (strengthChartContainer.value) {
    strengthChartInstance = Highcharts.chart(strengthChartContainer.value, {
      ...darkThemeOptions,
      title: { ...darkThemeOptions.title, text: `力量成長趨勢` },
      xAxis: { ...darkThemeOptions.xAxis, type: 'datetime' },
      yAxis: { ...darkThemeOptions.yAxis, title: { text: '重量 (kg)' } },
      series: [
        { name: '最大重量', data: chartData.value.dates.map((date, i) => [date, chartData.value.maxWeights[i]]), color: darkThemeOptions.colors[1] },
        { name: '預估 1RM', data: chartData.value.dates.map((date, i) => [date, chartData.value.estimated1RMs[i]]), color: darkThemeOptions.colors[2] },
      ],
      tooltip: { ...darkThemeOptions.tooltip, pointFormat: '{series.name}: <b>{point.y:.2f} kg</b>' },
    })
  }
}

// --- Watchers ---
watch(() => props.exerciseName, updateCharts)

// --- Lifecycle Hooks ---
onMounted(updateCharts)

onBeforeUnmount(() => {
  if (volumeChartInstance) volumeChartInstance.destroy()
  if (strengthChartInstance) strengthChartInstance.destroy()
})
</script>

<template>
  <div>
    <div v-if="exerciseName && chartData && chartData.dates.length > 1">
      <div ref="volumeChartContainer" class="mb-8" style="height: 400px; width: 100%"></div>
      <div ref="strengthChartContainer" style="height: 400px; width: 100%"></div>
    </div>
    <div v-else-if="exerciseName" class="text-center text-gray-400 py-10">
      <p>關於「{{ exerciseName }}」的訓練紀錄不足（至少需要兩次紀錄才能繪製趨勢圖）。</p>
      <p>請增加更多訓練紀錄！</p>
    </div>
  </div>
</template>
