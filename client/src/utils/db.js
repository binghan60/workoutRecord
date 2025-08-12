import Dexie from 'dexie';

// Initialize the Dexie database
export const db = new Dexie('workoutRecordDB');

// Define the database schema
// Version 1: Initial schema for sync queue
db.version(1).stores({
  sync_queue: '++id, action',
});

// Version 2: Add tables for caching API data
db.version(2).stores({
  sync_queue: '++id, action, endpoint', // Keep the sync_queue, add endpoint index
  exercises: '&_id, name',    // Cache for exercises, _id is the primary key
  templates: '&_id, name',    // Cache for templates
  schedules: '&_id, date',    // Cache for weekly schedules
  workouts: '&_id, date',     // Cache for workout history
  bodyMetrics: '&_id, date'   // Cache for body metrics
});

// Version 3: Add userId index to all tables to separate data per user
// Note: This will upgrade existing DB and add new indexes without data loss
// We'll ensure at write-time that userId is set on each record and at read-time we filter by current userId
db.version(3).stores({
  sync_queue: '++id, action, endpoint, userId',
  exercises: '&_id, userId, name',
  templates: '&_id, userId, name',
  schedules: '&_id, userId, date',
  workouts: '&_id, userId, date',
  bodyMetrics: '&_id, userId, date',
  id_map: '&offlineId, userId, type, serverId' // map temporary/offline ids to server ids
});

// The '&' prefix on _id means it's the primary key and must be unique.
// Additional fields like 'name' or 'date' are indexed for faster lookups.

// 資料庫初始化 Promise
let dbInitialized = false;

// 安全的資料庫初始化函數
export const initializeDB = async () => {
  if (dbInitialized) return db;
  
  try {
    // 打開資料庫
    await db.open();
    console.log('✅ IndexedDB opened successfully');
    
    // 請求持久化存儲權限
    if (typeof navigator !== 'undefined' && 'storage' in navigator && 'persist' in navigator.storage) {
      try {
        const persistent = await navigator.storage.persist();
        if (persistent) {
          console.log('✅ Storage will not be cleared by the browser');
        } else {
          console.log('⚠️ Storage may be cleared by the browser under storage pressure');
        }
      } catch (storageError) {
        console.warn('⚠️ Could not request persistent storage:', storageError);
      }
    }
    
    dbInitialized = true;
    return db;
  } catch (error) {
    console.error('❌ Failed to initialize IndexedDB:', error);
    throw error;
  }
};

// 僅在瀏覽器環境中初始化
if (typeof window !== 'undefined') {
  // 延遲初始化，避免阻塞應用啟動
  setTimeout(() => {
    initializeDB().catch(error => {
      console.error('Database initialization failed:', error);
    });
  }, 100);
}
