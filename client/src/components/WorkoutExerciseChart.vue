<template>
  <div class="workout-exercise-chart">
    <!-- Toggle button for chart visibility -->
    <v-btn
      @click="toggleChart"
      variant="text"
      size="small"
      color="primary"
      class="mb-2"
      prepend-icon="mdi-chart-line"
    >
      {{ isChartVisible ? '隱藏歷史圖表' : '顯示歷史圖表' }}
    </v-btn>

    <!-- Chart container -->
    <v-expand-transition>
      <div v-if="isChartVisible" class="chart-container">
        <div v-if="chartData && chartData.dates.length > 1" class="chart-content">
          <!-- Compact Volume Chart -->
          <div ref="volumeChartContainer" class="chart-item"></div>
          
          <!-- Compact Strength Chart -->
          <div ref="strengthChartContainer" class="chart-item"></div>
        </div>
        
        <!-- Loading state -->
        <div v-else-if="isLoading" class="text-center text-medium-emphasis py-4">
          <v-progress-circular indeterminate color="primary" class="mb-2"></v-progress-circular>
          <p class="text-body-2">正在載入歷史數據...</p>
        </div>
        
        <!-- No data message -->
        <div v-else class="text-center text-medium-emphasis py-4">
          <v-icon size="large" class="mb-2">mdi-chart-line-variant</v-icon>
          <p class="text-body-2">「{{ exerciseName }}」還沒有足夠的歷史數據</p>
          <p class="text-caption">完成更多訓練來查看進度圖表！</p>
        </div>
      </div>
    </v-expand-transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { useWorkoutStore } from '@/stores/workout'
import Highcharts from 'highcharts'
import { useHighchartsTheme } from '@/composables/useHighchartsTheme'

// Props
const props = defineProps({
  exerciseName: {
    type: String,
    required: true,
  },
})

// Reactive state
const isChartVisible = ref(false)
const isLoading = ref(false)
const volumeChartContainer = ref(null)
const strengthChartContainer = ref(null)
let volumeChartInstance = null
let strengthChartInstance = null
let updateChartsTimer = null

// Stores & Composables
const workoutStore = useWorkoutStore()
const { highchartsTheme } = useHighchartsTheme()

// Chart data computation
const chartData = computed(() => {
  if (!props.exerciseName) return null
  
  const history = []
  
  // Use allWorkouts for complete history
  workoutStore.allWorkouts.forEach((workout) => {
    const exercise = workout.exercises.find((ex) => ex.name === props.exerciseName)
    if (exercise) {
      let totalVolume = 0
      let maxWeight = 0
      let estimated1RM = 0
      
      exercise.sets.forEach((set) => {
        const weight = parseFloat(set.weight) || 0
        const reps = parseInt(set.reps) || 0
        if (weight > 0 && reps > 0) {
          totalVolume += weight * reps
          if (weight > maxWeight) maxWeight = weight
          // Epley formula for 1RM estimation
          const current1RM = weight * (1 + reps / 30)
          if (current1RM > estimated1RM) estimated1RM = current1RM
        }
      })
      
      if (totalVolume > 0) {
        history.push({
          date: new Date(workout.date || workout.createdAt).getTime(),
          volume: totalVolume,
          maxWeight: maxWeight,
          estimated1RM: Math.round(estimated1RM * 100) / 100,
        })
      }
    }
  })
  
  // Sort by date
  history.sort((a, b) => a.date - b.date)
  
  return {
    dates: history.map((h) => h.date),
    volumes: history.map((h) => h.volume),
    maxWeights: history.map((h) => h.maxWeight),
    estimated1RMs: history.map((h) => h.estimated1RM),
  }
})

// Chart creation functions
const createCompactVolumeChart = () => {
  if (!volumeChartContainer.value || !chartData.value) return null
  
  return Highcharts.chart(volumeChartContainer.value, {
    ...highchartsTheme.value,
    title: {
      ...highchartsTheme.value.title,
      text: '訓練總量趨勢',
      style: { fontSize: '14px' }
    },
    xAxis: {
      ...highchartsTheme.value.xAxis,
      type: 'datetime',
      labels: {
        ...highchartsTheme.value.xAxis.labels,
        style: { fontSize: '10px' },
        formatter: function () {
          return Highcharts.dateFormat('%m/%d', this.value)
        },
      },
    },
    yAxis: {
      ...highchartsTheme.value.yAxis,
      title: { text: '總量 (kg)', style: { fontSize: '12px' } },
      labels: { style: { fontSize: '10px' } },
    },
    series: [
      {
        type: 'area',
        name: '訓練總量',
        data: chartData.value.dates.map((date, i) => [date, chartData.value.volumes[i]]),
        color: highchartsTheme.value.colors[0],
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, Highcharts.color(highchartsTheme.value.colors[0]).setOpacity(0.3).get('rgba')],
            [1, Highcharts.color(highchartsTheme.value.colors[0]).setOpacity(0).get('rgba')],
          ],
        },
        marker: { enabled: true, radius: 3 },
      },
    ],
    plotOptions: {
      area: {
        dataLabels: { enabled: false },
        marker: { enabled: true, radius: 3 },
      },
    },
    tooltip: {
      ...highchartsTheme.value.tooltip,
      formatter: function () {
        const date = Highcharts.dateFormat('%Y-%m-%d', this.x)
        return `<b>${date}</b><br/>${this.series.name}: <b>${this.y.toFixed(0)} kg</b>`
      },
    },
    legend: { enabled: false },
    credits: { enabled: false },
  })
}

