export const pwaOptions = {
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
  manifest: {
    name: 'Workout Record',
    short_name: 'WorkoutApp',
    description: 'A progressive web app for tracking your workouts.',
    theme_color: '#1976d2',
    background_color: '#ffffff',
    display: 'fullscreen',
    display_override: ['fullscreen', 'standalone'],
    orientation: 'portrait',
    scope: '/',
    start_url: '/',
    icons: [
      {
        src: 'favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
      {
        src: 'pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: 'pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: 'apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api/, /\/__/],
    skipWaiting: true,
    clientsClaim: true,

    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'gstatic-fonts-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /^https?:\/\/.*\/api\/.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
          networkTimeoutSeconds: 10,
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images-cache',
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
        },
      },
    ],
  },
}
