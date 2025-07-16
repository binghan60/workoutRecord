import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { useUiStore } from './ui'

const toast = useToast()

// 模擬 API 延遲的輔助函式
const fakeApiCall = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

export const useTemplateStore = defineStore('template', () => {
  const uiStore = useUiStore()
  // 從 localStorage 讀取已儲存的課表範本
  const templates = ref(JSON.parse(localStorage.getItem('workoutTemplates')) || [])

  // 監聽課表範本的變化，並自動存回 localStorage
  watch(
    templates,
    (newTemplates) => {
      localStorage.setItem('workoutTemplates', JSON.stringify(newTemplates))
    },
    { deep: true },
  )

  /**
   * 新增一個課表範本
   * @param {object} templateData - 包含名稱和動作列表的物件 { name: string, exercises: string[] }
   */
  async function addTemplate(templateData) {
    await uiStore.withLoading(async () => {
      await fakeApiCall()
      templates.value.unshift({
        id: `tpl-${Date.now()}`,
        ...templateData,
      })
      toast.success(`��表 "${templateData.name}" 已儲存！`)
    })
  }

  /**
   * 根據 ID 刪除一個課表範本
   * @param {string} templateId - 要刪除的範本 ID
   */
  async function deleteTemplate(templateId) {
    await uiStore.withLoading(async () => {
      await fakeApiCall()
      const index = templates.value.findIndex((t) => t.id === templateId)
      if (index !== -1) {
        const deletedTemplateName = templates.value[index].name
        templates.value.splice(index, 1)
        toast.success(`課表 "${deletedTemplateName}" 已刪除！`)
      }
    })
  }

  return { templates, addTemplate, deleteTemplate }
})
