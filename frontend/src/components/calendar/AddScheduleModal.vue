<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content glass">
      <h3>{{ scheduleType === 'PT' ? 'Assign PT Session' : 'Log Personal Workout' }}</h3>
      
      <form @submit.prevent="save">
        <div v-if="auth.isTrainer && clientEmail && scheduleType === 'PT'" class="field row">
            <span class="sm-text">Client: {{ clientEmail }}</span>
        </div>
        
        <div class="field">
            <label>Title <span class="danger">*</span></label>
            <input type="text" v-model="form.title" required placeholder="e.g. Full Body Workout">
        </div>
        
        <div class="field row">
            <div style="flex:1">
                <label>Date <span class="danger">*</span></label>
                <input type="date" v-model="form.date" required>
            </div>
            <div style="flex:1">
                <label>Time <span class="danger">*</span></label>
                <input type="time" v-model="form.time" required>
            </div>
        </div>

        <div class="field">
            <label>Notes</label>
            <textarea v-model="form.notes" rows="3" placeholder="Condition, target areas, etc."></textarea>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="close" :disabled="saving">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">Save</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { addSchedule } from '../../services/firebaseService'

const props = defineProps<{
  isOpen: boolean;
  scheduleType: 'PT' | 'PERSONAL';
  clientEmail?: string;
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', val: boolean): void;
  (e: 'saved'): void;
}>()

const auth = useAuthStore()

const saving = ref(false)
const form = ref({
    date: new Date().toISOString().split('T')[0],
    time: '18:00',
    title: '',
    notes: ''
})

watch(() => props.isOpen, (val) => {
  if (val) {
    form.value = {
      date: new Date().toISOString().split('T')[0],
      time: '18:00',
      title: '',
      notes: ''
    }
  }
})

const close = () => {
  emit('update:isOpen', false)
}

const save = async () => {
  saving.value = true;
  try {
      const scheduleData = {
          userEmail: props.clientEmail || auth.user?.email, 
          trainerEmail: props.scheduleType === 'PT' ? auth.user?.email : null,
          type: props.scheduleType,
          date: form.value.date,
          time: form.value.time,
          title: form.value.title,
          notes: form.value.notes,
          status: props.scheduleType === 'PT' && props.clientEmail ? 'PENDING' : 'APPROVED'
      };
      
      await addSchedule(scheduleData);
      emit('saved');
      close();
  } catch(e: any) {
      alert(e.message)
  } finally {
      saving.value = false;
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex; justify-content: center; align-items: center;
  z-index: 1000; backdrop-filter: blur(5px);
}
.modal-content { padding: 2rem; width: 90%; max-width: 500px; }
.field.row { display: flex; gap: 1rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
.danger { color: #f43f5e; }
.sm-text { font-size: 0.8rem; color: var(--text-muted); }
</style>
