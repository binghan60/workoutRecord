import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api'
import { useTemplateStore } from './template'

const toast = useToast()

export const useExerciseStore = defineStore('exercise', () => {
  const exercises = ref([])

  const allExercises = computed(() => {
    return [...exercises.value].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
  })

  const groupedExercises = computed(() => {
    return allExercises.value.reduce((acc, exercise) => {
      const group = exercise.muscleGroup || '未分類'
      if (!acc[group]) {
        acc[group] = []
      }
      acc[group].push(exercise)
      return acc
    }, {})
  })

  async function fetchExercises() {
    try {
      const response = await apiClient.get('/exercises')
      exercises.value = response.data
    } catch (error) {
      toast.error('無法載入訓練動作')
    }
  }

  async function addExercise(name, muscleGroup) {
    try {
      const response = await apiClient.post('/exercises', { name, muscleGroup })
      exercises.value.push(response.data)
      toast.success(`動作 "${name}" 已新增！`)
    } catch (error) {
      toast.error(error.response?.data?.message || `新增動作 "${name}" 失敗`)
    }
  }

  async function deleteExercise(id) {
    const templateStore = useTemplateStore()
    const exerciseToDelete = exercises.value.find((ex) => ex._id === id)
    if (!exerciseToDelete) return

    try {
      await apiClient.delete(`/exercises/${id}`)

      // The backend handles the cascading delete. We just need to refetch
      // to ensure our frontend state is in sync with the database.
      await fetchExercises()
      await templateStore.fetchTemplates()

      toast.success(`動作 "${exerciseToDelete.name}" 已成功刪除。`)
    } catch (error) {
      toast.error(error.response?.data?.message || '刪除動作失敗')
    }
  }

  return { allExercises, groupedExercises, fetchExercises, addExercise, deleteExercise }
})

