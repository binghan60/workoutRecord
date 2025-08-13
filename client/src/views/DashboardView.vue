<template>
  <v-container>
    <v-tabs v-model="currentTab" :bg-color="$vuetify.theme.current.dark ? 'surface' : 'surface'" color="primary" density="compact" grow class="rounded-lg page-tabs">
      <v-tab value="workout">訓練統計</v-tab>
      <v-tab value="bodyMetrics">身體數值</v-tab>
    </v-tabs>

    <v-window v-model="currentTab">
      <!-- Workout Statistics Tab -->
      <v-window-item value="workout">
        <!-- Hero Section -->
        <v-row>
          <v-col cols="12">
            <v-card class="hero-card" variant="flat">
              <v-card-text class="py-3 px-3 py-sm-6 px-sm-6">
                <div class="d-flex flex-column flex-md-row align-center justify-space-between">
                  <div class="mb-4 mb-md-0">
                    <div class="text-overline text-primary">本週概要</div>
                    <h2 class="text-h4 font-weight-bold mb-2">{{ greetingTitle }}</h2>
                    <div class="text-body-2 text-medium-emphasis">{{ heroSubtitle }}</div>
                  </div>
                  <div class="d-flex align-center">
                    <v-btn color="primary" to="/" prepend-icon="mdi-dumbbell" class="mr-2">開始訓練</v-btn>
                    <v-btn color="secondary" to="/templates" prepend-icon="mdi-clipboard-list">選課表</v-btn>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- KPI Cards -->
        <v-row align="stretch" justify="start">
          <v-col v-for="kpi in kpis" :key="kpi.key" cols="12" sm="6" md="3" class="d-flex">
            <v-card class="kpi-card flex-grow-1" elevation="2">
              <v-card-text class="d-flex align-center py-3 px-3 py-sm-4 px-sm-4">
                <v-avatar size="40" class="mr-4 no-shadow" :color="kpi.color + '-lighten-4'">
                  <v-icon :color="kpi.color">{{ kpi.icon }}</v-icon>
                </v-avatar>
                <div>
                  <div class="text-caption text-medium-emphasis">{{ kpi.label }}</div>
                  <div class="d-flex align-end">
                    <div class="text-h5 font-weight-bold mr-2">
                      <span :ref="(el) => setKpiRef(kpi.key, el)">{{ kpi.value }}</span>
                    </div>
                    <div v-if="kpi.delta !== null && kpi.delta !== undefined" class="text-caption" :class="kpi.delta >= 0 ? 'text-success' : 'text-error'">
                      <v-icon size="16" :color="kpi.delta >= 0 ? 'success' : 'error'">{{ kpi.delta >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
                      {{ Math.abs(kpi.delta) }} vs 上週
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Charts: Overall trend -->
        <v-row>
          <v-col cols="12" class="mb-6">
            <v-card>
              <v-card-title class="d-flex align-center justify-space-between py-2 px-3 py-sm-3 px-sm-4">
                <div class="d-flex align-center">
                  <v-icon class="mr-2">mdi-chart-timeline-variant</v-icon>
                  <span class="text-h6">每月訓練次數</span>
                </div>
              </v-card-title>
              <v-card-text>
                <OverallWorkoutChart v-if="workoutStore.allWorkouts.length > 0" />
                <SkeletonLoader v-else-if="isLoading" type="chart" :chart-height="chartDimensions.height" />
                <div v-else class="text-center py-10">
                  <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-chart-line</v-icon>
                  <p class="text-h6 mb-2">尚無訓練紀錄</p>
                  <p class="text-body-2 text-medium-emphasis">開始您的第一次訓練來查看統計圖表！</p>
                  <v-btn color="primary" class="mt-4" to="/">開始訓練</v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Progress charts by exercise -->
          <v-col cols="12">
            <div v-if="!isLoading && exercisesWithSufficientData.length > 0">
              <v-row>
                <v-col v-for="exercise in exercisesWithSufficientData" :key="exercise._id" cols="12" md="6">
                  <v-card>
                    <v-card-title class="text-subtitle-1">{{ exercise.name }} 進度</v-card-title>
                    <v-card-text>
                      <ProgressChart :exercise-name="exercise.name" />
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </div>
            <div v-else-if="isLoading">
              <v-row>
                <v-col v-for="i in 4" :key="i" cols="12" md="6">
                  <SkeletonLoader type="chart" :chart-height="chartDimensions.height" />
                </v-col>
              </v-row>
            </div>
            <v-card v-else class="text-center pa-8">
              <v-card-text>
                <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-chart-timeline-variant</v-icon>
                <p class="text-h6 mb-2">沒有足夠訓練紀錄</p>
                <p class="text-body-1 text-medium-emphasis mb-4">請先新增動作並記錄至少兩次訓練來查看進度圖表！</p>
                <div class="d-flex justify-center gap-2">
                  <v-btn color="primary" to="/exercises" prepend-icon="mdi-weight-lifter"> 管理動作 </v-btn>
                  <v-btn color="secondary" to="/" prepend-icon="mdi-dumbbell"> 開始訓練 </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>
      <!-- Body Metrics Tab -->
      <v-window-item value="bodyMetrics">
        <BodyMetrics />
      </v-window-item>
    </v-window>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useExerciseStore } from '@/stores/exercise'
import { useWorkoutStore } from '@/stores/workout'
import { useUIStore } from '@/stores/ui'
import { useResponsiveDesign } from '@/composables/useResponsiveDesign'
import { animateNumber, fadeIn } from '@/utils/animations'
import ProgressChart from '@/components/ProgressChart.vue'
import OverallWorkoutChart from '@/components/OverallWorkoutChart.vue'
import BodyMetrics from '@/components/BodyMetrics.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'

const exerciseStore = useExerciseStore()
const workoutStore = useWorkoutStore()
const uiStore = useUIStore()
const { chartDimensions } = useResponsiveDesign()

const currentTab = ref('workout')
const isLoading = ref(true)

// 獲取所有訓練數據以進行準確的圖表繪製
onMounted(async () => {
  try {
    // Only load if data is not already available (avoiding duplicate API calls)
    const needWorkouts = !workoutStore.allWorkouts || workoutStore.allWorkouts.length === 0
    const needExercises = !exerciseStore.allExercises || exerciseStore.allExercises.length === 0

    if (!needWorkouts && !needExercises) {
      isLoading.value = false
      return
    }

    isLoading.value = true
    const tasks = []
    if (needWorkouts) {
      tasks.push(workoutStore.fetchAllWorkouts())
    }
    if (needExercises) {
      tasks.push(exerciseStore.fetchExercises())
    }
    await Promise.all(tasks)
  } catch (error) {
    console.error('載入儀表板數據失敗:', error)
  } finally {
    isLoading.value = false
  }
})

const startOfWeek = (date) => {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // Monday as 0
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day)
  return d
}

