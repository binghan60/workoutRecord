<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 shadow-lg z-50 sm:hidden">
    <div class="flex justify-around h-16">
      <!-- 統計 (Dashboard/Stats) -->
      <RouterLink to="/" class="flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors duration-200 flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 16h4V8H4v8zm6 0h4V4h-4v12zm6 0h4v-4h-4v4z" />
        </svg>
        <span class="text-xs mt-1">統計</span>
      </RouterLink>
      <!-- 訓練 (Workout) -->
      <RouterLink to="/workout" class="flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors duration-200 flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
        </svg>
        <span class="text-xs mt-1">訓練</span>
      </RouterLink>
      <!-- 紀錄 (History) -->
      <RouterLink to="/history" class="flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors duration-200 flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M10 12H7v4h3v-4z" />
        </svg>
        <span class="text-xs mt-1">紀錄</span>
      </RouterLink>
      <!-- 動作 (Exercises) -->
      <RouterLink to="/exercises" class="flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors duration-200 flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <span class="text-xs mt-1">動作</span>
      </RouterLink>
      <!-- 課表 (Templates) -->
      <RouterLink to="/templates" class="flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors duration-200 flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm0 18H6V4h7v5h5v11zM8 12h8v2H8zm0 4h8v2H8z" />
        </svg>
        <span class="text-xs mt-1">課表</span>
      </RouterLink>
      <!-- 排程 (Schedule) -->
      <RouterLink to="/schedule" class="flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors duration-200 flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 4h-2V2h-2v2H9V2H7v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM5 7V6h14v1h-14z" />
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
