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

        await db[this.dbTable].clear();
        await db[this.dbTable].bulkAdd(data);
        console.log(`Cached ${data.length} items to IndexedDB table "${this.dbTable}".`);

        return data;
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
        
        // 確保 payload 也是可序列化的
        const job = { 
          action: 'add', 
          endpoint: this.apiEndpoint, 
          payload: JSON.parse(JSON.stringify(data)), 
          timestamp: new Date().toISOString() 
        };
        
        // 先添加到同步佇列
        await db.sync_queue.add(job);
        console.log('📤 Job added to sync queue');
        
        // 再添加到本地資料庫
        await db[this.dbTable].put(optimisticItem);
        console.log(`✅ Offline item added to ${this.dbTable}:`, optimisticItem);
        
        return optimisticItem;
      } catch (error) {
        console.error('❌ Failed to create offline item:', error);
        throw new Error(`離線模式下建立 ${this.dbTable} 失敗: ${error.message}`);
      }
    }

    // No unnecessary try/catch here. If it fails, the error propagates to the caller (the store).
    const response = await apiClient.post(this.apiEndpoint, data);
    const savedData = response.data.data || response.data;
    await db[this.dbTable].put(savedData);
    return savedData;
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
      console.log('Offline: Queuing UPDATE operation.');
      const job = { action: 'update', endpoint: `${this.apiEndpoint}/${id}`, payload: data, timestamp: new Date().toISOString() };
      await db.sync_queue.add(job);
      await db[this.dbTable].update(id, data);
      return { ...data, _id: id, isOffline: true };
    }

    // No unnecessary try/catch here.
    const response = await apiClient.put(`${this.apiEndpoint}/${id}`, data);
    const savedData = response.data.data || response.data;
    await db[this.dbTable].put(savedData);
    return savedData;
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

    // 如果是離線創建的項目，直接從本地刪除
    if (id.toString().startsWith('offline_')) {
      console.log('🔌 Deleting offline-created item, removing from local DB only');
      await db[this.dbTable].delete(id);
      // 也需要從同步佇列中移除對應的新增任務
      // 針對離線建立的課表，需要找到對應的 ADD 任務並移除
      try {
        console.log('🔍 Looking for sync queue jobs to clean up for offline item:', id);
        
        // 使用 endpoint 索引查詢，這樣更安全
        const jobs = await db.sync_queue.where('endpoint').equals(this.apiEndpoint).toArray();
        console.log(`📋 Found ${jobs.length} jobs for endpoint ${this.apiEndpoint}`);
        
        for (const job of jobs) {
          // 檢查是否是新增任務，且 payload 包含相同的資料
          if (job.action === 'add' && job.payload) {
            // 對於離線建立的項目，payload 中不會有 _id，需要比較其他欄位
            // 比較課表名稱和時間戳來判斷是否為同一個項目
            const payloadTime = new Date(job.timestamp);
            const itemTime = new Date(id.replace('offline_', ''));
            const timeDiff = Math.abs(payloadTime.getTime() - itemTime.getTime());
            
            // 如果時間差在 1 分鐘內，且是同類型的項目，就認為是同一個
            if (timeDiff < 60000 && job.payload.name) {
              await db.sync_queue.delete(job.id);
              console.log('🗑️ Removed corresponding add job from sync queue:', job.id);
              break; // 找到一個就夠了
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not clean sync queue:', error);
        // 不拋出錯誤，因為這不是關鍵操作
      }
      return true;
    }

    // 從本地資料庫刪除
    await db[this.dbTable].delete(id);
    console.log(`✅ Item ${id} deleted from local ${this.dbTable}`);

    if (!navigator.onLine) {
      console.log('🔌 Offline: Queuing DELETE operation for server sync');
      const job = { action: 'delete', endpoint: `${this.apiEndpoint}/${id}`, timestamp: new Date().toISOString() };
      await db.sync_queue.add(job);
      console.log('📤 Delete job added to sync queue');
      return true;
    }

    // 線上模式：直接從伺服器刪除
    try {
      await apiClient.delete(`${this.apiEndpoint}/${id}`);
      console.log(`✅ Item ${id} deleted from server`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete item ${id} from server:`, error);
      // 如果伺服器刪除失敗，重新加入到本地（回滾）
      // 這裡可以選擇是否要回滾，或者加入同步佇列等下次重試
      throw error;
    }
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
