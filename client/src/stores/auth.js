import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import apiClient from '@/api'
import { db } from '@/utils/db' // Import dexie db for clearing queue on logout

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
    localStorage.setItem('isGuest', 'false') // Explicitly set guest to false
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
    // Also clear the sync queue as it's user-specific
    db.sync_queue.clear().then(() => console.log('Sync queue cleared on logout.'))
  }

  async function login(credentials) {
    try {
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
    } catch (error) {
      toast.error(error.response?.data?.message || '登入失敗，請檢查您的信箱和密碼。')
    }
  }

  async function register(userInfo) {
    try {
      const response = await apiClient.post('/users/register', userInfo)
      setAuthData(response.data.data.user, response.data.token)
      toast.success(`註冊成功, 歡迎 ${response.data.data.user.username}!`)
      await router.push('/')
    } catch (error) {
      toast.error(error.response?.data?.message || '註冊失敗，請稍後再試。')
    }
  }

  async function loginAsGuest() {
    clearAuthData() // Clear previous user data first
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

  async function checkAuth() {
    const localToken = localStorage.getItem('token')
    const localUser = JSON.parse(localStorage.getItem('user'))
    const localIsGuest = JSON.parse(localStorage.getItem('isGuest'))

    if (localIsGuest) {
      isGuest.value = true
      user.value = localUser || { _id: 'guest', username: '訪客', email: 'guest@example.com' }
      return
    }

    if (localToken && localUser) {
      // Optimistic approach for offline-first
      // 1. Assume the user is authenticated
      token.value = localToken
      user.value = localUser
      isAuthenticated.value = true
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${localToken}`

      // 2. If online, try to verify the token in the background
      if (navigator.onLine) {
        try {
          const response = await apiClient.get('/users/me')
          // Token is valid, update user data with fresh info
          user.value = response.data.data.user
          localStorage.setItem('user', JSON.stringify(response.data.data.user))
        } catch (error) {
          // Verification failed (e.g., token expired, server error)
          console.error('Token verification failed, logging out.', error)
          toast.error('您的登入已過期，請重新登入。')
          clearAuthData()
          // Redirect to login only if the current page requires auth
          if (router.currentRoute.value.meta.requiresAuth) {
            router.push('/login')
          }
        }
      }
      // 3. If offline, we just trust the local data. The sync process will handle
      // any auth errors when the connection is restored.
    } else {
      // No local token/user, ensure everything is cleared.
      clearAuthData()
    }
  }

  // Initial check when the store is created
  checkAuth()

  return {
    user,
    token,
    isAuthenticated,
    isGuest,
    login,
    register,
    logout,
    checkAuth,
    loginAsGuest,
  }
})
