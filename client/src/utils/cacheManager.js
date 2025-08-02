/**
 * 數據緩存管理器
 * 提供帶 TTL (Time To Live) 的緩存功能
 */

class CacheManager {
  constructor() {
    this.cache = new Map()
    this.defaultTTL = 5 * 60 * 1000 // 預設 5 分鐘
  }

  /**
   * 設置緩存項目
   * @param {string} key - 緩存鍵
   * @param {any} data - 要緩存的數據
   * @param {number} ttl - 生存時間（毫秒），可選
   */
  set(key, data, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl
    this.cache.set(key, {
      data,
      expiresAt,
      createdAt: Date.now()
    })
  }

  /**
   * 獲取緩存項目
   * @param {string} key - 緩存鍵
   * @returns {any|null} 緩存的數據或 null
   */
  get(key) {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // 檢查是否過期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  /**
   * 檢查緩存是否存在且有效
   * @param {string} key - 緩存鍵
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null
  }

  /**
   * 刪除特定緩存項目
   * @param {string} key - 緩存鍵
   */
  delete(key) {
    this.cache.delete(key)
  }

  /**
   * 清空所有緩存
   */
  clear() {
    this.cache.clear()
  }

  /**
   * 刪除過期的緩存項目
   */
  cleanup() {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 獲取緩存統計信息
   * @returns {object} 緩存統計
   */
  getStats() {
    const now = Date.now()
    let validItems = 0
    let expiredItems = 0

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        expiredItems++
      } else {
        validItems++
      }
    }

    return {
      totalItems: this.cache.size,
      validItems,
      expiredItems
    }
  }

  /**
   * 使用緩存或獲取新數據的通用方法
   * @param {string} key - 緩存鍵
   * @param {Function} fetchFn - 獲取數據的函數
   * @param {number} ttl - 生存時間（毫秒），可選
   * @returns {Promise<any>} 數據
   */
  async getOrFetch(key, fetchFn, ttl = this.defaultTTL) {
    // 先檢查緩存
    const cachedData = this.get(key)
    if (cachedData !== null) {
      return cachedData
    }

    // 緩存不存在或已過期，獲取新數據
    try {
      const freshData = await fetchFn()
      this.set(key, freshData, ttl)
      return freshData
    } catch (error) {
      throw error
    }
  }

  /**
   * 使緩存項目無效（標記為過期）
   * @param {string|RegExp} pattern - 緩存鍵或正則表達式模式
   */
  invalidate(pattern) {
    if (typeof pattern === 'string') {
      this.delete(pattern)
    } else if (pattern instanceof RegExp) {
      // 支持正則表達式模式匹配
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.delete(key)
        }
      }
    }
  }
}

// 創建全局緩存實例
const cacheManager = new CacheManager()

// 定期清理過期緩存（每 10 分鐘）
setInterval(() => {
  cacheManager.cleanup()
}, 10 * 60 * 1000)

export default cacheManager