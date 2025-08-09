<template>
  <v-container fluid class="pa-0">
    <!-- 移除額外的 app-bar，改用固定在頂部的操作欄 -->
    <div v-if="dailyWorkoutRef?.isWorkoutActive && dailyWorkoutRef?.currentExercises.length > 0" class="workout-action-bar">
      <v-btn @click="discard" color="error" variant="tonal" size="small">
        <v-icon left>mdi-delete-sweep-outline</v-icon>
        丟棄進度
      </v-btn>
    </div>
    <DailyWorkout ref="dailyWorkoutRef" />
  </v-container>
</template>
<script setup>
import { ref } from 'vue'
import DailyWorkout from '@/components/DailyWorkout.vue'

const dailyWorkoutRef = ref(null)

const discard = () => {
  if (dailyWorkoutRef.value) {
    dailyWorkoutRef.value.discardWorkout()
  }
}
</script>

<style scoped>
.workout-action-bar {
  position: fixed;
  top: 80px; /* 主 app-bar 下方 */
  right: 16px;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  padding: 8px;
}

/* 手機版調整 */
@media (max-width: 600px) {
  .workout-action-bar {
    top: 70px;
    right: 8px;
    padding: 4px;
  }
}
</style>