const createCompactStrengthChart = () => {
  if (!strengthChartContainer.value || !chartData.value) return null
  
  return Highcharts.chart(strengthChartContainer.value, {
    ...highchartsTheme.value,
    title: {
      ...highchartsTheme.value.title,
      text: '力量進步趨勢',
      style: { fontSize: '14px' }
    },
    xAxis: {
      ...highchartsTheme.value.xAxis,
      type: 'datetime',
      labels: {
        ...highchartsTheme.value.xAxis.labels,
        style: { fontSize: '10px' },
        formatter: function () {
          return Highcharts.dateFormat('%m/%d', this.value)
        },
      },
    },
    yAxis: {
      ...highchartsTheme.value.yAxis,
      title: { text: '重量 (kg)', style: { fontSize: '12px' } },
      labels: { style: { fontSize: '10px' } },
    },
    series: [
      {
        type: 'line',
        name: '最大重量',
        data: chartData.value.dates.map((date, i) => [date, chartData.value.maxWeights[i]]),
        color: highchartsTheme.value.colors[1],
        marker: { enabled: true, radius: 3 },
      },
      {
        type: 'line',
        name: '預估 1RM',
        data: chartData.value.dates.map((date, i) => [date, chartData.value.estimated1RMs[i]]),
        color: highchartsTheme.value.colors[2],
        marker: { enabled: true, radius: 3 },
        dashStyle: 'Dash',
      },
    ],
    plotOptions: {
      line: {
        dataLabels: { enabled: false },
        marker: { enabled: true, radius: 3 },
      },
    },
    tooltip: {
      ...highchartsTheme.value.tooltip,
      formatter: function () {
        const date = Highcharts.dateFormat('%Y-%m-%d', this.x)
        return `<b>${date}</b><br/>${this.series.name}: <b>${this.y.toFixed(1)} kg</b>`
      },
    },
    legend: { 
      enabled: true,
      itemStyle: { fontSize: '10px' },
    },
    credits: { enabled: false },
  })
}

// Chart management with debounce
const updateCharts = async () => {
  // Clear any pending updates
  if (updateChartsTimer) {
    clearTimeout(updateChartsTimer)
  }
  
  updateChartsTimer = setTimeout(async () => {
    await nextTick()
    
    // Destroy existing charts
    if (volumeChartInstance) {
      volumeChartInstance.destroy()
      volumeChartInstance = null
    }
    if (strengthChartInstance) {
      strengthChartInstance.destroy()
      strengthChartInstance = null
    }
    
    // Create new charts if data is available
    if (chartData.value && chartData.value.dates.length > 1) {
      volumeChartInstance = createCompactVolumeChart()
      strengthChartInstance = createCompactStrengthChart()
    }
    
    isLoading.value = false
  }, 300) // 300ms debounce
}

const toggleChart = async () => {
  isChartVisible.value = !isChartVisible.value
  
  if (isChartVisible.value) {
    isLoading.value = true
    
    try {
      // Ensure workout data is loaded
      if (workoutStore.allWorkouts.length === 0) {
        await workoutStore.fetchAllWorkouts()
      }
      
      // Update charts after visibility change
      await nextTick()
      updateCharts()
    } catch (error) {
      console.error('Error loading chart data:', error)
      isLoading.value = false
    }
  }
}

// Watchers
watch(
  () => [chartData.value, isChartVisible.value],
  () => {
    if (isChartVisible.value) {
      updateCharts()
    }
  },
  { deep: true }
)

// Cleanup
onBeforeUnmount(() => {
  // Clear any pending chart updates
  if (updateChartsTimer) {
    clearTimeout(updateChartsTimer)
  }
  
  // Destroy chart instances
  if (volumeChartInstance) volumeChartInstance.destroy()
  if (strengthChartInstance) strengthChartInstance.destroy()
})
</script>

<style scoped>
.workout-exercise-chart {
  margin-bottom: 16px;
}

.chart-container {
  background: rgba(var(--v-theme-surface), 0.5);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.chart-item {
  height: 200px;
  width: 100%;
  margin-bottom: 12px;
}

.chart-item:last-child {
  margin-bottom: 0;
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .chart-item {
    height: 180px;
  }
  
  .chart-container {
    padding: 8px;
  }
}
</style>