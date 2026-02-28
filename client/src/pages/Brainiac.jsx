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
            <p className="text-center lead mb-5">Coming soon - Our expert tutors will be displayed here!</p>
            
            <div className="row">
              <div className="col-md-4 mb-4">
                <div className="card">
                  <div className="card-body text-center">
                    <i className="fas fa-user-graduate fa-4x mb-3 text-primary"></i>
                    <h5>Dr. Sarah Johnson</h5>
                    <p className="text-muted">PhD, Nursing Education</p>
                    <p>Specializes in Pharmacology and Critical Care</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="card">
                  <div className="card-body text-center">
                    <i className="fas fa-user-md fa-4x mb-3 text-success"></i>
                    <h5>Prof. Michael Chen</h5>
                    <p className="text-muted">MSN, RN</p>
                    <p>Expert in Medical-Surgical Nursing</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="card">
                  <div className="card-body text-center">
                    <i className="fas fa-user-nurse fa-4x mb-3 text-info"></i>
                    <h5>Dr. Amanda Rodriguez</h5>
                    <p className="text-muted">DNP, APRN</p>
                    <p>Pediatric and Maternal-Child Health Specialist</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer content={footerContent} />
    </div>
  );
};

export default Brainiac;
