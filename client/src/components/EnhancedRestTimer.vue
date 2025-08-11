<template>
  <!-- 增強的休息計時器，提供更好的用戶體驗 -->
  <v-dialog :model-value="isResting" @update:model-value="$emit('stop-rest-timer')" fullscreen persistent transition="dialog-bottom-transition" class="rest-timer-dialog">
    <v-card class="rest-timer-card d-flex flex-column">
      <!-- 頂部信息欄 -->
      <v-app-bar flat color="transparent" class="flex-grow-0" density="compact">
        <template v-slot:append>
          <v-btn icon="mdi-close" @click="$emit('stop-rest-timer')" variant="text" aria-label="跳過休息" />
        </template>
      </v-app-bar>

      <!-- 主要計時器顯示 -->
      <v-card-text :class="['flex-grow-1 d-flex flex-column align-center justify-center text-center', $vuetify.display.xs ? 'pa-3' : 'pa-6']">
        <!-- 圓形進度指示器 -->
        <div class="timer-container position-relative" :class="$vuetify.display.xs ? 'mb-4' : 'mb-6'">
          <v-progress-circular :model-value="progressPercentage" :size="$vuetify.display.xs ? 172 : 240" :width="$vuetify.display.xs ? 6 : 8" :color="restColor" class="timer-progress">
            <!-- 計時器顯示 -->
            <div class="timer-display">
              <div class="time-text">
                {{ formatTime(restTimeRemaining) }}
              </div>
              <div class="time-label text-caption text-medium-emphasis">剩餘時間</div>
            </div>
          </v-progress-circular>
        </div>

        <!-- 休息時間控制 -->
        <div class="time-controls">
          <v-row justify="center" class="mb-4">
            <v-col cols="auto">
              <v-btn @click="$emit('add-rest-time', -30)" :disabled="restTimeRemaining <= 30" color="orange" variant="tonal" :size="$vuetify.display.xs ? 'default' : 'large'" class="mx-1">
                <v-icon>mdi-minus</v-icon>
                30s
              </v-btn>
            </v-col>
            <v-col cols="auto">
              <v-btn @click="$emit('add-rest-time', 30)" color="primary" variant="tonal" :size="$vuetify.display.xs ? 'default' : 'large'" class="mx-1">
                <v-icon>mdi-plus</v-icon>
                30s
              </v-btn>
            </v-col>
            <v-col cols="auto">
              <v-btn @click="$emit('add-rest-time', 60)" color="primary" variant="tonal" :size="$vuetify.display.xs ? 'default' : 'large'" class="mx-1">
                <v-icon>mdi-plus</v-icon>
                1分
              </v-btn>
            </v-col>
          </v-row>
        </div>

        <!-- 下一組動作提示 -->
        <div class="next-exercise" v-if="nextExercise">
          <v-card variant="tonal" color="success" class="pa-4">
            <div class="text-subtitle-1 mb-2">下一組動作</div>
            <div class="d-flex align-center justify-space-between flex-wrap" style="gap: 12px">
              <div class="d-flex align-center" style="gap: 12px">
                <v-icon color="success">mdi-dumbbell</v-icon>
                <div>
                  <div class="font-weight-bold">{{ nextExercise.name }}</div>
                  <div class="text-caption text-medium-emphasis">建議：{{ nextExerciseHint }}</div>
                </div>
              </div>
              <v-chip size="small" color="primary" variant="tonal">準備好</v-chip>
            </div>
          </v-card>
        </div>

        <!-- 快速操作（精簡為圖示按鈕） -->
        <div class="quick-actions">
          <v-row justify="center" class="my-4">
            <v-col cols="auto">
              <v-btn @click="$emit('reset-rest-timer')" color="secondary" variant="outlined" :size="$vuetify.display.xs ? 'default' : 'large'" prepend-icon="mdi-restart"> 重置 </v-btn>
            </v-col>
            <v-col cols="auto">
              <v-btn @click="togglePause" :color="isPaused ? 'success' : 'warning'" variant="outlined" :size="$vuetify.display.xs ? 'default' : 'large'" :prepend-icon="isPaused ? 'mdi-play' : 'mdi-pause'">
                {{ isPaused ? '繼續' : '暫停' }}
              </v-btn>
            </v-col>
          </v-row>
        </div>

        <!-- 跳過按鈕（緊湊） -->
        <div class="d-flex justify-center">
          <v-btn @click="$emit('stop-rest-timer')" color="red" variant="elevated" :size="$vuetify.display.xs ? 'default' : 'large'" class="skip-btn" prepend-icon="mdi-skip-next"> 跳過休息 </v-btn>
        </div>

        <!-- 激勵訊息 -->
        <div class="motivation-text mt-6 text-center">
          <p class="text-body-1 text-medium-emphasis">
            {{ getMotivationalMessage() }}
          </p>
        </div>

        <!-- 進度信息 -->
        <div class="progress-info mt-4 text-center">
          <v-chip :color="restTimeRemaining <= 10 ? 'error' : restTimeRemaining <= 30 ? 'warning' : 'primary'" variant="tonal" class="mb-2">
            {{ getTimeStatus() }}
          </v-chip>
          <br />
          <span class="text-caption text-medium-emphasis"> 建議休息時間：{{ Math.floor(initialRestTime / 60) }}:{{ (initialRestTime % 60).toString().padStart(2, '0') }} </span>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useResponsiveDesign } from '@/composables/useResponsiveDesign'

