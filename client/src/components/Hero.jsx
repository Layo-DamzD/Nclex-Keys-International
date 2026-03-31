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
  videoUrl: 'https://www.youtube.com/embed/aq7fhW5PccI',
  imageUrl: '', // Optional image alongside or instead of video
  gradientStart: '#0d6efd',
  gradientEnd: '#6f42c1',
  titleHighlightColor: '#22c55e', // Green to match branding
};

const Hero = ({ content = {} }) => {
  const data = { ...DEFAULT_CONTENT, ...content };
  const features = Array.isArray(data.features) && data.features.length ? data.features : DEFAULT_CONTENT.features;
  
  // Determine what to show in the media section
  const hasImage = data.imageUrl && data.imageUrl.trim() !== '';
  const hasVideo = data.videoUrl && data.videoUrl.trim() !== '';

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
              <span style={{ color: data.titleHighlightColor || '#22c55e', fontWeight: 800 }}>
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

          {/* Media Column - Right, flush to edge */}
          <div className="col-lg-6 nki-hero-media-col" data-aos="fade-left" style={{ paddingRight: 0 }}>
            <div className="hero-image nki-hero-media-shell" style={{ 
              borderRadius: '20px 0 0 20px',
              overflow: 'hidden', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              width: '70%',
              marginLeft: 'auto',
              maxWidth: '100%' 
            }}>
              {/* Show image if available */}
              {hasImage && (
                <img 
                  src={data.imageUrl}
                  alt="NCLEX Success"
                  style={{ 
                    width: '100%', 
                    height: 'auto',
                    display: 'block',
                    objectFit: 'cover'
                  }}
                />
              )}
              {/* Show video if available and no image, or show video below image if both exist */}
              {hasVideo && !hasImage && (
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
              )}
              {/* If both image and video exist, show image with play button overlay linking to video */}
              {hasImage && hasVideo && (
                <div style={{ position: 'relative' }}>
                  <img 
                    src={data.imageUrl}
                    alt="NCLEX Success"
                    style={{ 
                      width: '100%', 
                      height: 'auto',
                      display: 'block',
                      objectFit: 'cover'
                    }}
                  />
                  <a 
                    href={data.videoUrl.replace('/embed/', '/watch?v=')}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '80px',
                      height: '80px',
                      background: 'rgba(255,255,255,0.9)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}
                  >
                    <i className="fas fa-play" style={{ color: '#6f42c1', fontSize: '2rem', marginLeft: '5px' }}></i>
                  </a>
                </div>
              )}
              {/* Fallback if no media */}
              {!hasImage && !hasVideo && (
                <div style={{ 
                  width: '100%', 
                  height: '380px', 
                  background: 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <i className="fas fa-image" style={{ fontSize: '4rem', opacity: 0.5 }}></i>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
