import { useEffect, useState } from 'react';
import axios from 'axios';

// Default config when API fails
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
        items: []
      }
    }
  };
};

const useLandingPageContent = (pageKey) => {
  const [config, setConfig] = useState(() => getDefaultFallbackConfig(pageKey));
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const url = `/api/content/landing-page/${pageKey}`;
      console.log('[LandingPage] Fetching from:', url);

      try {
        // Fast timeout - 3 seconds for faster response
        const res = await axios.get(url, {
          params: { _t: Date.now() },
          timeout: 3000,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!active) return;

        console.log('[LandingPage] API Response:', res.data);

        const isObjectPayload = res && res.data && typeof res.data === 'object' && !Array.isArray(res.data);
        if (!isObjectPayload || (!Object.prototype.hasOwnProperty.call(res.data, 'config') && !Object.prototype.hasOwnProperty.call(res.data, 'hasSavedConfig'))) {
          throw new Error('Invalid API response');
        }

        setHasSavedConfig(Boolean(res.data.hasSavedConfig));
        setConfig(res.data.config || getDefaultFallbackConfig(pageKey));
        
      } catch (err) {
        if (!active) return;
        console.error('[LandingPage] API failed:', err.message);
        // Keep default config
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [pageKey]);

  return { config, hasSavedConfig, loading, error: null };
};

export default useLandingPageContent;
