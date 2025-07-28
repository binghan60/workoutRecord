import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api'
import { useAuthStore } from './auth'

const toast = useToast()
const GUEST_WORKOUTS_KEY = 'guest_workouts'

export const useWorkoutStore = defineStore('workout', () => {
  const paginatedWorkouts = ref([])
  const allWorkouts = ref([])
  const currentPage = ref(1)
  const totalPages = ref(1)
  const itemsPerPage = ref(5)
  const authStore = useAuthStore()

  async function fetchAllWorkouts() {
    if (authStore.isGuest) {
      const guestData = JSON.parse(localStorage.getItem(GUEST_WORKOUTS_KEY)) || []
      allWorkouts.value = guestData.sort((a, b) => new Date(b.date) - new Date(a.date))
      return
    }
    try {
      const response = await apiClient.get('/workouts/all')
      allWorkouts.value = response.data
    } catch (error) {
      toast.error('無法載入完整的訓練歷史紀錄')
    }
  }

  async function fetchWorkouts(page = 1) {
    if (authStore.isGuest) {
      await fetchAllWorkouts() // Ensure allWorkouts is loaded
      const allGuestWorkouts = allWorkouts.value
      totalPages.value = Math.ceil(allGuestWorkouts.length / itemsPerPage.value)
      currentPage.value = page
      const startIndex = (page - 1) * itemsPerPage.value
      paginatedWorkouts.value = allGuestWorkouts.slice(startIndex, startIndex + itemsPerPage.value)
      return
    }
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
    if (authStore.isGuest) {
      const newWorkout = {
        ...workout,
        _id: `guest_${new Date().getTime()}`,
        user: authStore.user._id,
        date: workout.date || new Date().toISOString(), // Ensure date exists
      }
      const guestData = JSON.parse(localStorage.getItem(GUEST_WORKOUTS_KEY)) || []
      guestData.unshift(newWorkout) // Add to the beginning
      localStorage.setItem(GUEST_WORKOUTS_KEY, JSON.stringify(guestData))
      await fetchWorkouts(1)
      await fetchAllWorkouts()
      return
    }
    try {
      await apiClient.post('/workouts', workout)
      await fetchWorkouts(1)
      await fetchAllWorkouts()
    } catch (error) {
      toast.error(error.response?.data?.message || '儲存訓練紀錄失敗')
    }
  }

  async function deleteWorkout(workoutId) {
    if (authStore.isGuest) {
      let guestData = JSON.parse(localStorage.getItem(GUEST_WORKOUTS_KEY)) || []
      guestData = guestData.filter((w) => w._id !== workoutId)
      localStorage.setItem(GUEST_WORKOUTS_KEY, JSON.stringify(guestData))
      toast.success('訓練紀錄已刪除。')
      await fetchWorkouts(currentPage.value)
      await fetchAllWorkouts()
      return
    }
    try {
      await apiClient.delete(`/workouts/${workoutId}`)
      toast.success('訓練紀錄已刪除。')
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


