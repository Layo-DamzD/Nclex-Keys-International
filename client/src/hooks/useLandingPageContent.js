import { useEffect, useState } from 'react';
import axios from 'axios';

// Default config to use when API fails completely
// IMPORTANT: testimonials.items is EMPTY - real testimonials come from API
const getDefaultFallbackConfig = (pageKey) => {
  if (pageKey === 'brainiac') {
    return {
      mode: 'structured',
      header: { title: 'Meet Our Brainiacs', subtitle: 'Meet the tutors guiding your NCLEX success.' },
      tutors: []
    };
  }

  return {
    mode: 'structured',
    sectionOrder: ['hero', 'stats', 'program', 'testimonials'],
    sections: {
      hero: {
        badgeText: '97% First-Time Pass Rate',
        titleBefore: 'Unlock Your ',
        titleHighlight: 'NCLEX Success',
        titleAfter: ' with Expert Coaching',
        description: 'NCLEX KEYS International provides comprehensive training for nursing graduates to pass the NCLEX-RN/PN exams with confidence.',
        features: ['Personalized Study Plans', '10,000+ Practice Questions', 'Live Virtual Classes'],
        ctaText: 'Get Started',
        ctaUrl: '/signup'
      },
      stats: {
        items: [
          { label: 'Nurses Trained', target: 2500, suffix: '+' },
          { label: 'Pass Rate', target: 97, suffix: '%' },
          { label: 'Practice Questions', target: 10000, suffix: '+' },
          { label: 'Tutor Support', value: '24/7' }
        ]
      },
      program: {
        heading: 'Why Choose NCLEX KEYS?',
        subheading: 'Strategic, intensive coaching that transforms NCLEX preparation into confident success.',
        cards: [
          { icon: 'fa-bullseye', title: 'Strategic Coaching', text: 'Intensive, results-driven coaching that meticulously decodes NCLEX exam logic.' },
          { icon: 'fa-chalkboard-user', title: 'Expert Mentorship', text: 'Learn from RNs and experienced educators with 25+ years of clinical practice.' },
          { icon: 'fa-award', title: 'Proven Success', text: 'Over 100 aspiring nurses successfully guided to NCLEX licensure with confidence.' },
          { icon: 'fa-book-open', title: 'Comprehensive Content', text: 'High-quality learning materials designed for immediate professional success.' },
          { icon: 'fa-circle-check', title: 'Confidence Building', text: 'Transform from anxious test taker to confident, competent clinician.' },
          { icon: 'fa-users', title: 'Global Engagement', text: 'Strategic collaboration and support for nursing professionals worldwide.' },
          { icon: 'fa-gears', title: 'Customized Study Plan', text: 'Personalized preparation roadmap focused on your weak areas and exam goals.' },
          { icon: 'fa-graduation-cap', title: 'NCLEX Expertise', text: 'Specialized focus on NCLEX-RN and NCLEX-PN exam patterns and question styles.' },
          { icon: 'fa-clock', title: 'Flexible Scheduling', text: 'Study at your own pace with 24/7 access to resources and live support sessions.' }
        ],
        missionVision: {
          heading: 'Our Mission & Vision',
          cards: [
            { icon: 'fa-bullseye', title: 'Mission', text: 'NCLEX KEYS is dedicated to empowering future nurses by providing intensive, results-driven coaching and strategic mentorship.' },
            { icon: 'fa-people-arrows', title: 'Vision', text: 'To be the globally recognized premier standard for strategic NCLEX preparation, transforming aspiring nurses into confident, licensed clinicians.' }
          ]
        }
      },
      testimonials: {
        heading: 'Success Stories',
        subheading: 'Hear from our graduates who passed NCLEX',
        items: [] // Empty - real testimonials loaded from API
      }
    }
  };
};

const useLandingPageContent = (pageKey) => {
  const [config, setConfig] = useState(null);
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const url = `/api/content/landing-page/${pageKey}`;
      console.log('[LandingPage] Fetching config from:', url);

      // Try up to 3 times with increasing timeouts (for Render cold starts)
      const maxRetries = 3;
      const timeouts = [10000, 20000, 30000]; // 10s, 20s, 30s
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const res = await axios.get(url, {
            params: { _t: Date.now() },
            timeout: timeouts[attempt],
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
          setLoading(false);
          return; // Success, exit
          
        } catch (err) {
          if (!active) return;
          
          console.error(`[LandingPage] Attempt ${attempt + 1} failed:`, err.message);
          
          // If this was the last attempt, use fallback
          if (attempt === maxRetries - 1) {
            console.error('[LandingPage] All retries failed, using fallback config');
            const fallbackConfig = getDefaultFallbackConfig(pageKey);
            setError(err.message);
            setHasSavedConfig(false);
            setConfig(fallbackConfig);
            setLoading(false);
          } else {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
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
