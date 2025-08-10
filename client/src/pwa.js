export const pwaOptions = {
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico'],
  manifest: {
    name: 'Workout Record',
    short_name: 'WorkoutApp',
    description: 'A progressive web app for tracking your workouts.',
    theme_color: '#1976d2',
    background_color: '#ffffff',
    display: 'fullscreen',
    orientation: 'portrait',
    scope: '/',
    start_url: '/',
    icons: [
      {
        src: 'favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon'
      },
      {
        src: 'pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: 'pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
    
    // 確保 SPA 路由正常工作
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api/, /\/__/],
    
    // 跳過等待，立即啟動新的 service worker
    skipWaiting: true,
    clientsClaim: true,

    runtimeCaching: [
      // 快取字體
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
      },
      // 快取 API 請求（NetworkFirst 策略）
      {
        urlPattern: /^https?:\/\/.*\/api\/.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 // 1 day
          },
          cacheableResponse: {
            statuses: [0, 200]
          },
          networkTimeoutSeconds: 10
        }
      },
      // 快取圖片
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images-cache',
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
          }
        }
      }
    ]
  }
};
