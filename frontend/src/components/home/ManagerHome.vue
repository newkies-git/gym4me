<template>
  <div class="manager-home">
    <div class="stats-grid">
      <StatCard
        :value="totalTrainersDisplay"
        :label="t('dashboard.totalTrainers', '총 소속 트레이너')"
      />
      <StatCard
        :value="totalMembersDisplay"
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

    <div class="member-section glass">
      <h3>{{ t('gymMember.title') }}</h3>
      <p class="sm-text" style="margin-bottom: 1rem;">{{ t('gymMember.subtitle') }}</p>

      <div v-if="!auth.user?.gymId" class="empty-state">
        {{ t('gymMgt.noGymAssigned') }}
      </div>
      <div v-else>
        <div v-if="loading" class="empty-state">{{ t('common.loading') }}</div>
        <div v-else>
          <div class="member-table-container">
            <table class="member-table">
              <thead>
                <tr>
                  <th>{{ t('gymMember.nickname') }}</th>
                  <th>{{ t('gymMember.email') }}</th>
                  <th>{{ t('gymMember.remainingSessions') }}</th>
                  <th>{{ t('gymMember.expirationDate') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="member in pagedMembers" :key="member.uid">
                  <td>{{ member.nickname || member.email }}</td>
                  <td>{{ member.email }}</td>
                  <td :class="{ 'warning-text': (member.remainingSessions || 0) < 3 }">
                    {{ member.remainingSessions ?? t('common.na') }}
                  </td>
                  <td :class="{ 'warning-text': isExpired(member.expirationDate) }">
                    {{ member.expirationDate || t('common.na') }}
                  </td>
                </tr>
                <tr v-if="!pagedMembers.length">
                  <td colspan="4" class="empty-state">
                    {{ t('gymMember.noStaff') || t('gymMember.noMembers') }}
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
import { getGymMembers, getTrainers } from '../../services/firebaseService'
import type { ClientInfo } from '../../types'
import StatCard from './../ui/StatCard.vue'

const { t } = useI18n()
const auth = useAuthStore()

const loading = ref(false)
const members = ref<ClientInfo[]>([])
const totalTrainers = ref<number | null>(null)

const page = ref(1)
const pageSize = 10

const totalMembersDisplay = computed(() =>
  loading.value ? '…' : members.value.length || t('common.na')
)
const totalTrainersDisplay = computed(() =>
  totalTrainers.value == null ? '…' : totalTrainers.value
)

const totalPages = computed(() =>
  Math.max(1, Math.ceil(members.value.length / pageSize))
)

const pagedMembers = computed(() => {
  const start = (page.value - 1) * pageSize
  return members.value.slice(start, start + pageSize)
})

const isExpired = (dateStr?: string) => {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

onMounted(async () => {
  if (!auth.user?.gymId) return
  loading.value = true
  try {
    const [memberList, allTrainers] = await Promise.all([
      getGymMembers(auth.user.gymId),
      getTrainers()
    ])
    members.value = memberList
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

.member-section {
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

.member-table-container {
  overflow-x: auto;
}

.member-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.member-table th,
.member-table td {
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.85rem;
}

.member-table th {
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

