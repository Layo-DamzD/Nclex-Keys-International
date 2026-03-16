import React from 'react';

const normalizeCardTitle = (title = '') => {
  const raw = String(title || '').trim();
  if (!raw) return raw;
  if (['custom study plan', 'customized study plan', 'customised study plan'].includes(raw.toLowerCase())) {
    return 'Customized Study Plan';
  }
  return raw;
};

const normalizeCard = (card = {}) => ({
  ...card,
  title: normalizeCardTitle(card.title),
  text: String(card.text || '').trim()
});

const cardUniqKey = (card = {}) => {
  const title = String(card.title || '').trim().toLowerCase();
  const text = String(card.text || '').trim().toLowerCase();
  return `${title}::${text}`;
};

const mergeUniqueCards = (baseCards = [], incomingCards = []) => {
  const merged = [];
  const seen = new Set();
  [...baseCards, ...incomingCards]
    .map((card) => normalizeCard(card))
    .forEach((card) => {
      const key = cardUniqKey(card);
      if (!card.title || seen.has(key)) return;
      seen.add(key);
      merged.push(card);
    });
  return merged;
};

const DEFAULT_CONTENT = {
  heading: 'Why Choose NCLEX KEYS?',
  subheading: 'Strategic, intensive coaching that transforms NCLEX preparation into confident success.',
  cards: [
    {
      icon: 'fa-bullseye',
      title: 'Strategic Coaching',
      text: 'Intensive, results-driven coaching that meticulously decodes NCLEX exam logic.',
    },
    {
      icon: 'fa-chalkboard-user',
      title: 'Expert Mentorship',
      text: 'Learn from RNs and experienced educators with 25+ years of clinical practice.',
    },
    {
      icon: 'fa-award',
      title: 'Proven Success',
      text: 'Over 100 aspiring nurses successfully guided to NCLEX licensure with confidence.',
    },
    {
      icon: 'fa-book-open',
      title: 'Comprehensive Content',
      text: 'High-quality learning materials designed for immediate professional success.',
    },
    {
      icon: 'fa-circle-check',
      title: 'Confidence Building',
      text: 'Transform from anxious test taker to confident, competent clinician.',
    },
    {
      icon: 'fa-users',
      title: 'Global Engagement',
      text: 'Strategic collaboration and support for nursing professionals worldwide.',
    },
    {
      icon: 'fa-gears',
      title: 'Customized Study Plan',
      text: 'Personalized preparation roadmap focused on your weak areas and exam goals.',
    },
  ],
  missionVision: {
    heading: 'Our Mission & Vision',
    cards: [
      {
        icon: 'fa-bullseye',
        title: 'Mission',
        text: 'NCLEX KEYS is dedicated to empowering future nurses by providing intensive, results-driven coaching and strategic mentorship.'
      },
      {
        icon: 'fa-people-arrows',
        title: 'Vision',
        text: 'To be the globally recognized premier standard for strategic NCLEX preparation, transforming aspiring nurses into confident, licensed clinicians.'
      }
    ]
  }
};

const Program = ({ content = {} }) => {
  const data = {
    ...DEFAULT_CONTENT,
    ...content,
    cards: mergeUniqueCards(
      DEFAULT_CONTENT.cards,
      Array.isArray(content.cards) ? content.cards : []
    ),
    missionVision: content.missionVision && typeof content.missionVision === 'object'
      ? {
          ...DEFAULT_CONTENT.missionVision,
          ...content.missionVision,
          cards:
            Array.isArray(content.missionVision.cards) && content.missionVision.cards.length
              ? content.missionVision.cards
              : DEFAULT_CONTENT.missionVision.cards
        }
      : DEFAULT_CONTENT.missionVision
  };

  return (
    <section id="program" className="program-section" style={{ padding: '80px 0', background: '#e8edf3' }}>
      <div className="container">
        <div className="section-header text-center mb-5" data-aos="fade-down">
          <h2 style={{ fontFamily: "'Roboto Slab', serif", color: '#0b63ce', fontWeight: 700 }}>{data.heading}</h2>
          <p style={{ color: '#0b63ce', maxWidth: '520px', margin: '0 auto', fontSize: '13px' }}>{data.subheading}</p>
        </div>
        <div className="row justify-content-center">
          {data.cards.map((card, index) => (
            <div className="col-md-4 mb-4" data-aos="zoom-in" data-aos-delay={80 * (index + 1)} key={`${card.title}-${index}`}>
              <div
                className="feature-card"
                style={{
                  background: '#edf2f7',
                  padding: '18px',
                  borderRadius: '10px',
                  border: '1px solid #f044ff',
                  boxShadow: 'none',
                  textAlign: 'left',
                  minHeight: '160px'
                }}
              >
                <div
                  className="feature-icon"
                  style={{
                    fontSize: '14px',
                    color: '#0b63ce',
                    background: '#dbeafe',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    marginBottom: '10px'
                  }}
                >
                  <i className={`fas ${card.icon || 'fa-star'}`}></i>
                </div>
                <h4 style={{ color: '#0b63ce', fontSize: '16px', marginBottom: '8px' }}>{card.title}</h4>
                <p style={{ color: '#0b63ce', fontSize: '12px', marginBottom: 0 }}>{card.text}</p>
              </div>
            </div>
          ))}
        </div>

        {data.missionVision && (
          <div style={{ marginTop: '48px' }}>
            <div className="section-header text-center mb-5" data-aos="fade-down">
              <h2 style={{ fontFamily: "'Roboto Slab', serif", color: '#0b63ce', fontWeight: 700 }}>
                {data.missionVision.heading || 'Our Mission & Vision'}
              </h2>
            </div>
            <div className="row justify-content-center">
              {(data.missionVision.cards || []).slice(0, 2).map((card, index) => (
                <div className="col-md-5 mb-4" data-aos="zoom-in" data-aos-delay={120 * (index + 1)} key={`${card.title}-${index}`}>
                  <div
                    className="feature-card"
                    style={{
                      background: '#edf2f7',
                      padding: '18px',
                      borderRadius: '10px',
                      border: '1px solid #f044ff',
                      boxShadow: 'none',
                      textAlign: 'left',
                      minHeight: '180px'
                    }}
                  >
                    <div
                      className="feature-icon"
                      style={{
                        fontSize: '14px',
                        color: '#0b63ce',
                        background: '#dbeafe',
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        marginBottom: '10px'
                      }}
                    >
                      <i className={`fas ${card.icon || 'fa-star'}`}></i>
                    </div>
                    <h4 style={{ color: '#0b63ce', fontSize: '16px', marginBottom: '8px' }}>{card.title}</h4>
                    <p style={{ color: '#0b63ce', fontSize: '12px', marginBottom: 0 }}>{card.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Program;