const endOfWeek = (date) => {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

const getWeekKey = (date) => {
  const s = startOfWeek(date)
  return `${s.getFullYear()}-${(s.getMonth() + 1).toString().padStart(2, '0')}-${s.getDate().toString().padStart(2, '0')}`
}

const greetingTitle = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return '早安，準備好開始訓練了嗎？'
  if (hour < 18) return '午安，持續保持動能！'
  return '晚安，今天也別忘了活動一下！'
})

const heroSubtitle = computed(() => {
  if (!workoutStore.allWorkouts || workoutStore.allWorkouts.length === 0) return '新增訓練來啟動你的目標！'
  const thisWeek = startOfWeek(new Date())
  const nextWeek = endOfWeek(new Date())
  const count = workoutStore.allWorkouts.filter((w) => {
    const d = new Date(w.createdAt || w.date)
    return d >= thisWeek && d <= nextWeek
  }).length
  return `本週已完成 ${count} 次訓練`
})

const lastWeekStats = computed(() => {
  const now = new Date()
  // 上週的週期
  const start = startOfWeek(new Date(now))
  start.setDate(start.getDate() - 7)
  const end = endOfWeek(start)

  let sessions = 0
  let totalSets = 0
  let totalVolume = 0

  for (const w of workoutStore.allWorkouts) {
    const d = new Date(w.createdAt || w.date)
    if (d >= start && d <= end) {
      sessions++
      for (const ex of w.exercises || []) {
        for (const s of ex.sets || []) {
          totalSets += 1
          totalVolume += (Number(s.reps) || 0) * (Number(s.weight) || 0)
        }
      }
    }
  }
  return { sessions, totalSets, totalVolume }
})

