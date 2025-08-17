<template>
  <v-container fluid class="py-6">
    <v-row justify="center">
      <v-col cols="12" lg="10" xl="8">
        <v-card>
          <v-card-title class="text-h5 font-weight-bold mb-4 d-flex align-center justify-space-between">
            <span>訪客資料管理</span>
            <v-btn size="small" variant="text" prepend-icon="mdi-refresh" @click="refreshFromStorage">重新整理</v-btn>
          </v-card-title>
          <v-card-text>
            <v-alert type="info" variant="tonal" class="mb-6"> 你目前以訪客身份使用。這裡可以預覽目前儲存在裝置上的訪客資料，或在註冊/登入後選擇手動繼承到你的帳號。 </v-alert>

            <v-row class="mb-2" align="stretch" :gutter="24">
              <v-col cols="12" md="6">
                <v-card variant="outlined" class="mb-6">
                  <v-card-title>訪客資料概況</v-card-title>
                  <v-card-text>
                    <v-list density="compact">
                      <v-list-item prepend-icon="mdi-weight-lifter">
                        <v-list-item-title>動作數量</v-list-item-title>
                        <template #append>
                          <v-chip size="small" color="primary" variant="tonal">{{ counts.exercises }}</v-chip>
                        </template>
                      </v-list-item>
                      <v-list-item prepend-icon="mdi-clipboard-list">
                        <v-list-item-title>課表數量</v-list-item-title>
                        <template #append>
                          <v-chip size="small" color="primary" variant="tonal">{{ counts.templates }}</v-chip>
                        </template>
                      </v-list-item>
                      <v-list-item prepend-icon="mdi-calendar-month">
                        <v-list-item-title>排程天數（有安排）</v-list-item-title>
                        <template #append>
                          <v-chip size="small" color="primary" variant="tonal">{{ counts.scheduledDays }}</v-chip>
                        </template>
                      </v-list-item>
                      <v-list-item prepend-icon="mdi-history">
                        <v-list-item-title>訓練紀錄數</v-list-item-title>
                        <template #append>
                          <v-chip size="small" color="primary" variant="tonal">{{ counts.workouts }}</v-chip>
                        </template>
                      </v-list-item>
                      <v-list-item prepend-icon="mdi-scale-bathroom">
                        <v-list-item-title>身體數值筆數</v-list-item-title>
                        <template #append>
                          <v-chip size="small" color="primary" variant="tonal">{{ counts.bodyMetrics }}</v-chip>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-card-text>
                  <v-card-actions>
                    <v-btn color="primary" variant="tonal" :disabled="!hasAnyData" @click="goRegister">註冊並繼承</v-btn>
                    <v-btn color="secondary" variant="text" :disabled="!hasAnyData" @click="goLogin">登入並繼承</v-btn>
                  </v-card-actions>
                </v-card>

                <!-- <v-card variant="outlined">
                  <v-card-title>清除訪客資料</v-card-title>
                  <v-card-text>
                    <p class="text-body-2">清除所有訪客資料（本機）。此操作無法復原。</p>
                  </v-card-text>
                  <v-card-actions>
                    <v-btn color="error" variant="tonal" :disabled="!hasAnyData" @click="clearGuestData">清除</v-btn>
                  </v-card-actions>
                </v-card> -->
              </v-col>

              <v-col cols="12" md="6">
                <v-card variant="outlined">
                  <v-card-title>資料預覽</v-card-title>
                  <v-card-text>
                    <v-expansion-panels multiple>
                      <v-expansion-panel>
                        <v-expansion-panel-title>動作</v-expansion-panel-title>
                        <v-expansion-panel-text>
                          <v-chip v-for="ex in guest.exercises" :key="ex._id" class="ma-1" label>{{ ex.name }}</v-chip>
                          <div v-if="guest.exercises.length === 0" class="text-medium-emphasis">無資料</div>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                      <v-expansion-panel>
                        <v-expansion-panel-title>課表</v-expansion-panel-title>
                        <v-expansion-panel-text>
                          <v-list density="compact">
                            <v-list-item v-for="t in guest.templates" :key="t._id" :title="t.name" />
                          </v-list>
                          <div v-if="guest.templates.length === 0" class="text-medium-emphasis">無資料</div>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                      <v-expansion-panel>
                        <v-expansion-panel-title>排程</v-expansion-panel-title>
                        <v-expansion-panel-text>
                          <div v-if="counts.scheduledDays > 0">
                            <div v-for="day in days" :key="day" class="mb-2">
                              <strong class="mr-2">{{ dayMapReverse[day] }}:</strong>
                              <span>{{ (guest.schedule[day] || []).length }} 個</span>
                            </div>
                          </div>
                          <div v-else class="text-medium-emphasis">無資料</div>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                      <v-expansion-panel>
                        <v-expansion-panel-title>訓練紀錄</v-expansion-panel-title>
                        <v-expansion-panel-text>
                          <div v-if="guest.workouts.length > 0">
                            <v-list density="compact">
                              <v-list-item v-for="(w, i) in guest.workouts" :key="i" :title="w.name" :subtitle="formatDate(w.date || w.createdAt)" />
                            </v-list>
                          </div>
                          <div v-else class="text-medium-emphasis">無資料</div>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                      <v-expansion-panel>
                        <v-expansion-panel-title>身體數值</v-expansion-panel-title>
                        <v-expansion-panel-text>
                          <div v-if="guest.bodyMetrics.length > 0">
                            <v-table density="compact">
                              <thead>
                                <tr>
                                  <th>日期</th>
                                  <th>體重</th>
                                  <th>體脂</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr v-for="m in guest.bodyMetrics" :key="m._id">
                                  <td>{{ formatDate(m.date) }}</td>
                                  <td>{{ m.weight ?? '-' }}</td>
                                  <td>{{ m.bodyFat ?? '-' }}</td>
                                </tr>
                              </tbody>
                            </v-table>
                          </div>
                          <div v-else class="text-medium-emphasis">無資料</div>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </v-card-text>
                  <v-divider />
                  <v-card-actions>
                    <v-btn color="primary" :disabled="!hasAnyData" @click="startMigrationFlow">註冊/登入後手動繼承</v-btn>
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from './AuthLayout.vue'

