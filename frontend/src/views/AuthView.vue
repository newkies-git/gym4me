<template>
  <div class="container auth-container">
    <div class="glass auth-card">
      <div class="auth-hero">
        <h1 class="auth-title">{{ t(isLogin ? 'auth.loginView.title' : 'auth.signupView.title') }}</h1>
        <p class="auth-subtitle">{{ t(isLogin ? 'auth.loginView.subtitle' : 'auth.signupView.subtitle') }}</p>
      </div>

      <div class="tabs">
        <button :class="{ active: isLogin }" @click="isLogin = true">{{ t('auth.tabs.login') }}</button>
        <button :class="{ active: !isLogin }" @click="isLogin = false">{{ t('auth.tabs.signup') }}</button>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="field">
          <label class="auth-label">{{ t('auth.fields.email.label') }}</label>
          <div class="input-with-icon">
            <span class="input-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16v16H4z" opacity="0.15"/>
                <path d="M4 6h16v12H4z" opacity="0.15"/>
                <path d="M4 8l8 5 8-5"/>
                <path d="M4 6h16"/>
              </svg>
            </span>
            <input
              v-model="form.email"
              type="email"
              class="auth-input"
              required
              :placeholder="t('auth.fields.email.placeholder').replace('＠', '@')"
            />
          </div>
        </div>
        <div class="field">
          <div class="password-label-row">
            <label class="auth-label">{{ t('auth.fields.password.label') }}</label>
            <button
              v-if="isLogin"
              type="button"
              class="forgot-btn"
              :disabled="loading || resetLoading"
              @click="handleResetPassword"
            >
              {{ t('auth.reset.forgotShort') }}
            </button>
          </div>
          <div class="input-with-icon auth-password">
            <span class="input-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="auth-input auth-password-input"
              required
              :placeholder="isLogin ? '' : t('auth.fields.password.placeholder')"
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              :title="showPassword ? 'Hide password' : 'Show password'"
              @click.prevent="showPassword = !showPassword"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>
        <div v-if="!isLogin" class="field">
          <label class="auth-label">{{ t('auth.fields.passwordConfirm.label') }}</label>
          <div class="input-with-icon auth-password">
            <span class="input-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              v-model="form.passwordConfirm"
              type="password"
              class="auth-input auth-password-input"
              required
              :placeholder="t('auth.fields.passwordConfirm.placeholder')"
            />
          </div>
        </div>
        <div v-if="isLogin" class="field field-checkbox">
          <label class="checkbox-label remember-row">
            <input v-model="rememberEmail" type="checkbox" />
            <span>{{ t('auth.loginOptions.rememberEmail') }}</span>
          </label>
        </div>
        <template v-if="!isLogin">
          <div class="field field-checkbox">
            <label class="checkbox-label">
              <input v-model="agreeTerms" type="checkbox" />
              <span><router-link to="/terms" target="_blank" class="link">{{ t('auth.legal.agreeTerms') }}</router-link></span>
            </label>
          </div>
          <div class="field field-checkbox">
            <label class="checkbox-label">
              <input v-model="agreePrivacy" type="checkbox" />
              <span><router-link to="/privacy" target="_blank" class="link">{{ t('auth.legal.agreePrivacy') }}</router-link></span>
            </label>
          </div>
        </template>

        <button type="submit" class="btn btn-primary auth-signin-btn" :disabled="loading" style="width: 100%; margin-top: 1rem;">
          {{ loading ? t('auth.actions.processing') : (isLogin ? t('auth.actions.signIn') : t('auth.actions.createAccount')) }}
        </button>
        <p v-if="error" class="error-text" style="margin-top: 1rem;">{{ error }}</p>
        <p v-if="success" class="success-text" style="margin-top: 0.75rem;">{{ success }}</p>

        <div v-if="isLogin" class="social-section">
          <div class="social-divider">{{ t('auth.social.orContinueWith') }}</div>
          <div class="social-buttons">
            <button type="button" class="social-btn" disabled>{{ t('auth.social.google') }}</button>
            <button type="button" class="social-btn" disabled>{{ t('auth.social.facebook') }}</button>
          </div>
        </div>

        <div class="auth-footer" v-if="isLogin">
          <span>{{ t('auth.cta.noAccountPrefix') }}</span>
          <button type="button" class="link-action" @click="isLogin = false">{{ t('auth.cta.signupButton') }}</button>
        </div>
        <div class="auth-footer" v-else>
          <span>{{ t('auth.cta.hasAccountPrefix') }}</span>
          <button type="button" class="link-action" @click="isLogin = true">{{ t('auth.cta.loginButton') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { auth, db } from '../firebase/config'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const isLogin = ref(true)
const loading = ref(false)
const resetLoading = ref(false)
const showPassword = ref(false)
const error = ref('')
const success = ref('')
const { t } = useI18n()
const authStore = useAuthStore()

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

watch(isLogin, (next) => {
  // 탭 전환 시 이전 에러/성공 메시지를 제거해 UI 혼선을 줄입니다.
  error.value = ''
  success.value = ''
  resetLoading.value = false
  loading.value = false
  showPassword.value = false

  if (next) {
    // 로그인 모드에서는 비번 확인/동의 체크만 초기화합니다.
    form.passwordConfirm = ''
    agreeTerms.value = false
    agreePrivacy.value = false
  } else {
    // 회원가입 모드 진입 시에도 입력 상태를 정리합니다.
    form.passwordConfirm = ''
  }
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
  success.value = ''
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
      
      // 라우터 가드에서 정확한 권한으로 확인될 수 있도록 로그인 정보를 강제 동기화
      await authStore.fetchUserRole(userCredential.user)

      // 권한에 맞는 홈(대시보드)으로 이동. DashboardView가 TraineeHome/TrainerHome 등 역할별 뷰 표시
      router.push('/home')
    } else {
      if (form.password !== form.passwordConfirm) {
        error.value = t('auth.errors.passwordMismatch')
        loading.value = false
        return
      }
      if (!agreeTerms.value || !agreePrivacy.value) {
        error.value = t('auth.legal.termsRequired')
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
      alert(t('auth.toast.accountCreated'))
    }
  } catch (e: any) {
    // Handle Firebase errors
    if (e.code === 'auth/email-already-in-use') {
        error.value = t('auth.errors.emailInUse')
    } else if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found') {
        error.value = t('auth.errors.invalidCredential')
    } else {
        error.value = e.message
    }
  } finally {
    loading.value = false
  }
}

const handleResetPassword = async () => {
  const email = (form.email || '').trim()
  if (!email) {
    error.value = t('auth.reset.emailRequired')
    return
  }
  resetLoading.value = true
  error.value = ''
  success.value = ''
  try {
    await sendPasswordResetEmail(auth, email)
    success.value = t('auth.reset.emailSent')
  } catch (e: any) {
    error.value = t('auth.reset.emailFailed')
  } finally {
    resetLoading.value = false
  }
}
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 60px);
  padding: 2rem 1rem;
}
.auth-card {
  width: 100%;
  max-width: 400px;
  padding: 2.5rem;
  min-height: 380px;
}
.tabs {
  display: none; /* 디자인 기준(하단 CTA로 탭 전환) */
  margin-bottom: 1.5rem;
  gap: 1rem;
}
.auth-form {
  min-height: 280px;
}

