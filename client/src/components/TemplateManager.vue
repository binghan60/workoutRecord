<template>
  <v-row>
    <!-- Left Column: Create New Template -->
    <v-col cols="12" md="6">
      <v-card>
        <v-card-title class="text-h5">建立新範本</v-card-title>
        <v-card-text>
          <v-form ref="formRef" @submit.prevent="handleAddTemplate">
            <v-text-field v-model="templateName" label="課表名稱" :rules="[rules.required]" variant="outlined" class="mb-4"></v-text-field>

            <div class="d-flex justify-space-between align-center mb-2">
              <h3 class="text-h6">選擇動作</h3>
              <v-switch
                v-if="!authStore.isGuest"
                :model-value="uiStore.showBuiltInTemplates"
                @update:model-value="uiStore.toggleShowBuiltInTemplates"
                label="顯示內建動作"
                color="primary"
                dense
                hide-details
              ></v-switch>
            </div>

            <v-switch v-model="autoSync" color="primary" class="mb-2">
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

            <v-expansion-panels multiple class="mb-4">
              <v-expansion-panel v-for="group in displayedExercises" :key="group.groupName">
                <v-expansion-panel-title class="group-title">
                  {{ group.groupName }}
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-list>
                    <div v-for="exercise in group.exercises" :key="exercise._id">
                      <v-list-item class="px-0 exercise-option" :class="{ selected: isSelected(exercise) }" @click="toggleExercise(exercise)">
                        <template v-slot:prepend>
                          <v-checkbox-btn :model-value="isSelected(exercise)"></v-checkbox-btn>
                        </template>
                        <v-list-item-title>{{ exercise.name }}</v-list-item-title>
                      </v-list-item>
                      <v-expand-transition>
                        <div v-if="isSelected(exercise)" class="pa-2 ml-12">
                          <!-- Dynamic sets editing -->
                          <div v-for="(set, setIndex) in getExerciseDetails(exercise._id).sets" :key="setIndex" class="d-flex align-center mb-2">
                            <span class="mr-2 font-weight-bold">第 {{ setIndex + 1 }} 組:</span>
                            <v-text-field label="次數" type="number" v-model.number="set.reps" min="1" variant="underlined" dense class="mr-2"></v-text-field>
                            <v-text-field label="重量(kg)" type="number" v-model.number="set.weight" min="0" step="0.5" variant="underlined" dense></v-text-field>
                            <v-btn icon="mdi-delete-outline" size="small" variant="text" color="red" @click="removeSet(exercise._id, setIndex)" :disabled="getExerciseDetails(exercise._id).sets.length <= 1"></v-btn>
                          </div>
                          <v-btn size="small" variant="tonal" @click="addSet(exercise._id)" class="mt-1">新增一組</v-btn>
                          <v-divider class="my-3"></v-divider>
                          <v-text-field label="休息(秒)" type="number" v-model.number="getExerciseDetails(exercise._id).restTime" min="0" variant="underlined" dense></v-text-field>
                        </div>
                      </v-expand-transition>
                    </div>
                  </v-list>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
            <div v-if="displayedExercises.length === 0" class="text-center text-grey-darken-1 py-8">
              <p>尚無符合條件的動作。</p>
              <p v-if="!uiStore.showBuiltInTemplates">可嘗試開啟「顯示內建動作」。</p>
            </div>

            <v-btn type="submit" color="primary" block size="large" :disabled="displayedExercises.length === 0">儲存課表</v-btn>
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
            <v-list-item v-for="template in templateStore.templates" :key="template._id" :title="template.name" :subtitle="`${(template.exercises || []).length} 個動作`">
              <template v-slot:append>
                <v-btn icon="mdi-pencil" variant="text" color="grey" @click="modalStore.showTemplateEditModal(template)"></v-btn>
                <v-btn icon="mdi-delete" variant="text" color="grey" @click="confirmDeleteTemplate(template._id, template.name)"></v-btn>
              </template>
            </v-list-item>
          </v-list>
          <div v-else class="text-center text-grey-darken-1 py-10">
            <p>尚未建立任何課表。</p>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <TemplateEditModal />
  </v-row>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTemplateStore } from '@/stores/template'
