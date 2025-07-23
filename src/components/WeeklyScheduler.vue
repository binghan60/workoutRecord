<template>
  <div>
    <!-- Add Template Dialog -->
    <v-dialog v-model="isModalOpen" max-width="500px">
      <v-card>
        <v-card-title class="text-h5">新增課表到 {{ selectedDay }}</v-card-title>
        <v-card-text>
          <div v-if="availableTemplatesForSelectedDay.length > 0">
            <v-list>
              <v-list-item v-for="template in availableTemplatesForSelectedDay" :key="template.id" :title="template.name" @click="selectTemplate(template.id)"></v-list-item>
            </v-list>
          </div>
          <div v-else class="text-center text-grey-darken-1 py-8">
            <p>沒有其他可用的課表了。</p>
            <p class="text-body-2 mt-1">所有課表都已經被加到這一天的排程中了。</p>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" text @click="isModalOpen = false">關閉</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Weekly Schedule Grid -->
    <p class="text-center text-grey-darken-1 mb-6">點擊 <v-icon color="primary">mdi-plus-circle-outline</v-icon> 按鈕或從範本頁拖曳來新增訓練排程。</p>

    <v-row>
      <v-col v-for="day in templateStore.daysOfWeek" :key="day" cols="12" md="4" lg="3">
        <v-card :variant="isToday(day) ? 'tonal' : 'elevated'" :color="isToday(day) ? 'primary' : undefined" min-height="250px" class="fill-height">
          <v-card-title class="d-flex justify-space-between align-center">
            <span>{{ day }}</span>
            <v-btn icon variant="text" @click="openAddModal(day)">
              <v-icon color="primary">mdi-plus</v-icon>
            </v-btn>
          </v-card-title>

          <v-card-text>
            <v-chip v-for="(templateId, index) in templateStore.schedule[day]" :key="templateId" closable @click:close="templateStore.removeTemplateFromSchedule(day, index)" label class="w-100 d-flex justify-space-between mb-2">
              {{ templateStore.getTemplateById(templateId)?.name }}
            </v-chip>
            <div v-if="!templateStore.schedule[day] || templateStore.schedule[day].length === 0" class="text-center text-grey-darken-1 py-10">休息日</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { VueDraggableNext } from 'vue-draggable-next'

const templateStore = useTemplateStore()

const isModalOpen = ref(false)
const selectedDay = ref(null)

const isToday = (day) => {
  const today = new Date()
  const dayIndex = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'].indexOf(day)
  return today.getDay() === dayIndex
}

const handleDrop = (day, event) => {
  const templateId = event.dataTransfer.getData('templateId')
  if (templateId) {
    templateStore.addTemplateToSchedule(day, templateId)
  }
}

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

const availableTemplatesForSelectedDay = computed(() => {
  if (!selectedDay.value) return []
  const scheduledIds = templateStore.schedule[selectedDay.value] || []
  return templateStore.templates.filter((t) => !scheduledIds.includes(t.id))
})
</script>
