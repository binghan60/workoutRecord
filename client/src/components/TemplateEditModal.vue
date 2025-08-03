<template>
  <v-dialog v-model="modalStore.isTemplateEditModalOpen" max-width="800px" @update:model-value="handleClose">
    <v-card v-if="modalStore.templateToEdit">
      <v-card-title class="text-h5">編輯課表</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="handleSave">
          <v-text-field v-model="templateName" label="課表名稱" :rules="[rules.required]" variant="outlined" class="mb-4"></v-text-field>
          <v-switch v-model="autoSync" color="primary" class="mb-4">
            <template v-slot:label>
              自動同步最新訓練
              <v-tooltip location="top">
                <template v-slot:activator="{ props }">
                  <v-icon v-bind="props" size="xs" class="ml-1">mdi-help-circle-outline</v-icon>
                </template>
                <span>啟用後，每次完成訓練，將自動用該次訓練的數據更新此範本。</span>
              </v-tooltip>
            </template>
          </v-switch>

          <v-row>
            <v-col cols="12" md="6">
              <h3 class="text-h6 mb-2">選擇動作</h3>
              <v-expansion-panels multiple class="mb-4" style="max-height: 400px; overflow-y: auto">
                <v-expansion-panel v-for="group in exerciseStore.groupedAllExercises" :key="group.groupName">
                  <v-expansion-panel-title>
                    {{ group.groupName }}
                    <v-chip v-if="countSelectedInGroup(group.groupName) > 0" color="primary" size="small" class="ml-2">{{ countSelectedInGroup(group.groupName) }}</v-chip>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-list>
                      <div v-for="exercise in group.exercises" :key="exercise._id">
                        <v-list-item class="px-0" @click="toggleExercise(exercise)">
                          <template v-slot:prepend>
                            <v-checkbox-btn :model-value="isSelected(exercise)"></v-checkbox-btn>
                          </template>
                          <v-list-item-title>{{ exercise.name }}</v-list-item-title>
                        </v-list-item>
                      </div>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-col>

            <v-col cols="12" md="6">
              <h3 class="text-h6 mb-2">已選動作 ({{ selectedExercises.length }})</h3>
              <div class="selected-exercises-container" style="max-height: 400px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 4px; padding: 8px">
                <div v-for="(exercise, index) in selectedExercises" :key="exercise.id" class="mb-2">
                  <v-card variant="outlined" class="pa-3">
                    <div class="d-flex align-center justify-space-between mb-2">
                      <div class="d-flex align-center">
                        <v-chip size="small" color="primary" class="mr-2">{{ index + 1 }}</v-chip>
                        <span class="font-weight-medium">{{ exercise.name }}</span>
                      </div>
                      <div class="d-flex">
                        <v-btn icon size="small" variant="text" :disabled="index === 0" @click="moveUp(index)" class="mr-1">
                          <v-icon>mdi-chevron-up</v-icon>
                        </v-btn>
                        <v-btn icon size="small" variant="text" :disabled="index === selectedExercises.length - 1" @click="moveDown(index)" class="mr-1">
                          <v-icon>mdi-chevron-down</v-icon>
                        </v-btn>
                        <v-btn icon size="small" variant="text" color="error" @click="removeExercise(index)">
                          <v-icon>mdi-delete</v-icon>
                        </v-btn>
                      </div>
                    </div>
                    <!-- Dynamic sets editing -->
                    <div v-for="(set, setIndex) in exercise.sets" :key="setIndex" class="d-flex align-center mt-2">
                      <span class="mr-2 font-weight-bold">第 {{ setIndex + 1 }} 組:</span>
                      <v-text-field label="次數" type="number" v-model.number="set.reps" min="1" variant="underlined" dense class="mr-2"></v-text-field>
                      <v-text-field label="重量(kg)" type="number" v-model.number="set.weight" min="0" step="0.5" variant="underlined" dense></v-text-field>
                      <v-btn icon="mdi-delete-outline" size="x-small" variant="text" color="red" @click="removeSet(index, setIndex)" :disabled="exercise.sets.length <= 1"></v-btn>
                    </div>
                    <v-btn size="small" variant="tonal" @click="addSet(index)" class="mt-2">新增一組</v-btn>
                    <v-divider class="my-3"></v-divider>
                    <v-text-field label="休息(秒)" type="number" v-model.number="exercise.restTime" min="0" variant="underlined" dense></v-text-field>
                  </v-card>
                </div>
                <div v-if="selectedExercises.length === 0" class="text-center text-grey pa-4">
                  <v-icon size="48" class="mb-2">mdi-dumbbell</v-icon>
                  <div>尚未選擇任何動作</div>
                  <div class="text-caption">請從左側選擇動作加入課表</div>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" text @click="handleClose">取消</v-btn>
        <v-btn color="primary" text @click="handleSave">儲存</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useModalStore } from '@/stores/modal'
import { useTemplateStore } from '@/stores/template'
import { useExerciseStore } from '@/stores/exercise'
import { useToast } from 'vue-toastification'

