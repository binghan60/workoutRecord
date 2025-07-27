<template>
  <v-app>
    <template v-if="authStore.isAuthenticated">
      <v-navigation-drawer v-model="drawer" app>
        <v-list nav>
          <v-list-item v-for="item in navItems" :key="item.title" :to="item.to" :prepend-icon="item.icon" :title="item.title"></v-list-item>
        </v-list>
      </v-navigation-drawer>

      <v-app-bar app color="primary">
        <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
        <v-toolbar-title>{{ currentRouteTitle }}</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-menu offset-y>
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon>
              <v-icon>mdi-account-circle</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item>
              <v-list-item-title>{{ authStore.user?.username }}</v-list-item-title>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item @click="uiStore.toggleTheme">
              <template v-slot:prepend>
                <v-icon>{{ uiStore.theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
              </template>
              <v-list-item-title>切換主題</v-list-item-title>
            </v-list-item>
            <v-list-item @click="authStore.logout">
              <template v-slot:prepend>
                <v-icon>mdi-logout</v-icon>
              </template>
              <v-list-item-title>登出</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-app-bar>
    </template>

    <v-main>
      <router-view />
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
import { ref, computed, watchEffect, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from 'vuetify'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import ExerciseModal from '@/components/ExerciseModal.vue'
import BodyMetricsModal from '@/components/BodyMetricsModal.vue'

// Import data stores
import { useExerciseStore } from '@/stores/exercise'
import { useTemplateStore } from '@/stores/template'
import { useBodyMetricsStore } from '@/stores/bodyMetrics'

const drawer = ref(null)
const route = useRoute()
const uiStore = useUIStore()
const authStore = useAuthStore()
const theme = useTheme()

// Initialize data stores
const exerciseStore = useExerciseStore()
const templateStore = useTemplateStore()
const bodyMetricsStore = useBodyMetricsStore()

// This function fetches all necessary data for the authenticated user.
const fetchInitialData = () => {
  exerciseStore.fetchExercises()
  templateStore.fetchTemplates()
  templateStore.fetchSchedule()
  bodyMetricsStore.fetchRecords()
}

// On component mount, check authentication status.
onMounted(() => {
  authStore.checkAuth()
  // If authenticated, fetch data.
  if (authStore.isAuthenticated) {
    fetchInitialData()
  }
})

// Watch for changes in authentication status.
watch(
  () => authStore.isAuthenticated,
  (isAuth) => {
    if (isAuth) {
      // If user logs in, fetch data.
      fetchInitialData()
    }
  },
)

// Use watchEffect to reactively sync the Vuetify theme with the UI store.
watchEffect(() => {
  theme.change(uiStore.theme)
})

const navItems = [
  { title: '儀表板', icon: 'mdi-view-dashboard', to: '/' },
  { title: '開始訓練', icon: 'mdi-dumbbell', to: '/workout' },
  { title: '歷史紀錄', icon: 'mdi-history', to: '/history' },
  { title: '動作庫', icon: 'mdi-weight-lifter', to: '/exercises' },
  { title: '訓練範本', icon: 'mdi-clipboard-list', to: '/templates' },
  { title: '訓練排程', icon: 'mdi-calendar-month', to: '/schedule' },
]

const currentRouteTitle = computed(() => {
  const currentRoute = navItems.find((item) => item.to === route.path)
  return currentRoute ? currentRoute.title : 'Workout Record'
})
</script>

<style>
/* Add some basic styling to ensure content is scrollable */
.v-main {
  height: 100vh;
  overflow-y: auto;
}
</style>