const props = defineProps({
  isResting: {
    type: Boolean,
    default: false,
  },
  restTimeRemaining: {
    type: Number,
    default: 0,
  },
  initialRestTime: {
    type: Number,
    default: 90,
  },
  currentExerciseName: {
    type: String,
    default: '訓練動作',
  },
  nextExercise: {
    type: Object,
    default: null,
  },
  nextExerciseHint: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['add-rest-time', 'stop-rest-timer', 'reset-rest-timer', 'pause-rest-timer', 'update:model-value'])

const {} = useResponsiveDesign()
const isPaused = ref(false)

const restColor = computed(() => {
  const denom = Number(props.initialRestTime) || 0
  const remaining = Number(props.restTimeRemaining) || 0
  if (denom <= 0) return 'primary'
  const ratio = remaining / denom
  if (ratio <= 0.3) return 'error' // ≤30% 轉紅
  if (ratio <= 0.6) return 'warning' // ≤60% 轉黃
  return 'primary'
})

const progressPercentage = computed(() => {
  const denom = Number(props.initialRestTime) || 0
  const remaining = Number(props.restTimeRemaining) || 0
  if (denom <= 0) return 0
  // 使用剩餘/分母，讓進度條隨時間遞減（愈少愈接近 0%）
  const ratio = remaining / denom
  const pct = ratio * 100
  return Math.max(0, Math.min(100, pct))
})

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

const togglePause = () => {
  isPaused.value = !isPaused.value
  emit('pause-rest-timer', isPaused.value)
}

const getMotivationalMessage = () => {
  const timeLeft = props.restTimeRemaining

  if (timeLeft <= 10) {
    return '準備好了嗎？下一組即將開始！'
  } else if (timeLeft <= 30) {
    return '深呼吸，調整狀態，馬上就好！'
  } else if (timeLeft <= 60) {
    return '好好休息，為下一組做準備！'
  } else {
    return '放鬆一下，你正在變得更強！'
  }
}

// 震動提示（如果裝置支援）
watch(
  () => props.restTimeRemaining,
  (val) => {
    const denom = Number(props.initialRestTime) || 0
    if (denom > 0 && val / denom <= 0.2) {
      try {
        if ('vibrate' in navigator) {
          navigator.vibrate?.(200)
        }
      } catch {}
    }
  },
)

const getTimeStatus = () => {
  const timeLeft = props.restTimeRemaining

  if (timeLeft <= 10) {
    return '準備開始'
  } else if (timeLeft <= 30) {
    return '即將結束'
  } else if (timeLeft <= 60) {
    return '休息中'
  } else {
    return '充分休息'
  }
}
</script>

<style scoped>
.rest-timer-card {
  min-height: 100vh;
}

.timer-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.timer-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.time-text {
  font-size: clamp(2.5rem, 8vw, 4rem);
  font-weight: bold;
  line-height: 1;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.time-label {
  margin-top: 0.5rem;
  opacity: 0.8;
}

.timer-progress {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.time-controls,
.quick-actions {
  width: 100%;
  max-width: 400px;
}

.skip-btn {
  min-width: 200px;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
}

.skip-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(244, 67, 54, 0.4);
}

.motivation-text {
  max-width: 300px;
  opacity: 0.9;
}

.progress-info {
  max-width: 250px;
}

/* 移動端優化 */
@media (max-width: 600px) {
  .v-card-text {
    padding: 1rem;
  }

  .time-controls .v-row {
    gap: 0.5rem;
  }

  .quick-actions .v-row {
    gap: 0.5rem;
  }
}

/* 動畫效果 */
.timer-progress {
  transition: all 0.3s ease;
}

.skip-btn {
  transition: all 0.2s ease;
}

.v-btn {
  transition: all 0.2s ease;
}

.v-btn:hover {
  transform: translateY(-1px);
}
</style>
