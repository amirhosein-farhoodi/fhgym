import { fileURLToPath, URL } from 'node:url'
// From vitest/config, not vite — it is the variant that types the `test` block below.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const DAY = 60 * 60 * 24

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    /*
     * Installable, offline-first app. The trainee scans a QR once, adds /me to their home
     * screen, and from then on it must open in a basement gym with no signal.
     *
     * Three layers, each with the strategy its data deserves:
     *   1. App shell (JS/CSS/HTML/icons) — precached at install, swapped on deploy.
     *   2. Exercise GIFs — cache-first: an exercise's animation never changes.
     *   3. Program data — not here. TanStack Query persists it to localStorage
     *      (see app/providers.tsx), so it renders instantly offline and refreshes in the
     *      background whenever the phone is online.
     */
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon-64.png', 'apple-touch-icon.png', 'logo-mark.png'],
      manifest: {
        id: '/me',
        name: 'FH Gym',
        short_name: 'FH Gym',
        description: 'Your workout program from your coach — works offline.',
        // Trainees install from /me. A coach who installs lands on /me, finds no trainee
        // and is forwarded to their dashboard, so one start_url serves both.
        start_url: '/me',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f1e8d7',
        theme_color: '#f1e8d7',
        lang: 'fa',
        dir: 'rtl',
        categories: ['health', 'fitness', 'sports'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // The original high-res logo sources are not used by the app; do not ship them offline.
        globIgnores: ['**/logo.png', '**/favicon.png', '**/logo-mark@3x.png'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Exercise animations (system mirror and coach uploads). Requested with CORS
            // (crossOrigin="anonymous" on every <img>), so responses are real 200s rather
            // than opaque ones, which Chrome pads to ~7 MB each against the storage quota.
            urlPattern: ({ url }) => url.pathname.startsWith('/storage/v1/object/public/exercise-media/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-media',
              expiration: { maxEntries: 600, maxAgeSeconds: 90 * DAY, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * DAY },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Listen on the LAN too, so the app can be opened from a phone on the same Wi-Fi.
    host: true,
  },
  // `pnpm build && pnpm preview` is the way to test the installed/offline app from a phone:
  // the service worker only exists in production builds.
  preview: {
    port: 4173,
    host: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
