<template>
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

          <div v-if="isSettingsOpen" class="settings-dropdown glass">
            <router-link to="/user-info" class="dropdown-item" @click="closeSettings">{{ t('nav.editProfile') }}</router-link>
            <ThemeSwitcher />
            <div class="dropdown-divider"></div>
            <button class="dropdown-item text-danger" @click="onLogout">로그아웃</button>
          </div>
          <div v-if="isSettingsOpen" class="dropdown-overlay" @click="closeSettings"></div>
        </div>
      </template>
      <template v-else>
        <router-link to="/auth" class="btn btn-primary btn-sm">{{ t('nav.loginSignup') }}</router-link>
      </template>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useI18n } from 'vue-i18n'
import { useGnb } from '../../composables/useGnb'
import ThemeSwitcher from '../../components/ThemeSwitcher.vue'

defineProps<{
  toggleMenu: () => void
  closeMenu: () => void
}>()

const emit = defineEmits<{
  logout: []
}>()

const auth = useAuthStore()
const { t } = useI18n()
const { gnbTitle, homePath } = useGnb()

const isSettingsOpen = ref(false)

const toggleSettings = () => {
  isSettingsOpen.value = !isSettingsOpen.value
}

const closeSettings = () => {
  isSettingsOpen.value = false
}

const onLogout = () => {
  closeSettings()
  emit('logout')
}
</script>

<style scoped>
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
  flex: 1;
}

.nav-right {
  justify-content: flex-end;
}

.nav-center {
  display: flex;
  justify-content: center;
  flex: 1;
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

.user-display {
  display: flex;
  align-items: center;
  gap: 0.6rem;
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

@media (max-width: 480px) {
  .nickname-text { display: none; }
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

.bar {
  width: 24px;
  height: 2px;
  background-color: var(--text-main);
  border-radius: 2px;
  transition: 0.3s;
}
</style>