const kpis = computed(() => {
  const now = new Date()
  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(now)

  let sessions = 0
  let totalSets = 0
  let totalVolume = 0 // weight * reps

  const dayKeys = new Set()
  for (const w of workoutStore.allWorkouts) {
    const d = new Date(w.createdAt || w.date)
    if (d >= weekStart && d <= weekEnd) {
      sessions++
      dayKeys.add(d.toDateString())
      for (const ex of w.exercises || []) {
        for (const s of ex.sets || []) {
          const reps = Number(s.reps) || 0
          const weight = Number(s.weight) || 0
          totalSets += 1
          totalVolume += reps * weight
        }
      }
    }
  }

  // 計算連續訓練天數（至今天）
  let streak = 0
  const daysBack = 30
  for (let i = 0; i < daysBack; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toDateString()
    const trained = workoutStore.allWorkouts.some((w) => new Date(w.createdAt || w.date).toDateString() === key)
    if (trained) streak++
    else break
  }

  const deltaSessions = sessions - lastWeekStats.value.sessions
  const deltaSets = totalSets - lastWeekStats.value.totalSets
  const deltaVolume = totalVolume - lastWeekStats.value.totalVolume

  return [
    { key: 'sessions', label: '本週次數', value: sessions, delta: deltaSessions, icon: 'mdi-calendar-check', color: 'primary' },
    { key: 'sets', label: '本週總組數', value: totalSets, delta: deltaSets, icon: 'mdi-format-list-numbered', color: 'secondary' },
    { key: 'volume', label: '本週總量 (kg·reps)', value: totalVolume, delta: deltaVolume, icon: 'mdi-weight-kilogram', color: 'primary' },
    { key: 'streak', label: '連續天數', value: streak, delta: null, icon: 'mdi-fire', color: 'secondary' },
  ]
})

const exercisesWithSufficientData = computed(() => {
  if (!workoutStore.allWorkouts || workoutStore.allWorkouts.length === 0) {
    return []
  }

  // Step 1: Get all unique exercise names from the entire workout history.
  const historicalExerciseNames = new Set()
  workoutStore.allWorkouts.forEach((workout) => {
    workout.exercises.forEach((ex) => {
      historicalExerciseNames.add(ex.name)
    })
  })

  // Step 2: For each unique name, check if it has at least two valid workout entries.
  const exercisesWithHistory = [...historicalExerciseNames].map((name) => {
    const historyCount = workoutStore.allWorkouts.filter((workout) => workout.exercises.some((ex) => ex.name === name && ex.sets.some((set) => parseFloat(set.weight) > 0 && parseInt(set.reps) > 0))).length
    return { name, historyCount }
  })

  // Step 3: Filter for those with 2 or more entries and format for the template.
  // We use the name as the key since it's unique in this historical context.
  return exercisesWithHistory.filter((ex) => ex.historyCount >= 2).map((ex) => ({ name: ex.name, _id: ex.name }))
})
const kpiRefs = {}
const setKpiRef = (key, el) => {
  if (el) kpiRefs[key] = el
}

watch(
  kpis,
  async (newKpis, oldKpis) => {
    await nextTick()
    newKpis.forEach((kpi) => {
      const el = kpiRefs[kpi.key]
      if (!el) return
      const from = oldKpis?.find((o) => o.key === kpi.key)?.value ?? 0
      const to = kpi.value || 0
      animateNumber(el, from, to, 600)
    })
  },
  { immediate: true },
)
</script>

<style scoped>
.hero-card {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.12), rgba(var(--v-theme-secondary), 0.12));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.kpi-card {
  transition:
    transform 150ms var(--ease-out),
    box-shadow 150ms var(--ease-out);
}
.kpi-card:hover {
  transform: translateY(-2px);
}
</style>
