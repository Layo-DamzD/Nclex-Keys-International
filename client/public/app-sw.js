/* global importScripts */
/* Unified service worker: installable PWA caching + Firebase background messaging */

const SW_VERSION = 'nki-app-sw-v4';
const APP_SHELL_CACHE = `${SW_VERSION}-shell`;
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;
const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1']);
const IS_LOCALHOST = LOCALHOST_HOSTNAMES.has(self.location.hostname);

const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/images/logo.png.jpg'
];

const sameOrigin = (url) => {
  try {
    return new URL(url).origin === self.location.origin;
  } catch {
    return false;
  }
};

const shouldSkipRequest = (requestUrl) => {
  let url;
  try {
    url = new URL(requestUrl);
  } catch {
    return true;
  }

  if (!sameOrigin(requestUrl)) return true;
  if (url.pathname.startsWith('/api/')) return true;
  if (url.pathname.startsWith('/__vite')) return true;
  if (url.pathname.startsWith('/@vite')) return true;
  if (url.pathname.startsWith('/src/')) return true;
  if (url.pathname.startsWith('/node_modules/')) return true;
  return false;
};

const cachePutSafe = async (cacheName, request, response) => {
  if (!response || response.status !== 200 || response.type === 'opaque') {
    return response;
  }
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  return response;
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then(async (cache) => {
      for (const url of PRECACHE_URLS) {
        try {
          await cache.add(new Request(url, { cache: 'reload' }));
        } catch {
          // Ignore individual cache failures (e.g., during local dev).
        }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (IS_LOCALHOST) return;
  if (!request || request.method !== 'GET') return;
  if (shouldSkipRequest(request.url)) return;

  const requestUrl = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          cachePutSafe(RUNTIME_CACHE, request, networkResponse.clone());
          return networkResponse;
        } catch {
          const cachedMatch =
            (await caches.match(request)) ||
            (await caches.match('/'));
          if (cachedMatch) return cachedMatch;
          throw new Error('Offline and no cached shell available');
        }
      })()
    );
    return;
  }

  const isScriptLikeAsset =
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'manifest' ||
    /\.(?:js|css|woff2?|json)$/i.test(requestUrl.pathname);

  const isImageAsset =
    request.destination === 'image' ||
    /\.(?:png|jpg|jpeg|svg|webp|gif)$/i.test(requestUrl.pathname);

  if (!isScriptLikeAsset && !isImageAsset) return;

  event.respondWith(
    (async () => {
      if (isScriptLikeAsset) {
        try {
          const freshResponse = await fetch(request, { cache: 'no-store' });
          return cachePutSafe(RUNTIME_CACHE, request, freshResponse.clone());
        } catch {
          return await caches.match(request);
        }
      }

      const cached = await caches.match(request);
      const networkPromise = fetch(request)
        .then((response) => cachePutSafe(RUNTIME_CACHE, request, response))
        .catch(() => null);

      if (cached) {
        event.waitUntil(networkPromise);
        return cached;
      }

      const networkResponse = await networkPromise;
      if (networkResponse) return networkResponse;
      return caches.match('/icons/icon-192.png');
    })()
  );
});

// Firebase Cloud Messaging (background notifications) using public config from SW query params.
(() => {
  try {
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

    if (
      !firebaseConfig.apiKey ||
      !firebaseConfig.projectId ||
      !firebaseConfig.messagingSenderId ||
      !firebaseConfig.appId
    ) {
      return;
    }

    importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

    if (!self.firebase?.apps?.length) {
      self.firebase.initializeApp(firebaseConfig);
    }

    const messaging = self.firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const title =
        payload?.notification?.title ||
        payload?.data?.title ||
        'New Notification';
      const body =
        payload?.notification?.body ||
        payload?.data?.body ||
        payload?.data?.message ||
        '';
      const link =
        payload?.fcmOptions?.link ||
        payload?.data?.link ||
        '/dashboard';

      self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'student-admin-notification',
        data: { link }
      });
    });
  } catch {
    // Keep the PWA service worker functional even if Firebase scripts fail.
  }
})();

self.addEventListener('notificationclick', (event) => {
  event.notification?.close();
  const targetPath = event.notification?.data?.link || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin) {
            if ('focus' in client) {
              client.postMessage({ type: 'PWA_NOTIFICATION_CLICKED', targetPath });
              return client.navigate(targetPath).then(() => client.focus());
            }
          }
        } catch {
          // ignore malformed client URLs
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetPath);
      }
      return undefined;
    })
  );
});
