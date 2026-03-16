import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LandingLayoutRenderer from '../components/LandingLayoutRenderer';
import useLandingPageContent from '../hooks/useLandingPageContent';
import BrainiacSection from '../components/BrainiacSection';

const Brainiac = () => {
  const { config, hasSavedConfig } = useLandingPageContent('brainiac');
  const homeContent = useLandingPageContent('home');
  const isStructured = hasSavedConfig && config?.mode === 'structured';
  const footerContent = homeContent?.config?.mode === 'structured' ? homeContent.config.sections?.footer : undefined;

  return (
    <div className="brainiac-page">
      <Navbar />
      <main className="brainiac-page-main">
        {isStructured ? (
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
            <h1 className="text-center mb-4">Meet Our Brainiacs</h1>
            <p className="text-center lead mb-5">No Brainiac profiles published yet.</p>
          </div>
        )}
      </main>
      <Footer content={footerContent} />
    </div>
  );
};

export default Brainiac;
