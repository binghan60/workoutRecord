import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import apiClient from '@/api'
import { db } from '@/utils/db'
import { migrateGuestDataIfPresent } from '@/utils/guestMigration'

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

    db.sync_queue.clear()
    Promise.all([db.exercises.clear(), db.templates.clear(), db.schedules.clear(), db.workouts.clear(), db.bodyMetrics.clear()]).then(() => console.log('All local data caches and sync queue cleared on logout.'))
  }

  async function login(credentials) {
    const { email, password, rememberMe } = credentials
    const response = await apiClient.post('/users/login', { email, password })
    setAuthData(response.data.data.user, response.data.token)

    // Always fetch user data after login, not just during migration
    const exerciseStore = useExerciseStore()
    const templateStore = useTemplateStore()
    const workoutStore = useWorkoutStore()
    const bodyMetricsStore = useBodyMetricsStore()

    // Optional migration only when user explicitly requests via flag
    try {
      const shouldMigrate = localStorage.getItem('guest_migration_after_auth') === 'true'
      if (shouldMigrate) {
        const result = await migrateGuestDataIfPresent()
        console.log('[Auth] Guest data migration (login, explicit):', result)
        localStorage.removeItem('guest_migration_after_auth')
      }
    } catch (e) {
      console.warn('Guest migration (login) failed:', e)
    }

    // Always refresh data after successful login
    try {
      console.log('Login successful - fetching user data...')
      await Promise.all([
        exerciseStore.fetchExercises(true), 
        templateStore.fetchTemplates(true), 
        templateStore.fetchSchedule(true)
      ])
      console.log('✅ User data fetched successfully after login')
    } catch (error) {
      console.error('❌ Error fetching user data after login:', error)
      // Don't block login flow, but show a warning
      toast.warning('登入成功，但部分數據載入失敗。請嘗試重新整理頁面。')
    }

    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email)
    } else {
      localStorage.removeItem('rememberedEmail')
    }
    const welcomeName = response.data.data.user.displayName || response.data.data.user.username
    toast.success(`歡迎回來, ${welcomeName}!`)
    await router.push('/')
  }

  async function register(userInfo) {
    const response = await apiClient.post('/users/register', userInfo)
    setAuthData(response.data.data.user, response.data.token)

    // Always fetch user data after register, not just during migration
    const exerciseStore = useExerciseStore()
    const templateStore = useTemplateStore()
    const workoutStore = useWorkoutStore()
    const bodyMetricsStore = useBodyMetricsStore()

    // Optional migration only when user explicitly requests via flag
    try {
      const shouldMigrate = localStorage.getItem('guest_migration_after_auth') === 'true'
      if (shouldMigrate) {
        const result = await migrateGuestDataIfPresent()
        console.log('[Auth] Guest data migration (register, explicit):', result)
        localStorage.removeItem('guest_migration_after_auth')
      }
    } catch (e) {
      console.warn('Guest migration (register) failed:', e)
    }

    // Always refresh data after successful registration
    try {
      console.log('Registration successful - fetching initial data...')
      await Promise.all([
        exerciseStore.fetchExercises(true), 
        templateStore.fetchTemplates(true), 
        templateStore.fetchSchedule(true)
      ])
      console.log('✅ Initial data fetched successfully after registration')
    } catch (error) {
      console.error('❌ Error fetching initial data after registration:', error)
      // Don't block registration flow, but show a warning
      toast.warning('註冊成功，但部分數據載入失敗。請嘗試重新整理頁面。')
    }

    const welcomeName = response.data.data.user.displayName || response.data.data.user.username
    toast.success(`註冊成功, 歡迎 ${welcomeName}!`)
    await router.push('/')
    // window.location.reload() // avoid full reload to prevent flicker; router navigation is enough
  }

  async function loginWithGoogle(idToken) {
    const response = await apiClient.post('/users/google', { idToken })
    console.log({ response })
    setAuthData(response.data.data.user, response.data.token)

    // Always fetch user data after Google login, not just during migration
    const exerciseStore = useExerciseStore()
    const templateStore = useTemplateStore()
    const workoutStore = useWorkoutStore()
    const bodyMetricsStore = useBodyMetricsStore()

    // Optional migration only when user explicitly requests via flag
    try {
      const shouldMigrate = localStorage.getItem('guest_migration_after_auth') === 'true'
      if (shouldMigrate) {
        const result = await migrateGuestDataIfPresent()
        console.log('[Auth] Guest data migration (google, explicit):', result)
        localStorage.removeItem('guest_migration_after_auth')
      }
    } catch (e) {
      console.warn('Guest migration (google) failed:', e)
    }

    // Always refresh data after successful Google login
    try {
      console.log('Google login successful - fetching user data...')
      await Promise.all([
        exerciseStore.fetchExercises(true), 
        templateStore.fetchTemplates(true), 
        templateStore.fetchSchedule(true)
      ])
      console.log('✅ User data fetched successfully after Google login')
    } catch (error) {
      console.error('❌ Error fetching user data after Google login:', error)
      // Don't block login flow, but show a warning
      toast.warning('登入成功，但部分數據載入失敗。請嘗試重新整理頁面。')
    }

    toast.success(`歡迎回來!`)
    await router.push('/')
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
    const display = user.value?.displayName || username
    toast.info(`${display}，您已成功登出。`)
    await router.push('/login')
  }

  async function init() {
    const localToken = localStorage.getItem('token')
    const localUser = JSON.parse(localStorage.getItem('user'))
    const localIsGuest = JSON.parse(localStorage.getItem('isGuest'))

    if (localIsGuest) {
      isGuest.value = true
      user.value = localUser || { _id: 'guest', username: '訪客', email: 'guest@example.com' }
    } else if (localToken && localUser) {
      token.value = localToken
      user.value = localUser
      // 確保 API client 的 Authorization header 正確設定
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${localToken}`
      
      // 驗證 token 是否仍然有效
      try {
        await apiClient.get('/users/me')
      } catch (error) {
        // Token 無效，清除認證狀態
        console.warn('Token validation failed during init, clearing auth state')
        clearAuthData()
        return
      }
    } else {
      return
    }

    // 初始化基本資料（僅載入必要的核心資料）
    if (isAuthenticated.value) {
      console.log('App initializing: fetching essential data...')
      const exerciseStore = useExerciseStore()
      const templateStore = useTemplateStore()

      // No automatic migration on init anymore; user can migrate manually from Guest Data tab

      try {
        // Force refresh during init to ensure data is always fresh
        // Only load essential data on app init - exercises, templates and schedule
        // Workouts and body metrics will be loaded on-demand by their respective views
        
        // 暫時禁用 toast 錯誤訊息，避免在初始化期間顯示不必要的錯誤
        const originalToastError = toast.error
        toast.error = () => {} // 暫時禁用
        
        await Promise.all([
          exerciseStore.fetchExercises(true), // Force refresh
          templateStore.fetchTemplates(true), // Force refresh
          templateStore.fetchSchedule(true)   // Force refresh
        ])
        
        // 恢復 toast 錯誤訊息
        toast.error = originalToastError
        
        console.log('✅ Essential data fetched and ready. Workouts/metrics will load on-demand.')
      } catch (error) {
        // 恢復 toast 錯誤訊息（以防出錯）
        const originalToastError = toast.error
        if (typeof toast.error !== 'function') {
          toast.error = originalToastError
        }
        
        console.error('❌ Error fetching initial data:', error)
        // 即使出錯也不阻止應用程式載入
        // But add a retry mechanism for critical data
        setTimeout(async () => {
          try {
            console.log('🔄 Retrying essential data fetch...')
            await Promise.all([
              exerciseStore.fetchExercises(true),
              templateStore.fetchTemplates(true),
              templateStore.fetchSchedule(true)
            ])
            console.log('✅ Essential data fetched successfully on retry')
          } catch (retryError) {
            console.error('❌ Retry failed for essential data:', retryError)
            // 如果重試也失敗，顯示一次性的錯誤訊息
            toast.warning('部分數據載入失敗，請檢查網路連線或稍後重試')
          }
        }, 2000) // Retry after 2 seconds
      }
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    isGuest,
    login,
    loginWithGoogle,
    register,
    logout,
    init,
    loginAsGuest,
  }
})
