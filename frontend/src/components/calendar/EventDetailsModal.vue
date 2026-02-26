<template>
  <div v-if="event && isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content glass details-modal">
      <div class="flex-between">
          <h3>{{ event.title }}</h3>
          <span v-if="event.targetType === 'CLASS'" class="badge info">CLASS</span>
      </div>
      <p class="sm-text">Date: {{ event.dateStr }} | Time: {{ event.time }} | Status: {{ event.status }}</p>
      
      <div v-if="event.notes" style="margin-top: 1rem; margin-bottom: 2rem;">
          <strong>Notes:</strong> <p>{{ event.notes }}</p>
      </div>

      <div v-if="event.targetType === 'CLASS' && event.classId" style="margin-bottom: 2rem;">
          <strong>Class Trainees:</strong>
          <div v-if="loadingClassInfo" class="sm-text">Loading group info...</div>
          <div v-else class="trainee-list-mini" style="margin-top: 0.5rem;">
              <span v-for="email in classEmails" :key="email" class="trainee-tag">
                  {{ email }}
              </span>
          </div>
      </div>

      <div class="record-section">
          <h4>Training Log</h4>
          <div v-if="event.records && event.records.length">
              <ul class="exercise-list">
                  <li v-for="(rec, idx) in event.records" :key="idx" class="history-item flex-between" style="flex-direction: row; align-items: center;">
                      <span class="ex-name" style="font-weight: bold;">{{ rec.name }}</span>
                      <span class="ex-meta" style="color: var(--text-muted); font-size: 0.9rem;">{{ rec.sets }} Sets x {{ rec.reps }} Reps <template v-if="rec.weight">@ {{ rec.weight }}kg</template></span>
                  </li>
              </ul>
          </div>
          <div v-else class="empty-state">No exercises logged yet.</div>

          <!-- Signature Section for PT Sessions -->
          <div v-if="event.type === 'PT'" class="signature-section" style="margin-top: 2rem; border-top: 1px solid var(--border); padding-top: 1rem;">
              <h4>Trainee Confirmation</h4>
              <div v-if="event.status === 'COMPLETED' && event.signatureUrl">
                  <p class="sm-text">Confirmed via digital signature:</p>
                  <img :src="event.signatureUrl" alt="Confirmation Signature" class="signature-display">
              </div>
              <div v-else-if="event.status !== 'COMPLETED'">
                  <p class="sm-text">Please sign below to confirm session completion.</p>
                  <SignaturePad v-model="tempSignature" />
              </div>
          </div>

          <div v-if="event.mediaUrl" style="margin-top: 1rem;">
              <img :src="event.mediaUrl" alt="Training Media" style="max-width: 100%; border-radius: 0.5rem;">
          </div>

          <!-- Add New Log Section -->
          <div v-if="canAddRecord" class="add-record-form" style="margin-top: 2rem; border-top: 1px solid var(--border); padding-top: 1rem;">
              <h5>+ Add Exercise</h5>
              <div class="field row" style="display: flex; gap: 1rem;">
                  <div style="flex:2">
                      <label>Exercise</label>
                      <input type="text" v-model="newRecordObj.name" placeholder="e.g. Bench Press">
                  </div>
                  <div style="flex:1">
                      <label>Sets</label>
                      <input type="number" v-model.number="newRecordObj.sets" min="1">
                  </div>
                  <div style="flex:1">
                      <label>Reps</label>
                      <input type="number" v-model.number="newRecordObj.reps" min="1">
                  </div>
                  <div style="flex:1">
                      <label>Weight(kg)</label>
                      <input type="number" v-model.number="newRecordObj.weight" min="0">
                  </div>
              </div>
              <button type="button" class="btn btn-primary btn-sm" @click="saveRecord" :disabled="savingRecord">Save Log</button>
          </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" @click="close">Close</button>
        <button 
          v-if="event.type === 'PT' && event.status !== 'COMPLETED' && tempSignature" 
          type="button" 
          class="btn btn-primary" 
          @click="handleSignAndComplete"
          :disabled="completing"
        >
          {{ completing ? 'Processing...' : 'Sign & Complete' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { updateSchedule, completeSession } from '../../services/firebaseService'
import { arrayUnion, doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import SignaturePad from '../ui/SignaturePad.vue'
import type { CalendarEvent, ExerciseRecord } from '../../types'

const props = defineProps<{
  isOpen: boolean;
  event: CalendarEvent | null;
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', val: boolean): void;
  (e: 'updated'): void;
}>()

const auth = useAuthStore()

const savingRecord = ref(false)
const newRecordObj = ref<ExerciseRecord>({ name: '', sets: 0, reps: 0 })

const canAddRecord = computed(() => {
    if(!props.event) return false;
    // Trainer can add to their assigned PT sessions. User can add to personal sessions.
    if(props.event.type === 'PT') return auth.isTrainer;
    return !auth.isTrainer; 
})

const close = () => {
    emit('update:isOpen', false)
}

const saveRecord = async () => {
    if(!props.event || !newRecordObj.value.name) return;
    savingRecord.value = true;
    try {
        await updateSchedule(props.event.id, {
            records: arrayUnion({ ...newRecordObj.value })
        });
        
        newRecordObj.value = { name: '', sets: 0, reps: 0 };
        emit('updated');
    } catch(e: any) {
        alert(e.message)
    } finally {
        savingRecord.value = false;
    }
}

const tempSignature = ref('')
const completing = ref(false)

const loadingClassInfo = ref(false)
const classEmails = ref<string[]>([])

watch(() => props.event, async (newEv) => {
    if (newEv?.targetType === 'CLASS' && newEv.classId) {
        loadingClassInfo.value = true
        try {
            const snap = await getDoc(doc(db, 'classes', newEv.classId))
            if (snap.exists()) {
                classEmails.value = snap.data().traineeEmails || []
            }
        } catch (e) {
            console.error("Failed to fetch class info", e)
        } finally {
            loadingClassInfo.value = false
        }
    } else {
        classEmails.value = []
    }
}, { immediate: true })

const handleSignAndComplete = async () => {
    if(!props.event || !tempSignature.value || !auth.user) return;
    completing.value = true;
    try {
        await completeSession(props.event.id, tempSignature.value, auth.user);
        alert("Session signed and completed!");
        emit('updated');
        close();
    } catch(e: any) {
        alert(e.message)
    } finally {
        completing.value = false;
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
.modal-content { padding: 2rem; width: 90%; }
.details-modal { max-width: 600px; max-height: 90vh; overflow-y: auto; }
.sm-text { font-size: 0.8rem; color: var(--text-muted); }
.empty-state { color: var(--text-muted); font-style: italic; padding: 1rem 0; }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
.exercise-list { list-style: none; padding: 0; }
.signature-display {
    width: 100%;
    max-height: 150px;
    object-fit: contain;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    margin-top: 0.5rem;
}
.trainee-list-mini { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.trainee-tag {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border-radius: 1rem;
}
.badge.info { background: var(--primary); color: white; }
</style>
