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

const isSelected = (exercise) => {
  return selectedExercises.value.some((ex) => ex.id === exercise.id)
}

const toggleExercise = (exercise) => {
  if (isSelected(exercise)) {
    selectedExercises.value = selectedExercises.value.filter((ex) => ex.id !== exercise.id)
  } else {
    selectedExercises.value.push({
      id: exercise.id,
      name: exercise.name,
      sets: 3,
      reps: 12,
      weight: 10,
      restTime: 60,
    })
  }
}

const handleAddTemplate = (values, { resetForm }) => {
  if (selectedExercises.value.length === 0) {
    toast.warning('請至少為課表選擇一個動作！')
    return
  }
  templateStore.addTemplate({
    name: values.templateName,
    exercises: JSON.parse(JSON.stringify(selectedExercises.value)),
  })
  resetForm()
  selectedExercises.value = []
}

const confirmDeleteTemplate = (templateId, templateName) => {
  modalStore.showConfirmation('確認刪除課表', `確定要刪除「${templateName}」這個課表範本嗎？`, () => {
    templateStore.deleteTemplate(templateId)
  })
}

// --- 讓課表可以被拖曳 ---
const handleDragStart = (event, templateId) => {
  event.dataTransfer.setData('templateId', templateId)
}
</script>

<template>
  <div class="grid grid-cols-1 gap-4">
    <!-- 建立新範本 -->
    <Form @submit="handleAddTemplate" class="space-y-6">
      <div class="relative pb-4 mb-2">
        <Field name="templateName" type="text" label="課表名稱" rules="required" placeholder="例如: 胸推日" class="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" autocomplete="off" />
        <ErrorMessage name="templateName" class="absolute bottom-0 left-0 text-red-400 text-xs" />
      </div>

      <div class="bg-gray-800 space-y-4 max-h-[55vh] overflow-y-auto pr-2">
        <h3 class="text-xl font-semibold text-white">選擇動作</h3>
        <div v-for="(group, groupName) in exerciseStore.groupedExercises" :key="groupName">
          <h4 :class="['text-md font-bold inline-block px-3 py-1 rounded-md mb-2', getMuscleGroupColor(groupName)]">{{ groupName }}</h4>
          <div class="space-y-2">
            <div v-for="exercise in group" :key="exercise.id">
              <label class="flex items-center bg-gray-700 p-3 rounded-md cursor-pointer hover:bg-gray-600">
                <input type="checkbox" :checked="isSelected(exercise)" @change="toggleExercise(exercise)" class="w-5 h-5 rounded bg-gray-500 border-gray-400 text-blue-500 focus:ring-blue-600" />
                <span class="ml-4 text-gray-200">{{ exercise.name }}</span>
              </label>
              <div v-if="isSelected(exercise)" class="grid grid-cols-4 gap-2 p-3 bg-gray-750 rounded-b-md">
                <div v-for="selectedEx in selectedExercises.filter((ex) => ex.id === exercise.id)" :key="selectedEx.id" class="contents">
                  <div>
                    <label class="text-xs text-gray-400">組數</label>
                    <input type="number" v-model.number="selectedEx.sets" class="w-full bg-gray-600 border border-gray-500 rounded p-1 text-white text-center" min="1" />
                  </div>
                  <div>
                    <label class="text-xs text-gray-400">次數</label>
                    <input type="number" v-model.number="selectedEx.reps" class="w-full bg-gray-600 border border-gray-500 rounded p-1 text-white text-center" min="1" />
                  </div>
                  <div>
                    <label class="text-xs text-gray-400">重量(kg)</label>
                    <input type="number" v-model.number="selectedEx.weight" class="w-full bg-gray-600 border border-gray-500 rounded p-1 text-white text-center" min="0" step="0.5" />
                  </div>
                  <div>
                    <label class="text-xs text-gray-400">休息(秒)</label>
                    <input type="number" v-model.number="selectedEx.restTime" class="w-full bg-gray-600 border border-gray-500 rounded p-1 text-white text-center" min="0" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md transition-transform transform hover:scale-105 text-lg">儲存課表</button>
    </Form>

    <!-- 已儲存的範本列表 -->
    <h2 class="text-2xl font-semibold mb-4 text-white border-b-2 border-gray-700 pb-2">我的課表庫</h2>
    <div v-if="templateStore.templates.length === 0" class="text-center text-gray-400 py-10"><p>尚未建立任何課表。</p></div>
    <div v-else class="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
      <div v-for="template in templateStore.templates" :key="template.id" :draggable="true" @dragstart="handleDragStart($event, template.id)" class="bg-gray-700 p-3 rounded-lg cursor-grab active:cursor-grabbing">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-bold text-white">{{ template.name }}</h3>
          <button @click="confirmDeleteTemplate(template.id, template.name)" class="text-red-500 hover:text-red-400 font-semibold text-sm">刪除</button>
        </div>
        <ul class="text-gray-300 space-y-1 mt-2 text-xs">
          <li v-for="ex in template.exercises" :key="ex.id">{{ ex.name }}: {{ ex.sets }}x{{ ex.reps }} @ {{ ex.weight }}kg, 休息{{ ex.restTime || 60 }}秒</li>
        </ul>
      </div>
    </div>
  </div>
</template>
