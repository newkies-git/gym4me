<template>
  <div class="member-home">
    <div class="stats-grid" style="margin-top: 2rem;">
      <StatCard 
        :value="myRemainingSessions"
        :label="t('dashboard.remainingSessions')"
        :is-danger="(myRemainingSessions || 0) <= 5"
      />
      
      <StatCard 
        :value="myExpirationDate ? formatDate(myExpirationDate) : t('common.na')"
        :label="t('dashboard.ptExpiration')"
        :is-danger="isExpiringSoon(myExpirationDate)"
      />
      
      <StatCard 
        value="4"
        :label="t('dashboard.upcomingSessions')"
      />
    </div>

    <div class="content-grid grid-2" style="margin-top: 2rem;">
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
import { useAuthStore } from '../../stores/auth'
import PastExerciseSearch from './PastExerciseSearch.vue'
import StatCard from '../ui/StatCard.vue'

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
</script>

<style scoped>
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
