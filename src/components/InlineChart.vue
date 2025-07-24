<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { useWorkoutStore } from '@/stores/workout'
import Highcharts from 'highcharts'
import { useHighchartsTheme } from '@/composables/useHighchartsTheme'

// --- Props ---
const props = defineProps({
  exerciseName: {
    type: String,
    required: true,
  },
  visible: {
    type: Boolean,
    required: true,
  },
})

// --- Chart Containers and Instances ---
const volumeChartContainer = ref(null)
const strengthChartContainer = ref(null)
let volumeChartInstance = null
let strengthChartInstance = null

// --- Stores & Composables ---
const workoutStore = useWorkoutStore()
const { highchartsTheme } = useHighchartsTheme()

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

  const commonXAxis = {
    ...highchartsTheme.value.xAxis,
    type: 'datetime',
    labels: {
      ...highchartsTheme.value.xAxis.labels,
      formatter: function () {
        return Highcharts.dateFormat('%Y-%m-%d', this.value)
      },
    },
  }

  // Volume Chart
  if (volumeChartContainer.value) {
    volumeChartInstance = Highcharts.chart(volumeChartContainer.value, {
      ...highchartsTheme.value,
      title: { ...highchartsTheme.value.title, text: `訓練總量趨勢` },
      xAxis: commonXAxis,
      yAxis: { ...highchartsTheme.value.yAxis, title: { text: '總量 (kg)' } },
      series: [
        {
          type: 'area',
          name: '訓練總量',
          data: chartData.value.dates.map((date, i) => [date, chartData.value.volumes[i]]),
          color: highchartsTheme.value.colors[0],
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, Highcharts.color(highchartsTheme.value.colors[0]).setOpacity(0.1).get('rgba')],
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
      fillColor: {
        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
        stops: [
          [0, Highcharts.color(highchartsTheme.value.colors[2]).setOpacity(0.3).get('rgba')],
          [1, Highcharts.color(highchartsTheme.value.colors[2]).setOpacity(0).get('rgba')],
        ],
      },
      marker: {
        enabled: true,
        radius: 5,
      },
    })
  }

  // Strength Chart
  if (strengthChartContainer.value) {
    strengthChartInstance = Highcharts.chart(strengthChartContainer.value, {
      ...highchartsTheme.value,
      title: { ...highchartsTheme.value.title, text: `力量成長趨勢` },
      xAxis: commonXAxis,
      yAxis: { ...highchartsTheme.value.yAxis, title: { text: '重量 (kg)' } },
      series: [
        {
          type: 'area',
          name: '最大重量',
          data: chartData.value.dates.map((date, i) => [date, chartData.value.maxWeights[i]]),
          color: highchartsTheme.value.colors[1],
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, Highcharts.color(highchartsTheme.value.colors[1]).setOpacity(0.3).get('rgba')],
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
          data: chartData.value.dates.map((date, i) => [date, chartData.value.estimated1RMs[i]]),
          color: highchartsTheme.value.colors[2],
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, Highcharts.color(highchartsTheme.value.colors[2]).setOpacity(0.3).get('rgba')],
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
          return `<b>${date}</b><br/>${this.series.name}: <b>${this.y.toFixed(0)} kg</b>`
        },
      },
    })
  }
}

// --- Watchers ---
watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      updateCharts()
    }
  },
  { immediate: true },
)

// --- Lifecycle Hooks ---
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
    <div v-else-if="exerciseName" class="text-center text-medium-emphasis py-10">
      <p>關於「{{ exerciseName }}」的訓練紀錄不足（至少需要兩次紀錄才能繪製趨勢圖）。</p>
      <p>請增加更多訓練紀錄！</p>
    </div>
  </div>
</template>
