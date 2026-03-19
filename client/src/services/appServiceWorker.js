const getFirebasePublicConfig = () => ({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
});

const buildAppServiceWorkerUrl = () => {
  const params = new URLSearchParams();
  params.set('swv', '4');

  const firebaseConfig = getFirebasePublicConfig();
  Object.entries(firebaseConfig).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return `/app-sw.js?${params.toString()}`;
};

let registrationPromise = null;

export const registerAppServiceWorker = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  if (registrationPromise) {
    return registrationPromise;
  }

  registrationPromise = navigator.serviceWorker
    .register(buildAppServiceWorkerUrl(), { updateViaCache: 'none' })
    .catch((error) => {
      console.error('Failed to register app service worker:', error);
      registrationPromise = null;
      return null;
    });

  return registrationPromise;
};

export const getAppServiceWorkerUrl = buildAppServiceWorkerUrl;
