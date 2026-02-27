<template>
  <div class="calendar-wrapper container">
    <div class="header">
      <h2>{{ headerTitle }}</h2>
      <div class="actions">
        <!-- Trainer Action -->
        <button v-if="auth.isTrainer && (clientEmail || classId)" class="btn btn-primary" @click="showModal('PT')">
          {{ classId ? t('calendar.assignClassSession') : t('calendar.assignPTSession') }}
        </button>
        <!-- Member Action (Only for Members or Trainers) -->
        <button v-if="auth.isMember || auth.isTrainer" class="btn btn-ghost" @click="showModal('PERSONAL')">{{ t('calendar.logPersonalWorkout') }}</button>
        <!-- Back to Dashboard -->
        <button class="btn btn-ghost" @click="router.push('/dashboard')">{{ t('calendar.back') }}</button>
      </div>
    </div>
    
    <div class="calendar-grid glass">
      <div class="day-col" v-for="day in weekDays" :key="day.dateStr">
        <div class="day-header" :class="{ today: day.isToday }">
          <div class="day-name">{{ day.name }}</div>
          <div class="day-num">{{ day.num }}</div>
        </div>
        <div class="events">
          <div v-for="event in getEventsForDay(day.dateStr)" :key="event.id" class="event-card" :class="[event.type.toLowerCase(), { 'class-event': event.targetType === 'CLASS' }]">
            <div class="event-time" v-if="event.time">{{ event.time }}</div>
            <div class="event-title">
              <span v-if="event.targetType === 'CLASS'" class="badge-mini">{{ t('calendar.classBadge') }}</span>
              {{ event.title }}
            </div>
            <div class="event-status">{{ formatStatus(event.status) }}</div>
            <button class="btn btn-sm" style="margin-top:0.5rem; width:100%; border:1px solid currentColor" @click="viewDetails(event)">{{ t('calendar.openDetails') }}</button>
          </div>
        </div>
      </div>
    </div>

    <AddScheduleModal 
      v-model:is-open="isAddModalOpen" 
      :schedule-type="scheduleType" 
      :client-email="clientEmail" 
      :class-id="classId"
      @saved="loadSchedules" 
    />
    
    <EventDetailsModal 
      v-model:is-open="isDetailsModalOpen" 
      :event="selectedEvent" 
      @updated="loadSchedules" 
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

// Calendar Generator Logic
const today = new Date();
const currentWeekStart = new Date(today);
// Set to Sunday
currentWeekStart.setDate(today.getDate() - today.getDay());

const weekDays = computed(() => {
    const days = [];
    const dayNames = tm('calendar.dayNames') as string[]
    
    for(let i=0; i<7; i++) {
        const d = new Date(currentWeekStart);
        d.setDate(currentWeekStart.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        
        days.push({
            name: dayNames[i],
            num: d.getDate(),
            dateStr: dateStr,
            isToday: dateStr === today.toISOString().split('T')[0]
        })
    }
    return days;
})

const getEventsForDay = (dateStr: string) => {
  return events.value.filter(e => e.dateStr === dateStr).sort((a,b) => a.time.localeCompare(b.time))
}

const formatStatus = (status: string) => t(`calendar.status.${status.toLowerCase()}`)
</script>

<style scoped>
.calendar-wrapper { padding: 3rem 2rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.actions { display: flex; gap: 1rem; }
.calendar-grid { 
  display: grid; 
  grid-template-columns: repeat(7, 1fr); 
  gap: 1px; 
  background: var(--border);
  border-radius: 1rem;
  overflow: hidden;
}
.day-col { background: var(--bg); min-height: 400px; display: flex; flex-direction: column; }
.day-header { padding: 1rem; text-align: center; border-bottom: 1px solid var(--border); }
.day-header.today { background: rgba(99, 102, 241, 0.1); color: var(--primary); font-weight: bold; }
.day-name { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.2rem; }
.day-num { font-size: 1.5rem; }
.events { padding: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; overflow-y: auto; }
.event-card { 
  padding: 0.5rem; 
  border-radius: 0.5rem; 
  font-size: 0.8rem;
  backdrop-filter: blur(10px);
}
.event-card.pt { background: rgba(192, 132, 252, 0.2); border-left: 3px solid #c084fc; }
.event-card.personal { background: rgba(99, 102, 241, 0.2); border-left: 3px solid #6366f1; }
.event-card.class-event { 
    background: repeating-linear-gradient(
        45deg,
        rgba(192, 132, 252, 0.1),
        rgba(192, 132, 252, 0.1) 10px,
        rgba(192, 132, 252, 0.2) 10px,
        rgba(192, 132, 252, 0.2) 20px
    );
    border-left: 3px solid #c084fc;
}
.badge-mini {
    font-size: 0.6rem;
    padding: 0.1rem 0.3rem;
    background: #c084fc;
    color: white;
    border-radius: 4px;
    margin-right: 0.4rem;
    vertical-align: middle;
}
.event-title { font-weight: 600; margin-bottom: 0.2rem; display: flex; align-items: center; }
.event-status { font-size: 0.7rem; opacity: 0.8; }
.btn-sm { font-size: 0.7rem; padding: 0.2rem 0.5rem; background: rgba(0,0,0,0.1); }

@media (max-width: 1024px) {
  .calendar-wrapper { padding: 1.2rem 0.4rem; }
  .header { flex-direction: column; align-items: stretch; gap: 0.8rem; }
  .actions { flex-wrap: wrap; gap: 0.6rem; }
  .calendar-grid { grid-template-columns: repeat(2, 1fr); }
  .day-col { min-height: 280px; }
}

@media (max-width: 640px) {
  .calendar-grid { grid-template-columns: 1fr; }
  .day-header { padding: 0.7rem; }
  .day-num { font-size: 1.1rem; }
}
</style>
