<template>
  <div class="app-wrapper">
    <!-- Navigation -->
    <nav class="glass nav-bar">
      <div class="container nav-content">
        <router-link to="/" class="logo">gym4me</router-link>
        <div class="nav-links">
          <template v-if="auth.isAuthenticated">
            <router-link to="/dashboard" class="btn btn-ghost">Dashboard</router-link>
            <router-link to="/calendar" class="btn btn-primary">Calendar</router-link>
            
            <!-- Specific Roles -->
            <router-link v-if="auth.isTrainer" to="/trainer-profile" class="btn btn-ghost">Trainer Bio</router-link>
            <router-link v-if="auth.isManager" to="/manage-trainers" class="btn btn-ghost">Trainer MGT</router-link>
            <router-link v-if="auth.isManager" to="/manage-gym" class="btn btn-ghost">Gym MGT</router-link>
            <router-link v-if="auth.isSiteAdmin" to="/manage-managers" class="btn btn-ghost">Manager MGT</router-link>
            
            <router-link to="/profile" class="btn btn-ghost">Profile</router-link>
            <router-link to="/settings" class="btn btn-ghost">Settings</router-link>
            
            <div class="user-info">
              <span class="sm-text">{{ auth.user?.nickname || auth.user?.email }}</span>
              <button @click="logout" class="btn btn-ghost btn-sm">Logout</button>
            </div>
          </template>
          <template v-else>
            <router-link to="/auth" class="btn btn-primary">Login / Sign Up</router-link>
          </template>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main>
      <router-view />
    </main>

    <!-- Global Toast Notifications -->
    <div class="toast-container">
      <div v-for="toast in ui.toasts" :key="toast.id" class="toast-item glass" :class="toast.type">
        {{ toast.message }}
        <button @click="ui.removeToast(toast.id)" class="close-btn">&times;</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from './stores/auth'
import { useUIStore } from './stores/uiStore'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const ui = useUIStore()
const router = useRouter()

const logout = () => {
  auth.logout()
  ui.showToast('Successfully logged out.', 'info')
  router.push('/')
}
</script>

<style scoped>
.app-wrapper { min-height: 100vh; }

.nav-bar {
  position: sticky; top: 0; z-index: 100;
  border-bottom: 1px solid var(--border);
}

.nav-content {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.75rem 0;
}

.logo {
  font-size: 1.5rem; font-weight: 700;
  background: linear-gradient(135deg, #818cf8, #c084fc);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}

.nav-links { display: flex; gap: 1rem; align-items: center; }

.user-info {
  display: flex; gap: 0.75rem; align-items: center;
  margin-left: 1rem; padding-left: 1rem; border-left: 1px solid var(--border);
}

.sm-text { font-size: 0.85rem; color: var(--text-muted); }

/* Global Toasts Styling */
.toast-container {
  position: fixed; bottom: 2rem; right: 2rem;
  z-index: 9999; display: flex; flex-direction: column; gap: 0.75rem;
}

.toast-item {
  padding: 1rem 1.5rem; border-radius: 0.75rem;
  color: white; font-weight: 600; font-size: 0.95rem;
  display: flex; justify-content: space-between; align-items: center; gap: 1rem;
  min-width: 250px; animation: slideIn 0.3s ease-out;
}

.toast-item.success { border-left: 4px solid #10b981; }
.toast-item.error { border-left: 4px solid var(--accent); }
.toast-item.info { border-left: 4px solid var(--primary); }
.toast-item.warning { border-left: 4px solid #f59e0b; }

.close-btn { background: none; color: white; font-size: 1.2rem; line-height: 1; padding: 0.2rem; opacity: 0.7; }
.close-btn:hover { opacity: 1; }

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@media (max-width: 768px) {
  .nav-links { display: none; } /* Mobile menu could be added here later */
}
</style>
