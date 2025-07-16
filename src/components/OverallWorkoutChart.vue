<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick, onMounted } from 'vue'
import { useWorkoutStore } from '@/stores/workout'
import Highcharts from 'highcharts'

// 設定 Highcharts 語言配置，強制使用 en-US 以避免語言標籤錯誤
Highcharts.setOptions({
  lang: {
    thousandsSep: ',',
    decimalPoint: '.',
    resetZoom: 'Reset zoom',
    resetZoomTitle: 'Reset zoom level 1:1',
    printChart: 'Print chart',
    downloadPNG: 'Download PNG image',
    downloadJPEG: 'Download JPEG image',
    downloadPDF: 'Download PDF document',
    downloadSVG: 'Download SVG vector image',
    contextButtonTitle: 'Chart context menu',
    loading: 'Loading...',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
  global: {
    useUTC: false,
  },
})

// --- Chart Container and Instance ---
const chartContainer = ref(null)
let chartInstance = null

// --- Stores ---
const workoutStore = useWorkoutStore()

// --- Highcharts Custom Theme (reusing from existing charts) ---
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
  console.log(chartData.value)
  if (!chartData.value || chartData.value.data.length === 0) {
    return
  }
  // Highcharts.chart('container', {
  //   chart: {
  //     type: 'column',
  //   },
  //   title: {
  //     text: 'Corn vs wheat estimated production for 2023',
  //   },
  //   subtitle: {
  //     text: 'Source: <a target="_blank" ' + 'href="https://www.indexmundi.com/agriculture/?commodity=corn">indexmundi</a>',
  //   },
  //   xAxis: {
  //     categories: ['USA', 'China', 'Brazil', 'EU', 'Argentina', 'India'],
  //     crosshair: true,
  //     accessibility: {
  //       description: 'Countries',
  //     },
  //   },
  //   yAxis: {
  //     min: 0,
  //     title: {
  //       text: '1000 metric tons (MT)',
  //     },
  //   },
  //   tooltip: {
  //     valueSuffix: ' (1000 MT)',
  //   },
  //   plotOptions: {
  //     column: {
  //       pointPadding: 0.2,
  //       borderWidth: 0,
  //     },
  //   },
  //   series: [
  //     {
  //       name: 'Corn',
  //       data: [387749, 280000, 129000, 64300, 54000, 34300],
  //     },
  //   ],
  // })

  if (chartContainer.value) {
    chartInstance = Highcharts.chart(chartContainer.value, {
      ...darkThemeOptions,
      chart: { ...darkThemeOptions.chart, type: 'column' }, // Bar chart for counts
      title: { ...darkThemeOptions.title, text: '每月訓練次數' },
      xAxis: {
        ...darkThemeOptions.xAxis,
        categories: chartData.value.categories,
        title: { text: '月份' },
      },
      yAxis: {
        ...darkThemeOptions.yAxis,
        title: { text: '訓練次數' },
        allowDecimals: false, // Counts should be integers
      },
      series: [
        {
          name: '訓練次數',
          data: chartData.value.data,
          color: darkThemeOptions.colors[0],
        },
      ],
      tooltip: {
        ...darkThemeOptions.tooltip,
        pointFormat: '<b>{point.y} 次</b>',
      },
      plotOptions: {
        column: {
          dataLabels: {
            enabled: true,
            color: '#ffffff',
          },
        },
      },
    })
  }
}

// --- Watchers ---
watch(() => workoutStore.workouts, updateChart, { deep: true })

// --- Lifecycle Hooks ---
onMounted(updateChart)

onBeforeUnmount(() => {
  if (chartInstance) chartInstance.destroy()
})
</script>

<template>
  <div class="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
    <div v-if="chartData && chartData.data.length > 0">
      <div ref="chartContainer" style="height: 400px; width: 100%"></div>
    </div>
    <div v-else class="text-center text-gray-400 py-10">
      <p>目前沒有足夠的訓練紀錄來繪製每月訓練次數圖表。</p>
      <p>請增加更多訓練紀錄！</p>
    </div>
  </div>
</template>
