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
          <input v-model="form.email" type="email" required placeholder="name@example.com" />
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
import { doc, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore'

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

const bootstrapSiteAdminIfNeeded = async (uid: string, email: string) => {
  const normalizedEmail = email.trim().toLowerCase()
  const isBootstrapTarget = configuredSiteAdminEmail && configuredSiteAdminEmail === normalizedEmail
  const bootstrapRef = doc(db, 'system', 'siteAdminBootstrap')
  const userRef = doc(db, 'users', uid)

  if (!isBootstrapTarget) {
    await setDoc(userRef, {
      email,
      nickname: form.nickname,
      role: 'OBSERVER',
      lvl: 1,
      createdAt: serverTimestamp()
    })
    return false
  }

  return await runTransaction(db, async (tx) => {
    const [bootstrapSnap, userSnap] = await Promise.all([
      tx.get(bootstrapRef),
      tx.get(userRef)
    ])

    if (userSnap.exists()) {
      return userSnap.data().role === 'SITE_ADMIN'
    }

    const canBootstrap = !bootstrapSnap.exists()
    const role = canBootstrap ? 'SITE_ADMIN' : 'OBSERVER'
    const lvl = canBootstrap ? 100 : 1

    tx.set(userRef, {
      email,
      nickname: form.nickname,
      role,
      lvl,
      createdAt: serverTimestamp()
    })

    if (canBootstrap) {
      tx.set(bootstrapRef, {
        email: normalizedEmail,
        uid,
        createdAt: serverTimestamp()
      })
    }

    return canBootstrap
  })
}

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  try {
    if (isLogin.value) {
      // Firebase Login
      await signInWithEmailAndPassword(auth, form.email, form.password)
      router.push('/')
    } else {
      // Firebase Signup
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password)
      const user = userCredential.user

      // Bootstrap SITE_ADMIN once when configured email signs up first.
      const becameSiteAdmin = await bootstrapSiteAdminIfNeeded(user.uid, form.email)
      
      isLogin.value = true
      form.nickname = ''
      if (becameSiteAdmin) {
        alert('Account created. SITE_ADMIN has been bootstrapped.')
      } else {
        alert(t('auth.accountCreated'))
      }
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
