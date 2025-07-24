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
      <FieldArray name="exercises" v-slot="{ fields, remove, push }">
        <span v-show="false">{{ (exercisePushFn = push) && '' }}</span>
        <div v-if="fields.length === 0" class="d-flex flex-column align-center justify-center text-center text-medium-emphasis pa-4" style="min-height: 80vh">
          <p class="text-h6">今天沒有預定的訓練。</p>
          <p class="mt-2">請從下方選擇並新增您的第一個訓練動作！</p>
          <v-btn @click="modalStore.showExerciseModal" color="primary" class="mt-4">新增動作</v-btn>
        </div>

        <div v-else>
          <div v-for="(field, index) in fields" :key="field.key" v-show="index === currentExerciseIndex" class="pa-4">
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
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

const formRef = ref(null)
const todayWorkoutPlan = ref([])
const isWorkoutLoaded = ref(false)
const currentExerciseIndex = ref(0)
const isResting = ref(false)
const restTimeRemaining = ref(0)
const restTimerInterval = ref(null)
const restStartTime = ref(null)
const lastCompletedSetInfo = ref(null)
const exercisePushFn = ref(null)

const allExercises = computed(() => exerciseStore.allExercises)
const daysOfWeek = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const currentExercises = computed(() => formRef.value?.values?.exercises || [])
const currentExercise = computed(() => currentExercises.value[currentExerciseIndex.value] || null)

const allSetsCompleted = computed(() => {
  if (!currentExercise.value || !currentExercise.value.sets) return false
  return currentExercise.value.sets.every((set) => set.isCompleted)
})

const isWatcherReady = ref(false)

watch(
  currentExercises,
  async (newExercises, oldExercises) => {
    if (!isWatcherReady.value) {
      if (newExercises.length > 0) isWatcherReady.value = true
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
      modalStore.selectedExerciseId = null
    }
  },
)
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

onMounted(loadDailyWorkout)
onUnmounted(stopRestTimer)

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

const addExerciseToWorkout = (exerciseId) => {
  const exercise = allExercises.value.find((ex) => ex.id === exerciseId)
  if (exercise && exercisePushFn.value) {
    exercisePushFn.value({
      name: exercise.name,
      restTime: 60,
      sets: [{ reps: 10, weight: 10, isCompleted: false, actualRestTime: null }],
    })
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
        return { name: exercise.name, restTime: exercise.restTime, sets: validSets }
      }
      return null
    })
    .filter(Boolean)
  const newWorkout = { name: workoutName, exercises: processedExercises }
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
