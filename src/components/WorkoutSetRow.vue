<script setup>
import { computed } from 'vue'
import { Field, useField } from 'vee-validate'

const props = defineProps({
  setIndex: Number,
  exIndex: Number,
})

const emit = defineEmits(['complete-set'])

// Directly tap into the form's state using the field's path
const { value: reps } = useField(() => `exercises[${props.exIndex}].sets[${props.setIndex}].reps`)
const { value: weight, setValue: setWeight } = useField(() => `exercises[${props.exIndex}].sets[${props.setIndex}].weight`)
const { value: isCompleted } = useField(() => `exercises[${props.exIndex}].sets[${props.setIndex}].isCompleted`)

const isButtonDisabled = computed(() => {
  if (isCompleted.value) {
    return true
  }
  
  // Use parseFloat to handle string inputs and check for valid numbers > 0
  const repsValue = parseFloat(reps.value)
  const weightValue = parseFloat(weight.value)

  // Disable if reps are not a number or are less than or equal to 0
  if (isNaN(repsValue) || repsValue <= 0) {
    return true
  }
  
  // Disable if weight is not a number or is less than or equal to 0
  if (isNaN(weightValue) || weightValue <= 0) {
    return true
  }

  return false
})

const handleComplete = () => {
  // Emit only if the button is not disabled
  if (!isButtonDisabled.value) {
    emit('complete-set')
  }
}

const adjustWeight = (amount) => {
  const currentWeight = parseFloat(weight.value) || 0
  const newWeight = Math.max(0, currentWeight + amount) // Ensure weight doesn't go below 0
  setWeight(newWeight)
}
</script>

<template>
  <!-- The component will only render when isCompleted has a value, preventing race conditions -->
  <div
    v-if="isCompleted !== undefined"
    class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2 rounded-lg"
    :class="{
      'bg-green-800/50 border-l-4 border-green-400': isCompleted,
      'bg-gray-700': !isCompleted,
    }"
  >
    <!-- Set Number -->
    <div class="col-span-1 sm:col-span-1 text-center">
      <span class="text-lg font-bold text-gray-300">{{ setIndex + 1 }}</span>
    </div>

    <!-- Reps Input -->
    <div class="col-span-1 sm:col-span-3">
      <Field
        :name="`exercises[${exIndex}].sets[${setIndex}].reps`"
        type="number"
        placeholder="次數"
        class="w-full bg-gray-600 border-gray-500 rounded-md p-3 text-white text-center text-xl h-full"
        :disabled="isCompleted"
      />
    </div>

    <!-- Weight Input with Adjust Buttons -->
    <div class="col-span-1 sm:col-span-5 relative">
      <Field
        :name="`exercises[${exIndex}].sets[${setIndex}].weight`"
        type="number"
        placeholder="重量"
        step="0.5"
        class="w-full bg-gray-600 border-gray-500 rounded-md p-3 pr-10 text-white text-center text-xl h-full"
        :disabled="isCompleted"
      />
      <div class="absolute inset-y-0 right-0 flex flex-col items-center justify-center bg-gray-700/50 rounded-r-md">
        <button @click="adjustWeight(5)" type="button" class="h-1/2 px-2 text-blue-400 hover:text-blue-300 disabled:text-gray-500" :disabled="isCompleted">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7" /></svg>
        </button>
        <button @click="adjustWeight(-5)" type="button" class="h-1/2 px-2 text-red-400 hover:text-red-300 disabled:text-gray-500" :disabled="isCompleted">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>
    </div>

    <!-- Action Button -->
    <div class="col-span-1 sm:col-span-3">
      <button
        @click="handleComplete"
        type="button"
        :disabled="isButtonDisabled"
        class="w-full h-full flex items-center justify-center rounded-md transition-colors"
        :class="[
          isCompleted
            ? 'bg-green-500 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-500 disabled:cursor-not-allowed',
        ]"
      >
        <svg v-if="isCompleted" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        <span v-else class="text-lg font-bold">完成</span>
      </button>
    </div>
  </div>
</template>