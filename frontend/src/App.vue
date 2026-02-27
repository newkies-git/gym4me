<template>
  <div class="app-wrapper">
    <!-- Navigation -->
    <nav class="glass nav-bar">
      <div class="container nav-content">
        <router-link to="/" class="logo">gym4me</router-link>
        <div class="nav-links">
          <template v-if="auth.isAuthenticated">
            <router-link to="/dashboard" class="btn btn-ghost">{{ t('nav.dashboard') }}</router-link>
            <router-link to="/calendar" class="btn btn-primary">{{ t('nav.calendar') }}</router-link>
            
            <!-- Specific Roles -->
            <router-link v-if="auth.isTrainer" to="/trainer-profile" class="btn btn-ghost">{{ t('nav.trainerBio') }}</router-link>
            <router-link v-if="auth.isManager" to="/manager/trainers" class="btn btn-ghost">{{ t('nav.trainerMgt') }}</router-link>
            <router-link v-if="auth.isManager" to="/manager/gym" class="btn btn-ghost">{{ t('nav.gymMgt') }}</router-link>
            <router-link v-if="auth.isSiteAdmin" to="/admin/managers" class="btn btn-ghost">{{ t('nav.managerMgt') }}</router-link>
            
            <router-link to="/profile" class="btn btn-ghost">{{ t('nav.profile') }}</router-link>
            <router-link to="/settings" class="btn btn-ghost">{{ t('nav.settings') }}</router-link>
            
            <div class="user-info">
              <img v-if="(auth.user as any)?.profileImageUrl" :src="(auth.user as any)?.profileImageUrl" class="avatar-mini" alt="avatar" />
              <span class="sm-text">{{ auth.user?.nickname || auth.user?.email }}</span>
              <button @click="logout" class="btn btn-ghost btn-sm">{{ t('nav.logout') }}</button>
            </div>
          </template>
          <template v-else>
            <router-link to="/auth" class="btn btn-primary">{{ t('nav.loginSignup') }}</router-link>
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
import { useI18n } from 'vue-i18n'

const auth = useAuthStore()
const ui = useUIStore()
const router = useRouter()
const { t } = useI18n()

const logout = () => {
  auth.logout()
  ui.showToast(t('common.loggedOut'), 'info')
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.25rem;
  padding: 0.55rem 0;
}

.logo {
  font-size: 1.5rem; font-weight: 700;
  background: linear-gradient(135deg, #818cf8, #c084fc);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}

.nav-links {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 0.2rem;
  scrollbar-width: thin;
}

.nav-links::-webkit-scrollbar {
  height: 6px;
}

.nav-links::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.45);
  border-radius: 999px;
}

.nav-links .btn {
  flex: 0 0 auto;
  min-height: 42px;
  white-space: nowrap;
}

.user-info {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  margin-left: 0.55rem;
  padding-left: 0.85rem;
  border-left: 1px solid var(--border);
  flex: 0 0 auto;
}

.sm-text { font-size: 0.85rem; color: var(--text-muted); }
.avatar-mini {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border);
}

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
  .nav-content {
    flex-direction: column;
    align-items: stretch;
    gap: 0.7rem;
  }

  .nav-links {
    overflow-x: auto;
    padding-bottom: 0.35rem;
  }

  .logo {
    align-self: center;
  }

  .user-info {
    margin-left: 0;
    padding-left: 0;
    border-left: none;
    margin-top: 0.2rem;
  }
}
</style>
