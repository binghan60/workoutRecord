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
const todayWorkoutPlan = ref([])
const isWorkoutLoaded = ref(false)

// --- Task Flow State ---
const currentExerciseIndex = ref(0)
const isResting = ref(false)
const restTimeRemaining = ref(0)
const restTimerInterval = ref(null)
const restStartTime = ref(null)
const lastCompletedSetInfo = ref(null)

// --- Computed Properties ---
const allExercises = computed(() => exerciseStore.allExercises)
const daysOfWeek = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const currentExercises = computed(() => formRef.value?.values?.exercises || [])
const currentExercise = computed(() => currentExercises.value[currentExerciseIndex.value] || null)

const allSetsCompleted = computed(() => {
  if (!currentExercise.value || !currentExercise.value.sets) {
    return false
  }
  return currentExercise.value.sets.every((set) => set.isCompleted)
})

const isWatcherReady = ref(false)

// --- Watchers ---
watch(
  currentExercises,
  async (newExercises, oldExercises) => {
    if (!isWatcherReady.value) {
      if (newExercises.length > 0) {
        isWatcherReady.value = true
      }
      return
    }
    if (!oldExercises) return
    if (newExercises.length > oldExercises.length) {
      await nextTick()
      currentExerciseIndex.value = newExercises.length - 1
    } else if (newExercises.length < oldExercises.length) {
      await nextTick()
      if (currentExerciseIndex.value >= newExercises.length) {
        currentExerciseIndex.value = Math.max(0, newExercises.length - 1)
      }
    }
  },
  { deep: true },
)

watch(
  () => modalStore.selectedExerciseId,
  (newExerciseId) => {
    if (newExerciseId) {
      addExerciseToWorkout(newExerciseId)
      modalStore.selectedExerciseId = null // Reset after adding
    }
  },
)

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
          restTime: ex.restTime ?? 60,
          sets: Array.from({ length: ex.sets || 1 }, () => ({
            reps: ex.reps || '',
            weight: ex.weight || '',
            isCompleted: false,
            actualRestTime: null,
          })),
        })),
      })
    }
  })
  isWorkoutLoaded.value = true
}

