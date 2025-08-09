<template>
  <v-container class="fill-height d-flex justify-center align-center pa-2 pa-sm-4">
    <v-card class="pa-3 pa-sm-6 text-center" max-width="600" width="100%">
      <v-card-title class="text-h6 text-sm-h4 font-weight-bold mb-3 px-0">
        <div class="d-flex flex-column align-center justify-center w-100">
          <v-icon color="success" :size="$vuetify.display.xs ? 'large' : 'x-large'" class="mb-2">mdi-trophy-award</v-icon>
          <span class="text-center">今日訓練完成！</span>
        </div>
      </v-card-title>
      <v-card-subtitle class="text-h6 text-sm-h5 px-0">{{ workout.name }}</v-card-subtitle>

      <v-card-text class="mt-2 mt-sm-4 px-2 px-sm-4">
        <v-row>
          <v-col cols="12" sm="4" class="animate-fade-in-up">
            <div class="stats-card text-center pa-3 hover-lift transition-all">
              <div ref="volumeRef" class="text-h5 font-weight-bold animated-number">0 kg</div>
              <div class="text-caption text-medium-emphasis">總訓練量</div>
              <div v-if="previousWorkout" class="text-caption mt-1 animate-fade-in-up" style="animation-delay: 0.3s;" :class="volumeDifference > 0 ? 'text-success' : 'text-red'">
                <v-icon size="x-small" class="mr-1">{{ volumeDifference > 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
                {{ volumeDifference > 0 ? '+' : '' }}{{ volumeDifference.toLocaleString() }} kg vs 上次
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="4" class="animate-fade-in-up" style="animation-delay: 0.1s;">
            <div class="stats-card text-center pa-3 hover-lift transition-all">
              <div ref="setsRef" class="text-h5 font-weight-bold animated-number">0</div>
              <div class="text-caption text-medium-emphasis">總組數</div>
            </div>
          </v-col>
          <v-col cols="12" sm="4" class="animate-fade-in-up" style="animation-delay: 0.2s;">
            <div class="stats-card text-center pa-3 hover-lift transition-all">
              <div ref="exercisesRef" class="text-h5 font-weight-bold animated-number">0</div>
              <div class="text-caption text-medium-emphasis">個動作</div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="justify-center mt-2 mt-sm-4 flex-column flex-sm-row px-2 px-sm-4">
        <v-btn 
          color="primary" 
          variant="flat" 
          :size="$vuetify.display.xs ? 'default' : 'large'" 
          @click="goToHistory"
          class="mb-2 mb-sm-0 mr-sm-2"
          block-on-xs
        >
          查看完整紀錄
        </v-btn>
        <v-btn 
          variant="outlined" 
          :size="$vuetify.display.xs ? 'default' : 'large'" 
          @click="$emit('start-extra')"
          block-on-xs
        >
          開始額外訓練
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { animateNumber, fadeIn } from '@/utils/animations'

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

// 動畫引用
const volumeRef = ref(null)
const setsRef = ref(null)
const exercisesRef = ref(null)

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

// 組件掛載後觸發數字動畫
onMounted(async () => {
  await nextTick()
  
  // 延遲一點開始動畫，讓頁面先渲染
  setTimeout(() => {
    // 總訓練量動畫
    if (volumeRef.value) {
      animateNumber(volumeRef.value, 0, totalVolume.value, 1000)
    }
    
    // 總組數動畫
    if (setsRef.value) {
      setTimeout(() => {
        animateNumber(setsRef.value, 0, totalSets.value, 800)
      }, 200)
    }
    
    // 動作數量動畫
    if (exercisesRef.value) {
      setTimeout(() => {
        animateNumber(exercisesRef.value, 0, props.workout.exercises.length, 600)
      }, 400)
    }
  }, 300)
})
</script>

<style scoped>
.fill-height {
  min-height: 80vh;
}

/* 確保手機版有足夠空間 */
@media (max-width: 600px) {
  .v-card-title {
    line-height: 1.2;
    word-break: keep-all;
    padding: 8px 0 !important;
  }
  
  .v-card-subtitle {
    padding: 0 !important;
    margin-bottom: 16px !important;
  }
  
  .v-btn {
    width: 100%;
    max-width: 280px;
  }
  
  /* 確保獎盃圖標有足夠空間 */
  .v-icon {
    margin: 4px 0 !important;
  }
}

/* 統計卡片樣式 */
.stats-card {
  background: rgba(var(--v-theme-primary), 0.08);
  border-radius: 12px;
  border: 1px solid transparent;
  transition: all 0.3s ease;
}

.stats-card:hover {
  background: rgba(var(--v-theme-primary), 0.15);
  border-color: rgba(var(--v-theme-primary), 0.3);
  transform: translateY(-2px);
}

.animated-number {
  background: linear-gradient(45deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-secondary)));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-size: 200% 200%;
  animation: gradientShift 3s ease-in-out infinite;
}

@keyframes gradientShift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* 極小螢幕優化 */
@media (max-width: 360px) {
  .v-container {
    padding: 8px !important;
  }
  
  .v-card {
    padding: 12px !important;
  }
  
  .v-card-title {
    font-size: 1.1rem !important;
    padding: 4px 0 !important;
  }
  
  .stats-card {
    padding: 8px !important;
  }
}

/* 平板和桌面版優化 */
@media (min-width: 601px) {
  .v-card-actions .v-btn {
    min-width: 140px;
  }
}
</style>
