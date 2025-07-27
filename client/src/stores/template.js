import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api'

const toast = useToast()

// Helper function to convert populated schedule back to ID-only schedule
const dehydrateSchedule = (populatedSchedule) => {
  const dehydrated = {}
  for (const day in populatedSchedule) {
    if (Array.isArray(populatedSchedule[day])) {
      dehydrated[day] = populatedSchedule[day].map((template) => template._id || template)
    }
  }
  return dehydrated
}

export const useTemplateStore = defineStore('template', () => {
  const templates = ref([])
  const schedule = ref({}) // This will hold the populated schedule from the backend
  const daysOfWeek = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']

  const getTemplateById = computed(() => {
    return (templateId) => templates.value.find((t) => t._id === templateId)
  })

  async function fetchTemplates() {
    try {
      const response = await apiClient.get('/templates')
      templates.value = response.data
    } catch (error) {
      toast.error('無法載入課表範本')
    }
  }

  async function addTemplate(templateData) {
    try {
      const response = await apiClient.post('/templates', templateData)
      templates.value.unshift(response.data)
      toast.success(`課表 "${templateData.name}" 已建立！`)
    } catch (error) {
      toast.error(error.response?.data?.message || '建立課表失敗')
    }
  }

  async function updateTemplate(templateId, templateData) {
    try {
      const response = await apiClient.put(`/templates/${templateId}`, templateData)
      const updatedTemplate = response.data

      // 1. Update the main templates array
      const index = templates.value.findIndex((t) => t._id === templateId)
      if (index !== -1) {
        templates.value[index] = updatedTemplate
      }

      // 2. CRITICAL: Also update the template if it exists in the populated schedule
      for (const day in schedule.value) {
        if (Array.isArray(schedule.value[day])) {
          const scheduleIndex = schedule.value[day].findIndex((t) => t._id === templateId)
          if (scheduleIndex !== -1) {
            schedule.value[day][scheduleIndex] = updatedTemplate
          }
        }
      }

      toast.success(`課表 "${templateData.name}" 已更新！`)
    } catch (error) {
      toast.error(error.response?.data?.message || '更新課表失敗')
    }
  }

  async function deleteTemplate(templateId) {
    try {
      await apiClient.delete(`/templates/${templateId}`)
      const index = templates.value.findIndex((t) => t._id === templateId)
      if (index !== -1) {
        const deletedTemplateName = templates.value[index].name
        templates.value.splice(index, 1)
        // Also remove from local schedule state before updating backend
        daysOfWeek.forEach((day) => {
          if (schedule.value[day]) {
            const scheduleIndex = schedule.value[day].findIndex((t) => t._id === templateId)
            if (scheduleIndex > -1) {
              schedule.value[day].splice(scheduleIndex, 1)
            }
          }
        })
        await updateScheduleOnBackend()
        toast.success(`課表 "${deletedTemplateName}" 已刪除！`)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || '刪除課表失敗')
    }
  }

  async function fetchSchedule() {
    try {
      const response = await apiClient.get('/schedule')
      schedule.value = response.data
    } catch (error) {
      toast.error('無法載入訓練排程')
    }
  }

  async function updateScheduleOnBackend() {
    try {
      const idOnlySchedule = dehydrateSchedule(schedule.value)
      const response = await apiClient.put('/schedule', idOnlySchedule)
      schedule.value = response.data // Update local state with populated response from backend
    } catch (error) {
      toast.error('更新排程失敗')
    }
  }

  function addTemplateToSchedule(day, templateId) {
    if (!day || !templateId) return
    const template = getTemplateById.value(templateId)
    if (!template) return

    // If the schedule for the day doesn't exist, initialize it as an empty array.
    if (!schedule.value[day]) {
      schedule.value[day] = []
    }

    // Get the current list of IDs for the day
    const currentIds = schedule.value[day].map((t) => t._id)
    if (currentIds.includes(templateId)) {
      toast.warning('這個課表已經在排程中了')
      return
    }

    // Optimistically add the full template object for immediate UI update
    schedule.value[day].push(template)

    // Then, trigger the backend update
    updateScheduleOnBackend()
    toast.success(`已將 "${template.name}" 加入 ${day} 的排程`)
  }

  function removeTemplateFromSchedule(day, index) {
    if (!schedule.value[day] || schedule.value[day][index] === undefined) return
    const template = schedule.value[day][index]

    // Optimistically remove from UI
    schedule.value[day].splice(index, 1)

    // Then, trigger the backend update
    updateScheduleOnBackend()
    toast.info(`已從 ${day} 的排程中移除 "${template.name}"`)
  }

  function updateScheduleOrder(day, oldIndex, newIndex) {
    if (!schedule.value[day]) return
    const [movedItem] = schedule.value[day].splice(oldIndex, 1)
    schedule.value[day].splice(newIndex, 0, movedItem)
    updateScheduleOnBackend()
  }

  return {
    templates,
    schedule,
    daysOfWeek,
    getTemplateById,
    fetchTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    fetchSchedule,
    addTemplateToSchedule,
    removeTemplateFromSchedule,
    updateScheduleOrder,
  }
})


