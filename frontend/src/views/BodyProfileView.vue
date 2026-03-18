<template>
  <div class="profile-page page-wrapper container">
    <PageHeader
      :title="t('body.title')"
      :subtitle="clientEmail || t('body.myStats')"
      show-back
    />

    <div class="content-grid">
      <div class="chart-col">
        <ProfileChart :records="records" />
      </div>

      <div class="side-col">
        <ProfileForm v-if="auth.isMember || auth.isTrainer" :saving="saving" @save="saveRecord" />
        <div v-else class="observer-card">
          <p class="sm-text">{{ t('body.observerReadonly') }}</p>
        </div>
        <ProfileHistory :records="records" />
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

import PageHeader from '../components/ui/PageHeader.vue'
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
    return auth.isTrainer || auth.isSupervisor ? requested : undefined
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
.profile-page {
  background-color: var(--bg-dark);
  min-height: 100vh;
}

.page-wrapper {
  padding: 6rem 1rem 3rem 1rem;
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

/* 관찰자 안내만 단일 카드로 표시 (폼/히스토리는 각 컴포넌트 루트가 카드) */
.observer-card {
  padding: 1.5rem;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.sm-text {
  font-size: 0.875rem;
  color: var(--text-muted);
}
</style>
