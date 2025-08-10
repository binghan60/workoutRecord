// src/utils/initializer.js
import { useAuthStore } from '@/stores/auth';

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
  
  // The init function now correctly handles auth state and fetches all data.
  await authStore.init();

  isInitialized = true;
  console.log('Application has been successfully initialized.');
}
