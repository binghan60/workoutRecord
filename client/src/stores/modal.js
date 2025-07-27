import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useModalStore = defineStore('modal', () => {
  const isOpen = ref(false)
  const title = ref('')
  const message = ref('')
  const onConfirmCallback = ref(null)

  const isExerciseModalOpen = ref(false)
  const selectedExerciseId = ref(null)

  const isBodyMetricsModalOpen = ref(false)

  const isTemplateEditModalOpen = ref(false)
  const templateToEdit = ref(null)

  function showConfirmation(confirmTitle, confirmMessage, onConfirm) {
    title.value = confirmTitle
    message.value = confirmMessage
    onConfirmCallback.value = onConfirm
    isOpen.value = true
  }

  function hideConfirmation() {
    isOpen.value = false
    title.value = ''
    message.value = ''
    onConfirmCallback.value = null
  }

  function confirm() {
    if (typeof onConfirmCallback.value === 'function') {
      onConfirmCallback.value()
    }
    hideConfirmation()
  }

  function showExerciseModal() {
    isExerciseModalOpen.value = true
  }

  function hideExerciseModal() {
    isExerciseModalOpen.value = false
  }

  function showBodyMetricsModal() {
    isBodyMetricsModalOpen.value = true
  }

  function hideBodyMetricsModal() {
    isBodyMetricsModalOpen.value = false
  }

  function showTemplateEditModal(template) {
    templateToEdit.value = template
    isTemplateEditModalOpen.value = true
  }

  function hideTemplateEditModal() {
    isTemplateEditModalOpen.value = false
    templateToEdit.value = null
  }

  return {
    isOpen,
    title,
    message,
    showConfirmation,
    hideConfirmation,
    confirm,
    isExerciseModalOpen,
    showExerciseModal,
    hideExerciseModal,
    selectedExerciseId,
    isBodyMetricsModalOpen,
    showBodyMetricsModal,
    hideBodyMetricsModal,
    isTemplateEditModalOpen,
    templateToEdit,
    showTemplateEditModal,
    hideTemplateEditModal,
  }
})
