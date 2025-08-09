<template>
  <!-- 增強的載入覆蓋層，提供更好的用戶體驗 -->
  <v-overlay :model-value="uiStore.isLoading" class="loading-overlay d-flex align-center justify-center" persistent :opacity="0.8">
    <v-card class="loading-card pa-6 text-center" elevation="8" rounded="xl" max-width="320">
      <!-- 動畫載入指示器 -->
      <div class="loading-animation mb-4">
        <v-progress-circular color="primary" indeterminate :size="responsiveSizes.icon === 'large' ? 64 : 48" :width="4" class="loading-spinner" />

        <!-- 脈動點 -->
        <div class="loading-dots mt-3">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>

      <!-- 載入訊息 -->
      <div class="loading-content">
        <h3 :class="typographyScale.h3" class="font-weight-medium mb-2">
          {{ loadingMessage }}
        </h3>
        <p :class="typographyScale.body" class="text-medium-emphasis mb-0">
          {{ loadingSubtext }}
        </p>
      </div>

      <!-- 特定操作的進度指示器 -->
      <v-progress-linear v-if="showProgress" :model-value="progressValue" color="primary" height="4" rounded class="mt-4" />
    </v-card>
  </v-overlay>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useResponsiveDesign } from '@/composables/useResponsiveDesign'

const uiStore = useUIStore()
const { responsiveSizes, typographyScale } = useResponsiveDesign()

// 載入訊息輪播
const loadingMessages = [
  { message: '載入中...', subtext: '請稍候片刻' },
  { message: '準備資料中...', subtext: '正在同步您的訓練數據' },
  { message: '處理中...', subtext: '馬上就好了' },
  { message: '更新中...', subtext: '正在保存您的進度' },
]

const currentMessageIndex = ref(0)
const showProgress = ref(false)
const progressValue = ref(0)

const loadingMessage = computed(() => loadingMessages[currentMessageIndex.value].message)
const loadingSubtext = computed(() => loadingMessages[currentMessageIndex.value].subtext)

// 每 2 秒輪換載入訊息
let messageInterval = null

watch(
  () => uiStore.isLoading,
  (isLoading) => {
    if (isLoading) {
      currentMessageIndex.value = 0
      messageInterval = setInterval(() => {
        currentMessageIndex.value = (currentMessageIndex.value + 1) % loadingMessages.length
      }, 2000)
    } else {
      if (messageInterval) {
        clearInterval(messageInterval)
        messageInterval = null
      }
    }
  },
)
</script>

<style scoped>
.loading-overlay {
  backdrop-filter: blur(4px);
  background: rgba(0, 0, 0, 0.6);
}

.loading-card {
  background: rgba(var(--v-theme-surface), 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
}

.loading-animation {
  position: relative;
}

.loading-spinner {
  animation: pulse 2s ease-in-out infinite;
}

.loading-dots {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: rgb(var(--v-theme-primary));
  animation: dotPulse 1.5s ease-in-out infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

@keyframes dotPulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

/* 深色主題調整 */
.v-theme--dark .loading-card {
  background: rgba(30, 30, 30, 0.95);
}
</style>
