<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useWorkoutStore } from '@/stores/workout'
import { useExerciseStore } from '@/stores/exercise'
import { useModalStore } from '@/stores/modal'
import { useToast } from 'vue-toastification'
import { Form, Field, FieldArray } from 'vee-validate'
import { useRouter } from 'vue-router'
import WorkoutSetRow from './WorkoutSetRow.vue'

// --- Stores and Services ---
const templateStore = useTemplateStore()
const workoutStore = useWorkoutStore()
const exerciseStore = useExerciseStore()
const modalStore = useModalStore()
const toast = useToast()
const router = useRouter()

// --- Component State ---
const formRef = ref(null)
// const formKey = ref(0) // REMOVED
const todayWorkoutPlan = ref([])
const isWorkoutLoaded = ref(false)
const selectedExerciseToAdd = ref('')

// --- Task Flow State ---
const currentExerciseIndex = ref(0)
const isResting = ref(false)
const restTimeRemaining = ref(0)
const restTimerInterval = ref(null)

// --- Computed Properties ---
const allExercises = computed(() => exerciseStore.allExercises)
const groupedExercises = computed(() => exerciseStore.groupedExercises)
const daysOfWeek = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const currentExercises = computed(() => formRef.value?.values?.exercises || [])
const currentExercise = computed(() => currentExercises.value[currentExerciseIndex.value] || null)

const isWatcherReady = ref(false)

// --- Watchers ---
watch(
  currentExercises,
  async (newExercises, oldExercises) => {
    // This watcher should only run after the initial values have been loaded.
    if (!isWatcherReady.value) {
      // The first time this runs with items, we consider the initial load complete.
      if (newExercises.length > 0) {
        isWatcherReady.value = true
      }
      return
    }

    // Ensure oldExercises is valid before comparing
    if (!oldExercises) return

    // --- Handle Exercise Addition ---
    if (newExercises.length > oldExercises.length) {
      await nextTick()
      currentExerciseIndex.value = newExercises.length - 1
    }
    // --- Handle Exercise Removal ---
    else if (newExercises.length < oldExercises.length) {
      await nextTick()
      if (currentExerciseIndex.value >= newExercises.length) {
        currentExerciseIndex.value = Math.max(0, newExercises.length - 1)
      }
    }
  },
  { deep: true },
) // Use deep watch to be more robust

// --- Lifecycle Hooks ---
onMounted(() => {
  loadDailyWorkout()
})

onUnmounted(() => {
  stopRestTimer()
})

// --- Data Loading ---
const loadDailyWorkout = () => {
  isWorkoutLoaded.value = false
  const today = new Date()
  const dayName = daysOfWeek[today.getDay()]
  const scheduledTemplateIds = templateStore.schedule[dayName] || []

  todayWorkoutPlan.value = []
  scheduledTemplateIds.forEach((templateId) => {
    const template = templateStore.getTemplateById(templateId)
    if (template) {
      todayWorkoutPlan.value.push({
        templateName: template.name,
        exercises: template.exercises.map((ex) => ({
          ...ex,
          restTime: ex.restTime || 60,
          sets: Array.from({ length: ex.sets || 1 }, () => ({
            reps: ex.reps || '',
            weight: ex.weight || '',
            isCompleted: false,
          })),
        })),
      })
    }
  })

  // formKey.value++ // REMOVED
  isWorkoutLoaded.value = true
}

const getInitialValues = computed(() => {
  const initialExercises = []
  todayWorkoutPlan.value.forEach((plan) => {
    plan.exercises.forEach((ex) => {
      initialExercises.push({
        name: ex.name,
        restTime: ex.restTime || 60,
        sets: ex.sets.map((set) => ({ ...set })),
      })
    })
  })

  const workoutName = todayWorkoutPlan.value.map((p) => p.templateName).join(' + ')

  return {
    workoutName: workoutName || '自訂訓練',
    exercises: initialExercises,
  }
})

