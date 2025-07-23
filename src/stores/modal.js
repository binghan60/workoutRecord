import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useModalStore = defineStore('modal', () => {
  const isOpen = ref(false)
  const title = ref('')
  const message = ref('')
  const onConfirmCallback = ref(null)
  const isExerciseModalOpen = ref(false)
  const isBodyMetricsModalOpen = ref(false) // Add this line
  const selectedExerciseId = ref(null)

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
    // Add this function
    isBodyMetricsModalOpen.value = true
  }

  function hideBodyMetricsModal() {
    // Add this function
    isBodyMetricsModalOpen.value = false
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
    isBodyMetricsModalOpen, // Add this line
    showBodyMetricsModal, // Add this line
    hideBodyMetricsModal, // Add this line
    selectedExerciseId,
  }
})
