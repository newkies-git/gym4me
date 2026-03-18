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

    <div class="gym-section glass">
      <div class="section-head">
        <h3 style="margin:0;">{{ t('gymMgt.allGyms', '전체 Gym') }}</h3>
        <span class="sm-text" v-if="!loading">{{ gyms.length }} / {{ totalGyms }}</span>
      </div>

      <div v-if="error" class="error-text">{{ error }}</div>

      <div v-if="loading" class="empty-state">{{ t('common.loading') }}</div>
      <div v-else-if="gyms.length === 0" class="empty-state">{{ t('common.noData') }}</div>

      <div v-else class="gym-grid">
        <BaseCard
          v-for="g in gyms"
          :key="g.id"
          class="gym-card"
          :clickable="true"
          variant="subtle"
          @click="$router.push('/manage-gym')"
        >
          <div class="gym-card-top">
            <div class="gym-name">{{ g.name }}</div>
            <div class="gym-meta sm-text">{{ g.location || '' }}</div>
          </div>
          <div class="gym-stats">
            <div class="mini-stat">
              <div class="mini-val">{{ traineeCountByGymId[g.id] ?? 0 }}</div>
              <div class="mini-lbl">{{ t('dashboard.totalGymTrainees', '총 등록 트레이니') }}</div>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import StatCard from './../ui/StatCard.vue'
import BaseCard from './../ui/BaseCard.vue'
import { getGyms, getGymTrainees, getTotalUsersCount } from '../../services/firebaseService'
import type { Gym } from '../../types'

const { t } = useI18n()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const gyms = ref<Gym[]>([])
const traineeCountByGymId = ref<Record<string, number>>({})
const totalUsers = ref<number>(0)

const totalGyms = computed(() => gyms.value.length)
const totalTrainees = computed(() =>
  Object.values(traineeCountByGymId.value).reduce((sum, n) => sum + (n || 0), 0)
)

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const [gymsData, usersCount] = await Promise.all([
      getGyms(),
      getTotalUsersCount().catch(() => 0)
    ])
    gyms.value = gymsData
    totalUsers.value = usersCount

    const counts: Record<string, number> = {}
    await Promise.all(
      gymsData.map(async (g) => {
        try {
          const trainees = await getGymTrainees(g.id)
          counts[g.id] = trainees.length
        } catch {
          counts[g.id] = 0
        }
      })
    )
    traineeCountByGymId.value = counts
  } catch (e: any) {
    error.value = e?.message || String(e)
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

.gym-section {
  padding: 2rem;
  margin-top: 1.5rem;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.sm-text { font-size: 0.85rem; color: var(--text-muted); }
.error-text { color: var(--accent); margin-top: 0.75rem; }
.empty-state { margin-top: 1rem; color: var(--text-muted); }

.gym-grid {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.9rem;
}

.gym-card-top {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.gym-name { font-weight: 800; }
.gym-meta { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gym-stats { margin-top: 0.9rem; }
.mini-stat { display: flex; flex-direction: column; gap: 0.1rem; }
.mini-val { font-size: 1.35rem; font-weight: 800; color: var(--primary); }
.mini-lbl { font-size: 0.75rem; color: var(--text-muted); }
</style>
