/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'Gym4me',
        short_name: 'Gym4me',
        description: 'Gym4me personal training manager',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/vue') || id.includes('node_modules/pinia') || id.includes('node_modules/vue-router') || id.includes('node_modules/vue-i18n')) {
            return 'vendor-vue'
          }
          if (id.includes('node_modules/@firebase') || id.includes('node_modules/idb')) {
            return 'vendor-firebase'
          }
          if (id.includes('node_modules/firebase')) return 'vendor-firebase'
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/vue-chartjs')) return 'vendor-charts'
          if (id.includes('node_modules')) return 'vendor'
        }
      }
    }
  },
  test: {
    environment: 'happy-dom',
    server: {
      deps: {
        inline: [/@csstools.*/, /@asamuzakjp.*/]
      }
    }
  }
})
