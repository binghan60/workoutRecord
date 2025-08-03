<template>
  <v-container class="fill-height d-flex justify-center align-center">
    <v-card class="pa-4 text-center" max-width="600">
      <v-card-title class="text-h4 font-weight-bold mb-2">
        <v-icon color="amber" size="x-large" class="mr-2">mdi-trophy-award</v-icon>
        今日訓練完成！
      </v-card-title>
      <v-card-subtitle class="text-h6">{{ workout.name }}</v-card-subtitle>

      <v-card-text class="mt-4">
        <v-row>
          <v-col cols="12" sm="4">
            <div class="text-h5 font-weight-bold">{{ totalVolume.toLocaleString() }} kg</div>
            <div class="text-caption text-medium-emphasis">總訓練量</div>
            <div v-if="previousWorkout" class="text-caption" :class="volumeDifference > 0 ? 'text-success' : 'text-red'">
              {{ volumeDifference > 0 ? '+' : '' }}{{ volumeDifference.toLocaleString() }} kg vs 上次
              <v-icon size="x-small">{{ volumeDifference > 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
            </div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="text-h5 font-weight-bold">{{ totalSets }}</div>
            <div class="text-caption text-medium-emphasis">總組數</div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="text-h5 font-weight-bold">{{ workout.exercises.length }}</div>
            <div class="text-caption text-medium-emphasis">個動作</div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="justify-center mt-4">
        <v-btn color="primary" variant="flat" size="large" @click="goToHistory">
          查看完整紀錄
        </v-btn>
        <v-btn variant="outlined" size="large" @click="$emit('start-extra')">
          開始額外訓練
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  workout: {
    type: Object,
    required: true,
  },
  previousWorkout: {
    type: Object,
    default: null,
  },
})

defineEmits(['start-extra'])

const router = useRouter()

const calculateVolume = (workout) => {
  if (!workout || !workout.exercises) return 0
  return workout.exercises.reduce((volume, exercise) => {
    return (
      volume +
      exercise.sets.reduce((exVolume, set) => {
        return exVolume + (set.reps || 0) * (set.weight || 0)
      }, 0)
    )
  }, 0)
}

const totalVolume = computed(() => calculateVolume(props.workout))
const previousTotalVolume = computed(() => calculateVolume(props.previousWorkout))

const volumeDifference = computed(() => {
  if (!props.previousWorkout) return 0
  return totalVolume.value - previousTotalVolume.value
})

const totalSets = computed(() => {
  return props.workout.exercises.reduce((count, exercise) => {
    return count + (exercise.sets ? exercise.sets.length : 0)
  }, 0)
})

const goToHistory = () => {
  router.push('/history')
}
</script>

<style scoped>
.fill-height {
  min-height: 80vh;
}
</style>
