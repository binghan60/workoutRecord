<template>
  <v-app>
    <template v-if="authStore.isAuthenticated">
      <!-- 響應式導航抽屜 -->
      <v-navigation-drawer v-model="drawer" :rail="drawerBehavior.rail" :temporary="drawerBehavior.temporary" :permanent="drawerBehavior.permanent" :width="280" app class="navigation-drawer">
        <!-- 用戶資料區塊 -->
        <div class="user-profile pa-4" v-if="!drawerBehavior.temporary">
          <div class="d-flex align-center">
            <v-avatar :size="responsiveSizes.avatar" :color="$vuetify.theme.current.dark ? 'surface-variant' : 'primary'" class="mr-3 no-shadow">
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
        <v-app-bar-nav-icon @click="drawer = !drawer" :aria-label="drawer ? '關閉選單' : '開啟選單'" :elevation="0" :color="$vuetify.theme.current.dark ? 'on-surface' : 'on-primary'" class="no-shadow" />

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
              <v-btn v-bind="props" :icon="mobile" :size="responsiveSizes.button" :elevation="0" class="no-shadow" aria-label="使用者選單">
                <v-avatar :size="mobile ? 32 : 36" :color="$vuetify.theme.current.dark ? 'surface-variant' : 'white'" class="no-shadow">
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
import { ref, computed, watchEffect, onMounted, onBeforeUnmount, defineAsyncComponent, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from 'vuetify'
import { useResponsiveDesign } from '@/composables/useResponsiveDesign'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import { useToast } from 'vue-toastification'

import { db, initializeDB } from '@/utils/db'
import apiClient from '@/api'

// Lazy load modals
const ConfirmModal = defineAsyncComponent(() => import('@/components/ConfirmModal.vue'))
const ExerciseModal = defineAsyncComponent(() => import('@/components/ExerciseModal.vue'))
const BodyMetricsModal = defineAsyncComponent(() => import('@/components/BodyMetricsModal.vue'))

// Import data stores for computed properties like badges
import { useExerciseStore } from '@/stores/exercise'
import { useTemplateStore } from '@/stores/template'
import { useWorkoutStore } from '@/stores/workout'
import { useBodyMetricsStore } from '@/stores/bodyMetrics'

// Listen to local data changes to trigger soft refreshes of affected views
window.addEventListener('rovodev:local-data-changed', (e) => {
  try {
    const detail = e?.detail || {}
    // We will refresh particular stores based on which table changed
    if (detail.table === 'workouts') {
      workoutStore.fetchAllWorkouts()
    } else if (detail.table === 'templates') {
      // Avoid immediate refetch on delete to prevent flicker (server may still return item briefly)
      if (detail.action !== 'delete') {
        templateStore.fetchTemplates()
      }
      // Still refresh schedule mapping as it doesn't reintroduce templates
      templateStore.fetchSchedule()
    } else if (detail.table === 'schedules' || detail.table === 'schedule') {
      templateStore.fetchSchedule()
    } else if (detail.table === 'bodyMetrics') {
      bodyMetricsStore.fetchRecords()
    }
  } catch {}
})

// Listen to sync queue changes to update badge count
window.addEventListener('rovodev:sync-queue-changed', () => {
  updateSyncQueueCount()
})

const drawer = ref(null)
const toast = useToast()
const route = useRoute()
const uiStore = useUIStore()
const authStore = useAuthStore()
const theme = useTheme()
const exerciseStore = useExerciseStore()
const templateStore = useTemplateStore()
const workoutStore = useWorkoutStore()
const bodyMetricsStore = useBodyMetricsStore()

const { mobile, responsiveSizes, drawerBehavior, typographyScale, density } = useResponsiveDesign()

const isSyncing = ref(false)
const lastSyncAt = ref(0)
const syncIntervalId = ref(null)

// Helper function to update schedule references when offline templates get synced
const updateScheduleReferences = async (offlineId, newId) => {
  const debug = localStorage.getItem('debug_sync')
  const dlog = (...args) => {
    if (debug === 'true') console.log('[DEBUG][app]', ...args)
  }
  dlog('updateScheduleReferences: start', { offlineId, newId })
  try {
    console.log(`Updating schedule references: ${offlineId} -> ${newId}`)

    // Update template store schedule
    for (const day in templateStore.schedule) {
      if (Array.isArray(templateStore.schedule[day])) {
        templateStore.schedule[day] = templateStore.schedule[day].map((template) => {
          if (template._id === offlineId) {
            return { ...template, _id: newId }
          }
          return template
        })
      }
    }

    // Update local database schedule
    const scheduleRecord = await db.schedules.get('currentUserSchedule')
    if (scheduleRecord) {
      let updated = false
      for (const day in scheduleRecord) {
        if (Array.isArray(scheduleRecord[day])) {
          const originalLength = scheduleRecord[day].length
          scheduleRecord[day] = scheduleRecord[day].map((template) => {
            if ((template._id || template) === offlineId) {
              updated = true
              return typeof template === 'object' ? { ...template, _id: newId } : newId
            }
            return template
          })
        }
      }
      if (updated) {
        await db.schedules.put(scheduleRecord)
        console.log('Updated schedule references in local DB')
        // Schedule will be updated after all templates are synced
      }
    }
  } catch (error) {
    console.error('Failed to update schedule references:', error)
  }
}

const statusLight = computed(() => {
  if (uiStore.isOffline) {
    return { color: 'red', text: '離線' }
  }
  if (uiStore.isSyncing) {
    return { color: 'yellow', text: '同步中' }
  }
  return { color: 'light-green-accent-4', text: '連線正常' }
})

const getServerIdFor = async (maybeOfflineId) => {
  if (!maybeOfflineId || !(typeof maybeOfflineId === 'string')) return maybeOfflineId
  if (!maybeOfflineId.startsWith('offline_') && !maybeOfflineId.startsWith('temp_')) return maybeOfflineId
  try {
    const map = await db.id_map.get(maybeOfflineId)
    return map?.serverId || null
  } catch {
    return null
  }
}

const mapWorkoutPayloadIds = async (payload) => {
  const userId = authStore.user?._id || 'guest'
  const cloned = JSON.parse(JSON.stringify(payload))
  let unresolved = false

  // Map templateId
  if (cloned.templateId && (cloned.templateId.startsWith('offline_') || cloned.templateId.startsWith('temp_'))) {
    const mapped = await getServerIdFor(cloned.templateId)
    if (mapped) cloned.templateId = mapped
    else delete cloned.templateId // optional on backend
  }

  // Map exercises[].exerciseId
  if (Array.isArray(cloned.exercises)) {
    for (const ex of cloned.exercises) {
      if (ex.exerciseId && (String(ex.exerciseId).startsWith('offline_') || String(ex.exerciseId).startsWith('temp_'))) {
        const mapped = await getServerIdFor(ex.exerciseId)
        if (mapped) {
          ex.exerciseId = mapped
        } else {
          // Fallback by name from local exercises cache
          try {
            const byName = await db.exercises
              .where('name')
              .equals(ex.name)
              .and((item) => item.userId === userId)
              .first()
            if (byName && byName._id && !String(byName._id).startsWith('offline_') && !String(byName._id).startsWith('temp_')) {
              ex.exerciseId = byName._id
            } else {
              unresolved = true
            }
          } catch {
            unresolved = true
          }
        }
      }
    }
  }

  return { payload: cloned, unresolved }
}

const syncQueue = async () => {
  const debug = localStorage.getItem('debug_sync')
  const dlog = (...args) => {
    if (debug === 'true') console.log('[DEBUG][sync]', ...args)
  }
  dlog('start')
  if (!navigator.onLine) {
    console.log('❌ Sync skipped: offline')
    return
  }
  if (authStore.isGuest) {
    console.log('❌ Sync skipped: guest mode')
    return
  }
  if (isSyncing.value) {
    console.log('❌ Sync skipped: already syncing')
    return
  }

  try {
    // 確保資料庫已初始化
    await initializeDB()

    const jobs = await db.sync_queue.toArray()
    dlog(
      'jobs',
      jobs.map((j) => ({ id: j.id, action: j.action, endpoint: j.endpoint, offlineId: j.offlineId })),
    )
    if (jobs.length === 0) {
      console.log('✅ Sync queue is empty - nothing to sync')
      return
    }

    isSyncing.value = true
    uiStore.setSyncing(true)
    console.log(`🔄 Sync started: ${jobs.length} items to process`)
    jobs.forEach((job) => {
      console.log(`  - ${job.action} ${job.endpoint}`)
      dlog('processing job', { id: job.id, action: job.action, endpoint: job.endpoint, offlineId: job.offlineId, payload: job.payload })
    })

    // Track affected endpoints to refresh only necessary stores
    let processedCount = 0
    const affected = new Set()
    for (const job of jobs) {
      try {
        const endpointPath = job.endpoint.split('?')[0]
        const mapEndpointToTable = (ep) => {
          if (ep.startsWith('/workouts')) return 'workouts'
          if (ep.startsWith('/templates')) return 'templates'
          if (ep.startsWith('/body-metrics')) return 'bodyMetrics'
          if (ep.startsWith('/exercises')) return 'exercises'
          if (ep.startsWith('/schedule')) return 'schedules'
          return null
        }
        const table = mapEndpointToTable(endpointPath)

        switch (job.action) {
          case 'add': {
            // Map IDs for workouts payload to avoid sending offline_/temp_ ids
            let payloadToSend = job.payload
            if (job.endpoint.startsWith('/workouts')) {
              const mapped = await mapWorkoutPayloadIds(job.payload)
              payloadToSend = mapped.payload
            }
            dlog('POST', job.endpoint, payloadToSend)
            const res = await apiClient.post(job.endpoint, payloadToSend)
            const saved = res?.data?.data ?? res?.data
            if (table && saved) {
              try {
                if (job.offlineId) {
                  await db[table].delete(job.offlineId)

                  // Persist ID map for future reference resolution
                  try {
                    await db.id_map.put({ offlineId: job.offlineId, serverId: saved._id, type: table, userId: authStore.user?._id || 'guest' })
                  } catch {}

                  // Special handling for templates: update schedule references
                  if (table === 'templates' && job.offlineId && saved._id) {
                    dlog('template add mapped', { offlineId: job.offlineId, serverId: saved._id, note: 'updating schedule immediately' })
                    dlog('template add mapped', { offlineId: job.offlineId, serverId: saved._id })
                    await updateScheduleReferences(job.offlineId, saved._id)
                  }
                }
                await db[table].put(saved)
              } catch (e) {
                console.warn('Failed to update local cache after add:', e)
              }
            }
            break
          }
          case 'update': {
            let payloadToSend = job.payload
            if (job.endpoint.startsWith('/workouts')) {
              const mapped = await mapWorkoutPayloadIds(job.payload)
              payloadToSend = mapped.payload
            }
            dlog('PUT', job.endpoint, payloadToSend)
            const res = await apiClient.put(job.endpoint, payloadToSend)
            const saved = res?.data?.data ?? res?.data
            if (table && saved) {
              try {
                // For schedule, we prefer soft refresh below; for others we can upsert
                if (table !== 'schedules') {
                  await db[table].put(saved)
                }
              } catch (e) {
                console.warn('Failed to update local cache after update:', e)
              }
            }
            break
          }
          case 'delete': {
            await apiClient.delete(job.endpoint)
            // Local cache already removed optimistically; nothing else
            break
          }
        }
        // Only delete job if sync was successful
        await db.sync_queue.delete(job.id)
        processedCount++
        affected.add(endpointPath)
        console.log(`✅ Job ${job.id || job.action} synced successfully.`)
      } catch (error) {
        console.error(`❌ Failed to sync job ${job.id || job.action}:`, error)
        if (error.response && error.response.status === 401) {
          console.warn('Sync paused due to authentication error. Please log in again to resume synchronization.')
          toast.error('登入已過期，請重新登入以同步離線資料。')
          // Do NOT clear the sync queue or logout automatically
          // Exit the loop gracefully and allow retry after re-authentication
          break
        }
        // For other errors, keep the job in queue for retry later
        console.warn(`⏳ Job ${job.id || job.action} will be retried later due to: ${error.message}`)
        // DO NOT delete the job here - it stays in queue for next retry
      }
    }

    isSyncing.value = false
    uiStore.setSyncing(false)

    // Update sync queue count after sync
    updateSyncQueueCount()

    // Soft refresh: re-fetch affected stores instead of reloading the page
    if (processedCount > 0) {
      const endpoints = Array.from(affected)
      const refreshTasks = []

      const templatesUpdated = endpoints.some((e) => e.startsWith('/templates'))
      const workoutsUpdated = endpoints.some((e) => e.startsWith('/workouts'))
      const bodyMetricsUpdated = endpoints.some((e) => e.startsWith('/body-metrics'))
      const scheduleTouched = endpoints.some((e) => e === '/schedule')

      // IMPORTANT: If templates were updated, first reconcile schedule with new IDs
      if (templatesUpdated) {
        console.log('Templates synced - updating schedule with new IDs (before fetching schedule)')
        try {
          await templateStore.updateScheduleOnBackend({ waitForServer: true })
        } catch (e) {
          console.warn('updateScheduleOnBackend failed:', e)
        }
      }

      // Now refresh other stores in parallel
      if (templatesUpdated) {
        refreshTasks.push(templateStore.fetchTemplates(true))
      }
      if (workoutsUpdated) {
        refreshTasks.push(workoutStore.fetchAllWorkouts(true))
      }
      if (bodyMetricsUpdated) {
        refreshTasks.push(bodyMetricsStore.fetchRecords(true))
      }
      // Only fetch schedule after we've reconciled it (if needed)
      if (scheduleTouched || templatesUpdated) {
        refreshTasks.push(templateStore.fetchSchedule(true))
      }

      if (refreshTasks.length > 0) {
        await Promise.allSettled(refreshTasks)
        console.log('Soft refresh completed for affected stores:', endpoints)
      }
    } else {
      console.log('Sync finished. No successful changes; skipping refresh.')
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
  // Also try syncing when tab/app regains focus
  const handleVisibility = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      syncQueue()
    }
  }
  document.addEventListener('visibilitychange', handleVisibility)

  // Initial check in case the app loads offline
  uiStore.setOfflineStatus(!navigator.onLine)
  // Update sync queue count initially
  updateSyncQueueCount()

  // If app starts online, attempt a sync in case there are leftover jobs
  if (navigator.onLine) {
    syncQueue()
  }
  // Periodic retry to cover cases where 'online' event didn't fire
  syncIntervalId.value = setInterval(() => {
    if (navigator.onLine && !isSyncing.value) {
      syncQueue()
    }
    // Also update queue count periodically
    updateSyncQueueCount()
  }, 15000)

  // Re-run sync when user logs in again and app is online
  watch(
    () => authStore.token,
    (newToken) => {
      if (newToken && navigator.onLine) {
        syncQueue()
      }
    },
  )

  // Cleanup extra listener on unmount
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', handleVisibility)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  if (syncIntervalId.value) {
    clearInterval(syncIntervalId.value)
    syncIntervalId.value = null
  }
})

