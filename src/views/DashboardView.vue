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
            <v-col cols="12" class="pa-0">
              <v-card>
                <v-card-title>整體訓練量</v-card-title>
                <v-card-text>
                  <OverallWorkoutChart />
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" class="pa-0">
              <h2 class="text-h5 font-weight-bold my-4">各動作歷史趨勢</h2>
              <div v-if="exercisesWithSufficientData.length > 0">
                <v-row>
                  <v-col v-for="exercise in exercisesWithSufficientData" :key="exercise.id" cols="12" md="6">
                    <v-card>
                      <v-card-text>
                        <ProgressChart :exercise-name="exercise.name" />
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </div>
              <v-card v-else class="text-center pa-5">
                <v-card-text>
                  <p class="text-h6">沒有足夠訓練紀錄的動作可以顯示趨勢圖</p>
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
import { ref, computed } from 'vue'
import { useExerciseStore } from '@/stores/exercise'
import { useWorkoutStore } from '@/stores/workout'
import ProgressChart from '@/components/ProgressChart.vue'
import OverallWorkoutChart from '@/components/OverallWorkoutChart.vue'
import BodyMetrics from '@/components/BodyMetrics.vue'

const exerciseStore = useExerciseStore()
const workoutStore = useWorkoutStore()

const currentTab = ref('workout')

const exercisesWithSufficientData = computed(() => {
  return exerciseStore.allExercises.filter((exercise) => {
    const historyCount = workoutStore.workouts.filter((workout) => workout.exercises.some((ex) => ex.name === exercise.name && ex.sets.some((set) => parseFloat(set.weight) > 0 && parseInt(set.reps) > 0))).length
    return historyCount >= 2
  })
})
</script>
