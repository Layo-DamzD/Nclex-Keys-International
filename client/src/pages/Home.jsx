import React, { useEffect, useState } from 'react';
import AOS from 'aos';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Stats from '../components/Stats';
import Program from '../components/Program';
import Testimonials from '../components/Testimonials';
import Footer from '../components/Footer';
import LandingLayoutRenderer from '../components/LandingLayoutRenderer';
import useLandingPageContent from '../hooks/useLandingPageContent';
import ChatWidget from '../components/ChatWidget';

const HOME_SECTION_FALLBACK_ORDER = ['hero', 'stats', 'program', 'testimonials'];
const TESTIMONIAL_SECTION_ALIASES = ['testimonials', 'successStories', 'success', 'successStory'];

// Fallback components for error state
const FallbackContent = () => (
  <>
    <Hero />
    <Stats />
    <Program />
    <Testimonials />
  </>
);

const Home = () => {
  const { config, hasSavedConfig, loading, error } = useLandingPageContent('home');
  const [renderError, setRenderError] = useState(null);
  
  // Check if config has structured mode - this should work regardless of hasSavedConfig
  const isStructured = config?.mode === 'structured';
  const incomingOrder = Array.isArray(config?.sectionOrder) ? config.sectionOrder : [];
  
  const normalizeSectionKey = (sectionKey) => (
    TESTIMONIAL_SECTION_ALIASES.includes(sectionKey) ? 'testimonials' : sectionKey
  );

  // Build order - always include all sections, prioritizing incomingOrder
  // IMPORTANT: testimonials must always be in the order!
  const order = [
    ...new Set(
      [...incomingOrder.map(normalizeSectionKey), ...HOME_SECTION_FALLBACK_ORDER].filter((sectionKey) =>
        HOME_SECTION_FALLBACK_ORDER.includes(sectionKey)
      )
    ),
  ];
  
  // Ensure testimonials is ALWAYS in the order (in case it got filtered out)
  if (!order.includes('testimonials')) {
    order.push('testimonials');
  }
  
  const sections = config?.sections || {};

  // Debug logging - AFTER all variables are defined
  useEffect(() => {
    console.log('[Home] ====== RENDER ======');
    console.log('[Home] State:', { hasSavedConfig, loading, error, configMode: config?.mode, isStructured });
    console.log('[Home] incomingOrder:', incomingOrder);
    console.log('[Home] order (derived):', order);
    console.log('[Home] sections keys:', Object.keys(sections));
    
    // Check program
    if (sections?.program?.cards) {
      console.log('[Home] Program cards count:', sections.program.cards.length);
    }
    
    // Check testimonials in all possible locations
    const possibleTestimonialKeys = ['testimonials', 'successStories', 'success', 'successStory'];
    possibleTestimonialKeys.forEach(key => {
      if (sections[key]?.items) {
        console.log(`[Home] Found testimonials at sections.${key}.items: ${sections[key].items.length} items`);
      }
    });
    
    console.log('[Home] sections.testimonials:', sections.testimonials);
  }, [config, hasSavedConfig, loading, error, isStructured, order, incomingOrder, sections]);

  useEffect(() => {
    AOS.refresh(); // Refresh AOS after dynamic content loads
  }, [isStructured, config]);

  // ⭐ PRELOAD SUCCESS STORIES IMMEDIATELY ON PAGE ENTRY
  useEffect(() => {
    const preloadTestimonialImages = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://nclex-keys-international.onrender.com';
        const response = await fetch(`${apiUrl}/api/landing-page/home`);
        const configData = await response.json();
        
        const testimonialContent =
          configData?.sections?.testimonials ||
          configData?.sections?.successStories ||
          configData?.sections?.success ||
          configData?.sections?.successStory ||
          { items: [] };
        
        const testimonials = testimonialContent?.items || [];
        
        if (testimonials.length > 0) {
          console.log('[Home] 🚀 Preloading', testimonials.length, 'testimonial images immediately on page entry...');
          testimonials.forEach((testimonial, index) => {
            const imgUrl = testimonial.imageUrl || testimonial.avatar;
            if (imgUrl) {
              const img = new window.Image();
              img.src = imgUrl;
            }
          });
        }
      } catch (err) {
        console.warn('[Home] Could not preload testimonial images:', err);
      }
    };
    
    // Run immediately on mount
    preloadTestimonialImages();
  }, []); // Empty deps - runs once on mount

  // Error boundary - if render fails, show fallback
  useEffect(() => {
    const handleError = (event) => {
      console.error('[Home] Render error:', event.error);
      setRenderError(event.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const renderStructuredSection = (sectionKey) => {
    console.log('[Home] Rendering section:', sectionKey);
    
    try {
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
        console.log('[Home] Testimonial content being passed:', testimonialContent);
        console.log('[Home] Testimonial items count:', testimonialContent?.items?.length || 0);
        return <Testimonials content={testimonialContent} key="testimonials" />;
      }
    } catch (err) {
      console.error(`[Home] Error rendering section ${sectionKey}:`, err);
      return null;
    }
    return null;
  };

  // Show loading state instead of fallback content to prevent flicker
  // BUT with a maximum loading time of 3 seconds
  const [maxLoadTimeReached, setMaxLoadTimeReached] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log('[Home] Max load time reached, showing content');
        setMaxLoadTimeReached(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading && !maxLoadTimeReached) {
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

  // Show error state if API failed - render fallback content
  if (error || renderError) {
    console.error('[Home] Error detected, showing fallback:', error || renderError);
    return (
      <>
        <Navbar />
        <FallbackContent />
        <Footer />
        <ChatWidget />
      </>
    );
  }

  // If still loading after max time, show fallback instead of blank
  if (loading && maxLoadTimeReached) {
    return (
      <>
        <Navbar />
        <FallbackContent />
        <Footer />
        <ChatWidget />
      </>
    );
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
        <FallbackContent />
      )}
      <Footer content={isStructured ? sections.footer : undefined} />
      <ChatWidget />
    </>
  );
};

export default Home;
