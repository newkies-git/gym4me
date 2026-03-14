<template>
  <div class="dashboard-wrapper container">
    <div class="header page-header">
      <h2>{{ t('dashboard.hello', { name: auth.user?.nickname || t('dashboard.defaultName') }) }}</h2>
      <p class="subtitle" v-if="auth.isSiteAdmin">{{ t('dashboard.siteAdminDashboard') }}</p>
      <p class="subtitle" v-else-if="auth.isManager">{{ t('dashboard.managerDashboard') }}</p>
      <p class="subtitle" v-else-if="auth.isTrainer">{{ t('dashboard.trainerDashboard') }}</p>
      <p class="subtitle" v-else-if="auth.isMember">{{ t('dashboard.memberDashboard') }}</p>
      <p class="subtitle" v-else>{{ t('dashboard.observerDashboard') }}</p>
    </div>

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
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'

import SiteAdminHome from '../components/home/SiteAdminHome.vue'
import ManagerHome from '../components/home/ManagerHome.vue'
import TrainerHome from '../components/dashboard/TrainerHome.vue'
import MemberHome from '../components/dashboard/MemberHome.vue'

const auth = useAuthStore()
const { t } = useI18n()

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
.header { margin-bottom: 2rem; }
.subtitle { color: var(--text-muted); font-size: 1.1rem; }
</style>
