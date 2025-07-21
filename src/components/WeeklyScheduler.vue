<script setup>
import { ref, computed } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useModalStore } from '@/stores/modal'
import { VueDraggableNext } from 'vue-draggable-next'

const templateStore = useTemplateStore()
const modalStore = useModalStore()

// --- 控制選擇課表的 Modal ---
const isModalOpen = ref(false)
const selectedDay = ref(null)

// --- 拖曳邏輯 ---
const handleDrop = (day, event) => {
  const templateId = event.dataTransfer.getData('templateId')
  if (templateId) {
    templateStore.addTemplateToSchedule(day, templateId)
  }
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

// --- 讓外部可以拖曳進來 ---
const handleDragStart = (event, templateId) => {
  event.dataTransfer.setData('templateId', templateId)
}
</script>

<template>
  <div>
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

    <!-- 週課表排程 -->
    <p class="text-center text-gray-400 mb-6 text-sm">點擊 <span class="text-blue-400 font-bold mx-1">+</span> 按鈕來新增訓練排程。</p>
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
</template>
