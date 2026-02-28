import axios from 'axios';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { registerAppServiceWorker } from './appServiceWorker';

const PROMPTED_STORAGE_KEY = 'student-fcm-permission-prompted:v1';
const TOKEN_STORAGE_KEY = 'student-fcm-token';

let foregroundUnsubscribe = null;

const getFirebaseConfig = () => ({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
});

const hasFirebaseMessagingConfig = (config) =>
  Boolean(config.apiKey && config.projectId && config.messagingSenderId && config.appId);

const getVapidKey = () => import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

const getFirebaseApp = () => {
  const config = getFirebaseConfig();
  if (!hasFirebaseMessagingConfig(config)) {
    return null;
  }
  if (getApps().length) return getApp();
  return initializeApp(config);
};

const requestNotificationPermissionOnce = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { granted: false, reason: 'notification_api_unsupported' };
  }

  if (Notification.permission === 'granted') {
    return { granted: true };
  }

  if (Notification.permission === 'denied') {
    return { granted: false, reason: 'permission_denied' };
  }

  const alreadyPrompted = localStorage.getItem(PROMPTED_STORAGE_KEY) === '1';
  if (alreadyPrompted) {
    return { granted: false, reason: 'permission_not_granted' };
  }

  localStorage.setItem(PROMPTED_STORAGE_KEY, '1');
  const permission = await Notification.requestPermission();
  return {
    granted: permission === 'granted',
    reason: permission === 'granted' ? null : 'permission_not_granted'
  };
};

const normalizeForegroundPayload = (payload) => {
  const title = payload?.notification?.title || payload?.data?.title || 'New Notification';
  const body = payload?.notification?.body || payload?.data?.body || payload?.data?.message || '';
  return { title, body, payload };
};

const notifyForeground = ({ title, body }) => {
  if (typeof window === 'undefined') return;

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body,
        icon: '/icons/icon-192.png',
        tag: 'student-admin-notification'
      });
      window.setTimeout(() => notification.close(), 5000);
    } catch {
      // Ignore browser notification constructor errors and continue with in-app refresh.
    }
  }

  window.dispatchEvent(new CustomEvent('student-notification:refresh'));
};

export const enableStudentFcm = async ({ authToken, onForegroundMessage } = {}) => {
  if (!authToken) {
    return { enabled: false, reason: 'missing_auth_token' };
  }

  const config = getFirebaseConfig();
  const vapidKey = getVapidKey();
  if (!hasFirebaseMessagingConfig(config) || !vapidKey) {
    return { enabled: false, reason: 'missing_firebase_env' };
  }

  if (typeof window === 'undefined') {
    return { enabled: false, reason: 'not_in_browser' };
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    return { enabled: false, reason: 'messaging_not_supported' };
  }

  const permission = await requestNotificationPermissionOnce();
  if (!permission.granted) {
    return { enabled: false, reason: permission.reason || 'notification_permission_not_granted' };
  }

  const app = getFirebaseApp();
  if (!app) {
    return { enabled: false, reason: 'firebase_not_initialized' };
  }

  const registration = await registerAppServiceWorker();
  const messaging = getMessaging(app);
  const fcmToken = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration || undefined
  });

  if (!fcmToken) {
    return { enabled: false, reason: 'token_not_available' };
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, fcmToken);

  await axios.post(
    '/api/student/fcm-token',
    { token: fcmToken },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  if (typeof foregroundUnsubscribe === 'function') {
    foregroundUnsubscribe();
    foregroundUnsubscribe = null;
  }

  foregroundUnsubscribe = onMessage(messaging, (payload) => {
    const normalized = normalizeForegroundPayload(payload);
    notifyForeground(normalized);
    if (typeof onForegroundMessage === 'function') {
      onForegroundMessage(normalized);
    }
  });

  return {
    enabled: true,
    token: fcmToken,
    unsubscribe: foregroundUnsubscribe
  };
};

export const unregisterStudentFcm = async ({ authToken } = {}) => {
  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!storedToken) return { removed: false, reason: 'no_local_token' };

  try {
    if (authToken) {
      await axios.delete('/api/student/fcm-token', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { token: storedToken }
      });
    }
  } catch (error) {
    console.error('Failed to unregister FCM token:', error);
  } finally {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  if (typeof foregroundUnsubscribe === 'function') {
    foregroundUnsubscribe();
    foregroundUnsubscribe = null;
  }

  return { removed: true };
};
