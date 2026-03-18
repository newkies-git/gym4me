<template>
  <div class="app-root">
    <AppLayout />

    <div class="toast-container">
      <div v-for="toast in ui.toasts" :key="toast.id" class="toast-item glass" :class="toast.type">
        {{ toast.message }}
        <button @click="ui.removeToast(toast.id)" class="close-btn" type="button">&times;</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useUIStore } from './stores/uiStore'
import { useThemeStore } from './stores/themeStore'
import AppLayout from './layouts/AppLayout.vue'

const themeStore = useThemeStore()
const ui = useUIStore()

onMounted(() => {
  themeStore.applyTheme()
})
</script>

<style scoped>
.app-root {
  min-height: 100vh;
}

.toast-container {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 9999;
}

.toast-item.success { border-left: 4px solid #10b981; }
.toast-item.error { border-left: 4px solid var(--accent); }
.toast-item.info { border-left: 4px solid var(--primary); }
.toast-item.warning { border-left: 4px solid #f59e0b; }

.close-btn {
  background: none;
  color: white;
  font-size: 1.2rem;
  line-height: 1;
  padding: 0.2rem;
  opacity: 0.7;
}

.close-btn:hover {
  opacity: 1;
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
</style>
