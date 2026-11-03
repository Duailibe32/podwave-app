import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'assets/images/logo.png',
        ],
        manifest: {
          id: '/',
          name: 'PodWave — Catálogo Oficial de Pods',
          short_name: 'PodWave',
          description: 'Catálogo digital de pods premium e juices com contagem de puffs e entrega rápida em toda a região.',
          lang: 'pt-BR',
          dir: 'ltr',
          theme_color: '#080811',
          background_color: '#080811',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          prefer_related_applications: false,
          categories: ['shopping', 'lifestyle'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          importScripts: ['/order-notifications-sw.js'],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2}'],
          // Load the admin bundle and product images only when they are used.
          globIgnores: ['**/AdminPanel-*.js', '**/CheckoutDrawer-*.js', '**/AuthModal-*.js', '**/CustomerProfileModal-*.js', '**/ProductDetailModal-*.js'],
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) => request.destination === 'script' && url.origin === self.location.origin && url.pathname.startsWith('/assets/'),
              handler: 'CacheFirst',
              options: { cacheName: 'optional-app-scripts-v1', expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 90 }, cacheableResponse: { statuses: [200] } },
            },
            {
              // Supabase REST API — Apenas tabelas públicas de vitrine (sem store_settings ou coupons)
              urlPattern: ({ request, url }) =>
                request.method === 'GET' &&
                /\.supabase\.co$/i.test(url.hostname) &&
                /^\/rest\/v1\/(?:brands|product_models|flavor_variants|banners)\b/i.test(
                  url.pathname
                ),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'supabase-catalog-data-swr',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias
                },
                cacheableResponse: {
                  statuses: [200],
                },
              },
            },
            {
              // Dados locais/API do catálogo em JSON
              urlPattern: ({ request, url }) =>
                request.method === 'GET' &&
                (url.pathname.startsWith('/api/catalog') ||
                  (url.origin === self.location.origin &&
                    url.pathname.endsWith('.json') &&
                    !url.pathname.includes('manifest'))),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'catalog-json-data-swr',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Imagens do catálogo (locais e remotas/Supabase Storage) com Stale-While-Revalidate
              urlPattern: ({ request, url }) =>
                request.destination === 'image' &&
                (url.origin === self.location.origin || /\.supabase\.co$/i.test(url.hostname)),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'catalog-images-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /\/assets\/AdminPanel-[^/]+\.js$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'admin-code-cache',
                expiration: { maxEntries: 3, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [200] },
              },
            },
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
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});


