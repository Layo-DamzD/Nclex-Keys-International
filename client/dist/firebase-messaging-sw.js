/* global firebase, importScripts */

(() => {
  const url = new URL(self.location.href);
  const params = url.searchParams;

  const firebaseConfig = {
    apiKey: params.get('apiKey') || undefined,
    authDomain: params.get('authDomain') || undefined,
    projectId: params.get('projectId') || undefined,
    storageBucket: params.get('storageBucket') || undefined,
    messagingSenderId: params.get('messagingSenderId') || undefined,
    appId: params.get('appId') || undefined,
    measurementId: params.get('measurementId') || undefined
  };

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.messagingSenderId || !firebaseConfig.appId) {
    return;
  }

  importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload?.notification?.title || payload?.data?.title || 'New Notification';
    const body = payload?.notification?.body || payload?.data?.body || payload?.data?.message || '';
    const link = payload?.fcmOptions?.link || payload?.data?.link || '/dashboard';

    self.registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'student-admin-notification',
      data: { link }
    });
  });

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetPath = event.notification?.data?.link || '/dashboard';

    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          try {
            const clientUrl = new URL(client.url);
            if (clientUrl.pathname === targetPath && 'focus' in client) {
              return client.focus();
            }
          } catch {
            // Ignore malformed client URLs
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetPath);
        }
        return undefined;
      })
    );
  });
})();
