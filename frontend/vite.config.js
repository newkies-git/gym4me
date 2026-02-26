/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
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
