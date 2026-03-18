<template>
  <div class="system-admin-home">
    <div class="quick-actions glass">
      <h3>{{ t('dashboard.quickActions') }}</h3>
      <div class="action-buttons">
        <router-link to="/system/supervisors" class="btn btn-primary">{{ t('nav.createSupervisor') }}</router-link>
      </div>
      <p class="help-text">{{ t('dashboard.systemAdminHelp') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.quick-actions {
  padding: 2rem;
  margin-top: 2rem;
}

h3 {
  margin-bottom: 1.5rem;
  font-size: 1.2rem;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.help-text {
  margin-top: 1rem;
  font-size: 0.9rem;
  color: var(--text-muted);
}
</style>
