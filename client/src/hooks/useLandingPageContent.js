import { useEffect, useState } from 'react';
import axios from 'axios';

const useLandingPageContent = (pageKey) => {
  const [config, setConfig] = useState(null);
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

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
        setHasSavedConfig(Boolean(res.data.hasSavedConfig));
        setConfig(res.data.config || null);
      } catch (error) {
        if (!active) return;
        console.error(`Failed to load landing page config for ${pageKey}:`, error);
        setHasSavedConfig(false);
        setConfig(null);
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
