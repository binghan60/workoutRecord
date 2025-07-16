import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { useUiStore } from './ui'

const toast = useToast()

// 模擬 API 延遲的輔助函式
const fakeApiCall = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

export const useExerciseStore = defineStore('exercise', () => {
  const uiStore = useUiStore()
  // 內建的預設動作
  const defaultExercises = ref([
    { id: 'de-1', name: '臥推 (Bench Press)', muscleGroup: '胸部', isCustom: false },
    { id: 'de-2', name: '深蹲 (Squat)', muscleGroup: '腿部', isCustom: false },
    { id: 'de-3', name: '硬舉 (Deadlift)', muscleGroup: '背部', isCustom: false },
    { id: 'de-4', name: '肩推 (Overhead Press)', muscleGroup: '肩部', isCustom: false },
    { id: 'de-5', name: '引體向上 (Pull-up)', muscleGroup: '背部', isCustom: false },
    { id: 'de-6', name: '划船 (Row)', muscleGroup: '背部', isCustom: false },
    { id: 'de-7', name: '二頭彎舉 (Bicep Curl)', muscleGroup: '手臂', isCustom: false },
    { id: 'de-8', name: '三頭下壓 (Tricep Pushdown)', muscleGroup: '手臂', isCustom: false },
  ])

  // 從 localStorage 讀取自訂動作
  const customExercises = ref(JSON.parse(localStorage.getItem('customExercises')) || [])

  // 監聽自訂動作的變化，並存回 localStorage
  watch(
    customExercises,
    (newCustomExercises) => {
      localStorage.setItem('customExercises', JSON.stringify(newCustomExercises))
    },
    { deep: true },
  )

  // 合併內建與自訂動作
  const allExercises = computed(() => {
    const combined = [...defaultExercises.value, ...customExercises.value]
    // 移除寫死的 'zh-Hant'，讓瀏覽器自動使用預設語言排序
    return combined.sort((a, b) => a.name.localeCompare(b.name))
  })

  // 將動作按部位分組
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

  // 新增自訂動作
  async function addExercise(name, muscleGroup) {
    if (allExercises.value.some((ex) => ex.name.toLowerCase() === name.toLowerCase())) {
      toast.error(`動作 "${name}" 已經存在！`)
      return
    }

    await uiStore.withLoading(async () => {
      await fakeApiCall()
      customExercises.value.push({
        id: `ce-${Date.now()}`,
        name: name,
        muscleGroup: muscleGroup,
        isCustom: true,
      })
      toast.success(`動作 "${name}" 已新增！`)
    })
  }

  // 刪除自訂動作
  async function deleteExercise(id) {
    await uiStore.withLoading(async () => {
      await fakeApiCall()
      const index = customExercises.value.findIndex((ex) => ex.id === id)
      if (index !== -1) {
        const deletedExerciseName = customExercises.value[index].name
        customExercises.value.splice(index, 1)
        toast.success(`動作 "${deletedExerciseName}" 已刪除！`)
      }
    })
  }

  return { allExercises, groupedExercises, addExercise, deleteExercise }
})
