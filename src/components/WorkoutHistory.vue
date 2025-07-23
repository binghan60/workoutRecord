<template>
  <div>
    <h1 class="text-h4 font-weight-bold mb-4">訓練紀錄</h1>

    <v-card v-if="workoutStore.workouts.length === 0" class="pa-8 text-center">
      <v-card-text>
        <p class="text-h6">目前沒有任何訓練紀錄。</p>
        <p class="mt-2">立即開始記錄你的第一次訓練吧！</p>
      </v-card-text>
    </v-card>

    <div v-else>
      <v-row>
        <v-col v-for="workout in workouts" :key="workout.id" cols="12">
          <v-card>
            <v-card-title class="d-flex justify-space-between align-center">
              <div>
                <p class="text-h5">{{ workout.name }}</p>
                <p class="text-caption">{{ formatDate(workout.createdAt) }}</p>
              </div>
              <v-btn color="red" variant="text" @click="confirmDeleteWorkout(workout.id)">刪除</v-btn>
            </v-card-title>
            <v-card-text>
              <v-expansion-panels>
                <v-expansion-panel v-for="(exercise, index) in workout.exercises" :key="index">
                  <v-expansion-panel-title>
                    <v-btn variant="text" class="pa-0" @click.stop="showChartModal(exercise.name)">
                      {{ exercise.name }}
                    </v-btn>
                    <v-chip v-if="getExerciseDetails(exercise.name)" :color="getMuscleGroupColor(getExerciseDetails(exercise.name).muscleGroup)" size="small" class="ml-3">
                      {{ getExerciseDetails(exercise.name).muscleGroup }}
                    </v-chip>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-table dense>
                      <thead>
                        <tr>
                          <th class="text-left">組</th>
                          <th class="text-left">重量(kg)</th>
                          <th class="text-left">次數</th>
                          <th class="text-left">實際休息(s)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(set, setIndex) in exercise.sets" :key="setIndex">
                          <td>{{ setIndex + 1 }}</td>
                          <td>{{ set.weight }}</td>
                          <td>{{ set.reps }}</td>
                          <td>{{ set.actualRestTime ?? 'N/A' }}</td>
                        </tr>
                      </tbody>
                    </v-table>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Pagination Controls -->
      <div v-if="workoutStore.totalPages > 1" class="d-flex justify-center mt-8">
        <v-pagination v-model="currentPage" :length="workoutStore.totalPages" rounded="circle"></v-pagination>
      </div>
    </div>

    <ChartModal :visible="isModalVisible" :exercise-name="selectedExerciseForChart" @close="closeChartModal" />
  </div>
</template>

<script setup>
import { useWorkoutStore } from '@/stores/workout'
import { useExerciseStore } from '@/stores/exercise'
import { useModalStore } from '@/stores/modal'
import { computed, ref, watch } from 'vue'
import { getMuscleGroupColor } from '@/utils/colorUtils'
import ChartModal from './ChartModal.vue'

const workoutStore = useWorkoutStore()
const exerciseStore = useExerciseStore()
const modalStore = useModalStore()

const workouts = computed(() => workoutStore.paginatedWorkouts)
const currentPage = ref(workoutStore.currentPage)

watch(currentPage, (newPage) => {
  workoutStore.goToPage(newPage)
})

const isModalVisible = ref(false)
const selectedExerciseForChart = ref('')

const showChartModal = (exerciseName) => {
  selectedExerciseForChart.value = exerciseName
  isModalVisible.value = true
}

const closeChartModal = () => {
  isModalVisible.value = false
}

const getExerciseDetails = (exerciseName) => {
  return exerciseStore.allExercises.find((ex) => ex.name === exerciseName)
}

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  return new Date(dateString).toLocaleDateString('zh-TW', options)
}

const confirmDeleteWorkout = (workoutId) => {
  modalStore.showConfirmation('確認刪除', '確定要刪除這筆訓練紀錄嗎？此操作無法復原。', () => {
    workoutStore.deleteWorkout(workoutId)
  })
}
</script>
