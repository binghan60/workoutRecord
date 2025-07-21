<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 shadow-lg z-50 sm:hidden">
    <div class="flex justify-around h-16">
      <!-- 首頁 -->
      <RouterLink to="/" class="flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors duration-200 flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-7 4h6" />
        </svg>
        <span class="text-xs mt-1">統計</span>
      </RouterLink>
      <!-- 訓練 -->
      <RouterLink to="/workout" class="flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors duration-200 flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
        </svg>
        <span class="text-xs mt-1">訓練</span>
      </RouterLink>
      <!-- 紀錄 -->
      <RouterLink to="/history" class="flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors duration-200 flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M10 12H7v4h3v-4z" />
        </svg>
        <span class="text-xs mt-1">紀錄</span>
      </RouterLink>
      <!-- 動作 -->
      <RouterLink to="/exercises" class="flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors duration-200 flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <span class="text-xs mt-1">動作</span>
      </RouterLink>
      <!-- 課表 -->
      <RouterLink to="/templates" class="flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors duration-200 flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span class="text-xs mt-1">課表</span>
      </RouterLink>
      <!-- 排程 -->
      <RouterLink to="/schedule" class="flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors duration-200 flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span class="text-xs mt-1">排程</span>
      </RouterLink>
    </div>
  </nav>
</template>

<style scoped>
.router-link-active {
  color: #3b82f6; /* blue-500 */
}
</style>
