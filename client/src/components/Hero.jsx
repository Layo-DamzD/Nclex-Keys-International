import React from 'react';
import { Link } from 'react-router-dom';

const DEFAULT_CONTENT = {
  badgeText: '97% First-Time Pass Rate',
  titleBefore: 'Unlock Your ',
  titleHighlight: 'NCLEX Success',
  titleAfter: ' with Expert Coaching',
  description:
    'NCLEX KEYS International provides comprehensive training for nursing graduates to pass the NCLEX-RN/PN exams with confidence. Join thousands of successful nurses.',
  features: ['Personalized Study Plans', '10,000+ Practice Questions', 'Live Virtual Classes'],
  ctaText: 'Get Started',
  ctaUrl: '/signup',
  videoUrl: 'https://www.youtube.com/embed/7ILVwUsfrAc',
  gradientStart: '#0d6efd',
  gradientEnd: '#6f42c1',
  titleHighlightColor: '#dc2626',
};

const Hero = ({ content = {} }) => {
  const data = { ...DEFAULT_CONTENT, ...content };
  const features = Array.isArray(data.features) && data.features.length ? data.features : DEFAULT_CONTENT.features;

  return (
    <section id="home" className="hero-section" style={{ 
      background: `linear-gradient(135deg, ${data.gradientStart} 0%, ${data.gradientEnd} 60%)`, 
      color: 'white', 
      padding: '80px 0', 
      borderRadius: '0 0 50px 50px', 
      marginTop: '80px' 
    }}>
      <div className="container-fluid px-0">
        <div className="row align-items-center g-0 nki-hero-row">
          {/* Text Column - Left with padding */}
          <div className="col-lg-6 nki-hero-copy-col" data-aos="fade-right" style={{ paddingLeft: '3rem', paddingRight: '2rem' }}>
            <div className="success-badge mb-4" style={{ 
              background: 'rgba(255,255,255,0.2)', 
              border: '1px solid white', 
              color: 'white', 
              padding: '8px 18px', 
              borderRadius: '30px', 
              display: 'inline-block' 
            }}>
              <i className="fas fa-trophy me-2"></i>
              <span>{data.badgeText}</span>
            </div>
            <h1 className="hero-title display-3 fw-bold mb-4">
              {data.titleBefore}
              <span style={{ color: data.titleHighlightColor || '#dc2626', fontWeight: 800 }}>
                {data.titleHighlight}
              </span>
              {data.titleAfter}
            </h1>
            <p className="hero-description lead mb-4 fs-5">
              {data.description}
            </p>
            <div className="key-features mb-4">
              {features.map((feature, index) => (
                <div className="feature-item mb-2" key={`${feature}-${index}`}>
                  <i className="fas fa-check-circle text-success me-2"></i>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <div className="cta-buttons">
              <Link to={data.ctaUrl} className="btn btn-primary btn-lg px-5 py-3 nki-hero-cta-btn">
                <i className="fas fa-user-plus me-2"></i>{data.ctaText}
              </Link>
            </div>
          </div>

          {/* Video Column - Right, flush to edge */}
          <div className="col-lg-6 nki-hero-media-col" data-aos="fade-left" style={{ paddingRight: 0 }}>
            <div className="hero-image nki-hero-media-shell" style={{ 
              borderRadius: '20px 0 0 20px',
              overflow: 'hidden', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              width: '70%',
              marginLeft: 'auto',
              maxWidth: '100%' 
            }}>
              <iframe 
                className="nki-hero-video-embed"
                width="100%" 
                height="380" 
                src={data.videoUrl} 
                title="NCLEX Success Story" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
