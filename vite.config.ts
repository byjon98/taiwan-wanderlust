import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/taiwan-wanderlust/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'favicon.ico'],
        manifest: {
          name: 'Taiwan Wanderlust',
          short_name: '台湾行程',
          description: '您的终极台湾探索指南 — 景点、美食、夜市、行程规划等完整资讯',
          theme_color: '#2D3436',
          background_color: '#FAFAFA',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/taiwan-wanderlust/',
          start_url: '/taiwan-wanderlust/',
          lang: 'zh-TW',
          categories: ['travel', 'lifestyle'],
          icons: [
            { src: '/taiwan-wanderlust/icons/icon-48x48.png',   sizes: '48x48',   type: 'image/png' },
            { src: '/taiwan-wanderlust/icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
            { src: '/taiwan-wanderlust/icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
            { src: '/taiwan-wanderlust/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
            { src: '/taiwan-wanderlust/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/taiwan-wanderlust/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,pdf}'],
          navigateFallbackDenylist: [/policy\.pdf/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'leaflet-vendor': ['leaflet', 'react-leaflet'],
            'lucide-icons': ['lucide-react'],
            'firebase-vendor': ['firebase/app', 'firebase/firestore']
          }
        }
      }
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, '.') },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
