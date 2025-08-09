import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useUIStore = defineStore('ui', () => {
  // Theme Management
  const getInitialTheme = () => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        return savedTheme
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light' // Fallback for SSR
  }

  const theme = ref(getInitialTheme())

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  watch(theme, (newTheme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme)
    }
  })

  // Loading Management
  const isLoading = ref(false)

  async function withLoading(asyncFn) {
    isLoading.value = true
    try {
      return await asyncFn()
    } finally {
      isLoading.value = false
    }
  }

  // Built-in Exercises Visibility Management
  const showBuiltInExercises = ref(JSON.parse(localStorage.getItem('showBuiltInExercises') ?? 'true'))
  const showBuiltInTemplates = ref(JSON.parse(localStorage.getItem('showBuiltInTemplates') ?? 'true'))

  function toggleShowBuiltInExercises() {
    showBuiltInExercises.value = !showBuiltInExercises.value
  }

  function toggleShowBuiltInTemplates() {
    showBuiltInTemplates.value = !showBuiltInTemplates.value
  }

  watch(showBuiltInExercises, (newValue) => {
    localStorage.setItem('showBuiltInExercises', JSON.stringify(newValue))
  })

  watch(showBuiltInTemplates, (newValue) => {
    localStorage.setItem('showBuiltInTemplates', JSON.stringify(newValue))
  })
  
  // --- PWA Offline and Sync Status ---
  const isOffline = ref(!navigator.onLine)
  const isSyncing = ref(false)

  function setOfflineStatus(offline) {
    isOffline.value = offline
  }
  
  function setSyncing(syncing) {
    isSyncing.value = syncing
  }
  // --- End PWA Status ---

  return {
    theme,
    toggleTheme,
    isLoading,
    withLoading,
    showBuiltInExercises,
    toggleShowBuiltInExercises,
    showBuiltInTemplates,
    toggleShowBuiltInTemplates,
    // PWA Status
    isOffline,
    isSyncing,
    setOfflineStatus,
    setSyncing,
  }
})
