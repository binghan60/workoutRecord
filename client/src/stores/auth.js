import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import apiClient from '@/api'

const toast = useToast()

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user')) || null)
  const token = ref(localStorage.getItem('token') || null)
  const isGuest = ref(JSON.parse(localStorage.getItem('isGuest')) || false)
  const router = useRouter()

  const isAuthenticated = computed(() => (!!token.value && !!user.value) || isGuest.value)

  function setAuthData(userData, authToken) {
    user.value = userData
    token.value = authToken
    isGuest.value = false
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('token', authToken)
    localStorage.removeItem('isGuest')
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
      // window.location.reload()
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
      // window.location.reload()
    } catch (error) {
      toast.error(error.response?.data?.message || '註冊失敗，請稍後再試。')
    }
  }

  async function loginAsGuest() {
    isGuest.value = true
    user.value = { _id: 'guest', username: '訪客', email: 'guest@example.com' }
    token.value = null
    localStorage.setItem('isGuest', 'true')
    localStorage.setItem('user', JSON.stringify(user.value))
    localStorage.removeItem('token')
    delete apiClient.defaults.headers.common['Authorization']
    toast.success('以訪客身份登入')
    await router.push('/')
  }

  async function logout() {
    const username = user.value?.username || '使用者'
    clearAuthData()
    toast.info(`${username}，您已成功登出。`)
    await router.push('/login')
    // window.location.reload()
  }

  async function checkAuth() {
    if (isGuest.value) {
      user.value = JSON.parse(localStorage.getItem('user')) || { _id: 'guest', username: '訪客', email: 'guest@example.com' }
      return
    }
    if (token.value) {
      try {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
        const response = await apiClient.get('/users/me')
        user.value = response.data.data.user
        localStorage.setItem('user', JSON.stringify(response.data.data.user))
      } catch (error) {
        clearAuthData()
        if (router.currentRoute.value.meta.requiresAuth) {
          router.push('/login')
        }
      }
    }
  }

  if (token.value || isGuest.value) {
    checkAuth()
  }

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
