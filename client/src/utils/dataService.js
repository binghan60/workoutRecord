/**
 * 數據服務抽象層
 * 統一處理 API 調用、訪客模式、離線操作和數據快取
 */
import apiClient from '@/api';
import { db } from './db'; // Import our IndexedDB service

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
      return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    }

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
      const newItem = { ...data, _id: `guest_${new Date().getTime()}`, user: this.userId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      const guestData = JSON.parse(localStorage.getItem(this.storageKey)) || [];
      guestData.unshift(newItem);
      localStorage.setItem(this.storageKey, JSON.stringify(guestData));
      return newItem;
    }

    if (!navigator.onLine) {
      console.log('Offline: Queuing ADD operation.');
      const optimisticItem = { ...data, _id: `offline_${new Date().getTime()}`, isOffline: true };
      const job = { action: 'add', endpoint: this.apiEndpoint, payload: data, timestamp: new Date().toISOString() };
      await db.sync_queue.add(job);
      await db[this.dbTable].add(optimisticItem);
      return optimisticItem;
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
    if (this.isGuest) {
      let guestData = JSON.parse(localStorage.getItem(this.storageKey)) || [];
      const filteredData = guestData.filter((item) => item._id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(filteredData));
      return true;
    }

    await db[this.dbTable].delete(id);

    if (id.toString().startsWith('offline_')) {
      console.log('Offline: Deleting an item that was created offline. Removing from queue.');
      return true;
    }

    if (!navigator.onLine) {
      console.log('Offline: Queuing DELETE operation.');
      const job = { action: 'delete', endpoint: `${this.apiEndpoint}/${id}`, timestamp: new Date().toISOString() };
      await db.sync_queue.add(job);
      return true;
    }

    // No unnecessary try/catch here.
    await apiClient.delete(`${this.apiEndpoint}/${id}`);
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
