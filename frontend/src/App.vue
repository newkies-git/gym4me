<template>
  <div class="app-wrapper" :class="{ 'drawer-open': isMenuOpen }">
    <!-- Navigation Header -->
    <header class="glass nav-bar">
      <div class="container nav-content">
        <div class="nav-left">
          <button v-if="auth.isAuthenticated" @click="toggleMenu" class="hamburger-btn" :aria-label="t('nav.menuFlag')">
            <span class="bar"></span>
            <span class="bar"></span>
            <span class="bar"></span>
          </button>
          <router-link to="/" class="logo" @click="closeMenu">gym4me</router-link>
        </div>

        <div class="nav-right">
          <template v-if="auth.isAuthenticated">
            <div class="user-display">
              <img v-if="(auth.user as any)?.profileImageUrl" :src="(auth.user as any)?.profileImageUrl" class="avatar-mini" alt="avatar" />
              <span class="nickname-text">{{ auth.user?.nickname || auth.user?.email }}</span>
            </div>
            <div class="header-actions">
              <router-link to="/settings" class="icon-btn" :title="t('nav.settings')">
                <span class="icon">⚙️</span>
              </router-link>
              <button @click="logout" class="icon-btn" :title="t('nav.logout')">
                <span class="icon">🚪</span>
              </button>
            </div>
          </template>
          <template v-else>
            <router-link to="/auth" class="btn btn-primary btn-sm">{{ t('nav.loginSignup') }}</router-link>
          </template>
        </div>
      </div>
    </header>

    <!-- Side Drawer Menu (Auth Only) -->
    <template v-if="auth.isAuthenticated">
      <div class="drawer-overlay" @click="closeMenu"></div>
      <aside class="side-drawer glass" :class="{ 'is-open': isMenuOpen }">
        <div class="drawer-header">
          <span class="drawer-title">Menu</span>
          <button @click="closeMenu" class="close-drawer">&times;</button>
        </div>
        <nav class="drawer-nav">
          <router-link to="/dashboard" class="drawer-link" @click="closeMenu">{{ t('nav.dashboard') }}</router-link>
          <router-link to="/calendar" class="drawer-link" @click="closeMenu">{{ t('nav.calendar') }}</router-link>
          
          <div class="drawer-divider"></div>
          
          <!-- Role Specific -->
          <router-link v-if="auth.isTrainer" to="/trainer-profile" class="drawer-link" @click="closeMenu">{{ t('nav.trainerBio') }}</router-link>
          <router-link v-if="auth.isManager" to="/manager/management" class="drawer-link" @click="closeMenu">{{ t('nav.trainerMgt') }}</router-link>
          <router-link v-if="auth.isManager" to="/gym/members" class="drawer-link" @click="closeMenu">{{ t('nav.gymMember') }}</router-link>
          <router-link v-if="auth.isSiteAdmin" to="/admin/gyms" class="drawer-link" @click="closeMenu">{{ t('nav.gymMgt') }}</router-link>
          <router-link v-if="auth.isSiteAdmin" to="/admin/managers" class="drawer-link" @click="closeMenu">{{ t('nav.managerMgt') }}</router-link>
          
          <div class="drawer-divider"></div>
          <router-link to="/tool-usage" class="drawer-link" @click="closeMenu">{{ t('nav.toolUsage') }}</router-link>
          <router-link to="/profile" class="drawer-link" @click="closeMenu">{{ t('nav.profile') }}</router-link>
          <router-link to="/settings" class="drawer-link" @click="closeMenu">{{ t('nav.settings') }}</router-link>
        </nav>
      </aside>
    </template>

    <!-- Main Content -->
    <main class="page-content">
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
import { ref } from 'vue'
import { useAuthStore } from './stores/auth'
import { useUIStore } from './stores/uiStore'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const auth = useAuthStore()
const ui = useUIStore()
const router = useRouter()
const { t } = useI18n()

const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const logout = () => {
  closeMenu()
  auth.logout()
  ui.showToast(t('common.loggedOut'), 'info')
  router.push('/')
}
</script>

<style scoped>
.app-wrapper { min-height: 100vh; position: relative; overflow-x: hidden; }
.app-wrapper.drawer-open { overflow: hidden; height: 100vh; }

/* Navigation Bar */
.nav-bar {
  position: sticky; top: 0; z-index: 100;
  border-bottom: 1px solid var(--border);
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 0;
}

.nav-left, .nav-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo {
  font-size: 1.5rem; font-weight: 700;
  background: linear-gradient(135deg, #818cf8, #c084fc);
  background-clip: text;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}

/* Hamburger Button */
.hamburger-btn {
  background: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 5px;
  z-index: 1001;
}

.bar {
  width: 24px;
  height: 2px;
  background-color: var(--text-main);
  border-radius: 2px;
  transition: 0.3s;
}

/* User & Actions */
.user-display {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding-right: 0.8rem;
  border-right: 1px solid var(--border);
}

.nickname-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avatar-mini {
  width: 28px; height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.icon-btn {
  font-size: 1.25rem;
  padding: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  transition: background 0.2s;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Side Drawer */
.drawer-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  opacity: 0; visibility: hidden;
  transition: 0.3s;
}

.drawer-open .drawer-overlay {
  opacity: 1; visibility: visible;
}

.side-drawer {
  position: fixed; top: 0; left: -300px; width: 280px; height: 100%;
  z-index: 1001;
  display: flex; flex-direction: column;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 0;
  border-right: 1px solid var(--border);
}

.side-drawer.is-open {
  left: 0;
}

.drawer-header {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
}

.drawer-title {
  font-size: 1.2rem; font-weight: 700; color: var(--primary);
}

.close-drawer {
  background: none; font-size: 1.8rem; color: var(--text-muted);
}

.drawer-nav {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.drawer-link {
  padding: 0.8rem 1rem;
  border-radius: 0.6rem;
  font-weight: 600;
  transition: 0.2s;
}

.drawer-link:hover, .drawer-link.router-link-active {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
}

.drawer-divider {
  height: 1px;
  background: var(--border);
  margin: 0.8rem 0;
}

/* Page Content */
.page-content {
  padding-bottom: 2rem;
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

@media (max-width: 480px) {
  .nickname-text { display: none; }
  .user-display { padding-right: 0; border-right: none; }
}
</style>
