<template>
  <div class="app-wrapper" :class="{ 'drawer-open': isMenuOpen }">
    <AppHeader
      :toggle-menu="toggleMenu"
      :close-menu="closeMenu"
      @logout="logout"
    />

    <template v-if="auth.isAuthenticated">
      <SideDrawer :open="isMenuOpen" @close="closeMenu" />
    </template>

    <main class="page-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/uiStore'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppHeader from './components/AppHeader.vue'
import SideDrawer from './components/SideDrawer.vue'

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

const logout = async () => {
  closeMenu()
  await auth.logout()
  ui.showToast(t('common.loggedOut'), 'info')
  router.push('/')
}
</script>

<style scoped>
.app-wrapper {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

.app-wrapper.drawer-open {
  overflow: hidden;
  height: 100vh;
}

.page-content {
  padding-bottom: 2rem;
}
</style>
