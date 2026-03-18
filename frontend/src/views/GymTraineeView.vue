<template>
  <div class="gym-trainee-wrapper container">
    <PageHeader
      :title="t('gymTrainee.title')"
      :subtitle="t('gymTrainee.subtitle')"
      :showBack="true"
      back-url="/home"
    />

    <div class="filter-bar glass">
      <div v-if="auth.isSupervisor" class="gym-filter">
        <label class="filter-label">{{ t('gymMgt.title') }}</label>
        <BaseSelect
          v-model="selectedGymId"
          class="gym-select"
          :options="[{ value: '__all__', label: (t('common.all' as any) || '전체') }, ...gyms.map(g => ({ value: g.id, label: g.name }))]"
        />
      </div>

      <div class="search-bar-inner">
        <BaseSearchInput
          v-model="searchQuery"
          :placeholder="t('gymTrainee.searchPlaceholder')"
        />
      </div>
    </div>

    <div v-if="loading" class="empty-state">{{ t('common.loading') }}</div>
    <div v-else class="trainee-table-container glass">
      <table class="trainee-table">
        <thead>
          <tr>
            <th>{{ t('gymTrainee.nickname') }}</th>
            <th>{{ t('gymTrainee.email') }}</th>
            <th>{{ t('gymTrainee.remainingSessions') }}</th>
            <th>{{ t('gymTrainee.expirationDate') }}</th>
            <th v-if="showActions">{{ t('gymTrainee.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="trainee in pagedTrainees" :key="trainee.uid">
            <td>{{ trainee.nickname }}</td>
            <td>{{ trainee.email }}</td>
            <td :class="{ 'warning-text': (trainee.remainingSessions || 0) < 3 }">
                {{ trainee.remainingSessions }}
            </td>
            <td :class="{ 'warning-text': isExpired(trainee.expirationDate) }">
                {{ trainee.expirationDate || t('common.na') }}
            </td>
            <td v-if="showActions">
              <button class="btn btn-ghost btn-mini" @click="viewDetails(trainee)">
                {{ t('common.details' as any) || 'Details' }}
              </button>
            </td>
          </tr>
          <tr v-if="!pagedTrainees.length">
            <td :colspan="showActions ? 5 : 4" class="empty-state">
              {{ t('gymTrainee.noTrainees') || t('common.na') }}
            </td>
          </tr>
        </tbody>
      </table>

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

    <!-- Details Modal -->
    <BaseModal v-model:isOpen="isModalOpen" :title="selectedTrainee?.nickname || ''">
        <div v-if="selectedTrainee" class="trainee-info-details">
            <div class="detail-row">
                <span>{{ t('gymTrainee.email') }}:</span>
                <strong>{{ selectedTrainee.email }}</strong>
            </div>
            <div class="detail-row">
                <span>{{ t('gymTrainee.remainingSessions') }}:</span>
                <strong class="sessions-count">{{ selectedTrainee.remainingSessions ?? 0 }}</strong>
            </div>
            <div class="detail-row">
                <span>{{ t('gymTrainee.expirationDate') }}:</span>
                <strong>{{ selectedTrainee.expirationDate || t('common.na') }}</strong>
            </div>
        </div>
        <template #footer>
            <button class="btn btn-ghost" @click="isModalOpen = false">{{ t('common.close') }}</button>
            <button class="btn btn-secondary" @click="openHistory">{{ t('gymTrainee.creditHistory') }}</button>
            <button v-if="canManageCredit" class="btn btn-primary" @click="openAddCredit">{{ t('gymTrainee.addCredit') }}</button>
        </template>
    </BaseModal>

    <!-- Credit Add Modal -->
    <CreditAddModal
      v-if="selectedTrainee"
      v-model:isOpen="isCreditAddOpen"
      :traineeUid="selectedTrainee.uid"
      @success="onCreditAdded"
    />

    <!-- Credit History Modal -->
    <CreditHistoryModal
      v-if="selectedTrainee"
      v-model:isOpen="isCreditHistoryOpen"
      :traineeUid="selectedTrainee.uid"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseModal from '../components/ui/BaseModal.vue'
import BaseSearchInput from '../components/ui/BaseSearchInput.vue'
import BaseSelect from '../components/ui/BaseSelect.vue'
import CreditAddModal from '../components/gym/CreditAddModal.vue'
import CreditHistoryModal from '../components/gym/CreditHistoryModal.vue'
import { getGymTrainees, getGyms } from '../services/firebaseService'
import { getCoursesForUser } from '../services/courseService'
import type { TraineeInfo } from '../types'

const { t } = useI18n()
const auth = useAuthStore()

const loading = ref(true)
const trainees = ref<TraineeInfo[]>([])
const searchQuery = ref('')
const isModalOpen = ref(false)
const isCreditAddOpen = ref(false)
const isCreditHistoryOpen = ref(false)
const selectedTrainee = ref<TraineeInfo | null>(null)
const page = ref(1)
const pageSize = 20
const gyms = ref<{ id: string; name: string }[]>([])
const selectedGymId = ref<string>('__all__')

const showActions = computed(() => !!(auth.isTrainer || auth.isManager || auth.isSupervisor))
const canManageCredit = computed(() => !!(auth.isManager || auth.isSupervisor))

const filteredTrainees = computed(() => {
  let base = trainees.value
  if (auth.isSupervisor && selectedGymId.value !== '__all__') {
    base = base.filter((m) => m.gymId === selectedGymId.value)
  }
  if (!searchQuery.value) return base
  const q = searchQuery.value.toLowerCase()
  return base.filter(
    (m) =>
      m.nickname?.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
  )
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredTrainees.value.length / pageSize))
)

const pagedTrainees = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredTrainees.value.slice(start, start + pageSize)
})

