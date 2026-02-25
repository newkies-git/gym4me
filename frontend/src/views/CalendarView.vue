<template>
  <div class="calendar-wrapper container">
    <div class="header">
      <h2>{{ clientEmail ? `Schedule for ${clientEmail}` : 'My Training Schedule' }}</h2>
      <div class="actions">
        <!-- Trainer Action -->
        <button v-if="auth.isTrainer && clientEmail" class="btn btn-primary" @click="showModal('PT')">Assign PT Session</button>
        <!-- Member Action (Only for Members or Trainers) -->
        <button v-if="auth.isMember || auth.isTrainer" class="btn btn-ghost" @click="showModal('PERSONAL')">Log Personal Workout</button>
        <!-- Back to Dashboard for Trainer -->
        <button v-if="clientEmail" class="btn btn-ghost" @click="router.push('/dashboard')">Back</button>
      </div>
    </div>
    
    <div class="calendar-grid glass">
      <div class="day-col" v-for="day in weekDays" :key="day.dateStr">
        <div class="day-header" :class="{ today: day.isToday }">
          <div class="day-name">{{ day.name }}</div>
          <div class="day-num">{{ day.num }}</div>
        </div>
        <div class="events">
          <div v-for="event in getEventsForDay(day.dateStr)" :key="event.id" class="event-card" :class="event.type.toLowerCase()">
            <div class="event-time" v-if="event.time">{{ event.time }}</div>
            <div class="event-title">{{ event.title }}</div>
            <div class="event-status">{{ event.status }}</div>
            <button class="btn btn-sm" style="margin-top:0.5rem; width:100%; border:1px solid currentColor" @click="viewDetails(event)">Open Details</button>
          </div>
        </div>
      </div>
    </div>

    <AddScheduleModal 
      v-model:is-open="isAddModalOpen" 
      :schedule-type="scheduleType" 
      :client-email="clientEmail" 
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
import { useAuthStore } from '../stores/auth'
import { useScheduleStore } from '../stores/scheduleStore'
import type { CalendarEvent } from '../types'
import AddScheduleModal from '../components/calendar/AddScheduleModal.vue'
import EventDetailsModal from '../components/calendar/EventDetailsModal.vue'

const auth = useAuthStore()
const scheduleStore = useScheduleStore()
const route = useRoute()
const router = useRouter()

const clientEmail = computed(() => route.query.client as string | undefined)

const isAddModalOpen = ref(false)
const scheduleType = ref<'PT' | 'PERSONAL'>('PERSONAL')

const targetEmail = computed(() => clientEmail.value || auth.user?.email)
const events = computed(() => scheduleStore.getSchedulesByEmail(targetEmail.value || ''))

const selectedEvent = ref<CalendarEvent | null>(null)
const isDetailsModalOpen = ref(false)

const loadSchedules = async (force = false) => {
    if (!targetEmail.value) return;
    await scheduleStore.fetchSchedules(targetEmail.value, force)
}

onMounted(() => {
    loadSchedules()
})

watch(clientEmail, () => {
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
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
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
.event-title { font-weight: 600; margin-bottom: 0.2rem; }
.event-status { font-size: 0.7rem; opacity: 0.8; }
.btn-sm { font-size: 0.7rem; padding: 0.2rem 0.5rem; background: rgba(0,0,0,0.1); }
</style>
