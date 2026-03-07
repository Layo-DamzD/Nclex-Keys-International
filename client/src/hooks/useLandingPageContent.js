import { useEffect, useState } from 'react';
import axios from 'axios';

const useLandingPageContent = (pageKey) => {
  const [config, setConfig] = useState(null);
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const cacheKey = `landing-page-cache:v2:${pageKey}`;

  useEffect(() => {
    let active = true;

    const readCachedConfig = () => {
      try {
        const raw = localStorage.getItem(cacheKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
      } catch {
        return null;
      }
    };

    const writeCachedConfig = (payload) => {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch {
        // Ignore storage errors
      }
    };

    const load = async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }
      try {
        const res = await axios.get(`/api/content/landing-page/${pageKey}`, {
          params: { _t: Date.now() },
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        });
        if (!active) return;
        const isObjectPayload =
          res &&
          res.data &&
          typeof res.data === 'object' &&
          !Array.isArray(res.data);

        // Guard against misrouted deployments returning index.html with 200.
        if (!isObjectPayload || (!Object.prototype.hasOwnProperty.call(res.data, 'config') && !Object.prototype.hasOwnProperty.call(res.data, 'hasSavedConfig'))) {
          throw new Error('Invalid landing-page API payload');
        }

        const payload = {
          hasSavedConfig: Boolean(res.data.hasSavedConfig),
          config: res.data.config || null,
          cachedAt: Date.now()
        };
        // Do not overwrite a valid cache with empty/null payloads from transient backend issues.
        if (!payload.hasSavedConfig && !payload.config) {
          const cached = readCachedConfig();
          if (cached?.config) {
            setHasSavedConfig(Boolean(cached.hasSavedConfig));
            setConfig(cached.config || null);
            return;
          }
        }
        setHasSavedConfig(payload.hasSavedConfig);
        setConfig(payload.config);
        writeCachedConfig(payload);
      } catch (error) {
        if (!active) return;
        console.error(`Failed to load landing page config for ${pageKey}:`, error);
        const cached = readCachedConfig();
        if (cached) {
          setHasSavedConfig(Boolean(cached.hasSavedConfig));
          setConfig(cached.config || null);
        } else {
          setHasSavedConfig(false);
          setConfig(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    const handleFocusRefresh = () => {
      if (!active) return;
      load({ silent: true });
    };

    const handleVisibilityRefresh = () => {
      if (document.visibilityState !== 'visible') return;
      handleFocusRefresh();
    };

    window.addEventListener('focus', handleFocusRefresh);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);

    return () => {
      active = false;
      window.removeEventListener('focus', handleFocusRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    };
  }, [pageKey]);

  return { config, hasSavedConfig, loading };
};

export default useLandingPageContent;