// --- Task Flow Methods ---
const completeSet = (exIndex, setIndex) => {
  const fieldName = `exercises[${exIndex}].sets[${setIndex}].isCompleted`
  formRef.value.setFieldValue(fieldName, true)

  const exercise = currentExercises.value[exIndex]
  startRestTimer(exercise.restTime)
}

const startRestTimer = (duration) => {
  stopRestTimer()
  isResting.value = true
  restTimeRemaining.value = duration
  restTimerInterval.value = setInterval(() => {
    restTimeRemaining.value--
    if (restTimeRemaining.value <= 0) {
      stopRestTimer()
    }
  }, 1000)
}

const stopRestTimer = () => {
  clearInterval(restTimerInterval.value)
  restTimerInterval.value = null
  isResting.value = false
}

const addRestTime = (seconds) => {
  restTimeRemaining.value += seconds
}

const changeExercise = (direction) => {
  const newIndex = currentExerciseIndex.value + direction
  if (newIndex >= 0 && newIndex < currentExercises.value.length) {
    currentExerciseIndex.value = newIndex
  }
}

const removeExercise = (remove) => {
  const exerciseName = currentExercise.value?.name
  if (!exerciseName) return

  modalStore.showConfirmation('移除動作', `確定要從今日訓練移除「${exerciseName}」嗎？`, () => {
    remove(currentExerciseIndex.value)
    toast.info(`動作「${exerciseName}」已移除。`)
  })
}

// --- Form and Data Methods ---
const addExerciseToWorkout = (push) => {
  if (!selectedExerciseToAdd.value) {
    toast.warning('請先選擇一個動作！')
    return
  }
  const exercise = allExercises.value.find((ex) => ex.id === selectedExerciseToAdd.value)
  if (exercise) {
    push({
      name: exercise.name,
      restTime: 60,
      sets: [{ reps: 10, weight: 10, isCompleted: false }],
    })
    selectedExerciseToAdd.value = ''
  }
}

