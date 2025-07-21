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
  
  const repsValue = parseFloat(reps.value)
  const weightValue = parseFloat(weight.value)

  if (isNaN(repsValue) || repsValue <= 0) {
    return true
  }
  
  if (isNaN(weightValue) || weightValue < 0) { // Allow 0 weight
    return true
  }

  return false
})

const handleComplete = () => {
  if (!isButtonDisabled.value) {
    emit('complete-set')
  }
}

const adjustWeight = (amount) => {
  const currentWeight = parseFloat(weight.value) || 0
  const newWeight = Math.max(0, currentWeight + amount)
  setWeight(newWeight)
}
</script>

<template>
  <div
    v-if="isCompleted !== undefined"
    class="grid grid-cols-12 gap-2 items-center rounded-lg transition-all duration-300"
    :class="{
      'bg-green-800/60 border-l-4 border-green-500 p-2': isCompleted,
      'bg-gray-700 p-3': !isCompleted,
    }"
  >
    <!-- Set Number -->
    <div class="col-span-1 text-center">
      <span
        class="font-semibold text-gray-300 transition-all duration-300"
        :class="isCompleted ? 'text-base' : 'text-lg'"
      >{{ setIndex + 1 }}</span>
    </div>

    <!-- Reps Input -->
    <div class="col-span-3">
      <Field
        :name="`exercises[${exIndex}].sets[${setIndex}].reps`"
        type="number"
        placeholder="次"
        class="w-full bg-gray-600 border-gray-500 rounded-md text-white text-center transition-all duration-300"
        :class="isCompleted ? 'p-2 text-base h-10' : 'p-3 text-lg h-12'"
        :disabled="isCompleted"
      />
    </div>

    <!-- Weight Input with Adjust Buttons -->
    <div class="col-span-4 relative">
      <Field
        :name="`exercises[${exIndex}].sets[${setIndex}].weight`"
        type="number"
        placeholder="kg"
        step="0.5"
        class="w-full bg-gray-600 border-gray-500 rounded-md text-white text-center transition-all duration-300"
        :class="isCompleted ? 'p-2 pr-8 text-base h-10' : 'p-3 pr-10 text-lg h-12'"
        :disabled="isCompleted"
      />
      <div 
        class="absolute inset-y-0 right-0 flex flex-col items-center justify-center rounded-r-md transition-all duration-300"
        :class="isCompleted ? 'w-8' : 'w-10'"
      >
        <button @click="adjustWeight(2.5)" type="button" class="h-1/2 w-full flex items-center justify-center text-blue-400 hover:text-blue-300 disabled:text-gray-500" :disabled="isCompleted">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7" /></svg>
        </button>
        <button @click="adjustWeight(-2.5)" type="button" class="h-1/2 w-full flex items-center justify-center text-red-400 hover:text-red-300 disabled:text-gray-500" :disabled="isCompleted">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>
    </div>

    <!-- Action Button -->
    <div class="col-span-4">
      <button
        @click="handleComplete"
        type="button"
        :disabled="isButtonDisabled"
        class="w-full flex items-center justify-center rounded-md transition-all duration-300"
        :class="[
          isCompleted
            ? 'bg-green-600/80 text-white h-10'
            : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-500 disabled:cursor-not-allowed h-12',
        ]"
      >
        <svg v-if="isCompleted" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        <span v-else class="font-semibold" :class="isCompleted ? 'text-base' : 'text-lg'">完成</span>
      </button>
    </div>
  </div>
</template>