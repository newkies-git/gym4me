<template>
  <div class="page-wrapper container">
    <div class="page-header flex-between">
      <div>
        <h2>{{ t('body.title') }}</h2>
        <p class="subtitle">{{ clientEmail || t('body.myStats') }}</p>
      </div>
      <button class="btn btn-ghost" @click="router.back()">{{ t('body.back') }}</button>
    </div>

    <div class="content-grid">
      <div class="chart-col card glass">
        <ProfileChart :records="records" />
      </div>

      <div class="side-col">
        <div class="card glass">
          <ProfileForm v-if="auth.isMember || auth.isTrainer" :saving="saving" @save="saveRecord" />
          <div v-else class="observer-notice">
            <p class="sm-text">{{ t('body.observerReadonly') }}</p>
          </div>
        </div>
        <div class="card glass">
          <ProfileHistory :records="records" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useProfileStore } from '../stores/profileStore'

import ProfileChart from '../components/profile/ProfileChart.vue'
import ProfileForm from '../components/profile/ProfileForm.vue'
import ProfileHistory from '../components/profile/ProfileHistory.vue'

const auth = useAuthStore()
const profileStore = useProfileStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const clientEmail = computed(() => {
    const requested = route.query.client as string | undefined
    if (!requested) return undefined
    return auth.isTrainer || auth.isSiteAdmin ? requested : undefined
})
const targetEmail = computed(() => clientEmail.value || auth.user?.email)
const records = computed(() => profileStore.getProfilesByEmail(targetEmail.value || ''))
const saving = computed(() => profileStore.loading)

const loadRecords = async (force = false) => {
    if (!targetEmail.value) return
    await profileStore.fetchProfiles(targetEmail.value, force)
}

onMounted(() => loadRecords())
watch(clientEmail, () => loadRecords())

const saveRecord = async (payload: { date: string, weight: number, bodyFat?: number, muscleMass?: number }) => {
    if (!targetEmail.value) return
    try {
        await profileStore.saveProfile(targetEmail.value, {
            date: payload.date,
            weight: payload.weight,
            bodyFat: payload.bodyFat || undefined,
            muscleMass: payload.muscleMass || undefined,
        })
    } catch (e: any) {
        alert(t('common.errorWithMessage', { msg: e.message }))
    }
}
</script>

<style scoped>
.page-wrapper {
  padding: 6rem 1rem 3rem 1rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h2 {
  font-size: clamp(1.5rem, 2vw, 2rem);
  margin: 0;
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

/* Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 1024px) {
  .content-grid {
    grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
  }
}

.side-col {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Card */
.card {
  padding: 1.5rem;
  border-radius: 1rem;
}

.observer-notice {
  text-align: center;
  padding: 1rem 0;
}

.sm-text {
  font-size: 0.875rem;
  color: var(--text-muted);
}
</style>
