import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Highcharts from 'highcharts'
import HighchartsVue from 'highcharts-vue'
import App from './App.vue'
import router from './router'
import Toast, { useToast } from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import vuetify from './plugins/vuetify'
Highcharts.setOptions({
  lang: {
    thousandsSep: ',',
    decimalPoint: '.',
    resetZoom: 'Reset zoom',
    resetZoomTitle: 'Reset zoom level 1:1',
    printChart: 'Print chart',
    downloadPNG: 'Download PNG image',
    downloadJPEG: 'Download JPEG image',
    downloadPDF: 'Download PDF document',
    downloadSVG: 'Download SVG vector image',
    contextButtonTitle: 'Chart context menu',
    loading: 'Loading...',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
  global: {
    useUTC: false,
  },
})

// VeeValidate 全域設定
import { defineRule, configure } from 'vee-validate'
import { required, email, min, confirmed } from '@vee-validate/rules'

// 手動定義需要的規則
defineRule('required', required)
defineRule('email', email)
defineRule('minLength', min)
defineRule('confirmed', confirmed)

// 設定自訂錯誤訊息
configure({
  generateMessage: (context) => {
    const messages = {
      required: `此欄位為必填`,
      email: `請輸入有效的電子郵件地址`,
      minLength: `此欄位長度不能少於 ${context.rule.params[0]} 個字元`,
      confirmed: `兩次輸入的密碼不一致`,
    }
    const message = messages[context.rule.name] ? messages[context.rule.name] : `欄位無效`
    return message
  },
  validateOnInput: true, // 輸入時即時驗證
})

const toastOptions = {
  position: 'bottom-center',
  timeout: 1000,
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

app.use(createPinia()) // Pinia 必須在 Vuetify 之前
app.use(vuetify)
app.use(Toast, toastOptions)
app.config.globalProperties.$toast = useToast()

app.use(HighchartsVue, { Highcharts })
app.use(router)

app.mount('#app')
