import axios from 'axios'
import { useUIStore } from '@/stores/ui'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_PATH, // Your backend API URL
  headers: {
    'Content-Type': 'application/json',
  },
})
// Add a request interceptor to show loading spinner
apiClient.interceptors.request.use(
  (config) => {
    // Only show spinner if explicitly requested; all data operations run in background by default
    const showSpinner = config.headers && config.headers['X-Show-Spinner'] === 'true'
    if (showSpinner) {
      const uiStore = useUIStore()
      uiStore.setLoading(true, { global: true })
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
    uiStore.setLoading(false, { global: true })
    return Promise.reject(error)
  },
)

// Add a response interceptor to hide loading spinner
apiClient.interceptors.response.use(
  (response) => {
    const showSpinner = response.config && response.config.headers && response.config.headers['X-Show-Spinner'] === 'true'
    const uiStore = useUIStore()
    if (showSpinner) uiStore.setLoading(false, { global: true })
    return response
  },
  (error) => {
    const showSpinner = error.config && error.config.headers && error.config.headers['X-Show-Spinner'] === 'true'
    const uiStore = useUIStore()
    if (showSpinner) uiStore.setLoading(false, { global: true })
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