const getInitialValues = computed(() => {
  const initialExercises = []
  todayWorkoutPlan.value.forEach((plan) => {
    plan.exercises.forEach((ex) => {
      initialExercises.push({
        name: ex.name,
        restTime: ex.restTime ?? 60,
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

  lastCompletedSetInfo.value = { exIndex, setIndex }
  const exercise = currentExercises.value[exIndex]
  startRestTimer(exercise.restTime)
}

const startRestTimer = (duration) => {
  stopRestTimer(false)
  isResting.value = true
  restTimeRemaining.value = duration
  restStartTime.value = Date.now()
  restTimerInterval.value = setInterval(() => {
    restTimeRemaining.value--
    if (restTimeRemaining.value <= 0) {
      stopRestTimer()
    }
  }, 1000)
}

const stopRestTimer = (recordTime = true) => {
  clearInterval(restTimerInterval.value)
  restTimerInterval.value = null
  isResting.value = false

  if (recordTime && lastCompletedSetInfo.value && restStartTime.value) {
    const elapsedSeconds = Math.round((Date.now() - restStartTime.value) / 1000)
    const { exIndex, setIndex } = lastCompletedSetInfo.value
    const fieldName = `exercises[${exIndex}].sets[${setIndex}].actualRestTime`
    formRef.value.setFieldValue(fieldName, elapsedSeconds)

    // BUG FIX: Reset context info ONLY after it has been used for recording.
    restStartTime.value = null
    lastCompletedSetInfo.value = null
  }
}

const addRestTime = (seconds) => {
  restTimeRemaining.value += seconds
}

const changeExercise = (direction) => {
  stopRestTimer(false)
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
const addExerciseToWorkout = (exerciseId) => {
  const exercise = allExercises.value.find((ex) => ex.id === exerciseId)
  if (exercise) {
    const exercisesField = formRef.value.values.exercises
    formRef.value.setFieldValue('exercises', [
      ...exercisesField,
      {
        name: exercise.name,
        restTime: 60,
        sets: [{ reps: 10, weight: 10, isCompleted: false, actualRestTime: null }],
      },
    ])
  }
}

const saveWorkout = (values) => {
  const workoutName = values.workoutName.trim()
  if (!workoutName) {
    toast.error('訓練課表名稱不能為空！')
    return
  }

  const processedExercises = values.exercises
    .map((exercise) => {
      const validSets = exercise.sets
        .filter((set) => {
          const reps = parseFloat(set.reps)
          const weight = parseFloat(set.weight)
          return set.isCompleted && !isNaN(reps) && reps > 0 && !isNaN(weight) && weight >= 0
        })
        .map((set) => ({
          reps: set.reps,
          weight: set.weight,
          isCompleted: set.isCompleted,
          actualRestTime: set.actualRestTime,
        }))

      if (validSets.length > 0) {
        return {
          name: exercise.name,
          restTime: exercise.restTime,
          sets: validSets,
        }
      }
      return null
    })
    .filter(Boolean)

  const newWorkout = {
    name: workoutName,
    exercises: processedExercises,
  }

  workoutStore.addWorkout(newWorkout)
  toast.success(`訓練 "${workoutName}" 已成功儲存！`)
  router.push('/history')
}

const confirmSubmission = (values) => {
  if (values.exercises.length === 0) {
    toast.warning('沒有可儲存的訓練。')
    return
  }

  const hasCompletedSet = values.exercises.some((exercise) =>
    exercise.sets.some((set) => {
      const reps = parseFloat(set.reps)
      const weight = parseFloat(set.weight)
      return set.isCompleted && !isNaN(reps) && reps > 0 && !isNaN(weight) && weight >= 0
    }),
  )

  if (!hasCompletedSet) {
    toast.warning('請至少「完成」一組有效的訓練 (包含次數和重量)。')
    return
  }

  modalStore.showConfirmation('完成並儲存訓練', '您確定要儲存本次的訓練紀錄嗎？', () => saveWorkout(values))
}
</script>

<template>
  <div class="flex flex-col">
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
        <button @click="stopRestTimer()" class="mt-8 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-md text-lg">跳過休息</button>
      </div>
    </div>

    <div v-if="!isWorkoutLoaded" class="text-center text-gray-400 py-10">
      <p>正在載入今日訓練計畫...</p>
    </div>

    <Form v-else ref="formRef" @submit="confirmSubmission" :initial-values="getInitialValues" class="flex flex-col">
      <Field name="workoutName" type="hidden" />

      <FieldArray name="exercises" v-slot="{ fields, push, remove }">
        <div v-if="fields.length === 0" class="flex-grow flex flex-col items-center justify-center text-center text-gray-400 p-4 min-h-[calc(100vh-65px)]">
          <p>今天沒有預定的訓練。</p>
          <p class="mt-2">請從下方選擇並新增您的第一個訓練動作！</p>
        </div>

        <!-- Main Content & Footer Wrapper -->
        <div v-else class="flex flex-col flex-grow">
          <!-- Scrollable Area -->
          <div class="overflow-y-auto">
            <div v-for="(field, index) in fields" :key="field.key" v-show="index === currentExerciseIndex" class="p-4">
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

              <!-- Action Buttons -->
              <div class="flex justify-center items-center gap-x-4 mb-4">
                <button @click="removeExercise(remove)" type="button" class="inline-flex items-center gap-x-1.5 text-sm text-red-500 hover:text-red-400 disabled:opacity-50" :disabled="fields.length === 0">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
                  移除此動作
                </button>
                <button @click="modalStore.showExerciseModal" type="button" class="inline-flex items-center gap-x-1.5 text-sm text-blue-500 hover:text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
                  新增動作
                </button>
              </div>

              <!-- Sets List -->
              <div class="space-y-3">
                <FieldArray :name="`exercises[${index}].sets`" v-slot="{ fields: setFields, push: pushSet, remove: removeSet }">
                  <WorkoutSetRow v-for="(setField, setIndex) in setFields" :key="setField.key" :set-index="setIndex" :ex-index="index" @complete-set="completeSet(index, setIndex)" />
                  <div class="space-y-3">
                    <div class="flex justify-center gap-x-4">
                      <button
                        @click="
                          () => {
                            const lastSet = setFields.length > 0 ? setFields[setFields.length - 1].value : { reps: 10, weight: 10 }
                            pushSet({ ...lastSet, isCompleted: false, actualRestTime: null })
                          }
                        "
                        type="button"
                        class="text-sm text-blue-400 hover:text-blue-300 bg-gray-700/80 px-4 py-2 rounded-md"
                      >
                        + 新增一組
                      </button>
                      <button @click="removeSet(setFields.length - 1)" :disabled="setFields.length <= 1" type="button" class="text-sm text-red-400 hover:text-red-300 disabled:opacity-50 bg-gray-700/80 px-4 py-2 rounded-md">- 移除最後一組</button>
                    </div>
                    <div v-if="allSetsCompleted && currentExerciseIndex != fields.length - 1" class="flex justify-center">
                      <button @click="changeExercise(1)" type="button" class="w-full max-w-md bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-md transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">下一動作</button>
                    </div>
                  </div>
                </FieldArray>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div v-if="fields.length > 0 && currentExerciseIndex === fields.length - 1" class="p-4 flex-shrink-0">
            <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 sm:py-4 rounded-md text-lg" :disabled="fields.length === 0">完成並儲存訓練</button>
          </div>
        </div>
      </FieldArray>
    </Form>
  </div>
</template>
