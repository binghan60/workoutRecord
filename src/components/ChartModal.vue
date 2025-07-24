<template>
  <v-dialog :model-value="visible" @update:model-value="$emit('close')" max-width="900px">
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ exerciseName }} - 趨勢分析</span>
        <v-btn icon="mdi-close" variant="text" @click="$emit('close')"></v-btn>
      </v-card-title>
      <v-card-text>
        <InlineChart :exercise-name="exerciseName" :visible="visible" />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import InlineChart from './InlineChart.vue'

defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
  exerciseName: {
    type: String,
    required: true,
  },
})

defineEmits(['close'])
</script>
