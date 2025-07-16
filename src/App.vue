<script setup>
import { RouterLink, RouterView } from 'vue-router'
import ConfirmModal from '@/components/ConfirmModal.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
</script>

<template>
  <div class="bg-gray-900 text-white min-h-screen font-sans">
    <header class="bg-gray-800 shadow-md">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="text-2xl font-bold text-white">
            <RouterLink to="/">健身紀錄</RouterLink>
          </div>
          <div class="flex flex-wrap items-center space-x-2">
            <RouterLink to="/workout" class="px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-300">立即開始</RouterLink>
            <RouterLink to="/history" class="px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-300">訓練紀錄</RouterLink>
            <RouterLink to="/templates" class="px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-300">自訂課表</RouterLink>
            <RouterLink to="/exercises" class="px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-300">自訂動作</RouterLink>
          </div>
        </div>
      </nav>
    </header>

    <main class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <ConfirmModal />
    <LoadingOverlay />
  </div>
</template>

<style>
.router-link-active {
  background-color: rgb(55 65 81); /* bg-gray-700 */
  color: rgb(255 255 255); /* text-white */
  font-weight: 600; /* font-semibold */
}

/* .fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
} */
</style>
