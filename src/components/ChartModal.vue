<script setup>
import InlineChart from './InlineChart.vue'

const { visible, exerciseName } = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
  exerciseName: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['close'])

const closeModal = () => {
  emit('close')
}
</script>

<template>
  <transition enter-active-class="transition-opacity duration-300 ease-out" leave-active-class="transition-opacity duration-200 ease-in" enter-from-class="opacity-0" leave-to-class="opacity-0">
    <div v-if="visible" @click.self="closeModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <transition enter-active-class="transition-all duration-300 ease-out" leave-active-class="transition-all duration-200 ease-in" enter-from-class="opacity-0 transform -translate-y-8" leave-to-class="opacity-0 transform -translate-y-8">
        <div v-if="visible" class="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-6 mx-4">
          <header class="flex justify-between items-center border-b border-gray-700 pb-4 mb-4">
            <h2 class="text-2xl font-bold text-white">{{ exerciseName }} - 趨勢分析</h2>
            <button @click="closeModal" class="text-gray-400 hover:text-white text-3xl font-bold">&times;</button>
          </header>
          <main>
            <InlineChart :exercise-name="exerciseName" />
          </main>
        </div>
      </transition>
    </div>
  </transition>
</template>
