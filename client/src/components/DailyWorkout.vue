<template>
  <div>
    <!-- Loading State -->
    <div v-if="!isCheckComplete" class="text-center text-medium-emphasis py-10">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <p class="mt-4">正在檢查今日訓練狀態...</p>
    </div>

    <!-- Completed Workout Summary -->
    <div v-else-if="completedWorkoutForToday">
      <WorkoutSummary :workout="completedWorkoutForToday" :previous-workout="previousWorkout" @start-extra="startExtraWorkout" />
    </div>

    <!-- Active Workout Interface -->
    <div v-else>
      <!-- Enhanced Rest Timer -->
      <EnhancedRestTimer :is-resting="isResting" :rest-time-remaining="restTimeRemaining" :initial-rest-time="initialRestTime" :current-exercise-name="currentExercise?.name || '訓練動作'" @add-rest-time="addRestTime" @stop-rest-timer="stopRestTimer" @reset-rest-timer="resetRestTimer" @pause-rest-timer="pauseRestTimer" />

      <Form ref="formRef" @submit="confirmSubmission" :initial-values="getInitialValues">
        <Field name="workoutName" type="hidden" />
        <Field name="templateId" type="hidden" />
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
              <v-row justify="center" class="mb-4 mt-12">
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
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, watch, nextTick, onMounted, defineExpose } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useWorkoutStore } from '@/stores/workout'
import { useExerciseStore } from '@/stores/exercise'
import { useModalStore } from '@/stores/modal'
import { useToast } from 'vue-toastification'
import { Form, Field, FieldArray } from 'vee-validate'
import { useRouter } from 'vue-router'
import WorkoutSetRow from './WorkoutSetRow.vue'
import WorkoutSummary from './WorkoutSummary.vue'
import EnhancedRestTimer from './EnhancedRestTimer.vue'

const templateStore = useTemplateStore()
const workoutStore = useWorkoutStore()
const exerciseStore = useExerciseStore()
const modalStore = useModalStore()
const toast = useToast()
const router = useRouter()

const WORKOUT_IN_PROGRESS_KEY = 'workoutInProgress'

const formRef = ref(null)
const isCheckComplete = ref(false)
const currentExerciseIndex = ref(0)
const isResting = ref(false)
const restTimeRemaining = ref(0)
const restTimerInterval = ref(null)
const restStartTime = ref(null)
const restEndTime = ref(null)
const lastCompletedSetInfo = ref(null)
const initialRestTime = ref(90)
const isRestPaused = ref(false)
const exercisePushFn = ref(null)
const exerciseInsertFn = ref(null)
const completedWorkoutForToday = ref(null)
const previousWorkout = ref(null)

const getInitialValues = ref({ workoutName: '自訂訓練', exercises: [], templateId: null })

let restoredFromStorage = false

const savedStateJSON = localStorage.getItem(WORKOUT_IN_PROGRESS_KEY)
if (savedStateJSON) {
  try {
    const savedState = JSON.parse(savedStateJSON)
    const hasCompletedSet = savedState.exercises?.some((ex) => ex.sets?.some((s) => s.isCompleted))

    if (savedState && savedState.exercises && savedState.exercises.length > 0 && hasCompletedSet) {
      getInitialValues.value = {
        workoutName: savedState.workoutName || '恢復的訓練',
        exercises: savedState.exercises,
        templateId: savedState.templateId || null,
      }
      currentExerciseIndex.value = savedState.currentExerciseIndex || 0
      lastCompletedSetInfo.value = savedState.lastCompletedSetInfo || null
      restoredFromStorage = true
      toast.info('已從上次中斷處恢復訓練！')

      if (savedState.restEndTime) {
        const now = Date.now()
        const newRemainingTime = Math.round((savedState.restEndTime - now) / 1000)

        if (newRemainingTime > 0) {
          restStartTime.value = savedState.restStartTime
          lastCompletedSetInfo.value = savedState.lastCompletedSetInfo

          // 恢復初始休息時間和暫停狀態
          if (savedState.initialRestTime) {
            initialRestTime.value = savedState.initialRestTime
          }
          if (savedState.isRestPaused !== undefined) {
            isRestPaused.value = savedState.isRestPaused
          }

          startRestTimer(newRemainingTime)
        }
      }
    } else {
      localStorage.removeItem(WORKOUT_IN_PROGRESS_KEY)
    }
  } catch (error) {
    console.error('無法恢復訓練狀態:', error)
    localStorage.removeItem(WORKOUT_IN_PROGRESS_KEY)
  }
}

