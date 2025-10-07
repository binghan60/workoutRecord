/**
 * 數據服務抽象層
 * 統一處理 API 調用、訪客模式、離線操作和數據快取
 */
import apiClient from '@/api';
import { db, initializeDB } from './db'; // Import our IndexedDB service

// 用於處理樂觀創建和快速刪除之間的競爭條件
const pendingDeletes = new Set();

export class DataService {
  constructor(options = {}) {
    this.isGuest = options.isGuest || false;
    this.storageKey = options.storageKey; // For guest mode (localStorage)
    this.apiEndpoint = options.apiEndpoint;
    this.dbTable = options.dbTable; // The name of the Dexie table for this data
    this.userId = options.userId;
  }

  /**
   * 強制從伺服器重新載入數據
   */
  async forceRefresh() {
    return await this.fetchAll(true)
  }

  /**
   * 獲取所有數據 (Offline-First)
   */
  async fetchAll(forceOnline = false) {
    if (this.isGuest) {
      const guestData = JSON.parse(localStorage.getItem(this.storageKey)) || [];
      console.log(`✅ Guest data loaded from ${this.storageKey}:`, guestData.length, 'items');
      return guestData;
    }

    // 確保資料庫已初始化
    await initializeDB();

    if (navigator.onLine || forceOnline) {
      // This try/catch IS necessary because we have fallback logic.
      try {
        console.log(`${forceOnline ? 'Forced' : 'Online'}: Fetching fresh data for ${this.dbTable}...`);
        const endpoint = this.apiEndpoint === '/workouts' ? '/workouts/all' : this.apiEndpoint;
        const response = await apiClient.get(endpoint);

        const data = response.data.data || response.data;

        // Filter out items that are pending deletion locally to prevent resurrection after refresh
        let filteredData = data;
        try {
          const deleteJobs = await db.sync_queue.where('action').equals('delete').toArray();
          if (deleteJobs && deleteJobs.length) {
            const idsToRemove = new Set(
              deleteJobs
                .filter(j => (j.endpoint || '').startsWith(`${this.apiEndpoint}/`))
                .map(j => (j.endpoint || '').split('/').pop())
            );
            if (idsToRemove.size > 0) {
              filteredData = data.filter(item => !idsToRemove.has(item._id));
              console.log(`[FETCH] Filtered out ${data.length - filteredData.length} pending-deleted item(s) from ${this.dbTable}.`);
            }
          }
        } catch (e) {
          console.warn('Failed to filter pending deletions from fetchAll:', e);
        }

        if (!Array.isArray(data)) {
          console.error(`Data for ${this.dbTable} is not an array!`, data);
          return await db[this.dbTable].toArray();
        }

        // Preserve offline-created items so they are not lost before they sync
        let offlineItems = []
        try {
          if (db[this.dbTable] && db[this.dbTable].where) {
            offlineItems = await db[this.dbTable].where('_id').startsWith('offline_').toArray()
          }
        } catch (e) {
          console.warn(`Failed to read offline items for ${this.dbTable}:`, e)
        }

        await db[this.dbTable].clear();
        const dataWithUser = filteredData.map(item => ({ ...item, userId: this.userId || 'guest' }))
        await db[this.dbTable].bulkAdd(dataWithUser);
        if (offlineItems.length > 0) {
          // Re-add offline items so they stay visible until sync completes
          await db[this.dbTable].bulkPut(offlineItems)
          console.log(`Preserved ${offlineItems.length} offline item(s) in "${this.dbTable}".`)
        }
        console.log(`Cached ${filteredData.length} items to IndexedDB table "${this.dbTable}".`);

        // Return combined view so UI shows offline items too
        return [...filteredData, ...offlineItems];
      } catch (error) {
        console.error(`API fetch for ${this.dbTable} failed, falling back to local data.`, error);
        return await db[this.dbTable].where('userId').equals(this.userId || 'guest').toArray();
      }
    } else {
      console.log(`Offline: Reading ${this.dbTable} from IndexedDB.`);
      return await db[this.dbTable].where('userId').equals(this.userId || 'guest').toArray();
    }
  }

