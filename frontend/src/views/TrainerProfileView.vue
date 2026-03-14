<template>
  <div class="page-wrapper container">
    <PageHeader
      :title="t('trainerProfile.title')"
      :subtitle="t('trainerProfile.subtitle')"
      show-back
    />

    <div class="content-grid">
      <!-- 편집 섹션 -->
      <section class="card glass">
        <h3 class="card-title">{{ t('trainerProfile.editProfile') }}</h3>

        <!-- 프로필 사진 미리보기 -->
        <div v-if="form.photoUrl" class="photo-preview-wrap">
          <img :src="form.photoUrl" :alt="t('trainerProfile.preview')" class="photo-preview" />
        </div>

        <form @submit.prevent="saveProfile" class="edit-form">
          <div class="field">
            <label>{{ t('trainerProfile.nickname') }}</label>
            <input type="text" v-model="form.nickname" required />
          </div>

          <div class="field">
            <label>{{ t('trainerProfile.photoUrl') }}</label>
            <input type="url" v-model="form.photoUrl" :placeholder="t('trainerProfile.photoUrlPlaceholder')" />
          </div>

          <div class="field">
            <label>{{ t('trainerProfile.bio') }}</label>
            <textarea v-model="form.bio" rows="4" :placeholder="t('trainerProfile.bioPlaceholder')"></textarea>
          </div>

          <div class="field">
            <label>{{ t('trainerProfile.specialties') }}</label>
            <input type="text" v-model="specialtiesStr" :placeholder="t('trainerProfile.specialtiesPlaceholder')" />
          </div>

          <div class="field">
            <label>{{ t('trainerProfile.awards') }}</label>
            <input type="text" v-model="awardsStr" :placeholder="t('trainerProfile.awardsPlaceholder')" />
          </div>

          <div class="field">
            <label>{{ t('trainerProfile.career') }}</label>
            <input type="text" v-model="careerStr" :placeholder="t('trainerProfile.careerPlaceholder')" />
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top: 0.5rem;" :disabled="saving">
            {{ saving ? t('trainerProfile.saving') : t('trainerProfile.updateProfile') }}
          </button>
        </form>
      </section>

      <!-- 수정 이력 -->
      <section class="card glass">
        <h3 class="card-title">{{ t('trainerProfile.modificationHistory') }}</h3>

        <div v-if="loadingHistory" class="sm-text">{{ t('common.loading') }}</div>

        <div v-else-if="history.length === 0" class="empty-state sm-text">
          {{ t('trainerProfile.noHistoryFound') }}
        </div>

        <ul v-else class="history-list">
          <li v-for="log in history" :key="log.id" class="history-item">
            <div class="log-date">{{ formatDate(log.updatedAt) }}</div>
            <div class="log-diff sm-text">
              <div v-for="(val, key) in log.after" :key="key">
                <template v-if="isChanged(log.before, log.after, key)">
                  <span class="diff-key">{{ key }}</span> 변경됨
                </template>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '../components/ui/PageHeader.vue'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/uiStore'
import { getTrainerProfile, updateTrainerProfile, getProfileHistory } from '../services/firebaseService'
import type { TrainerProfile, ProfileHistory } from '../types'

const auth = useAuthStore()
const ui = useUIStore()
const router = useRouter()
const { t } = useI18n()

const form = ref<Partial<TrainerProfile>>({
  nickname: auth.user?.nickname || '',
  bio: '',
  specialties: [],
  photoUrl: '',
  awards: [],
  career: []
})

const specialtiesStr = ref('')
const awardsStr = ref('')
const careerStr = ref('')
const originalProfile = ref<TrainerProfile | null>(null)
const saving = ref(false)
const history = ref<ProfileHistory[]>([])
const loadingHistory = ref(false)

onMounted(async () => {
  if (!auth.user?.email) return
  try {
    const profile = await getTrainerProfile(auth.user.email)
    if (profile) {
      originalProfile.value = profile
      form.value = { ...profile }
      specialtiesStr.value = (profile.specialties || []).join(', ')
      awardsStr.value = (profile.awards || []).join(', ')
      careerStr.value = (profile.career || []).join(', ')
    }
  } catch (e: any) {
    ui.showToast(t('trainerProfile.loadFailed') + ': ' + e.message, 'error')
  }
  fetchHistory()
})

async function fetchHistory() {
  if (!auth.user?.email) return
  loadingHistory.value = true
  try {
    history.value = await getProfileHistory(auth.user.email)
  } catch (e: any) {
    console.warn('History fetch failed', e)
  } finally {
    loadingHistory.value = false
  }
}

watch(specialtiesStr, (val) => { form.value.specialties = val.split(',').map(s => s.trim()).filter(Boolean) })
watch(awardsStr, (val) => { form.value.awards = val.split(',').map(s => s.trim()).filter(Boolean) })
watch(careerStr, (val) => { form.value.career = val.split(',').map(s => s.trim()).filter(Boolean) })

async function saveProfile() {
  if (!auth.user?.email) return
  saving.value = true
  try {
    await updateTrainerProfile(auth.user.email, form.value, originalProfile.value || {})
    ui.showToast(t('trainerProfile.updateSuccess'), 'success')
    originalProfile.value = { ...form.value } as TrainerProfile
    fetchHistory()
  } catch (e: any) {
    ui.showToast(t('trainerProfile.saveFailed') + ': ' + e.message, 'error')
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
    grid-template-columns: minmax(0, 1.3fr) minmax(280px, 1fr);
  }
}

/* Card */
.card {
  padding: 1.5rem;
  border-radius: 1rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 1.25rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}

/* Photo preview */
.photo-preview-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 1.25rem;
}

.photo-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--primary);
}

/* Form */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* History */
.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.history-item {
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--border);
}

.history-item:last-child {
  border-bottom: none;
}

.log-date {
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
}

.log-diff {
  color: var(--text-muted);
}

.diff-key {
  font-weight: 600;
  color: var(--primary);
}

.sm-text {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.empty-state {
  padding: 1.5rem 0;
  text-align: center;
}
</style>
