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
