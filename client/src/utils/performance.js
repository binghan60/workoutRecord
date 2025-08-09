/**
 * 性能優化工具函數
 */

// 防抖函數 - 用於輸入處理
export function debounce(func, wait, immediate = false) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func(...args)
  }
}

// 節流函數 - 用於滾動/調整大小事件
export function throttle(func, limit) {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 懶載入組件工具
export function createLazyComponent(importFn, loadingComponent = null, errorComponent = null) {
  return {
    component: importFn,
    loading: loadingComponent,
    error: errorComponent,
    delay: 200,
    timeout: 10000
  }
}

// 圖片懶載入觀察器
export function createImageObserver(callback) {
  if (!('IntersectionObserver' in window)) {
    // 舊瀏覽器回退
    return {
      observe: () => {},
      unobserve: () => {},
      disconnect: () => {}
    }
  }

  return new IntersectionObserver(callback, {
    rootMargin: '50px 0px',
    threshold: 0.1
  })
}

// 記憶體使用監控
export function getMemoryUsage() {
  if ('memory' in performance) {
    return {
      used: Math.round(performance.memory.usedJSHeapSize / 1048576),
      total: Math.round(performance.memory.totalJSHeapSize / 1048576),
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
    }
  }
  return null
}

// 性能計時工具
export function measurePerformance(name, fn) {
  return async (...args) => {
    const start = performance.now()
    try {
      const result = await fn(...args)
      const end = performance.now()
      if (process.env.NODE_ENV === 'development') {
        console.log(`${name} 耗時 ${end - start} 毫秒`)
      }
      return result
    } catch (error) {
      const end = performance.now()
      console.error(`${name} 在 ${end - start} 毫秒後失敗`, error)
      throw error
    }
  }
}

// 打包分析輔助工具
export function logBundleInfo() {
  if (process.env.NODE_ENV === 'development') {
    console.log('打包分析:', {
      memory: getMemoryUsage(),
      timing: performance.timing,
      navigation: performance.navigation
    })
  }
}

// 批量處理工具 - 避免阻塞 UI
export function batchProcess(items, processor, batchSize = 10) {
  return new Promise((resolve) => {
    let index = 0
    const results = []
    
    function processBatch() {
      const batch = items.slice(index, index + batchSize)
      
      batch.forEach((item, i) => {
        results[index + i] = processor(item)
      })
      
      index += batchSize
      
      if (index < items.length) {
        // 使用 requestIdleCallback 或 setTimeout 避免阻塞
        if (window.requestIdleCallback) {
          requestIdleCallback(processBatch)
        } else {
          setTimeout(processBatch, 0)
        }
      } else {
        resolve(results)
      }
    }
    
    processBatch()
  })
}

// 緩存裝飾器
export function memoize(fn, getKey = (...args) => JSON.stringify(args)) {
  const cache = new Map()
  
  return function(...args) {
    const key = getKey(...args)
    
    if (cache.has(key)) {
      return cache.get(key)
    }
    
    const result = fn.apply(this, args)
    cache.set(key, result)
    
    return result
  }
}