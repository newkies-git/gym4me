<template>
  <div class="dashboard-wrapper container">
    <PageHeader
      :title="t('dashboard.hello', { name: auth.user?.nickname || t('dashboard.defaultName') })"
      :subtitle="dashboardSubtitle"
    />

    <!-- Observer Warning -->
    <div
      v-if="auth.isObserver && !auth.isMember && !auth.isTrainer && !auth.isSiteAdmin && !auth.isManager"
      class="glass alert-banner"
    >
      <p v-html="t('dashboard.observerMsg')"></p>
      <button class="btn btn-primary trial-pt-btn" @click="simulatePurchase">
        {{ t('dashboard.buyTestSessions') }}
      </button>
    </div>

    <!-- Dynamic Role-Based View -->
    <SiteAdminHome v-if="auth.isSiteAdmin" />
    <ManagerHome v-else-if="auth.isManager" />
    <TrainerHome v-else-if="auth.isTrainer" />
    <MemberHome v-else-if="auth.isMember" />

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useSimulatePurchase } from '../composables/useSimulatePurchase'
import PageHeader from '../components/ui/PageHeader.vue'
import SiteAdminHome from '../components/home/SiteAdminHome.vue'
import ManagerHome from '../components/home/ManagerHome.vue'
import TrainerHome from '../components/home/TrainerHome.vue'
import MemberHome from '../components/home/MemberHome.vue'

const auth = useAuthStore()
const { t } = useI18n()

const dashboardSubtitle = computed(() => {
  if (auth.isSiteAdmin) return t('dashboard.siteAdminDashboard')
  if (auth.isManager) return t('dashboard.managerDashboard')
  if (auth.isTrainer) return t('dashboard.trainerDashboard')
  if (auth.isMember) return t('dashboard.memberDashboard')
  return t('dashboard.observerDashboard')
})

const simulatePurchase = useSimulatePurchase()
</script>

<style scoped>
.dashboard-wrapper { 
  padding: 6rem 1rem 2rem 1rem; 
}

.alert-banner {
  margin-top: 1rem;
  padding: 1.25rem 1.5rem;
  border-radius: 1rem;
}

.trial-pt-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 1rem;
  width: 100%;
  max-width: 260px;
  border-radius: 999px;
  font-weight: 700;
}

@media (min-width: 640px) {
  .trial-pt-btn {
    width: auto;
    padding-inline: 1.5rem;
  }
}
</style>
