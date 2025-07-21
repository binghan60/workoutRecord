<script setup>
import { ref } from 'vue'
import TemplateManager from '@/components/TemplateManager.vue'
import ExerciseManager from '@/components/ExerciseManager.vue'
import WeeklyScheduler from '@/components/WeeklyScheduler.vue'

const activeTab = ref('exercises')
</script>

<template>
  <div class="p-4 sm:p-6 md:p-8">
    <div class="border-b border-gray-300">
      <nav class="-mb-px flex space-x-4" aria-label="Tabs">
        <button :class="['shrink-0 border-b-2 px-1 pb-2 text-md font-medium', activeTab === 'exercises' ? 'border-cyan-500 text-cyan-400' : 'border-transparent hover:border-gray-300 hover:text-gray-700']" @click="activeTab = 'exercises'">動作管理</button>
        <button :class="['shrink-0 border-b-2 px-1 pb-2 text-md font-medium', activeTab === 'templates' ? 'border-cyan-500 text-cyan-400' : 'border-transparent hover:border-gray-300 hover:text-gray-700']" @click="activeTab = 'templates'">模板管理</button>
        <button :class="['shrink-0 border-b-2 px-1 pb-2 text-md font-medium', activeTab === 'schedule' ? 'border-cyan-500 text-cyan-400' : 'border-transparent hover:border-gray-300 hover:text-gray-700']" @click="activeTab = 'schedule'">訓練排程</button>
      </nav>
    </div>

    <div class="mt-6">
      <div v-show="activeTab === 'templates'">
        <TemplateManager />
      </div>
      <div v-show="activeTab === 'exercises'">
        <ExerciseManager />
      </div>
      <div v-show="activeTab === 'schedule'">
        <WeeklyScheduler />
      </div>
    </div>
  </div>
</template>
