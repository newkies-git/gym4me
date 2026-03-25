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

      <div v-if="canSendLowCreditAlert" class="alert-filter">
        <label class="filter-label">{{ t('common.notification' as any) || '알림' }}</label>
        <div class="alert-filter-row">
          <button
            type="button"
            class="btn btn-primary btn-sm"
            :disabled="!targetGymIdForAlert"
            @click="sendLowCreditAlertNow"
          >
            저잔여 알림 발송
          </button>
          <button
            v-if="canViewLowCreditAlertHistory"
            type="button"
            class="btn btn-ghost btn-sm"
            @click="openJobHistory"
          >
            발송 기록
          </button>
        </div>
        <div class="sm-hint" v-if="auth.isSiteAdmin && !targetGymIdForAlert">
          Gym을 선택하면 발송할 수 있습니다.
        </div>
      </div>

      <div class="credit-filter">
        <label class="filter-label">{{ t('gymTrainee.labels.remainingSessions') }}</label>
        <div class="credit-filter-row">
          <input
            v-model.number="creditThreshold"
            class="credit-threshold-input"
            type="number"
            min="0"
            step="1"
            inputmode="numeric"
            :aria-label="t('gymTrainee.labels.remainingSessions')"
          />
          <label class="credit-only-toggle">
            <input type="checkbox" v-model="onlyLowCredits" />
            <span>{{ t('common.filter' as any) || '필터' }}: ≤ {{ creditThreshold }}</span>
          </label>
        </div>
      </div>

      <div class="sort-filter">
        <label class="filter-label">{{ t('common.sort' as any) || '정렬' }}</label>
        <BaseSelect
          v-model="sortKey"
          class="gym-select"
          :options="[
            { value: 'sessionsAsc', label: (t('gymTrainee.labels.remainingSessions') as any) ? `${t('gymTrainee.labels.remainingSessions')} ↑` : '잔여횟수 ↑' },
            { value: 'sessionsDesc', label: (t('gymTrainee.labels.remainingSessions') as any) ? `${t('gymTrainee.labels.remainingSessions')} ↓` : '잔여횟수 ↓' },
            { value: 'expiryAsc', label: '만료일 ↑' },
            { value: 'expiryDesc', label: '만료일 ↓' }
          ]"
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
              <div class="gymTrainee__metricCard" :class="{ 'gymTrainee__metricCard--warn': isLowCredit(trainee) }">
                <div class="gymTrainee__metricLabel">PT SESSIONS</div>
                <div class="gymTrainee__metricMain">
                  <span class="gymTrainee__metricValue">{{ trainee.remainingSessions ?? 0 }}</span>
                  <span class="gymTrainee__metricSuffix">/ {{ sessionsTotal }} LEFT</span>
                </div>

                <div class="gymTrainee__progressTrack" aria-hidden="true">
                  <div class="gymTrainee__progressFill" :style="{ width: `${sessionsProgressPercent(trainee.remainingSessions)}%` }" />
                </div>
              </div>

              <div class="gymTrainee__metricCard" :class="{ 'gymTrainee__metricCard--warn': isExpired(trainee.expirationDate) }">
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

    <!-- Low credit alert job history -->
    <BaseModal v-model:isOpen="isJobHistoryOpen" title="발송 기록">
      <div v-if="jobsLoading" class="empty-state">{{ t('common.loading') }}</div>
      <div v-else class="job-history">
        <div v-if="!recentJobs.length" class="empty-state">{{ t('common.noData') }}</div>
        <div v-else class="job-list">
          <div v-for="job in recentJobs" :key="job.id" class="job-item">
            <div class="job-top">
              <div class="job-type">{{ job.type }}</div>
              <div class="job-status" :class="`st-${(job.status || 'PENDING').toLowerCase()}`">
                {{ job.status || 'PENDING' }}
              </div>
            </div>
            <div class="job-meta">
              <div>gymId: <strong>{{ job.gymId || '—' }}</strong></div>
              <div>threshold: <strong>{{ job.threshold ?? '—' }}</strong></div>
              <div>created: <strong>{{ formatDateTime(job.createdAt) }}</strong></div>
              <div>processed: <strong>{{ formatDateTime(job.processedAt) }}</strong></div>
            </div>
            <div v-if="job.result" class="job-result">
              결과:
              managers={{ job.result.managers ?? '—' }},
              trainees={{ job.result.trainees ?? '—' }},
              success={{ job.result.sentSuccess ?? job.result.sent ?? '—' }},
              failure={{ job.result.sentFailure ?? '—' }}
            </div>
            <div v-if="job.error" class="job-error">error: {{ job.error }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-ghost" @click="isJobHistoryOpen = false">{{ t('common.close') }}</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useRoute, useRouter } from 'vue-router'
import { useUIStore } from '../stores/uiStore'
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
import { db } from '../firebase/config'
import { addDoc, collection, serverTimestamp, query, where, orderBy, limit, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { extractErrorMessage } from '../utils/error'

const { t } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const ui = useUIStore()

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

const creditThreshold = ref<number>(3)
const onlyLowCredits = ref<boolean>(false)
const sortKey = ref<'sessionsAsc' | 'sessionsDesc' | 'expiryAsc' | 'expiryDesc'>('sessionsAsc')

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

function isLowCredit(trainee: TraineeInfo): boolean {
  const r = trainee.remainingSessions ?? 0
  return Number.isFinite(creditThreshold.value) && r <= creditThreshold.value
}

const filteredTrainees = computed(() => {
  let base = trainees.value
  if (auth.isSiteAdmin && selectedGymId.value !== '__all__') {
    base = base.filter((m) => m.gymId === selectedGymId.value)
  }
  if (onlyLowCredits.value) {
    base = base.filter((m) => (m.remainingSessions ?? 0) <= creditThreshold.value)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    base = base.filter(
      (m) =>
        m.nickname?.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    )
  }

  const toExpiryMs = (dateStr?: string): number => {
    if (!dateStr) return 0
    const d = new Date(dateStr)
    return Number.isNaN(d.getTime()) ? 0 : d.getTime()
  }

  const sorted = [...base]
  sorted.sort((a, b) => {
    const ar = a.remainingSessions ?? 0
    const br = b.remainingSessions ?? 0
    const ae = toExpiryMs(a.expirationDate)
    const be = toExpiryMs(b.expirationDate)
    if (sortKey.value === 'sessionsAsc') return ar - br
    if (sortKey.value === 'sessionsDesc') return br - ar
    if (sortKey.value === 'expiryAsc') return ae - be
    return be - ae
  })

  return sorted
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredTrainees.value.length / pageSize))
)

const pagedTrainees = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredTrainees.value.slice(start, start + pageSize)
})

