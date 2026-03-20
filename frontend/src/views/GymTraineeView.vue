<template>
  <div class="gym-trainee-wrapper container">
    <PageHeader
      :title="t('gymTrainee.labels.title')"
      :subtitle="t('gymTrainee.labels.subtitle')"
      :showBack="true"
      back-url="/home"
    />

    <div class="filter-bar glass">
      <div v-if="auth.isSiteAdmin" class="gym-filter">
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
          :placeholder="t('gymTrainee.labels.searchPlaceholder')"
        />
      </div>
    </div>

    <div v-if="loading" class="empty-state">{{ t('common.loading') }}</div>
    <div v-else class="trainee-list-container glass">
      <BaseListView
        :items="pagedTrainees"
        :emptyText="t('gymTrainee.empty.noTrainees') || t('common.na')"
        :itemKey="'uid'"
        dense
      >
        <template #item="{ item: trainee }">
          <div
            class="gymTrainee__card"
            role="button"
            tabindex="0"
            @click="showActions ? viewDetails(trainee) : null"
            @keydown.enter.prevent="showActions ? viewDetails(trainee) : null"
          >
            <div class="gymTrainee__cardTop">
              <div class="gymTrainee__identity">
                <div class="gymTrainee__avatar" aria-hidden="true">
                  <img
                    v-if="trainee.profileImageUrl"
                    :src="trainee.profileImageUrl"
                    alt="Avatar"
                    class="gymTrainee__avatarImg"
                  />
                  <span v-else class="gymTrainee__avatarInitial">{{ getAvatarInitial(trainee.nickname || trainee.email) }}</span>
                </div>

                <div class="gymTrainee__texts">
                  <div class="gymTrainee__name">{{ trainee.nickname || trainee.email }}</div>
                  <div class="gymTrainee__email">{{ trainee.email }}</div>
                </div>
              </div>

              <div class="gymTrainee__proBadgeWrap">
                <span v-if="isPro(trainee)" class="gymTrainee__proBadge">PRO</span>
              </div>
            </div>

            <div class="gymTrainee__metricsGrid">
              <div class="gymTrainee__metricCard">
                <div class="gymTrainee__metricLabel">PT SESSIONS</div>
                <div class="gymTrainee__metricMain">
                  <span class="gymTrainee__metricValue">{{ trainee.remainingSessions ?? 0 }}</span>
                  <span class="gymTrainee__metricSuffix">/ {{ sessionsTotal }} LEFT</span>
                </div>

                <div class="gymTrainee__progressTrack" aria-hidden="true">
                  <div class="gymTrainee__progressFill" :style="{ width: `${sessionsProgressPercent(trainee.remainingSessions)}%` }" />
                </div>
              </div>

              <div class="gymTrainee__metricCard">
                <div class="gymTrainee__metricLabel">MEMBERSHIP</div>
                <div class="gymTrainee__metricMain">
                  <span class="gymTrainee__metricValue">{{ daysLeft(trainee.expirationDate) }}</span>
                  <span class="gymTrainee__metricSuffix">DAYS LEFT</span>
                </div>

                <div class="gymTrainee__expLine">EXP: {{ formatExpiry(trainee.expirationDate) }}</div>
              </div>
            </div>
          </div>
        </template>
      </BaseListView>

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
                <span>{{ t('gymTrainee.labels.email') }}:</span>
                <strong>{{ selectedTrainee.email }}</strong>
            </div>
            <div class="detail-row">
                <span>{{ t('gymTrainee.labels.remainingSessions') }}:</span>
                <strong class="sessions-count">{{ selectedTrainee.remainingSessions ?? 0 }}</strong>
            </div>
            <div class="detail-row">
                <span>{{ t('gymTrainee.labels.expirationDate') }}:</span>
                <strong>{{ selectedTrainee.expirationDate || t('common.na') }}</strong>
            </div>
        </div>
        <template #footer>
            <button class="btn btn-ghost" @click="isModalOpen = false">{{ t('common.close') }}</button>
            <button class="btn btn-secondary" @click="openHistory">{{ t('gymTrainee.buttons.creditHistory') }}</button>
            <button v-if="canManageCredit" class="btn btn-primary" @click="openAddCredit">{{ t('gymTrainee.buttons.addCredit') }}</button>
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
import BaseListView from '../components/ui/BaseListView.vue'
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

const showActions = computed(() => !!(auth.isTrainer || auth.isManager || auth.isSiteAdmin))
const canManageCredit = computed(() => !!(auth.isManager || auth.isSiteAdmin))

// 스티치 디자인 기준: 카드 내 PT sessions "LEFT"는 고정 총량(20)으로 표시
const sessionsTotal = 20

function getAvatarInitial(value: string): string {
  const s = (value || '').trim()
  if (!s) return '?'
  return s[0].toUpperCase()
}

function sessionsProgressPercent(remainingSessions?: number): number {
  const r = remainingSessions ?? 0
  if (sessionsTotal <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((r / sessionsTotal) * 100)))
}