const modalStore = useModalStore()
const templateStore = useTemplateStore()
const exerciseStore = useExerciseStore()
const toast = useToast()

const templateId = ref(null)
const templateName = ref('')
const selectedExercises = ref([])
const autoSync = ref(false)

const rules = {
  required: (value) => !!value || '此欄位為必填',
}

// Watch for template changes and initialize form
watch(
  () => modalStore.isTemplateEditModalOpen,
  (isOpen) => {
    if (isOpen && modalStore.templateToEdit) {
      exerciseStore.fetchExercises().then(() => {
        const newTemplate = modalStore.templateToEdit
        const allExercises = exerciseStore.allExercises

        if (newTemplate && allExercises.length > 0) {
          templateId.value = newTemplate._id
          templateName.value = newTemplate.name
          autoSync.value = newTemplate.autoSync || false

          const exerciseMap = new Map(allExercises.map((e) => [e.name, e]))

          selectedExercises.value = (newTemplate.exercises || [])
            .map((templateExercise, index) => {
              const fullExercise = exerciseMap.get(templateExercise.name)
              if (fullExercise) {
                return {
                  ...templateExercise,
                  id: fullExercise._id,
                  order: index,
                  // Ensure sets is an array, provide a default if it's missing
                  sets: Array.isArray(templateExercise.sets) && templateExercise.sets.length > 0
                    ? JSON.parse(JSON.stringify(templateExercise.sets)) // Deep copy
                    : [{ reps: 12, weight: 10 }],
                }
              }
              return null
            })
            .filter(Boolean)
        }
      })
    }
  },
  { immediate: true },
)

const countSelectedInGroup = (groupName) => {
  const group = exerciseStore.groupedAllExercises.find((g) => g.groupName === groupName)
  if (!group) return 0
  const selectedIds = new Set(selectedExercises.value.map((ex) => ex.id))
  return group.exercises.filter((ex) => selectedIds.has(ex._id)).length
}

const isSelected = (exercise) => {
  if (!exercise || !exercise._id) return false
  return selectedExercises.value.some((ex) => ex.id === exercise._id)
}

const toggleExercise = (exercise) => {
  const index = selectedExercises.value.findIndex((ex) => ex.id === exercise._id)
  if (index > -1) {
    selectedExercises.value.splice(index, 1)
  } else {
    selectedExercises.value.push({
      id: exercise._id,
      name: exercise.name,
      sets: [{ reps: 12, weight: 10 }], // Initialize with one set
      restTime: 60,
    })
  }
}

const addSet = (exerciseIndex) => {
  const exercise = selectedExercises.value[exerciseIndex]
  if (exercise && exercise.sets) {
    const lastSet = exercise.sets.length > 0 ? exercise.sets[exercise.sets.length - 1] : { reps: 12, weight: 10 }
    exercise.sets.push({ ...lastSet })
  }
}

const removeSet = (exerciseIndex, setIndex) => {
  const exercise = selectedExercises.value[exerciseIndex]
  if (exercise && exercise.sets && exercise.sets.length > 1) {
    exercise.sets.splice(setIndex, 1)
  }
}

const moveUp = (index) => {
  if (index > 0) {
    ;[selectedExercises.value[index], selectedExercises.value[index - 1]] = [selectedExercises.value[index - 1], selectedExercises.value[index]]
  }
}

const moveDown = (index) => {
  if (index < selectedExercises.value.length - 1) {
    ;[selectedExercises.value[index], selectedExercises.value[index + 1]] = [selectedExercises.value[index + 1], selectedExercises.value[index]]
  }
}

const removeExercise = (index) => {
  selectedExercises.value.splice(index, 1)
}

const handleSave = () => {
  if (!templateName.value) {
    toast.error('請輸入課表名稱！')
    return
  }
  if (selectedExercises.value.length === 0) {
    toast.warning('請至少為課表選擇一個動作！')
    return
  }

  const exercisesForAPI = selectedExercises.value.map((ex) => {
    const hasInvalidSet = ex.sets.some(set => {
      const reps = parseFloat(set.reps)
      const weight = parseFloat(set.weight)
      return isNaN(reps) || reps <= 0 || isNaN(weight) || weight < 0
    })

    if (hasInvalidSet) {
      toast.error(`動作 "${ex.name}" 中有包含無效的次數或重量。`)
      return null
    }
    
    // Strip out temporary frontend-only fields like 'id' and 'order'
    const { id, order, ...rest } = ex
    return rest
  }).filter(Boolean)

  if (exercisesForAPI.length !== selectedExercises.value.length) {
    return // Stop if validation failed
  }

  const templateData = {
    name: templateName.value,
    exercises: exercisesForAPI,
    autoSync: autoSync.value,
  }

  templateStore.updateTemplate(templateId.value, templateData)
  handleClose()
}

const handleClose = () => {
  modalStore.hideTemplateEditModal()
  templateId.value = null
  templateName.value = ''
  selectedExercises.value = []
  autoSync.value = false
}
</script>

<style scoped>
.selected-exercises-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px;
}
</style>

