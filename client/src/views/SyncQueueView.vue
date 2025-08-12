<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <span>同步佇列管理</span>
          </v-card-title>
          <v-card-text>
            <div class="mb-2">
              <template v-if="!$vuetify.display.xs">
                <div class="d-flex align-center">
                  <v-btn @click="refreshQueue" color="primary" variant="outlined" class="mr-2">
                    <v-icon left>mdi-refresh</v-icon>
                    重新整理
                  </v-btn>
                  <v-btn @click="clearAllQueue" color="error" variant="outlined" :disabled="jobs.length === 0">
                    <v-icon left>mdi-delete-sweep</v-icon>
                    清空佇列
                  </v-btn>
                </div>
              </template>
              <template v-else>
                <v-row dense>
                  <v-col cols="6">
                    <v-btn @click="refreshQueue" color="primary" variant="outlined" block size="small">
                      <v-icon left>mdi-refresh</v-icon>
                      重新整理
                    </v-btn>
                  </v-col>
                  <v-col cols="6">
                    <v-btn @click="clearAllQueue" color="error" variant="outlined" :disabled="jobs.length === 0" block size="small">
                      <v-icon left>mdi-delete-sweep</v-icon>
                      清空佇列
                    </v-btn>
                  </v-col>
                </v-row>
              </template>
            </div>
            <div v-if="loading" class="text-center py-8">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
              <p class="mt-4">載入中...</p>
            </div>

            <div v-else-if="jobs.length === 0" class="text-center py-8">
              <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
              <p class="text-h6 mb-2">佇列為空</p>
              <p class="text-body-2 text-medium-emphasis">目前沒有待同步的項目</p>
            </div>

            <div v-else>
              <v-alert type="info" class="mb-4">
                目前有 {{ jobs.length }} 個待同步項目。這些項目會在網路連線時自動同步。
                <v-btn size="x-small" variant="text" class="ml-2" @click="refreshQueue">重新整理</v-btn>
                <v-btn size="x-small" variant="text" class="ml-1" @click="exportJobs">匯出偵錯</v-btn>
              </v-alert>

              <v-data-table :headers="headers" :items="jobs" class="elevation-1" :items-per-page="10">
                <template v-slot:item.action="{ item }">
                  <v-chip :color="getActionColor(item.action)" size="small" label>
                    {{ getActionText(item.action) }}
                  </v-chip>
                </template>

                <template v-slot:item.endpoint="{ item }">
                  <code class="text-body-2">{{ item.endpoint }}</code>
                </template>

                <template v-slot:item.timestamp="{ item }">
                  {{ formatTimestamp(item.timestamp) }}
                </template>

                <template v-slot:item.payload="{ item }">
                  <v-btn @click="showPayload(item)" size="small" variant="outlined" v-if="item.payload"> 查看內容 </v-btn>
                  <span v-else class="text-medium-emphasis">無</span>
                </template>

                <template v-slot:item.actions="{ item }">
                  <v-btn @click="deleteJob(item.id)" color="error" size="small" variant="text" icon>
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-data-table>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Payload Dialog -->
    <v-dialog v-model="payloadDialog" max-width="600px">
      <v-card>
        <v-card-title>
          <span class="text-h5">資料內容</span>
        </v-card-title>
        <v-card-text>
          <v-code>
            <pre>{{ JSON.stringify(selectedPayload, null, 2) }}</pre>
          </v-code>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" text @click="payloadDialog = false"> 關閉 </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useModalStore } from '@/stores/modal'
import { db, initializeDB } from '@/utils/db'

const toast = useToast()
const modalStore = useModalStore()

const jobs = ref([])
const loading = ref(false)
const payloadDialog = ref(false)
const selectedPayload = ref(null)

const headers = [
  { title: '操作', key: 'action', width: '100px' },
  { title: '端點', key: 'endpoint', width: '200px' },
  { title: '時間', key: 'timestamp', width: '180px' },
  { title: '資料', key: 'payload', width: '100px' },
  { title: '動作', key: 'actions', width: '80px', sortable: false },
]

const getActionColor = (action) => {
  switch (action) {
    case 'add':
      return 'success'
    case 'update':
      return 'warning'
    case 'delete':
      return 'error'
    default:
      return 'primary'
  }
}

const getActionText = (action) => {
  switch (action) {
    case 'add':
      return '新增'
    case 'update':
      return '更新'
    case 'delete':
      return '刪除'
    default:
      return action
  }
}

const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const refreshQueue = async () => {
  loading.value = true
  try {
    await initializeDB()
    const queueJobs = await db.sync_queue.toArray()
    jobs.value = queueJobs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  } catch (error) {
    console.error('Failed to fetch sync queue:', error)
    toast.error('載入同步佇列失敗')
  } finally {
    loading.value = false
  }
}

const showPayload = (item) => {
  selectedPayload.value = item.payload
  payloadDialog.value = true
}

const deleteJob = async (jobId) => {
  modalStore.showConfirmation('確認刪除', '確定要刪除這個同步項目嗎？此操作無法復原。', async () => {
    try {
      await db.sync_queue.delete(jobId)
      await refreshQueue()
      toast.success('同步項目已刪除')
    } catch (error) {
      console.error('Failed to delete job:', error)
      toast.error('刪除失敗')
    }
  })
}

const exportJobs = async () => {
  try {
    await initializeDB()
    const queueJobs = await db.sync_queue.toArray()
    const payload = {
      when: new Date().toISOString(),
      jobs: queueJobs.map(j => ({ id: j.id, action: j.action, endpoint: j.endpoint, offlineId: j.offlineId, timestamp: j.timestamp, payload: j.payload }))
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sync-queue-${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Export jobs failed:', e)
    toast.error('匯出失敗')
  }
}

const clearAllQueue = async () => {
  modalStore.showConfirmation('確認清空佇列', `確定要清空所有 ${jobs.value.length} 個同步項目嗎？這將會永久刪除所有待同步的資料，此操作無法復原。`, async () => {
    try {
      await db.sync_queue.clear()
      await refreshQueue()
      toast.success('同步佇列已清空')
    } catch (error) {
      console.error('Failed to clear queue:', error)
      toast.error('清空佇列失敗')
    }
  })
}

onMounted(() => {
  refreshQueue()
})
</script>

<style scoped>
.v-code {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.v-theme--dark .v-code {
  background-color: #1e1e1e;
  color: #d4d4d4;
}

code {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

.v-theme--dark code {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