function daysLeft(dateStr?: string): number {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 0
  const diffMs = d.getTime() - Date.now()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

function formatExpiry(dateStr?: string): string {
  if (!dateStr) return t('common.na')
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return t('common.na')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
}

function isPro(trainee: TraineeInfo): boolean {
  return (trainee.remainingSessions ?? 0) > 0 || daysLeft(trainee.expirationDate) > 0
}

const filteredTrainees = computed(() => {
  let base = trainees.value
  if (auth.isSiteAdmin && selectedGymId.value !== '__all__') {
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
    if (auth.isSiteAdmin) {
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
        if (auth.isSiteAdmin) {
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

.trainee-list-container {
  padding: 0;
}

:deep(.base-list-view .list) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(520px, 1fr));
  gap: 1rem;
}

:deep(.base-list-view.dense .list) {
  gap: 1rem;
}

.gymTrainee__card {
  cursor: pointer;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.95rem 1.05rem;
  color: var(--text-main);
  box-shadow: 1px 0 20px rgba(0, 0, 0, 0.08);
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}

.gymTrainee__card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 46px rgba(124, 58, 237, 0.18);
}

.gymTrainee__card:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.35), 0 18px 46px rgba(124, 58, 237, 0.18);
}

.gymTrainee__cardTop {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.gymTrainee__identity {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  min-width: 0;
}

.gymTrainee__avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.gymTrainee__avatarImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gymTrainee__avatarInitial {
  font-weight: 900;
  font-size: 1.05rem;
  color: var(--text-main);
  letter-spacing: 0.02em;
}

.gymTrainee__texts {
  min-width: 0;
}

.gymTrainee__name {
  font-size: 1.45rem;
  font-weight: 900;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-main);
}

.gymTrainee__email {
  margin-top: 0.25rem;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 320px;
}

.gymTrainee__proBadgeWrap {
  flex: 0 0 auto;
  margin-top: 0.1rem;
}

.gymTrainee__proBadge {
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  background: rgba(94, 53, 177, 0.12);
  border: 1px solid rgba(94, 53, 177, 0.35);
  color: var(--primary);
  font-weight: 900;
  font-size: 0.85rem;
  letter-spacing: 0.03em;
}

.gymTrainee__metricsGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem;
  margin-top: 0.7rem;
}

.gymTrainee__metricCard {
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 0.65rem 0.65rem;
}

.gymTrainee__metricLabel {
  font-weight: 900;
  font-size: 0.8rem;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.gymTrainee__metricMain {
  margin-top: 0.25rem;
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.gymTrainee__metricValue {
  font-size: 1.4rem;
  font-weight: 900;
  color: var(--primary);
}

.gymTrainee__metricSuffix {
  color: var(--text-muted);
  font-weight: 900;
  font-size: 0.8rem;
  letter-spacing: 0.02em;
}

.gymTrainee__progressTrack {
  margin-top: 0.45rem;
  height: 4px;
  background: var(--bg-dark);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.gymTrainee__progressFill {
  height: 100%;
  background: rgba(167, 139, 250, 1);
  border-radius: 999px;
  width: 0%;
  transition: width 0.2s ease;
}

.gymTrainee__expLine {
  margin-top: 0.35rem;
  color: var(--text-muted);
  font-weight: 900;
  font-size: 0.75rem;
  letter-spacing: 0.02em;
}

.gymTrainee__row {
  display: grid;
  grid-template-columns: 1.2fr 1fr auto;
  gap: 0.9rem;
  align-items: center;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.65);
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}

.gymTrainee__row:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.85);
}

.gymTrainee__main {
  min-width: 0;
}

.gymTrainee__name {
  font-size: 1.45rem;
  font-weight: 900;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-main);
}

.gymTrainee__sub {
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: baseline;
}

.gymTrainee__email {
  margin-top: 0.25rem;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 320px;
  min-width: 0;
}

.gymTrainee__metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.gymTrainee__metric {
  padding: 0.55rem 0.75rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-dark);
  min-width: 0;
}

.gymTrainee__metricLabel {
  display: block;
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.gymTrainee__metricValue {
  display: block;
  margin-top: 0;
  font-size: 1.4rem;
  font-weight: 900;
  color: var(--primary);
}

.gymTrainee__metric--warn {
  border-color: rgba(244, 63, 94, 0.25);
  background: rgba(244, 63, 94, 0.06);
}

.gymTrainee__metric--warn .gymTrainee__metricValue {
  color: var(--accent);
}

.gymTrainee__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.btn-mini { padding: 0.2rem 0.6rem; font-size: 0.75rem; }
.sessions-count { font-size: 1.1rem; }

@media (max-width: 640px) {
  .gymTrainee__row {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .gymTrainee__actions {
    justify-content: flex-start;
  }

  .gymTrainee__email {
    max-width: 100%;
  }

  :deep(.base-list-view .list) {
    grid-template-columns: 1fr;
  }

  .gymTrainee__card {
    padding: 0.95rem 1rem;
  }

  .gymTrainee__name {
    font-size: 1.25rem;
  }

  .gymTrainee__metricsGrid {
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .gymTrainee__email {
    max-width: 100%;
  }
}
.detail-row { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
.detail-row:last-child { border-bottom: none; }
/* .btn-mini / .sessions-count moved above for list row styles */

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
