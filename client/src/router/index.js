import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { loadInitialData } from '@/utils/initializer' // Import our new initializer

// Eagerly import all views (disable lazy-loading)
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import WorkoutView from '../views/WorkoutView.vue'
import DashboardView from '../views/DashboardView.vue'
import HistoryView from '../views/HistoryView.vue'
import TemplatesView from '../views/TemplatesView.vue'
import ExercisesView from '../views/ExercisesView.vue'
import ScheduleView from '../views/ScheduleView.vue'
import SyncQueueView from '../views/SyncQueueView.vue'
import GuestDataView from '../views/GuestDataView.vue'
import ClassicProgramsView from '../views/ClassicProgramsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresGuest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { requiresGuest: true },
    },
    {
      path: '/',
      name: 'home',
      component: WorkoutView,
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryView,
      meta: { requiresAuth: true },
    },
    {
      path: '/templates',
      name: 'templates',
      component: TemplatesView,
      meta: { requiresAuth: true },
    },
    {
      path: '/exercises',
      name: 'exercises',
      component: ExercisesView,
      meta: { requiresAuth: true },
    },
    {
      path: '/schedule',
      name: 'schedule',
      component: ScheduleView,
      meta: { requiresAuth: true },
    },
    {
      path: '/sync-queue',
      name: 'sync-queue',
      component: SyncQueueView,
      meta: { requiresAuth: true },
    },
    {
      path: '/guest-data',
      name: 'guest-data',
      component: GuestDataView,
      meta: { requiresAuth: true },
    },
    {
      path: '/classic-programs',
      name: 'classic-programs',
      component: ClassicProgramsView,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  // This is the GATEKEEPER. It runs before any route is rendered.
  await loadInitialData();

  const authStore = useAuthStore()
  const isAuthenticated = authStore.isAuthenticated
  const isRegistered = !!authStore.token && !!authStore.user && !authStore.isGuest

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresGuest && isRegistered) {
    next('/')
  } else {
    next()
  }
})

export default router