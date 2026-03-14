<template>
  <div class="manager-home">
    <div class="stats-grid">
      <StatCard 
        :value="'Loading...'" 
        :label="t('dashboard.totalTrainers', '총 소속 트레이너')" 
      />
      <StatCard 
        :value="'Loading...'" 
        :label="t('dashboard.totalGymMembers', '총 등록 회원')" 
      />
    </div>

    <div class="quick-actions glass">
      <h3>{{ t('dashboard.quickActions') }}</h3>
      <div class="action-buttons">
        <router-link to="/manage-trainers" class="btn btn-primary">{{ t('nav.trainerMgt') }}</router-link>
        <router-link to="/gym/members" class="btn btn-secondary">{{ t('nav.gymMember') }}</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import StatCard from './../ui/StatCard.vue'

const { t } = useI18n()
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

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
</style>
