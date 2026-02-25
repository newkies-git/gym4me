<template>
  <div class="profile-wrapper container">
    <div class="header flex-between">
      <h2>My Trainer Profile</h2>
      <button class="btn btn-ghost" @click="router.back()">Back</button>
    </div>

    <div class="grid-2" style="margin-top: 2rem;">
      <!-- Edit Section -->
      <div class="edit-section glass">
        <h3>Edit Profile</h3>
        <form @submit.prevent="saveProfile">
          <div class="field">
            <label>Nickname</label>
            <input type="text" v-model="form.nickname" required>
          </div>
          
          <div class="field">
            <label>Profile Image URL</label>
            <input type="url" v-model="form.photoUrl" placeholder="https://...">
            <div v-if="form.photoUrl" class="img-preview" style="margin-top: 1rem;">
               <img :src="form.photoUrl" alt="Preview" style="max-width: 100px; border-radius: 50%;">
            </div>
          </div>

          <div class="field">
            <label>Specialties (Comma separated)</label>
            <input type="text" v-model="specialtiesStr" placeholder="Weight Loss, Strength, HIIT">
          </div>

          <div class="field">
            <label>Bio / Introduction</label>
            <textarea v-model="form.bio" rows="4"></textarea>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%;" :disabled="saving">
            {{ saving ? 'Saving...' : 'Update Profile' }}
          </button>
        </form>
      </div>

      <!-- History Section -->
      <div class="history-section glass">
        <h3>Modification History</h3>
        <div v-if="loadingHistory" class="sm-text">Loading...</div>
        <ul v-else class="history-list">
          <li v-for="log in history" :key="log.id" class="history-item">
            <div class="log-date" style="font-weight: 600; font-size: 0.9rem;">{{ formatDate(log.updatedAt) }}</div>
            <div class="log-diff sm-text" style="color: var(--text-muted); margin-top: 0.2rem;">
               <div v-for="(val, key) in log.after" :key="key">
                 <template v-if="isChanged(log.before, log.after, key)">
                    Modified <strong>{{ key }}</strong>
                 </template>
               </div>
            </div>
          </li>
        </ul>
        <div v-if="!loadingHistory && history.length === 0" class="empty-state">No history records found.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/uiStore'
import { getTrainerProfile, updateTrainerProfile, getProfileHistory } from '../services/firebaseService'
import type { TrainerProfile, ProfileHistory } from '../types'

const auth = useAuthStore()
const ui = useUIStore()
const router = useRouter()

const form = ref<Partial<TrainerProfile>>({
  nickname: auth.user?.nickname || '',
  bio: '',
  specialties: [],
  photoUrl: ''
})

const specialtiesStr = ref('')
const originalProfile = ref<TrainerProfile | null>(null)
const saving = ref(false)
const history = ref<ProfileHistory[]>([])
const loadingHistory = ref(false)

onMounted(async () => {
  if (!auth.user?.email) return
  
  // Load current profile
  try {
    const profile = await getTrainerProfile(auth.user.email)
    if (profile) {
      originalProfile.value = profile
      form.value = { ...profile }
      specialtiesStr.value = (profile.specialties || []).join(', ')
    }
  } catch (e: any) {
    ui.showToast('Failed to load profile: ' + e.message, 'error')
  }

  fetchHistory()
})

async function fetchHistory() {
  if (!auth.user?.email) return
  loadingHistory.value = true
  try {
    history.value = await getProfileHistory(auth.user.email)
  } catch (e: any) {
    console.warn("History fetch failed", e)
  } finally {
    loadingHistory.value = false
  }
}

watch(specialtiesStr, (val) => {
  form.value.specialties = val.split(',').map(s => s.trim()).filter(s => s !== '')
})

async function saveProfile() {
  if (!auth.user?.email) return
  saving.value = true
  try {
    await updateTrainerProfile(auth.user.email, form.value, originalProfile.value || {})
    ui.showToast('Profile updated successfully!', 'success')
    originalProfile.value = { ...form.value } as TrainerProfile
    fetchHistory()
  } catch (e: any) {
    ui.showToast('Failed to save: ' + e.message, 'error')
  } finally {
    saving.value = false
  }
}

const formatDate = (ts: any) => ts ? ts.toDate().toLocaleString() : ''

function isChanged(before: any, after: any, key: string) {
  if (!before) return true
  return JSON.stringify(before[key]) !== JSON.stringify(after[key])
}
</script>

<style scoped>
.profile-wrapper { padding: 1rem 0; }
.header { margin-bottom: 2rem; }
.edit-section, .history-section { padding: 2rem; }
h3 { margin-bottom: 1.5rem; }
.sm-text { font-size: 0.85rem; color: var(--text-muted); }
.empty-state { color: var(--text-muted); font-style: italic; padding: 1rem 0; }
.history-item { padding: 1rem 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
</style>
