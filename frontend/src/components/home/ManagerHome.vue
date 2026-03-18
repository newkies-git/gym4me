<template>
  <div class="manager-home">
    <div class="stats-grid">
      <StatCard
        :value="totalTrainersDisplay"
        :label="t('dashboard.totalTrainers', '총 소속 트레이너')"
      />
      <StatCard
        :value="totalTraineesDisplay"
        :label="t('dashboard.totalGymTrainees', '총 등록 트레이니')"
      />
    </div>

    <div class="quick-actions glass">
      <h3>{{ t('dashboard.quickActions') }}</h3>
      <div class="action-buttons">
        <router-link to="/manage-trainers" class="btn btn-primary">{{ t('nav.trainerMgt') }}</router-link>
        <router-link to="/gym/trainees" class="btn btn-secondary">{{ t('nav.gymTrainee') }}</router-link>
      </div>
    </div>

    <div class="trainee-section glass">
      <h3>{{ t('gymTrainee.title') }}</h3>
      <p class="sm-text" style="margin-bottom: 1rem;">{{ t('gymTrainee.subtitle') }}</p>

      <div v-if="!auth.user?.gymId" class="empty-state">
        {{ t('gymMgt.noGymAssigned') }}
      </div>
      <div v-else>
        <div v-if="loading" class="empty-state">{{ t('common.loading') }}</div>
        <div v-else>
          <div class="trainee-table-container">
            <table class="trainee-table">
              <thead>
                <tr>
                  <th>{{ t('gymTrainee.nickname') }}</th>
                  <th>{{ t('gymTrainee.email') }}</th>
                  <th>{{ t('gymTrainee.remainingSessions') }}</th>
                  <th>{{ t('gymTrainee.expirationDate') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="trainee in pagedTrainees" :key="trainee.uid">
                  <td>{{ trainee.nickname || trainee.email }}</td>
                  <td>{{ trainee.email }}</td>
                  <td :class="{ 'warning-text': (trainee.remainingSessions || 0) < 3 }">
                    {{ trainee.remainingSessions ?? t('common.na') }}
                  </td>
                  <td :class="{ 'warning-text': isExpired(trainee.expirationDate) }">
                    {{ trainee.expirationDate || t('common.na') }}
                  </td>
                </tr>
                <tr v-if="!pagedTrainees.length">
                  <td colspan="4" class="empty-state">
                    {{ t('gymTrainee.noTrainees') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pagination" v-if="totalPages > 1">
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              :disabled="page === 1"
              @click="page--"
            >
              ‹
            </button>
            <span class="page-indicator">
              {{ page }} / {{ totalPages }}
            </span>
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              :disabled="page === totalPages"
              @click="page++"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { getGymTrainees, getTrainers } from '../../services/firebaseService'
import type { TraineeInfo } from '../../types'
import StatCard from './../ui/StatCard.vue'

const { t } = useI18n()
const auth = useAuthStore()

const loading = ref(false)
const trainees = ref<TraineeInfo[]>([])
const totalTrainers = ref<number | null>(null)

const page = ref(1)
const pageSize = 10

const totalTraineesDisplay = computed(() =>
  loading.value ? '…' : trainees.value.length || t('common.na')
)
const totalTrainersDisplay = computed(() =>
  totalTrainers.value == null ? '…' : totalTrainers.value
)

const totalPages = computed(() =>
  Math.max(1, Math.ceil(trainees.value.length / pageSize))
)

const pagedTrainees = computed(() => {
  const start = (page.value - 1) * pageSize
  return trainees.value.slice(start, start + pageSize)
})

const isExpired = (dateStr?: string) => {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

onMounted(async () => {
  if (!auth.user?.gymId) return
  loading.value = true
  try {
    const [traineeList, allTrainers] = await Promise.all([
      getGymTrainees(auth.user.gymId),
      getTrainers()
    ])
    trainees.value = traineeList
    totalTrainers.value = allTrainers.filter((t) => t.gymId === auth.user?.gymId).length
  } finally {
    loading.value = false
  }
})
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

.trainee-section {
  padding: 1.5rem;
  margin-top: 2rem;
}

h3 {
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sm-text {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.trainee-table-container {
  overflow-x: auto;
}

.trainee-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.trainee-table th,
.trainee-table td {
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.85rem;
}

.trainee-table th {
  color: var(--text-muted);
  text-transform: uppercase;
}

.warning-text {
  color: var(--accent);
  font-weight: 600;
}

.empty-state {
  padding: 1rem 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.pagination {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.page-indicator {
  font-size: 0.85rem;
  color: var(--text-muted);
}
</style>

