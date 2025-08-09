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
import { ref, computed, watchEffect, onMounted, watch, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from 'vuetify'
import { useResponsiveDesign } from '@/composables/useResponsiveDesign'
import LoadingOverlay from '@/components/LoadingOverlay.vue'

// Lazy load modals
const ConfirmModal = defineAsyncComponent(() => import('@/components/ConfirmModal.vue'))
const ExerciseModal = defineAsyncComponent(() => import('@/components/ExerciseModal.vue'))
const BodyMetricsModal = defineAsyncComponent(() => import('@/components/BodyMetricsModal.vue'))

// Import data stores
import { useExerciseStore } from '@/stores/exercise'
import { useTemplateStore } from '@/stores/template'
import { useBodyMetricsStore } from '@/stores/bodyMetrics'

const drawer = ref(null)
const route = useRoute()
const uiStore = useUIStore()
const authStore = useAuthStore()
const theme = useTheme()

// 響應式設計
const { mobile, responsiveSizes, drawerBehavior, typographyScale, density } = useResponsiveDesign()

// Initialize data stores
const exerciseStore = useExerciseStore()
const templateStore = useTemplateStore()
const bodyMetricsStore = useBodyMetricsStore()

// 獲取認證用戶的所有必要數據
const fetchInitialData = async () => {
  try {
    await Promise.all([exerciseStore.fetchExercises(), templateStore.fetchTemplates(), templateStore.fetchSchedule(), bodyMetricsStore.fetchRecords()])
  } catch (error) {
    console.error('載入初始數據失敗:', error)
  }
}

// 組件掛載時檢查認證狀態
onMounted(() => {
  authStore.checkAuth()
  if (authStore.isAuthenticated) {
    fetchInitialData()
  }
})

// 監聽認證狀態變化
watch(
  () => authStore.isAuthenticated,
  (isAuth) => {
    if (isAuth) {
      fetchInitialData()
    }
  },
)

// 響應式同步 Vuetify 主題與 UI store
watchEffect(() => {
  theme.change(uiStore.theme)
})

// 導航項目（帶動態徽章）
const navItems = computed(() => [
  {
    title: '開始訓練',
    icon: 'mdi-dumbbell',
    to: '/',
    badge: null,
  },
  {
    title: '儀表板',
    icon: 'mdi-view-dashboard',
    to: '/dashboard',
    badge: null,
  },
  {
    title: '歷史紀錄',
    icon: 'mdi-history',
    to: '/history',
    badge: null,
  },
  {
    title: '動作庫',
    icon: 'mdi-weight-lifter',
    to: '/exercises',
    badge: exerciseStore.customExercises?.length || null,
  },
  {
    title: '訓練範本',
    icon: 'mdi-clipboard-list',
    to: '/templates',
    badge: templateStore.customTemplates?.length || null,
  },
  {
    title: '訓練排程',
    icon: 'mdi-calendar-month',
    to: '/schedule',
    badge: null,
  },
])

// 麵包屑導航
const breadcrumbs = computed(() => {
  const pathSegments = route.path.split('/').filter(Boolean)
  const crumbs = [{ title: '首頁', to: '/' }]

  let currentPath = ''
  pathSegments.forEach((segment) => {
    currentPath += `/${segment}`
    const navItem = navItems.value.find((item) => item.to === currentPath)
    if (navItem) {
      crumbs.push({ title: navItem.title, to: currentPath })
    }
  })

  return crumbs
})

// 當前頁面標題
const currentRouteTitle = computed(() => {
  const currentRoute = navItems.value.find((item) => item.to === route.path)
  return currentRoute ? currentRoute.title : 'Workout Record'
})

// 方法

const handleLogout = () => {
  authStore.logout()
}

// 頁面轉場處理
const onPageEnter = (el) => {
  el.style.opacity = '0'
  el.style.transform = 'translateY(20px)'

  requestAnimationFrame(() => {
    el.style.transition = 'all 0.3s ease-out'
    el.style.opacity = '1'
    el.style.transform = 'translateY(0)'
  })
}

const onPageLeave = (el) => {
  el.style.transition = 'all 0.2s ease-in'
  el.style.opacity = '0'
  el.style.transform = 'translateY(-10px)'
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

/* 頁面轉場 */
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

/* 移動端優化 */
@media (max-width: 600px) {
  .user-profile {
    padding: 12px 16px;
  }

  .nav-item {
    margin: 1px 4px;
  }
}

/* 深色主題調整 */
.v-theme--dark .navigation-drawer {
  background: rgb(var(--v-theme-surface));
}

.v-theme--dark .app-bar {
  background: rgba(var(--v-theme-surface), 0.9) !important;
}
</style>