watch(
  () => [selectedGymId.value, searchQuery.value, creditThreshold.value, onlyLowCredits.value, sortKey.value],
  () => {
    page.value = 1
  }
)

watch(
  () => route.query.threshold,
  (raw) => {
    const v = Array.isArray(raw) ? raw[0] : raw
    const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN
    if (Number.isFinite(n) && n >= 0) {
      creditThreshold.value = Math.floor(n)
      onlyLowCredits.value = true
    }
  },
  { immediate: true }
)

watch(
  () => route.query.onlyLow,
  (raw) => {
    const v = Array.isArray(raw) ? raw[0] : raw
    if (v === '1' || v === 'true') onlyLowCredits.value = true
  },
  { immediate: true }
)

watch(
  () => [creditThreshold.value, onlyLowCredits.value],
  () => {
    const query = { ...route.query } as Record<string, any>
    if (onlyLowCredits.value) {
      query.threshold = String(Math.max(0, Math.floor(creditThreshold.value || 0)))
      query.onlyLow = '1'
    } else {
      delete query.threshold
      delete query.onlyLow
    }
    router.replace({ query }).catch(() => {})
  }
)

const canSendLowCreditAlert = computed(() => !!(auth.isManager || auth.isSiteAdmin))
const canViewLowCreditAlertHistory = computed(() => !!(auth.isManager || auth.isSiteAdmin))

type AdminJobStatus = 'PENDING' | 'DONE' | 'FAILED'
type AdminJobType = 'MANAGER_LOW_CREDITS'

