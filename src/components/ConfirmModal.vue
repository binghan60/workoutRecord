<script setup>
import { useModalStore } from '@/stores/modal'

const modalStore = useModalStore()
</script>

<template>
  <transition enter-active-class="transition-opacity duration-300 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
    <div v-if="modalStore.isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100" leave-active-class="transition-all duration-200 ease-in" leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
        <div v-if="modalStore.isOpen" class="w-full max-w-md p-6 bg-gray-800 rounded-lg shadow-xl border border-gray-700">
          <h2 class="text-2xl font-bold text-white mb-4">{{ modalStore.title }}</h2>
          <p class="text-gray-300 mb-6">{{ modalStore.message }}</p>
          <div class="flex justify-end space-x-4">
            <button @click="modalStore.hideConfirmation" class="px-6 py-2 rounded-md text-white bg-gray-600 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 transition">取消</button>
            <button @click="modalStore.confirm" class="px-6 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-600 transition">確認</button>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>
