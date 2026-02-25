<template>
  <div class="container auth-container">
    <div class="glass auth-card">
      <div class="tabs">
        <button :class="{ active: isLogin }" @click="isLogin = true">Login</button>
        <button :class="{ active: !isLogin }" @click="isLogin = false">Signup</button>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="field">
          <label>Email</label>
          <input v-model="form.email" type="email" required placeholder="name@example.com" />
        </div>
        <div class="field">
          <label>Password</label>
          <input v-model="form.password" type="password" required />
        </div>
        <div v-if="!isLogin" class="field">
          <label>Nickname / Name</label>
          <input v-model="form.nickname" type="text" placeholder="Your display name" />
        </div>
        
        <button type="submit" class="btn btn-primary" :disabled="loading" style="width: 100%; margin-top: 1rem;">
          {{ loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account') }}
        </button>
        <p v-if="error" class="error-text" style="margin-top: 1rem;">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '../firebase/config'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'

const router = useRouter()
const isLogin = ref(true)
const loading = ref(false)
const error = ref('')

const form = reactive({
  email: '',
  password: '',
  nickname: ''
})

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
      
      // All new users start as OBSERVER (lvl 1)
      await setDoc(doc(db, 'users', user.uid), {
        email: form.email,
        nickname: form.nickname,
        role: 'OBSERVER',
        lvl: 1
      })
      
      isLogin.value = true
      form.nickname = ''
      alert("Account created! Please log in.")
    }
  } catch (e: any) {
    // Handle Firebase errors
    if (e.code === 'auth/email-already-in-use') {
        error.value = 'Email is already in use.'
    } else if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found') {
        error.value = 'Invalid email or password.'
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
