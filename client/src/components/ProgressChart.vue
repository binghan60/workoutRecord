<script setup>
import { ref, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { useWorkoutStore } from '@/stores/workout'
import Highcharts from 'highcharts'
import { useHighchartsTheme } from '@/composables/useHighchartsTheme'

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

// --- Stores & Composables ---
const workoutStore = useWorkoutStore()
const { highchartsTheme } = useHighchartsTheme()

// --- Data Processing ---
const chartData = computed(() => {
  if (!props.exerciseName) return null

  const history = []
  // Use allWorkouts for accurate history
  workoutStore.allWorkouts.forEach((workout) => {
    const exercise = workout.exercises.find((ex) => ex.name === props.exerciseName)
    if (exercise) {
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

  history.sort((a, b) => a.date - b.date)

  return {
    dates: history.map((h) => h.date),
    volumes: history.map((h) => h.volume),
    maxWeights: history.map((h) => h.maxWeight),
    estimated1RMs: history.map((h) => h.estimated1RM),
  }
})

// --- Chart Creation Functions ---
const createVolumeChart = (data) => {
  if (!volumeChartContainer.value) return null

  const volumeOptions = {
    ...highchartsTheme.value,
    title: {
      ...highchartsTheme.value.title,
      text: `${props.exerciseName} - 訓練總量趨勢`,
    },
    xAxis: {
      ...highchartsTheme.value.xAxis,
      type: 'datetime',
      labels: {
        ...highchartsTheme.value.xAxis.labels,
        formatter: function () {
          return Highcharts.dateFormat('%Y-%m-%d', this.value)
        },
      },
    },
    yAxis: {
      ...highchartsTheme.value.yAxis,
      title: { text: '總量 (kg)' },
    },
    series: [
      {
        type: 'area',
        name: '訓練總量',
        data: data.dates.map((date, i) => [date, data.volumes[i]]),
        color: highchartsTheme.value.colors[0],
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, Highcharts.color(highchartsTheme.value.colors[0]).setOpacity(0.3).get('rgba')],
            [1, Highcharts.color(highchartsTheme.value.colors[0]).setOpacity(0).get('rgba')],
          ],
        },
        marker: {
          enabled: true,
          radius: 5,
        },
      },
    ],
    plotOptions: {
      area: {
        dataLabels: {
          enabled: true,
          color: highchartsTheme.value.title.style.color,
          formatter: function () {
            return this.y.toFixed(0)
          },
        },
        marker: {
          enabled: true,
          radius: 6,
        },
      },
    },
    tooltip: {
      ...highchartsTheme.value.tooltip,
      formatter: function () {
        const date = Highcharts.dateFormat('%Y-%m-%d', this.x)
        return `<b>${date}</b><br/>${this.series.name}: <b>${this.y.toFixed(0)} kg</b>`
      },
    },
  }
  return Highcharts.chart(volumeChartContainer.value, volumeOptions)
}

const createStrengthChart = (data) => {
  if (!strengthChartContainer.value) return null

  const strengthOptions = {
    ...highchartsTheme.value,
    title: {
      ...highchartsTheme.value.title,
      text: `${props.exerciseName} - 力量成長趨勢`,
    },
    xAxis: {
      ...highchartsTheme.value.xAxis,
      type: 'datetime',
      labels: {
        ...highchartsTheme.value.xAxis.labels,
        formatter: function () {
          return Highcharts.dateFormat('%Y-%m-%d', this.value)
        },
      },
    },
    yAxis: {
      ...highchartsTheme.value.yAxis,
      title: { text: '重量 (kg)' },
    },
    series: [
      {
        type: 'area',
        name: '最大重量',
        data: data.dates.map((date, i) => [date, data.maxWeights[i]]),
        color: highchartsTheme.value.colors[1],
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, Highcharts.color(highchartsTheme.value.colors[1]).setOpacity(0.5).get('rgba')],
            [1, Highcharts.color(highchartsTheme.value.colors[1]).setOpacity(0).get('rgba')],
          ],
        },
        marker: {
          enabled: true,
          radius: 5,
        },
      },
      {
        type: 'area',
        name: '預估 1RM',
        data: data.dates.map((date, i) => [date, data.estimated1RMs[i]]),
        color: highchartsTheme.value.colors[2],
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, Highcharts.color(highchartsTheme.value.colors[2]).setOpacity(0.5).get('rgba')],
            [1, Highcharts.color(highchartsTheme.value.colors[2]).setOpacity(0).get('rgba')],
          ],
        },
        marker: {
          enabled: true,
          radius: 5,
        },
      },
    ],
    plotOptions: {
      area: {
        dataLabels: {
          enabled: true,
          color: highchartsTheme.value.title.style.color,
          formatter: function () {
            return this.y.toFixed(0)
          },
        },
        marker: {
          enabled: true,
          radius: 6,
        },
      },
    },
    tooltip: {
      ...highchartsTheme.value.tooltip,
      formatter: function () {
        const date = Highcharts.dateFormat('%Y-%m-%d', this.x)
        return `<b>${date}</b><br/>${this.series.name}: <b>${this.y.toFixed(2)} kg</b>`
      },
    },
  }
  return Highcharts.chart(strengthChartContainer.value, strengthOptions)
}

// --- Chart Logic ---
const updateCharts = () => {
  if (volumeChartInstance) volumeChartInstance.destroy()
  if (strengthChartInstance) strengthChartInstance.destroy()

  if (!chartData.value || chartData.value.dates.length < 2) return

  volumeChartInstance = createVolumeChart(chartData.value)
  strengthChartInstance = createStrengthChart(chartData.value)
}

// --- Watchers ---
watch(
  () => [chartData.value, highchartsTheme.value],
  () => {
    updateCharts()
  },
  { immediate: true, deep: true },
)

// --- Lifecycle Hooks ---
onMounted(updateCharts)

onBeforeUnmount(() => {
  if (volumeChartInstance) volumeChartInstance.destroy()
  if (strengthChartInstance) strengthChartInstance.destroy()
})
</script>

<template>
  <div>
    <div v-if="chartData && chartData.dates.length > 1">
      <div ref="volumeChartContainer" class="mb-8 h-72 md:h-96 w-full"></div>
      <div ref="strengthChartContainer" class="h-72 md:h-96 w-full"></div>
    </div>

    <div v-else class="text-center text-medium-emphasis py-10">
      <p>「{{ props.exerciseName }}」的訓練紀錄不足。</p>
      <p>請增加更多訓練紀錄！</p>
    </div>
  </div>
</template>
