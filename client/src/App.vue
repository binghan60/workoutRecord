<template>
  <v-app>
    <template v-if="authStore.isAuthenticated">
      <!-- 響應式導航抽屜 -->
      <v-navigation-drawer v-model="drawer" :rail="drawerBehavior.rail" :temporary="drawerBehavior.temporary" :permanent="drawerBehavior.permanent" :width="280" app class="navigation-drawer">
        <!-- 用戶資料區塊 -->
        <div class="user-profile pa-4" v-if="!drawerBehavior.temporary">
          <div class="d-flex align-center">
            <v-avatar :size="responsiveSizes.avatar" :color="$vuetify.theme.current.dark ? 'surface-variant' : 'primary'" class="mr-3">
              <span class="font-weight-bold">
                {{ authStore.user?.username?.charAt(0).toUpperCase() }}
              </span>
            </v-avatar>
            <div class="flex-grow-1" style="min-width: 0">
              <p class="text-body-1 font-weight-medium mb-0 text-truncate">
                {{ authStore.user?.username }}
              </p>
              <p class="text-caption text-medium-emphasis mb-0 text-truncate">
                {{ authStore.user?.email }}
              </p>
            </div>
          </div>
        </div>

        <v-divider v-if="!drawerBehavior.temporary" />

        <!-- 導航項目 -->
        <v-list nav :density="density">
          <v-list-item v-for="item in navItems" :key="item.title" :to="item.to" :prepend-icon="item.icon" :title="item.title" :value="item.to" color="primary" class="nav-item" :class="{ 'nav-item--active': $route.path === item.to }">
            <!-- 通知徽章 -->
            <template v-slot:append v-if="item.badge">
              <v-badge :content="item.badge" color="error" :size="responsiveSizes.chip === 'small' ? 'small' : 'default'" />
            </template>
          </v-list-item>
        </v-list>

        <!-- 快速操作（抽屜底部） -->
        <template v-slot:append v-if="!drawerBehavior.temporary">
          <div class="pa-2">
            <v-divider class="mb-2" />
            <v-list density="compact">
              <v-list-item @click="uiStore.toggleTheme" prepend-icon="mdi-theme-light-dark" title="切換主題" class="quick-action" />
            </v-list>
          </div>
        </template>
      </v-navigation-drawer>

      <!-- 應用程式列 -->
      <v-app-bar app :color="$vuetify.theme.current.dark ? 'surface' : 'primary'" :elevation="mobile ? 2 : 1" class="app-bar">
        <!-- 選單按鈕 -->
        <v-app-bar-nav-icon @click="drawer = !drawer" :aria-label="drawer ? '關閉選單' : '開啟選單'" />

        <!-- 頁面標題與麵包屑 -->
        <div class="d-flex align-center flex-grow-1">
          <div class="page-title">
            <h1 :class="typographyScale.h3" class="font-weight-bold">
              {{ currentRouteTitle }}
            </h1>
            <v-breadcrumbs v-if="breadcrumbs.length > 1 && !mobile" :items="breadcrumbs" density="compact" class="pa-0">
              <template v-slot:divider>
                <v-icon size="small">mdi-chevron-right</v-icon>
              </template>
            </v-breadcrumbs>
          </div>
        </div>

        <v-spacer />

        <!-- 操作按鈕 -->
        <div class="d-flex align-center">
          <!-- PWA status light in navbar -->
          <div class="d-flex align-center mr-4" aria-label="連線狀態">
            <v-icon :color="statusLight.color" size="14" class="mr-1">mdi-circle</v-icon>
            <span class="text-caption">{{ statusLight.text }}</span>
          </div>
          <!-- 用戶選單 -->
          <v-menu offset-y>
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" :icon="mobile" :size="responsiveSizes.button" aria-label="使用者選單">
                <v-avatar :size="mobile ? 32 : 36" :color="$vuetify.theme.current.dark ? 'surface-variant' : 'white'">
                  <span :class="{ 'text-primary': !$vuetify.theme.current.dark }" class="font-weight-bold">
                    {{ authStore.user?.username?.charAt(0).toUpperCase() }}
                  </span>
                </v-avatar>
              </v-btn>
            </template>

            <v-list min-width="200">
              <v-list-item>
                <v-list-item-title class="font-weight-medium">
                  {{ authStore.user?.username }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ authStore.user?.email }}
                </v-list-item-subtitle>
              </v-list-item>

              <v-divider />

              <v-list-item @click="uiStore.toggleTheme">
                <template v-slot:prepend>
                  <v-icon>
                    {{ uiStore.theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night' }}
                  </v-icon>
                </template>
                <v-list-item-title>切換主題</v-list-item-title>
              </v-list-item>

              <v-divider />

              <v-list-item @click="handleLogout" class="text-error">
                <template v-slot:prepend>
                  <v-icon color="error">mdi-logout</v-icon>
                </template>
                <v-list-item-title>登出</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </v-app-bar>
    </template>

    <!-- 主要內容 -->
    <v-main class="main-content">


      <router-view v-slot="{ Component }">
        <transition name="page-transition" mode="out-in" @enter="onPageEnter" @leave="onPageLeave">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>

    <!-- Global components that should appear on all pages -->
    <LoadingOverlay />
    <ConfirmModal />

    <!-- Modals that should only be available on authenticated pages -->
    <template v-if="authStore.isAuthenticated">
      <ExerciseModal />
      <BodyMetricsModal />
    </template>
  </v-app>
</template>

<script setup>
import { ref, computed, watchEffect, onMounted, onBeforeUnmount, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from 'vuetify'
import { useResponsiveDesign } from '@/composables/useResponsiveDesign'
import LoadingOverlay from '@/components/LoadingOverlay.vue'

import { db, initializeDB } from '@/utils/db'
import apiClient from '@/api'

// Lazy load modals
const ConfirmModal = defineAsyncComponent(() => import('@/components/ConfirmModal.vue'))
const ExerciseModal = defineAsyncComponent(() => import('@/components/ExerciseModal.vue'))
const BodyMetricsModal = defineAsyncComponent(() => import('@/components/BodyMetricsModal.vue'))

// Import data stores for computed properties like badges
import { useExerciseStore } from '@/stores/exercise'
import { useTemplateStore } from '@/stores/template'

const drawer = ref(null)
const route = useRoute()
const uiStore = useUIStore()
const authStore = useAuthStore()
const theme = useTheme()
const exerciseStore = useExerciseStore()
const templateStore = useTemplateStore()

const { mobile, responsiveSizes, drawerBehavior, typographyScale, density } = useResponsiveDesign()

const isSyncing = ref(false)
const lastSyncAt = ref(0)

const statusLight = computed(() => {
  if (uiStore.isOffline) {
    return { color: 'red', text: '離線' }
  }
  if (uiStore.isSyncing) {
    return { color: 'yellow', text: '同步中' }
  }
  return { color: 'light-green-accent-4', text: '連線正常' }
})

const syncQueue = async () => {
  if (!navigator.onLine || authStore.isGuest || isSyncing.value) {
    return
  }

  try {
    // 確保資料庫已初始化
    await initializeDB()
    
    const jobs = await db.sync_queue.toArray()
    if (jobs.length === 0) {
      return
    }
    
    isSyncing.value = true
    uiStore.setSyncing(true)
    console.log(`Sync started: ${jobs.length} items to process.`)

    let processedCount = 0
    for (const job of jobs) {
      try {
        switch (job.action) {
          case 'add':
            await apiClient.post(job.endpoint, job.payload)
            break
          case 'update':
            await apiClient.put(job.endpoint, job.payload)
            break
          case 'delete':
            await apiClient.delete(job.endpoint)
            break
        }
        await db.sync_queue.delete(job.id)
        processedCount++
        console.log(`Job ${job.id || job.action} synced successfully.`)
      } catch (error) {
        console.error(`Failed to sync job ${job.id || job.action}:`, error)
        if (error.response && error.response.status === 401) {
          console.error('Sync failed due to authentication error. Please log in again.')
          authStore.logout()
          break
        }
      }
    }

    isSyncing.value = false
    uiStore.setSyncing(false)

    const remaining = await db.sync_queue.count()
    if (processedCount > 0 && remaining === 0) {
      const now = Date.now()
      const last = Number(sessionStorage.getItem('lastSyncAt') || '0')
      if (now - last > 10000) {
        sessionStorage.setItem('lastSyncAt', String(now))
        console.log('Sync finished with changes. Reloading for data consistency.')
      } else {
        console.log('Sync finished with changes, but skipping reload to avoid rapid loops.')
      }
    } else {
      console.log('Sync finished. No successful changes or jobs remain; skipping reload.')
    }
  } catch (error) {
    console.error('Failed to initialize database for sync:', error)
    isSyncing.value = false
    uiStore.setSyncing(false)
  }
}

const handleOnline = () => {
  uiStore.setOfflineStatus(false)
  syncQueue()
}

const handleOffline = () => {
  uiStore.setOfflineStatus(true)
}

onMounted(() => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  // Initial check in case the app loads offline
  uiStore.setOfflineStatus(!navigator.onLine)
  // If app starts online, attempt a sync in case there are leftover jobs
  if (navigator.onLine) {
    syncQueue()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})

watchEffect(() => {
  theme.global.name.value = uiStore.theme
})

const navItems = computed(() => [
  { title: '開始訓練', icon: 'mdi-dumbbell', to: '/' },
  { title: '儀表板', icon: 'mdi-view-dashboard', to: '/dashboard' },
  { title: '歷史紀錄', icon: 'mdi-history', to: '/history' },
  { title: '動作庫', icon: 'mdi-weight-lifter', to: '/exercises', badge: exerciseStore.allExercises.filter(ex => ex.isCustom).length || null },
  { title: '訓練範本', icon: 'mdi-clipboard-list', to: '/templates', badge: templateStore.templates.filter(t => t.isCustom).length || null },
  { title: '訓練排程', icon: 'mdi-calendar-month', to: '/schedule' },
])

const currentRouteTitle = computed(() => {
  const currentRoute = navItems.value.find((item) => item.to === route.path)
  return currentRoute ? currentRoute.title : 'Workout Record'
})

const breadcrumbs = computed(() => {
    const pathSegments = route.path.split('/').filter(Boolean);
    const crumbs = [{ title: '首頁', to: '/', disabled: pathSegments.length === 0 }];
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
        currentPath += `/${segment}`;
        const navItem = navItems.value.find(item => item.to === currentPath);
        if (navItem) {
            crumbs.push({
                title: navItem.title,
                to: navItem.to,
                disabled: index === pathSegments.length - 1
            });
        }
    });
    return crumbs;
});

const handleLogout = () => {
  authStore.logout()
}

const onPageEnter = (el, done) => {
  el.style.opacity = 0
  el.style.transform = 'translateY(20px)'
  requestAnimationFrame(() => {
    el.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out'
    el.style.opacity = 1
    el.style.transform = 'translateY(0)'
  })
  setTimeout(done, 300)
}

const onPageLeave = (el, done) => {
  el.style.transition = 'opacity 0.2s ease-in, transform 0.2s ease-in'
  el.style.opacity = 0
  el.style.transform = 'translateY(-10px)'
  setTimeout(done, 200)
}
</script>

<style scoped>
.navigation-drawer {
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.user-profile {
  background: rgba(var(--v-theme-primary), 0.05);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.nav-item {
  margin: 2px 8px;
  border-radius: 8px;
}
.nav-item--active {
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}
.app-bar {
  backdrop-filter: blur(10px);
}
.main-content {
  background: rgb(var(--v-theme-background));
  height: 100vh;
  overflow-y: auto;
}
.page-title {
  overflow: hidden;
}
.quick-action {
  border-radius: 8px;
  margin: 2px 0;
}
.page-transition-enter-active,
.page-transition-leave-active {
  transition: all 0.3s ease;
}
.page-transition-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.page-transition-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
.status-banner {
  position: sticky;
  top: 0;
  z-index: 1005; /* Just below v-app-bar */
}
@media (max-width: 600px) {
  .user-profile {
    padding: 12px 16px;
  }
  .nav-item {
    margin: 1px 4px;
  }
}
.v-theme--dark .navigation-drawer {
  background: rgb(var(--v-theme-surface));
}
.v-theme--dark .app-bar {
  background: rgba(var(--v-theme-surface), 0.9) !important;
}
</style>