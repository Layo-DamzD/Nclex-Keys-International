import { useEffect, useState } from 'react';
import axios from 'axios';

const useLandingPageContent = (pageKey) => {
  const [config, setConfig] = useState(null);
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        // Try to use the backend URL from environment, otherwise use relative path
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const url = baseUrl 
          ? `${baseUrl}/api/content/landing-page/${pageKey}`
          : `/api/content/landing-page/${pageKey}`;

        console.log('[LandingPage] Fetching config from:', url);

        const res = await axios.get(url, {
          params: { _t: Date.now() },
          timeout: 15000,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!active) return;

        console.log('[LandingPage] API Response:', res.data);

        const isObjectPayload = res && res.data && typeof res.data === 'object' && !Array.isArray(res.data);
        if (!isObjectPayload || (!Object.prototype.hasOwnProperty.call(res.data, 'config') && !Object.prototype.hasOwnProperty.call(res.data, 'hasSavedConfig'))) {
          throw new Error('Invalid landing-page API payload');
        }

        setHasSavedConfig(Boolean(res.data.hasSavedConfig));
        setConfig(res.data.config || null);
        setError(null);
      } catch (err) {
        if (!active) return;
        console.error(`[LandingPage] Failed to load config for ${pageKey}:`, err);
        console.error('[LandingPage] Error details:', err.response?.data || err.message);
        setError(err.message);
        setHasSavedConfig(false);
        setConfig(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [pageKey]);

  return { config, hasSavedConfig, loading, error };
};

export default useLandingPageContent;
