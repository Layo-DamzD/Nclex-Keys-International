import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LandingLayoutRenderer from '../components/LandingLayoutRenderer';
import useLandingPageContent from '../hooks/useLandingPageContent';
import BrainiacSection from '../components/BrainiacSection';

const Brainiac = () => {
  const { config, hasSavedConfig, loading } = useLandingPageContent('brainiac');
  const homeContent = useLandingPageContent('home');
  const isStructured = hasSavedConfig && config?.mode === 'structured';
  const footerContent = homeContent?.config?.mode === 'structured' ? homeContent.config.sections?.footer : undefined;

  return (
    <div className="brainiac-page">
      <Navbar />
      <main className="brainiac-page-main">
        {loading ? (
          <div className="container mt-5 pt-5">
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
              <div className="text-center">
                <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3 text-muted">Loading Brainiacs...</p>
              </div>
            </div>
          </div>
        ) : isStructured ? (
          <div className="container mt-5 pt-5">
            <BrainiacSection content={config} />
          </div>
        ) : hasSavedConfig && config ? (
          <div className="landing-public-page">
            <div className="landing-public-scroll">
              <LandingLayoutRenderer config={config} />
            </div>
          </div>
        ) : (
          <div className="container mt-5 pt-5">
            <BrainiacSection />
          </div>
        )}
      </main>
      <Footer content={footerContent} />
    </div>
  );
};

export default Brainiac;
