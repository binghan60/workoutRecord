import Dexie from 'dexie';

// Initialize the Dexie database
export const db = new Dexie('workoutRecordDB');

// Define the database schema
db.version(1).stores({
  // The sync_queue table will store API requests that need to be synced.
  // '++id' means auto-incrementing primary key.
  // 'action' is an indexed field for potential lookups.
  sync_queue: '++id, action',
});
