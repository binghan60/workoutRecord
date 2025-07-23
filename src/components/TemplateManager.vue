<template>
  <v-row>
    <!-- Left Column: Create New Template -->
    <v-col cols="12" md="6">
      <v-card>
        <v-card-title class="text-h5">建立新範本</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="handleAddTemplate">
            <v-text-field v-model="templateName" label="課表名稱" :rules="[rules.required]" variant="outlined" class="mb-4"></v-text-field>

            <h3 class="text-h6 mb-2">選擇動作</h3>
            <v-expansion-panels class="mb-4">
              <v-expansion-panel v-for="(group, groupName) in exerciseStore.groupedExercises" :key="groupName">
                <v-expansion-panel-title>{{ groupName }}</v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-list>
                    <div v-for="exercise in group" :key="exercise.id">
                      <v-list-item class="px-0">
                        <template v-slot:prepend>
                          <v-checkbox-btn :model-value="isSelected(exercise)" @update:model-value="toggleExercise(exercise)"></v-checkbox-btn>
                        </template>
                        <v-list-item-title>{{ exercise.name }}</v-list-item-title>
                      </v-list-item>
                      <v-expand-transition>
                        <div v-if="isSelected(exercise)" class="pa-2 ml-12">
                          <v-row>
                            <v-col cols="6" sm="3">
                              <v-text-field label="組數" type="number" v-model.number="getExerciseDetails(exercise.id).sets" min="1" variant="underlined" dense></v-text-field>
                            </v-col>
                            <v-col cols="6" sm="3">
                              <v-text-field label="次數" type="number" v-model.number="getExerciseDetails(exercise.id).reps" min="1" variant="underlined" dense></v-text-field>
                            </v-col>
                            <v-col cols="6" sm="3">
                              <v-text-field label="重量(kg)" type="number" v-model.number="getExerciseDetails(exercise.id).weight" min="0" step="0.5" variant="underlined" dense></v-text-field>
                            </v-col>
                            <v-col cols="6" sm="3">
                              <v-text-field label="休息(秒)" type="number" v-model.number="getExerciseDetails(exercise.id).restTime" min="0" variant="underlined" dense></v-text-field>
                            </v-col>
                          </v-row>
                        </div>
                      </v-expand-transition>
                    </div>
                  </v-list>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>

            <v-btn type="submit" color="primary" block size="large">儲存課表</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Right Column: Saved Templates -->
    <v-col cols="12" md="6">
      <v-card>
        <v-card-title class="text-h5">我的課表庫</v-card-title>
        <v-card-text>
          <v-list v-if="templateStore.templates.length > 0">
            <v-list-item v-for="template in templateStore.templates" :key="template.id" :title="template.name" :subtitle="`${template.exercises.length} 個動作`" draggable="true" @dragstart="handleDragStart($event, template.id)">
              <template v-slot:append>
                <v-btn icon="mdi-delete" variant="text" color="grey" @click="confirmDeleteTemplate(template.id, template.name)"></v-btn>
              </template>
            </v-list-item>
          </v-list>
          <div v-else class="text-center text-grey-darken-1 py-10">
            <p>尚未建立任何課表。</p>
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { ref } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useExerciseStore } from '@/stores/exercise'
import { useModalStore } from '@/stores/modal'
import { useToast } from 'vue-toastification'

const toast = useToast()
const templateStore = useTemplateStore()
const exerciseStore = useExerciseStore()
const modalStore = useModalStore()

const templateName = ref('')
const selectedExercises = ref([])

const rules = {
  required: (value) => !!value || '此欄位為必填',
}

const isSelected = (exercise) => selectedExercises.value.some((ex) => ex.id === exercise.id)

const getExerciseDetails = (exerciseId) => selectedExercises.value.find((ex) => ex.id === exerciseId)

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

const handleAddTemplate = () => {
  if (!templateName.value) {
    toast.error('請輸入課表名稱！')
    return
  }
  if (selectedExercises.value.length === 0) {
    toast.warning('請至少為課表選擇一個動作！')
    return
  }
  templateStore.addTemplate({
    name: templateName.value,
    exercises: JSON.parse(JSON.stringify(selectedExercises.value)),
  })
  templateName.value = ''
  selectedExercises.value = []
}

const confirmDeleteTemplate = (templateId, name) => {
  modalStore.showConfirmation('確認刪除課表', `確定要刪除「${name}」這個課表範本嗎？`, () => {
    templateStore.deleteTemplate(templateId)
  })
}

const handleDragStart = (event, templateId) => {
  event.dataTransfer.setData('templateId', templateId)
}
</script>
