import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useTemplateStore } from './template'
import { useAuthStore } from './auth'
import { createDataService } from '@/utils/dataService'
import cacheManager from '@/utils/cacheManager'

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
  const isLoading = ref(false)
  const lastFetchTime = ref(null)

  // 創建數據服務實例
  const dataService = computed(() => createDataService(authStore, {
    storageKey: GUEST_EXERCISES_KEY,
    apiEndpoint: '/exercises',
    dbTable: 'exercises' // The name of the Dexie table
  }))

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

  async function fetchExercises(forceRefresh = false, suppressErrorToast = false) {
    if (isLoading.value) return // 防止重複請求
    
    isLoading.value = true
    try {
      let data
      if (forceRefresh) {
        data = await dataService.value.forceRefresh()
      } else {
        data = await dataService.value.fetchAll()
      }
      
      // Ensure every exercise has the isCustom property for consistent filtering
      exercises.value = data.map((ex) => ({ ...ex, isCustom: ex.isCustom || false }))
      lastFetchTime.value = new Date().toISOString()
      
    } catch (error) {
      console.error('Failed to fetch exercises:', error)
      // 只有在非初始化期間才顯示錯誤訊息
      if (!suppressErrorToast) {
        // 檢查是否為網路連線問題
        if (!navigator.onLine) {
          toast.warning('網路連線中斷，正在使用離線數據')
        } else if (error.response?.status === 401) {
          toast.error('登入已過期，請重新登入')
        } else {
          toast.error('無法載入訓練動作')
        }
      }
      // 即使出錯也嘗試從本地獲取數據
      try {
        const localData = await dataService.value.fetchAll()
        exercises.value = localData.map((ex) => ({ ...ex, isCustom: ex.isCustom || false }))
      } catch (localError) {
        console.error('Failed to fetch local exercises:', localError)
      }
    } finally {
      isLoading.value = false
    }
  }

  async function addExercise(name, muscleGroup) {
    try {
      const newExercise = await dataService.value.add({
        name,
        muscleGroup,
        isCustom: true
      })
      
      exercises.value.push(newExercise)
      toast.success(`動作 "${name}" 已新增！`)
      return newExercise
    } catch (error) {
      toast.error(error.response?.data?.message || `新增動作 "${name}" 失敗`)
      throw error
    }
  }

  async function deleteExercise(id) {
    const templateStore = useTemplateStore()
    const exerciseToDelete = exercises.value.find((ex) => ex._id === id)
    if (!exerciseToDelete) {
      toast.error('找不到要刪除的動作')
      return
    }

    try {
      await dataService.value.delete(id)
      
      // 從本地狀態中移除
      exercises.value = exercises.value.filter((ex) => ex._id !== id)
      
      // 從所有範本中移除此動作
      await templateStore.removeExerciseFromAllTemplates(id)
      
      // 如果不是訪客模式，重新獲取範本以確保同步
      if (!authStore.isGuest) {
        await templateStore.fetchTemplates()
      }
      
      toast.success(`動作 "${exerciseToDelete.name}" 已成功刪除。`)
    } catch (error) {
      toast.error(error.response?.data?.message || '刪除動作失敗')
      throw error
    }
  }

  return {
    allExercises,
    groupedAllExercises,
    groupedCustomExercises,
    isLoading,
    lastFetchTime,
    fetchExercises,
    addExercise,
    deleteExercise,
  }
})
