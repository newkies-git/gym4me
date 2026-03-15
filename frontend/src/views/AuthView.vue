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
          <input v-model="form.password" type="password" required :placeholder="isLogin ? '' : t('auth.passwordPlaceholder')" />
        </div>
        <div v-if="!isLogin" class="field">
          <label>{{ t('auth.passwordConfirm') }}</label>
          <input v-model="form.passwordConfirm" type="password" required :placeholder="t('auth.passwordConfirmPlaceholder')" />
        </div>
        <div v-if="isLogin" class="field field-checkbox">
          <label class="checkbox-label">
            <input v-model="rememberEmail" type="checkbox" />
            <span>{{ t('auth.rememberEmail') }}</span>
          </label>
        </div>
        <template v-if="!isLogin">
          <div class="field field-checkbox">
            <label class="checkbox-label">
              <input v-model="agreeTerms" type="checkbox" />
              <span><router-link to="/terms" target="_blank" class="link">{{ t('auth.agreeTerms') }}</router-link></span>
            </label>
          </div>
          <div class="field field-checkbox">
            <label class="checkbox-label">
              <input v-model="agreePrivacy" type="checkbox" />
              <span><router-link to="/privacy" target="_blank" class="link">{{ t('auth.agreePrivacy') }}</router-link></span>
            </label>
          </div>
        </template>

        <button type="submit" class="btn btn-primary" :disabled="loading" style="width: 100%; margin-top: 1rem;">
          {{ loading ? t('auth.processing') : (isLogin ? t('auth.signIn') : t('auth.createAccount')) }}
        </button>
        <p v-if="error" class="error-text" style="margin-top: 1rem;">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { auth, db } from '../firebase/config'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const router = useRouter()
const route = useRoute()
const isLogin = ref(true)
const loading = ref(false)
const error = ref('')
const { t } = useI18n()

const rememberEmail = ref(false)
const agreeTerms = ref(false)
const agreePrivacy = ref(false)

const REMEMBER_EMAIL_KEY = 'gym4me_remember_email'
const SAVED_EMAIL_KEY = 'gym4me_saved_email'

const form = reactive({
  email: '',
  password: '',
  passwordConfirm: '',
  nickname: ''
})

function applyAuthQuery() {
  if (route.query.tab === 'login') {
    isLogin.value = true
  } else if (route.query.tab === 'signup') {
    isLogin.value = false
  }
}

onMounted(() => {
  applyAuthQuery()
  try {
    if (localStorage.getItem(REMEMBER_EMAIL_KEY) === '1') {
      const saved = localStorage.getItem(SAVED_EMAIL_KEY)
      if (saved) {
        form.email = saved
        rememberEmail.value = true
      }
    }
  } catch (_) { /* ignore */ }
})

watch(() => route.query.tab, () => applyAuthQuery())

const configuredSiteAdminEmail = (import.meta.env.VITE_SITE_ADMIN_EMAIL || '').trim().toLowerCase()
const configuredSiteAdminInitialPassword = import.meta.env.VITE_SITE_ADMIN_INITIAL_PASSWORD || ''

const isInitialSiteAdminCredential = (email: string, password: string) => {
  const normalizedEmail = email.trim().toLowerCase()
  return !!configuredSiteAdminEmail &&
    !!configuredSiteAdminInitialPassword &&
    normalizedEmail === configuredSiteAdminEmail &&
    password === configuredSiteAdminInitialPassword
}

const markInitialSiteAdminIfNeeded = async (uid: string, email: string, password: string) => {
  if (!isInitialSiteAdminCredential(email, password)) return false

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

const signInOrBootstrapInitialSiteAdmin = async (email: string, password: string) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password)
  } catch (signInError: any) {
    if (!isInitialSiteAdminCredential(email, password)) throw signInError

    const canTryBootstrap = signInError?.code === 'auth/user-not-found' || signInError?.code === 'auth/invalid-credential'
    if (!canTryBootstrap) throw signInError

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        role: 'SITE_ADMIN',
        lvl: 100,
        mustChangePassword: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true })
      return userCredential
    } catch (createError: any) {
      if (createError?.code === 'auth/email-already-in-use') throw signInError
      throw createError
    }
  }
}

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  try {
    if (isLogin.value) {
      // Firebase Login
      const userCredential = await signInOrBootstrapInitialSiteAdmin(form.email, form.password)
      try {
        await markInitialSiteAdminIfNeeded(userCredential.user.uid, form.email, form.password)
      } catch (bootstrapError) {
        console.warn('SITE_ADMIN bootstrap update failed after login:', bootstrapError)
      }
      try {
        if (rememberEmail.value) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, '1')
          localStorage.setItem(SAVED_EMAIL_KEY, form.email.trim())
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY)
          localStorage.removeItem(SAVED_EMAIL_KEY)
        }
      } catch (_) { /* ignore */ }
      router.push('/')
    } else {
      if (form.password !== form.passwordConfirm) {
        error.value = t('auth.passwordMismatch')
        loading.value = false
        return
      }
      if (!agreeTerms.value || !agreePrivacy.value) {
        error.value = t('auth.termsRequired')
        loading.value = false
        return
      }
      // Firebase Signup (닉네임/이름은 최초 로그인 시 추가정보에서 입력)
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password)
      const user = userCredential.user

      try {
        await setDoc(doc(db, 'users', user.uid), {
          email: form.email,
          role: 'OBSERVER',
          lvl: 1,
          profileComplete: false,
          createdAt: serverTimestamp()
        })
      } catch (profileInitError) {
        console.warn('User profile initialization failed after signup:', profileInitError)
      }

      isLogin.value = true
      form.passwordConfirm = ''
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
  align-items: flex-start;
  min-height: 80vh;
  padding-top: 8vh;
}
.auth-card {
  width: 100%;
  max-width: 400px;
  padding: 2.5rem;
  min-height: 380px;
}
.tabs {
  display: flex;
  margin-bottom: 1.5rem;
  gap: 1rem;
}
.auth-form {
  min-height: 280px;
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

.field-checkbox {
  margin-top: 0.5rem;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 400;
  font-size: 0.9rem;
}

.checkbox-label input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.link {
  color: var(--primary);
  text-decoration: underline;
}
.link:hover {
  text-decoration: none;
}

.error-text {
  color: var(--accent);
  font-size: 0.9rem;
}
</style>
