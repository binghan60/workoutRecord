<template>
  <div :class="['pa-2 rounded-lg transition-all duration-300', isCompleted ? 'bg-green-darken-4' : 'bg-grey-darken-3']">
    <v-row align="center" no-gutters>
      <!-- Set Number Chip -->
      <v-col cols="auto" class="pr-2">
        <v-chip color="primary" size="small" label class="font-weight-bold">
          {{ setIndex + 1 }}
        </v-chip>
      </v-col>

      <!-- Reps Input -->
      <v-col>
        <Field :name="`exercises[${exIndex}].sets[${setIndex}].reps`" v-slot="{ field, value }">
          <v-text-field v-bind="field" type="number" variant="solo" density="compact" hide-details suffix="reps" :readonly="isCompleted" :model-value="value" />
        </Field>
      </v-col>

      <v-col cols="auto" class="px-2">
        <v-icon>mdi-close</v-icon>
      </v-col>

      <!-- Weight Input -->
      <v-col>
        <Field :name="`exercises[${exIndex}].sets[${setIndex}].weight`" v-slot="{ field, value }">
          <v-text-field v-bind="field" type="number" variant="solo" density="compact" hide-details suffix="kg" :readonly="isCompleted" :model-value="value" />
        </Field>
      </v-col>

      <!-- Action Button -->
      <v-col cols="auto" class="pl-2">
        <v-btn v-if="!isCompleted" @click="handleComplete" :disabled="isButtonDisabled" color="primary" icon="mdi-check" size="small" />
        <v-icon v-else color="success" size="large">mdi-check-circle</v-icon>
      </v-col>
    </v-row>
  </div>
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
const { value: weight } = useField(() => `exercises[${props.exIndex}].sets[${props.setIndex}].weight`)
const { value: isCompleted } = useField(() => `exercises[${props.exIndex}].sets[${props.setIndex}].isCompleted`)

const isButtonDisabled = computed(() => {
  const repsValue = parseFloat(reps.value)
  const weightValue = parseFloat(weight.value)
  return isNaN(repsValue) || repsValue <= 0 || isNaN(weightValue) || weightValue < 0
})

const handleComplete = () => {
  if (!isButtonDisabled.value) {
    emit('complete-set')
  }
}
</script>
