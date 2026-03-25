import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import router from './router'
import './index.css'
import { useAuthStore } from './stores/auth'
import i18n from './i18n'
import { auth } from './firebase/config'
import { browserLocalPersistence, browserSessionPersistence, setPersistence } from 'firebase/auth'

registerSW({ immediate: true })

const app = createApp(App)
app.use(createPinia())
app.use(i18n)

const authStore = useAuthStore()
;(async () => {
  // Firebase Auth persistence를 명시해 환경별 기본값 차이를 제거합니다.
  // - local: 브라우저 재시작 후에도 로그인 유지
  // - session: 브라우저 종료 시 로그아웃
  const mode = String(import.meta.env.VITE_AUTH_PERSISTENCE || 'local').toLowerCase()
  try {
    await setPersistence(auth, mode === 'session' ? browserSessionPersistence : browserLocalPersistence)
  } catch (_) {
    // private mode 등에서 persistence 설정이 실패할 수 있어 best-effort로 처리합니다.
  }

  await authStore.initAuth()
  app.use(router)
  app.mount('#app')
})()
