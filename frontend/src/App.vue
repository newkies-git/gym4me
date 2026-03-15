<template>
  <div class="app-wrapper" :class="{ 'drawer-open': isMenuOpen }">
    <header class="app-header">
      <div class="nav-left">
        <button v-if="auth.isAuthenticated" @click="toggleMenu" class="menu-toggle" :aria-label="t('nav.menuFlag')">
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
        </button>
      </div>

      <div class="nav-center">
        <router-link
          v-if="auth.isAuthenticated"
          :to="homePath"
          class="logo-text"
          @click="closeMenu"
        >{{ gnbTitle }}</router-link>
        <router-link v-else to="/" class="logo-text" @click="closeMenu">gym4me</router-link>
      </div>

      <div class="nav-right">
        <template v-if="auth.isAuthenticated">
          <div class="user-display">
            <span class="nickname-text">{{ auth.user?.nickname || auth.user?.email }}</span>
          </div>
          <div class="settings-wrapper">
            <button @click="toggleSettings" class="icon-btn" :title="t('nav.settings')">
              <span class="icon">⚙️</span>
            </button>
            
            <!-- Dropdown Menu -->
            <div v-if="isSettingsOpen" class="settings-dropdown glass">
              <router-link to="/user-info" class="dropdown-item" @click="closeSettings">개인정보 수정</router-link>
              <ThemeSwitcher />
              <div class="dropdown-divider"></div>
              <button class="dropdown-item text-danger" @click="logoutFromDropdown">로그아웃</button>
            </div>
            <!-- Invisible overlay to close dropdown -->
            <div v-if="isSettingsOpen" class="dropdown-overlay" @click="closeSettings"></div>
          </div>
        </template>
        <template v-else>
          <router-link to="/auth" class="btn btn-primary btn-sm">{{ t('nav.loginSignup') }}</router-link>
        </template>
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
          <router-link to="/dashboard" class="drawer-link" @click="closeMenu">{{ t('nav.home') }}</router-link>
          <router-link to="/calendar" class="drawer-link" @click="closeMenu">{{ t('nav.calendar') }}</router-link>
          <router-link to="/courses" class="drawer-link" @click="closeMenu">{{ t('nav.courses') }}</router-link>
          
          <div class="drawer-divider"></div>
          
          <!-- Role Specific -->
          <router-link v-if="auth.isTrainer && !auth.isSiteAdmin" to="/trainer-profile" class="drawer-link" @click="closeMenu">{{ t('nav.trainerBio') }}</router-link>
          <router-link v-if="auth.isManager && !auth.isSiteAdmin" to="/manage-trainers" class="drawer-link" @click="closeMenu">{{ t('nav.trainerMgt') }}</router-link>
          <router-link v-if="auth.isManager && !auth.isSiteAdmin" to="/gym/members" class="drawer-link" @click="closeMenu">{{ t('nav.gymMember') }}</router-link>
          <router-link v-if="auth.isSiteAdmin" to="/manage-gym" class="drawer-link" @click="closeMenu">{{ t('nav.gymMgt') }}</router-link>
          <router-link v-if="auth.isSiteAdmin" to="/admin/staff" class="drawer-link" @click="closeMenu">{{ t('nav.staffMgt') }}</router-link>
          
          <div class="drawer-divider"></div>
          <router-link to="/tool-usage" class="drawer-link" @click="closeMenu">{{ t('nav.toolUsage') }}</router-link>
          <router-link to="/profile" class="drawer-link" @click="closeMenu">{{ t('nav.profile') }}</router-link>
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
import { ref, onMounted, watch, computed } from 'vue'
import { useAuthStore } from './stores/auth'
import { useUIStore } from './stores/uiStore'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ThemeSwitcher from './components/ThemeSwitcher.vue'
import { useThemeStore } from './stores/themeStore'
import { getGymById } from './services/firebaseService'

const auth = useAuthStore()
const themeStore = useThemeStore()
const ui = useUIStore()
const router = useRouter()
const { t } = useI18n()