.auth-hero {
  margin-bottom: 1.25rem;
  text-align: center;
}

.auth-title {
  font-size: 2.1rem;
  font-weight: 900;
  margin: 0;
  letter-spacing: -0.02em;
}

.auth-subtitle {
  margin: 0.6rem 0 0;
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.35;
}

.auth-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

.input-with-icon {
  position: relative;
}

.input-with-icon input.auth-input {
  width: 100%;
  padding: 0.95rem 1rem 0.95rem 3rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.55);
  box-sizing: border-box;
  font-size: 0.95rem;
}

.input-with-icon .input-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  opacity: 0.95;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.auth-password .password-toggle {
  position: absolute;
  right: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.6);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-muted);
}

.auth-signin-btn {
  height: 3.15rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  border-radius: 999px; /* 알약형 */
}

.social-section {
  margin-top: 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  align-items: center;
}

.social-divider {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  font-weight: 800;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
}

.social-divider::before,
.social-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
  opacity: 0.65;
}

.social-buttons {
  width: 100%;
  display: flex;
  gap: 0.75rem;
}

.social-btn {
  flex: 1;
  height: 2.8rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.6);
  color: var(--text-main);
  font-weight: 900;
  cursor: not-allowed;
  opacity: 0.85;
}

.auth-footer {
  margin-top: 1.1rem;
  text-align: center;
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  align-items: baseline;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.link-action {
  border: none;
  background: transparent;
  color: var(--primary);
  font-weight: 900;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.password-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.forgot-btn {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-weight: 900;
  cursor: pointer;
  padding: 0;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
}

.forgot-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.remember-row {
  justify-content: space-between;
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
/* 이용약관 / 개인정보 체크박스 사이 여백 1/2 */
.field-checkbox + .field-checkbox {
  margin-top: 0.25rem;
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

.success-text {
  color: #2e7d32;
  font-size: 0.9rem;
}

.login-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--primary);
  font-weight: 700;
  padding: 0;
  cursor: pointer;
  text-decoration: none;
  letter-spacing: 0.02em;
  font-size: 0.85rem;
}

.link-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
