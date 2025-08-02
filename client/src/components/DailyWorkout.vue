<template>
  <div>
    <!-- Rest Timer Overlay -->
    <v-overlay v-model="isResting" class="d-flex align-center justify-center">
      <v-sheet color="black" class="pa-8 text-center" rounded="xl">
        <p class="text-h4 font-weight-bold text-grey-lighten-1 mb-4">組間休息</p>
        <p class="text-h1 font-weight-bold text-white" style="font-size: 6rem !important">
          {{
            Math.floor(restTimeRemaining / 60)
              .toString()
              .padStart(2, '0')
          }}:{{ (restTimeRemaining % 60).toString().padStart(2, '0') }}
        </p>
        <div class="mt-6">
          <v-btn @click="addRestTime(10)" color="primary" class="mx-2">+10s</v-btn>
          <v-btn @click="addRestTime(30)" color="primary" class="mx-2">+30s</v-btn>
        </div>
        <v-btn @click="stopRestTimer()" color="red" size="large" class="mt-8">跳過休息</v-btn>
      </v-sheet>
    </v-overlay>

    <div v-if="!isWorkoutLoaded" class="text-center text-medium-emphasis py-10">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <p class="mt-4">正在載入今日訓練計畫...</p>
    </div>

    <Form v-else ref="formRef" @submit="confirmSubmission" :initial-values="getInitialValues">
      <Field name="workoutName" type="hidden" />
      <FieldArray name="exercises" v-slot="{ fields, remove, push, insert }">
        <span v-show="false">{{ (exercisePushFn = push) && (exerciseInsertFn = insert) && '' }}</span>
        <div v-if="fields.length === 0" class="d-flex flex-column align-center justify-center text-center text-medium-emphasis pa-4" style="min-height: 80vh">
          <p class="text-h6">今天沒有預定的訓練。</p>
          <p class="mt-2">請從下方選擇並新增您的第一個訓練動作！</p>
          <v-btn @click="modalStore.showExerciseModal" color="primary" class="mt-4">新增動作</v-btn>
        </div>

        <div v-else>
          <div v-for="(field, index) in fields" :key="field.key" v-show="index === currentExerciseIndex" class="pa-4">
            <!-- Hidden fields to ensure data is tracked by VeeValidate -->
            <Field :name="`exercises[${index}].exerciseId`" type="hidden" />
            <Field :name="`exercises[${index}].name`" type="hidden" />
            <Field :name="`exercises[${index}].restTime`" type="hidden" />

            <!-- Exercise Header -->
            <v-row align="center" justify="space-between">
              <v-col cols="2" class="text-left">
                <v-btn icon variant="text" @click="changeExercise(-1)" :disabled="currentExerciseIndex === 0">
                  <v-icon size="x-large">mdi-chevron-left</v-icon>
                </v-btn>
              </v-col>
              <v-col cols="8" class="text-center px-0">
                <h2 class="text-h5 text-sm-h4 font-weight-bold truncate">{{ field.value.name }}</h2>
                <p class="text-caption">{{ currentExerciseIndex + 1 }} / {{ fields.length }}</p>
              </v-col>
              <v-col cols="2" class="text-right">
                <v-btn icon variant="text" @click="changeExercise(1)" :disabled="currentExerciseIndex === fields.length - 1">
                  <v-icon size="x-large">mdi-chevron-right</v-icon>
                </v-btn>
              </v-col>
            </v-row>

            <!-- Action Buttons -->
            <v-row justify="center" class="mb-4">
              <v-btn @click="removeExercise(remove)" variant="text" color="red" size="small" prepend-icon="mdi-delete-outline">移除此動作</v-btn>
              <v-btn @click="modalStore.showExerciseModal" variant="text" color="primary" size="small" prepend-icon="mdi-plus-box-outline">新增動作</v-btn>
            </v-row>

            <!-- Sets List -->
            <div class="space-y-3">
              <FieldArray :name="`exercises[${index}].sets`" v-slot="{ fields: setFields, push: pushSet, remove: removeSet }">
                <WorkoutSetRow v-for="(setField, setIndex) in setFields" :key="setField.key" :set-index="setIndex" :ex-index="index" @complete-set="completeSet(index, setIndex)" class="mb-2" />
                <v-row class="mt-4">
                  <v-col>
                    <v-btn
                      @click="
                        () => {
                          const lastSet = setFields.length > 0 ? setFields[setFields.length - 1].value : { reps: 10, weight: 10 }
                          pushSet({ ...lastSet, isCompleted: false, actualRestTime: null })
                        }
                      "
                      block
                      variant="tonal"
                      color="primary"
                      >新增一組</v-btn
                    >
                  </v-col>
                  <v-col>
                    <v-btn @click="removeSet(setFields.length - 1)" :disabled="setFields.length <= 1" block variant="tonal" color="red">移除最後一組</v-btn>
                  </v-col>
                </v-row>
                <div v-if="allSetsCompleted && currentExerciseIndex < fields.length - 1" class="mt-4">
                  <v-btn @click="changeExercise(1)" block color="green" size="large">下一動作</v-btn>
                </div>
              </FieldArray>
            </div>
          </div>

          <!-- Footer -->
          <div v-if="fields.length > 0 && currentExerciseIndex === fields.length - 1" class="pa-4 mt-4">
            <v-btn type="submit" block color="primary" size="x-large">完成並儲存訓練</v-btn>
          </div>
        </div>
      </FieldArray>
    </Form>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, watch, nextTick, watchEffect, onMounted, defineExpose } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useWorkoutStore } from '@/stores/workout'
