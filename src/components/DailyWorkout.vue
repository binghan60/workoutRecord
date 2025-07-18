<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useWorkoutStore } from '@/stores/workout'
import { useExerciseStore } from '@/stores/exercise'
import { useToast } from 'vue-toastification'
import { Form, Field, FieldArray, ErrorMessage } from 'vee-validate'
import { useRouter } from 'vue-router'

// --- Stores and Services ---
const templateStore = useTemplateStore()
const workoutStore = useWorkoutStore()
const exerciseStore = useExerciseStore()
const toast = useToast()
const router = useRouter()

// --- Component State ---
const formRef = ref(null)
const formKey = ref(0) // Key to force form re-initialization
const todayWorkoutPlan = ref([])
const lastWeekWorkoutData = ref(null)
const isWorkoutLoaded = ref(false)
const selectedExerciseToAdd = ref('')

// --- Task Flow State ---
const currentExerciseIndex = ref(0)
const currentSetIndex = ref(0)
const isResting = ref(false)
const restTimeRemaining = ref(0)
const restTimerInterval = ref(null)
const restStartInfo = ref(null)

// --- Computed Properties ---
const allExercises = computed(() => exerciseStore.allExercises)
const groupedExercises = computed(() => exerciseStore.groupedExercises)
const daysOfWeek = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const fatigueOptions = [
  { level: '輕鬆', emoji: '😊' },
  { level: '適中', emoji: '🙂' },
  { level: '困難', emoji: '😥' },
  { level: '力竭', emoji: '🥵' },
]
const currentExercises = computed(() => formRef.value?.values?.exercises || [])

const isFinalSet = computed(() => {
  const exercises = currentExercises.value
  if (!exercises || exercises.length === 0) return false

  const isLastExercise = currentExerciseIndex.value === exercises.length - 1
  if (!isLastExercise) return false

  const currentEx = exercises[currentExerciseIndex.value]
  if (!currentEx || !currentEx.sets) return false

  const isLastSet = currentSetIndex.value === currentEx.sets.length - 1
  return isLastSet
})

const totalSetsCount = computed(() => {
  const exercises = currentExercises.value;
  if (!exercises) return 0;
  return exercises.reduce((total, ex) => total + (ex.sets ? ex.sets.length : 0), 0);
});

const completedSetsCount = computed(() => {
  const exercises = currentExercises.value;
  if (!exercises || exercises.length === 0) return 0;

  let count = 0;
  for (let i = 0; i < currentExerciseIndex.value; i++) {
    count += exercises[i].sets ? exercises[i].sets.length : 0;
  }
  count += currentSetIndex.value;
  
  return count;
});

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
  scheduledTemplateIds.forEach(templateId => {
    const template = templateStore.getTemplateById(templateId)
    if (template) {
      todayWorkoutPlan.value.push({
        templateName: template.name,
        exercises: template.exercises.map(ex => ({
          ...ex,
          restTime: ex.restTime || 60,
          sets: Array.from({ length: ex.sets || 1 }, () => ({
            reps: ex.reps || '',
            weight: ex.weight || '',
            fatigueLevel: '適中',
            actualRestTime: null,
          })),
        })),
      })
    }
  })

  if (todayWorkoutPlan.value.length > 0) {
    const firstTemplateName = todayWorkoutPlan.value[0].templateName
    lastWeekWorkoutData.value = workoutStore.findLastWeekWorkout(firstTemplateName)
    if (lastWeekWorkoutData.value) {
      toast.info(`���載入上週 "${firstTemplateName}" 的訓練紀錄作為參考。`)
    }
  }
  
  // Force re-render of the form with new initial values
  formKey.value++
  isWorkoutLoaded.value = true
}

const getInitialValues = computed(() => {
  const initialExercises = []
  todayWorkoutPlan.value.forEach(plan => {
    plan.exercises.forEach(ex => {
      initialExercises.push({
        name: ex.name,
        restTime: ex.restTime || 60,
        sets: ex.sets.map(set => ({ ...set }))
      })
    })
  })
  
  const workoutName = todayWorkoutPlan.value.map(p => p.templateName).join(' + ')
  
  return {
    workoutName: workoutName || '自訂訓練',
    exercises: initialExercises
  }
})