onMounted(async () => {
  if (!auth.user) return
  loading.value = true
  try {
    if (auth.isSupervisor) {
      gyms.value = await getGyms()
      const all: TraineeInfo[] = []
      for (const g of gyms.value) {
        const list = await getGymTrainees(g.id)
        list.forEach((m) => all.push({ ...m, gymId: g.id } as any))
      }
      trainees.value = all
    } else if (auth.isManager) {
      if (!auth.user.gymId) {
        trainees.value = []
      } else {
        trainees.value = await getGymTrainees(auth.user.gymId)
      }
    } else if (auth.isTrainer) {
      if (!auth.user.gymId || !auth.user.email) {
        trainees.value = []
      } else {
        const [gymTrainees, courses] = await Promise.all([
          getGymTrainees(auth.user.gymId),
          getCoursesForUser(auth.user.email)
        ])
        const traineeSet = new Set<string>()
        courses.forEach((c) => {
          ;(c.traineeEmails || []).forEach((email) => traineeSet.add(email))
        })
        trainees.value = gymTrainees.filter((m) => traineeSet.has(m.email))
      }
    } else {
      trainees.value = []
    }
  } finally {
    loading.value = false
  }
})

const isExpired = (dateStr?: string) => {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
}

const viewDetails = (trainee: TraineeInfo) => {
    selectedTrainee.value = trainee
    isModalOpen.value = true
}

const openAddCredit = () => {
    isModalOpen.value = false
    isCreditAddOpen.value = true
}

const openHistory = () => {
    isModalOpen.value = false
    isCreditHistoryOpen.value = true
}

const onCreditAdded = async () => {
    if (!auth.user) return
    loading.value = true
    try {
        let refreshed: TraineeInfo[] = []
        if (auth.isSupervisor) {
            for (const g of gyms.value) {
                const list = await getGymTrainees(g.id)
                list.forEach((m) => refreshed.push({ ...m, gymId: g.id } as any))
            }
        } else if (auth.isManager && auth.user.gymId) {
            refreshed = await getGymTrainees(auth.user.gymId)
        } else if (auth.isTrainer && auth.user.gymId && auth.user.email) {
            const [gymTrainees, courses] = await Promise.all([
                getGymTrainees(auth.user.gymId),
                getCoursesForUser(auth.user.email)
            ])
            const traineeSet = new Set<string>()
            courses.forEach((c) => { (c.traineeEmails || []).forEach((e) => traineeSet.add(e)) })
            refreshed = gymTrainees.filter((m) => traineeSet.has(m.email))
        }
        trainees.value = refreshed
        if (selectedTrainee.value) {
            const updated = refreshed.find((m) => m.uid === selectedTrainee.value!.uid)
            if (updated) selectedTrainee.value = updated
        }
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.gym-trainee-wrapper {
  padding: 6rem 1rem 2rem 1rem;
}
.trainee-table-container { overflow-x: auto; }
.trainee-table { width: 100%; border-collapse: collapse; text-align: left; }
.trainee-table th, .trainee-table td { padding: 1rem; border-bottom: 1px solid var(--border); }
.trainee-table th { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; }
.trainee-table tr:last-child td { border-bottom: none; }
.warning-text { color: var(--accent); font-weight: 600; }
.detail-row { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
.detail-row:last-child { border-bottom: none; }
.btn-mini { padding: 0.2rem 0.6rem; font-size: 0.75rem; }
.sessions-count { font-size: 1.1rem; }

.filter-bar {
  margin: 1.5rem 0;
  padding: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
}

.gym-filter {
  min-width: 220px;
}

.filter-label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.gym-select {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
}

.search-bar-inner {
  flex: 1;
}

.glass-input {
  width: 100%;
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