  /**
   * 根據 ID 獲取單個項目 (Offline-First)
   */
  async getById(id) {
    if (this.isGuest) {
      const guestData = JSON.parse(localStorage.getItem(this.storageKey)) || [];
      return guestData.find((item) => item._id === id) || null;
    }

    // 確保資料庫已初始化
    await initializeDB();

    if (navigator.onLine) {
      // This try/catch IS necessary for fallback logic.
      try {
        const response = await apiClient.get(`${this.apiEndpoint}/${id}`);
        const data = response.data.data || response.data;
        await db[this.dbTable].put(data);
        return data;
      } catch (error) {
        console.warn(`API fetch for item ${id} failed, falling back to local DB.`, error);
        return await db[this.dbTable].where('_id').equals(id).and(item => item.userId === (this.userId || 'guest')).first();
      }
    } else {
      console.log(`Offline: Getting item ${id} from IndexedDB table "${this.dbTable}".`);
      return await db[this.dbTable].where('_id').equals(id).and(item => item.userId === (this.userId || 'guest')).first();
    }
  }

  /**
   * 新增數據
   */
  async add(data) {
    if (this.isGuest) {
      // 深度克隆數據以確保序列化兼容性
      const cleanData = JSON.parse(JSON.stringify(data));
      
      const newItem = { 
        ...cleanData, 
        _id: `guest_${new Date().getTime()}`, 
        user: this.userId || 'guest', 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(),
        isCustom: true // 確保訪客創建的項目標記為自定義
      };
      const guestData = JSON.parse(localStorage.getItem(this.storageKey)) || [];
      guestData.unshift(newItem);
      localStorage.setItem(this.storageKey, JSON.stringify(guestData));
      console.log(`✅ Guest item added to ${this.storageKey}:`, newItem);
      return newItem;
    }

    // 確保資料庫已初始化
    await initializeDB();

    if (!navigator.onLine) {
      // Always perform optimistic UI update and queue background sync
      console.log('🔌 Offline: Queuing ADD operation for', this.dbTable, 'endpoint:', this.apiEndpoint);
      try {
        // 深度克隆數據以確保 IndexedDB 兼容性
        const cleanData = JSON.parse(JSON.stringify(data));
        
        const optimisticItem = { 
          ...cleanData, 
          _id: `offline_${new Date().getTime()}`, 
          user: this.userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isOffline: true,
          isCustom: true // 離線創建的項目標記為自定義
        };
        
        console.log('📝 Creating optimistic item:', optimisticItem);
        
        // 確保 payload 也是可序列化的，並記錄關聯的離線 ID
        const payload = JSON.parse(JSON.stringify(cleanData))
        delete payload._id // 讓伺服器產生正式 _id
        const job = { 
          action: 'add', 
          endpoint: this.apiEndpoint, 
          payload, 
          timestamp: new Date().toISOString(),
          offlineId: optimisticItem._id // 記錄離線 ID 用於後續清理
        };
        
        // 先添加到同步佇列
        await db.sync_queue.add(job);
        console.log('📤 Job added to sync queue');
        
        // Trigger sync queue count update
        try { window.dispatchEvent(new CustomEvent('rovodev:sync-queue-changed')) } catch {}
        
        // 再添加到本地資料庫
        await db[this.dbTable].put({ ...optimisticItem, userId: this.userId || 'guest' });
        console.log(`✅ Offline item added to ${this.dbTable}:`, optimisticItem);
        
        // Trigger a soft refresh to include this item in views that rely on fetchAll
        try { window.dispatchEvent(new CustomEvent('rovodev:local-data-changed', { detail: { table: this.dbTable, action: 'add', id: optimisticItem._id } })) } catch {}
        
        return optimisticItem;
      } catch (error) {
        console.error('❌ Failed to create offline item:', error);
        throw new Error(`離線模式下建立 ${this.dbTable} 失敗: ${error.message}`);
      }
    }

    // Online: do optimistic UI update first, then background sync request
    // Create a provisional local item (without offline_ prefix) to deliver snappy UX
    const cleanData = JSON.parse(JSON.stringify(data));
    const optimisticItem = {
      ...cleanData,
      _id: cleanData._id || `temp_${Date.now()}`,
      user: this.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOptimistic: true,
      isCustom: true
    }
    await db[this.dbTable].put({ ...optimisticItem, userId: this.userId || 'guest' })

    // Fire-and-forget background request
    apiClient.post(this.apiEndpoint, data, { headers: { 'X-Background-Sync': 'true' } })
      .then(async (response) => {
        const savedData = response.data.data || response.data
        const normalized = JSON.parse(JSON.stringify(savedData))
        const tempId = optimisticItem._id;

        // --- DEBUG LOGGING START ---
        console.log(`[ADD.THEN] POST success for ${this.apiEndpoint}. Temp ID: ${tempId}, Real ID: ${normalized._id}`);
        console.log(`[ADD.THEN] Current pendingDeletes set:`, JSON.stringify(Array.from(pendingDeletes)));
        console.log(`[ADD.THEN] Checking if pendingDeletes has tempId "${tempId}":`, pendingDeletes.has(tempId));
        // --- DEBUG LOGGING END ---

        // **RACE CONDITION FIX**: Check if this item was deleted while it was being created
        // Persist ID mapping for this optimistic temp item -> real server ID
        try {
          await db.id_map.put({
            offlineId: tempId,
            userId: this.userId || 'guest',
            type: this.dbTable,
            serverId: normalized._id
          })
        } catch (e) {
          console.warn('Failed to save id_map mapping:', e)
        }

        if (pendingDeletes.has(tempId)) {
          console.log(`[FIX] Item ${normalized._id} (formerly ${tempId}) was deleted before creation confirmed. Deleting from server now.`);
          // Use the REAL ID to delete from the server
          try {
            await apiClient.delete(`${this.apiEndpoint}/${normalized._id}`);
          } catch (e) {
            console.warn('Server delete on race-fix failed, queuing job:', e)
            try {
              await db.sync_queue.add({ action: 'delete', endpoint: `${this.apiEndpoint}/${normalized._id}`, timestamp: new Date().toISOString() })
            } catch {}
          }
          try { await db[this.dbTable].delete(normalized._id) } catch {}
          pendingDeletes.delete(tempId); // Clean up the set
          try { await db.id_map.delete(tempId) } catch {}
          return;
        }
        
        console.log(`[ADD.THEN] Item was not in pendingDeletes. Proceeding with local DB update.`);

        if (Array.isArray(normalized)) {
          await db[this.dbTable].bulkPut(normalized)
        } else {
          await db[this.dbTable].put({ ...normalized, userId: this.userId || 'guest' })
        }
        // Optionally clean up temp item if ids differ
        if (!Array.isArray(normalized) && tempId !== normalized._id) {
          await db[this.dbTable].delete(tempId)
        }
      })
      .catch(async (error) => {
        console.error('Background add failed, queuing for retry:', error)
        await db.sync_queue.add({ action: 'add', endpoint: this.apiEndpoint, payload: cleanData, timestamp: new Date().toISOString(), offlineId: optimisticItem._id })
        try { window.dispatchEvent(new CustomEvent('rovodev:sync-queue-changed')) } catch {}
      })

    return optimisticItem;
  }