import { useExerciseStore } from '@/stores/exercise'
import { useModalStore } from '@/stores/modal'
import { useToast } from 'vue-toastification'
import { Form, Field, FieldArray } from 'vee-validate'
import { useRouter } from 'vue-router'
import WorkoutSetRow from './WorkoutSetRow.vue'

const templateStore = useTemplateStore()
const workoutStore = useWorkoutStore()
const exerciseStore = useExerciseStore()
const modalStore = useModalStore()
const toast = useToast()
const router = useRouter()

const WORKOUT_IN_PROGRESS_KEY = 'workoutInProgress'

const formRef = ref(null)
const isWorkoutLoaded = ref(false)
const currentExerciseIndex = ref(0)
const isResting = ref(false)
const restTimeRemaining = ref(0)
const restTimerInterval = ref(null)
const restStartTime = ref(null)
const lastCompletedSetInfo = ref(null)
const exercisePushFn = ref(null)
const exerciseInsertFn = ref(null)

const getInitialValues = ref({ workoutName: '自訂訓練', exercises: [] })

// --- State Restoration ---
let restoredFromStorage = false
let stateToRestoreOnMount = null

const savedStateJSON = localStorage.getItem(WORKOUT_IN_PROGRESS_KEY)
if (savedStateJSON) {
  try {
    const savedState = JSON.parse(savedStateJSON)
    if (savedState && savedState.exercises && savedState.exercises.length > 0) {
      getInitialValues.value = {
        workoutName: savedState.workoutName || '恢復的訓練',
        exercises: savedState.exercises,
      }
      stateToRestoreOnMount = savedState
      isWorkoutLoaded.value = true
      restoredFromStorage = true
    }
  } catch (error) {
    console.error('無法恢復訓練狀態:', error)
    localStorage.removeItem(WORKOUT_IN_PROGRESS_KEY)
  }
}

onMounted(() => {
  if (restoredFromStorage && stateToRestoreOnMount) {
    nextTick(() => {
      currentExerciseIndex.value = stateToRestoreOnMount.currentExerciseIndex || 0
      lastCompletedSetInfo.value = stateToRestoreOnMount.lastCompletedSetInfo || null

      if (stateToRestoreOnMount.isResting && stateToRestoreOnMount.restTimeRemaining > 0) {
        const timePassed = stateToRestoreOnMount.restStartTime ? Math.floor((Date.now() - stateToRestoreOnMount.restStartTime) / 1000) : 0
        const newRemainingTime = stateToRestoreOnMount.restTimeRemaining - timePassed
        if (newRemainingTime > 0) {
          startRestTimer(newRemainingTime)
        }
      }
      toast.info('已從上次中斷處恢復訓練！')
    })
  }
})

const allExercises = computed(() => exerciseStore.allExercises)

const dayMap = {
  '星期日': 'sunday',
  '星期一': 'monday',
  '星期二': 'tuesday',
  '星期三': 'wednesday',
  '星期四': 'thursday',
  '星期五': 'friday',
  '星期六': 'saturday',
}
const daysOfWeek = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const currentExercises = computed(() => formRef.value?.values?.exercises || [])
const currentExercise = computed(() => currentExercises.value[currentExerciseIndex.value] || null)

