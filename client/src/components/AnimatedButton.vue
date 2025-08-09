<template>
  <v-btn
    ref="buttonRef"
    :class="[
      'animated-button',
      animationClass,
      {
        'hover-lift': !disabled && !loading,
        'transition-all': true
      }
    ]"
    :disabled="disabled || loading"
    :loading="loading"
    :color="color"
    :variant="variant"
    :size="size"
    :icon="icon"
    :block="block"
    @click="handleClick"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
  >
    <template v-if="!loading">
      <v-icon v-if="prependIcon" class="mr-2">{{ prependIcon }}</v-icon>
      <slot />
      <v-icon v-if="appendIcon" class="ml-2">{{ appendIcon }}</v-icon>
    </template>
  </v-btn>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { animateButtonClick, animateSuccess, animateError, createRippleEffect } from '@/utils/animations'

const props = defineProps({
  color: {
    type: String,
    default: 'primary'
  },
  variant: {
    type: String,
    default: 'elevated'
  },
  size: {
    type: String,
    default: 'default'
  },
  icon: {
    type: Boolean,
    default: false
  },
  block: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  prependIcon: {
    type: String,
    default: ''
  },
  appendIcon: {
    type: String,
    default: ''
  },
  animationType: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'success', 'error', 'bounce', 'pulse'].includes(value)
  },
  ripple: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['click'])

const buttonRef = ref(null)
const isPressed = ref(false)

const animationClass = computed(() => {
  switch (props.animationType) {
    case 'bounce':
      return 'animate-bounce-in'
    case 'pulse':
      return 'animate-pulse'
    default:
      return ''
  }
})

const handleClick = async (event) => {
  if (props.disabled || props.loading) return
  
  // 創建漣漪效果
  if (props.ripple && buttonRef.value) {
    createRippleEffect(buttonRef.value.$el, event)
  }
  
  // 按鈕點擊動畫
  if (buttonRef.value) {
    animateButtonClick(buttonRef.value.$el)
  }
  
  // 發送點擊事件
  emit('click', event)
  
  // 根據動畫類型執行特定動畫
  await nextTick()
  
  if (props.animationType === 'success' && buttonRef.value) {
    setTimeout(() => {
      animateSuccess(buttonRef.value.$el)
    }, 100)
  } else if (props.animationType === 'error' && buttonRef.value) {
    setTimeout(() => {
      animateError(buttonRef.value.$el)
    }, 100)
  }
}

const handleMouseDown = () => {
  isPressed.value = true
}

const handleMouseUp = () => {
  isPressed.value = false
}

const handleMouseLeave = () => {
  isPressed.value = false
}

// 暴露方法供父組件調用
defineExpose({
  triggerSuccess: () => {
    if (buttonRef.value) {
      animateSuccess(buttonRef.value.$el)
    }
  },
  triggerError: () => {
    if (buttonRef.value) {
      animateError(buttonRef.value.$el)
    }
  }
})
</script>

<style scoped>
.animated-button {
  position: relative;
  overflow: hidden;
  transform-origin: center;
}

.animated-button:not(:disabled):not(.v-btn--loading) {
  cursor: pointer;
}

.animated-button:not(:disabled):not(.v-btn--loading):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.animated-button:not(:disabled):not(.v-btn--loading):active {
  transform: translateY(0) scale(0.98);
}

/* 成功狀態樣式 */
.animated-button.success-state {
  background: linear-gradient(45deg, #4caf50, #66bb6a) !important;
  color: white !important;
}

/* 錯誤狀態樣式 */
.animated-button.error-state {
  background: linear-gradient(45deg, #f44336, #ef5350) !important;
  color: white !important;
}

/* 載入狀態增強 */
.animated-button.v-btn--loading {
  pointer-events: none;
}

/* 禁用狀態 */
.animated-button:disabled {
  opacity: 0.6;
  transform: none !important;
  box-shadow: none !important;
}

/* 響應式調整 */
@media (max-width: 600px) {
  .animated-button:not(:disabled):not(.v-btn--loading):hover {
    transform: none;
    box-shadow: none;
  }
}

/* 減少動畫偏好 */
@media (prefers-reduced-motion: reduce) {
  .animated-button {
    transition: none !important;
    animation: none !important;
  }
  
  .animated-button:hover {
    transform: none !important;
  }
}
</style>