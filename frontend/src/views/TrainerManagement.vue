<template>
  <div class="management-wrapper container">
    <div class="header flex-between">
      <h2>Trainer Management</h2>
      <button class="btn btn-ghost" @click="router.back()">Back</button>
    </div>

    <div class="grid-2" style="margin-top: 2rem;">
      <!-- Trainer List Section -->
      <div class="list-section glass">
        <h3>Current Trainers</h3>
        <div v-if="loading" class="sm-text">Loading...</div>
        <ul v-else class="history-list">
          <li v-for="trainer in trainers" :key="trainer.uid" class="history-item flex-between" style="flex-direction: row; align-items: center;">
            <div>
              <div style="font-weight: 600;">{{ trainer.nickname || 'No Nickname' }}</div>
              <div class="sm-text">{{ trainer.email }}</div>
            </div>
            <div class="actions">
               <button class="btn btn-ghost btn-sm" @click="demoteUser(trainer)">Demote to Member</button>
            </div>
          </li>
        </ul>
        <div v-if="!loading && trainers.length === 0" class="empty-state">No trainers found.</div>
      </div>

      <!-- Add Trainer Section -->
      <div class="add-section glass">
        <h3>Appoint New Trainer</h3>
        <p class="sm-text">Search for a user by email to upgrade their role to Trainer.</p>
        
        <div class="field" style="margin-top: 1.5rem;">
          <input type="email" v-model="searchEmail" placeholder="user@example.com" @keyup.enter="searchUser">
        </div>
        <button class="btn btn-primary" style="width: 100%;" @click="searchUser" :disabled="searching">
          {{ searching ? 'Searching...' : 'Search User' }}
        </button>

        <div v-if="foundUser" class="found-user-card" style="margin-top: 2rem; padding: 1rem; border: 1px solid var(--border); border-radius: 0.5rem;">
          <p><strong>Found:</strong> {{ foundUser.data.nickname || foundUser.data.email }}</p>
          <p class="sm-text">Current Level: {{ foundUser.data.lvl }}</p>
          <button class="btn btn-primary btn-sm" style="margin-top: 1rem; width: 100%;" @click="promoteUser">
            Appoint as Trainer
          </button>
        </div>
        <p v-else-if="searchPerformed && !foundUser" class="error-text" style="margin-top: 1rem;">User not found.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getTrainers, searchUserByEmail, updateTrainerRole } from '../services/firebaseService'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/uiStore'

const router = useRouter()
const auth = useAuthStore()
const ui = useUIStore()

const trainers = ref<any[]>([])
const loading = ref(false)

const searchEmail = ref('')
const searching = ref(false)
const foundUser = ref<any>(null)
const searchPerformed = ref(false)

onMounted(fetchTrainers)

async function fetchTrainers() {
  loading.value = true
  try {
    trainers.value = await getTrainers(auth.user?.gymId)
  } catch (e: any) {
    ui.showToast('Failed to fetch trainers: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function searchUser() {
  if (!searchEmail.value) return
  searching.value = true
  searchPerformed.value = false
  foundUser.value = null
  try {
    foundUser.value = await searchUserByEmail(searchEmail.value)
    searchPerformed.value = true
  } catch (e: any) {
    ui.showToast('Search failed: ' + e.message, 'error')
  } finally {
    searching.value = false
  }
}

async function promoteUser() {
  if (!foundUser.value) return
  if (!auth.user?.gymId && !auth.isSiteAdmin) {
    ui.showToast('You must have a Gym assigned to hire trainers.', 'warning')
    return
  }
  try {
    // If site admin is promoting, they might not have a gymId, but site admin promoteToManager is separate.
    // Managers promote trainers to THEIR gym.
    await updateTrainerRole(foundUser.value.id, 'TRAINER', 10, auth.user?.gymId)
    ui.showToast('User promoted to Trainer!', 'success')
    foundUser.value = null
    searchEmail.value = ''
    searchPerformed.value = false
    fetchTrainers()
  } catch (e: any) {
    ui.showToast('Promotion failed: ' + e.message, 'error')
  }
}

async function demoteUser(trainer: any) {
  if (!confirm(`Are you sure you want to demote ${trainer.email} to Member?`)) return
  try {
    await updateTrainerRole(trainer.uid, 'MEMBER', 5)
    ui.showToast('User demoted to Member.', 'info')
    fetchTrainers()
  } catch (e: any) {
    ui.showToast('Demotion failed: ' + e.message, 'error')
  }
}
</script>

<style scoped>
.management-wrapper { padding: 1rem 0; }
.header { margin-bottom: 2rem; }
.list-section, .add-section { padding: 2rem; }
h3 { margin-bottom: 1.5rem; }
.sm-text { font-size: 0.85rem; color: var(--text-muted); }
.empty-state { color: var(--text-muted); font-style: italic; padding: 1rem 0; }
.history-item { padding: 1rem; }
</style>
