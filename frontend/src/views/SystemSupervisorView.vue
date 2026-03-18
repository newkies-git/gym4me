<template>
  <div class="system-supervisor-view container">
    <PageHeader
      :title="t('systemSupervisor.title')"
      :subtitle="t('systemSupervisor.subtitle')"
      :show-back="true"
      back-url="/home"
    />

    <div class="form-card glass">
      <form @submit.prevent="handleCreate" class="supervisor-form">
        <div class="form-field">
          <label for="email">{{ t('systemSupervisor.email') }} <span class="required">*</span></label>
          <input id="email" v-model="form.email" type="email" required :placeholder="t('systemSupervisor.emailPlaceholder')" />
        </div>
        <div class="form-field">
          <label for="password">{{ t('systemSupervisor.password') }} <span class="required">*</span></label>
          <input id="password" v-model="form.password" type="password" required minlength="8" :placeholder="t('systemSupervisor.passwordPlaceholder')" />
        </div>
        <div class="form-field">
          <label for="passwordConfirm">{{ t('systemSupervisor.passwordConfirm') }} <span class="required">*</span></label>
          <input id="passwordConfirm" v-model="form.passwordConfirm" type="password" required minlength="8" :placeholder="t('systemSupervisor.passwordConfirmPlaceholder')" />
        </div>
        <div class="form-field">
          <label for="name">{{ t('systemSupervisor.name') }}</label>
          <input id="name" v-model="form.name" type="text" :placeholder="t('systemSupervisor.namePlaceholder')" />
        </div>
        <div class="form-field">
          <label for="nickname">{{ t('systemSupervisor.nickname') }}</label>
          <input id="nickname" v-model="form.nickname" type="text" :placeholder="t('systemSupervisor.nicknamePlaceholder')" />
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>

        <div class="form-actions">
          <router-link to="/home" class="btn btn-ghost">{{ t('common.cancel') }}</router-link>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? t('common.processing') : t('systemSupervisor.create') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { createSupervisorAccount } from '../services/firebaseService'
import PageHeader from '../components/ui/PageHeader.vue'

const { t } = useI18n()
const auth = useAuthStore()

const form = reactive({
  email: '',
  password: '',
  passwordConfirm: '',
  name: '',
  nickname: ''
})

const submitting = ref(false)
const error = ref('')

const handleCreate = async () => {
  error.value = ''
  if (form.password.length < 8) {
    error.value = t('systemSupervisor.passwordTooShort')
    return
  }
  if (form.password !== form.passwordConfirm) {
    error.value = t('systemSupervisor.passwordMismatch')
    return
  }
  submitting.value = true
  try {
    await createSupervisorAccount({
      email: form.email.trim(),
      password: form.password,
      name: form.name.trim() || undefined,
      nickname: form.nickname.trim() || undefined,
      registeredByEmail: auth.user?.email || ''
    })
    form.email = ''
    form.password = ''
    form.passwordConfirm = ''
    form.name = ''
    form.nickname = ''
    error.value = ''
    alert(t('systemSupervisor.createSuccess'))
  } catch (e: any) {
    error.value = e?.code === 'auth/email-already-in-use'
      ? t('systemSupervisor.emailInUse')
      : (e?.message || String(e))
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.system-supervisor-view {
  padding: 6rem 1rem 2rem;
}

.form-card {
  max-width: 420px;
  padding: 2rem;
  border-radius: 1rem;
}

.supervisor-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-field label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-main);
}

.form-field input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-main);
}

.required {
  color: var(--accent);
}

.error-text {
  color: var(--accent);
  font-size: 0.9rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}
</style>
