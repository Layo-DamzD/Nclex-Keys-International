let initialized = false;
let deferredPromptEvent = null;
let installed = false;
let mediaQueryList = null;

const listeners = new Set();

const detectStandalone = () => {
  if (typeof window === 'undefined') return false;
  const iosStandalone = Boolean(window.navigator?.standalone);
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches;
  return iosStandalone || Boolean(mediaStandalone);
};

const emit = () => {
  const snapshot = getPwaInstallSnapshot();
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      console.error('PWA install listener failed:', error);
    }
  });
};

const handleBeforeInstallPrompt = (event) => {
  event.preventDefault();
  deferredPromptEvent = event;
  installed = detectStandalone();
  emit();
};

const handleAppInstalled = () => {
  installed = true;
  deferredPromptEvent = null;
  emit();
};

const handleDisplayModeChange = () => {
  installed = detectStandalone();
  if (installed) {
    deferredPromptEvent = null;
  }
  emit();
};

const ensureInitialized = () => {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  installed = detectStandalone();

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);

  try {
    mediaQueryList = window.matchMedia?.('(display-mode: standalone)') || null;
    if (mediaQueryList) {
      if (typeof mediaQueryList.addEventListener === 'function') {
        mediaQueryList.addEventListener('change', handleDisplayModeChange);
      } else if (typeof mediaQueryList.addListener === 'function') {
        mediaQueryList.addListener(handleDisplayModeChange);
      }
    }
  } catch {
    mediaQueryList = null;
  }
};

export const getPwaInstallSnapshot = () => ({
  canInstall: Boolean(deferredPromptEvent) && !installed,
  isInstalled: Boolean(installed)
});

export const subscribeToPwaInstall = (listener) => {
  ensureInitialized();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const promptToInstallPwa = async () => {
  ensureInitialized();

  if (!deferredPromptEvent) {
    return { ok: false, reason: 'no_install_prompt_available' };
  }

  const event = deferredPromptEvent;
  // The event is single-use. Clear first so UI updates immediately.
  deferredPromptEvent = null;
  emit();

  try {
    await event.prompt();
    const result = await event.userChoice;
    return {
      ok: result?.outcome === 'accepted',
      outcome: result?.outcome || 'unknown'
    };
  } catch (error) {
    console.error('PWA install prompt invocation failed:', error);
    return { ok: false, reason: 'prompt_failed' };
  }
};

export const initPwaInstallTracking = () => {
  ensureInitialized();
};
