<template>
  <v-container fluid>
    <v-tabs v-model="currentTab" bg-color="primary" grow>
      <v-tab value="workout">訓練統計</v-tab>
      <v-tab value="bodyMetrics">身體數值</v-tab>
    </v-tabs>

    <v-window v-model="currentTab">
      <!-- Workout Statistics Tab -->
      <v-window-item value="workout">
        <v-container fluid>
          <v-row>
            <v-col cols="12" class="pa-0 mb-10">
              <v-card>
                <v-card-text>
                  <!-- 改進的載入狀態 -->
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

            <v-col cols="12" class="pa-0">
              <!-- 改進的進度圖表載入狀態 -->
              <div v-if="!isLoading && exercisesWithSufficientData.length > 0">
                <v-row>
                  <v-col v-for="exercise in exercisesWithSufficientData" :key="exercise._id" cols="12" md="6">
                    <v-card>
                      <v-card-text>
                        <ProgressChart :exercise-name="exercise.name" />
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </div>
              <!-- 載入中的骨架 -->
              <div v-else-if="isLoading">
                <v-row>
                  <v-col v-for="i in 4" :key="i" cols="12" md="6">
                    <SkeletonLoader type="chart" :chart-height="chartDimensions.height" />
                  </v-col>
                </v-row>
              </div>
              <!-- 空狀態 -->
              <v-card v-else class="text-center pa-8">
                <v-card-text>
                  <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-chart-timeline-variant</v-icon>
                  <p class="text-h6 mb-2">沒有足夠訓練紀錄</p>
                  <p class="text-body-1 text-medium-emphasis mb-4">請先新增動作並記錄至少兩次訓練來查看進度圖表！</p>
                  <div class="d-flex justify-center gap-2">
                    <v-btn color="primary" to="/exercises" prepend-icon="mdi-weight-lifter">
                      管理動作
                    </v-btn>
                    <v-btn color="secondary" to="/" prepend-icon="mdi-dumbbell">
                      開始訓練
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
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
    const needWorkouts = !workoutStore.allWorkouts || workoutStore.allWorkouts.length === 0
    const needExercises = !exerciseStore.allExercises || exerciseStore.allExercises.length === 0
    if (!needWorkouts && !needExercises) {
      isLoading.value = false
      return
    }
    isLoading.value = true
    const tasks = []
    if (needWorkouts) tasks.push(workoutStore.fetchAllWorkouts())
    if (needExercises) tasks.push(exerciseStore.fetchExercises())
    await Promise.all(tasks)
  } catch (error) {
    console.error('載入儀表板數據失敗:', error)
  } finally {
    isLoading.value = false
  }
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
</script>
