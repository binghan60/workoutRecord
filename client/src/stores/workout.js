import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useAuthStore } from './auth'
import { createDataService } from '@/utils/dataService'
import cacheManager from '@/utils/cacheManager'

const toast = useToast()
const GUEST_WORKOUTS_KEY = 'guest_workouts'

export const useWorkoutStore = defineStore('workout', () => {
  const paginatedWorkouts = ref([])
  const allWorkouts = ref([])
  const currentPage = ref(1)
  const totalPages = ref(1)
  const itemsPerPage = ref(5)
  const authStore = useAuthStore()
  const isLoading = ref(false)
  const lastFetchTime = ref(null)

  // 創建數據服務實例
  const dataService = computed(() => createDataService(authStore, {
    storageKey: GUEST_WORKOUTS_KEY,
    apiEndpoint: '/workouts',
    cacheKey: 'workouts',
    cacheTTL: 3 * 60 * 1000 // 訓練紀錄緩存 3 分鐘（較短，因為更新頻繁）
  }))

  async function fetchAllWorkouts(forceRefresh = false) {
    if (isLoading.value) return
    
    isLoading.value = true
    try {
      let data
      if (forceRefresh) {
        data = await dataService.value.forceRefresh()
      } else {
        data = await dataService.value.fetchAll()
      }
      
      // 確保數據是陣列
      if (!Array.isArray(data)) {
        data = []
      }
      
      // 按日期排序（最新的在前）
      allWorkouts.value = data.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date)
        const dateB = new Date(b.createdAt || b.date)
        return dateB - dateA
      })
      
      lastFetchTime.value = new Date().toISOString()
    } catch (error) {
      console.error('載入訓練紀錄失敗:', error)
      toast.error('無法載入完整的訓練歷史紀錄')
      allWorkouts.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function fetchWorkouts(page = 1, forceRefresh = false) {
    if (isLoading.value) return
    
    isLoading.value = true
    try {
      if (authStore.isGuest) {
        await fetchAllWorkouts(forceRefresh)
        const allGuestWorkouts = allWorkouts.value
        totalPages.value = Math.ceil(allGuestWorkouts.length / itemsPerPage.value)
        currentPage.value = page
        const startIndex = (page - 1) * itemsPerPage.value
        paginatedWorkouts.value = allGuestWorkouts.slice(startIndex, startIndex + itemsPerPage.value)
      } else {
        const result = await dataService.value.fetchPaginated(page, itemsPerPage.value)
        
        // 確保返回的數據結構正確
        if (result && result.data && Array.isArray(result.data)) {
          paginatedWorkouts.value = result.data
          currentPage.value = result.currentPage || page
          totalPages.value = result.totalPages || 1
        } else {
          paginatedWorkouts.value = []
          currentPage.value = page
          totalPages.value = 1
        }
      }
    } catch (error) {
      console.error('載入分頁訓練紀錄失敗:', error)
      toast.error('無法載入訓練紀錄')
    } finally {
      isLoading.value = false
    }
  }

  async function addWorkout(workout) {
    try {
      const workoutData = {
        ...workout,
        date: workout.date || new Date().toISOString()
      }
      
      const newWorkout = await dataService.value.add(workoutData)
      
      // 更新本地狀態
      allWorkouts.value.unshift(newWorkout)
      
      // 重新獲取第一頁數據
      await fetchWorkouts(1)
      
      toast.success('訓練紀錄已儲存！')
      return newWorkout
    } catch (error) {
      toast.error(error.response?.data?.message || '儲存訓練紀錄失敗')
      throw error
    }
  }

  async function deleteWorkout(workoutId) {
    const workoutToDelete = allWorkouts.value.find(w => w._id === workoutId)
    if (!workoutToDelete) {
      toast.error('找不到要刪除的訓練紀錄')
      return
    }

    try {
      await dataService.value.delete(workoutId)
      
      // 從本地狀態中移除
      allWorkouts.value = allWorkouts.value.filter(w => w._id !== workoutId)
      paginatedWorkouts.value = paginatedWorkouts.value.filter(w => w._id !== workoutId)
      
      // 重新獲取當前頁面
      await fetchWorkouts(currentPage.value)
      
      toast.success('訓練紀錄已刪除。')
    } catch (error) {
      toast.error(error.response?.data?.message || '刪除訓練紀錄失敗')
      throw error
    }
  }

  function goToPage(page) {
    if (page >= 1 && page <= totalPages.value) {
      fetchWorkouts(page)
    }
  }

  return {
    paginatedWorkouts,
    allWorkouts,
    currentPage,
    totalPages,
    isLoading,
    lastFetchTime,
    fetchAllWorkouts,
    fetchWorkouts,
    addWorkout,
    deleteWorkout,
    goToPage,
  }
})


