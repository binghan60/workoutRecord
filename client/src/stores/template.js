import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api'
import { useAuthStore } from './auth'

const toast = useToast()
const GUEST_TEMPLATES_KEY = 'guest_templates'
const GUEST_SCHEDULE_KEY = 'guest_schedule'

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
  const schedule = ref({}) // This will hold the populated schedule
  const daysOfWeek = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
  const authStore = useAuthStore()

  const getTemplateById = computed(() => {
    return (templateId) => templates.value.find((t) => t._id === templateId)
  })

  async function fetchTemplates() {
    if (authStore.isGuest) {
      templates.value = JSON.parse(localStorage.getItem(GUEST_TEMPLATES_KEY)) || []
      return
    }
    try {
      const response = await apiClient.get('/templates')
      templates.value = response.data
    } catch (error) {
      toast.error('無法載入課表範本')
    }
  }

  async function addTemplate(templateData) {
    if (authStore.isGuest) {
      const newTemplate = {
        ...templateData,
        _id: `guest_${new Date().getTime()}`,
        user: authStore.user._id,
      }
      const guestData = JSON.parse(localStorage.getItem(GUEST_TEMPLATES_KEY)) || []
      guestData.unshift(newTemplate)
      localStorage.setItem(GUEST_TEMPLATES_KEY, JSON.stringify(guestData))
      templates.value.unshift(newTemplate)
      toast.success(`課表 "${templateData.name}" 已建立！`)
      return
    }
    try {
      const response = await apiClient.post('/templates', templateData)
      templates.value.unshift(response.data)
      toast.success(`課表 "${templateData.name}" 已建立！`)
    } catch (error) {
      toast.error(error.response?.data?.message || '建立課表失敗')
    }
  }

  async function updateTemplate(templateId, templateData) {
    if (authStore.isGuest) {
      let guestData = JSON.parse(localStorage.getItem(GUEST_TEMPLATES_KEY)) || []
      const index = guestData.findIndex((t) => t._id === templateId)
      if (index !== -1) {
        guestData[index] = { ...guestData[index], ...templateData }
        localStorage.setItem(GUEST_TEMPLATES_KEY, JSON.stringify(guestData))
        templates.value = guestData
        // Also update in schedule if present
        await fetchSchedule() // reload schedule to get latest
      }
      toast.success(`課表 "${templateData.name}" 已更新！`)
      return
    }
    try {
      const response = await apiClient.put(`/templates/${templateId}`, templateData)
      const updatedTemplate = response.data

      const index = templates.value.findIndex((t) => t._id === templateId)
      if (index !== -1) {
        templates.value[index] = updatedTemplate
      }

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
    if (authStore.isGuest) {
      let guestData = JSON.parse(localStorage.getItem(GUEST_TEMPLATES_KEY)) || []
      const deletedTemplate = guestData.find((t) => t._id === templateId)
      if (deletedTemplate) {
        guestData = guestData.filter((t) => t._id !== templateId)
        localStorage.setItem(GUEST_TEMPLATES_KEY, JSON.stringify(guestData))
        templates.value = guestData

        // Remove from schedule
        let guestSchedule = JSON.parse(localStorage.getItem(GUEST_SCHEDULE_KEY)) || {}
        for (const day in guestSchedule) {
          guestSchedule[day] = guestSchedule[day].filter((id) => id !== templateId)
        }
        localStorage.setItem(GUEST_SCHEDULE_KEY, JSON.stringify(guestSchedule))
        await fetchSchedule() // reload schedule

        toast.success(`課表 "${deletedTemplate.name}" 已刪除！`)
      }
      return
    }
    try {
      await apiClient.delete(`/templates/${templateId}`)
      const index = templates.value.findIndex((t) => t._id === templateId)
      if (index !== -1) {
        const deletedTemplateName = templates.value[index].name
        templates.value.splice(index, 1)
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
    if (authStore.isGuest) {
      const guestScheduleIds = JSON.parse(localStorage.getItem(GUEST_SCHEDULE_KEY)) || {}
      const guestTemplates = JSON.parse(localStorage.getItem(GUEST_TEMPLATES_KEY)) || []
      const populatedSchedule = {}
      for (const day in guestScheduleIds) {
        populatedSchedule[day] = guestScheduleIds[day]
          .map((id) => guestTemplates.find((t) => t._id === id))
          .filter(Boolean) // Filter out any templates that might have been deleted
      }
      schedule.value = populatedSchedule
      return
    }
    try {
      const response = await apiClient.get('/schedule')
      schedule.value = response.data
    } catch (error) {
      toast.error('無法載入訓練排程')
    }
  }

  async function updateScheduleOnBackend() {
    if (authStore.isGuest) {
      const idOnlySchedule = dehydrateSchedule(schedule.value)
      localStorage.setItem(GUEST_SCHEDULE_KEY, JSON.stringify(idOnlySchedule))
      // No need to refetch, local state is the source of truth
      return
    }
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

    if (!schedule.value[day]) {
      schedule.value[day] = []
    }

    const currentIds = schedule.value[day].map((t) => t._id)
    if (currentIds.includes(templateId)) {
      toast.warning('這個課表已經在排程中了')
      return
    }

    schedule.value[day].push(template)
    updateScheduleOnBackend()
    toast.success(`已將 "${template.name}" 加入 ${day} 的排程`)
  }

  function removeTemplateFromSchedule(day, index) {
    if (!schedule.value[day] || schedule.value[day][index] === undefined) return
    const template = schedule.value[day][index]
    schedule.value[day].splice(index, 1)
    updateScheduleOnBackend()
    toast.info(`已從 ${day} 的排程中移除 "${template.name}"`)
  }

  function updateScheduleOrder(day, oldIndex, newIndex) {
    if (!schedule.value[day]) return
    const [movedItem] = schedule.value[day].splice(oldIndex, 1)
    schedule.value[day].splice(newIndex, 0, movedItem)
    updateScheduleOnBackend()
  }

  // New function for guest mode cascading delete
  async function removeExerciseFromAllTemplates(exerciseId) {
    if (!authStore.isGuest) return

    let guestTemplates = JSON.parse(localStorage.getItem(GUEST_TEMPLATES_KEY)) || []
    guestTemplates.forEach((template) => {
      template.exercises = template.exercises.filter((ex) => ex.exercise !== exerciseId)
    })
    localStorage.setItem(GUEST_TEMPLATES_KEY, JSON.stringify(guestTemplates))
    templates.value = guestTemplates
    await fetchSchedule() // Re-populate schedule with updated templates
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
    removeExerciseFromAllTemplates, // Expose the new function
  }
})