// --- Task Flow Methods ---
const navigateTo = (exIndex, setIndex) => {
  const exercises = currentExercises.value;
  if (!exercises.length || !exercises[exIndex]) return;

  // Handle moving forward
  if (setIndex >= exercises[exIndex].sets.length) {
    if (exercises[exIndex + 1]) { // More exercises left
      currentExerciseIndex.value = exIndex + 1;
      currentSetIndex.value = 0;
    } else { // At the end of the last exercise
      currentExerciseIndex.value = exIndex;
      currentSetIndex.value = exercises[exIndex].sets.length - 1;
    }
    return;
  }

  // Handle moving backward
  if (setIndex < 0) {
    if (exIndex > 0) { // Previous exercises exist
      currentExerciseIndex.value = exIndex - 1;
      currentSetIndex.value = exercises[exIndex - 1].sets.length - 1;
    } else { // At the start of the first exercise
      currentExerciseIndex.value = 0;
      currentSetIndex.value = 0;
    }
    return;
  }
  
  // Normal navigation within the same exercise's sets
  currentExerciseIndex.value = exIndex;
  currentSetIndex.value = setIndex;
}

const completeSet = () => {
  const exIndex = currentExerciseIndex.value
  const setIndex = currentSetIndex.value
  const exercise = currentExercises.value[exIndex]
  
  stopRestTimer() // Stop any previous timer and record its rest time

  isResting.value = true
  const plannedRest = exercise.restTime
  restTimeRemaining.value = plannedRest
  restStartInfo.value = { 
    exIndex, 
    setIndex, 
    initialPlannedRest: plannedRest, 
    totalRestTaken: 0 
  }

  restTimerInterval.value = setInterval(() => {
    restTimeRemaining.value--
    if (restTimeRemaining.value <= 0) {
      stopRestTimer()
    }
  }, 1000)

  navigateTo(currentExerciseIndex.value, currentSetIndex.value + 1)
}

const stopRestTimer = () => {
  clearInterval(restTimerInterval.value)
  restTimerInterval.value = null

  if (isResting.value && restStartInfo.value) {
    const { exIndex, setIndex, initialPlannedRest, totalRestTaken } = restStartInfo.value
    const timeRemaining = restTimeRemaining.value > 0 ? restTimeRemaining.value : 0
    const actualRest = (initialPlannedRest - timeRemaining) + totalRestTaken
    
    // Update the form value directly
    const fieldName = `exercises[${exIndex}].sets[${setIndex}].actualRestTime`
    formRef.value.setFieldValue(fieldName, actualRest)
  }

  isResting.value = false
  restStartInfo.value = null
}

const addRestTime = (seconds) => {
  restTimeRemaining.value += seconds;
  if (restStartInfo.value) {
    restStartInfo.value.totalRestTaken += seconds;
  }
};

// --- Form and Data Methods ---
const getLastSetData = (exerciseName, setIndex) => {
  if (!lastWeekWorkoutData.value) return ''
  const lastExercise = lastWeekWorkoutData.value.exercises.find((ex) => ex.name === exerciseName)
  if (lastExercise && lastExercise.sets[setIndex]) {
    const { reps, weight } = lastExercise.sets[setIndex]
    return `上週: ${reps} 次 @ ${weight} kg`
  }
  return ''
}

const addExerciseToWorkout = (push) => {
  if (!selectedExerciseToAdd.value) {
    toast.warning('請先選擇一個動作！')
    return
  }
  const exercise = allExercises.value.find(ex => ex.id === selectedExerciseToAdd.value)
  if (exercise) {
    const newExercise = {
      name: exercise.name,
      restTime: 60,
      sets: [{ reps: '', weight: '', fatigueLevel: '適中' }]
    };
    push(newExercise);
    
    setTimeout(() => {
      navigateTo(currentExercises.value.length - 1, 0)
    }, 100);

    selectedExerciseToAdd.value = ''
  }
}

