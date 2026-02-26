<template>
  <div class="container auth-container">
    <div class="glass auth-card">
      <div class="tabs">
        <button :class="{ active: isLogin }" @click="isLogin = true">{{ t('auth.login') }}</button>
        <button :class="{ active: !isLogin }" @click="isLogin = false">{{ t('auth.signup') }}</button>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="field">
          <label>{{ t('auth.email') }}</label>
          <input v-model="form.email" type="email" required :placeholder="t('auth.emailPlaceholder')" />
        </div>
        <div class="field">
          <label>{{ t('auth.password') }}</label>
          <input v-model="form.password" type="password" required />
        </div>
        <div v-if="!isLogin" class="field">
          <label>{{ t('auth.nickname') }}</label>
          <input v-model="form.nickname" type="text" :placeholder="t('auth.nicknamePlaceholder')" />
        </div>
        
        <button type="submit" class="btn btn-primary" :disabled="loading" style="width: 100%; margin-top: 1rem;">
          {{ loading ? t('auth.processing') : (isLogin ? t('auth.signIn') : t('auth.createAccount')) }}
        </button>
        <p v-if="error" class="error-text" style="margin-top: 1rem;">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { auth, db } from '../firebase/config'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const router = useRouter()
const isLogin = ref(true)
const loading = ref(false)
const error = ref('')
const { t } = useI18n()

const form = reactive({
  email: '',
  password: '',
  nickname: ''
})

const configuredSiteAdminEmail = (import.meta.env.VITE_SITE_ADMIN_EMAIL || '').trim().toLowerCase()
const configuredSiteAdminInitialPassword = import.meta.env.VITE_SITE_ADMIN_INITIAL_PASSWORD || ''

const markInitialSiteAdminIfNeeded = async (uid: string, email: string, password: string) => {
  const normalizedEmail = email.trim().toLowerCase()
  const isBootstrapTarget = configuredSiteAdminEmail && configuredSiteAdminEmail === normalizedEmail
  const isInitialPassword = configuredSiteAdminInitialPassword && configuredSiteAdminInitialPassword === password
  if (!isBootstrapTarget || !isInitialPassword) return false

  const userRef = doc(db, 'users', uid)
  await setDoc(userRef, {
    email,
    role: 'SITE_ADMIN',
    lvl: 100,
    mustChangePassword: true,
    updatedAt: serverTimestamp()
  }, { merge: true })
  return true
}

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  try {
    if (isLogin.value) {
      // Firebase Login
      const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password)
      await markInitialSiteAdminIfNeeded(userCredential.user.uid, form.email, form.password)
      router.push('/')
    } else {
      // Firebase Signup
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password)
      const user = userCredential.user

      // All new users start as OBSERVER.
      await setDoc(doc(db, 'users', user.uid), {
        email: form.email,
        nickname: form.nickname,
        role: 'OBSERVER',
        lvl: 1,
        createdAt: serverTimestamp()
      })
      
      isLogin.value = true
      form.nickname = ''
      alert(t('auth.accountCreated'))
    }
  } catch (e: any) {
    // Handle Firebase errors
    if (e.code === 'auth/email-already-in-use') {
        error.value = t('auth.errEmailInUse')
    } else if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found') {
        error.value = t('auth.errInvalidCredential')
    } else {
        error.value = e.message
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}
.auth-card {
  width: 100%;
  max-width: 400px;
  padding: 2.5rem;
}
.tabs {
  display: flex;
  margin-bottom: 2.5rem;
  gap: 1rem;
}
.tabs button {
  flex: 1;
  padding: 0.75rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.tabs button.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}
</style>
