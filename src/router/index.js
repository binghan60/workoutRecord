import { createRouter, createWebHistory } from 'vue-router'
import WorkoutView from '../views/WorkoutView.vue'
import HistoryView from '../views/HistoryView.vue'
import ExercisesView from '../views/ExercisesView.vue'
import TemplatesView from '../views/TemplatesView.vue'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: DashboardView,
    },
    {
      path: '/workout',
      name: 'workout',
      component: WorkoutView,
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryView,
    },
    {
      path: '/templates',
      name: 'templates',
      component: TemplatesView,
    },
    {
      path: '/exercises',
      name: 'exercises',
      component: ExercisesView,
    },
    {
      path: '/schedule',
      name: 'schedule',
      component: () => import('../views/ScheduleView.vue'),
    },
  ],
})

export default router
