<template>
  <div>
    <!-- Add Template Dialog -->
    <v-dialog v-model="isModalOpen" max-width="500px">
      <v-card>
        <v-card-title class="text-h5">新增課表到 {{ selectedDay }}</v-card-title>
        <v-card-text>
          <div v-if="availableTemplatesForSelectedDay.length > 0">
            <v-list>
              <v-list-item v-for="template in availableTemplatesForSelectedDay" :key="template._id" :title="template.name" @click="selectTemplate(template._id)"></v-list-item>
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
            <div v-if="templateStore.schedule && templateStore.schedule[dayMap[day]] && templateStore.schedule[dayMap[day]].length > 0">
              <v-chip v-for="(template, index) in templateStore.schedule[dayMap[day]]" :key="template._id" closable @click:close="templateStore.removeTemplateFromSchedule(dayMap[day], index)" label class="w-100 d-flex justify-space-between mb-2">
                {{ template.name }}
              </v-chip>
            </div>
            <div v-else class="text-center text-grey-darken-1 py-10">休息日</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTemplateStore } from '@/stores/template'

const templateStore = useTemplateStore()

const isModalOpen = ref(false)
const selectedDay = ref(null) // This will store the Chinese day name for the dialog title

const dayMap = {
  '星期一': 'monday',
  '星期二': 'tuesday',
  '星期三': 'wednesday',
  '星期四': 'thursday',
  '星期五': 'friday',
  '星期六': 'saturday',
  '星期日': 'sunday',
}

const isToday = (day) => {
  const today = new Date()
  const dayIndex = templateStore.daysOfWeek.indexOf(day) // e.g., '星期一' -> 0
  const todayIndex = today.getDay() // e.g., Monday -> 1, Sunday -> 0

  if (todayIndex === 0) {
    // If today is Sunday
    return dayIndex === 6 // '星期日' has index 6
  }
  // For Monday to Saturday
  return dayIndex === todayIndex - 1
}

const openAddModal = (day) => {
  selectedDay.value = day
  isModalOpen.value = true
}

const selectTemplate = (templateId) => {
  const englishDay = dayMap[selectedDay.value]
  if (englishDay && templateId) {
    templateStore.addTemplateToSchedule(englishDay, templateId)
  }
  isModalOpen.value = false
  selectedDay.value = null
}

const availableTemplatesForSelectedDay = computed(() => {
  if (!selectedDay.value) {
    return templateStore.templates
  }
  const englishDay = dayMap[selectedDay.value]
  const scheduledTemplates = templateStore.schedule[englishDay]

  if (!scheduledTemplates) {
    return templateStore.templates
  }
  const scheduledIds = scheduledTemplates.map((t) => t._id)
  return templateStore.templates.filter((t) => !scheduledIds.includes(t._id))
})
</script>
