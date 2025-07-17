<script setup>
import { useUiStore } from '@/stores/ui'
const uiStore = useUiStore()
</script>

<template>
  <transition enter-active-class="transition-opacity duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-opacity duration-300 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
    <div v-if="uiStore.isLoading" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-70">
      <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-400"></div>
    </div>
  </transition>
</template>
