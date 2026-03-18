<template>
  <template v-if="open">
    <div class="drawer-overlay" @click="emit('close')"></div>
    <aside class="side-drawer glass" :class="{ 'is-open': open }">
      <div class="drawer-header">
        <span class="drawer-title">Menu</span>
        <button @click="emit('close')" class="close-drawer" type="button">&times;</button>
      </div>
      <nav class="drawer-nav">
        <router-link to="/home" class="drawer-link" @click="emit('close')">{{ t('nav.home') }}</router-link>
        <router-link to="/calendar" class="drawer-link" @click="emit('close')">{{ t('nav.calendar') }}</router-link>
        <router-link to="/courses" class="drawer-link" @click="emit('close')">{{ t('nav.courses') }}</router-link>

        <div class="drawer-divider"></div>

        <router-link v-if="auth.isTrainer && !auth.isSupervisor" to="/trainer-profile" class="drawer-link" @click="emit('close')">{{ t('nav.trainerBio') }}</router-link>
        <router-link v-if="auth.user?.role === 'MANAGER' && !auth.isSupervisor" to="/manage-trainers" class="drawer-link" @click="emit('close')">{{ t('nav.trainerMgt') }}</router-link>
        <router-link
          v-if="(auth.isTrainer || auth.isManager || auth.isSupervisor)"
          to="/gym/trainees"
          class="drawer-link"
          @click="emit('close')"
        >
          {{ t('nav.gymTrainee') }}
        </router-link>
        <router-link v-if="auth.isSupervisor" to="/manage-gym" class="drawer-link" @click="emit('close')">{{ t('nav.gymMgt') }}</router-link>
        <router-link v-if="auth.isSupervisor" to="/admin/staff" class="drawer-link" @click="emit('close')">{{ t('nav.staffMgt') }}</router-link>
        <router-link v-if="auth.isSiteAdmin" to="/system/supervisors" class="drawer-link" @click="emit('close')">{{ t('nav.createSupervisor') }}</router-link>

        <div class="drawer-divider"></div>
        <router-link to="/tool-usage" class="drawer-link" @click="emit('close')">{{ t('nav.toolUsage') }}</router-link>
        <router-link to="/profile" class="drawer-link" @click="emit('close')">{{ t('nav.profile') }}</router-link>
      </nav>
    </aside>
  </template>
</template>

<script setup lang="ts">
import { useAuthStore } from '../../stores/auth'
import { useI18n } from 'vue-i18n'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const auth = useAuthStore()
const { t } = useI18n()
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  opacity: 1;
  visibility: visible;
  transition: 0.3s;
}

.side-drawer {
  position: fixed;
  top: 0;
  left: 0;
  width: 280px;
  height: 100%;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--primary);
}

.close-drawer {
  background: none;
  border: none;
  font-size: 1.8rem;
  color: var(--text-muted);
  cursor: pointer;
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
</style>
