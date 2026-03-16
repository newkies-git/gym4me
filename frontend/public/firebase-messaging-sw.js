importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// You need to replace these with the actual config values if hardcoded,
// or we can just rely on the default behavior if the app is hosted on Firebase Hosting.
// Since we are using Vite, environment variables are not directly accessible in the service worker
// without a build step for it. So we must hardcode them or use a query parameter approach.
// However, the standard approach is to use self.firebaseConfig if possible, or inject it.

// For now, we will leave it empty as a placeholder, meaning background notifications
// might require the config to be present here. Let's see if we can get away with just the SW registration.
// Actually, firebase-messaging-sw needs the config.
firebase.initializeApp({
    apiKey: "YOUR_API_KEY", // Note: This needs to be replaced during build or manually. For security, we might want to inject this.
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg' // Replace with your app icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
