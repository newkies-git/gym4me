<template>
  <div class="container complete-profile-container">
    <PageHeader :title="t('completeProfile.title')" :subtitle="t('completeProfile.subtitle')" :showBack="true" />

    <div class="glass complete-profile-card">
      <form @submit.prevent="handleSubmit" class="complete-profile-form">
        <div class="field">
          <label>
            {{ t('completeProfile.name') }}
            <span class="required">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            required
            :placeholder="t('completeProfile.namePlaceholder')"
          />
        </div>
        <div class="field">
          <label>{{ t('completeProfile.phone') }}</label>
          <input
            v-model="form.phone"
            type="tel"
            :placeholder="t('completeProfile.phonePlaceholder')"
          />
        </div>
        <div class="field">
          <label>
            {{ t('completeProfile.gym') }}
            <span class="required">*</span>
          </label>
          <select v-model="form.gymId" required>
            <option value="">{{ t('completeProfile.gymPlaceholder') }}</option>
            <option v-for="g in gymsList" :key="g.id" :value="g.id">
              {{ g.name }}
            </option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('completeProfile.nickname') }}</label>
          <input
            v-model="form.nickname"
            type="text"
            :placeholder="t('completeProfile.nicknamePlaceholder')"
          />
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="saving"
          style="width: 100%; margin-top: 1rem;"
        >
          {{ saving ? t('common.processing') : t('completeProfile.submit') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '../components/ui/PageHeader.vue'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/uiStore'
import { getGyms, updateMemberProfile } from '../services/firebaseService'
import type { Gym } from '../types'

const router = useRouter()
const auth = useAuthStore()
const ui = useUIStore()
const { t } = useI18n()

const gymsList = ref<Gym[]>([])
const saving = ref(false)
const error = ref('')

const form = reactive({
  name: '',
  phone: '',
  gymId: '',
  nickname: ''
})

onMounted(async () => {
  try {
    gymsList.value = await getGyms()
  } catch (e) {
    ui.showToast((e as Error)?.message || 'Failed to load gyms', 'error')
  }
  if (auth.user?.name) form.name = auth.user.name
  if (auth.user?.phone) form.phone = auth.user.phone
  if (auth.user?.gymId) form.gymId = auth.user.gymId
  if (auth.user?.nickname) form.nickname = auth.user.nickname
})

async function handleSubmit() {
  const name = form.name.trim()
  const gymId = form.gymId.trim()
  if (!name || !gymId) {
    error.value = t('completeProfile.errorRequired')
    return
  }
  if (!auth.user?.uid) return
  saving.value = true
  error.value = ''
  try {
    await updateMemberProfile(auth.user.uid, {
      name,
      phone: form.phone.trim() || undefined,
      gymId,
      nickname: form.nickname.trim() || undefined
    })
    await auth.refreshUser()
    router.push('/home')
  } catch (e: unknown) {
    error.value = (e as Error)?.message || t('completeProfile.saveFailed')
    ui.showToast(error.value, 'error')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.complete-profile-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 6rem 1rem 3rem 1rem;
}

.complete-profile-card {
  width: 100%;
  max-width: 420px;
  padding: 2rem;
}

.complete-profile-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
  margin: 0 0 0.5rem 0;
}

.complete-profile-subtitle {
  font-size: 0.95rem;
  color: var(--text-muted);
  margin: 0 0 1.5rem 0;
}

.complete-profile-form .field {
  margin-bottom: 1.25rem;
}

.complete-profile-form .field label {
  display: block;
  margin-bottom: 0.4rem;
  font-weight: 500;
  color: var(--text-main);
}

.complete-profile-form .field input,
.complete-profile-form .field select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 1rem;
}

.required {
  color: var(--accent);
}

.error-text {
  color: var(--accent);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}
</style>
