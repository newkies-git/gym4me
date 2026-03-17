<template>
  <div class="member-home">
    <div class="stats-grid">
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
    </div>

    <div class="upcoming-card glass">
      <div class="upcoming-header">
        <span class="upcoming-title">{{ t('dashboard.upcomingSessions') }}</span>
        <span class="upcoming-count" v-if="upcomingList.length">
          {{ upcomingList.length }}
        </span>
      </div>
      <ul class="upcoming-list" v-if="upcomingList.length">
        <li v-for="item in upcomingList" :key="item.id" class="upcoming-item">
          <div class="upcoming-date">{{ item.date }}</div>
          <div class="upcoming-meta">
            <span class="time">{{ item.time }}</span>
            <span class="title">{{ item.title }}</span>
          </div>
        </li>
      </ul>
      <p v-else class="upcoming-empty">{{ t('common.noData') }}</p>
    </div>

    <div class="content-grid grid-2">
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
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useScheduleStore } from '../../stores/scheduleStore'
import PastExerciseSearch from '../courses/PastExerciseSearch.vue'
import StatCard from '../ui/StatCard.vue'

const auth = useAuthStore()
const scheduleStore = useScheduleStore()
const { t } = useI18n()

const myRemainingSessions = computed(() => auth.user?.remainingSessions || 0)
const myExpirationDate = computed(() => auth.user?.expirationDate || '')

onMounted(async () => {
  if (auth.user?.email) {
    await scheduleStore.fetchSchedules(auth.user.email)
  }
})

const upcomingList = computed(() => {
  if (!auth.user?.email) return []
  const all = scheduleStore.getSchedulesByEmail(auth.user.email)
  const now = new Date()
  return all
    .filter(e => {
      const dt = new Date(`${e.dateStr}T${e.time || '00:00'}`)
      return dt >= now
    })
    .slice(0, 5)
    .map(e => {
      const dt = new Date(`${e.dateStr}T${e.time || '00:00'}`)
      return {
        id: e.id,
        title: e.title || '',
        date: dt.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' }),
        time: dt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      }
    })
})

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
  gap: 1rem;
  margin-top: 1.25rem;
}

.content-grid {
  margin-top: 1.5rem;
}

.upcoming-card {
  margin-top: 1.25rem;
  padding: 1.3rem 1.5rem;
  border-radius: 1rem;
}

.upcoming-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.upcoming-title {
  font-weight: 600;
  font-size: 0.95rem;
}

.upcoming-count {
  font-size: 0.8rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background-color: rgba(255, 127, 80, 0.1);
  color: var(--primary);
}

.upcoming-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.upcoming-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.85rem;
}

.upcoming-date {
  font-weight: 600;
  color: var(--text-main);
}

.upcoming-meta {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.upcoming-meta .time {
  font-weight: 600;
}

.upcoming-meta .title {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.upcoming-empty {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.quick-actions {
  padding: 1.5rem 1.75rem;
  border-radius: 1rem;
}

h3 {
  margin-bottom: 1rem;
  font-size: 1.05rem;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 768px) {
  .action-buttons {
    flex-direction: row;
    justify-content: flex-start;
  }
}
</style>
