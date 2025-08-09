<template>
  <div class="skeleton-loader" :class="containerClass">
    <!-- 訓練組數骨架 -->
    <template v-if="type === 'workout-set'">
      <v-card class="mb-2" :elevation="1" rounded="lg">
        <v-card-text class="pa-3">
          <v-row align="center" no-gutters>
            <v-col cols="auto" class="pr-3">
              <v-skeleton-loader type="chip" width="40" height="24" />
            </v-col>
            <v-col cols="4">
              <v-skeleton-loader type="text-field" />
            </v-col>
            <v-col cols="auto" class="px-2">
              <v-skeleton-loader type="icon" width="24" height="24" />
            </v-col>
            <v-col cols="4">
              <v-skeleton-loader type="text-field" />
            </v-col>
            <v-col cols="auto" class="pl-3">
              <v-skeleton-loader type="button" width="40" height="40" />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </template>

    <!-- 運動卡片骨架 -->
    <template v-else-if="type === 'exercise-card'">
      <v-card class="mb-4" :elevation="2" rounded="lg">
        <v-card-text class="pa-4">
          <div class="d-flex align-center mb-3">
            <v-skeleton-loader type="avatar" class="mr-3" />
            <div class="flex-grow-1">
              <v-skeleton-loader type="heading" width="60%" class="mb-1" />
              <v-skeleton-loader type="text" width="40%" />
            </div>
          </div>
          <v-skeleton-loader type="paragraph" />
          <div class="d-flex justify-end mt-3">
            <v-skeleton-loader type="button" width="80" class="mr-2" />
            <v-skeleton-loader type="button" width="80" />
          </div>
        </v-card-text>
      </v-card>
    </template>

    <!-- 圖表骨架 -->
    <template v-else-if="type === 'chart'">
      <v-card :elevation="2" rounded="lg">
        <v-card-text class="pa-4">
          <v-skeleton-loader type="heading" width="40%" class="mb-4" />
          <div class="chart-skeleton" :style="{ height: chartHeight + 'px' }">
            <div class="chart-bars">
              <div 
                v-for="i in 8" 
                :key="i" 
                class="chart-bar"
                :style="{ height: Math.random() * 80 + 20 + '%' }"
              />
            </div>
          </div>
        </v-card-text>
      </v-card>
    </template>

    <!-- 儀表板統計骨架 -->
    <template v-else-if="type === 'dashboard-stats'">
      <v-row>
        <v-col v-for="i in 4" :key="i" cols="6" md="3">
          <v-card :elevation="2" rounded="lg">
            <v-card-text class="text-center pa-4">
              <v-skeleton-loader type="icon" width="48" height="48" class="mx-auto mb-2" />
              <v-skeleton-loader type="heading" width="80%" class="mb-1" />
              <v-skeleton-loader type="text" width="60%" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- 列表項目骨架 -->
    <template v-else-if="type === 'list-item'">
      <v-list-item class="mb-1">
        <template v-slot:prepend>
          <v-skeleton-loader type="avatar" />
        </template>
        <v-list-item-title>
          <v-skeleton-loader type="text" width="70%" />
        </v-list-item-title>
        <v-list-item-subtitle>
          <v-skeleton-loader type="text" width="50%" />
        </v-list-item-subtitle>
        <template v-slot:append>
          <v-skeleton-loader type="button" width="32" height="32" />
        </template>
      </v-list-item>
    </template>

    <!-- 表格骨架 -->
    <template v-else-if="type === 'table'">
      <v-table>
        <thead>
          <tr>
            <th v-for="i in columns" :key="i">
              <v-skeleton-loader type="text" width="80%" />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in rows" :key="i">
            <td v-for="j in columns" :key="j">
              <v-skeleton-loader type="text" width="90%" />
            </td>
          </tr>
        </tbody>
      </v-table>
    </template>

    <!-- 通用內容骨架 -->
    <template v-else>
      <v-skeleton-loader
        :type="type"
        :width="width"
        :height="height"
        :class="skeletonClass"
      />
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'paragraph',
    validator: (value) => [
      'workout-set',
      'exercise-card', 
      'chart',
      'dashboard-stats',
      'list-item',
      'table',
      'paragraph',
      'heading',
      'text',
      'button',
      'avatar',
      'chip',
      'icon'
    ].includes(value)
  },
  width: {
    type: [String, Number],
    default: '100%'
  },
  height: {
    type: [String, Number],
    default: 'auto'
  },
  rows: {
    type: Number,
    default: 3
  },
  columns: {
    type: Number,
    default: 4
  },
  chartHeight: {
    type: Number,
    default: 300
  },
  class: {
    type: String,
    default: ''
  }
})

const containerClass = computed(() => `skeleton-container ${props.class}`)
const skeletonClass = computed(() => 'skeleton-item')
</script>

<style scoped>
.skeleton-loader {
  animation: pulse 1.5s ease-in-out infinite;
}

.chart-skeleton {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: end;
}

.chart-bars {
  display: flex;
  align-items: end;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  gap: 8px;
}

.chart-bar {
  background: linear-gradient(
    to top,
    rgba(var(--v-theme-primary), 0.3),
    rgba(var(--v-theme-primary), 0.1)
  );
  border-radius: 4px 4px 0 0;
  flex: 1;
  min-height: 20%;
  animation: chartPulse 2s ease-in-out infinite;
}

.chart-bar:nth-child(even) {
  animation-delay: 0.2s;
}

.chart-bar:nth-child(3n) {
  animation-delay: 0.4s;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

@keyframes chartPulse {
  0%, 100% {
    opacity: 0.3;
    transform: scaleY(1);
  }
  50% {
    opacity: 0.6;
    transform: scaleY(1.1);
  }
}

/* 深色主題調整 */
.v-theme--dark .chart-skeleton {
  background: rgba(255, 255, 255, 0.05);
}

.v-theme--dark .chart-bar {
  background: linear-gradient(
    to top,
    rgba(var(--v-theme-primary), 0.4),
    rgba(var(--v-theme-primary), 0.2)
  );
}
</style>