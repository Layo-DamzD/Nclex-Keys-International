import React from 'react';

const DEFAULT_CONTENT = {
  heading: 'Why Choose NCLEX KEYS?',
  subheading: 'Comprehensive NCLEX preparation designed for international nurses',
  cards: [
    {
      icon: 'fa-user-md',
      title: 'Expert Instructors',
      text: 'Learn from NCLEX specialists with 10+ years of teaching experience and clinical practice.',
    },
    {
      icon: 'fa-laptop-house',
      title: 'Live Virtual Classes',
      text: 'Interactive online sessions with real-time Q&A. Attend from anywhere in the world.',
    },
    {
      icon: 'fa-file-alt',
      title: 'Custom Study Plans',
      text: 'Personalized learning path based on your strengths and weaknesses analysis.',
    },
  ],
};

const Program = ({ content = {} }) => {
  const data = {
    ...DEFAULT_CONTENT,
    ...content,
    cards: Array.isArray(content.cards) && content.cards.length ? content.cards : DEFAULT_CONTENT.cards,
  };

  return (
    <section id="program" className="program-section" style={{ padding: '80px 0' }}>
      <div className="container">
        <div className="section-header text-center mb-5" data-aos="fade-down">
          <h2 style={{ fontFamily: "'Roboto Slab', serif", color: '#1d3557' }}>{data.heading}</h2>
          <p style={{ color: '#457b9d' }}>{data.subheading}</p>
        </div>
        <div className="row">
          {data.cards.map((card, index) => (
            <div className="col-md-4 mb-4" data-aos="zoom-in" data-aos-delay={100 * (index + 1)} key={`${card.title}-${index}`}>
              <div
                className="feature-card"
                style={
                  index === 0
                    ? {
                        background: 'white',
                        padding: '30px',
                        borderRadius: '20px',
                        boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
                        textAlign: 'center',
                        transition: 'transform 0.3s',
                      }
                    : undefined
                }
              >
                <div
                  className="feature-icon"
                  style={
                    index === 0
                      ? {
                          fontSize: '2.5rem',
                          color: '#0d6efd',
                          background: 'rgba(13,110,253,0.1)',
                          width: '80px',
                          height: '80px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          margin: '0 auto 20px',
                        }
                      : undefined
                  }
                >
                  <i className={`fas ${card.icon || 'fa-star'}`}></i>
                </div>
                <h4>{card.title}</h4>
                <p>{card.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Program;
