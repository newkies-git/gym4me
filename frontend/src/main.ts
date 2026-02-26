import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import router from './router'
import './index.css'
import { useAuthStore } from './stores/auth'
import i18n from './i18n'

registerSW({ immediate: true })

const app = createApp(App)
app.use(createPinia())
app.use(i18n)

const authStore = useAuthStore()
authStore.initAuth().then(() => {
    app.use(router)
    app.mount('#app')
})
