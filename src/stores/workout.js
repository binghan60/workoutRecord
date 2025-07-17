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

  return {
    workouts,
    currentPage,
    totalPages,
    paginatedWorkouts,
    addWorkout,
    deleteWorkout,
    goToPage,
  }
})
