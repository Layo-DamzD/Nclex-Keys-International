import { useEffect, useState } from 'react';
import axios from 'axios';

const readCache = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (key, payload) => {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore
  }
};

const useLandingPageContent = (pageKey) => {
  const cacheKey = `landing-page-cache:v3:${pageKey}`;
  const cached = readCache(cacheKey);

  const [config, setConfig] = useState(cached?.config || null);
  const [hasSavedConfig, setHasSavedConfig] = useState(Boolean(cached?.hasSavedConfig));
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!cached) setLoading(true);
      try {
        const res = await axios.get(`/api/content/landing-page/${pageKey}`);
        if (!active) return;

        const isObjectPayload = res && res.data && typeof res.data === 'object' && !Array.isArray(res.data);
        if (!isObjectPayload || (!Object.prototype.hasOwnProperty.call(res.data, 'config') && !Object.prototype.hasOwnProperty.call(res.data, 'hasSavedConfig'))) {
          throw new Error('Invalid landing-page API payload');
        }

        const payload = {
          hasSavedConfig: Boolean(res.data.hasSavedConfig),
          config: res.data.config || null,
          cachedAt: Date.now(),
        };

        setHasSavedConfig(payload.hasSavedConfig);
        setConfig(payload.config);
        writeCache(cacheKey, payload);
      } catch (error) {
        if (!active) return;
        console.error(`Failed to load landing page config for ${pageKey}:`, error);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [pageKey]);

  return { config, hasSavedConfig, loading };
};

export default useLandingPageContent;
