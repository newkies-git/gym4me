<template>
  <div class="trainer-section glass" style="margin-bottom: 2rem;">
    <h3>My Clients</h3>
    
    <div class="add-client-form">
      <input type="email" v-model="searchEmail" placeholder="Search user by email..." @keyup.enter="searchClient">
      <button class="btn btn-primary" @click="searchClient" :disabled="loading">Search & Add</button>
    </div>
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

    <ul class="client-list">
      <li v-for="client in clients" :key="client.uid" class="client-item">
        <div class="client-info">
          <strong style="display: flex; align-items: center; gap: 0.5rem;">
              {{ client.nickname || extractName(client.email) }}
              <span v-if="client.remainingSessions !== undefined && client.remainingSessions <= 5" class="badge danger" title="Low Sessions">⚠️ {{ client.remainingSessions }} Left</span>
              <span v-if="isExpiringSoon(client.expirationDate)" class="badge danger" title="Expiring Soon">⚠️ Expiring</span>
          </strong>
          <span class="sm-text">{{ client.email }}</span>
          <span class="sm-text mt-1" v-if="client.remainingSessions !== undefined">PT: {{ client.remainingSessions }} sessions (Valid 'til: {{ client.expirationDate || 'N/A' }})</span>
        </div>
        <div class="client-actions">
            <button class="btn btn-ghost btn-sm" @click="openSessionModal(client)">Edit PT</button>
            <button class="btn btn-ghost btn-sm" @click="viewClientSchedule(client)">Calendar</button>
            <button class="btn btn-ghost btn-sm" @click="router.push(`/profile?client=${client.email}`)">Profile</button>
        </div>
      </li>
      <li v-if="clients.length === 0" class="empty-state">No clients assigned yet. Add some!</li>
    </ul>

    <!-- Edit Session Modal -->
    <BaseModal v-model:isOpen="isSessionModalOpen" title="Edit PT Membership" max-width="400px">
      <p class="sm-text" style="margin-bottom: 1rem;">Client: {{ selectedClient?.email }}</p>
      <div class="field">
          <label>Remaining Sessions</label>
          <input type="number" v-model.number="editSessionForm.remaining" min="0">
      </div>
      <div class="field">
          <label>Expiration Date</label>
          <input type="date" v-model="editSessionForm.expiration">
      </div>
      <template #footer>
          <button class="btn btn-ghost" @click="isSessionModalOpen = false">Cancel</button>
          <button class="btn btn-primary" @click="saveSessionUpdates" :disabled="savingSessions">Save</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useClientStore } from '../../stores/clientStore'
import { logTicketHistory } from '../../services/firebaseService'
import type { ClientInfo } from '../../types'
import BaseModal from '../ui/BaseModal.vue'

const auth = useAuthStore()
const clientStore = useClientStore()
const router = useRouter()

const searchEmail = ref('')
const loading = computed(() => clientStore.loading)
const errorMsg = ref('')

const clients = computed(() => clientStore.clients)

onMounted(async () => {
    // Initial fetch, force = false (use cache if available)
    await clientStore.fetchClients()
})

const searchClient = async () => {
  if (!searchEmail.value) return;
  errorMsg.value = '';
  
  try {
    await clientStore.addClientByEmail(searchEmail.value.trim());
    searchEmail.value = '';
    alert('Client added successfully!');
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

const viewClientSchedule = (client: ClientInfo) => {
  router.push(`/calendar?client=${client.email}`)
}

// Session Editing
const isSessionModalOpen = ref(false)
const savingSessions = ref(false)
const selectedClient = ref<ClientInfo | null>(null)
const editSessionForm = ref({ remaining: 0, expiration: '' })

const openSessionModal = (client: ClientInfo) => {
  selectedClient.value = client;
  editSessionForm.value.remaining = client.remainingSessions || 0;
  editSessionForm.value.expiration = client.expirationDate || '';
  isSessionModalOpen.value = true;
}

const saveSessionUpdates = async () => {
  if(!selectedClient.value) return;
  savingSessions.value = true;
  try {
      const oldRemaining = selectedClient.value.remainingSessions || 0;
      const newRemaining = editSessionForm.value.remaining;
      const diff = newRemaining - oldRemaining;
      
      await clientStore.updateSessions(
          selectedClient.value.uid, 
          newRemaining, 
          editSessionForm.value.expiration
      );
      
      await logTicketHistory({
          clientEmail: selectedClient.value.email,
          trainerEmail: auth.user?.email,
          action: diff > 0 ? 'ADD' : (diff < 0 ? 'DEDUCT' : 'UPDATE_DATE'),
          amountChanged: diff,
          newTotal: newRemaining,
          newExpirationDate: editSessionForm.value.expiration
      });

      isSessionModalOpen.value = false;
  } catch(e: any) {
      alert(e.message)
  } finally {
      savingSessions.value = false;
  }
}
</script>

<style scoped>
.trainer-section { padding: 2rem; border-radius: 1rem; }
.trainer-section h3 { margin-bottom: 1.5rem; }

.add-client-form { display: flex; gap: 1rem; margin-bottom: 1rem; }
.add-client-form input {
  flex: 1;
  padding: 0.75rem;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: white;
  outline: none;
}
.error { color: var(--accent); font-size: 0.9rem; margin-bottom: 1rem; }

.client-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.client-item { 
  display: flex; justify-content: space-between; align-items: center; 
  padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem; 
}
.client-info { display: flex; flex-direction: column; }
.sm-text { font-size: 0.8rem; color: var(--text-muted); }
.empty-state { color: var(--text-muted); font-style: italic; padding: 1rem 0; }
.btn-sm { padding: 0.4rem 0.8rem; font-size: 0.8rem; }
.client-actions { display: flex; gap: 0.5rem; }
.badge { font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 1rem; color: white; margin-left: 0.5rem; }
.badge.danger { background: #f43f5e; box-shadow: 0 0 10px rgba(244, 63, 94, 0.5); }

.field { margin-bottom: 1.5rem; }
.field label { display: block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem; font-weight: 600; }
.field input { width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 0.5rem; color: white; outline: none; }
</style>
