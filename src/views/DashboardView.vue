<script setup>
import { computed } from 'vue'
import { useExerciseStore } from '@/stores/exercise'
import { useWorkoutStore } from '@/stores/workout' // 新增引入 workoutStore
import ProgressChart from '@/components/ProgressChart.vue'
import OverallWorkoutChart from '@/components/OverallWorkoutChart.vue'

const exerciseStore = useExerciseStore()
const workoutStore = useWorkoutStore() // 初始化 workoutStore

// 過濾出有足夠訓練紀錄的動作 (至少兩次紀錄才能繪製趨勢圖)
const exercisesWithSufficientData = computed(() => {
  return exerciseStore.allExercises.filter((exercise) => {
    const historyCount = workoutStore.workouts.filter((workout) => workout.exercises.some((ex) => ex.name === exercise.name && ex.sets.some((set) => parseFloat(set.weight) > 0 && parseInt(set.reps) > 0))).length
    return historyCount >= 2
  })
})
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2">
    <!-- 左欄：整體訓練量圖表 -->
    <div class="p-4 col-span-2">
      <h2 class="text-2xl font-semibold mb-4 text-cyan-400">整體訓練量</h2>
      <OverallWorkoutChart />
    </div>
    <!-- 右欄：各動作歷史趨勢 (兩欄佈局) -->

    <div class="col-span-2">
      <h2 class="p-4 text-2xl font-semibold mb-4 text-cyan-400">各動作歷史趨勢</h2>
      <div v-if="exercisesWithSufficientData.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-8 col-span-2">
        <div v-for="exercise in exercisesWithSufficientData" :key="exercise.id">
          <ProgressChart :exercise-name="exercise.name" />
        </div>
      </div>
      <div v-else class="col-span-2 text-center text-gray-400 py-10 rounded-lg shadow-lg">
        <p>沒有足夠訓練紀錄的動作可以顯示趨勢圖</p>
        <p>請先新增動作並記錄至少兩次訓練！</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add any specific styles for this view here if needed */
</style>
