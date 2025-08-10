import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useAuthStore } from './auth'
import { createDataService } from '@/utils/dataService'

const toast = useToast()

export const useWorkoutStore = defineStore('workout', () => {
  const allWorkouts = ref([])
  const currentPage = ref(1)
  const totalPages = ref(1)
  const itemsPerPage = ref(5)
  const authStore = useAuthStore()
  const isLoading = ref(false)

  // 創建數據服務實例
  const dataService = computed(() => createDataService(authStore, {
    storageKey: 'guest_workouts',
    apiEndpoint: '/workouts',
    dbTable: 'workouts'
  }))

  const paginatedWorkouts = computed(() => {
    const startIndex = (currentPage.value - 1) * itemsPerPage.value
    return allWorkouts.value.slice(startIndex, startIndex + itemsPerPage.value)
  })

  async function fetchAllWorkouts(forceRefresh = false) {
    // Skip if already loading (unless forced) or data already exists (unless forced)
    if ((isLoading.value && !forceRefresh) || (!forceRefresh && allWorkouts.value.length > 0)) {
      return
    }
    
    isLoading.value = true
    try {
      const data = await dataService.value.fetchAll()
      
      if (!Array.isArray(data)) {
        allWorkouts.value = []
        return
      }
      
      allWorkouts.value = data.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date)
        const dateB = new Date(b.createdAt || b.date)
        return dateB - dateA
      })
      
      totalPages.value = Math.ceil(allWorkouts.value.length / itemsPerPage.value)
      if (currentPage.value > totalPages.value) {
        currentPage.value = totalPages.value || 1
      }

    } catch (error) {
      console.error('載入訓練紀錄失敗:', error)
      toast.error('無法載入完整的訓練歷史紀錄')
      allWorkouts.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function addWorkout(workout) {
    try {
      const workoutData = { ...workout, date: workout.date || new Date().toISOString() }
      const newWorkout = await dataService.value.add(workoutData)
      
      // Optimistically add to local state
      allWorkouts.value.unshift(newWorkout)
      totalPages.value = Math.ceil(allWorkouts.value.length / itemsPerPage.value)
      
      toast.success('訓練紀錄已儲存！')
      return newWorkout
    } catch (error) {
      toast.error(error.response?.data?.message || '儲存訓練紀錄失敗')
      throw error
    }
  }

  async function deleteWorkout(workoutId) {
    try {
      await dataService.value.delete(workoutId)
      
      const initialLength = allWorkouts.value.length
      allWorkouts.value = allWorkouts.value.filter(w => w._id !== workoutId)
      if (allWorkouts.value.length < initialLength) {
        totalPages.value = Math.ceil(allWorkouts.value.length / itemsPerPage.value)
        if (paginatedWorkouts.value.length === 0 && currentPage.value > 1) {
          currentPage.value--
        }
        toast.success('訓練紀錄已刪除。')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || '刪除訓練紀錄失敗')
      throw error
    }
  }

  function goToPage(page) {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  return {
    paginatedWorkouts,
    allWorkouts,
    currentPage,
    totalPages,
    isLoading,
    fetchAllWorkouts,
    addWorkout,
    deleteWorkout,
    goToPage,
  }
})


