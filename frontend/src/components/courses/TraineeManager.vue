<template>
  <div class="trainer-section glass" style="margin-bottom: 2rem;">
    <h3>{{ t('traineeMgr.myTrainees') }}</h3>
    
    <div class="add-trainee-form">
      <input type="email" v-model="searchEmail" :placeholder="t('traineeMgr.searchPlaceholder')" @keyup.enter="searchTrainee">
      <button class="btn btn-primary" @click="searchTrainee" :disabled="loading">{{ t('traineeMgr.searchAndAdd') }}</button>
    </div>
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

    <ul class="trainee-list">
      <li v-for="trainee in trainees" :key="trainee.uid" class="trainee-item">
        <div class="trainee-info">
          <strong style="display: flex; align-items: center; gap: 0.5rem;">
              {{ trainee.nickname || extractName(trainee.email) }}
              <span v-if="trainee.remainingSessions !== undefined && trainee.remainingSessions <= 5" class="badge danger" :title="t('traineeMgr.lowSessionsTitle')">⚠️ {{ t('traineeMgr.lowSessionsLeft', { n: trainee.remainingSessions }) }}</span>
              <span v-if="isExpiringSoon(trainee.expirationDate)" class="badge danger" :title="t('traineeMgr.expiringSoonTitle')">⚠️ {{ t('traineeMgr.expiringShort') }}</span>
          </strong>
          <span class="sm-text">{{ trainee.email }}</span>
          <span class="sm-text mt-1" v-if="trainee.remainingSessions !== undefined">{{ t('traineeMgr.membershipLine', { sessions: trainee.remainingSessions, expiration: trainee.expirationDate || t('common.na') }) }}</span>
        </div>
        <div class="trainee-actions">
            <button class="btn btn-ghost btn-sm" @click="openSessionModal(trainee)">{{ t('traineeMgr.editPt') }}</button>
            <button class="btn btn-ghost btn-sm" @click="viewTraineeSchedule(trainee)">{{ t('traineeMgr.viewCalendar') }}</button>
            <button class="btn btn-ghost btn-sm" @click="router.push(`/profile?trainee=${trainee.email}`)">{{ t('traineeMgr.profile') }}</button>
        </div>
      </li>
      <li v-if="trainees.length === 0" class="empty-state">{{ t('traineeMgr.noTrainees') }}</li>
    </ul>

    <!-- Edit Session Modal -->
    <BaseModal v-model:isOpen="isSessionModalOpen" :title="t('traineeMgr.editMembershipTitle')" max-width="400px">
      <p class="sm-text" style="margin-bottom: 1rem;">{{ t('eventDetails.trainee') }}: {{ selectedTrainee?.email }}</p>
      <div class="field">
          <label>{{ t('traineeMgr.remainingSessionsLabel') }}</label>
          <input type="number" v-model.number="editSessionForm.remaining" min="0">
      </div>
      <div class="field">
          <label>{{ t('traineeMgr.expirationDateLabel') }}</label>
          <input type="date" v-model="editSessionForm.expiration">
      </div>
      <template #footer>
          <button class="btn btn-ghost" @click="isSessionModalOpen = false">{{ t('common.cancel') }}</button>
          <button class="btn btn-primary" @click="saveSessionUpdates" :disabled="savingSessions">{{ t('common.save') }}</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useTraineeStore } from '../../stores/traineeStore'
import { logTicketHistory } from '../../services/firebaseService'
import type { TraineeInfo } from '../../types'
import BaseModal from '../ui/BaseModal.vue'

const auth = useAuthStore()
const traineeStore = useTraineeStore()
const router = useRouter()
const { t } = useI18n()

const searchEmail = ref('')
const loading = computed(() => traineeStore.loading)
const errorMsg = ref('')

const trainees = computed(() => traineeStore.trainees)

onMounted(async () => {
    await traineeStore.fetchTrainees()
})

const searchTrainee = async () => {
  if (!searchEmail.value) return;
  errorMsg.value = '';
  
  try {
    await traineeStore.addTraineeByEmail(searchEmail.value.trim());
    searchEmail.value = '';
    alert(t('traineeMgr.addSuccess'));
  } catch(e: any) {
    errorMsg.value = e.message;
  }
}

const extractName = (email: string) => email.split('@')[0]

const isExpiringSoon = (dateStr?: string) => {
  if (!dateStr) return false;
  const expDate = new Date(dateStr);
  const inTwoWeeks = new Date();
  inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
  return expDate < inTwoWeeks && expDate >= new Date();
}

const viewTraineeSchedule = (trainee: TraineeInfo) => {
  router.push(`/calendar/trainer?trainee=${trainee.email}`)
}

// Session Editing
const isSessionModalOpen = ref(false)
const savingSessions = ref(false)
const selectedTrainee = ref<TraineeInfo | null>(null)
const editSessionForm = ref({ remaining: 0, expiration: '' })

const openSessionModal = (trainee: TraineeInfo) => {
  selectedTrainee.value = trainee;
  editSessionForm.value.remaining = trainee.remainingSessions || 0;
  editSessionForm.value.expiration = trainee.expirationDate || '';
  isSessionModalOpen.value = true;
}

const saveSessionUpdates = async () => {
  if(!selectedTrainee.value) return;
  savingSessions.value = true;
  try {
      const oldRemaining = selectedTrainee.value.remainingSessions || 0;
      const newRemaining = editSessionForm.value.remaining;
      const diff = newRemaining - oldRemaining;
      
      await traineeStore.updateSessions(
          selectedTrainee.value.uid, 
          newRemaining, 
          editSessionForm.value.expiration
      );
      
      await logTicketHistory({
          memberUid: selectedTrainee.value.uid,
          registrantEmail: auth.user?.email,
          action: diff > 0 ? 'ADD' : (diff < 0 ? 'REDUCE' : 'EXPIRE'),
          amountChanged: diff,
          newTotal: newRemaining,
          newExpirationDate: editSessionForm.value.expiration
      });

      isSessionModalOpen.value = false;
  } catch(e: any) {
      alert(t('common.errorWithMessage', { msg: e.message }))
  } finally {
      savingSessions.value = false;
  }
}
</script>

<style scoped>
.trainer-section { padding: 2rem; border-radius: 1rem; }
.trainer-section h3 { margin-bottom: 1.5rem; }

.add-trainee-form { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1rem; }
.add-trainee-form input {
  flex: 1;
  padding: 0.75rem;
}
.error { color: var(--accent); font-size: 0.9rem; margin-bottom: 1rem; }

.trainee-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.trainee-item { 
  display: flex; flex-direction: column; align-items: stretch; gap: 1rem;
  padding: 1rem; background: var(--bg-card); border-radius: 0.5rem; 
  border: 1px solid var(--border);
}
.trainee-info { display: flex; flex-direction: column; }
.sm-text { font-size: 0.8rem; color: var(--text-muted); }
.empty-state { color: var(--text-muted); font-style: italic; padding: 1rem 0; }
.btn-sm { padding: 0.4rem 0.8rem; font-size: 0.8rem; }
.trainee-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.badge { font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 1rem; color: white; margin-left: 0.5rem; }
.badge.danger { background: #f43f5e; box-shadow: 0 0 10px rgba(244, 63, 94, 0.2); }

@media (min-width: 641px) {
  .add-trainee-form { flex-direction: row; }
  .trainee-item { flex-direction: row; justify-content: space-between; align-items: center; }
  .trainee-actions { flex-wrap: nowrap; }
}

.field { margin-bottom: 1.5rem; }
.field label { display: block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem; font-weight: 600; }
</style>
