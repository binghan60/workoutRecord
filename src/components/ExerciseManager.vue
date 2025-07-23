<template>
  <!-- 新增動作表單 -->
  <v-card class="mb-8">
    <v-card-title class="text-h6">新增訓練動作</v-card-title>
    <v-card-text>
      <v-form @submit.prevent="handleAddExercise">
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
        <v-expansion-panels>
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
import { getMuscleGroupColor } from '@/utils/colorUtils'

const exerciseStore = useExerciseStore()
const modalStore = useModalStore()

const newExercise = ref({
  name: '',
  group: '',
})

const rules = {
  required: (value) => !!value || '此欄位為必填',
}

const handleAddExercise = () => {
  if (newExercise.value.name && newExercise.value.group) {
    exerciseStore.addExercise(newExercise.value.name, newExercise.value.group)
    newExercise.value.name = ''
    newExercise.value.group = ''
  }
}

const confirmDeleteExercise = (exercise) => {
  modalStore.showConfirmation('確認刪除', `您確定要刪除「${exercise.name}」這個訓練動作嗎？`, () => {
    exerciseStore.deleteExercise(exercise.id)
  })
}
</script>
