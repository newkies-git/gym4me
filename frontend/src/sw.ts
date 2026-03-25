/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'

declare let self: ServiceWorkerGlobalScope

clientsClaim()
self.skipWaiting()

// This array is injected by vite-plugin-pwa (injectManifest).
precacheAndRoute(self.__WB_MANIFEST)

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
const messaging = getMessaging(app)

onBackgroundMessage(messaging, (payload) => {
  const title = payload.notification?.title || 'Gym4me'
  const body = payload.notification?.body || ''

  self.registration.showNotification(title, {
    body,
    data: payload.data ?? {},
    // keep simple; icon assets can be adjusted later
    icon: '/vite.svg'
  })
})

function urlForNotificationData(data: Record<string, string>): string {
  const type = data.type || ''
  if (type === 'SCHEDULE_REJECTED') return '/calendar'
  if (type === 'CLASS_INVITE') return '/home'
  if (type === 'MANAGER_LOW_CREDITS') {
    const th = (data.threshold || '').trim()
    const n = Number(th)
    if (th && Number.isFinite(n) && n >= 0) return `/gym/trainees?threshold=${encodeURIComponent(String(Math.floor(n)))}&onlyLow=1`
    return '/gym/trainees?onlyLow=1'
  }
  return '/home'
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = (event.notification.data || {}) as Record<string, string>
  const url = urlForNotificationData(data)

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientList) {
        const w = client as WindowClient
        // focus existing tab if possible
        if ('focus' in w) {
          await w.focus()
          w.navigate(url)
          return
        }
      }
      await self.clients.openWindow(url)
    })()
  )
})

