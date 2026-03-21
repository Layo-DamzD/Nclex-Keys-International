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

const CACHE_TTL_MS = 0;
const useLandingPageContent = (pageKey) => {
  const cacheKey = `landing-page-cache:v7:${pageKey}`;
const CACHE_TTL_MS = 15 * 1000;

const useLandingPageContent = (pageKey) => {
  const cacheKey = `landing-page-cache:v6:${pageKey}`;
  const cached = readCache(cacheKey);

  const [config, setConfig] = useState(cached?.config || null);
  const [hasSavedConfig, setHasSavedConfig] = useState(Boolean(cached?.hasSavedConfig));
  const isCacheFresh = cached?.cachedAt && Date.now() - cached.cachedAt < CACHE_TTL_MS;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await axios.get(`/api/content/landing-page/${pageKey}`, {
          params: { _t: Date.now() },
          timeout: 10000,
        });
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
        if (!cached) {
          setHasSavedConfig(false);
          setConfig(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    if (isCacheFresh) {
      // Still refresh in the background so the public page reflects latest admin edits quickly.
      load();
    } else {
      load();
    }

    return () => {
      active = false;
    };
  }, [isCacheFresh, pageKey]);

  return { config, hasSavedConfig, loading };
};

export default useLandingPageContent;
