<template>
  <div class="calendar-wrapper container">
    <template v-if="calendarMode === 'trainee'">
      <div class="trainee-calendar">
        <div class="trainee-header-row">
          <div class="trainee-current-week">
            <div class="trainee-current-week-label">{{ t('calendar.currentWeek') }}</div>
            <div class="trainee-month-label">{{ traineeMonthLabel }}</div>
          </div>
          <div class="trainee-week-nav">
            <button type="button" class="btn btn-ghost btn-sm calendar-nav-btn" aria-label="이전 주" @click="goPrevWeek">‹</button>
            <button type="button" class="btn btn-ghost btn-sm calendar-nav-btn" aria-label="다음 주" @click="goNextWeek">›</button>
          </div>
        </div>

        <div class="trainee-weekday-row">
          <div v-for="(name, idx) in dayNames" :key="idx" class="trainee-weekday">{{ name }}</div>
        </div>

        <div class="trainee-day-grid">
          <div
            v-for="day in traineeDayCells"
            :key="day.dateStr"
            class="trainee-day"
            :class="{ today: day.isToday, selected: day.dateStr === selectedDate }"
            @click="selectedDate = day.dateStr"
          >
            <span class="trainee-day-num">{{ day.num }}</span>
            <span v-if="hasScheduleOnDay(day.dateStr)" class="trainee-day-dot" aria-hidden="true"></span>
          </div>
        </div>

        <div class="trainee-upcoming-section">
          <div class="trainee-upcoming-title">{{ t('calendar.upcomingToday') }}</div>

          <div v-if="upcomingEvents.length" class="trainee-upcoming-list">
            <div
              v-for="event in upcomingEvents"
              :key="event.id"
              class="trainee-event-card"
              :class="event.status?.toLowerCase()"
              @click="viewDetails(event)"
            >
              <div class="trainee-dot" aria-hidden="true"></div>
              <div class="trainee-event-content">
                <div class="trainee-event-top">
                  <div class="trainee-event-time">{{ formatTimeRange(event) }}</div>
                  <div class="trainee-status-chip">{{ event.status }}</div>
                </div>

                <div class="trainee-event-title">{{ event.title }}</div>

                <div class="trainee-event-actor">
                  <div class="trainee-avatar" aria-hidden="true">
                    <img
                      v-if="actorAvatarUrl(event)"
                      class="trainee-avatar-img"
                      :src="actorAvatarUrl(event)"
                      alt="Avatar"
                    />
                    <span v-else class="trainee-avatar-fallback">
                      {{ getAvatarInitial(actorDisplayName(event)) }}
                    </span>
                  </div>
                  <div class="trainee-actor-meta">
                    <div class="trainee-actor-label">{{ actorLabel(event) }}</div>
                    <div class="trainee-actor-name">{{ actorDisplayName(event) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="trainee-upcoming-empty">{{ t('calendar.noEvents') }}</div>
        </div>

        <button class="trainee-fab" type="button" @click="showModal('PERSONAL')" aria-label="Add schedule">
          +
        </button>
      </div>
    </template>

    <template v-else>
    <PageHeader :title="headerTitle" :showBack="true" back-url="/home">
      <template #actions>
        <button
          v-if="calendarMode !== 'trainee' && (auth.isTrainer || auth.isSiteAdmin) && (traineeEmail || classId)"
          class="btn btn-primary"
          @click="showModal('PT')"
        >
          {{ classId ? t('calendar.assignClassSession') : t('calendar.assignPTSession') }}
        </button>
      </template>
    </PageHeader>

    <div class="calendar-toolbar">
      <h2 class="calendar-period-title">{{ periodTitle }}</h2>
      <div class="calendar-nav-group">
        <button type="button" class="btn btn-ghost btn-sm calendar-nav-btn" aria-label="이전 주" @click="goPrevWeek">‹</button>
        <button type="button" class="btn btn-ghost btn-sm calendar-today-btn" @click="goToToday">{{ t('calendar.today') }}</button>
        <button type="button" class="btn btn-ghost btn-sm calendar-nav-btn" aria-label="다음 주" @click="goNextWeek">›</button>
      </div>
    </div>
    <p class="calendar-range-hint">{{ weekRangeText }}</p>

    <div class="calendar-table-wrap">
      <table class="calendar-table">
        <thead>
          <tr>
            <th v-for="(name, idx) in dayNames" :key="idx" class="cal-th">{{ name }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIdx) in weekRows" :key="rowIdx">
            <td
              v-for="day in row"
              :key="day.dateStr"
              class="cal-td"
              :class="{ selected: selectedDate === day.dateStr }"
              @click="selectedDate = day.dateStr"
            >
              <div class="day-cell">
                <div class="day-cell-date" :class="{ today: day.isToday }">
                  {{ formatCellDate(day) }}
                </div>
                <div class="day-cell-events">
                  <template v-if="getEventsForDay(day.dateStr).length">
                    <button
                      v-for="event in getEventsForDay(day.dateStr).slice(0, 10)"
                      :key="event.id"
                      type="button"
                      class="event-bar"
                      :class="[event.type.toLowerCase(), event.status?.toLowerCase(), { 'class-event': event.targetType === 'CLASS' }]"
                      @click.stop="viewDetails(event)"
                    >
                      <span class="event-bar-icon">{{ eventIcon(event) }}</span>
                      <span class="event-bar-text">{{ event.title }}</span>
                    </button>
                    <span v-if="getEventsForDay(day.dateStr).length > 10" class="event-more">
                      +{{ getEventsForDay(day.dateStr).length - 10 }}{{ t('calendar.moreCount') }}
                    </span>
                  </template>
                  <span v-else class="day-cell-empty">{{ t('calendar.noEvents') }}</span>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="calendar-footer">
      <button type="button" class="btn btn-ghost" :disabled="!selectedDate" @click="openDaySchedulePopup">
        {{ t('calendar.viewSchedule') }}
      </button>
      <div class="calendar-footer-spacer"></div>
      <button v-if="auth.isTrainee || auth.isTrainer" type="button" class="btn btn-primary" @click="showModal('PERSONAL')">
        {{ t('calendar.logPersonalWorkout') }}
      </button>
    </div>

    <BaseModal
      v-model:is-open="isDayScheduleOpen"
      :title="dayScheduleModalTitle"
      max-width="480px"
    >
      <div v-if="selectedDate" class="day-schedule-list">
        <template v-if="getEventsForDay(selectedDate).length">
          <div
            v-for="event in getEventsForDay(selectedDate)"
            :key="event.id"
            class="day-schedule-item"
            :class="[event.type.toLowerCase(), event.status?.toLowerCase()]"
          >
            <span class="day-schedule-time">{{ event.time || '—' }}</span>
            <span class="day-schedule-title">{{ event.title }}</span>
            <span class="day-schedule-status">{{ formatStatus(event.status) }}</span>
            <button type="button" class="btn btn-ghost btn-sm" @click="closeDayScheduleAndView(event)">{{ t('calendar.openDetails') }}</button>
          </div>
        </template>
        <p v-else class="day-schedule-empty">{{ t('calendar.noEvents') }}</p>
      </div>
      <template #footer>
        <button type="button" class="btn btn-primary btn-sm" @click="isDayScheduleOpen = false">{{ t('calendar.closeLabel') }}</button>
      </template>
    </BaseModal>
    </template>

    <AddScheduleModal 
      v-model:is-open="isAddModalOpen" 
      :schedule-type="scheduleType" 
      :trainee-email="traineeEmail" 
      :class-id="classId"
      @saved="handleSaved" 
    />
    
    <EventDetailsModal 
      v-model:is-open="isDetailsModalOpen" 
      :event="selectedEvent" 
      @updated="handleSaved" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useScheduleStore } from '../stores/scheduleStore'
import { useCalendarPeriod } from '../composables/calendar/useCalendarPeriod'
import type { CalendarEvent } from '../types'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseModal from '../components/ui/BaseModal.vue'
import AddScheduleModal from '../components/calendar/AddScheduleModal.vue'
import EventDetailsModal from '../components/calendar/EventDetailsModal.vue'
import { searchUserByEmail } from '../services/domain/userService'

const auth = useAuthStore()
const scheduleStore = useScheduleStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const calendarMode = (route.meta.calendarMode as string | undefined) || 'mixed'

const {
  dayNames,
  weekRows,
  formatCellDate,
  periodTitle,
  weekRangeText,
  goPrevWeek,
  goNextWeek,
  goToToday
} = useCalendarPeriod(calendarMode === 'trainee' ? 'monday' : 'sunday')

const traineeEmail = computed(() => {
    if (calendarMode === 'trainee') return undefined
    const requested = (route.query.trainee ?? route.query.client) as string | undefined
    if (!requested) return undefined
    return auth.isTrainer || auth.isSiteAdmin ? requested : undefined
})

const classId = computed(() => {
    if (calendarMode === 'trainee') return undefined
    const requested = route.query.classId as string | undefined
    if (!requested) return undefined
    return auth.isTrainer || auth.isTrainee || auth.isSiteAdmin ? requested : undefined
})

const headerTitle = computed(() => {
    if (classId.value) return t('calendar.classSchedule')
    if (traineeEmail.value) return t('calendar.scheduleFor', { email: traineeEmail.value })
    return t('calendar.mySchedule')
})

const isAddModalOpen = ref(false)
const scheduleType = ref<'PT' | 'PERSONAL'>('PERSONAL')

const targetEmail = computed(() => traineeEmail.value || auth.user?.email)
const displayKey = computed(() => classId.value || targetEmail.value || '')
const events = computed(() => scheduleStore.getSchedulesByEmail(displayKey.value))

const selectedEvent = ref<CalendarEvent | null>(null)
const isDetailsModalOpen = ref(false)

const selectedDate = ref<string | null>(null)
const isDayScheduleOpen = ref(false)

const todayDateStr = computed(() => new Date().toISOString().split('T')[0])
const effectiveSelectedDate = computed(() => selectedDate.value || todayDateStr.value)

const traineeDayCells = computed(() => {
  const w1 = weekRows.value?.[0] || []
  const w2 = weekRows.value?.[1] || []
  return [...w1, ...w2]
})

const scheduleDatesSet = computed(() => {
  const set = new Set<string>()
  for (const e of events.value) {
    if (!e.dateStr) continue
    if (e.status === 'CANCELLED' || e.status === 'REJECTED') continue
    set.add(e.dateStr)
  }
  return set
})

function hasScheduleOnDay(dateStr: string): boolean {
  return scheduleDatesSet.value.has(dateStr)
}

const traineeMonthLabel = computed(() => {
  const first = traineeDayCells.value[0]
  if (!first) return ''
  const d = new Date(`${first.dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const upcomingEvents = computed(() => {
  const dateStr = effectiveSelectedDate.value
  return getEventsForDay(dateStr).slice(0, 10)
})

const actorNamesByEmail = ref<Record<string, string>>({})
const actorAvatarsByEmail = ref<Record<string, string>>({})

function actorEmail(event: CalendarEvent): string | undefined {
  if (event.type === 'PT') return event.trainerEmail
  return event.clientEmail
}

function actorLabel(event: CalendarEvent): string {
  // 스티치 UI 기준(영문 라벨)
  if (event.type === 'PT') return 'Trainer'
  return 'Client'
}

function actorDisplayName(event: CalendarEvent): string {
  const email = actorEmail(event)
  if (!email) return ''
  return actorNamesByEmail.value[email] || email
}

function actorAvatarUrl(event: CalendarEvent): string | undefined {
  const email = actorEmail(event)
  if (!email) return undefined
  return actorAvatarsByEmail.value[email]
}

function getAvatarInitial(nameOrEmail: string): string {
  const s = (nameOrEmail || '').trim()
  if (!s) return '?'
  // 이메일이면 로컬파트의 첫 글자 사용
  const first = s.includes('@') ? s.split('@')[0] : s
  return first.slice(0, 1).toUpperCase()
}

function parseHHmm(time?: string): { hh: number; mm: number } | null {
  if (!time) return null
  const [h, m] = time.split(':')
  const hh = Number(h)
  const mm = Number(m)
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
  return { hh, mm }
}

function formatTimeRange(event: CalendarEvent): string {
  if (!event.time) return '—'
  const parsed = parseHHmm(event.time)
  if (!parsed) return event.time

  const start = new Date()
  start.setHours(parsed.hh, parsed.mm, 0, 0)
  // 기본 카드 디자인(90분) 반영
  const end = new Date(start)
  end.setMinutes(end.getMinutes() + 90)

  const startStr = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const endStr = end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `${startStr} – ${endStr}`
}

watch(
  () => Array.from(new Set(upcomingEvents.value.map((e) => actorEmail(e)).filter(Boolean) as string[])),
  async (emails) => {
    const unique = emails.filter((em) => !actorNamesByEmail.value[em])
    if (!unique.length) return
    await Promise.all(
      unique.map(async (email) => {
        try {
          const res = await searchUserByEmail(email)
          if (!res?.data) return
          const data = res.data as Record<string, unknown>
          const nickname =
            (data.nickname as string | undefined) ||
            (data.name as string | undefined) ||
            (data.email as string | undefined)
          if (nickname) actorNamesByEmail.value[email] = nickname
          const profileImageUrl = data.profileImageUrl as string | undefined
          if (profileImageUrl) actorAvatarsByEmail.value[email] = profileImageUrl
        } catch (e) {
          // 이름 로딩 실패해도 카드 자체는 보여줘야 함
          actorNamesByEmail.value[email] = email
        }
      })
    )
  },
  { immediate: true },
)

const dayScheduleModalTitle = computed(() => {
  if (!selectedDate.value) return ''
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  return t('calendar.scheduleForDate', { year: y, month: m, day: d })
})

function openDaySchedulePopup() {
  if (!selectedDate.value) return
  isDayScheduleOpen.value = true
}

function closeDayScheduleAndView(event: CalendarEvent) {
  isDayScheduleOpen.value = false
  viewDetails(event)
}

const loadSchedules = async (force = false) => {
    if (classId.value) {
        await scheduleStore.fetchClassSchedules(classId.value, force)
    } else if (targetEmail.value) {
        await scheduleStore.fetchSchedules(targetEmail.value, force)
    }
}

onMounted(() => {
    if (!selectedDate.value) selectedDate.value = todayDateStr.value
    loadSchedules()
})

watch([traineeEmail, classId], () => {
    loadSchedules()
})

const handleSaved = () => {
    loadSchedules(true)
}

const showModal = (type: 'PT' | 'PERSONAL') => {
    scheduleType.value = type;
    isAddModalOpen.value = true;
}

const viewDetails = (event: CalendarEvent) => {
    selectedEvent.value = event;
    isDetailsModalOpen.value = true;
}

function eventIcon(event: CalendarEvent) {
    if (event.targetType === 'CLASS') return '◆'
    if (event.type === 'PT') return '★'
    return '●'
}

function getEventsForDay(dateStr: string) {
  return events.value
    .filter((e) => e.dateStr === dateStr)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
}

const formatStatus = (status: string) => t(`calendar.status.${status.toLowerCase()}`)
</script>

<style scoped>
.calendar-wrapper {
  padding: 6rem 1rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* ── Trainee Calendar (2주 + Upcoming Today) ───────────────────────── */
.trainee-calendar {
  padding-top: 0.5rem;
  position: relative;
}

.trainee-header-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.trainee-current-week-label {
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  text-transform: uppercase;
}

.trainee-month-label {
  margin-top: 0.15rem;
  font-size: 1.8rem;
  font-weight: 900;
}

.trainee-week-nav {
  display: flex;
  gap: 0.5rem;
}

.trainee-weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.trainee-weekday {
  font-size: 0.75rem;
  font-weight: 900;
  color: var(--text-muted);
  text-align: center;
}

.trainee-day-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.65rem;
  margin-bottom: 1.25rem;
}

.trainee-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 2.8rem;
  border-radius: 999px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  gap: 0.22rem;
  padding-top: 0.15rem;
}

.trainee-day:hover {
  transform: translateY(-1px);
  background: rgba(94, 53, 177, 0.08);
}

.trainee-day.selected {
  border-color: rgba(94, 53, 177, 0.65);
  background: rgba(94, 53, 177, 0.15);
}

.trainee-day.today {
  border-color: rgba(94, 53, 177, 0.65);
  background: rgba(94, 53, 177, 0.22);
}

.trainee-day-num {
  font-weight: 900;
  font-size: 0.9rem;
  color: var(--text-main);
}

.trainee-day-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(94, 53, 177, 0.95);
}

/* 선택된 날짜의 도트는 오늘/선택과 덜 헷갈리도록 흰색 계열로 */
.trainee-day.selected .trainee-day-dot {
  background: rgba(255, 255, 255, 0.95);
}

.trainee-upcoming-section {
  margin-top: 0.2rem;
}

.trainee-upcoming-title {
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 0.75rem;
  text-align: center;
}

.trainee-upcoming-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative;
  padding-left: 1.35rem;
}

.trainee-upcoming-list::before {
  content: '';
  position: absolute;
  left: 0.25rem;
  top: 0.1rem;
  bottom: 0.1rem;
  width: 2px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
}

.trainee-upcoming-empty {
  padding: 1.25rem 0;
  text-align: center;
  color: var(--text-muted);
  font-weight: 800;
  background: rgba(0, 0, 0, 0.04);
  border: 1px dashed var(--border);
  border-radius: 1rem;
}

.trainee-event-card {
  padding: 1rem 1.1rem;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  display: flex;
  align-items: stretch;
  gap: 0.85rem;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
}

.trainee-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(94, 53, 177, 0.95);
  margin-left: -0.1rem;
  margin-top: 1.1rem;
  flex-shrink: 0;
  box-shadow: 0 0 0 4px rgba(94, 53, 177, 0.12);
}

.trainee-event-card.pending .trainee-dot {
  background: rgba(148, 163, 184, 0.75);
  box-shadow: 0 0 0 4px rgba(148, 163, 184, 0.12);
}

.trainee-event-content {
  flex: 1;
  min-width: 0;
}

.trainee-event-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.trainee-event-time {
  font-size: 0.85rem;
  font-weight: 900;
  color: var(--text-muted);
}

.trainee-status-chip {
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 900;
  color: #fff;
  background: rgba(94, 53, 177, 0.62);
}

.trainee-event-card.pending .trainee-status-chip {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.trainee-event-title {
  margin-top: 0.55rem;
  font-size: 1.25rem;
  font-weight: 950;
}

.trainee-event-actor {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.trainee-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(94, 53, 177, 0.16);
  border: 1px solid rgba(94, 53, 177, 0.22);
  color: rgba(255, 255, 255, 0.95);
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.trainee-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.trainee-avatar-fallback {
  font-size: 0.95rem;
}

.trainee-actor-meta {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.trainee-actor-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--text-muted);
}

.trainee-actor-name {
  font-size: 0.95rem;
  font-weight: 950;
}

.trainee-fab {
  position: fixed;
  right: 1.25rem;
  bottom: 1.75rem;
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 999px;
  background: var(--primary);
  color: white;
  font-size: 2rem;
  font-weight: 900;
  box-shadow: 0 10px 30px rgba(94, 53, 177, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}
.calendar-period-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #1a1a1a);
}
.calendar-nav-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.calendar-nav-btn {
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  line-height: 1;
  border-radius: 0.5rem;
}
.calendar-today-btn {
  min-width: 4rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 0.5rem;
}
.calendar-range-hint {
  margin: 0 0 1rem 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.calendar-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 1rem;
  padding: 0 0.25rem;
}
.calendar-footer-spacer { flex: 1; }

.calendar-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--bg);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.calendar-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 400px;
}
.calendar-table th,
.calendar-table td {
  border: 1px solid var(--border);
  vertical-align: top;
}
.cal-th {
  padding: 0.5rem 0.25rem;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  background: rgba(0, 0, 0, 0.02);
}
/* 기본 5개 일정이 보이도록 셀 높이 */
.cal-td {
  padding: 0;
  min-height: 11.5rem;
  cursor: pointer;
  transition: background 0.15s;
}
.cal-td:hover { background: rgba(94, 53, 177, 0.04); }
.cal-td.selected { background: rgba(94, 53, 177, 0.12); outline: 2px solid var(--primary); outline-offset: -2px; }

.day-cell {
  padding: 0.4rem 0.35rem;
  min-height: 11.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.day-cell-date {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
  flex-shrink: 0;
}
.day-cell-date.today {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: #e53935;
  color: white;
  font-size: 0.85rem;
}
.day-cell-events {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-height: 9.5rem;
  max-height: 20rem;
  overflow-y: auto;
}
.day-cell-empty {
  font-size: 0.7rem;
  color: var(--text-muted);
}

/* 이벤트 바: 이미지처럼 가로 막대 + 아이콘 + 텍스트 */
.event-bar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  padding: 0.25rem 0.4rem;
  border: none;
  border-radius: 0.35rem;
  font-size: 0.7rem;
  text-align: left;
  cursor: pointer;
  transition: opacity 0.2s;
  background: rgba(192, 132, 252, 0.2);
  color: #5e35b1;
}
.event-bar:hover { opacity: 0.9; }
.event-bar-icon {
  flex-shrink: 0;
  font-size: 0.65rem;
  line-height: 1;
}
.event-bar-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
.event-bar.pt {
  background: rgba(156, 39, 176, 0.18);
  color: #6a1b9a;
}
.event-bar.pt .event-bar-icon { color: #7b1fa2; }
.event-bar.personal {
  background: rgba(33, 150, 243, 0.18);
  color: #1565c0;
}
.event-bar.personal .event-bar-icon { color: #1976d2; }
.event-bar.class-event {
  background: rgba(192, 132, 252, 0.22);
  color: #4a148c;
}
.event-bar.rejected {
  background: rgba(244, 67, 54, 0.15);
  color: #c62828;
  text-decoration: line-through;
}
.event-bar.completed {
  background: rgba(76, 175, 80, 0.18);
  color: #2e7d32;
}
.event-more {
  font-size: 0.65rem;
  color: var(--text-muted);
  padding-left: 0.2rem;
}

.day-schedule-list { padding: 0.25rem 0; }
.day-schedule-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.6rem 0.5rem;
  border-radius: 0.5rem;
  margin-bottom: 0.35rem;
  background: rgba(0, 0, 0, 0.03);
  border-left: 3px solid var(--primary);
}
.day-schedule-item.pt { border-left-color: #7b1fa2; background: rgba(156, 39, 176, 0.08); }
.day-schedule-item.personal { border-left-color: #1976d2; background: rgba(33, 150, 243, 0.08); }
.day-schedule-item.rejected { opacity: 0.7; border-left-color: #c62828; }
.day-schedule-time { font-size: 0.8rem; font-weight: 600; min-width: 3rem; color: var(--text-muted); }
.day-schedule-title { flex: 1; font-weight: 500; font-size: 0.9rem; }
.day-schedule-status { font-size: 0.75rem; color: var(--text-muted); }
.day-schedule-empty { margin: 0; padding: 1rem 0; text-align: center; color: var(--text-muted); font-size: 0.9rem; }

@media (min-width: 641px) {
  .cal-td { min-height: 12.5rem; }
  .day-cell { min-height: 12.5rem; }
  .day-cell-events { min-height: 10rem; max-height: 22rem; }
}

@media (min-width: 1025px) {
  .calendar-wrapper { padding: 6rem 2rem 3rem; }
  .calendar-table { min-width: 700px; }
  .cal-td { min-height: 13rem; }
  .day-cell { min-height: 13rem; padding: 0.5rem 0.4rem; }
  .day-cell-events { min-height: 10.5rem; max-height: 24rem; }
  .day-cell-date { font-size: 0.85rem; }
  .event-bar { font-size: 0.72rem; padding: 0.3rem 0.45rem; }
}
</style>
