<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" app>
      <v-list nav>
        <v-list-item v-for="item in navItems" :key="item.title" :to="item.to" :prepend-icon="item.icon" :title="item.title"></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar app color="primary">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>{{ currentRouteTitle }}</v-toolbar-title>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>

    <!-- Keep existing global components -->
    <LoadingOverlay />
    <ConfirmModal />
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'

const drawer = ref(null)
const route = useRoute()

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
