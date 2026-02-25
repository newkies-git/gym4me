<template>
  <div class="container gym-mgt-wrapper">
    <div class="header">
      <h2>Gym Management</h2>
      <p class="sm-text">Manage your gym information and trainers.</p>
    </div>

    <div v-if="loading" class="glass" style="padding: 2rem; margin-top: 2rem;">Loading gym info...</div>
    <div v-else-if="!gym" class="glass" style="padding: 2rem; margin-top: 2rem;">
      <p>No gym assigned yet.</p>
      <div class="field" style="margin-top: 1rem;">
        <label>Gym Name</label>
        <input v-model="newGym.name" type="text" placeholder="Power Gym" />
      </div>
      <div class="field">
        <label>Location</label>
        <input v-model="newGym.location" type="text" placeholder="Seoul, Gangnam" />
      </div>
      <button class="btn btn-primary" style="margin-top: 1rem;" @click="handleCreateGym">Create My Gym</button>
    </div>

    <div v-else class="glass" style="padding: 2rem; margin-top: 2rem;">
      <h3>{{ gym.name }}</h3>
      <p class="sm-text">{{ gym.location }}</p>
      
      <div style="margin-top: 2rem;">
        <router-link to="/manage-trainers" class="btn btn-secondary">Hire & Manage Trainers</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/uiStore'
import { getGyms, createGym } from '../services/firebaseService'
import type { Gym } from '../types'

const auth = useAuthStore()
const ui = useUIStore()

const loading = ref(true)
const gym = ref<Gym | null>(null)
const newGym = reactive({
  name: '',
  location: ''
})

onMounted(fetchGym)

async function fetchGym() {
  loading.value = true
  try {
    const gyms = await getGyms()
    gym.value = gyms.find(g => g.id === auth.user?.gymId) || null
  } catch (e: any) {
    ui.showToast('Failed to fetch gym: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function handleCreateGym() {
  if (!newGym.name) return
  loading.value = true
  try {
    await createGym({
      name: newGym.name,
      location: newGym.location,
      managerEmail: auth.user?.email || ''
    })
    ui.showToast('Gym created successfully!', 'success')
    // Re-fetch to update local state (manager will have gymId now)
    location.reload()
  } catch (e: any) {
    ui.showToast('Failed to create gym: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.gym-mgt-wrapper { padding: 2rem 0; }
.sm-text { color: var(--text-muted); font-size: 0.9rem; }
</style>