const handleSubmit = (values) => {
  const workoutName = values.workoutName.trim()
  if (!workoutName) {
    toast.error('訓練課表名稱不能為空！')
    return
  }

  const newWorkout = {
    name: workoutName,
    exercises: values.exercises
      .map((ex) => ({
        ...ex,
        sets: ex.sets.filter((s) => s.reps && s.weight),
      }))
      .filter((ex) => ex.sets.length > 0),
  }

  if (newWorkout.exercises.length === 0) {
    toast.warning('請至少完成一組有效的訓練 (包含次數和重量)。')
    return
  }

  workoutStore.addWorkout(newWorkout)
  toast.success(`訓練 "${workoutName}" 已成功儲存！`)
  router.push('/history')
}
</script>

<template>
  <div class="bg-gray-800 p-6 rounded-lg shadow-xl mx-auto relative overflow-hidden">
    <!-- Rest Timer Overlay -->
    <div v-if="isResting" class="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
      <div class="text-center">
        <p class="text-4xl font-bold text-gray-400 mb-4">組間休息</p>
        <p class="text-9xl font-mono font-bold text-white">{{ Math.floor(restTimeRemaining / 60).toString().padStart(2, '0') }}:{{ (restTimeRemaining % 60).toString().padStart(2, '0') }}</p>
        <div class="mt-6 flex justify-center gap-x-4">
          <button @click="addRestTime(10)" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">+10s</button>
          <button @click="addRestTime(30)" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">+30s</button>
        </div>
        <button @click="stopRestTimer" class="mt-8 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-md text-lg">
          跳過休息
        </button>
      </div>
    </div>

    <h1 class="text-3xl font-bold mb-4 text-center text-white">今日訓練</h1>

    <div v-if="!isWorkoutLoaded" class="text-center text-gray-400 py-10">
      <p>正在載入今日訓練計畫...</p>
    </div>

    <Form v-else :key="formKey" ref="formRef" @submit="handleSubmit" :initial-values="getInitialValues" v-slot="{ values }" class="space-y-6">
      <Field name="workoutName" type="hidden" />

      <FieldArray name="exercises" v-slot="{ fields, push, remove, move }">
        <div v-if="fields.length === 0" class="text-center text-gray-400 py-10 border-2 border-dashed border-gray-600 rounded-lg">
          <p>目前沒有訓練動作。</p>
          <p class="mt-2">請從下方選擇並新增您的第一個訓練動作！</p>
        </div>
        <div v-else>
          <!-- Progress Bar -->
          <div class="px-1 mb-4">
            <div class="flex justify-between mb-1">
              <span class="text-base font-medium text-blue-400">總組數進度</span>
              <span class="text-sm font-medium text-blue-400">{{ completedSetsCount }} / {{ totalSetsCount }}</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2.5">
              <div class="bg-gradient-to-r from-green-400 to-blue-500 h-2.5 rounded-full transition-all duration-500" :style="{ width: `${(completedSetsCount / totalSetsCount) * 100}%` }"></div>
            </div>
          </div>

          <!-- Current Exercise Card -->
          <div class="relative min-h-[300px]">
            <div v-for="(field, exIndex) in fields" :key="field.key" 
                 class="absolute w-full transition-opacity duration-300 ease-in-out"
                 :class="exIndex === currentExerciseIndex ? 'opacity-100' : 'opacity-0 -z-10'">
              <div class="p-4 bg-gray-700 rounded-lg">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="text-2xl font-bold text-white">{{ field.value.name }}</h3>
                  <div class="flex items-center gap-x-2">
                    <button @click="move(exIndex, exIndex - 1)" :disabled="exIndex === 0" type="button" class="p-1 text-gray-400 hover:text-white disabled:text-gray-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg></button>
                    <button @click="move(exIndex, exIndex + 1)" :disabled="exIndex === fields.length - 1" type="button" class="p-1 text-gray-400 hover:text-white disabled:text-gray-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg></button>
                    <button @click="remove(exIndex)" type="button" class="p-1 text-gray-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg></button>
                  </div>
                </div>

                <FieldArray :name="`exercises[${exIndex}].sets`" v-slot="{ fields: setFields, push: pushSet, remove: removeSet }">
                  <div class="text-center text-gray-300 mb-4">第 {{ currentSetIndex + 1 }} / {{ setFields.length }} 組</div>
                  <div v-for="(setField, setIndex) in setFields" :key="setField.key">
                    <div v-show="setIndex === currentSetIndex" class="grid grid-cols-12 gap-2 items-center">
                      <div class="col-span-3 relative">
                        <Field :name="`exercises[${exIndex}].sets[${setIndex}].reps`" type="number" placeholder="次數" class="w-full bg-gray-600 border-gray-500 rounded-md p-3 text-white text-center h-full text-lg" />
                        <span class="absolute top-full left-0 right-0 text-center text-yellow-400 text-xs pt-1">{{ getLastSetData(field.value.name, setIndex) }}</span>
                      </div>
                      <div class="col-span-3 relative">
                        <Field :name="`exercises[${exIndex}].sets[${setIndex}].weight`" type="number" placeholder="重量(kg)" class="w-full bg-gray-600 border-gray-500 rounded-md p-3 text-white text-center h-full text-lg" step="0.5" />
                      </div>
                      <div class="col-span-6 flex justify-around items-center bg-gray-600 rounded-md h-full">
                        <label v-for="option in fatigueOptions" :key="option.level" class="cursor-pointer rounded-md p-1">
                            <Field :name="`exercises[${exIndex}].sets[${setIndex}].fatigueLevel`" type="radio" :value="option.level" class="sr-only" />
                            <span class="text-3xl transition-all duration-200" :class="values.exercises[exIndex]?.sets[setIndex]?.fatigueLevel === option.level ? 'opacity-100 scale-125' : 'opacity-40 hover:opacity-75'">{{ option.emoji }}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="mt-6 flex justify-between">
                    <button @click="pushSet({ reps: '', weight: '', fatigueLevel: '適中' })" type="button" class="text-sm text-blue-400 hover:text-blue-300">+ 新增一組</button>
                    <button @click="removeSet(setFields.length - 1)" :disabled="setFields.length <= 1" type="button" class="text-sm text-red-400 hover:text-red-300 disabled:opacity-50">- 移除最後一組</button>
                  </div>
                </FieldArray>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation and Actions -->
        <div class="mt-8">
          <div class="flex items-center gap-4 mb-6">
            <select v-model="selectedExerciseToAdd" class="flex-grow bg-gray-600 border-gray-500 rounded-md p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option disabled value="">-- 臨時插入動作 --</option>
              <optgroup v-for="(group, groupName) in groupedExercises" :key="groupName" :label="groupName">
                <option v-for="exercise in group" :key="exercise.id" :value="exercise.id">{{ exercise.name }}</option>
              </optgroup>
            </select>
            <button @click="addExerciseToWorkout(push)" type="button" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-md">+</button>
          </div>

          <div class="flex justify-between items-center mb-4">
             <button @click="navigateTo(currentExerciseIndex, currentSetIndex - 1)" :disabled="currentExerciseIndex === 0 && currentSetIndex === 0" type="button" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md text-sm disabled:opacity-50">
              上一組
            </button>
             <button @click="navigateTo(currentExerciseIndex, currentSetIndex + 1)" :disabled="currentExerciseIndex === fields.length - 1 && currentSetIndex === fields[currentExerciseIndex]?.value.sets.length - 1" type="button" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md text-sm disabled:opacity-50">
              下一組
            </button>
          </div>

          <button v-if="isFinalSet" 
                  type="submit" 
                  class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-md text-xl"
                  :disabled="fields.length === 0">
            完成並儲存訓練
          </button>
          <button v-else 
                  @click="completeSet" 
                  type="button" 
                  class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-md text-xl"
                  :disabled="!values.exercises[currentExerciseIndex] || !values.exercises[currentExerciseIndex].sets[currentSetIndex] || !values.exercises[currentExerciseIndex].sets[currentSetIndex].reps || !values.exercises[currentExerciseIndex].sets[currentSetIndex].weight">
            完成此組 & 休息
          </button>
        </div>
      </FieldArray>
    </Form>
  </div>
</template>