const allSetsCompleted = computed(() => {
  if (!currentExercise.value || !currentExercise.value.sets) return false
  return currentExercise.value.sets.every((set) => set.isCompleted)
})

const isWatcherReady = ref(false)

// --- State Saving ---
const saveState = () => {
  if (!formRef.value || !formRef.value.values.exercises || formRef.value.values.exercises.length === 0) {
    localStorage.removeItem(WORKOUT_IN_PROGRESS_KEY)
    return
  }

  const stateToSave = {
    workoutName: formRef.value.values.workoutName,
    exercises: formRef.value.values.exercises,
    currentExerciseIndex: currentExerciseIndex.value,
    isResting: isResting.value,
    restTimeRemaining: restTimeRemaining.value,
    restStartTime: restStartTime.value,
    lastCompletedSetInfo: lastCompletedSetInfo.value,
  }
  localStorage.setItem(WORKOUT_IN_PROGRESS_KEY, JSON.stringify(stateToSave))
}

// Watch relevant state and save it
watch(
  () => [currentExercises.value, currentExerciseIndex.value, isResting.value, restTimeRemaining.value],
  () => {
    // Only start saving after the initial state is loaded and ready
    if (isWorkoutLoaded.value) {
      saveState()
    }
  },
  { deep: true },
)

// This is the CORRECT and DEBUGGED watcher for adding an exercise from the modal.
watch(
  () => modalStore.selectedExerciseId,
  async (newExerciseId) => {
    if (newExerciseId) {
      const exercise = allExercises.value.find((ex) => ex._id === newExerciseId)
      if (!exercise) return

      const newExercisePayload = {
        exerciseId: exercise._id,
        name: exercise.name,
        restTime: 60,
        sets: [{ reps: 10, weight: 10, isCompleted: false, actualRestTime: null }],
      }

      const currentExercises = formRef.value?.values?.exercises || []

      // Use push for the first exercise, insert for subsequent ones.
      if (currentExercises.length === 0) {
        if (exercisePushFn.value) {
          exercisePushFn.value(newExercisePayload)
          toast.success(`動作 "${exercise.name}" 已新增！`)
        } else {
          console.error('CRITICAL ERROR: exercisePushFn is not available.')
        }
      } else {
        if (exerciseInsertFn.value) {
          exerciseInsertFn.value(currentExerciseIndex.value + 1, newExercisePayload)
          toast.success(`動作 "${exercise.name}" 已新增！`)
        } else {
          console.error('CRITICAL ERROR: exerciseInsertFn is not available.')
        }
      }
    }
    // IMPORTANT: Reset the ID in the store to allow selecting the same exercise again.
    if (newExerciseId) {
      modalStore.selectedExerciseId = null
    }
  },
)

watch(
  currentExercises,
  async (newExercises, oldExercises) => {
    if (!isWatcherReady.value) {
      if (newExercises.length > 0) isWatcherReady.value = true
      return
    }
    if (!oldExercises) return

    // Only handle the case where an exercise is removed.
    if (newExercises.length < oldExercises.length) {
      await nextTick()
      if (currentExerciseIndex.value >= newExercises.length) {
        currentExerciseIndex.value = Math.max(0, newExercises.length - 1)
      }
    }
  },
  { deep: true },
)

watch(
  () => exerciseStore.allExercises,
  (newExerciseList, oldExerciseList) => {
    if (!formRef.value || !oldExerciseList || newExerciseList.length >= oldExerciseList.length) {
      return
    }

    const validExerciseIds = new Set(newExerciseList.map((ex) => ex._id))
    const currentExercises = formRef.value.values.exercises
    const updatedExercises = currentExercises.filter((ex) => validExerciseIds.has(ex.exerciseId))

    if (updatedExercises.length < currentExercises.length) {
      formRef.value.setFieldValue('exercises', updatedExercises)
      toast.info('今日訓練已自動更新，因為其中包含的動作已被刪除。')
    }
  },
  { deep: true },
)

// Watch for changes in templates and re-evaluate the initial workout if needed
watch(
  () => templateStore.templates,
  () => {
    // This logic re-runs the initial value calculation, effectively refreshing the workout
    // if a template that was part of today's schedule is deleted.
    if (!restoredFromStorage) {
      initializeWorkout()
    }
  },
  { deep: true },
)

