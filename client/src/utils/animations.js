/**
 * 動畫工具庫
 * 提供一致的動畫效果和過渡
 */

// 預定義的動畫持續時間
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 750
}

// 預定義的緩動函數
export const EASING = {
  easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  easeInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
}

// 按鈕點擊動畫
export function animateButtonClick(element) {
  if (!element) return
  
  element.style.transform = 'scale(0.95)'
  element.style.transition = `transform ${ANIMATION_DURATION.fast}ms ${EASING.easeOut}`
  
  setTimeout(() => {
    element.style.transform = 'scale(1)'
  }, ANIMATION_DURATION.fast)
}

// 成功動畫（綠色脈衝）
export function animateSuccess(element) {
  if (!element) return
  
  element.style.animation = `successPulse ${ANIMATION_DURATION.normal}ms ${EASING.easeOut}`
  
  setTimeout(() => {
    element.style.animation = ''
  }, ANIMATION_DURATION.normal)
}

// 錯誤動畫（紅色搖擺）
export function animateError(element) {
  if (!element) return
  
  element.style.animation = `errorShake ${ANIMATION_DURATION.slow}ms ${EASING.easeOut}`
  
  setTimeout(() => {
    element.style.animation = ''
  }, ANIMATION_DURATION.slow)
}

// 淡入動畫
export function fadeIn(element, duration = ANIMATION_DURATION.normal) {
  if (!element) return
  
  element.style.opacity = '0'
  element.style.transform = 'translateY(20px)'
  element.style.transition = `opacity ${duration}ms ${EASING.easeOut}, transform ${duration}ms ${EASING.easeOut}`
  
  requestAnimationFrame(() => {
    element.style.opacity = '1'
    element.style.transform = 'translateY(0)'
  })
}

// 滑入動畫
export function slideIn(element, direction = 'left', duration = ANIMATION_DURATION.normal) {
  if (!element) return
  
  const transforms = {
    left: 'translateX(-100%)',
    right: 'translateX(100%)',
    up: 'translateY(-100%)',
    down: 'translateY(100%)'
  }
  
  element.style.transform = transforms[direction]
  element.style.transition = `transform ${duration}ms ${EASING.easeOut}`
  
  requestAnimationFrame(() => {
    element.style.transform = 'translateX(0) translateY(0)'
  })
}

// 彈跳進入動畫
export function bounceIn(element, duration = ANIMATION_DURATION.slow) {
  if (!element) return
  
  element.style.transform = 'scale(0)'
  element.style.transition = `transform ${duration}ms ${EASING.bounce}`
  
  requestAnimationFrame(() => {
    element.style.transform = 'scale(1)'
  })
}

// 數字計數動畫
export function animateNumber(element, from, to, duration = ANIMATION_DURATION.slow) {
  if (!element) return
  
  const startTime = performance.now()
  const difference = to - from
  
  function updateNumber(currentTime) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // 使用緩動函數
    const easeProgress = 1 - Math.pow(1 - progress, 3)
    const currentValue = Math.round(from + (difference * easeProgress))
    
    element.textContent = currentValue.toLocaleString()
    
    if (progress < 1) {
      requestAnimationFrame(updateNumber)
    }
  }
  
  requestAnimationFrame(updateNumber)
}

// 進度條動畫
export function animateProgress(element, targetPercentage, duration = ANIMATION_DURATION.normal) {
  if (!element) return
  
  const startWidth = parseFloat(element.style.width) || 0
  const targetWidth = targetPercentage
  const difference = targetWidth - startWidth
  const startTime = performance.now()
  
  function updateProgress(currentTime) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    const easeProgress = 1 - Math.pow(1 - progress, 2)
    const currentWidth = startWidth + (difference * easeProgress)
    
    element.style.width = `${currentWidth}%`
    
    if (progress < 1) {
      requestAnimationFrame(updateProgress)
    }
  }
  
  requestAnimationFrame(updateProgress)
}

// 創建漣漪效果
export function createRippleEffect(element, event) {
  if (!element) return
  
  const rect = element.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = event.clientX - rect.left - size / 2
  const y = event.clientY - rect.top - size / 2
  
  const ripple = document.createElement('div')
  ripple.style.cssText = `
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: scale(0);
    animation: ripple ${ANIMATION_DURATION.slow}ms ${EASING.easeOut};
    left: ${x}px;
    top: ${y}px;
    width: ${size}px;
    height: ${size}px;
    pointer-events: none;
  `
  
  element.style.position = 'relative'
  element.style.overflow = 'hidden'
  element.appendChild(ripple)
  
  setTimeout(() => {
    ripple.remove()
  }, ANIMATION_DURATION.slow)
}

// 懸停效果
export function addHoverEffect(element, scale = 1.05) {
  if (!element) return
  
  element.style.transition = `transform ${ANIMATION_DURATION.fast}ms ${EASING.easeOut}`
  
  element.addEventListener('mouseenter', () => {
    element.style.transform = `scale(${scale})`
  })
  
  element.addEventListener('mouseleave', () => {
    element.style.transform = 'scale(1)'
  })
}

// 載入動畫
export function createLoadingSpinner(container) {
  if (!container) return
  
  const spinner = document.createElement('div')
  spinner.className = 'custom-loading-spinner'
  spinner.innerHTML = `
    <div class="spinner-ring"></div>
    <div class="spinner-ring"></div>
    <div class="spinner-ring"></div>
  `
  
  container.appendChild(spinner)
  return spinner
}

// 移除載入動畫
export function removeLoadingSpinner(container) {
  if (!container) return
  
  const spinner = container.querySelector('.custom-loading-spinner')
  if (spinner) {
    fadeOut(spinner, ANIMATION_DURATION.fast).then(() => {
      spinner.remove()
    })
  }
}

// 淡出動畫（返回 Promise）
export function fadeOut(element, duration = ANIMATION_DURATION.normal) {
  return new Promise((resolve) => {
    if (!element) {
      resolve()
      return
    }
    
    element.style.transition = `opacity ${duration}ms ${EASING.easeOut}`
    element.style.opacity = '0'
    
    setTimeout(() => {
      resolve()
    }, duration)
  })
}