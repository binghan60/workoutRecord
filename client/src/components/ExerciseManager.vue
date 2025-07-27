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
    <v-card-title class="text-h6">我的動作清單</v-card-title>
    <v-card-text>
      <div v-if="Object.keys(exerciseStore.groupedExercises).length > 0">
        <v-expansion-panels multiple>
          <v-expansion-panel v-for="(group, groupName) in exerciseStore.groupedExercises" :key="groupName">
            <v-expansion-panel-title :style="{ backgroundColor: getMuscleGroupColor(groupName) }">
              {{ groupName }}
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-list lines="one" density="compact">
                <v-list-item v-for="exercise in group" :key="exercise.id" :title="exercise.name" class="px-0">
                  <template v-slot:append>
                    <v-btn v-if="exercise.isCustom" icon="mdi-delete" variant="text" color="grey" @click="confirmDeleteExercise(exercise)"></v-btn>
                    <v-chip v-else size="small" variant="tonal">內建</v-chip>
                  </template>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
      <div v-else class="text-center text-grey-darken-1 py-8">
        <p>尚未新增任何動作。</p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'
import { useExerciseStore } from '@/stores/exercise'
import { useModalStore } from '@/stores/modal'
import { useTemplateStore } from '@/stores/template'
import { getMuscleGroupColor } from '@/utils/colorUtils'

const exerciseStore = useExerciseStore()
const modalStore = useModalStore()
const templateStore = useTemplateStore()

// 添加表單引用
const formRef = ref(null)

const newExercise = ref({
  name: '',
  group: '',
})

const rules = {
  required: (value) => !!value || '此欄位為必填',
}

const handleAddExercise = async () => {
  // 先驗證表單
  const { valid } = await formRef.value.validate()

  if (valid) {
    // 表單驗證通過，執行新增
    exerciseStore.addExercise(newExercise.value.name, newExercise.value.group)

    // 清空表單資料
    newExercise.value.name = ''
    newExercise.value.group = ''

    // 重置表單驗證狀態
    formRef.value.reset()
  }
}

const confirmDeleteExercise = (exercise) => {
  const exerciseName = exercise.name
  const affectedTemplates = []
  const deletedTemplates = []

  // Check for consequences before showing the modal
  templateStore.templates.forEach((template) => {
    const containsExercise = template.exercises.some((ex) => ex.name === exerciseName)
    if (containsExercise) {
      if (template.exercises.length === 1) {
        deletedTemplates.push(template.name)
      } else {
        affectedTemplates.push(template.name)
      }
    }
  })

  // Build the dynamic, itemized message
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

  // Show the confirmation modal with the detailed message
  modalStore.showConfirmation('確認刪除', message, () => {
    exerciseStore.deleteExercise(exercise._id)
  })
}
</script>
