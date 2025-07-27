<template>
  <v-overlay
    :model-value="uiStore.isLoading"
    class="d-flex align-center justify-center"
    persistent
  >
    <v-progress-circular
      color="primary"
      indeterminate
      size="64"
    ></v-progress-circular>
  </v-overlay>
</template>

<script setup>
import { useUIStore } from '@/stores/ui'
const uiStore = useUIStore()
</script>
