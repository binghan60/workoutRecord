import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Highcharts from 'highcharts'
import HighchartsVue from 'highcharts-vue'
import App from './App.vue'
import router from './router'
import Toast, { useToast } from 'vue-toastification'
import 'vue-toastification/dist/index.css'

// VeeValidate 全域設定
import { defineRule, configure } from 'vee-validate'

// 手動定義需要的規則
defineRule('required', (value) => {
  if (value === null || value === undefined || value === '') {
    return false
  }
  return true
})

defineRule('min_value', (value, [min]) => {
  if (value === null || value === undefined || value === '') {
    return true
  }
  if (Number(value) < min) {
    return false
  }
  return true
})

// 設定自訂錯誤訊息
configure({
  generateMessage: (context) => {
    const messages = {
      required: `「${context.field}」為必填項目`,
      min_value: `「${context.field}」不能小於 ${context.rule.params[0]}`,
      // 你可以在這裡新增更多自訂訊息
    }
    const message = messages[context.rule.name] ? messages[context.rule.name] : `「${context.field}」欄位無效`
    return message
  },
  validateOnInput: true, // 輸入時即時驗證
})

const toastOptions = {
  position: 'bottom-center',
  timeout: 1500,
  closeOnClick: true,
  pauseOnFocusLoss: false,
  pauseOnHover: false,
  draggable: true,
  draggablePercent: 0.25,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false,
  transition: 'Vue-Toastification__fade',
}

const app = createApp(App)
app.use(Toast, toastOptions)
app.config.globalProperties.$toast = useToast()

app.use(HighchartsVue, { Highcharts })
app.use(createPinia())
app.use(router)

app.mount('#app')
