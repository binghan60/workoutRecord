<script setup>
import { RouterLink, RouterView } from 'vue-router'
import ConfirmModal from '@/components/ConfirmModal.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import MobileNavBar from '@/components/MobileNavBar.vue'
</script>

<template>
  <div id="app-shell" class="flex flex-col h-screen bg-gray-900 text-white font-sans">
    <main class="flex-grow overflow-y-auto pb-20 sm:pb-4">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <ConfirmModal />
    <LoadingOverlay />
    <MobileNavBar />
  </div>
</template>

<style>
.router-link-active {
  /* In MobileNavBar, active styles are handled differently */
}

#app-shell main a {
  color: #3b82f6; /* blue-500 */
  text-decoration: underline;
}

/* Keep the fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
