<template>
  <div class="profile-wrapper container">
    <div class="header flex-between">
      <h2>Body Profile: {{ clientEmail || 'My Stats' }}</h2>
      <button class="btn btn-ghost" @click="router.back()">Back</button>
    </div>

    <div class="content-grid grid-2" style="margin-top: 2rem;">
      <ProfileChart :records="records" />

      <div class="side-panel">
          <ProfileForm v-if="auth.isMember || auth.isTrainer" :saving="saving" @save="saveRecord" />
          <div v-else class="glass" style="padding: 1.5rem; text-align: center;">
            <p class="sm-text">Observer Mode: Read-only access to body records.</p>
          </div>
          <ProfileHistory :records="records" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useProfileStore } from '../stores/profileStore'

import ProfileChart from '../components/profile/ProfileChart.vue'
import ProfileForm from '../components/profile/ProfileForm.vue'
import ProfileHistory from '../components/profile/ProfileHistory.vue'

const auth = useAuthStore()
const profileStore = useProfileStore()
const route = useRoute()
const router = useRouter()

const clientEmail = computed(() => route.query.client as string | undefined)
const targetEmail = computed(() => clientEmail.value || auth.user?.email)

const records = computed(() => profileStore.getProfilesByEmail(targetEmail.value || ''))
const saving = computed(() => profileStore.loading)

const loadRecords = async (force = false) => {
    if(!targetEmail.value) return;
    await profileStore.fetchProfiles(targetEmail.value, force)
}

onMounted(() => {
    loadRecords()
})

watch(clientEmail, () => {
    loadRecords()
})

const saveRecord = async (payload: { date: string, weight: number, bodyFat?: number, muscleMass?: number }) => {
    if(!targetEmail.value) return;
    try {
        await profileStore.saveProfile(targetEmail.value, {
            date: payload.date,
            weight: payload.weight,
            bodyFat: payload.bodyFat || undefined,
            muscleMass: payload.muscleMass || undefined,
        });
    } catch(e: any) {
        alert(e.message)
    }
}
</script>

<style scoped>
.profile-wrapper { padding: 1rem 0; }
.side-panel {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
</style>
