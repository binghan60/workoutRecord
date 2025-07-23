<script setup>
import { computed } from 'vue'
import { useModalStore } from '@/stores/modal'
import { useExerciseStore } from '@/stores/exercise'

const modalStore = useModalStore()
const exerciseStore = useExerciseStore()

const groupedExercises = computed(() => exerciseStore.groupedExercises)

const selectExercise = (exerciseId) => {
  modalStore.selectedExerciseId = exerciseId
  modalStore.hideExerciseModal()
}
</script>

<template>
  <div
    v-if="modalStore.isExerciseModalOpen"
    class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
    @click.self="modalStore.hideExerciseModal"
  >
    <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
      <div class="p-4 border-b border-gray-700">
        <h2 class="text-xl font-bold text-white">選擇動作</h2>
      </div>
      <div class="p-4 overflow-y-auto">
        <div v-for="(group, groupName) in groupedExercises" :key="groupName" class="mb-4">
          <h3 class="text-lg font-semibold text-gray-400 mb-2">{{ groupName }}</h3>
          <ul class="space-y-2">
            <li v-for="exercise in group" :key="exercise.id">
              <button
                @click="selectExercise(exercise.id)"
                class="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors duration-200"
              >
                {{ exercise.name }}
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div class="p-4 border-t border-gray-700">
        <button
          @click="modalStore.hideExerciseModal"
          class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>