watchEffect(() => {
  theme.global.name.value = uiStore.theme
})

// Get sync queue count for badge
const syncQueueCount = ref(0)

const updateSyncQueueCount = async () => {
  try {
    await initializeDB()
    const jobs = await db.sync_queue.toArray()
    syncQueueCount.value = jobs.length
  } catch (error) {
    syncQueueCount.value = 0
  }
}

const navItems = computed(() => {
  const items = [
    { title: '開始訓練', icon: 'mdi-dumbbell', to: '/' },
    { title: '儀表板', icon: 'mdi-view-dashboard', to: '/dashboard' },
    { title: '歷史紀錄', icon: 'mdi-history', to: '/history' },
    { title: '動作管理', icon: 'mdi-weight-lifter', to: '/exercises' },
    { title: '訓練組合', icon: 'mdi-clipboard-list', to: '/templates' },
    { title: '訓練排程', icon: 'mdi-calendar-month', to: '/schedule' },
    { title: '同步管理', icon: 'mdi-sync', to: '/sync-queue', badge: syncQueueCount.value || null },
  ]
  // 顯示「訪客資料」tab 只在訪客模式
  if (authStore.isGuest) {
    items.push({ title: '訪客資料', icon: 'mdi-account-question', to: '/guest-data' })
  }
  return items
})

// 監聽自訂事件，讓 badge 即時刷新
window.addEventListener('rovodev:sync-queue-changed', () => {
  updateSyncQueueCount()
})

const currentRouteTitle = computed(() => {
  const currentRoute = navItems.value.find((item) => item.to === route.path)
  return currentRoute ? currentRoute.title : 'Workout Record'
})

const breadcrumbs = computed(() => {
  const pathSegments = route.path.split('/').filter(Boolean)
  const crumbs = [{ title: '首頁', to: '/', disabled: pathSegments.length === 0 }]
  let currentPath = ''
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const navItem = navItems.value.find((item) => item.to === currentPath)
    if (navItem) {
      crumbs.push({
        title: navItem.title,
        to: navItem.to,
        disabled: index === pathSegments.length - 1,
      })
    }
  })
  return crumbs
})

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