  /**
   * 更新數據
   */
  async update(id, data) {
    if (this.isGuest) {
      let guestData = JSON.parse(localStorage.getItem(this.storageKey)) || [];
      const index = guestData.findIndex((item) => item._id === id);
      if (index !== -1) {
        // 深度拷貝以避免存入非序列化數據
        const cleanData = JSON.parse(JSON.stringify(data))
        guestData[index] = { ...guestData[index], ...cleanData, updatedAt: new Date().toISOString() };
        localStorage.setItem(this.storageKey, JSON.stringify(guestData));
        return guestData[index];
      }
      throw new Error('項目未找到');
    }

    // 確保資料庫已初始化
    await initializeDB();

    // 先將資料轉為可序列化的純物件（避免 Vue Proxy / 循環參照）
    const cleanData = JSON.parse(JSON.stringify(data))
    cleanData.updatedAt = new Date().toISOString()

    // 若是臨時(temp_)或離線(offline_)項目，僅在本地更新，並嘗試合併至待新增的同步任務
    if (id.toString().startsWith('temp_') || id.toString().startsWith('offline_')) {
      try {
        await db[this.dbTable].update(id, cleanData)
        // 嘗試找到對應的 add 任務並更新其 payload
        try {
          const pendingAdds = await db.sync_queue.where('endpoint').equals(this.apiEndpoint).toArray()
          const targetJob = pendingAdds.find(j => j.action === 'add' && j.offlineId === id)
          if (targetJob) {
            targetJob.payload = cleanData
            await db.sync_queue.put(targetJob)
          }
        } catch (e) {
          console.warn('Failed to update pending add job for temp/offline item:', e)
        }
      } catch (e) {
        console.error('Failed to update local temp/offline item:', e)
      }
      return { ...cleanData, _id: id, isOffline: true }
    }

    if (!navigator.onLine) {
      // Optimistic local update + queue background sync
      console.log('Offline: Queuing UPDATE operation.');
      const job = { action: 'update', endpoint: `${this.apiEndpoint}/${id}`, payload: cleanData, timestamp: new Date().toISOString() };
      await db.sync_queue.add(job);
      try { window.dispatchEvent(new CustomEvent('rovodev:sync-queue-changed')) } catch {}
      await db[this.dbTable].update(id, { ...cleanData, userId: this.userId || 'guest' });
      return { ...cleanData, _id: id, isOffline: true };
    }

    // Online: optimistic local update + background request
    await db[this.dbTable].update(id, { ...cleanData, userId: this.userId || 'guest' })
    try { window.dispatchEvent(new CustomEvent('rovodev:local-data-changed', { detail: { table: this.dbTable, action: 'update', id } })) } catch {}
    apiClient.put(`${this.apiEndpoint}/${id}`, cleanData, { headers: { 'X-Background-Sync': 'true' } })
      .then(async (response) => {
        const savedData = response.data.data || response.data
        const normalized = JSON.parse(JSON.stringify(savedData))
        if (Array.isArray(normalized)) {
          await db[this.dbTable].bulkPut(normalized.map(item => ({ ...item, userId: this.userId || 'guest' })))
        } else {
          await db[this.dbTable].put({ ...normalized, userId: this.userId || 'guest' })
        }
      })
      .catch(async (error) => {
        console.error('Background update failed, queuing for retry:', error)
        const job = { action: 'update', endpoint: `${this.apiEndpoint}/${id}`, payload: cleanData, timestamp: new Date().toISOString() };
        await db.sync_queue.add(job)
      })
    return { ...cleanData, _id: id, isOptimistic: true }
  }

