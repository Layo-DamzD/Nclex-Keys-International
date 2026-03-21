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

const CACHE_TTL_MS = 30 * 1000; // 30 seconds - reduced to ensure fresher data
const CACHE_VERSION = 'v9'; // Bumped cache version to force fresh load

const useLandingPageContent = (pageKey) => {
  const cacheKey = `landing-page-cache:${CACHE_VERSION}:${pageKey}`;
  
  const [config, setConfig] = useState(null);
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    
    // Read cache inside useEffect to avoid stale closures
    const cached = readCache(cacheKey);
    const isCacheFresh = cached?.cachedAt && Date.now() - cached.cachedAt < CACHE_TTL_MS;

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
        // On error, use cached data if available
        if (cached) {
          setHasSavedConfig(cached.hasSavedConfig);
          setConfig(cached.config);
        } else {
          setHasSavedConfig(false);
          setConfig(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    // If cache is fresh, use it immediately without re-fetching
    if (isCacheFresh && cached) {
      setHasSavedConfig(cached.hasSavedConfig);
      setConfig(cached.config);
      setLoading(false);
    } else {
      // Otherwise fetch fresh data - don't show stale cache to avoid flicker
      load();
    }

    return () => {
      active = false;
    };
  }, [pageKey, cacheKey]);

  return { config, hasSavedConfig, loading };
};

export default useLandingPageContent;
