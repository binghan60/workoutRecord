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
                  <!-- Add v-if to ensure data is loaded before rendering chart -->
                  <OverallWorkoutChart v-if="workoutStore.allWorkouts.length > 0" />
                  <div v-else class="text-center py-10">
                    <p class="text-h6">資料載入中或尚無訓練紀錄...</p>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" class="pa-0">
              <!-- Add v-if to ensure data is loaded before rendering charts -->
              <div v-if="exercisesWithSufficientData.length > 0">
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
              <v-card v-else class="text-center pa-5">
                <v-card-text class="pa-0">
                  <p class="text-h6">沒有足夠訓練紀錄</p>
                  <p class="text-body-1">請先新增動作並記錄至少兩次訓練！</p>
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
import { ref, computed, onMounted } from 'vue'
import { useExerciseStore } from '@/stores/exercise'
import { useWorkoutStore } from '@/stores/workout'
import ProgressChart from '@/components/ProgressChart.vue'
import OverallWorkoutChart from '@/components/OverallWorkoutChart.vue'
import BodyMetrics from '@/components/BodyMetrics.vue'

const exerciseStore = useExerciseStore()
const workoutStore = useWorkoutStore()

const currentTab = ref('workout')

// Fetch all workout data when the component is mounted for accurate charting
onMounted(async () => {
  await workoutStore.fetchAllWorkouts()
  await exerciseStore.fetchExercises()
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
