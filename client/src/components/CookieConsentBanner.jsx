import React, { useEffect, useMemo, useState } from 'react';

const CONSENT_KEY = 'nki-cookie-consent-v1';

const readConsent = () => {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!['accepted', 'declined'].includes(parsed.status)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const CookieConsentBanner = () => {
  const initialConsent = useMemo(() => readConsent(), []);
  const [consent, setConsent] = useState(initialConsent);

  useEffect(() => {
    if (!consent) return;
    try {
      localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({
          status: consent.status,
          updatedAt: Date.now(),
        })
      );
    } catch {
      // no-op
    }
  }, [consent]);

  if (consent) return null;

  return (
    <aside className="cookie-consent-banner" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <p>
        We use cookies to improve your experience, keep you signed in, and understand traffic. You can accept all
        or decline non-essential cookies.
      </p>
      <div className="cookie-consent-actions">
        <button type="button" className="btn btn-outline-secondary" onClick={() => setConsent({ status: 'declined' })}>
          Decline All
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setConsent({ status: 'accepted' })}>
          Accept All
        </button>
      </div>
    </aside>
  );
};

export default CookieConsentBanner;
