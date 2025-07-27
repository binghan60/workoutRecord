import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api'

const toast = useToast()

export const useWorkoutStore = defineStore('workout', () => {
  const paginatedWorkouts = ref([]) // For history page
  const allWorkouts = ref([]) // For charts and global stats
  const currentPage = ref(1)
  const totalPages = ref(1)
  const itemsPerPage = ref(5)

  async function fetchAllWorkouts() {
    try {
      const response = await apiClient.get('/workouts/all')
      allWorkouts.value = response.data
    } catch (error) {
      toast.error('無法載入完整的訓練歷史紀錄')
    }
  }

  async function fetchWorkouts(page = 1) {
    try {
      const response = await apiClient.get(`/workouts?page=${page}&limit=${itemsPerPage.value}`)
      paginatedWorkouts.value = response.data.data
      currentPage.value = response.data.currentPage
      totalPages.value = response.data.totalPages
    } catch (error) {
      toast.error('無法載入訓練紀錄')
    }
  }

  async function addWorkout(workout) {
    try {
      await apiClient.post('/workouts', workout)
      // After adding, fetch the first page to see the new workout
      await fetchWorkouts(1)
      // Also refetch all workouts for dashboard updates
      await fetchAllWorkouts()
    } catch (error) {
      toast.error(error.response?.data?.message || '儲存訓練紀錄失敗')
    }
  }

  async function deleteWorkout(workoutId) {
    try {
      await apiClient.delete(`/workouts/${workoutId}`)
      toast.success('訓練紀錄已刪除。')
      // Refetch both paginated and all workouts
      await fetchWorkouts(currentPage.value)
      await fetchAllWorkouts()
    } catch (error) {
      toast.error(error.response?.data?.message || '刪除訓練紀錄失敗')
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
    fetchAllWorkouts,
    fetchWorkouts,
    addWorkout,
    deleteWorkout,
    goToPage,
  }
})


