<template>
  <div class="supervisor-home">
    <div class="stats-grid">
      <StatCard
        :value="loading ? 'Loading...' : totalGyms"
        :label="t('dashboard.totalGyms', '총 등록된 Gym')"
      />
      <StatCard
        :value="loading ? 'Loading...' : totalTrainees"
        :label="t('dashboard.totalGymTrainees', '총 등록 트레이니')"
      />
      <StatCard
        :value="loading ? 'Loading...' : totalUsers"
        :label="t('dashboard.totalUsers', '총 앱 사용자')"
      />
    </div>

    <div class="quick-actions glass">
      <h3>{{ t('dashboard.quickActions') }}</h3>
      <div class="action-buttons">
        <router-link to="/manage-gym" class="btn btn-primary">{{ t('nav.gymMgt') }}</router-link>
        <router-link to="/admin/managers" class="btn btn-secondary">{{ t('nav.managerMgt') }}</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import StatCard from './../ui/StatCard.vue'
import { getGyms, getGymTrainees, getTotalUsersCount } from '../../services/firebaseService'
import type { Gym } from '../../types'

const { t } = useI18n()
const router = useRouter()

const loading = ref(true)
const gyms = ref<Gym[]>([])
const totalUsers = ref<number>(0)

const totalGyms = computed(() => gyms.value.length)
const totalTrainees = ref<number>(0)

onMounted(async () => {
  loading.value = true
  try {
    const [gymsData, usersCount] = await Promise.all([
      getGyms(),
      getTotalUsersCount().catch(() => 0)
    ])
    gyms.value = gymsData
    totalUsers.value = usersCount

    const counts = await Promise.all(
      gymsData.map(async (g) => {
        try {
          const trainees = await getGymTrainees(g.id)
          return trainees.length
        } catch {
          return 0
        }
      })
    )
    totalTrainees.value = counts.reduce((sum, n) => sum + (n || 0), 0)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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

.sm-text { font-size: 0.85rem; color: var(--text-muted); }
</style>
