import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import apiClient from '@/api'
import { db } from '@/utils/db'

// Import other stores to call their fetch actions
import { useExerciseStore } from './exercise'
import { useTemplateStore } from './template'
import { useWorkoutStore } from './workout'
import { useBodyMetricsStore } from './bodyMetrics'

const toast = useToast()

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)
  const isGuest = ref(false)
  const router = useRouter()

  const isAuthenticated = computed(() => (!!token.value && !!user.value) || isGuest.value)

  function setAuthData(userData, authToken) {
    user.value = userData
    token.value = authToken
    isGuest.value = false
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('token', authToken)
    localStorage.setItem('isGuest', 'false')
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
  }

  function clearAuthData() {
    user.value = null
    token.value = null
    isGuest.value = false
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('isGuest')
    delete apiClient.defaults.headers.common['Authorization']
    db.sync_queue.clear().then(() => console.log('Sync queue cleared on logout.'))
    // Also clear all cached data
    Promise.all([
      db.exercises.clear(),
      db.templates.clear(),
      db.schedules.clear(),
      db.workouts.clear(),
      db.bodyMetrics.clear()
    ]).then(() => console.log('All local data caches cleared on logout.'))
  }

  async function login(credentials) {
    const { email, password, rememberMe } = credentials
    const response = await apiClient.post('/users/login', { email, password })
    setAuthData(response.data.data.user, response.data.token)
    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email)
    } else {
      localStorage.removeItem('rememberedEmail')
    }
    toast.success(`歡迎回來, ${response.data.data.user.username}!`)
    await router.push('/')
    window.location.reload() // Reload to ensure all stores are fresh
  }

  async function register(userInfo) {
    const response = await apiClient.post('/users/register', userInfo)
    setAuthData(response.data.data.user, response.data.token)
    toast.success(`註冊成功, 歡迎 ${response.data.data.user.username}!`)
    await router.push('/')
    window.location.reload()
  }

  async function loginAsGuest() {
    clearAuthData()
    isGuest.value = true
    user.value = { _id: 'guest', username: '訪客', email: 'guest@example.com' }
    localStorage.setItem('isGuest', 'true')
    localStorage.setItem('user', JSON.stringify(user.value))
    toast.success('以訪客身份登入')
    await router.push('/')
  }

  async function logout() {
    const username = user.value?.username || '使用者'
    clearAuthData()
    toast.info(`${username}，您已成功登出。`)
    await router.push('/login')
  }

  /**
   * This is the new initialization function called from main.js
   * It handles auth state and loads all necessary data before the app mounts.
   */
  async function init() {
    const localToken = localStorage.getItem('token')
    const localUser = JSON.parse(localStorage.getItem('user'))
    const localIsGuest = JSON.parse(localStorage.getItem('isGuest'))

    if (localIsGuest) {
      isGuest.value = true
      user.value = localUser || { _id: 'guest', username: '訪客', email: 'guest@example.com' }
    } else if (localToken && localUser) {
      // Optimistically set auth state
      token.value = localToken
      user.value = localUser
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${localToken}`
    } else {
      // Not logged in
      return
    }

    // If the user is authenticated (not a guest), load all data from IndexedDB/API.
    // This happens BEFORE the app is mounted, so data is ready on first render.
    if (isAuthenticated.value && !isGuest.value) {
      console.log('App initializing: fetching all required data...')
      const exerciseStore = useExerciseStore()
      const templateStore = useTemplateStore()
      const workoutStore = useWorkoutStore()
      const bodyMetricsStore = useBodyMetricsStore()

      // Fetch all data in parallel
      await Promise.all([
        exerciseStore.fetchExercises(),
        templateStore.fetchTemplates(),
        templateStore.fetchSchedule(),
        workoutStore.fetchAllWorkouts(),
        bodyMetricsStore.fetchRecords()
      ])
      console.log('All initial data fetched.')
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    isGuest,
    login,
    register,
    logout,
    init, // Expose the new init function
    loginAsGuest,
  }
})