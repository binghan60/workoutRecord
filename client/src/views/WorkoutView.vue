<template>
  <v-container fluid class="pa-0">
    <v-app-bar app color="background" flat>
      <v-spacer></v-spacer>
      <v-btn v-if="dailyWorkoutRef?.isWorkoutActive" @click="discard" color="red" variant="text">
        <v-icon left>mdi-delete-sweep-outline</v-icon>
        丟棄進度
      </v-btn>
    </v-app-bar>
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
