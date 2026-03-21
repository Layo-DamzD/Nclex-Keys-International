import React, { useEffect } from 'react';
import AOS from 'aos';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Stats from '../components/Stats';
import Program from '../components/Program';
import Testimonials from '../components/Testimonials';
import Footer from '../components/Footer';
import LandingLayoutRenderer from '../components/LandingLayoutRenderer';
import useLandingPageContent from '../hooks/useLandingPageContent';

const HOME_SECTION_FALLBACK_ORDER = ['hero', 'stats', 'program', 'testimonials'];
const TESTIMONIAL_SECTION_ALIASES = ['testimonials', 'successStories', 'success', 'successStory'];

const Home = () => {
  const { config, hasSavedConfig, loading, error } = useLandingPageContent('home');
  
  // Debug logging
  useEffect(() => {
    console.log('[Home] State:', { hasSavedConfig, loading, error, configMode: config?.mode });
    if (config?.sections?.program?.cards) {
      console.log('[Home] Program cards count:', config.sections.program.cards.length);
    }
    if (config?.sections?.testimonials?.items) {
      console.log('[Home] Testimonials count:', config.sections.testimonials.items.length);
    }
  }, [config, hasSavedConfig, loading, error]);

  // Check if config has structured mode - this should work regardless of hasSavedConfig
  const isStructured = config?.mode === 'structured';
  const incomingOrder = Array.isArray(config?.sectionOrder) ? config.sectionOrder : [];
  const normalizeSectionKey = (sectionKey) => (
    TESTIMONIAL_SECTION_ALIASES.includes(sectionKey) ? 'testimonials' : sectionKey
  );

  const order = [
    ...new Set(
      [...incomingOrder.map(normalizeSectionKey), ...HOME_SECTION_FALLBACK_ORDER].filter((sectionKey) =>
        HOME_SECTION_FALLBACK_ORDER.includes(sectionKey)
      )
    ),
  ];
  const sections = config?.sections || {};

  useEffect(() => {
    AOS.refresh(); // Refresh AOS after dynamic content loads
  }, [isStructured, config]);

  const renderStructuredSection = (sectionKey) => {
    if (sectionKey === 'hero') return <Hero content={sections.hero} key="hero" />;
    if (sectionKey === 'stats') return <Stats content={sections.stats} key="stats" />;
    if (sectionKey === 'program') return <Program content={sections.program} key="program" />;
    if (sectionKey === 'testimonials') {
      const testimonialContent =
        sections.testimonials ||
        sections.successStories ||
        sections.success ||
        sections.successStory ||
        { items: [] };
      return <Testimonials content={testimonialContent} key="testimonials" />;
    }
    return null;
  };

  // Show loading state instead of fallback content to prevent flicker
  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ 
          minHeight: '60vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p style={{ color: '#666' }}>Loading content...</p>
        </div>
      </>
    );
  }

  // Show error state if API failed
  if (error) {
    console.error('[Home] API Error, showing fallback:', error);
  }

  return (
    <>
      <Navbar />
      {isStructured ? (
        <>{order.map(renderStructuredSection)}</>
      ) : config ? (
        <>
          <Hero content={sections.hero} />
          <div className="landing-public-page">
            <div className="landing-public-scroll">
              <LandingLayoutRenderer config={config} />
            </div>
          </div>
        </>
      ) : (
        <>
          <Hero />
          <Stats />
          <Program />
          <Testimonials />
        </>
      )}
      <Footer content={isStructured ? sections.footer : undefined} />
    </>
  );
};

export default Home;
