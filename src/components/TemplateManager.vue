<script setup>
import { ref } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useExerciseStore } from '@/stores/exercise'
import { useModalStore } from '@/stores/modal'
import { getMuscleGroupColor } from '@/utils/colorUtils'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { useToast } from 'vue-toastification'

const toast = useToast()
const templateStore = useTemplateStore()
const exerciseStore = useExerciseStore()
const modalStore = useModalStore()

const selectedExercises = ref([])

const handleAddTemplate = (values, { resetForm }) => {
  if (selectedExercises.value.length === 0) {
    toast.warning('請至少為課表選擇一個動作！')
    return
  }

  templateStore.addTemplate({
    name: values.templateName,
    exercises: selectedExercises.value,
  })

  // Reset form
  resetForm()
  selectedExercises.value = []
}

const confirmDeleteTemplate = (templateId, templateName) => {
  modalStore.showConfirmation(
    '確認刪除課表',
    `確定要刪除「${templateName}」這個課表範本嗎？`,
    () => {
      templateStore.deleteTemplate(templateId)
    }
  )
}
</script>

<template>
  <div class="mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
    <!-- 左側：建立新範本 -->
    <div class="bg-gray-800 p-6 rounded-lg shadow-xl">
      <h1 class="text-3xl font-bold mb-6 text-center text-white">建立新課表</h1>
      <Form @submit="handleAddTemplate" class="space-y-6">
        <div class="relative pb-4">
          <Field
            name="templateName"
            type="text"
            label="課表範本名稱"
            rules="required"
            placeholder="課表範本名稱 (例如: 胸推日)"
            class="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <ErrorMessage name="templateName" class="absolute bottom-0 left-0 text-red-400 text-xs" />
        </div>

        <div class="space-y-4 max-h-96 overflow-y-auto pr-2">
          <h3 class="text-xl font-semibold text-white">選擇動作</h3>
          <div v-for="(group, groupName) in exerciseStore.groupedExercises" :key="groupName">
            <h4 :class="['text-md font-bold inline-block px-3 py-1 rounded-md mb-2', getMuscleGroupColor(groupName)]">
              {{ groupName }}
            </h4>
            <div class="space-y-2">
              <label v-for="exercise in group" :key="exercise.id" class="flex items-center bg-gray-700 p-3 rounded-md cursor-pointer hover:bg-gray-600">
                <input type="checkbox" :value="exercise.name" v-model="selectedExercises" class="w-5 h-5 rounded bg-gray-500 border-gray-400 text-blue-500 focus:ring-blue-600" />
                <span class="ml-4 text-gray-200">{{ exercise.name }}</span>
              </label>
            </div>
          </div>
        </div>

        <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md transition-transform transform hover:scale-105 text-lg">儲存課表範本</button>
      </Form>
    </div>

    <!-- 右側：已儲存的範本 -->
    <div class="bg-gray-800 p-6 rounded-lg shadow-xl">
      <h1 class="text-3xl font-bold mb-6 text-center text-white">我的課表</h1>
      <div v-if="templateStore.templates.length === 0" class="text-center text-gray-400 py-10">
        <p>尚未建立任何課表範本。</p>
      </div>
      <div v-else class="space-y-4">
        <div v-for="template in templateStore.templates" :key="template.id" class="bg-gray-700 p-4 rounded-lg">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-xl font-bold text-white">{{ template.name }}</h3>
            <button @click="confirmDeleteTemplate(template.id, template.name)" class="text-red-500 hover:text-red-400 font-semibold">刪除</button>
          </div>
          <ul class="list-disc list-inside text-gray-300 space-y-1">
            <li v-for="exName in template.exercises" :key="exName">{{ exName }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
