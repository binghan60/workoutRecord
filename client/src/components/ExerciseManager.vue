<template>
  <!-- 新增動作表單 -->
  <v-card class="mb-8">
    <v-card-title class="text-h6">新增訓練動作</v-card-title>
    <v-card-text>
      <v-form ref="formRef" @submit.prevent="handleAddExercise">
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field v-model="newExercise.name" label="動作名稱" :rules="[rules.required]" placeholder="例如：啞鈴臥推" variant="outlined" clearable></v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="newExercise.group" label="訓練部位" :rules="[rules.required]" placeholder="例如：胸部" variant="outlined" clearable></v-text-field>
          </v-col>
        </v-row>
        <v-btn type="submit" color="primary" block>新增動作</v-btn>
      </v-form>
    </v-card-text>
  </v-card>

  <!-- 動作列表 -->
  <v-card>
    <v-card-title class="d-flex justify-space-between align-center">
      <span class="text-h6">我的動作清單</span>
      <v-switch v-if="!authStore.isGuest" :model-value="uiStore.showBuiltInExercises" @update:model-value="uiStore.toggleShowBuiltInExercises" label="顯示內建動作" color="primary" dense hide-details></v-switch>
    </v-card-title>
    <v-card-text>
      <div v-if="displayedExercises.length > 0">
        <v-expansion-panels multiple v-model="openPanels">
          <v-expansion-panel v-for="group in displayedExercises" :key="group.groupName" :value="group.groupName">
            <v-expansion-panel-title class="group-title">
              {{ group.groupName }}
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-list lines="one" density="compact">
                <v-list-item v-for="exercise in group.exercises" :key="exercise._id" :title="exercise.name" class="px-0 exercise-option">
                  <template v-slot:append>
                    <v-chip :color="getExerciseChip(exercise).color" size="small" variant="tonal" class="mr-2">
                      {{ getExerciseChip(exercise).text }}
                    </v-chip>
                    <v-btn icon="mdi-delete" variant="text" color="grey" :style="{ visibility: isDeletable(exercise) ? 'visible' : 'hidden' }" :disabled="!isDeletable(exercise)" @click="confirmDeleteExercise(exercise)"></v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
      <div v-else class="text-center text-grey-darken-1 py-8">
        <p>尚無符合條件的動作。</p>
        <p v-if="!uiStore.showBuiltInExercises">可嘗試開啟「顯示內建動作」。</p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useExerciseStore } from '@/stores/exercise'
import { useModalStore } from '@/stores/modal'
import { useTemplateStore } from '@/stores/template'
import { useUIStore } from '@/stores/ui'

const authStore = useAuthStore()
const exerciseStore = useExerciseStore()
const modalStore = useModalStore()
const templateStore = useTemplateStore()
const uiStore = useUIStore()

const formRef = ref(null)
const newExercise = ref({ name: '', group: '' })
const rules = { required: (value) => !!value || '此欄位為必填' }

const displayedExercises = computed(() => {
  return uiStore.showBuiltInExercises ? exerciseStore.groupedAllExercises : exerciseStore.groupedCustomExercises
})

// 控制展開的群組，避免群組被刪除後自動展開其它群組
const openPanels = ref([])

watch(
  displayedExercises,
  (groups) => {
    // 僅保留仍存在的 groupName，避免自動展開其他群組
    const valid = new Set(groups.map((g) => g.groupName))
    openPanels.value = openPanels.value.filter((name) => valid.has(name))
  },
  { immediate: true },
)

const isDeletable = (exercise) => {
  if (authStore.isGuest) {
    return true
  }
  return exercise.user === authStore.user?._id
}

const getExerciseChip = (exercise) => {
  if (authStore.isGuest) {
    return { text: '訪客', color: 'blue' }
  }
  if (exercise.user === authStore.user?._id) {
    return { text: '自訂', color: 'green' }
  }
  return { text: '內建', color: 'grey' }
}

const handleAddExercise = async () => {
  const { valid } = await formRef.value.validate()
  if (valid) {
    exerciseStore.addExercise(newExercise.value.name, newExercise.value.group)
    newExercise.value.name = ''
    newExercise.value.group = ''
    formRef.value.reset()
  }
}

const confirmDeleteExercise = (exercise) => {
  const exerciseName = exercise.name
  const affectedTemplates = []
  const deletedTemplates = []

  templateStore.templates.forEach((template) => {
    const containsExercise = template.exercises.some((ex) => ex.exercise === exercise._id)
    if (containsExercise) {
      if (template.exercises.length === 1) {
        deletedTemplates.push(template.name)
      } else {
        affectedTemplates.push(template.name)
      }
    }
  })

  let message = `您確定要刪除「${exerciseName}」嗎？`
  if (deletedTemplates.length > 0 || affectedTemplates.length > 0) {
    message += `\n\n此操作將導致以下後果：`
    if (deletedTemplates.length > 0) {
      message += `\n\n**將永久刪除以下課表** (因變空):\n  - ${deletedTemplates.join('\n  - ')}`
    }
    if (affectedTemplates.length > 0) {
      message += `\n\n**將從以下課表中移除此動作**:\n  - ${affectedTemplates.join('\n  - ')}`
    }
  }

  modalStore.showConfirmation('確認刪除', message, () => {
    exerciseStore.deleteExercise(exercise._id)
  })
}
</script>

<style scoped>
.group-title {
  background-color: rgba(var(--v-theme-primary), 0.12);
  font-weight: bold;
}

.exercise-option:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.exercise-option.selected {
  border-left: 4px solid rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.06);
}
</style>
