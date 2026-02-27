<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content glass">
      <h3>{{ scheduleType === 'PT' ? t('scheduleModal.addPT') : t('scheduleModal.addPersonal') }}</h3>
      
      <form @submit.prevent="save">
        <div v-if="auth.isTrainer && scheduleType === 'PT'" class="field row">
            <span v-if="clientEmail" class="sm-text">{{ t('eventDetails.client') }}: {{ clientEmail }}</span>
            <span v-if="classId" class="sm-text badge">{{ t('calendar.classBadge') }}</span>
        </div>
        
        <div class="field">
            <label>{{ t('scheduleModal.title') }} <span class="danger">*</span></label>
            <input type="text" v-model="form.title" required :placeholder="t('scheduleModal.titlePlaceholder')">
        </div>
        
        <div class="field row">
            <div style="flex:1">
                <label>{{ t('scheduleModal.date') }} <span class="danger">*</span></label>
                <input type="date" v-model="form.date" required>
            </div>
            <div style="flex:1">
                <label>{{ t('scheduleModal.time') }} <span class="danger">*</span></label>
                <input type="time" v-model="form.time" required>
            </div>
        </div>

        <div class="field">
            <label>{{ t('eventDetails.notes') }}</label>
            <textarea v-model="form.notes" rows="3" :placeholder="t('scheduleModal.notesPlaceholder')"></textarea>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="close" :disabled="saving">{{ t('scheduleModal.cancel') }}</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">{{ t('scheduleModal.save') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { addSchedule } from '../../services/firebaseService'
import { DEFAULT_SCHEDULE_TIME } from '../../constants/schedule'
import { useUIStore } from '../../stores/uiStore'
import { extractErrorMessage } from '../../utils/error'
import { notifyScheduleEvent } from '../../utils/notification'

const props = defineProps<{
  isOpen: boolean;
  scheduleType: 'PT' | 'PERSONAL';
  clientEmail?: string;
  classId?: string;
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', val: boolean): void;
  (e: 'saved'): void;
}>()

const auth = useAuthStore()
const ui = useUIStore()
const { t } = useI18n()

const saving = ref(false)
const form = ref({
    date: new Date().toISOString().split('T')[0],
    time: DEFAULT_SCHEDULE_TIME,
    title: '',
    notes: ''
})

watch(() => props.isOpen, (val) => {
  if (val) {
    form.value = {
      date: new Date().toISOString().split('T')[0],
      time: DEFAULT_SCHEDULE_TIME,
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
      const scheduleData: any = {
          trainerEmail: props.scheduleType === 'PT' ? auth.user?.email : null,
          type: props.scheduleType,
          targetType: props.classId ? 'CLASS' : 'INDIVIDUAL',
          date: form.value.date,
          time: form.value.time,
          title: form.value.title,
          notes: form.value.notes,
          status: props.scheduleType === 'PT' ? 'PENDING' : 'APPROVED'
      };

      if (props.classId) {
          scheduleData.classId = props.classId;
          // For class schedules, userEmail isn't a single person, 
          // but we might store the trainer's email as owner.
          scheduleData.userEmail = auth.user?.email; 
      } else {
          scheduleData.clientEmail = props.clientEmail;
          scheduleData.userEmail = props.clientEmail || auth.user?.email;
      }
      
      await addSchedule(scheduleData);
      await notifyScheduleEvent(
        t('notification.scheduleCreatedTitle'),
        t('notification.scheduleCreatedBody', { title: form.value.title, date: form.value.date })
      )
      ui.showToast(t('scheduleModal.saveSuccess'), 'success')
      emit('saved');
      close();
  } catch(e: unknown) {
      ui.showToast(extractErrorMessage(e, t('scheduleModal.saveFailed')), 'error')
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

@media (max-width: 768px) {
  .modal-content {
    padding: 1rem;
    width: 94%;
  }
  .field.row {
    flex-direction: column;
    gap: 0.6rem;
  }
}
</style>
