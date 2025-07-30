import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api'
import { useTemplateStore } from './template'
import { useAuthStore } from './auth'

const toast = useToast()
const GUEST_EXERCISES_KEY = 'guest_exercises'

// Helper function to group a list of exercises
const groupAndSortExercises = (exerciseList) => {
  const groups = exerciseList.reduce((acc, exercise) => {
    const groupName = exercise.muscleGroup || '未分類'
    if (!acc[groupName]) {
      acc[groupName] = []
    }
    acc[groupName].push(exercise)
    return acc
  }, {})

  return Object.keys(groups)
    .sort((a, b) => a.localeCompare(b, 'zh-Hant'))
    .map((groupName) => ({
      groupName,
      exercises: groups[groupName],
    }))
}

export const useExerciseStore = defineStore('exercise', () => {
  const exercises = ref([])
  const authStore = useAuthStore()

  const _stablySortedExercises = computed(() => {
    return [...exercises.value].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
  })

  const allExercises = computed(() => _stablySortedExercises.value)

  // Provides ALL exercises (built-in + custom)
  const groupedAllExercises = computed(() => {
    return groupAndSortExercises(_stablySortedExercises.value)
  })

  // Provides ONLY custom exercises
  const groupedCustomExercises = computed(() => {
    const customList = _stablySortedExercises.value.filter((ex) => ex.isCustom)
    return groupAndSortExercises(customList)
  })

  async function fetchExercises() {
    if (authStore.isGuest) {
      exercises.value = JSON.parse(localStorage.getItem(GUEST_EXERCISES_KEY)) || []
      return
    }
    try {
      const response = await apiClient.get('/exercises')
      // Ensure every exercise has the isCustom property for consistent filtering
      exercises.value = response.data.map((ex) => ({ ...ex, isCustom: ex.isCustom || false }))
    } catch (error) {
      toast.error('無法載入訓練動作')
    }
  }

  async function addExercise(name, muscleGroup) {
    if (authStore.isGuest) {
      const newExercise = {
        _id: `guest_${new Date().getTime()}`,
        name,
        muscleGroup,
        user: authStore.user._id,
        isCustom: true,
      }
      const guestData = JSON.parse(localStorage.getItem(GUEST_EXERCISES_KEY)) || []
      guestData.push(newExercise)
      localStorage.setItem(GUEST_EXERCISES_KEY, JSON.stringify(guestData))
      exercises.value.push(newExercise)
      toast.success(`動作 "${name}" 已新增！`)
      return
    }
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

    if (authStore.isGuest) {
      let guestData = JSON.parse(localStorage.getItem(GUEST_EXERCISES_KEY)) || []
      guestData = guestData.filter((ex) => ex._id !== id)
      localStorage.setItem(GUEST_EXERCISES_KEY, JSON.stringify(guestData))
      exercises.value = guestData
      await templateStore.removeExerciseFromAllTemplates(id)
      toast.success(`動作 "${exerciseToDelete.name}" 已成功刪除。`)
      return
    }

    try {
      await apiClient.delete(`/exercises/${id}`)
      await fetchExercises()
      await templateStore.fetchTemplates()
      toast.success(`動作 "${exerciseToDelete.name}" 已成功刪除。`)
    } catch (error) {
      toast.error(error.response?.data?.message || '刪除動作失敗')
    }
  }

  return {
    allExercises,
    groupedAllExercises,
    groupedCustomExercises,
    fetchExercises,
    addExercise,
    deleteExercise,
  }
})