const allExercises = computed(() => exerciseStore.allExercises)

const dayMap = {
  星期日: 'sunday',
  星期一: 'monday',
  星期二: 'tuesday',
  星期三: 'wednesday',
  星期四: 'thursday',
  星期五: 'friday',
  星期六: 'saturday',
}
const daysOfWeek = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const currentExercises = computed(() => formRef.value?.values?.exercises || [])
const currentExercise = computed(() => currentExercises.value[currentExerciseIndex.value] || null)

const allSetsCompleted = computed(() => {
  if (!currentExercise.value || !currentExercise.value.sets) return false
  return currentExercise.value.sets.every((set) => set.isCompleted)
})

const saveState = () => {
  if (completedWorkoutForToday.value) return
  if (!formRef.value || !formRef.value.values.exercises || formRef.value.values.exercises.length === 0) {
    localStorage.removeItem(WORKOUT_IN_PROGRESS_KEY)
    return
  }

  const formValues = formRef.value.values
  const hasCompletedSet = formValues.exercises.some((ex) => ex.sets?.some((s) => s.isCompleted))

  if (!hasCompletedSet) {
    localStorage.removeItem(WORKOUT_IN_PROGRESS_KEY)
    return
  }

  const stateToSave = {
    workoutName: formValues.workoutName,
    exercises: formValues.exercises,
    templateId: formValues.templateId,
    currentExerciseIndex: currentExerciseIndex.value,
    restStartTime: restStartTime.value,
    restEndTime: restEndTime.value,
    lastCompletedSetInfo: lastCompletedSetInfo.value,
    initialRestTime: initialRestTime.value,
    isRestPaused: isRestPaused.value,
    restTimeRemaining: restTimeRemaining.value,
  }
  localStorage.setItem(WORKOUT_IN_PROGRESS_KEY, JSON.stringify(stateToSave))
}

watch(
  () => currentExercises.value,
  () => {
    if (isCheckComplete.value) {
      saveState()
    }
  },
  { deep: true },
)

watch(isResting, (isCurrentlyResting) => {
  if (isCurrentlyResting) {
    // Save state as soon as rest begins
    saveState()
  }
})

watch(
  () => modalStore.selectedExerciseId,
  (newExerciseId) => {
    if (newExerciseId) {
      const exercise = allExercises.value.find((ex) => ex._id === newExerciseId)
      if (!exercise) return

      const newExercisePayload = {
        exerciseId: exercise._id,
        name: exercise.name,
        restTime: 60,
        sets: [{ reps: 10, weight: 10, isCompleted: false, actualRestTime: null }],
      }

      const exercises = formRef.value?.values?.exercises || []
      if (exercises.length === 0) {
        exercisePushFn.value?.(newExercisePayload)
      } else {
        exerciseInsertFn.value?.(currentExerciseIndex.value + 1, newExercisePayload)
      }
      toast.success(`動作 "${exercise.name}" 已新增！`)
      modalStore.selectedExerciseId = null
    }
  },
)

