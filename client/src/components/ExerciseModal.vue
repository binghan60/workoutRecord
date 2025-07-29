<template>
  <v-dialog v-model="modalStore.isExerciseModalOpen" max-width="500px" @update:model-value="handleClose">
    <v-card>
      <v-card-title class="text-h5">選擇動作</v-card-title>
      <v-card-text>
        <v-list>
          <template v-for="group in groupedExercises" :key="group.groupName">
            <v-list-subheader>{{ group.groupName }}</v-list-subheader>
            <v-list-item v-for="exercise in group.exercises" :key="exercise._id" :title="exercise.name" @click="selectExercise(exercise._id)">
              <template v-slot:prepend>
                <v-icon :color="getMuscleGroupColor(group.groupName)">mdi-circle-small</v-icon>
              </template>
            </v-list-item>
          </template>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" text @click="handleClose">取消</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useModalStore } from '@/stores/modal'
import { useExerciseStore } from '@/stores/exercise'
import { getMuscleGroupColor } from '@/utils/colorUtils'

const modalStore = useModalStore()
const exerciseStore = useExerciseStore()

const groupedExercises = computed(() => exerciseStore.groupedAllExercises)

const selectExercise = (exerciseId) => {
  modalStore.selectedExerciseId = exerciseId
  modalStore.hideExerciseModal()
}

const handleClose = () => {
  modalStore.hideExerciseModal()
}
</script>
