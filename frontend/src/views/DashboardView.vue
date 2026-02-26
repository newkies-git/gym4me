<template>
  <div class="dashboard-wrapper container">
    <div class="header">
      <h2>{{ t('dashboard.hello', { name: auth.user?.nickname || 'Athlete' }) }}</h2>
      <p class="subtitle" v-if="auth.isSiteAdmin">{{ t('dashboard.siteAdminDashboard') }}</p>
      <p class="subtitle" v-else-if="auth.isManager">{{ t('dashboard.managerDashboard') }}</p>
      <p class="subtitle" v-else-if="auth.isTrainer">{{ t('dashboard.trainerDashboard') }}</p>
      <p class="subtitle" v-else-if="auth.isMember">{{ t('dashboard.memberDashboard') }}</p>
      <p class="subtitle" v-else>{{ t('dashboard.observerDashboard') }}</p>
    </div>

    <!-- Observer Warning -->
    <div v-if="auth.isObserver && !auth.isMember && !auth.isTrainer" class="glass alert-banner" style="margin-top: 1rem;">
      <p v-html="t('dashboard.observerMsg')"></p>
      <button class="btn btn-primary" @click="simulatePurchase" style="margin-top: 1rem;">{{ t('dashboard.buyTestSessions') }}</button>
    </div>

    <!-- Trainer Specific Section: Client & Class Management -->
    <div v-if="auth.isTrainer">
      <ClientManager />
      <ClassManager />
    </div>

    <!-- General Stats -->
    <div class="stats-grid" style="margin-top: 2rem;">
      <StatCard 
        v-if="!auth.isTrainer"
        :value="myRemainingSessions"
        :label="t('dashboard.remainingSessions')"
        :is-danger="(myRemainingSessions || 0) <= 5"
      />
      
      <StatCard 
        v-if="!auth.isTrainer"
        :value="myExpirationDate ? formatDate(myExpirationDate) : 'N/A'"
        :label="t('dashboard.ptExpiration')"
        :is-danger="isExpiringSoon(myExpirationDate)"
      />
      
      <StatCard 
        value="4"
        :label="t('dashboard.upcomingSessions')"
      />
    </div>

    <div class="content-grid grid-2" style="margin-top: 2rem;">
      <!-- Search Past Exercises -->
      <PastExerciseSearch />

      <div class="quick-actions glass">
        <h3>{{ t('dashboard.quickActions') }}</h3>
        <div class="action-buttons">
          <router-link to="/calendar" class="btn btn-primary">{{ t('dashboard.viewCalendar') }}</router-link>
          <router-link to="/profile" class="btn btn-ghost">{{ t('dashboard.myBodyProfile') }}</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import ClientManager from '../components/dashboard/ClientManager.vue'
import ClassManager from '../components/dashboard/ClassManager.vue'
import PastExerciseSearch from '../components/dashboard/PastExerciseSearch.vue'
import StatCard from '../components/ui/StatCard.vue'

const auth = useAuthStore()
const { t } = useI18n()

const myRemainingSessions = computed(() => auth.user?.remainingSessions || 0)
const myExpirationDate = computed(() => auth.user?.expirationDate || '')

const formatDate = (dateStr: string) => {
    if(!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString();
}

const isExpiringSoon = (dateStr?: string) => {
    if (!dateStr) return false;
    const expDate = new Date(dateStr);
    const inTwoWeeks = new Date();
    inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
    return expDate < inTwoWeeks && expDate >= new Date();
}

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
        alert("10 sessions added! Please refresh or wait for sync.");
        location.reload(); // Quick way to sync for the test
    } catch(e: any) {
        alert(e.message);
    }
}
</script>

<style scoped>
.dashboard-wrapper { padding: 1rem 0; }
.header { margin-bottom: 2rem; }
.subtitle { color: var(--text-muted); font-size: 1.1rem; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.quick-actions {
  padding: 2rem;
}

h3 { margin-bottom: 1.5rem; font-size: 1.2rem; }

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
