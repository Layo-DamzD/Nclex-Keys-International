import React, { useMemo, useState } from 'react';
import usePwaInstall from '../hooks/usePwaInstall';

const DISMISS_KEY = 'pwa-install-dismissed-at';
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const canShowAfterDismiss = () => {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (!dismissedAt) return true;
    return Date.now() - dismissedAt > DISMISS_COOLDOWN_MS;
  } catch {
    return true;
  }
};

const persistDismiss = () => {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Ignore storage failures
  }
};

const PwaInstallPrompt = () => {
  const { canInstall, isInstalled, promptToInstallPwa } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => !canShowAfterDismiss());
  const [installing, setInstalling] = useState(false);

  const visible = useMemo(
    () => Boolean(canInstall) && !dismissed && !isInstalled,
    [canInstall, dismissed, isInstalled]
  );

  const handleDismiss = () => {
    persistDismiss();
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!canInstall) return;
    setInstalling(true);
    try {
      const result = await promptToInstallPwa();
      if (result?.outcome !== 'accepted') {
        persistDismiss();
        setDismissed(true);
      }
    } catch (error) {
      console.error('PWA install prompt failed:', error);
    } finally {
      setInstalling(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="pwa-install-prompt" role="dialog" aria-label="Install app">
      <div className="pwa-install-prompt__icon" aria-hidden="true">
        <img src="/icons/icon-192.png" alt="" />
      </div>
      <div className="pwa-install-prompt__content">
        <div className="pwa-install-prompt__title">Install nclexkeysintl.com</div>
        <div className="pwa-install-prompt__text">
          Add it to your home screen for quick access to your portal.
        </div>
      </div>
      <div className="pwa-install-prompt__actions">
        <button
          type="button"
          className="pwa-install-prompt__btn pwa-install-prompt__btn--ghost"
          onClick={handleDismiss}
          disabled={installing}
        >
          Later
        </button>
        <button
          type="button"
          className="pwa-install-prompt__btn pwa-install-prompt__btn--primary"
          onClick={handleInstall}
          disabled={installing}
        >
          {installing ? 'Installing...' : 'Install'}
        </button>
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
