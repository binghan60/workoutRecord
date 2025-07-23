<template>
  <v-sheet v-if="isCompleted !== undefined" :color="isCompleted ? 'green-darken-4' : 'grey-darken-3'" rounded="lg" class="pa-2 transition-swing">
    <v-row align="center" no-gutters>
      <!-- Set Number -->
      <v-col cols="1" class="text-center">
        <span class="text-h6 font-weight-bold">{{ setIndex + 1 }}</span>
      </v-col>

      <!-- Reps Input -->
      <v-col cols="3">
        <Field :name="`exercises[${exIndex}].sets[${setIndex}].reps`" v-slot="{ field, errors }">
          <v-text-field v-bind="field" type="number" label="次數" variant="solo" density="compact" hide-details :disabled="isCompleted" class="text-center"></v-text-field>
        </Field>
      </v-col>

      <!-- Weight Input -->
      <v-col cols="4">
        <Field :name="`exercises[${exIndex}].sets[${setIndex}].weight`" v-slot="{ field, errors }">
          <v-text-field v-bind="field" type="number" label="重量(kg)" variant="solo" density="compact" hide-details :disabled="isCompleted" step="0.5" class="text-center">
            <template v-slot:prepend-inner>
              <v-btn icon="mdi-minus" size="x-small" variant="text" @click="adjustWeight(-2.5)" :disabled="isCompleted"></v-btn>
            </template>
            <template v-slot:append-inner>
              <v-btn icon="mdi-plus" size="x-small" variant="text" @click="adjustWeight(2.5)" :disabled="isCompleted"></v-btn>
            </template>
          </v-text-field>
        </Field>
      </v-col>

      <!-- Action Button -->
      <v-col cols="4" class="pl-2">
        <v-btn @click="handleComplete" :disabled="isButtonDisabled" :color="isCompleted ? 'green' : 'primary'" block height="48">
          <v-icon v-if="isCompleted">mdi-check</v-icon>
          <span v-else class="font-weight-bold">完成</span>
        </v-btn>
      </v-col>
    </v-row>
  </v-sheet>
</template>

<script setup>
import { computed } from 'vue'
import { Field, useField } from 'vee-validate'

const props = defineProps({
  setIndex: Number,
  exIndex: Number,
})

const emit = defineEmits(['complete-set'])

const { value: reps } = useField(() => `exercises[${props.exIndex}].sets[${props.setIndex}].reps`)
const { value: weight, setValue: setWeight } = useField(() => `exercises[${props.exIndex}].sets[${props.setIndex}].weight`)
const { value: isCompleted } = useField(() => `exercises[${props.exIndex}].sets[${props.setIndex}].isCompleted`)

const isButtonDisabled = computed(() => {
  if (isCompleted.value) return true
  const repsValue = parseFloat(reps.value)
  const weightValue = parseFloat(weight.value)
  return isNaN(repsValue) || repsValue <= 0 || isNaN(weightValue) || weightValue < 0
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
