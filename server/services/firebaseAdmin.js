const admin = require('firebase-admin');

let initAttempted = false;
let cachedMessaging = null;

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token'
]);

const parseServiceAccountFromEnv = () => {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    }
  } catch (error) {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON:', error.message);
    return null;
  }

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
      return JSON.parse(decoded);
    }
  } catch (error) {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT_B64:', error.message);
    return null;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: String(privateKey).replace(/\\n/g, '\n')
  };
};

const getFirebaseMessaging = () => {
  if (cachedMessaging) return cachedMessaging;
  if (initAttempted) return null;
  initAttempted = true;

  const serviceAccount = parseServiceAccountFromEnv();
  if (!serviceAccount) {
    return null;
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    cachedMessaging = admin.messaging();
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error.message);
    cachedMessaging = null;
  }

  return cachedMessaging;
};

const toStringData = (data = {}) =>
  Object.entries(data).reduce((acc, [key, value]) => {
    if (value == null) return acc;
    acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
    return acc;
  }, {});

const chunk = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const sendPushNotificationMulticast = async ({ tokens, title, body, data = {} }) => {
  const dedupedTokens = [...new Set((tokens || []).map((t) => String(t || '').trim()).filter(Boolean))];
  const messaging = getFirebaseMessaging();

  if (!messaging) {
    return {
      configured: false,
      attempted: dedupedTokens.length,
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
      skippedReason: 'firebase_admin_not_configured'
    };
  }

  if (dedupedTokens.length === 0) {
    return {
      configured: true,
      attempted: 0,
      successCount: 0,
      failureCount: 0,
      invalidTokens: []
    };
  }

  const safeTitle = String(title || 'Notification').slice(0, 120);
  const safeBody = String(body || '').slice(0, 1000);
  const safeData = toStringData(data);

  let successCount = 0;
  let failureCount = 0;
  const invalidTokens = [];

  for (const tokenBatch of chunk(dedupedTokens, 500)) {
    const payload = {
      tokens: tokenBatch,
      notification: {
        title: safeTitle,
        body: safeBody
      },
      data: safeData,
      webpush: {
        notification: {
          title: safeTitle,
          body: safeBody,
          tag: 'admin-notification',
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        },
        fcmOptions: {
          link: '/dashboard'
        }
      }
    };

    try {
      let result;
      if (typeof messaging.sendEachForMulticast === 'function') {
        result = await messaging.sendEachForMulticast(payload);
      } else if (typeof messaging.sendMulticast === 'function') {
        result = await messaging.sendMulticast(payload);
      } else {
        throw new Error('Firebase Admin messaging multicast API not available');
      }

      successCount += result.successCount || 0;
      failureCount += result.failureCount || 0;

      (result.responses || []).forEach((response, index) => {
        const code = response?.error?.code;
        if (!response?.success && INVALID_TOKEN_CODES.has(code)) {
          invalidTokens.push(tokenBatch[index]);
        }
      });
    } catch (error) {
      console.error('FCM multicast send failed:', error.message);
      failureCount += tokenBatch.length;
    }
  }

  return {
    configured: true,
    attempted: dedupedTokens.length,
    successCount,
    failureCount,
    invalidTokens: [...new Set(invalidTokens)]
  };
};

module.exports = {
  getFirebaseMessaging,
  sendPushNotificationMulticast
};
