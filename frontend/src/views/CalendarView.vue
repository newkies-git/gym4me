<template>
  <div class="calendar-wrapper container">
    <PageHeader :title="headerTitle">
      <template #actions>
        <button v-if="auth.isTrainer && (clientEmail || classId)" class="btn btn-primary" @click="showModal('PT')">
          {{ classId ? t('calendar.assignClassSession') : t('calendar.assignPTSession') }}
        </button>
        <button class="btn btn-ghost" @click="router.push('/dashboard')">{{ t('calendar.back') }}</button>
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
      <button v-if="auth.isMember || auth.isTrainer" type="button" class="btn btn-primary" @click="showModal('PERSONAL')">
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

    <AddScheduleModal 
      v-model:is-open="isAddModalOpen" 
      :schedule-type="scheduleType" 
      :client-email="clientEmail" 
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
import type { CalendarEvent } from '../types'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseModal from '../components/ui/BaseModal.vue'
import AddScheduleModal from '../components/calendar/AddScheduleModal.vue'
import EventDetailsModal from '../components/calendar/EventDetailsModal.vue'

const auth = useAuthStore()
const scheduleStore = useScheduleStore()
const route = useRoute()
const router = useRouter()
const { t, tm } = useI18n()

const clientEmail = computed(() => {
    const requested = route.query.client as string | undefined
    if (!requested) return undefined
    return auth.isTrainer || auth.isSiteAdmin ? requested : undefined
})

const classId = computed(() => {
    const requested = route.query.classId as string | undefined
    if (!requested) return undefined
    return auth.isTrainer || auth.isMember || auth.isSiteAdmin ? requested : undefined
})

const headerTitle = computed(() => {
    if (classId.value) return t('calendar.classSchedule')
    if (clientEmail.value) return t('calendar.scheduleFor', { email: clientEmail.value })
    return t('calendar.mySchedule')
})

const isAddModalOpen = ref(false)
const scheduleType = ref<'PT' | 'PERSONAL'>('PERSONAL')

const targetEmail = computed(() => clientEmail.value || auth.user?.email)
const displayKey = computed(() => classId.value || targetEmail.value || '')
const events = computed(() => scheduleStore.getSchedulesByEmail(displayKey.value))

const selectedEvent = ref<CalendarEvent | null>(null)
const isDetailsModalOpen = ref(false)

const selectedDate = ref<string | null>(null)
const isDayScheduleOpen = ref(false)

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
    loadSchedules()
})

watch([clientEmail, classId], () => {
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

// Calendar: 2주간(14일) 일정
const today = new Date()
const getSunday = (d: Date) => {
    const x = new Date(d)
    x.setDate(d.getDate() - d.getDay())
    return x
}
const currentPeriodStart = ref(getSunday(today))

const dayNames = computed(() => (tm('calendar.dayNames') as string[]).slice(0, 7))

const weekDays = computed(() => {
    const days = []
    const names = tm('calendar.dayNames') as string[]
    const start = currentPeriodStart.value
    const todayStr = today.toISOString().split('T')[0]

    for (let i = 0; i < 14; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        const dateStr = d.toISOString().split('T')[0]
        days.push({
            name: names[d.getDay()],
            num: d.getDate(),
            month: d.getMonth() + 1,
            dateStr,
            isToday: dateStr === todayStr
        })
    }
    return days
})

const weekRows = computed(() => {
    const list = weekDays.value
    return [list.slice(0, 7), list.slice(7, 14)]
})

function formatCellDate(day: { num: number; month: number; dateStr: string }) {
    const start = currentPeriodStart.value
    const isFirstDay = day.dateStr === start.toISOString().split('T')[0]
    if (isFirstDay) return `${day.month}${t('calendar.monthShort')} ${day.num}${t('calendar.dayShort')}`
    return `${day.num}${t('calendar.dayShort')}`
}

function eventIcon(event: CalendarEvent) {
    if (event.targetType === 'CLASS') return '◆'
    if (event.type === 'PT') return '★'
    return '●'
}

const periodTitle = computed(() => {
    const start = currentPeriodStart.value
    return t('calendar.yearMonth', { year: start.getFullYear(), month: start.getMonth() + 1 })
})

const weekRangeText = computed(() => {
    const start = currentPeriodStart.value
    const end = new Date(start)
    end.setDate(start.getDate() + 13)
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
    return `${fmt(start)} ~ ${fmt(end)} ${t('calendar.twoWeeksLabel')}`
})

function goPrevWeek() {
    const d = new Date(currentPeriodStart.value)
    d.setDate(d.getDate() - 7)
    currentPeriodStart.value = d
}

function goNextWeek() {
    const d = new Date(currentPeriodStart.value)
    d.setDate(d.getDate() + 7)
    currentPeriodStart.value = d
}

function goToToday() {
    currentPeriodStart.value = getSunday(today)
}

const getEventsForDay = (dateStr: string) => {
  return events.value.filter(e => e.dateStr === dateStr).sort((a,b) => a.time.localeCompare(b.time))
}

const formatStatus = (status: string) => t(`calendar.status.${status.toLowerCase()}`)
</script>

<style scoped>
.calendar-wrapper {
  padding: 6rem 1rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
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
