<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkoutStore } from '@/stores/workout'
import { useExerciseStore } from '@/stores/exercise'
import { useTemplateStore } from '@/stores/template'
import { useToast } from 'vue-toastification'
import { Form, Field, FieldArray, ErrorMessage } from 'vee-validate'

const toast = useToast()
const router = useRouter()
const workoutStore = useWorkoutStore()
const exerciseStore = useExerciseStore()
const templateStore = useTemplateStore()

const selectedTemplateId = ref(null)
const formRef = ref(null)

const initialValues = ref({
  workoutName: '',
  exercises: [{ name: '', sets: [{ reps: '', weight: '', fatigueLevel: '適中' }] }],
})

const fatigueOptions = [
  { level: '輕鬆', emoji: '😊' },
  { level: '適中', emoji: '🙂' },
  { level: '困難', emoji: '😥' },
  { level: '力竭', emoji: '🥵' },
]

watch(selectedTemplateId, (newId) => {
  if (!newId) {
    formRef.value.resetForm({
      values: {
        workoutName: '',
        exercises: [{ name: '', sets: [{ reps: '', weight: '', fatigueLevel: '適中' }] }],
      },
    })
    return
  }

  const template = templateStore.templates.find((t) => t.id === newId)
  if (template && formRef.value) {
    formRef.value.resetForm({
      values: {
        workoutName: template.name,
        exercises: template.exercises.map((exName) => ({
          name: exName,
          sets: [{ reps: '', weight: '', fatigueLevel: '適中' }],
        })),
      },
    })
  }
})

const handleSubmit = (values) => {
  const newWorkout = {
    name: values.workoutName,
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
  toast.success(`訓練 "${values.workoutName}" 已成功儲存！`)
  router.push('/history')
}
</script>

<template>
  <div class="bg-gray-800 p-6 rounded-lg shadow-xl mx-auto">
    <h1 class="text-3xl font-bold mb-6 text-center text-white">紀錄新的訓練</h1>

    <div class="mb-6">
      <label for="template-select" class="block text-sm font-medium text-gray-300 mb-2">從範本載入課表</label>
      <select id="template-select" v-model="selectedTemplateId" class="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option :value="null">-- 手動選擇或建立新課表 --</option>
        <option v-for="template in templateStore.templates" :key="template.id" :value="template.id">{{ template.name }}</option>
      </select>
    </div>

    <Form ref="formRef" @submit="handleSubmit" :initial-values="initialValues" class="space-y-6">
      <div class="relative pb-4">
        <label for="workoutName" class="block text-sm font-medium text-gray-300 mb-2">訓練課表名稱</label>
        <Field name="workoutName" id="workoutName" type="text" label="訓練課表名稱" rules="required" placeholder="例如：胸部訓練日" class="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" autocomplete="off" />
        <ErrorMessage name="workoutName" class="absolute bottom-0 left-0 text-red-400 text-xs" />
      </div>

      <FieldArray name="exercises" v-slot="{ fields, push, remove }">
        <div v-for="(field, exerciseIndex) in fields" :key="field.key" class="p-4 bg-gray-700 rounded-lg">
          <div class="flex justify-between items-start mb-4">
            <div class="flex-grow relative pb-4">
              <Field :name="`exercises[${exerciseIndex}].name`" as="select" label="動作" rules="required" class="w-full bg-gray-600 border border-gray-500 rounded-md p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option disabled value="">選擇一個動作</option>
                <option v-for="ex in exerciseStore.allExercises" :key="ex.id" :value="ex.name">{{ ex.name }} ({{ ex.muscleGroup }})</option>
              </Field>
              <ErrorMessage :name="`exercises[${exerciseIndex}].name`" class="absolute bottom-0 left-0 text-red-400 text-xs" />
            </div>
            <button type="button" @click="remove(exerciseIndex)" class="ml-4 text-red-500 hover:text-red-400 font-bold text-2xl">&times;</button>
          </div>

          <FieldArray :name="`exercises[${exerciseIndex}].sets`" v-slot="{ fields: setFields, push: pushSet, remove: removeSet }">
            <div class="space-y-5">
              <div v-for="(setField, setIndex) in setFields" :key="setField.key" class="grid grid-cols-12 gap-2 items-stretch">
                <span class="col-span-1 text-center text-gray-400 font-bold self-center">#{{ setIndex + 1 }}</span>
                <div class="col-span-3 relative">
                  <Field :name="`exercises[${exerciseIndex}].sets[${setIndex}].reps`" type="number" label="次數" rules="required|min_value:1" placeholder="次數" class="w-full bg-gray-600 border-gray-500 rounded-md p-2 text-white text-center h-full" />
                  <ErrorMessage :name="`exercises[${exerciseIndex}].sets[${setIndex}].reps`" class="absolute top-full left-0 right-0 text-center text-red-400 text-xs pt-1" />
                </div>
                <div class="col-span-3 relative">
                  <Field :name="`exercises[${exerciseIndex}].sets[${setIndex}].weight`" type="number" label="重量" rules="required|min_value:1" placeholder="重量(kg)" class="w-full bg-gray-600 border-gray-500 rounded-md p-2 text-white text-center h-full" />
                  <ErrorMessage :name="`exercises[${exerciseIndex}].sets[${setIndex}].weight`" class="absolute top-full left-0 right-0 text-center text-red-400 text-xs pt-1" />
                </div>
                <div class="col-span-4 flex justify-around items-center bg-gray-600 rounded-md">
                  <label v-for="option in fatigueOptions" :key="option.level" class="cursor-pointer rounded-md p-1">
                    <Field :name="`exercises[${exerciseIndex}].sets[${setIndex}].fatigueLevel`" type="radio" :value="option.level" class="sr-only" />
                    <span class="text-2xl transition-all duration-200" :class="field.value.sets[setIndex] && field.value.sets[setIndex].fatigueLevel === option.level ? 'opacity-100 scale-125' : 'opacity-40 hover:opacity-75'">
                      {{ option.emoji }}
                    </span>
                  </label>
                </div>
                <button type="button" @click="removeSet(setIndex)" class="col-span-1 text-gray-500 hover:text-red-500 text-xl self-center">&times;</button>
              </div>
              <div class="relative pb-4">
                <ErrorMessage :name="`exercises[${exerciseIndex}].sets`" class="absolute bottom-0 left-0 text-red-400 text-xs" />
              </div>
            </div>
            <button type="button" @click="pushSet({ reps: '', weight: '', fatigueLevel: '適中' })" class="mt-4 w-full bg-blue-800 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md text-sm">+ 新增一組</button>
          </FieldArray>
        </div>
        <div class="flex justify-between items-center pt-4">
          <button type="button" @click="push({ name: '', sets: [{ reps: '', weight: '', fatigueLevel: '適中' }] })" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-transform transform hover:scale-105">+ 增加一個動作</button>
          <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-md transition-transform transform hover:scale-105 text-lg">儲存訓練</button>
        </div>
      </FieldArray>
    </Form>
  </div>
</template>
