import React from 'react';
import axios from 'axios';

const Testimonials = ({ content = {} }) => {
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

  const testimonials = normalizeItems(
    content?.items ??
    content?.stories ??
    content?.testimonials ??
    (Array.isArray(content) ? content : null)
  );

  const normalizeItems = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (value && typeof value === 'object') return Object.values(value).filter(Boolean);
    return [];
  };

  const testimonials = normalizeItems(content?.items);
  if (testimonials.length === 0) return null;
  const heading = content.heading || 'Success Stories';
  const subheading = content.subheading || 'Hear from our graduates who passed NCLEX';
  const resolveMediaCandidates = (rawUrl) => {
    const original = String(rawUrl || '').trim();
    if (!original) return [];

    const normalized = original.replace(/\\/g, '/');
    const apiBase = String(axios.defaults.baseURL || '').trim().replace(/\/+$/, '');
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
            borderRadius: '0',
            boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
            textAlign: 'center',
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
              maxHeight: '620px',
              objectFit: 'contain',
              objectPosition: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '0',
              display: 'block'
            }}
          />
          {displayMode === 'imageWithCaption' ? (
            <div style={{ padding: '16px 20px', textAlign: 'left' }}>
              {testimonial.name ? <h5 style={{ marginBottom: 4 }}>{testimonial.name}</h5> : null}
              {testimonial.role ? <small style={{ color: '#6b7280', display: 'block', marginBottom: 8 }}>{testimonial.role}</small> : null}
              {testimonial.text ? <p style={{ margin: 0, color: '#457b9d' }}>{testimonial.text}</p> : null}
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
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
          textAlign: 'center',
        }}
      >
        {(testimonial.avatar || testimonial.imageUrl || testimonial.name || testimonial.role) && (
          <div className="testimonial-header d-flex align-items-center justify-content-center mb-4">
            {(testimonial.avatar || testimonial.imageUrl) && (
              <img
                src={firstMediaUrl(testimonial.avatar || testimonial.imageUrl)}
                data-raw-src={testimonial.avatar || testimonial.imageUrl || ''}
                data-fallback-index="0"
                onError={handleImageFallback}
                alt={testimonial.name || 'Success story'}
                loading={index === 0 ? 'eager' : 'lazy'}
                style={{ width: '60px', height: '60px', borderRadius: '50%', marginRight: '15px', objectFit: 'cover' }}
              />
            )}
            {(testimonial.name || testimonial.role) && (
              <div>
                {testimonial.name ? <h5>{testimonial.name}</h5> : null}
                {testimonial.role ? <small>{testimonial.role}</small> : null}
              </div>
            )}
          </div>
        )}
        {testimonial.text ? (
          <p className="testimonial-text" style={{ fontStyle: 'italic', color: '#457b9d' }}>
            "{testimonial.text}"
          </p>
        ) : null}
        {Number.isFinite(Number(testimonial.rating)) && Number(testimonial.rating) > 0 ? (
          <div className="rating mt-3" style={{ color: '#ffc107' }}>
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
      style={{ background: 'linear-gradient(to bottom, white 0%, #f0f4ff 100%)', padding: '80px 0' }}
    >
      <div className="container">
        <div className="section-header text-center mb-5" data-aos="fade-down">
          <h2 style={{ fontFamily: "'Roboto Slab', serif", color: '#1d3557' }}>{heading}</h2>
          <p style={{ color: '#457b9d' }}>{subheading}</p>
        </div>
        <div id="testimonialCarousel" className="carousel slide" data-bs-ride="carousel" data-aos="fade-up">
          <div className="carousel-inner">
            {testimonials.map((testimonial, index) => (
              <div key={testimonial.id || index} className={`carousel-item ${index === 0 ? 'active' : ''}`}>
                <div className="row justify-content-center">
                  <div className="col-md-8">{renderTestimonialCard(testimonial, index)}</div>
                </div>
              </div>
            ))}
          </div>
          {testimonials.length > 1 && (
            <>
              <button className="carousel-control-prev" type="button" data-bs-target="#testimonialCarousel" data-bs-slide="prev">
                <span className="carousel-control-prev-icon" aria-hidden="true"></span>
                <span className="visually-hidden">Previous</span>
              </button>
              <button className="carousel-control-next" type="button" data-bs-target="#testimonialCarousel" data-bs-slide="next">
                <span className="carousel-control-next-icon" aria-hidden="true"></span>
                <span className="visually-hidden">Next</span>
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
