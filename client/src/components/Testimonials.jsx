import React from 'react';
import axios from 'axios';

const DEFAULT_TESTIMONIALS = [
  {
    id: 1,
    name: 'Maria Santos',
    role: 'Passed NCLEX-RN, 2023',
    text: 'NCLEX KEYS gave me the confidence I needed. The mock exams were exactly like the real test. Passed in 75 questions!',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
    rating: 5,
  },
  {
    id: 2,
    name: 'John Adebayo',
    role: 'Passed NCLEX-PN, 2023',
    text: 'As an international nurse, the cultural adaptation tips were invaluable. The instructors understood our unique challenges.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    rating: 4.5,
  },
  {
    id: 3,
    name: 'Sarah Chen',
    role: 'Passed NCLEX-RN, 2024',
    text: 'The personalized study plan identified my weak areas. 24/7 tutor support was amazing when I needed last-minute help.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    rating: 5,
  },
];

const Testimonials = ({ content = {} }) => {
  const testimonials = Array.isArray(content.items) && content.items.length ? content.items : DEFAULT_TESTIMONIALS;
  const heading = content.heading || 'Success Stories';
  const subheading = content.subheading || 'Hear from our graduates who passed NCLEX';
  const resolveMediaUrl = (rawUrl) => {
    const url = String(rawUrl || '').trim();
    if (!url) return '';
    if (/^data:/i.test(url) || /^https?:\/\//i.test(url)) return url;
    if (url.startsWith('//')) {
      return `${window.location.protocol}${url}`;
    }

    const apiBase = String(axios.defaults.baseURL || '').trim().replace(/\/+$/, '');
    if (url.startsWith('/')) {
      return apiBase ? `${apiBase}${url}` : url;
    }
    return apiBase ? `${apiBase}/${url}` : url;
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
                  <div className="col-md-8">
                    {testimonial.imageOnly && (testimonial.imageUrl || testimonial.avatar) ? (
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
                          src={resolveMediaUrl(testimonial.imageUrl || testimonial.avatar)}
                          alt={testimonial.name || 'Success story'}
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
                      </div>
                    ) : (
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
                                src={resolveMediaUrl(testimonial.avatar || testimonial.imageUrl)}
                                alt={testimonial.name || 'Success story'}
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
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="carousel-control-prev" type="button" data-bs-target="#testimonialCarousel" data-bs-slide="prev">
            <span className="carousel-control-prev-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Previous</span>
          </button>
          <button className="carousel-control-next" type="button" data-bs-target="#testimonialCarousel" data-bs-slide="next">
            <span className="carousel-control-next-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Next</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
