<template>
  <div class="trainee-home">
    <!-- Top Stats -->
    <div class="top-stats">
      <div class="stat-tile glass">
        <div class="tile-top">
          <div class="tile-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4z"></path>
              <path d="M7 9h10"></path>
              <path d="M7 13h6"></path>
            </svg>
          </div>
          <div class="tile-label">{{ t('dashboard.remainingSessions') }}</div>
        </div>
        <div class="tile-value">{{ formattedRemainingSessions }}</div>
        <div class="tile-sub">Remaining PT Sessions</div>
      </div>

      <div class="stat-tile glass">
        <div class="tile-top">
          <div class="tile-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div class="tile-label">{{ t('dashboard.ptExpiration') }}</div>
        </div>
        <div class="tile-value" :class="{ 'text-danger': isExpiringSoon }">
          {{ membershipDaysRemaining > 0 ? `${membershipDaysRemaining}` : '0' }}&nbsp;<span class="tile-days">days</span>
        </div>
        <div class="tile-sub">Membership Expiry</div>
      </div>
    </div>

    <!-- Next Session -->
    <div class="next-session-wrapper">
      <div class="next-session-card">
        <div class="next-session-inner">
          <div class="next-pill-row">
            <span class="next-pill">{{ nextRelativeDayLabel }}</span>
          </div>

          <div class="next-title">{{ t('dashboard.upcomingSessions') }}</div>
          <div class="next-session-name">{{ nextScheduleTitle }}</div>

          <div class="next-meta-row">
            <div class="next-meta-left">
              <div class="next-time">{{ nextScheduleTime }}</div>
              <div class="next-coach">
                <span class="next-coach-label">coach</span>
                <span class="next-coach-name">{{ nextScheduleCoach }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- My Body Metrics -->
    <div class="section-head">
      <div class="section-title">My Body Metrics</div>
      <div class="section-sync">
        <span class="sync-label">{{ t('dashboard.lastSync') }}</span>
        <span class="sync-value">{{ lastSyncValue }}</span>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card glass">
        <div class="metric-label">{{ t('body.weightLabel') }}</div>
        <div class="metric-value">{{ formattedWeight }}</div>
      </div>
      <div class="metric-card glass">
        <div class="metric-label">{{ t('body.bodyFatLabel') }}</div>
        <div class="metric-value">{{ formattedBodyFat }}</div>
      </div>
      <div class="metric-card glass">
        <div class="metric-label">{{ t('body.muscleMassLabel') }}</div>
        <div class="metric-value">{{ formattedMuscleMass }}</div>
      </div>
    </div>

    <!-- Past Exercises -->
    <div class="past-head">
      <div class="past-title">Past Exercises</div>
      <button class="view-all-btn" type="button" @click="showAllPast = !showAllPast">
        {{ showAllPast ? t('dashboard.viewLess') : t('dashboard.viewAll') }}
      </button>
    </div>

    <div class="past-list">
      <div
        v-for="item in displayedPastExercises"
        :key="item.key"
        class="exercise-card glass"
      >
        <div class="exercise-left">
          <div class="exercise-icon" aria-hidden="true">
            <template v-if="item.iconType === 'treadmill'">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="6" width="18" height="12" rx="2"></rect>
                <path d="M7 10h10"></path>
                <path d="M8 18l2-4"></path>
                <path d="M16 18l-2-4"></path>
              </svg>
            </template>
            <template v-else>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 11h20"></path>
                <path d="M7 4v7"></path>
                <path d="M17 4v7"></path>
                <path d="M7 17v3"></path>
                <path d="M17 17v3"></path>
              </svg>
            </template>
          </div>
          <div class="exercise-text">
            <div class="exercise-name">{{ item.name }}</div>
            <div class="exercise-sub">{{ item.subLine }}</div>
          </div>
        </div>
        <div class="exercise-right">
          <div v-if="item.prLabel" class="pr-badge">{{ item.prLabel }}</div>
          <div class="exercise-date">{{ item.dateLabel }}</div>
        </div>
      </div>

      <div v-if="!displayedPastExercises.length" class="empty-state">
        {{ t('common.noData') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useScheduleStore } from '../../stores/scheduleStore'
import { useProfileStore } from '../../stores/profileStore'
import { searchUserByEmail } from '../../services/domain/userService'
import type { CalendarEvent, ExerciseRecord } from '../../types'

const auth = useAuthStore()
const scheduleStore = useScheduleStore()
const profileStore = useProfileStore()
const { t } = useI18n()

const showAllPast = ref(false)

const trainerNicknameByEmail = ref<Record<string, string>>({})

const authEmail = computed(() => auth.user?.email || '')

onMounted(async () => {
  const email = authEmail.value
  if (!email) return

  // 1) 다음 세션 / 지난 운동: scheduleStore
  // 2) My Body Metrics: profileStore(최근 기록)
  await Promise.allSettled([
    scheduleStore.fetchSchedules(email),
    profileStore.fetchProfiles(email),
  ])
})

watch(
  authEmail,
  async (email) => {
    if (!email) return
    await Promise.allSettled([
      scheduleStore.fetchSchedules(email, false),
      profileStore.fetchProfiles(email, false),
    ])
  },
  { immediate: false },
)

const remainingSessions = computed(() => auth.user?.remainingSessions ?? 0)
const formattedRemainingSessions = computed(() => String(remainingSessions.value).padStart(2, '0'))

const membershipDaysRemaining = computed(() => {
  const raw = auth.user?.expirationDate
  if (!raw) return 0
  const exp = new Date(raw)
  if (Number.isNaN(exp.getTime())) return 0
  const now = new Date()
  const diffMs = exp.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
})

const isExpiringSoon = computed(() => membershipDaysRemaining.value <= 14 && membershipDaysRemaining.value >= 0)

// ── Next session ────────────────────────────────────────────────
const nextSchedule = computed<CalendarEvent | null>(() => {
  const email = authEmail.value
  if (!email) return null

  const all = scheduleStore.getSchedulesByEmail(email)
  const now = new Date()

  const upcoming = all
    .filter((e) => {
      const dt = new Date(`${e.dateStr}T${e.time || '00:00'}`)
      if (Number.isNaN(dt.getTime())) return false
      if (dt < now) return false
      // 완료되지 않은 일정만(취소/거절 제외)
      return e.status !== 'CANCELLED' && e.status !== 'REJECTED'
    })
    .sort((a, b) => {
      const da = new Date(`${a.dateStr}T${a.time || '00:00'}`).getTime()
      const db = new Date(`${b.dateStr}T${b.time || '00:00'}`).getTime()
      return da - db
    })

  return upcoming[0] ?? null
})

function toDateTime(e: CalendarEvent): Date {
  return new Date(`${e.dateStr}T${e.time || '00:00'}`)
}

const nextRelativeDayLabel = computed(() => {
  const e = nextSchedule.value
  if (!e) return t('common.na')
  // `dateStr`(YYYY-MM-DD) 기준으로 오늘/내일을 판정하면 time/타임존에 의한 날짜 밀림을 줄일 수 있습니다.
  const todayStr = new Date().toISOString().split('T')[0]
  if (e.dateStr === todayStr) return t('calendar.today')

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  if (e.dateStr === tomorrowStr) return t('calendar.tomorrow')

  const dt = new Date(`${e.dateStr}T00:00:00`)
  if (Number.isNaN(dt.getTime())) return t('common.na')
  return dt.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
})

const nextScheduleTitle = computed(() => nextSchedule.value?.title || t('common.na'))

const nextScheduleTime = computed(() => {
  const e = nextSchedule.value
  if (!e) return t('common.na')
  const dt = toDateTime(e)
  if (Number.isNaN(dt.getTime())) return t('common.na')
  return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
})

const nextScheduleCoach = computed(() => {
  const trainerEmail = nextSchedule.value?.trainerEmail
  if (!trainerEmail) return t('common.na')
  return trainerNicknameByEmail.value[trainerEmail] || trainerEmail
})

watch(
  () => nextSchedule.value?.trainerEmail,
  async (trainerEmail) => {
    if (!trainerEmail) return
    if (trainerNicknameByEmail.value[trainerEmail]) return

    try {
      const res = await searchUserByEmail(trainerEmail)
      if (!res?.data) return
      const nickname = (res.data.nickname as string | undefined) || (res.data.name as string | undefined) || (res.data.email as string | undefined)
      if (nickname) trainerNicknameByEmail.value[trainerEmail] = nickname
    } catch (e) {
      // 닉네임 로딩 실패해도 화면은 계속 렌더링되어야 함
      console.warn('Failed to fetch trainer nickname', e)
    }
  },
  { immediate: true },
)

// ── My Body Metrics ────────────────────────────────────────────
const latestBodyRecord = computed(() => {
  const email = authEmail.value
  if (!email) return null
  const records = profileStore.getProfilesByEmail(email)
  if (!records.length) return null
  return records.reduce((latest, r) => {
    const a = new Date(latest.date).getTime()
    const b = new Date(r.date).getTime()
    if (Number.isNaN(a) || Number.isNaN(b)) return latest
    return b > a ? r : latest
  }, records[0])
})

function formatNumberOrNA(v: number | undefined | null, digits = 1): string {
  if (v === undefined || v === null || Number.isNaN(Number(v))) return t('common.na')
  return Number(v).toFixed(digits)
}

const formattedWeight = computed(() => {
  const v = latestBodyRecord.value?.weight
  if (v === undefined || v === null) return t('common.na')
  return `${formatNumberOrNA(v, 1)} kg`
})

const formattedBodyFat = computed(() => {
  const v = latestBodyRecord.value?.bodyFat
  if (v === undefined || v === null) return t('common.na')
  return `${formatNumberOrNA(v, 1)}%`
})

const formattedMuscleMass = computed(() => {
  const v = latestBodyRecord.value?.muscleMass
  if (v === undefined || v === null) return t('common.na')
  return `${formatNumberOrNA(v, 1)} kg`
})

const lastSyncValue = computed(() => {
  const r = latestBodyRecord.value
  if (!r) return t('common.na')

  const todayStr = new Date().toISOString().split('T')[0]
  const target = new Date(r.date)
  if (Number.isNaN(target.getTime())) return t('common.na')
  const targetStr = target.toISOString().split('T')[0]
  if (targetStr === todayStr) return 'TODAY'

  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
})

// ── Past Exercises (preview) ────────────────────────────────────
type PastExerciseItem = {
  key: string
  name: string
  subLine: string
  prLabel?: string
  dateLabel: string
  iconType: 'strength' | 'treadmill'
}

function formatDateLabel(dt: Date): string {
  if (Number.isNaN(dt.getTime())) return t('common.na')
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

// 아이콘은 템플릿에서 SVG로 분기 렌더링(빌드 설정에 따라 JSX/TSX가 깨질 수 있어 사용 금지)

const completedEvents = computed<CalendarEvent[]>(() => {
  const email = authEmail.value
  if (!email) return []
  return scheduleStore.getSchedulesByEmail(email).filter((e) => e.status === 'COMPLETED' && Array.isArray(e.records) && e.records.length > 0)
})

const maxWeightByName = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {}
  for (const e of completedEvents.value) {
    for (const r of e.records || []) {
      if (!r?.name) continue
      if (r.weight === undefined || r.weight === null || Number.isNaN(Number(r.weight))) continue
      const cur = Number(r.weight)
      if (!map[r.name]) map[r.name] = cur
      else map[r.name] = Math.max(map[r.name], cur)
    }
  }
  return map
})

function exerciseIconForName(name: string) {
  const n = name.toLowerCase()
  if (n.includes('treadmill') || n.includes('incline')) return 'treadmill' as const
  return 'strength' as const
}

function buildSubLine(record: ExerciseRecord): string {
  const name = record.name?.toLowerCase() || ''
  const sets = record.sets ?? 0
  const reps = record.reps ?? 0
  const weight = record.weight

  if (name.includes('treadmill') || name.includes('incline')) {
    // 프로젝트 데이터 관례상: sets=분(mins), weight=레벨(incline level)로 저장되는 경우가 많음
    if (weight !== undefined && weight !== null && !Number.isNaN(Number(weight))) {
      return `${sets} mins · Level ${Number(weight).toFixed(0)} Incline`
    }
    return `${sets} mins`
  }

  if (weight !== undefined && weight !== null && !Number.isNaN(Number(weight))) {
    return `${sets} sets x ${reps} reps · ${Number(weight).toFixed(0)}kg`
  }
  return `${sets} sets x ${reps} reps`
}

const pastExercisePreview = computed<PastExerciseItem[]>(() => {
  if (!completedEvents.value.length) return []

  // 완료된 일정 내 record들을 날짜 내림차순으로 flatten
  const allRecords: Array<{ dt: Date; eventId: string; record: ExerciseRecord }> = []
  for (const e of completedEvents.value) {
    const dt = toDateTime(e)
    for (const rec of e.records || []) {
      allRecords.push({ dt, eventId: e.id, record: rec })
    }
  }

  allRecords.sort((a, b) => b.dt.getTime() - a.dt.getTime())

  // 스샷처럼 "종목 1개당 최근 기록 1개" 형태
  const seen = new Set<string>()
  const out: PastExerciseItem[] = []

  for (const it of allRecords) {
    const name = it.record.name
    if (!name) continue
    if (seen.has(name)) continue
    seen.add(name)

    const dt = it.dt
    const weight = it.record.weight
    const maxW = maxWeightByName.value[name]
    let prLabel: string | undefined

    if (weight !== undefined && weight !== null && !Number.isNaN(Number(weight)) && maxW !== undefined) {
      // 현재 기록이 PR보다 작은 경우: PR -Xkg
      const delta = Number(weight) - maxW
      const deltaLabel = delta === 0 ? '0kg' : `${delta.toFixed(0)}kg`
      prLabel = `PR ${deltaLabel}`
      if (!isFinite(Number(delta))) prLabel = undefined
    }

    out.push({
      key: `${name}-${it.eventId}`,
      name,
      subLine: buildSubLine(it.record),
      prLabel,
      dateLabel: formatDateLabel(dt),
      iconType: exerciseIconForName(name),
    })

    if (out.length >= 8) break
  }

  return out
})

const displayedPastExercises = computed(() => {
  const limit = showAllPast.value ? 6 : 3
  return pastExercisePreview.value.slice(0, limit)
})
</script>

<style scoped>
.trainee-home {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.top-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.stat-tile {
  padding: 1.25rem 1.35rem;
  border-radius: 1rem;
}

.tile-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.tile-icon {
  color: var(--primary);
  opacity: 0.95;
}

.tile-label {
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.tile-value {
  margin-top: 1rem;
  font-size: 2.2rem;
  font-weight: 800;
  color: var(--primary);
  line-height: 1.1;
}

.tile-value.text-danger {
  color: #f43f5e;
}

.tile-days {
  font-size: 1rem;
  color: var(--text-muted);
  font-weight: 700;
}

.tile-sub {
  margin-top: 0.3rem;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.next-session-wrapper {
  margin-top: 0.25rem;
}

.next-session-card {
  position: relative;
  border-radius: 1.2rem;
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
}

.next-session-card::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, rgba(94, 53, 177, 0.85), rgba(30, 136, 229, 0.55));
  opacity: 0.4;
}

.next-session-inner {
  position: relative;
  margin: 1px;
  padding: 1.25rem 1.4rem;
  border-radius: 1.15rem;
  background: rgba(0, 0, 0, 0.12);
}

.next-pill-row {
  display: flex;
  justify-content: flex-end;
}

.next-pill {
  padding: 0.25rem 0.85rem;
  border-radius: 999px;
  background: rgba(94, 53, 177, 0.18);
  color: var(--primary);
  font-weight: 800;
  letter-spacing: 0.02em;
  font-size: 0.85rem;
  text-transform: uppercase;
}

.next-title {
  margin-top: 0.9rem;
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.next-session-name {
  margin-top: 0.25rem;
  font-size: 1.55rem;
  font-weight: 900;
}

.next-meta-row {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.next-time {
  font-size: 1rem;
  font-weight: 900;
}

.next-coach {
  display: flex;
  gap: 0.35rem;
  align-items: baseline;
  margin-top: 0.25rem;
}

.next-coach-label {
  color: var(--text-muted);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.8rem;
}

.next-coach-name {
  color: var(--text-main);
  font-weight: 800;
}

.section-head {
  margin-top: 0.4rem;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.section-title {
  font-weight: 900;
  font-size: 1.15rem;
}

.section-sync {
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 700;
}

.sync-label {
  margin-right: 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.sync-value {
  color: var(--primary);
  font-weight: 900;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.9rem;
}

.metric-card {
  padding: 1.1rem 1.1rem;
  border-radius: 1rem;
}

.metric-label {
  color: var(--text-muted);
  font-weight: 800;
  font-size: 0.85rem;
}

.metric-value {
  margin-top: 0.5rem;
  font-size: 1.55rem;
  font-weight: 900;
}

.past-head {
  margin-top: 0.2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.past-title {
  font-size: 1.1rem;
  font-weight: 900;
}

.view-all-btn {
  background: transparent;
  color: var(--text-muted);
  font-weight: 900;
  letter-spacing: 0.02em;
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.6rem;
}

.view-all-btn:hover {
  color: var(--primary);
}

.past-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.exercise-card {
  padding: 1rem 1.1rem;
  border-radius: 1rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}

.exercise-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.exercise-icon {
  color: var(--primary);
  opacity: 0.95;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 0.9rem;
  background: rgba(94, 53, 177, 0.12);
}

.exercise-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.exercise-name {
  font-weight: 950;
  font-size: 1rem;
}

.exercise-sub {
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 52vw;
}

.exercise-right {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.pr-badge {
  color: var(--primary);
  font-weight: 900;
  font-size: 0.78rem;
}

.exercise-date {
  color: var(--text-muted);
  font-weight: 800;
  font-size: 0.75rem;
}

.empty-state {
  padding: 2rem 0;
  text-align: center;
  color: var(--text-muted);
  font-weight: 800;
}

@media (max-width: 640px) {
  .top-stats {
    grid-template-columns: 1fr 1fr;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .exercise-sub {
    max-width: 56vw;
  }
}
</style>
