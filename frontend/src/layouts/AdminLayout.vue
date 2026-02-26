<template>
  <section class="admin-shell container">
    <header class="admin-header glass">
      <div>
        <p class="admin-eyebrow">{{ t('admin.eyebrow') }}</p>
        <h2>{{ t('admin.title') }}</h2>
      </div>
      <button class="btn btn-ghost" @click="router.push('/dashboard')">{{ t('admin.backToDashboard') }}</button>
    </header>

    <nav class="admin-nav">
      <router-link to="/admin/managers" class="btn btn-ghost">{{ t('admin.managerManagement') }}</router-link>
    </nav>

    <div class="admin-content">
      <router-view />
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()
</script>

<style scoped>
.admin-shell { padding: 2rem 0; }

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-radius: 0.75rem;
}

.admin-eyebrow {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-header h2 {
  margin: 0.35rem 0 0;
}

.admin-nav {
  display: flex;
  gap: 0.75rem;
  margin: 1rem 0 1.25rem;
}

.admin-content {
  min-height: 300px;
}
</style>
