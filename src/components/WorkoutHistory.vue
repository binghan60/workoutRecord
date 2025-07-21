<script setup>
import { useWorkoutStore } from '@/stores/workout'
import { useExerciseStore } from '@/stores/exercise'
import { useModalStore } from '@/stores/modal'
import { computed, ref } from 'vue'
import { getMuscleGroupColor } from '@/utils/colorUtils'
import ChartModal from './ChartModal.vue'

const workoutStore = useWorkoutStore()
const exerciseStore = useExerciseStore()
const modalStore = useModalStore()

const workouts = computed(() => workoutStore.paginatedWorkouts)

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
  return new Date(dateString).toLocaleDateString(undefined, options)
}

const confirmDeleteWorkout = (workoutId) => {
  modalStore.showConfirmation('確認刪除', '確定要刪除這筆訓練紀錄嗎？此操作無法復原。', () => {
    workoutStore.deleteWorkout(workoutId)
  })
}
</script>

<template>
  <div class="mx-auto h-full p-4 mb-30">
    <h2 class="text-2xl font-semibold mb-4 text-white border-b-2 border-gray-700 pb-2">訓練紀錄</h2>

    <div v-if="workoutStore.workouts.length === 0" class="h-full flex flex-col items-center justify-center text-center text-gray-400 p-6 rounded-lg">
      <div>
        <p class="text-lg">目前沒有任何訓練紀錄。</p>
        <p class="mt-2">立即開始記錄你的第一次訓練吧！</p>
      </div>
    </div>
    <div v-else>
      <div class="space-y-8">
        <div v-for="workout in workouts" :key="workout.id" class="sm:p-6 rounded-lg shadow-lg">
          <div class="flex justify-between items-start mb-4 border-b border-gray-700 pb-3">
            <div>
              <h2 class="text-2xl font-bold text-white mb-1">{{ workout.name }}</h2>
              <p class="text-sm text-gray-400">{{ formatDate(workout.createdAt) }}</p>
            </div>
            <button @click="confirmDeleteWorkout(workout.id)" class="text-red-500 hover:text-red-400 transition-colors font-semibold py-2 px-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm">刪除</button>
          </div>

          <div class="space-y-6">
            <div v-for="(exercise, index) in workout.exercises" :key="index">
              <div class="flex items-center mb-3">
                <button @click="showChartModal(exercise.name)" class="text-xl font-semibold text-gray-200 hover:text-cyan-400 transition-colors">
                  {{ exercise.name }}
                </button>
                <span v-if="getExerciseDetails(exercise.name)" :class="['ml-3 text-xs font-medium px-2.5 py-1 rounded-full', getMuscleGroupColor(getExerciseDetails(exercise.name).muscleGroup)]">
                  {{ getExerciseDetails(exercise.name).muscleGroup }}
                </span>
              </div>

              <div class="overflow-x-auto">
                <table class="min-w-full text-center bg-gray-700 rounded-md overflow-hidden">
                  <thead class="bg-gray-900/50 text-gray-300 text-sm">
                    <tr>
                      <th class="p-2 font-semibold">組</th>
                      <th class="p-2 font-semibold">重量(kg)</th>
                      <th class="p-2 font-semibold">次數</th>
                      <th class="p-2 font-semibold">實際休息(s)</th>
                    </tr>
                  </thead>
                  <tbody class="text-gray-300">
                    <tr v-for="(set, setIndex) in exercise.sets" :key="setIndex" class="border-b border-gray-600/50 last:border-b-0">
                      <td class="p-2">{{ setIndex + 1 }}</td>
                      <td class="p-2">{{ set.weight }}</td>
                      <td class="p-2">{{ set.reps }}</td>
                      <td class="p-2 text-gray-400">{{ set.actualRestTime ?? 'N/A' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination Controls -->
      <div v-if="workoutStore.totalPages > 1" class="flex justify-center items-center mt-8 space-x-4 text-white">
        <button @click="workoutStore.goToPage(workoutStore.currentPage - 1)" :disabled="workoutStore.currentPage === 1" class="px-4 py-2 bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600">&lt; 上一頁</button>
        <span class="font-semibold">第 {{ workoutStore.currentPage }} / {{ workoutStore.totalPages }} 頁</span>
        <button @click="workoutStore.goToPage(workoutStore.currentPage + 1)" :disabled="workoutStore.currentPage === workoutStore.totalPages" class="px-4 py-2 bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600">下一頁 &gt;</button>
      </div>
    </div>

    <ChartModal :visible="isModalVisible" :exercise-name="selectedExerciseForChart" @close="closeChartModal" />
  </div>
</template>