import React, { useEffect, useRef, useCallback } from 'react';

const DEFAULT_ITEMS = [
  { label: 'Nurses Trained', target: 2500, suffix: '+', color: '#0d6efd' },
  { label: 'Pass Rate', target: 97, suffix: '%' },
  { label: 'Practice Questions', target: 10000, suffix: '+' },
  { label: 'Tutor Support', value: '24/7' },
];

const Stats = ({ content = {} }) => {
  const statsRef = useRef(null);
  const animatedRef = useRef(new Set());
  const items = Array.isArray(content.items) && content.items.length ? content.items : DEFAULT_ITEMS;

  const animateStats = useCallback(() => {
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach((stat, index) => {
      const target = parseInt(stat.getAttribute('data-target'));
      const suffix = stat.getAttribute('data-suffix') || '';
      
      if (isNaN(target) || animatedRef.current.has(index)) return;
      animatedRef.current.add(index);
      
      let count = 0;
      const increment = target / 200;
      const duration = 1500; // 1.5 seconds
      const startTime = performance.now();
      
      const updateCount = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentCount = Math.floor(easeOutQuart * target);
        
        stat.innerText = currentCount + suffix;
        
        if (progress < 1) {
          requestAnimationFrame(updateCount);
        } else {
          stat.innerText = target + suffix;
        }
      };
      
      requestAnimationFrame(updateCount);
    });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        animateStats();
      }
    }, { threshold: 0.5 });
    
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [animateStats]);

  return (
    <section ref={statsRef} className="stats-section" style={{ background: 'white', padding: '60px 0', borderRadius: '30px', margin: '-30px auto 60px', maxWidth: '90%', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
      <div className="container">
        <div className="row text-center">
          {items.map((item, index) => {
            const hasTarget = Number.isFinite(Number(item.target));
            const display = hasTarget ? `0${item.suffix || ''}` : (item.value || '0');
            return (
              <div className="col-md-3 col-6 mb-4" data-aos="fade-up" data-aos-delay={100 * (index + 1)} key={`${item.label}-${index}`}>
                <div
                  className="stat-number"
                  style={index === 0 ? { fontSize: '3rem', fontWeight: 700, color: item.color || '#0d6efd' } : undefined}
                  data-target={hasTarget ? Number(item.target) : undefined}
                  data-suffix={hasTarget ? (item.suffix || '') : ''}
                >
                  {display}
                </div>
                <div className="stat-label" style={index === 0 ? { fontSize: '1rem', color: '#457b9d', textTransform: 'uppercase', letterSpacing: '1px' } : undefined}>
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Stats;
