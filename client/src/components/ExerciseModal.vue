<template>
  <v-dialog v-model="modalStore.isExerciseModalOpen" max-width="500px" @update:model-value="handleClose">
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h5">選擇動作</span>
        <v-switch
          v-model="showBuiltIn"
          label="顯示內建動作"
          color="primary"
          hide-details
          density="compact"
          class="flex-grow-0"
          @change="savePreference"
        ></v-switch>
      </v-card-title>
      <v-card-text>
        <v-list>
          <template v-for="group in groupedExercises" :key="group.groupName">
            <v-list-subheader>{{ group.groupName }}</v-list-subheader>
            <v-list-item v-for="exercise in group.exercises" :key="exercise._id" :title="exercise.name" @click="selectExercise(exercise._id)">
              <template v-slot:prepend>
                <v-icon :color="getMuscleGroupColor(group.groupName)">mdi-circle-small</v-icon>
              </template>
              <template v-slot:append>
                <v-chip v-if="!exercise.isCustom" color="grey" size="small" variant="tonal"> 內建 </v-chip>
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
import { computed, ref, onMounted } from 'vue'
import { useModalStore } from '@/stores/modal'
import { useExerciseStore } from '@/stores/exercise'
import { getMuscleGroupColor } from '@/utils/colorUtils'

const modalStore = useModalStore()
const exerciseStore = useExerciseStore()

// `showBuiltIn` controls whether to include built-in exercises.
// true = show all (built-in + custom), false = show custom only.
const showBuiltIn = ref(true)

onMounted(() => {
  const savedPreference = localStorage.getItem('showBuiltInExercises')
  // If no preference is saved, default to true (showing all exercises).
  showBuiltIn.value = savedPreference !== 'false'
})

const groupedExercises = computed(() => {
  // If `showBuiltIn` is true, show all exercises. Otherwise, show only custom ones.
  return showBuiltIn.value ? exerciseStore.groupedAllExercises : exerciseStore.groupedCustomExercises
})

const selectExercise = (exerciseId) => {
  modalStore.selectedExerciseId = exerciseId
  modalStore.hideExerciseModal()
}

const handleClose = () => {
  modalStore.hideExerciseModal()
}

// Save the user's preference to localStorage.
const savePreference = () => {
  localStorage.setItem('showBuiltInExercises', showBuiltIn.value)
}
</script>