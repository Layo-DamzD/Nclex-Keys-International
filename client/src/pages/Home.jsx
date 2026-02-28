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

const Home = () => {
  const { config, hasSavedConfig } = useLandingPageContent('home');
  const isStructured = hasSavedConfig && config?.mode === 'structured';
  const order = Array.isArray(config?.sectionOrder) && config.sectionOrder.length
    ? config.sectionOrder
    : ['hero', 'stats', 'program', 'testimonials'];
  const sections = config?.sections || {};

  useEffect(() => {
    AOS.refresh(); // Refresh AOS after dynamic content loads
  }, [isStructured, config]);

  const renderStructuredSection = (sectionKey) => {
    if (sectionKey === 'hero') return <Hero content={sections.hero} key="hero" />;
    if (sectionKey === 'stats') return <Stats content={sections.stats} key="stats" />;
    if (sectionKey === 'program') return <Program content={sections.program} key="program" />;
    if (sectionKey === 'testimonials') return <Testimonials content={sections.testimonials} key="testimonials" />;
    return null;
  };

  return (
    <>
      <Navbar />
      {isStructured ? (
        <>{order.map(renderStructuredSection)}</>
      ) : hasSavedConfig && config ? (
        <div className="landing-public-page">
          <div className="landing-public-scroll">
            <LandingLayoutRenderer config={config} />
          </div>
        </div>
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
