import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Testimonials = ({ content = {} }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState('next');

  const parseMaybeJson = (value) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const normalizeItems = (value) => {
    const parsed = parseMaybeJson(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
    if (parsed && typeof parsed === 'object') return Object.values(parsed).filter(Boolean);
    return [];
  };

  // Get testimonials from content
  const testimonials = normalizeItems(
    content?.items ??
    content?.stories ??
    content?.testimonials ??
    (Array.isArray(content) ? content : null)
  );
  
  // Always render the section even if loading
  const heading = content?.heading || 'Success Stories';
  const subheading = content?.subheading || 'Hear from our graduates who passed NCLEX';

  // Auto-slide every 6 seconds
  useEffect(() => {
    if (testimonials.length <= 1) return;
    
    const interval = setInterval(() => {
      setDirection('next');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length);
        setIsAnimating(false);
      }, 500);
    }, 6000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  const goToSlide = (index) => {
    if (index === currentIndex || isAnimating) return;
    setDirection(index > currentIndex ? 'next' : 'prev');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsAnimating(false);
    }, 500);
  };

  const goToPrev = () => {
    if (isAnimating) return;
    setDirection('prev');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
      setIsAnimating(false);
    }, 500);
  };

  const goToNext = () => {
    if (isAnimating) return;
    setDirection('next');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
      setIsAnimating(false);
    }, 500);
  };

  const resolveMediaCandidates = (rawUrl) => {
    const original = String(rawUrl || '').trim();
    if (!original) return [];

    const normalized = original.replace(/\\/g, '/');
    const apiBase = String(axios.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
    const origin = window.location.origin.replace(/\/+$/, '');
    const candidates = [];

    const pushUnique = (value) => {
      const next = String(value || '').trim();
      if (!next) return;
      if (!candidates.includes(next)) candidates.push(next);
    };

    if (/^data:/i.test(normalized)) {
      pushUnique(normalized);
      return candidates;
    }

    if (/^https?:\/\//i.test(normalized)) {
      pushUnique(normalized);
      try {
        const parsed = new URL(normalized);
        if (parsed.pathname.includes('/api/uploads/')) {
          pushUnique(`${origin}${parsed.pathname}`);
          pushUnique(`${apiBase}${parsed.pathname}`);
        }
      } catch {
        // ignore parse failures
      }
    } else if (normalized.startsWith('//')) {
      pushUnique(`${window.location.protocol}${normalized}`);
    } else if (normalized.startsWith('/')) {
      pushUnique(`${origin}${normalized}`);
      pushUnique(`${apiBase}${normalized}`);
      pushUnique(normalized);
    } else {
      pushUnique(`${origin}/${normalized}`);
      pushUnique(`${apiBase}/${normalized}`);
      pushUnique(normalized);
    }

    const uploadMatch = normalized.match(/(?:^|\/)api\/uploads\/([^/?#]+)/i) || normalized.match(/(?:^|\/)uploads\/([^/?#]+)/i);
    if (uploadMatch?.[1]) {
      const fileName = uploadMatch[1];
      pushUnique(`${origin}/api/uploads/${fileName}`);
      pushUnique(`${apiBase}/api/uploads/${fileName}`);
    }

    return candidates;
  };

  const firstMediaUrl = (rawUrl) => resolveMediaCandidates(rawUrl)[0] || '';

  const handleImageFallback = (event) => {
    const target = event.currentTarget;
    const raw = target.getAttribute('data-raw-src') || '';
    const index = Number(target.getAttribute('data-fallback-index') || '0');
    const candidates = resolveMediaCandidates(raw);
    if (index + 1 >= candidates.length) return;
    target.setAttribute('data-fallback-index', String(index + 1));
    target.src = candidates[index + 1];
  };

  const renderTestimonialCard = (testimonial, index) => {
    const displayMode = testimonial.imageDisplayMode || (testimonial.imageOnly ? 'imageOnly' : 'standard');

    if ((displayMode === 'imageOnly' || displayMode === 'imageWithCaption') && (testimonial.imageUrl || testimonial.avatar)) {
      return (
        <div
          className="testimonial-card testimonial-card-image-only"
          style={{
            background: 'white',
            padding: '0',
            borderRadius: '20px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            textAlign: 'center',
            overflow: 'hidden',
          }}
        >
          <img
            src={firstMediaUrl(testimonial.imageUrl || testimonial.avatar)}
            data-raw-src={testimonial.imageUrl || testimonial.avatar || ''}
            data-fallback-index="0"
            onError={handleImageFallback}
            alt={testimonial.name || 'Success story'}
            loading={index === 0 ? 'eager' : 'lazy'}
            style={{
              width: '100%',
              maxHeight: '500px',
              objectFit: 'contain',
              objectPosition: 'center',
              backgroundColor: '#f8f9fa',
              display: 'block'
            }}
          />
          {displayMode === 'imageWithCaption' ? (
            <div style={{ padding: '20px 24px', textAlign: 'left' }}>
              {testimonial.name ? <h5 style={{ marginBottom: 4, color: '#1d3557' }}>{testimonial.name}</h5> : null}
              {testimonial.role ? <small style={{ color: '#6b7280', display: 'block', marginBottom: 8 }}>{testimonial.role}</small> : null}
              {testimonial.text ? <p style={{ margin: 0, color: '#457b9d', fontStyle: 'italic' }}>{testimonial.text}</p> : null}
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div
        className="testimonial-card"
        style={{
          background: 'white',
          padding: '40px',
          borderRadius: '20px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          fontSize: '60px',
          color: '#f0f4ff',
          fontFamily: 'Georgia, serif',
          lineHeight: 1,
        }}>"</div>
        
        {(testimonial.avatar || testimonial.imageUrl || testimonial.name || testimonial.role) && (
          <div className="testimonial-header d-flex align-items-center justify-content-center mb-4" style={{ position: 'relative', zIndex: 1 }}>
            {(testimonial.avatar || testimonial.imageUrl) && (
              <img
                src={firstMediaUrl(testimonial.avatar || testimonial.imageUrl)}
                data-raw-src={testimonial.avatar || testimonial.imageUrl || ''}
                data-fallback-index="0"
                onError={handleImageFallback}
                alt={testimonial.name || 'Success story'}
                loading={index === 0 ? 'eager' : 'lazy'}
                style={{ 
                  width: '70px', 
                  height: '70px', 
                  borderRadius: '50%', 
                  marginRight: '15px', 
                  objectFit: 'cover',
                  border: '3px solid #457b9d',
                  boxShadow: '0 4px 15px rgba(69, 123, 157, 0.3)'
                }}
              />
            )}
            {(testimonial.name || testimonial.role) && (
              <div style={{ textAlign: 'left' }}>
                {testimonial.name ? <h5 style={{ marginBottom: 2, color: '#1d3557', fontWeight: 600 }}>{testimonial.name}</h5> : null}
                {testimonial.role ? <small style={{ color: '#457b9d', fontWeight: 500 }}>{testimonial.role}</small> : null}
              </div>
            )}
          </div>
        )}
        {testimonial.text ? (
          <p className="testimonial-text" style={{ 
            fontStyle: 'italic', 
            color: '#457b9d', 
            fontSize: '1.1rem', 
            lineHeight: 1.8,
            position: 'relative',
            zIndex: 1,
            marginBottom: 0
          }}>
            "{testimonial.text}"
          </p>
        ) : null}
        {Number.isFinite(Number(testimonial.rating)) && Number(testimonial.rating) > 0 ? (
          <div className="rating mt-3" style={{ color: '#ffc107', fontSize: '1.2rem' }}>
            {[...Array(5)].map((_, i) => (
              <i
                key={i}
                className={`fas fa-star${
                  i >= Math.floor(testimonial.rating || 0)
                    ? testimonial.rating % 1 !== 0 && i === Math.floor(testimonial.rating)
                      ? '-half-alt'
                      : ''
                    : ''
                }`}
                style={{ margin: '0 2px' }}
              ></i>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <section
      id="success"
      className="success-section"
      style={{ 
        background: 'linear-gradient(135deg, #ffffff 0%, #f0f4ff 50%, #e8f4f8 100%)', 
        padding: '100px 0',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '5%',
        width: '200px',
        height: '200px',
        background: 'radial-gradient(circle, rgba(69, 123, 157, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'float 8s ease-in-out infinite',
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '10%',
        width: '150px',
        height: '150px',
        background: 'radial-gradient(circle, rgba(29, 53, 87, 0.08) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'float 6s ease-in-out infinite reverse',
      }}></div>

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-header text-center mb-5" data-aos="fade-down">
          <h2 style={{ 
            fontFamily: "'Roboto Slab', serif", 
            color: '#1d3557', 
            fontSize: '2.5rem',
            fontWeight: 700,
            marginBottom: '15px'
          }}>
            {heading}
          </h2>
          <p style={{ color: '#457b9d', fontSize: '1.1rem' }}>{subheading}</p>
          
          <div style={{
            width: '80px',
            height: '4px',
            background: 'linear-gradient(90deg, #457b9d, #1d3557)',
            margin: '20px auto 0',
            borderRadius: '2px',
          }}></div>
        </div>

        {/* Show testimonials if we have them, otherwise show loading */}
        {testimonials.length > 0 ? (
          <div style={{
            position: 'relative',
            maxWidth: '800px',
            margin: '0 auto',
          }}>
            <div style={{
              position: 'relative',
              minHeight: '300px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: '100%',
                opacity: isAnimating ? 0 : 1,
                transform: isAnimating 
                  ? `translateX(${direction === 'next' ? '-30px' : '30px'}) scale(0.95)` 
                  : 'translateX(0) scale(1)',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                {testimonials[currentIndex] && renderTestimonialCard(testimonials[currentIndex], currentIndex)}
              </div>
            </div>

            {testimonials.length > 1 && (
              <>
                <button 
                  onClick={goToPrev}
                  style={{
                    position: 'absolute',
                    left: '-60px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'white',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    color: '#457b9d',
                    fontSize: '1.2rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#457b9d';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#457b9d';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  }}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button 
                  onClick={goToNext}
                  style={{
                    position: 'absolute',
                    right: '-60px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'white',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    color: '#457b9d',
                    fontSize: '1.2rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#457b9d';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#457b9d';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  }}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </>
            )}

            {testimonials.length > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '10px',
                marginTop: '30px',
              }}>
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    style={{
                      width: index === currentIndex ? '30px' : '10px',
                      height: '10px',
                      borderRadius: '5px',
                      border: 'none',
                      background: index === currentIndex 
                        ? 'linear-gradient(90deg, #457b9d, #1d3557)' 
                        : 'rgba(69, 123, 157, 0.3)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#457b9d',
          }}>
            <i className="fas fa-comments" style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.3 }}></i>
            <p style={{ fontSize: '1rem', marginBottom: '5px' }}>No testimonials available at the moment</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </section>
  );
};

export default Testimonials;
