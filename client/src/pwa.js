export const pwaOptions = {
  registerType: 'autoUpdate',
  // Explicitly include the favicon and other assets from the public folder
  includeAssets: ['favicon.ico'],
  manifest: {
    name: 'Workout Record',
    short_name: 'WorkoutApp',
    description: 'A progressive web app for tracking your workouts.',
    theme_color: '#ffffff',
    // NOTE: For a proper PWA experience, please create pwa-192x192.png and pwa-512x512.png
    // and place them in the 'public' directory.
    icons: [
      {
        src: 'favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon'
      },
      {
        src: 'pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: 'pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  },
  // Workbox configuration for the Service Worker
  workbox: {
    // Pre-cache all the assets specified in globPatterns.
    // This makes the app shell available offline.
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    
    // Runtime caching for assets that are not pre-cached, like fonts from Google.
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'gstatic-fonts-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      }
    ]
  }
};