const isMenuOpen = ref(false)
const isSettingsOpen = ref(false)
const gymName = ref('')

const gnbTitle = computed(() => {
  if (!auth.isAuthenticated) return 'gym4me'
  return gymName.value || 'gym4me'
})

const homePath = computed(() => {
  if (!auth.isAuthenticated) return '/'
  return auth.isSiteAdmin ? '/manage-gym' : '/dashboard'
})

async function loadGymName() {
  const id = auth.user?.gymId
  if (!id) {
    gymName.value = ''
    return
  }
  try {
    const gym = await getGymById(id)
    gymName.value = gym?.name ?? ''
  } catch {
    gymName.value = ''
  }
}

watch(() => auth.user?.gymId, loadGymName, { immediate: true })

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const toggleSettings = () => {
  isSettingsOpen.value = !isSettingsOpen.value
}

const closeSettings = () => {
  isSettingsOpen.value = false
}

onMounted(() => {
  themeStore.applyTheme()
})

const logout = () => {
  closeMenu()
  auth.logout()
  ui.showToast(t('common.loggedOut'), 'info')
  router.push('/')
}

const logoutFromDropdown = () => {
  closeSettings()
  logout()
}
</script>

<style scoped>
.app-wrapper { min-height: 100vh; position: relative; overflow-x: hidden; }
.app-wrapper.drawer-open { overflow: hidden; height: 100vh; }

/* Navigation Bar */
.app-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 60px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
  z-index: 100;
}

@media (min-width: 768px) {
  .app-header {
    padding: 0 1.5rem;
  }
}

.nav-left, .nav-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1; /* Give left and right equal width */
}

.nav-right {
  justify-content: flex-end;
}

.nav-center {
  display: flex;
  justify-content: center;
  flex: 1;
}

.brand {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.menu-toggle {
  background: transparent;
  border: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 5px;
  font-size: 1.5rem;
  color: var(--text-main);
  cursor: pointer;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
}

.header-actions {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.user-snippet {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-name {
  font-weight: 500;
  font-size: 0.95rem;
  color: var(--text-main);
}

.bar {
  width: 24px;
  height: 2px;
  background-color: var(--text-main);
  border-radius: 2px;
  transition: 0.3s;
}

/* User & Actions - Mobile First */
.user-display {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  /* Nickname hidden on very small screens, shown by default mostly but strictly hidden < 480px below */
}

.nickname-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (min-width: 768px) {
  .user-display {
    padding-right: 0.8rem;
    border-right: 1px solid var(--border);
  }
  .nickname-text {
    max-width: 150px;
  }
}

.avatar-mini {
  width: 28px; height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border);
}

.icon-btn {
  font-size: 1.25rem;
  padding: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
}

.icon-btn:hover {
  background: var(--bg-dark);
}

/* Settings Dropdown */
.settings-wrapper {
  position: relative;
}

.settings-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  width: 200px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  z-index: 1002;
  overflow: hidden;
}

.dropdown-item {
  padding: 0.75rem 1rem;
  text-align: left;
  background: transparent;
  border: none;
  color: var(--text-main);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: var(--bg-dark);
}

.dropdown-item.text-danger {
  color: #f43f5e;
}

.dropdown-divider {
  height: 1px;
  background: var(--border);
  margin: 0;
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1001;
  cursor: default;
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
  background: none; border: none; font-size: 1.8rem; color: var(--text-muted); cursor: pointer;
}

.drawer-nav {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.drawer-link {
  padding: 0.8rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  color: var(--text-main);
  transition: 0.2s;
  text-decoration: none;
}

.drawer-link:hover {
  background: var(--bg-dark);
}

.drawer-link.router-link-active {
  background: #ede7f6;
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

/* Global Toast Notifications */
.toast-container {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 9999;
}

.toast {
  padding: 1rem 1.5rem;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  animation: slideInRight 0.3s ease forwards;
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

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Base Mobile: hide nickname on very small phones, but it will appear as width grows */
@media (max-width: 480px) {
  .nickname-text { display: none; }
}
</style>