import { useExerciseStore } from '@/stores/exercise'
import { useModalStore } from '@/stores/modal'
import { useToast } from 'vue-toastification'
import { useUIStore } from '@/stores/ui'
import TemplateEditModal from './TemplateEditModal.vue'

const toast = useToast()
const authStore = useAuthStore()
const templateStore = useTemplateStore()
const exerciseStore = useExerciseStore()
const modalStore = useModalStore()
const uiStore = useUIStore()

const templateName = ref('')
const selectedExercises = ref([])
const autoSync = ref(false)

const formRef = ref(null)
const rules = {
  required: (value) => !!value || '此欄位為必填',
}

const displayedExercises = computed(() => {
  return uiStore.showBuiltInTemplates ? exerciseStore.groupedAllExercises : exerciseStore.groupedCustomExercises
})

const isSelected = (exercise) => selectedExercises.value.some((ex) => ex.id === exercise._id)

const getExerciseDetails = (exerciseId) => selectedExercises.value.find((ex) => ex.id === exerciseId) || { sets: [] }

const toggleExercise = (exercise) => {
  if (isSelected(exercise)) {
    selectedExercises.value = selectedExercises.value.filter((ex) => ex.id !== exercise._id)
  } else {
    selectedExercises.value.push({
      id: exercise._id,
      name: exercise.name,
      sets: [{ reps: 12, weight: 10 }], // Initialize with one set
      restTime: 60,
    })
  }
}

const addSet = (exerciseId) => {
  const exercise = getExerciseDetails(exerciseId)
  if (exercise && exercise.sets) {
    const lastSet = exercise.sets.length > 0 ? exercise.sets[exercise.sets.length - 1] : { reps: 12, weight: 10 }
    exercise.sets.push({ ...lastSet })
  }
}

const removeSet = (exerciseId, setIndex) => {
  const exercise = getExerciseDetails(exerciseId)
  if (exercise && exercise.sets && exercise.sets.length > 1) {
    exercise.sets.splice(setIndex, 1)
  }
}

const handleAddTemplate = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  if (selectedExercises.value.length === 0) {
    toast.warning('請至少為課表選擇一個動作！')
    return
  }

  const exercisesForAPI = selectedExercises.value.map((ex) => {
    // Validate that every set has valid numbers
    const hasInvalidSet = ex.sets.some(set => {
      const reps = parseFloat(set.reps)
      const weight = parseFloat(set.weight)
      return isNaN(reps) || reps <= 0 || isNaN(weight) || weight < 0
    })

    if (hasInvalidSet) {
      toast.error(`動作 "${ex.name}" 中有無效的組數、次數或重量。`)
      return null // Mark as invalid
    }

    const { id, ...rest } = ex
    return rest
  }).filter(Boolean) // Filter out null (invalid) exercises

  // If any exercise was invalid, the length will not match
  if (exercisesForAPI.length !== selectedExercises.value.length) {
    return // Stop submission
  }

  try {
    await templateStore.addTemplate({
      name: templateName.value,
      exercises: exercisesForAPI,
      autoSync: autoSync.value,
    })

    templateName.value = ''
    selectedExercises.value = []
    autoSync.value = false
    formRef.value.reset()
    formRef.value.resetValidation()
  } catch (error) {
    toast.error('課表建立失敗，請稍後再試')
  }
}

const confirmDeleteTemplate = (templateId, name) => {
  modalStore.showConfirmation('確認刪除課表', `確定要刪除「${name}」這個課表範本嗎？`, () => {
    templateStore.deleteTemplate(templateId)
  })
}
</script>

<style scoped>
.group-title {
  background-color: hsla(174, 42%, 51%, 0.15);
  font-weight: bold;
}

.exercise-option:hover {
  background-color: rgba(77, 182, 172, 0.1);
}

.exercise-option.selected {
  border-left: 4px solid rgb(77, 182, 172);
  background-color: rgba(77, 182, 172, 0.05);
}

:deep(.v-expansion-panel-text__wrapper) {
  padding: 0 12px 8px;
}
</style>


