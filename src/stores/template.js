import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useUIStore } from './ui'

const toast = useToast()

// 模擬 API 延遲的輔助函式
const fakeApiCall = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

const daysOfWeek = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']

export const useTemplateStore = defineStore('template', () => {
  const uiStore = useUIStore()

  // --- STATE ---
  const templates = ref(JSON.parse(localStorage.getItem('workoutTemplates')) || [])

  const defaultSchedule = {
    星期一: [],
    星期二: [],
    星期三: [],
    星期四: [],
    星期五: [],
    星期六: [],
    星期日: [],
  }
  const savedSchedule = JSON.parse(localStorage.getItem('workoutSchedule'))
  const schedule = ref({ ...defaultSchedule, ...savedSchedule })

  // --- WATCHERS ---
  watch(
    templates,
    (newTemplates) => {
      localStorage.setItem('workoutTemplates', JSON.stringify(newTemplates))
    },
    { deep: true },
  )

  watch(
    schedule,
    (newSchedule) => {
      localStorage.setItem('workoutSchedule', JSON.stringify(newSchedule))
    },
    { deep: true },
  )

  // --- GETTERS ---
  const getTemplateById = computed(() => {
    return (templateId) => templates.value.find((t) => t.id === templateId)
  })

  // --- ACTIONS ---

  /**
   * 新增一個課表範本
   * @param {object} templateData - { name: string, exercises: object[] }
   */
  async function addTemplate(templateData) {
    await uiStore.withLoading(async () => {
      await fakeApiCall()
      templates.value.unshift({
        id: `tpl-${Date.now()}`,
        ...templateData,
      })
      toast.success(`課表 "${templateData.name}" 已建立！`)
    })
  }

  /**
   * 根據 ID 刪除一個課表範本，並從所有排程中移除
   * @param {string} templateId - 要刪除的範本 ID
   */
  async function deleteTemplate(templateId) {
    await uiStore.withLoading(async () => {
      await fakeApiCall()
      const index = templates.value.findIndex((t) => t.id === templateId)
      if (index !== -1) {
        const deletedTemplateName = templates.value[index].name
        templates.value.splice(index, 1)

        // 從所有排程日中移除這個範本
        daysOfWeek.forEach((day) => {
          const scheduleIndex = schedule.value[day].indexOf(templateId)
          if (scheduleIndex > -1) {
            schedule.value[day].splice(scheduleIndex, 1)
          }
        })

        toast.success(`課表 "${deletedTemplateName}" 已刪除！`)
      }
    })
  }

  /**
   * 將一個課表範本新增到某一天的排程中
   * @param {string} day - 星期幾
   * @param {string} templateId - 範本 ID
   */
  function addTemplateToSchedule(day, templateId) {
    if (!schedule.value[day] || !templateId) return
    if (schedule.value[day].includes(templateId)) {
      toast.warning('這個課表已經在排程中了')
      return
    }
    schedule.value[day].push(templateId)
    const template = getTemplateById.value(templateId)
    toast.success(`已將 "${template.name}" 加入 ${day} 的排程`)
  }

  /**
   * 從某一天的排程中移除一個課表範本
   * @param {string} day - 星期幾
   * @param {number} index - 要移除的範本在陣列中的索引
   */
  function removeTemplateFromSchedule(day, index) {
    if (!schedule.value[day] || schedule.value[day][index] === undefined) return
    const templateId = schedule.value[day][index]
    const template = getTemplateById.value(templateId)
    schedule.value[day].splice(index, 1)
    toast.info(`已從 ${day} 的排程中移除 "${template.name}"`)
  }

  /**
   * 更新某一天排程的順序
   * @param {string} day - 星期幾
   * @param {number} oldIndex - 舊索引
   * @param {number} newIndex - 新索引
   */
  function updateScheduleOrder(day, oldIndex, newIndex) {
    if (!schedule.value[day]) return
    const [movedItem] = schedule.value[day].splice(oldIndex, 1)
    schedule.value[day].splice(newIndex, 0, movedItem)
  }

  return {
    templates,
    schedule,
    daysOfWeek,
    getTemplateById,
    addTemplate,
    deleteTemplate,
    addTemplateToSchedule,
    removeTemplateFromSchedule,
    updateScheduleOrder,
  }
})