const router = useRouter()

const KEYS = {
  exercises: 'guest_exercises',
  templates: 'guest_templates',
  schedule: 'guest_schedule',
  workouts: 'guest_workouts',
  bodyMetrics: 'guest_body_metrics',
}

const safeParse = (json, fallback) => {
  try {
    return json ? JSON.parse(json) : fallback
  } catch {
    return fallback
  }
}

const guest = reactive({
  exercises: [],
  templates: [],
  schedule: {},
  workouts: [],
  bodyMetrics: [],
})

function refreshFromStorage() {
  guest.exercises = safeParse(localStorage.getItem(KEYS.exercises), [])
  guest.templates = safeParse(localStorage.getItem(KEYS.templates), [])
  guest.schedule = safeParse(localStorage.getItem(KEYS.schedule), {})
  guest.workouts = safeParse(localStorage.getItem(KEYS.workouts), [])
  guest.bodyMetrics = safeParse(localStorage.getItem(KEYS.bodyMetrics), [])
}

// initialize once
refreshFromStorage()

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const dayMapReverse = { monday: '星期一', tuesday: '星期二', wednesday: '星期三', thursday: '星期四', friday: '星期五', saturday: '星期六', sunday: '星期日' }

const counts = computed(() => {
  const scheduledDays = days.reduce((acc, d) => acc + ((guest.schedule[d] || []).length > 0 ? 1 : 0), 0)
  return {
    exercises: guest.exercises.length,
    templates: guest.templates.length,
    scheduledDays,
    workouts: guest.workouts.length,
    bodyMetrics: guest.bodyMetrics.length,
  }
})

const hasAnyData = computed(() => Object.values(counts.value).some((n) => Number(n) > 0))

function goRegister() {
  localStorage.setItem('guest_migration_after_auth', 'true')
  router.push('/register')
}
function goLogin() {
  localStorage.setItem('guest_migration_after_auth', 'true')
  router.push('/login')
}

function startMigrationFlow() {
  // 使用一個 flag，等使用者完成註冊/登入後再由 auth store 觸發遷移
  localStorage.setItem('guest_migration_after_auth', 'true')
  // 引導使用者去註冊或登入
  router.push('/register')
}

function clearGuestData() {
  if (!confirm('確定要清除所有訪客資料嗎？此操作無法復原。')) return
  for (const key of Object.values(KEYS)) localStorage.removeItem(key)
  localStorage.removeItem('workoutInProgress')
  // refresh reactive state
  guest.exercises = []
  guest.templates = []
  guest.schedule = {}
  guest.workouts = []
  guest.bodyMetrics = []
}

const formatDate = (d) => {
  if (!d) return '-'
  const dt = new Date(d)
  return dt.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
</script>
