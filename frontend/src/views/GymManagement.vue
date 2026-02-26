<template>
  <div class="container gym-mgt-wrapper">
    <div class="header">
      <h2>{{ t('gymMgt.title') }}</h2>
      <p class="sm-text">{{ t('gymMgt.subtitle') }}</p>
    </div>

    <div v-if="loading" class="glass" style="padding: 2rem; margin-top: 2rem;">{{ t('gymMgt.loadingInfo') }}</div>
    <div v-else-if="!gym" class="glass" style="padding: 2rem; margin-top: 2rem;">
      <p>{{ t('gymMgt.noGymAssigned') }}</p>
      <div class="field" style="margin-top: 1rem;">
        <label>{{ t('gymMgt.nameLabel') }}</label>
        <input v-model="newGym.name" type="text" :placeholder="t('gymMgt.namePlaceholder')" />
      </div>
      <div class="field">
        <label>{{ t('gymMgt.locationLabel') }}</label>
        <input v-model="newGym.location" type="text" :placeholder="t('gymMgt.locationPlaceholder')" />
      </div>
      <button class="btn btn-primary" style="margin-top: 1rem;" @click="handleCreateGym">{{ t('gymMgt.createMyGym') }}</button>
    </div>

    <div v-else class="glass" style="padding: 2rem; margin-top: 2rem;">
      <h3>{{ gym.name }}</h3>
      <p class="sm-text">{{ gym.location }}</p>
      
      <div style="margin-top: 2rem;">
        <router-link to="/manage-trainers" class="btn btn-secondary">{{ t('gymMgt.hireManageTrainers') }}</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/uiStore'
import { getGyms, createGym } from '../services/firebaseService'
import type { Gym } from '../types'

const auth = useAuthStore()
const ui = useUIStore()
const { t } = useI18n()

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
    ui.showToast(t('gymMgt.loadError') + ': ' + e.message, 'error')
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
    ui.showToast(t('gymMgt.createSuccess'), 'success')
    // Re-fetch to update local state (manager will have gymId now)
    location.reload()
  } catch (e: any) {
    ui.showToast(t('gymMgt.createError') + ': ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.gym-mgt-wrapper { padding: 2rem 0; }
.sm-text { color: var(--text-muted); font-size: 0.9rem; }
</style>