type AdminJob = {
  id: string
  type: AdminJobType
  gymId?: string
  actorEmail?: string
  threshold?: number
  status?: AdminJobStatus
  createdAt?: unknown
  processedAt?: unknown
  result?: {
    managers?: number
    trainees?: number
    sentSuccess?: number
    sentFailure?: number
    sent?: number
  }
  error?: string
}

const isJobHistoryOpen = ref(false)
const jobsLoading = ref(false)
const recentJobs = ref<AdminJob[]>([])
let jobsUnsub: Unsubscribe | null = null

const targetGymIdForAlert = computed(() => {
  if (auth.isSiteAdmin) {
    return selectedGymId.value !== '__all__' ? selectedGymId.value : ''
  }
  if (auth.isManager) {
    return auth.user?.gymId || ''
  }
  return ''
})

async function sendLowCreditAlertNow() {
  if (!canSendLowCreditAlert.value) return
  const gymId = targetGymIdForAlert.value
  if (!gymId) {
    ui.showToast('Gym을 선택하세요.', 'warning')
    return
  }

  try {
    await addDoc(collection(db, 'adminJobs'), {
      type: 'MANAGER_LOW_CREDITS',
      gymId,
      threshold: Math.max(0, Math.floor(Number(creditThreshold.value || 0))),
      actorEmail: auth.user?.email || '',
      createdAt: serverTimestamp(),
      status: 'PENDING'
    })
    ui.showToast('알림 발송 요청을 등록했습니다.', 'success')
  } catch (e: unknown) {
    ui.showToast(extractErrorMessage(e, '알림 발송 요청에 실패했습니다.'), 'error')
  }
}

function formatDateTime(value: unknown): string {
  if (value == null) return '—'
  try {
    if (typeof (value as any).toDate === 'function') return (value as any).toDate().toLocaleString()
    if (typeof (value as any).toMillis === 'function') return new Date((value as any).toMillis()).toLocaleString()
    if (typeof value === 'number') return new Date(value).toLocaleString()
    if (typeof value === 'string') {
      const d = new Date(value)
      return isNaN(d.getTime()) ? value : d.toLocaleString()
    }
    return String(value)
  } catch {
    return '—'
  }
}

async function openJobHistory() {
  if (!canViewLowCreditAlertHistory.value) return
  isJobHistoryOpen.value = true
  if (!auth.user?.email) return

  // reset previous subscription (if any)
  if (jobsUnsub) {
    jobsUnsub()
    jobsUnsub = null
  }

  jobsLoading.value = true
  const q = query(
    collection(db, 'adminJobs'),
    where('actorEmail', '==', auth.user.email),
    orderBy('createdAt', 'desc'),
    limit(20)
  )

  jobsUnsub = onSnapshot(
    q,
    (snap) => {
      recentJobs.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminJob, 'id'>) }))
      jobsLoading.value = false
    },
    (e) => {
      jobsLoading.value = false
      ui.showToast(extractErrorMessage(e, '발송 기록을 불러오지 못했습니다.'), 'error')
      recentJobs.value = []
    }
  )
}

watch(isJobHistoryOpen, (open) => {
  if (open) return
  if (jobsUnsub) {
    jobsUnsub()
    jobsUnsub = null
  }
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

.alert-filter-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.sm-hint {
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: var(--text-muted);
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

.job-history {
  padding: 0.25rem 0;
}

.job-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.job-item {
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--bg-card);
  padding: 0.75rem 0.9rem;
}

.job-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.job-type {
  font-weight: 900;
  font-size: 0.95rem;
}

.job-status {
  font-weight: 900;
  font-size: 0.8rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.job-status.st-done {
  color: #2e7d32;
  border-color: rgba(46, 125, 50, 0.35);
  background: rgba(76, 175, 80, 0.12);
}

.job-status.st-failed {
  color: #c62828;
  border-color: rgba(198, 40, 40, 0.35);
  background: rgba(244, 67, 54, 0.10);
}

.job-meta {
  margin-top: 0.5rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem 0.75rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.job-result {
  margin-top: 0.55rem;
  font-size: 0.85rem;
}

.job-error {
  margin-top: 0.35rem;
  color: #c62828;
  font-size: 0.85rem;
  white-space: pre-wrap;
}
</style>
