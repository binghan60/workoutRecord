<script setup>
import { ref, computed } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useExerciseStore } from '@/stores/exercise'
import { useModalStore } from '@/stores/modal'
import { getMuscleGroupColor } from '@/utils/colorUtils'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { useToast } from 'vue-toastification'
import { VueDraggableNext } from 'vue-draggable-next'

const toast = useToast()
const templateStore = useTemplateStore()
const exerciseStore = useExerciseStore()
const modalStore = useModalStore()

const selectedExercises = ref([])

// --- 新增狀態：控制選擇課表的 Modal ---
const isModalOpen = ref(false)
const selectedDay = ref(null)

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
  modalStore.showConfirmation('確認刪除課表', `確定要刪除「${templateName}」這個課表範本嗎？這將會把它從所有排程中移除。`, () => {
    templateStore.deleteTemplate(templateId)
  })
}

// --- 拖曳邏輯 ---
const handleDrop = (day, event) => {
  const templateId = event.dataTransfer.getData('templateId')
  if (templateId) {
    templateStore.addTemplateToSchedule(day, templateId)
  }
}

const handleDragStart = (event, templateId) => {
  event.dataTransfer.setData('templateId', templateId)
}

// --- 按鈕新增邏輯 ---
const openAddModal = (day) => {
  selectedDay.value = day
  isModalOpen.value = true
}

const selectTemplate = (templateId) => {
  if (selectedDay.value && templateId) {
    templateStore.addTemplateToSchedule(selectedDay.value, templateId)
  }
  isModalOpen.value = false
  selectedDay.value = null
}

// --- 計算屬性：過濾掉已在當天排程中的課表 ---
const availableTemplatesForSelectedDay = computed(() => {
  if (!selectedDay.value) return []
  const scheduledIds = templateStore.schedule[selectedDay.value] || []
  return templateStore.templates.filter((t) => !scheduledIds.includes(t.id))
})
</script>

<template>
  <div>
    <!-- Add a single root element -->
    <!-- Add Template Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="isModalOpen = false">
      <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div class="p-6">
          <h3 class="text-xl font-bold text-white text-center mb-4">新增課表到 {{ selectedDay }}</h3>
          <div v-if="availableTemplatesForSelectedDay.length > 0" class="space-y-3 max-h-[60vh] overflow-y-auto">
            <button v-for="template in availableTemplatesForSelectedDay" :key="template.id" @click="selectTemplate(template.id)" class="w-full text-left bg-gray-700 hover:bg-gray-600 text-white font-semibold p-4 rounded-lg transition-colors">
              {{ template.name }}
            </button>
          </div>
          <div v-else class="text-center text-gray-400 py-8">
            <p>沒有其他可用的課表了。</p>
            <p class="text-sm mt-1">所有課表都已經被加到這一天的排程中了。</p>
          </div>
          <button @click="isModalOpen = false" class="mt-6 w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded">關閉</button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- 左欄：建立與管理範本 -->
      <div class="lg:col-span-1 space-y-8">
        <!-- 建立新範本 -->
        <div class="p-4">
          <h2 class="text-2xl font-semibold mb-4 text-white border-b-2 border-gray-700 pb-2">課表管理</h2>
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
        </div>

        <!-- 已儲存的範本列表 -->
        <div class="p-4">
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
      </div>

      <!-- 右欄：週課表排程 -->
      <div class="lg:col-span-2 p-4 rounded-lg shadow-xl">
        <h2 class="text-2xl font-semibold mb-4 text-white border-b-2 border-gray-700 pb-2">週課表排程</h2>
        <p class="text-center text-gray-400 mb-6 text-sm">從左側拖曳課表，或點擊 <span class="text-blue-400 font-bold mx-1">+</span> 按鈕來新增。</p>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div v-for="day in templateStore.daysOfWeek" :key="day" class="bg-gray-800 p-4 rounded-lg min-h-[200px]" @dragover.prevent @drop="handleDrop(day, $event)">
            <div class="flex justify-between items-center mb-4 border-b-2 border-gray-700 pb-2">
              <h3 class="font-bold text-lg text-white">{{ day }}</h3>
              <button @click="openAddModal(day)" class="text-blue-400 hover:text-blue-300 font-bold text-2xl leading-none rounded-full w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600">+</button>
            </div>
            <VueDraggableNext v-model="templateStore.schedule[day]" tag="div" class="space-y-3 h-full">
              <div v-for="(templateId, index) in templateStore.schedule[day]" :key="templateId" class="bg-gray-700 p-3 rounded-lg shadow-md cursor-pointer flex justify-between items-center">
                <span class="text-white font-semibold">{{ templateStore.getTemplateById(templateId)?.name }}</span>
                <button @click="templateStore.removeTemplateFromSchedule(day, index)" class="text-gray-400 hover:text-red-500 text-xl">&times;</button>
              </div>
            </VueDraggableNext>
            <div v-if="!templateStore.schedule[day] || templateStore.schedule[day].length === 0" class="text-center text-gray-500 pt-10">休息日</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