const initializeWorkout = () => {
  isWorkoutLoaded.value = false
  const today = new Date()
  const dayName = daysOfWeek[today.getDay()]
  const englishDayKey = dayMap[dayName]

  const initialExercises = []
  let workoutNameParts = []
  const hasScheduleData =
    templateStore.schedule && Object.keys(templateStore.schedule).length > 0 && templateStore.templates.length > 0

  if (hasScheduleData) {
    const scheduledTemplates = templateStore.schedule[englishDayKey] || []
    scheduledTemplates.forEach((template) => {
      if (template && template.exercises) {
        workoutNameParts.push(template.name)
        template.exercises.forEach((ex) => {
          const fullExercise = allExercises.value.find((e) => e.name === ex.name)
          if (fullExercise) {
            initialExercises.push({
              exerciseId: fullExercise._id,
              name: ex.name,
              restTime: ex.restTime ?? 60,
              sets: Array.from({ length: ex.sets || 1 }, () => ({
                reps: ex.reps || '',
                weight: ex.weight || '',
                isCompleted: false,
                actualRestTime: null,
              })),
            })
          }
        })
      }
    })
  }

  const newInitialValues = {
    workoutName: workoutNameParts.join(' + ') || '自訂訓練',
    exercises: initialExercises,
  }

  getInitialValues.value = newInitialValues

  // Using nextTick to ensure the form component is ready before we try to reset it.
  // This is crucial when the component is being mounted or re-rendered.
  nextTick(() => {
    if (formRef.value) {
      formRef.value.resetForm({ values: newInitialValues })
    }
    isWorkoutLoaded.value = true
  })
}

// Use watchEffect to run the initialization logic if not restored from storage
watchEffect(() => {
  if (restoredFromStorage) return
  initializeWorkout()
})

const stopRestTimer = (recordTime = true) => {
  clearInterval(restTimerInterval.value)
  restTimerInterval.value = null
  isResting.value = false
  if (recordTime && lastCompletedSetInfo.value && restStartTime.value) {
    const elapsedSeconds = Math.round((Date.now() - restStartTime.value) / 1000)
    const { exIndex, setIndex } = lastCompletedSetInfo.value
    const fieldName = `exercises[${exIndex}].sets[${setIndex}].actualRestTime`
    formRef.value.setFieldValue(fieldName, elapsedSeconds)
    restStartTime.value = null
    lastCompletedSetInfo.value = null
  }
}

onUnmounted(stopRestTimer)

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
    if (restTimeRemaining.value <= 0) stopRestTimer()
  }, 1000)
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

const saveWorkout = async (values) => {
  const workoutName = values.workoutName.trim()
  if (!workoutName) {
    toast.error('訓練課表名稱不能為空！')
    return
  }

  const processedExercises = values.exercises
    .map((exercise) => {
      // Find the full exercise details from the store using the name
      const fullExercise = allExercises.value.find((ex) => ex.name === exercise.name)

      // If the exercise is not found in the store, we can't proceed with it.
      if (!fullExercise) {
        console.warn(`Exercise "${exercise.name}" not found in store, skipping.`)
        return null
      }

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
        // Construct the final object with the correct exerciseId from the store
        return {
          exerciseId: fullExercise._id, // Use the ID from the store
          name: exercise.name,
          restTime: exercise.restTime,
          sets: validSets,
        }
      }
      return null
    })
    .filter(Boolean)

  if (processedExercises.length === 0) {
    toast.warning('沒有有效的已完成訓練組可儲存。')
    return
  }

  const newWorkout = { name: workoutName, exercises: processedExercises }

  try {
    await workoutStore.addWorkout(newWorkout)
    toast.success(`訓練 "${workoutName}" 已成功儲存！`)
    localStorage.removeItem(WORKOUT_IN_PROGRESS_KEY)
    router.push('/history')
  } catch (error) {
    // Error is already handled by the store's toast
    console.error('Failed to save workout:', error)
  }
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

const discardWorkout = () => {
  modalStore.showConfirmation(
    '丟棄進度',
    '確定要丟棄所有未儲存的進度，並重新載入今日的預定訓練嗎？此操作無法復原。',
    () => {
      stopRestTimer(false)
      localStorage.removeItem(WORKOUT_IN_PROGRESS_KEY)
      restoredFromStorage = false
      currentExerciseIndex.value = 0
      lastCompletedSetInfo.value = null
      getInitialValues.value = { workoutName: '自訂訓練', exercises: [] } // Clear initial values before re-initializing
      initializeWorkout()
      toast.info('訓練進度已丟棄。')
    },
  )
}

defineExpose({
  discardWorkout,
})
</script>
