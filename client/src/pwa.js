// src/pwa.js
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    const r = confirm('新的內容已可用，是否重新載入？')
    if (r) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('應用程式已準備好離線工作')
  },
})