<template>
  <div v-if="event && isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content glass details-modal">
      <div class="details-header">
        <h3 class="details-title">{{ event.title }}</h3>
        <span v-if="event.targetType === 'CLASS'" class="details-badge class">{{ t('calendar.classBadge') }}</span>
      </div>
      <div class="details-meta">
        <span class="details-meta-chip">{{ event.dateStr }}</span>
        <span class="details-meta-chip">{{ event.time }}</span>
        <span class="details-meta-chip status" :class="event.status.toLowerCase()">{{ t(`calendar.status.${event.status.toLowerCase()}`) }}</span>
      </div>
      
      <div v-if="event.notes" style="margin-top: 1rem; margin-bottom: 2rem;">
          <strong>{{ t('eventDetails.notes') }}:</strong> <p>{{ event.notes }}</p>
      </div>

      <div v-if="event.targetType === 'CLASS' && event.classId" style="margin-bottom: 2rem;">
          <strong>{{ t('eventDetails.classTrainees') }}:</strong>
          <div v-if="loadingClassInfo" class="sm-text">{{ t('eventDetails.loadingGroupInfo') }}</div>
          <div v-else class="trainee-list-mini" style="margin-top: 0.5rem;">
              <span v-for="email in classEmails" :key="email" class="trainee-tag">
                  {{ email }}
              </span>
          </div>
      </div>

      <div class="record-section">
          <h4 class="record-section-title">{{ t('eventDetails.trainingLog') }}</h4>
          <div v-if="event.records && event.records.length" class="record-list-wrap">
              <ul class="exercise-list">
                  <li v-for="(rec, idx) in event.records" :key="idx" class="history-item flex-between" style="flex-direction: row; align-items: center;">
                      <span class="ex-name" style="font-weight: bold;">{{ rec.name }}</span>
                      <span class="ex-meta" style="color: var(--text-muted); font-size: 0.9rem;">{{ t('search.sets', { n: rec.sets }) }} x {{ t('search.reps', { n: rec.reps }) }} <template v-if="rec.weight">@ {{ rec.weight }}kg</template></span>
                  </li>
              </ul>
          </div>
          <div v-else class="record-empty">{{ t('eventDetails.noExercises') }}</div>

          <!-- Signature Section for PT Sessions -->
          <div v-if="event.type === 'PT'" class="signature-section" style="margin-top: 2rem; border-top: 1px solid var(--border); padding-top: 1rem;">
              <h4>{{ t('eventDetails.traineeConfirmation') }}</h4>
              <div v-if="event.status === 'COMPLETED' && event.signatureUrl">
                  <p class="sm-text">{{ t('eventDetails.confirmedBySignature') }}</p>
                  <img :src="event.signatureUrl" alt="Confirmation Signature" class="signature-display">
              </div>
              <div v-else-if="event.status !== 'COMPLETED'">
                  <p class="sm-text">{{ t('eventDetails.signToConfirm') }}</p>
                  <SignaturePad v-model="tempSignature" />
              </div>
          </div>

          <div v-if="event.mediaUrl" style="margin-top: 1rem;">
              <img :src="event.mediaUrl" alt="Training Media" style="max-width: 100%; border-radius: 0.5rem;">
          </div>

          <!-- Add New Log Section -->
          <div v-if="canAddRecord" class="add-record-form" style="margin-top: 2rem; border-top: 1px solid var(--border); padding-top: 1rem;">
              <h5>+ {{ t('eventDetails.addRecord') }}</h5>
              <div class="field row" style="display: flex; gap: 1rem;">
                  <div style="flex:2">
                      <label>{{ t('eventDetails.exerciseName') }}</label>
                      <input type="text" v-model="newRecordObj.name" :placeholder="t('eventDetails.exercisePlaceholder')">
                  </div>
                  <div style="flex:1">
                      <label>{{ t('eventDetails.sets') }}</label>
                      <input type="number" v-model.number="newRecordObj.sets" min="1">
                  </div>
                  <div style="flex:1">
                      <label>{{ t('eventDetails.reps') }}</label>
                      <input type="number" v-model.number="newRecordObj.reps" min="1">
                  </div>
                  <div style="flex:1">
                      <label>{{ t('eventDetails.weight') }}</label>
                      <input type="number" v-model.number="newRecordObj.weight" min="0">
                  </div>
              </div>
              <button type="button" class="btn btn-primary btn-sm" @click="saveRecord" :disabled="savingRecord">{{ t('eventDetails.saveRecord') }}</button>
              <button
                v-if="event.targetType === 'CLASS' && event.type === 'PT' && event.classId && event.records?.length"
                type="button"
                class="btn btn-ghost btn-sm"
                style="margin-left: 0.5rem;"
                @click="applyLogsToClass"
                :disabled="applyingBulkLogs"
              >
                {{ applyingBulkLogs ? t('common.processing') : t('eventDetails.applyToClassMembers') }}
              </button>
          </div>
      </div>

      <div v-if="event.status === 'REJECTED' && event.rejectionReason" class="rejection-box glass" style="margin-top: 1rem; border-left: 4px solid var(--accent); padding: 1rem;">
          <strong style="color: var(--accent);">{{ t('calendar.rejectionReason') }}:</strong>
          <p>{{ event.rejectionReason }}</p>
      </div>

      <!-- Rejection Input (Trainer Only, Pending Only) -->
      <div v-if="isRejecting" class="rejection-input-area" style="margin-top: 1.5rem;">
          <label class="sm-text">{{ t('calendar.rejectionReason') }}</label>
          <textarea v-model="rejectionReasonInput" :placeholder="t('calendar.enterRejectionReason')" class="glass-input" rows="2" style="width:100%; margin-top:0.5rem;"></textarea>
          <div class="flex-end" style="gap: 0.5rem; margin-top: 0.5rem;">
              <button class="btn btn-ghost btn-sm" @click="isRejecting = false">{{ t('common.cancel') }}</button>
              <button class="btn btn-danger btn-sm" @click="handleReject" :disabled="!rejectionReasonInput.trim() || rejecting">{{ rejecting ? t('common.processing') : t('calendar.reject') }}</button>
          </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-primary" @click="close">{{ t('eventDetails.cancel') }}</button>
        <template v-if="event.type === 'PT' && event.status === 'PENDING' && auth.isTrainer && !isRejecting">
            <button
              type="button"
              class="btn btn-ghost"
              style="color: var(--accent);"
              @click="isRejecting = true"
            >
              {{ t('calendar.reject') }}
            </button>
            <button
              type="button"
              class="btn btn-ghost"
              @click="approveSession"
              :disabled="approving"
            >
              {{ approving ? t('common.processing') : t('eventDetails.approve') }}
            </button>
        </template>
        <button 
          v-if="event.type === 'PT' && event.status !== 'COMPLETED' && event.status !== 'REJECTED' && tempSignature" 
          type="button" 
          class="btn btn-primary" 
          @click="handleSignAndComplete"
          :disabled="completing"
        >
          {{ completing ? t('common.processing') : t('eventDetails.completeWithSignature') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import SignaturePad from '../ui/SignaturePad.vue'
import type { CalendarEvent } from '../../types'
import { useEventDetails } from '../../composables/calendar/useEventDetails'

const props = defineProps<{
  isOpen: boolean
  event: CalendarEvent | null
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', val: boolean): void
  (e: 'updated'): void
}>()

const auth = useAuthStore()
const { t } = useI18n()

const eventRef = computed(() => props.event)

const {
  canAddRecord,
  savingRecord,
  newRecordObj,
  applyingBulkLogs,
  approving,
  rejecting,
  isRejecting,
  rejectionReasonInput,
  tempSignature,
  completing,
  loadingClassInfo,
  classEmails,
  saveRecord,
  approveSession,
  handleReject,
  handleSignAndComplete,
  applyLogsToClass
} = useEventDetails(eventRef, {
  onUpdated: () => emit('updated'),
  onClose: () => emit('update:isOpen', false)
})

const close = () => {
  emit('update:isOpen', false)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(6px);
}

.modal-content {
  padding: 2rem;
  width: 90%;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.details-modal {
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
}

.details-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.details-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary);
  line-height: 1.3;
}

.details-badge.class {
  font-size: 0.7rem;
  padding: 0.08rem 0.5rem;
  border-radius: 100px;
  font-weight: 700;
  color: #8b5cf6;
  background: #ede9fe;
  flex-shrink: 0;
}

.details-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.details-meta-chip {
  font-size: 0.75rem;
  padding: 0.25rem 0.6rem;
  border-radius: 100px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
}

.details-meta-chip.status.pending { color: #92400e; background: #fef3c7; }
.details-meta-chip.status.approved { color: #065f46; background: #d1fae5; }
.details-meta-chip.status.completed { color: #065f46; background: #d1fae5; }
.details-meta-chip.status.cancelled,
.details-meta-chip.status.rejected { color: #991b1b; background: #fee2e2; }

.record-section {
  margin-top: 1rem;
  padding: 1.25rem;
  background: var(--bg-dark);
  border-radius: 12px;
  border: 1px solid var(--border);
}

.record-section-title {
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
}

.record-list-wrap {
  margin-top: 0.5rem;
}

.record-empty {
  padding: 1.25rem;
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-muted);
  font-style: italic;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
}

.exercise-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.exercise-list .history-item {
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border);
}
.exercise-list .history-item:last-child {
  border-bottom: none;
}

.sm-text {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.signature-display {
  width: 100%;
  max-height: 150px;
  object-fit: contain;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-top: 0.5rem;
}

.trainee-list-mini {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.trainee-tag {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  background: #ede9fe;
  color: var(--primary);
  border-radius: 100px;
  font-weight: 600;
}

.rejection-box {
  border-radius: 8px;
}

@media (max-width: 768px) {
  .modal-content {
    padding: 1.25rem;
    width: 94%;
  }
  .details-modal {
    max-height: 94vh;
  }
  .details-title {
    font-size: 1.1rem;
  }
  .record-section {
    padding: 1rem;
  }
  .field.row {
    flex-direction: column !important;
    gap: 0.6rem !important;
  }
}
</style>
