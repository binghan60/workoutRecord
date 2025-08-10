/**
 * 數據服務抽象層
 * 統一處理 API 調用、訪客模式、離線操作和數據快取
 */
import apiClient from '@/api';
import { db, initializeDB } from './db'; // Import our IndexedDB service

export class DataService {
  constructor(options = {}) {
    this.isGuest = options.isGuest || false;
    this.storageKey = options.storageKey; // For guest mode (localStorage)
    this.apiEndpoint = options.apiEndpoint;
    this.dbTable = options.dbTable; // The name of the Dexie table for this data
    this.userId = options.userId;
  }

  /**
   * 獲取所有數據 (Offline-First)
   */
  async fetchAll() {
    if (this.isGuest) {
      const guestData = JSON.parse(localStorage.getItem(this.storageKey)) || [];
      console.log(`✅ Guest data loaded from ${this.storageKey}:`, guestData.length, 'items');
      return guestData;
    }

    // 確保資料庫已初始化
    await initializeDB();

    if (navigator.onLine) {
      // This try/catch IS necessary because we have fallback logic.
      try {
        console.log(`Online: Fetching fresh data for ${this.dbTable}...`);
        const endpoint = this.apiEndpoint === '/workouts' ? '/workouts/all' : this.apiEndpoint;
        const response = await apiClient.get(endpoint);

        const data = response.data.data || response.data;

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
        await db[this.dbTable].bulkAdd(data);
        if (offlineItems.length > 0) {
          // Re-add offline items so they stay visible until sync completes
          await db[this.dbTable].bulkPut(offlineItems)
          console.log(`Preserved ${offlineItems.length} offline item(s) in "${this.dbTable}".`)
        }
        console.log(`Cached ${data.length} items to IndexedDB table "${this.dbTable}".`);

        // Return combined view so UI shows offline items too
        return [...data, ...offlineItems];
      } catch (error) {
        console.error(`API fetch for ${this.dbTable} failed, falling back to local data.`, error);
        return await db[this.dbTable].toArray();
      }
    } else {
      console.log(`Offline: Reading ${this.dbTable} from IndexedDB.`);
      return await db[this.dbTable].toArray();
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
        return await db[this.dbTable].get(id);
      }
    } else {
      console.log(`Offline: Getting item ${id} from IndexedDB table "${this.dbTable}".`);
      return await db[this.dbTable].get(id);
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
      console.log('🔌 Offline: Queuing ADD operation for', this.dbTable);
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
        const job = { 
          action: 'add', 
          endpoint: this.apiEndpoint, 
          payload: JSON.parse(JSON.stringify(data)), 
          timestamp: new Date().toISOString(),
          offlineId: optimisticItem._id // 記錄離線 ID 用於後續清理
        };
        
        // 先添加到同步佇列
        await db.sync_queue.add(job);
        console.log('📤 Job added to sync queue');
        
        // 再添加到本地資料庫
        await db[this.dbTable].put(optimisticItem);
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
    await db[this.dbTable].put(optimisticItem)

    // Fire-and-forget background request
    apiClient.post(this.apiEndpoint, data, { headers: { 'X-Background-Sync': 'true' } })
      .then(async (response) => {
        const savedData = response.data.data || response.data
        await db[this.dbTable].put(savedData)
        // Optionally clean up temp item if ids differ
        if (optimisticItem._id !== savedData._id) {
          await db[this.dbTable].delete(optimisticItem._id)
        }
      })
      .catch(async (error) => {
        console.error('Background add failed, queuing for retry:', error)
        await db.sync_queue.add({ action: 'add', endpoint: this.apiEndpoint, payload: cleanData, timestamp: new Date().toISOString() })
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
        guestData[index] = { ...guestData[index], ...data, updatedAt: new Date().toISOString() };
        localStorage.setItem(this.storageKey, JSON.stringify(guestData));
        return guestData[index];
      }
      throw new Error('項目未找到');
    }

    // 確保資料庫已初始化
    await initializeDB();

    if (!navigator.onLine) {
      // Optimistic local update + queue background sync
      console.log('Offline: Queuing UPDATE operation.');
      const job = { action: 'update', endpoint: `${this.apiEndpoint}/${id}`, payload: data, timestamp: new Date().toISOString() };
      await db.sync_queue.add(job);
      await db[this.dbTable].update(id, data);
      return { ...data, _id: id, isOffline: true };
    }

    // Online: optimistic local update + background request
    await db[this.dbTable].update(id, data)
    try { window.dispatchEvent(new CustomEvent('rovodev:local-data-changed', { detail: { table: this.dbTable, action: 'update', id } })) } catch {}
    apiClient.put(`${this.apiEndpoint}/${id}`, data, { headers: { 'X-Background-Sync': 'true' } })
      .then(async (response) => {
        const savedData = response.data.data || response.data
        await db[this.dbTable].put(savedData)
      })
      .catch(async (error) => {
        console.error('Background update failed, queuing for retry:', error)
        const job = { action: 'update', endpoint: `${this.apiEndpoint}/${id}`, payload: data, timestamp: new Date().toISOString() };
        await db.sync_queue.add(job)
      })
    return { ...data, _id: id, isOptimistic: true }
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

    // 如果是離線創建的項目，直接從本地刪除，無需同步
    if (id.toString().startsWith('offline_')) {
      console.log('🔌 Deleting offline-created item - no server sync needed');
      
      // 1. 從本地資料庫刪除
      await db[this.dbTable].delete(id);
      console.log(`✅ Deleted offline item from local ${this.dbTable}: ${id}`);
      
      // 2. 清理同步佇列中的相關任務
      try {
        console.log('🧹 Cleaning ALL sync queue jobs for this endpoint to prevent conflicts');
        
        // 查找所有相關端點的任務
        const allJobs = await db.sync_queue.where('endpoint').equals(this.apiEndpoint).toArray();
        console.log(`📋 Found ${allJobs.length} total jobs for endpoint ${this.apiEndpoint}`);
        
        let removedCount = 0;
        
        // 清理所有與此項目相關的任務
        for (const job of allJobs) {
          let shouldRemove = false;
          
          // 精確匹配：使用 offlineId
          if (job.offlineId === id) {
            shouldRemove = true;
            console.log(`🎯 Found exact match by offlineId: ${job.id}`);
          }
          
          // 如果是最近創建的 ADD 任務（可能是同一個項目）
          else if (job.action === 'add' && job.payload) {
            const jobTime = new Date(job.timestamp).getTime();
            const itemTime = parseInt(id.replace('offline_', ''));
            const timeDiff = Math.abs(jobTime - itemTime);
            
            // 10 秒內的 ADD 任務很可能是同一個項目
            if (timeDiff < 10000) {
              shouldRemove = true;
              console.log(`⏰ Found time-matched ADD job: ${job.id} (${timeDiff}ms diff)`);
            }
          }
          
          if (shouldRemove) {
            await db.sync_queue.delete(job.id);
            removedCount++;
            console.log(`🗑️ Removed sync job: ${job.id} (${job.action})`);
          }
        }
        
        console.log(`✅ Cleaned ${removedCount} sync jobs to prevent server conflicts`);
        
      } catch (error) {
        console.error('❌ Failed to clean sync queue:', error);
        // 繼續執行，不影響主要功能
      }
      
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
