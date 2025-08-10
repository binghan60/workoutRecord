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
  sync_queue: '++id, action', // Keep the sync_queue
  exercises: '&_id, name',    // Cache for exercises, _id is the primary key
  templates: '&_id, name',    // Cache for templates
  schedules: '&_id, date',    // Cache for weekly schedules
  workouts: '&_id, date',     // Cache for workout history
  bodyMetrics: '&_id, date'   // Cache for body metrics
});

// The '&' prefix on _id means it's the primary key and must be unique.
// Additional fields like 'name' or 'date' are indexed for faster lookups.

// 請求持久化存儲權限
if ('storage' in navigator && 'persist' in navigator.storage) {
  navigator.storage.persist().then(persistent => {
    if (persistent) {
      console.log('✅ Storage will not be cleared by the browser');
    } else {
      console.log('⚠️ Storage may be cleared by the browser under storage pressure');
    }
  });
}

// 監聽 IndexedDB 錯誤
db.on('error', (error) => {
  console.error('IndexedDB error:', error);
});

// 資料庫打開成功的回調
db.on('ready', () => {
  console.log('✅ IndexedDB opened successfully');
  return db.open();
});
