import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const isLoading = ref(false)

  function startLoading() {
    isLoading.value = true
  }

  function stopLoading() {
    isLoading.value = false
  }

  // 方便非同步操作的輔助函式
  async function withLoading(action) {
    try {
      startLoading()
      await action()
    } finally {
      stopLoading()
    }
  }

  return { isLoading, startLoading, stopLoading, withLoading }
})
