/**
 * 數據服務抽象層
 * 統一處理 API 調用、訪客模式和緩存
 */

import apiClient from '@/api'
import cacheManager from './cacheManager'

export class DataService {
  constructor(options = {}) {
    this.isGuest = options.isGuest || false
    this.storageKey = options.storageKey
    this.apiEndpoint = options.apiEndpoint
    this.cacheKey = options.cacheKey
    this.cacheTTL = options.cacheTTL || 5 * 60 * 1000 // 預設 5 分鐘
    this.userId = options.userId
  }

  /**
   * 生成用戶特定的緩存鍵
   */
  getUserCacheKey(suffix = '') {
    const userKey = this.isGuest ? 'guest' : this.userId
    return `${this.cacheKey}_${userKey}${suffix ? '_' + suffix : ''}`
  }

  /**
   * 獲取所有數據
   */
  async fetchAll() {
    if (this.isGuest) {
      return JSON.parse(localStorage.getItem(this.storageKey)) || []
    }

    const cacheKey = this.getUserCacheKey('all')
    return await cacheManager.getOrFetch(
      cacheKey,
      async () => {
        // 對於 workouts，使用 /workouts/all 端點
        const endpoint = this.apiEndpoint === '/workouts' ? '/workouts/all' : this.apiEndpoint
        const response = await apiClient.get(endpoint)
        return response.data
      },
      this.cacheTTL
    )
  }

  /**
   * 獲取分頁數據
   */
  async fetchPaginated(page = 1, limit = 10) {
    if (this.isGuest) {
      const allData = await this.fetchAll()
      const totalPages = Math.ceil(allData.length / limit)
      const startIndex = (page - 1) * limit
      const paginatedData = allData.slice(startIndex, startIndex + limit)
      
      return {
        data: paginatedData,
        currentPage: page,
        totalPages,
        total: allData.length
      }
    }

    const cacheKey = this.getUserCacheKey(`page_${page}_${limit}`)
    return await cacheManager.getOrFetch(
      cacheKey,
      async () => {
        const response = await apiClient.get(`${this.apiEndpoint}?page=${page}&limit=${limit}`)
        // 確保返回正確的數據結構
        return response.data
      },
      this.cacheTTL
    )
  }

  /**
   * 新增數據
   */
  async add(data) {
    if (this.isGuest) {
      const newItem = {
        ...data,
        _id: `guest_${new Date().getTime()}`,
        user: this.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const guestData = JSON.parse(localStorage.getItem(this.storageKey)) || []
      guestData.unshift(newItem)
      localStorage.setItem(this.storageKey, JSON.stringify(guestData))
      
      // 清除相關緩存
      this.invalidateCache()
      return newItem
    }

    try {
      const response = await apiClient.post(this.apiEndpoint, data)
      // 清除相關緩存
      this.invalidateCache()
      return response.data
    } catch (error) {
      throw error
    }
  }

  /**
   * 更新數據
   */
  async update(id, data) {
    if (this.isGuest) {
      let guestData = JSON.parse(localStorage.getItem(this.storageKey)) || []
      const index = guestData.findIndex(item => item._id === id)
      
      if (index !== -1) {
        guestData[index] = {
          ...guestData[index],
          ...data,
          updatedAt: new Date().toISOString()
        }
        localStorage.setItem(this.storageKey, JSON.stringify(guestData))
        this.invalidateCache()
        return guestData[index]
      }
      throw new Error('項目未找到')
    }

    try {
      const response = await apiClient.put(`${this.apiEndpoint}/${id}`, data)
      this.invalidateCache()
      return response.data
    } catch (error) {
      throw error
    }
  }

  /**
   * 刪除數據
   */
  async delete(id) {
    if (this.isGuest) {
      let guestData = JSON.parse(localStorage.getItem(this.storageKey)) || []
      const filteredData = guestData.filter(item => item._id !== id)
      localStorage.setItem(this.storageKey, JSON.stringify(filteredData))
      this.invalidateCache()
      return true
    }

    try {
      await apiClient.delete(`${this.apiEndpoint}/${id}`)
      this.invalidateCache()
      return true
    } catch (error) {
      throw error
    }
  }

  /**
   * 根據 ID 獲取單個項目
   */
  async getById(id) {
    if (this.isGuest) {
      const guestData = JSON.parse(localStorage.getItem(this.storageKey)) || []
      return guestData.find(item => item._id === id) || null
    }

    const cacheKey = this.getUserCacheKey(`item_${id}`)
    return await cacheManager.getOrFetch(
      cacheKey,
      async () => {
        const response = await apiClient.get(`${this.apiEndpoint}/${id}`)
        return response.data
      },
      this.cacheTTL
    )
  }

  /**
   * 清除相關緩存
   */
  invalidateCache() {
    const userPattern = new RegExp(`^${this.cacheKey}_${this.isGuest ? 'guest' : this.userId}`)
    cacheManager.invalidate(userPattern)
  }

  /**
   * 強制刷新數據（跳過緩存）
   */
  async forceRefresh() {
    this.invalidateCache()
    return await this.fetchAll()
  }
}

/**
 * 創建數據服務實例的工廠函數
 */
export function createDataService(authStore, config) {
  return new DataService({
    isGuest: authStore.isGuest,
    userId: authStore.user?._id,
    ...config
  })
}