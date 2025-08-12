// src/utils/initializer.js
import { useAuthStore } from '@/stores/auth';
import { db, initializeDB } from '@/utils/db';

let isInitialized = false;

/**
 * This function is the single entry point for all initial data loading.
 * It ensures that data is loaded only once per application lifecycle.
 * It will be called by the router's navigation guard.
 */
export async function loadInitialData() {
  if (isInitialized) {
    return;
  }

  const authStore = useAuthStore();

  // 先確保 IndexedDB 開啟，避免首屏期間有離線更新排隊但 DB 尚未 ready
  try { await initializeDB() } catch (e) { console.warn('IndexedDB init failed at app init (will retry lazily):', e) }
  
  // The init function now correctly handles auth state and fetches all data.
  await authStore.init();

  isInitialized = true;
  console.log('Application has been successfully initialized.');
}
