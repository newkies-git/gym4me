<template>
  <div class="dashboard-wrapper container">
    <PageHeader
      :title="t('dashboard.hello', { name: auth.user?.nickname || t('dashboard.defaultName') })"
      :subtitle="dashboardSubtitle"
    />

    <!-- Observer Warning -->
    <div v-if="auth.isObserver && !auth.isMember && !auth.isTrainer && !auth.isSiteAdmin && !auth.isManager" class="glass alert-banner" style="margin-top: 1rem;">
      <p v-html="t('dashboard.observerMsg')"></p>
      <button class="btn btn-primary" @click="simulatePurchase" style="margin-top: 1rem;">{{ t('dashboard.buyTestSessions') }}</button>
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
import PageHeader from '../components/ui/PageHeader.vue'
import SiteAdminHome from '../components/home/SiteAdminHome.vue'
import ManagerHome from '../components/home/ManagerHome.vue'
import TrainerHome from '../components/dashboard/TrainerHome.vue'
import MemberHome from '../components/dashboard/MemberHome.vue'

const auth = useAuthStore()
const { t } = useI18n()

const dashboardSubtitle = computed(() => {
  if (auth.isSiteAdmin) return t('dashboard.siteAdminDashboard')
  if (auth.isManager) return t('dashboard.managerDashboard')
  if (auth.isTrainer) return t('dashboard.trainerDashboard')
  if (auth.isMember) return t('dashboard.memberDashboard')
  return t('dashboard.observerDashboard')
})

// Simulate Purchase logic (can remove later)
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'

const simulatePurchase = async () => {
    if(!auth.user) return;
    try {
        const userRef = doc(db, 'users', auth.user.uid);
        await updateDoc(userRef, {
            remainingSessions: 10,
            lvl: 5,
            role: 'MEMBER',
            updatedAt: serverTimestamp()
        });
        alert(t('dashboard.testPurchaseSuccess'));
        location.reload(); 
    } catch(e: any) {
        alert(t('common.errorWithMessage', { msg: e.message }));
    }
}
</script>

<style scoped>
.dashboard-wrapper { 
  padding: 6rem 1rem 2rem 1rem; 
}
</style>
