import axios from 'axios'
import { useUIStore } from '@/stores/ui'

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api', // Your backend API URL
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add a request interceptor to show loading spinner
apiClient.interceptors.request.use(
  (config) => {
    // Do not show loading for auth check to avoid flashing
    if (!config.url.endsWith('/users/me')) {
      const uiStore = useUIStore()
      uiStore.isLoading = true
    }
    // Add token to headers if it exists
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    const uiStore = useUIStore()
    uiStore.isLoading = false
    return Promise.reject(error)
  },
)

// Add a response interceptor to hide loading spinner
apiClient.interceptors.response.use(
  (response) => {
    const uiStore = useUIStore()
    uiStore.isLoading = false
    return response
  },
  (error) => {
    const uiStore = useUIStore()
    uiStore.isLoading = false
    // You can add global error handling here, e.g., show a toast notification
    console.error('API Error:', error.response?.data?.message || error.message)

    // If 401 Unauthorized, the auth store's checkAuth will handle redirection
    if (error.response && error.response.status === 401) {
      // The logic in auth.js will clear local storage and redirect.
    }

    return Promise.reject(error)
  },
)

export default apiClient
