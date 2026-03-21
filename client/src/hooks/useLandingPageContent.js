import { useEffect, useState } from 'react';
import axios from 'axios';

const useLandingPageContent = (pageKey) => {
  const [config, setConfig] = useState(null);
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
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

    return () => {
      active = false;
    };
  }, [pageKey]);

  return { config, hasSavedConfig, loading };
};

export default useLandingPageContent;