const handleSubmit = (values) => {
  const workoutName = values.workoutName.trim()
  if (!workoutName) {
    toast.error('訓練課表名稱不能為空！')
    return
  }

  // 嚴格過濾：只保留使用者點擊完成 (isCompleted) 且實際填寫過 (reps > 0 且 weight >= 0) 的組
  const newWorkout = {
    name: workoutName,
    exercises: values.exercises
      .map((ex) => {
        const completedSets = ex.sets.filter((s) => {
          const reps = parseFloat(s.reps)
          const weight = parseFloat(s.weight)
          return s.isCompleted && !isNaN(reps) && reps > 0 && !isNaN(weight) && weight >= 0
        })
        return { ...ex, sets: completedSets }
      })
      .filter((ex) => ex.sets.length > 0), // 只保留至少有一組有效訓練的動作
  }

  if (newWorkout.exercises.length === 0) {
    toast.warning('請至少「完成」一組有效的訓練 (包含次數和重量)。')
    return
  }

  workoutStore.addWorkout(newWorkout)
  toast.success(`訓練 "${workoutName}" 已成功儲存！`)
  router.push('/history')
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Rest Timer Overlay -->
    <div v-if="isResting" class="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
      <div class="text-center">
        <p class="text-4xl font-bold text-gray-400 mb-4">組間休息</p>
        <p class="text-9xl font-mono font-bold text-white">
          {{
            Math.floor(restTimeRemaining / 60)
              .toString()
              .padStart(2, '0')
          }}:{{ (restTimeRemaining % 60).toString().padStart(2, '0') }}
        </p>
        <div class="mt-6 flex justify-center gap-x-4">
          <button @click="addRestTime(10)" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">+10s</button>
          <button @click="addRestTime(30)" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">+30s</button>
        </div>
        <button @click="stopRestTimer" class="mt-8 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-md text-lg">跳過休息</button>
      </div>
    </div>

    <div v-if="!isWorkoutLoaded" class="text-center text-gray-400 py-10">
      <p>正在載入今日訓練計畫...</p>
    </div>

    <Form v-else ref="formRef" @submit="handleSubmit" :initial-values="getInitialValues" class="flex flex-col flex-grow">
      <Field name="workoutName" type="hidden" />

      <FieldArray name="exercises" v-slot="{ fields, push, remove }">
        <div v-if="fields.length === 0" class="flex-grow flex flex-col items-center justify-center text-center text-gray-400 p-4">
          <p>今天沒有預定的訓練。</p>
          <p class="mt-2">請從下方選擇並新增您的第一個訓練動作！</p>
        </div>

        <!-- Main Content -->
        <div v-else class="flex-grow overflow-y-auto relative">
          <!-- Use v-for and v-show to keep component state alive -->
          <div v-for="(field, index) in fields" :key="field.key" v-show="index === currentExerciseIndex" class="absolute top-0 left-0 w-full h-full p-4">
            <!-- Exercise Header -->
            <div class="flex items-center justify-between mb-4">
              <button @click="changeExercise(-1)" :disabled="currentExerciseIndex === 0" type="button" class="p-2 text-gray-400 hover:text-white disabled:opacity-30">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div class="text-center mx-2 flex-grow min-w-0">
                <h2 class="text-2xl sm:text-3xl font-bold text-white truncate">{{ field.value.name }}</h2>
                <p class="text-gray-400">{{ currentExerciseIndex + 1 }} / {{ fields.length }}</p>
              </div>
              <button @click="changeExercise(1)" :disabled="currentExerciseIndex === fields.length - 1" type="button" class="p-2 text-gray-400 hover:text-white disabled:opacity-30">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <!-- Delete Button -->
            <div class="text-center mb-4">
              <button @click="removeExercise(remove)" type="button" class="inline-flex items-center gap-x-1.5 text-sm text-red-500 hover:text-red-400 disabled:opacity-50" :disabled="fields.length === 0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
                移除此動作
              </button>
            </div>

            <!-- Sets List -->
            <div class="space-y-3">
              <FieldArray :name="`exercises[${index}].sets`" v-slot="{ fields: setFields, push: pushSet, remove: removeSet }">
                <WorkoutSetRow v-for="(setField, setIndex) in setFields" :key="setField.key" :set-index="setIndex" :ex-index="index" @complete-set="completeSet(index, setIndex)" />
                <div class="flex justify-center gap-x-4 pb-4">
                  <button
                    @click="
                      () => {
                        const lastSet = setFields.length > 0 ? setFields[setFields.length - 1].value : { reps: 10, weight: 10 }
                        pushSet({ ...lastSet, isCompleted: false })
                      }
                    "
                    type="button"
                    class="text-sm text-blue-400 hover:text-blue-300 bg-gray-700/80 px-4 py-2 rounded-md"
                  >
                    + 新增一組
                  </button>
                  <button @click="removeSet(setFields.length - 1)" :disabled="setFields.length <= 1" type="button" class="text-sm text-red-400 hover:text-red-300 disabled:opacity-50 bg-gray-700/80 px-4 py-2 rounded-md">- 移除最後一組</button>
                </div>
              </FieldArray>
            </div>
          </div>
        </div>

        <!-- Fixed Footer Actions -->
        <div class="flex-shrink-0 bg-gray-800/90 backdrop-blur-sm p-2 sm:p-4 border-t border-gray-700">
          <div class="flex items-center gap-2 mb-3">
            <select v-model="selectedExerciseToAdd" class="flex-grow bg-gray-700 border-gray-600 rounded-md p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option disabled value="">-- 手動新增動作 --</option>
              <optgroup v-for="(group, groupName) in groupedExercises" :key="groupName" :label="groupName">
                <option v-for="exercise in group" :key="exercise.id" :value="exercise.id">{{ exercise.name }}</option>
              </optgroup>
            </select>
            <button @click="addExerciseToWorkout(push)" type="button" class="bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-md aspect-square flex-shrink-0">+</button>
          </div>
          <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 sm:py-4 rounded-md text-lg" :disabled="fields.length === 0">完成並儲存訓練</button>
        </div>
      </FieldArray>
    </Form>
  </div>
</template>
