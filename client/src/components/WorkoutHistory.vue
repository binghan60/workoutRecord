<template>
  <v-card v-if="workouts.length === 0 && !uiStore.isLoading" class="pa-8 text-center">
    <v-card-text>
      <p class="text-h6">目前沒有任何訓練紀錄。</p>
      <p class="mt-2">立即開始記錄你的第一次訓練吧！</p>
    </v-card-text>
  </v-card>

  <div v-else>
    <v-row>
      <v-col v-for="workout in workouts" :key="workout._id" cols="12">
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            <div>
              <p class="text-h5">{{ workout.name }}</p>
              <p class="text-caption">{{ formatDate(workout.createdAt) }}</p>
            </div>
            <div>
              <v-btn variant="text" @click="toggleAll(workout._id, workout.exercises.length)">
                {{ areAllExpanded(workout._id, workout.exercises.length) ? '全部收合' : '全部展開' }}
              </v-btn>
              <v-btn color="red" variant="text" @click="confirmDeleteWorkout(workout._id)">刪除</v-btn>
            </div>
          </v-card-title>
          <v-card-text>
            <v-expansion-panels v-model="expandedPanels[workout._id]" multiple>
              <v-expansion-panel v-for="(exercise, index) in workout.exercises" :key="index">
                <v-expansion-panel-title>
                  <v-btn variant="text" class="pa-0" @click.stop="showChartModal(exercise.name)">
                    {{ exercise.name }}
                  </v-btn>
                  <v-tooltip text="點擊動作名稱以查看詳細圖表" location="top">
                    <template v-slot:activator="{ props }">
                      <v-icon v-bind="props" size="x-small" class="ml-1" icon="mdi-information-outline"></v-icon>
                    </template>
                  </v-tooltip>
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
      <v-pagination v-model="page" :length="workoutStore.totalPages" rounded="circle"></v-pagination>
    </div>
  </div>

  <ChartModal :visible="isModalVisible" :exercise-name="selectedExerciseForChart" @close="closeChartModal" />
</template>

<script setup>
import { useWorkoutStore } from '@/stores/workout'
import { useExerciseStore } from '@/stores/exercise'
import { useModalStore } from '@/stores/modal'
import { useUIStore } from '@/stores/ui'
import { computed, ref, watch, onMounted } from 'vue'
import ChartModal from './ChartModal.vue'

const workoutStore = useWorkoutStore()
const exerciseStore = useExerciseStore()
const modalStore = useModalStore()
const uiStore = useUIStore()

const workouts = computed(() => workoutStore.paginatedWorkouts)
const page = ref(workoutStore.currentPage)
const expandedPanels = ref({})

// Fetch workouts when the component is mounted
onMounted(() => {
  workoutStore.fetchWorkouts(page.value)
})

// Watch for page changes from the pagination component
watch(page, (newPage) => {
  workoutStore.goToPage(newPage)
})

// Watch for changes from the store (e.g., after deletion)
watch(
  () => workoutStore.currentPage,
  (newStorePage) => {
    page.value = newStorePage
  },
)

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

const areAllExpanded = (workoutId, exerciseCount) => {
  return expandedPanels.value[workoutId]?.length === exerciseCount
}

const toggleAll = (workoutId, exerciseCount) => {
  if (areAllExpanded(workoutId, exerciseCount)) {
    expandedPanels.value[workoutId] = []
  } else {
    expandedPanels.value[workoutId] = [...Array(exerciseCount).keys()]
  }
}
</script>
