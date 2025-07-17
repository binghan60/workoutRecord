import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useUiStore } from './ui'

const toast = useToast()

// 模擬 API 延遲的輔助函式
const fakeApiCall = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

export const useWorkoutStore = defineStore('workout', () => {
  const uiStore = useUiStore()
  const workouts = ref(JSON.parse(localStorage.getItem('workouts')) || [])
  const currentPage = ref(1)
  const itemsPerPage = ref(5)

  watch(
    workouts,
    (newWorkouts) => {
      localStorage.setItem('workouts', JSON.stringify(newWorkouts))
      // 如果刪除導致目前頁面沒有資料，則回到上一頁
      if (paginatedWorkouts.value.length === 0 && currentPage.value > 1) {
        currentPage.value--
      }
    },
    { deep: true },
  )

  const totalPages = computed(() => {
    return Math.ceil(workouts.value.length / itemsPerPage.value)
  })

  const paginatedWorkouts = computed(() => {
    const startIndex = (currentPage.value - 1) * itemsPerPage.value
    const endIndex = startIndex + itemsPerPage.value
    return workouts.value.slice(startIndex, endIndex)
  })

  async function addWorkout(workout) {
    await uiStore.withLoading(async () => {
      await fakeApiCall()
      workouts.value.unshift({ ...workout, id: Date.now(), createdAt: new Date().toISOString() })
      // 新增後跳到第一頁
      currentPage.value = 1
    })
  }

  async function deleteWorkout(workoutId) {
    await uiStore.withLoading(async () => {
      await fakeApiCall()
      const index = workouts.value.findIndex((w) => w.id === workoutId)
      if (index !== -1) {
        const workoutName = workouts.value[index].name
        workouts.value.splice(index, 1)
        toast.success(`訓練紀錄 "${workoutName}" 已刪除。`)
      }
    })
  }

  function goToPage(page) {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  /**
   * 尋找上週同一個訓練的紀錄
   * @param {string} workoutName - 訓練課表的名稱
   * @returns {object | null} - 上週的訓練紀錄，或 null
   */
  function findLastWeekWorkout(workoutName) {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    // 尋找介於 6 到 8 天前的紀錄，給予一點彈性
    const lowerBound = new Date(oneWeekAgo)
    lowerBound.setDate(lowerBound.getDate() - 1)
    const upperBound = new Date(oneWeekAgo)
    upperBound.setDate(upperBound.getDate() + 1)

    const lastWorkout = workouts.value
      .filter((w) => {
        const workoutDate = new Date(w.createdAt)
        return w.name === workoutName && workoutDate >= lowerBound && workoutDate <= upperBound
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] // 取最新的

    return lastWorkout || null
  }

  return {
    workouts,
    currentPage,
    totalPages,
    paginatedWorkouts,
    addWorkout,
    deleteWorkout,
    goToPage,
    findLastWeekWorkout,
  }
})