const initializeFormForNewWorkout = () => {
  const today = new Date()
  const dayName = daysOfWeek[today.getDay()]
  const englishDayKey = dayMap[dayName]

  let initialExercises = []
  let workoutNameParts = []
  let templateIdForSync = null

  const scheduledTemplates = templateStore.schedule[englishDayKey] || []
  scheduledTemplates.forEach((template) => {
    if (template && template.exercises) {
      if (!templateIdForSync) templateIdForSync = template._id
      workoutNameParts.push(template.name)
      template.exercises.forEach((ex) => {
        const fullExercise = allExercises.value.find((e) => e.name === ex.name)
        if (fullExercise) {
          initialExercises.push({
            exerciseId: fullExercise._id,
            name: ex.name,
            restTime: ex.restTime ?? 60,
            sets: (ex.sets || []).map((set) => ({
              reps: set.reps || '',
              weight: set.weight || '',
              isCompleted: false,
              actualRestTime: null,
            })),
          })
        }
      })
    }
  })

  const newInitialValues = {
    workoutName: workoutNameParts.join(' + ') || '自訂訓練',
    exercises: initialExercises,
    templateId: templateIdForSync,
  }

  getInitialValues.value = newInitialValues

  nextTick(() => {
    formRef.value?.resetForm({ values: newInitialValues })
  })
}

const runInitialCheck = async () => {
  isCheckComplete.value = false
  completedWorkoutForToday.value = null
  previousWorkout.value = null

  const today = new Date()
  const dayName = daysOfWeek[today.getDay()]
  const englishDayKey = dayMap[dayName]
  const workoutNameParts = (templateStore.schedule[englishDayKey] || []).map((t) => t.name)
  const expectedWorkoutName = workoutNameParts.join(' + ')

  if (expectedWorkoutName) {
    // Check if we already have workout data, if not fetch it
    if (!workoutStore.allWorkouts || workoutStore.allWorkouts.length === 0) {
      await workoutStore.fetchAllWorkouts()
    }
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const todaysCompleted = workoutStore.allWorkouts.find((w) => new Date(w.createdAt) >= todayStart && w.name === expectedWorkoutName)

    if (todaysCompleted) {
      completedWorkoutForToday.value = todaysCompleted
      // Find the previous workout
      previousWorkout.value = workoutStore.allWorkouts.find((w) => w._id !== todaysCompleted._id && w.name === expectedWorkoutName) || null
      isCheckComplete.value = true
      return
    }
  }

  initializeFormForNewWorkout()
  isCheckComplete.value = true
}

onMounted(() => {
  if (restoredFromStorage) {
    isCheckComplete.value = true
  } else {
    runInitialCheck()
  }
})

watch(
  () => templateStore.schedule,
  () => {
    if (!restoredFromStorage && !completedWorkoutForToday.value) {
      runInitialCheck()
    }
  },
  { deep: true },
)

function stopRestTimer(recordTime = true) {
  clearInterval(restTimerInterval.value)
  isResting.value = false
  if (recordTime && lastCompletedSetInfo.value && restStartTime.value) {
    const elapsedSeconds = Math.round((Date.now() - restStartTime.value) / 1000)
    const { exIndex, setIndex } = lastCompletedSetInfo.value
    formRef.value?.setFieldValue(`exercises[${exIndex}].sets[${setIndex}].actualRestTime`, elapsedSeconds)
  }
  // 無論如何都清空 start time
  restStartTime.value = null
  restEndTime.value = null // Clear end time
}

onUnmounted(stopRestTimer)

function completeSet(exIndex, setIndex) {
  formRef.value?.setFieldValue(`exercises[${exIndex}].sets[${setIndex}].isCompleted`, true)
  lastCompletedSetInfo.value = { exIndex, setIndex }
  const exercise = currentExercises.value[exIndex]
  startRestTimer(exercise.restTime)
}

function startRestTimer(duration) {
  stopRestTimer(false)
  isResting.value = true
  restTimeRemaining.value = duration
  initialRestTime.value = duration
  isRestPaused.value = false

  // 如果 restStartTime 還沒有被設定 (表示這不是一次恢復操作)，才設定為現在
  if (!restStartTime.value) {
    restStartTime.value = Date.now()
  }

  restEndTime.value = restStartTime.value + duration * 1000 // Calculate end time

  restTimerInterval.value = setInterval(() => {
    if (!isRestPaused.value) {
      restTimeRemaining.value--
      if (restTimeRemaining.value <= 0) {
        stopRestTimer()
      }
    }
  }, 1000)
}

