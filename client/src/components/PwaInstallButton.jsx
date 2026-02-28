import React, { useState } from 'react';
import usePwaInstall from '../hooks/usePwaInstall';

const PwaInstallButton = ({
  label = 'Install App',
  compactLabel = 'Install',
  className = '',
  variant = 'default',
  iconOnly = false,
  title = 'Install nclexkeysintl.com'
}) => {
  const { canInstall, isInstalled, promptToInstallPwa } = usePwaInstall();
  const [installing, setInstalling] = useState(false);

  if (!canInstall || isInstalled) return null;

  const handleClick = async () => {
    setInstalling(true);
    try {
      await promptToInstallPwa();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <button
      type="button"
      className={`pwa-install-inline-btn pwa-install-inline-btn--${variant} ${className}`.trim()}
      onClick={handleClick}
      disabled={installing}
      title={title}
      aria-label={title}
    >
      <i className="fas fa-download" aria-hidden="true" />
      {!iconOnly && (
        <>
          <span className="pwa-install-inline-btn__label d-none d-sm-inline">
            {installing ? 'Installing...' : label}
          </span>
          <span className="pwa-install-inline-btn__label d-sm-none">
            {installing ? 'Installing...' : compactLabel}
          </span>
        </>
      )}
    </button>
  );
};

export default PwaInstallButton;