  /**
   * 刪除數據
   */
  async delete(id) {
    console.log(`🗑️ Deleting item ${id} from ${this.dbTable}`);
    
    if (this.isGuest) {
      let guestData = JSON.parse(localStorage.getItem(this.storageKey)) || [];
      const filteredData = guestData.filter((item) => item._id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(filteredData));
      console.log(`✅ Guest item deleted from ${this.storageKey}`);
      return true;
    }

    // 確保資料庫已初始化
    await initializeDB();

    // **RACE CONDITION FIX**: Handle optimistic 'temp_' items
    if (id.toString().startsWith('temp_')) {
      console.log(`[FIX] Deleting a temporary optimistic item (${id}). It will be fully deleted after server confirmation if already created on server.`);
      // Delete locally first (temp record)
      try { await db[this.dbTable].delete(id) } catch {}
      pendingDeletes.add(id)

      // Try to resolve real server ID from id_map immediately (covers case where add already finished)
      try {
        const mapping = await db.id_map.get(id)
        if (mapping && mapping.serverId) {
          const serverId = mapping.serverId
          console.log(`[FIX] Found serverId ${serverId} for temp ${id}. Proceeding to delete on server or queue.`)
          if (!navigator.onLine) {
            // Queue delete job for later
            await db.sync_queue.add({ action: 'delete', endpoint: `${this.apiEndpoint}/${serverId}`, timestamp: new Date().toISOString() })
            try { window.dispatchEvent(new CustomEvent('rovodev:sync-queue-changed')) } catch {}
          } else {
            try {
              await apiClient.delete(`${this.apiEndpoint}/${serverId}`)
              console.log(`✅ Server item ${serverId} deleted (mapped from ${id})`)
            } catch (e) {
              console.warn('Server delete for mapped temp failed, queuing:', e)
              try { await db.sync_queue.add({ action: 'delete', endpoint: `${this.apiEndpoint}/${serverId}`, timestamp: new Date().toISOString() }) } catch {}
              try { window.dispatchEvent(new CustomEvent('rovodev:sync-queue-changed')) } catch {}
            }
          }
          // Also remove the real item locally if present
          try { await db[this.dbTable].delete(serverId) } catch {}
          // Clean up mapping and pending mark
          try { await db.id_map.delete(id) } catch {}
          pendingDeletes.delete(id)
        }
      } catch (e) {
        console.warn('Error checking id_map for temp delete:', e)
      }
      return true;
    }

    // 如果是離線創建的項目，直接從本地刪除，並清理同步佇列
    if (id.toString().startsWith('offline_')) {
      console.log('🔌 Deleting offline-created item - no server sync needed');
      
      await db[this.dbTable].delete(id);
      console.log(`✅ Deleted offline item from local ${this.dbTable}: ${id}`);
      
      try {
        // 精確查找並刪除對應的 'add' 任務
        const jobToDelete = await db.sync_queue.where({ offlineId: id, action: 'add' }).first();
        if (jobToDelete) {
          await db.sync_queue.delete(jobToDelete.id);
          console.log(`✅ Cleaned corresponding 'add' job from sync queue: ${jobToDelete.id}`);
        }
      } catch (error) {
        console.error('❌ Failed to clean sync queue for offline item:', error);
      }
      
      try { window.dispatchEvent(new CustomEvent('rovodev:sync-queue-changed')) } catch {}
      return true;
    }

    // 從本地資料庫刪除（樂觀 UI）
    await db[this.dbTable].delete(id);
    console.log(`✅ Item ${id} deleted from local ${this.dbTable}`);
    try { window.dispatchEvent(new CustomEvent('rovodev:local-data-changed', { detail: { table: this.dbTable, action: 'delete', id } })) } catch {}

    if (!navigator.onLine) {
      console.log('🔌 Offline: Queuing DELETE operation for server sync');
      const job = { action: 'delete', endpoint: `${this.apiEndpoint}/${id}`, timestamp: new Date().toISOString() };
      await db.sync_queue.add(job);
      console.log('📤 Delete job added to sync queue');
      try { window.dispatchEvent(new CustomEvent('rovodev:sync-queue-changed')) } catch {}
      return true;
    }

    // 線上模式：背景同步刪除
    apiClient.delete(`${this.apiEndpoint}/${id}`, { headers: { 'X-Background-Sync': 'true' } })
      .then(() => console.log(`✅ Item ${id} deleted from server`))
      .catch(async (error) => {
        console.error(`❌ Background delete failed for item ${id}, queuing:`, error)
        const job = { action: 'delete', endpoint: `${this.apiEndpoint}/${id}`, timestamp: new Date().toISOString() };
        await db.sync_queue.add(job)
      })
    return true;
  }
}

/**
 * 創建數據服務實例的工廠函數
 */
export function createDataService(authStore, config) {
  return new DataService({
    isGuest: authStore.isGuest,
    userId: authStore.user?._id,
    ...config,
  });
}
