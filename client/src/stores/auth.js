import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import apiClient from '@/api'

const toast = useToast()

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user')) || null)
  const token = ref(localStorage.getItem('token') || null)
  const router = useRouter()

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  function setAuthData(userData, authToken) {
    user.value = userData
    token.value = authToken
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('token', authToken)
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
  }

  function clearAuthData() {
    user.value = null
    token.value = null
    // localStorage.removeItem('user')
    localStorage.removeItem('token')
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

  async function logout() {
    const username = user.value?.username || '使用者'
    clearAuthData()
    toast.info(`${username}，您已成功登出。`)
    await router.push('/login')
    // window.location.reload()
  }

  async function checkAuth() {
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

  if (token.value && !user.value) {
    checkAuth()
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth,
  }
})