function addRestTime(seconds) {
  restTimeRemaining.value += seconds
  if (restEndTime.value) {
    restEndTime.value += seconds * 1000
  }
  // 確保時間不會變成負數
  if (restTimeRemaining.value < 0) {
    restTimeRemaining.value = 0
  }
  // 如果增加時間超過了初始時間，更新初始時間基準
  if (restTimeRemaining.value > initialRestTime.value) {
    initialRestTime.value = restTimeRemaining.value
  }

  // 立即保存狀態，包含更新的休息時間
  saveState()
}

// 重置休息計時器到初始時間
function resetRestTimer() {
  restTimeRemaining.value = initialRestTime.value
  if (restStartTime.value) {
    restEndTime.value = restStartTime.value + initialRestTime.value * 1000
  }

  // 保存重置後的狀態
  saveState()
}

// 暫停/繼續休息計時器
function pauseRestTimer(paused) {
  isRestPaused.value = paused
  if (paused) {
    // 暫停時更新結束時間
    const remainingMs = restTimeRemaining.value * 1000
    restEndTime.value = Date.now() + remainingMs
  } else {
    // 繼續時重新計算開始時間
    restStartTime.value = Date.now() - (initialRestTime.value - restTimeRemaining.value) * 1000
    restEndTime.value = Date.now() + restTimeRemaining.value * 1000
  }

  // 保存暫停/繼續狀態
  saveState()
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
    const totalExercises = currentExercises.value.length
    const currentIndex = currentExerciseIndex.value

    // 移除動作
    remove(currentIndex)

    // 防呆邏輯：調整當前動作索引
    if (totalExercises <= 1) {
      // 如果這是最後一個動作，重置索引
      currentExerciseIndex.value = 0
    } else if (currentIndex >= totalExercises - 1) {
      // 如果移除的是最後一個動作，回到前一個
      currentExerciseIndex.value = Math.max(0, currentIndex - 1)
    }
    // 如果移除的是中間的動作，索引保持不變（因為後面的動作會前移）

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
      const fullExercise = allExercises.value.find((ex) => ex.name === exercise.name)
      if (!fullExercise) return null
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
      return validSets.length > 0 ? { ...exercise, exerciseId: fullExercise._id, sets: validSets } : null
    })
    .filter(Boolean)

  if (processedExercises.length === 0) {
    toast.warning('沒有有效的已完成訓練組可儲存。')
    return
  }

  const newWorkout = { name: workoutName, exercises: processedExercises, templateId: values.templateId }

  try {
    await workoutStore.addWorkout(newWorkout)
    // toast.success(`訓練 "${workoutName}" 已成功儲存！`)
    localStorage.removeItem(WORKOUT_IN_PROGRESS_KEY)
    await runInitialCheck()
  } catch (error) {
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
  modalStore.showConfirmation('丟棄進度', '確定要丟棄所有未儲存的進度，並重新載入今日的預定訓練嗎？此操作無法復原。', () => {
    stopRestTimer(false)
    localStorage.removeItem(WORKOUT_IN_PROGRESS_KEY)
    restoredFromStorage = false
    currentExerciseIndex.value = 0
    runInitialCheck()
    toast.info('訓練進度已丟棄。')
  })
}

const startExtraWorkout = () => {
  completedWorkoutForToday.value = null
  previousWorkout.value = null
  restoredFromStorage = false
  localStorage.removeItem(WORKOUT_IN_PROGRESS_KEY)
  currentExerciseIndex.value = 0

  const extraWorkoutValues = { workoutName: '額外訓練', exercises: [], templateId: null }
  getInitialValues.value = extraWorkoutValues

  nextTick(() => {
    formRef.value?.resetForm({ values: extraWorkoutValues })
  })
}

const isWorkoutActive = computed(() => isCheckComplete.value && !completedWorkoutForToday.value)

defineExpose({
  discardWorkout,
  isWorkoutActive,
  currentExercises,
})
</script>
