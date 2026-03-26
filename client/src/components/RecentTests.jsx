import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RecentTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/student/recent-tests', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTests(response.data);
      } catch (error) {
        console.error('Error fetching recent tests:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  if (loading) return <div className="text-center py-4"><div className="spinner-border text-teal"></div></div>;

  // Fun color palette for test cards
  const getTestColor = (index) => {
    const colors = [
      { gradient: ['#14b8a6', '#0d9488'], bg: '#f0fdfa' }, // teal
      { gradient: ['#f97316', '#ea580c'], bg: '#fff7ed' }, // orange
      { gradient: ['#a855f7', '#9333ea'], bg: '#faf5ff' }, // purple
      { gradient: ['#3b82f6', '#1d4ed8'], bg: '#eff6ff' }, // blue
      { gradient: ['#22c55e', '#16a34a'], bg: '#f0fdf4' }, // green
    ];
    return colors[index % colors.length];
  };

  return (
    <div id="recentTestsList">
      {tests.length === 0 ? (
        <div className="text-center py-4">
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📚</div>
          <p className="text-muted mb-0">No tests taken yet</p>
          <small className="text-muted">Start your first test to see your progress!</small>
        </div>
      ) : (
        tests.map((test, idx) => {
          const color = getTestColor(idx);
          const isPassed = test.percentage >= 70;
          
          return (
            <div 
              key={idx} 
              className="mb-3 p-3"
              style={{
                background: `linear-gradient(135deg, ${color.bg} 0%, #ffffff 100%)`,
                borderRadius: '12px',
                borderLeft: `4px solid ${color.gradient[0]}`,
                transition: 'all 0.3s ease'
              }}
            >
              <div className="d-flex justify-content-between mb-2">
                <span style={{ fontWeight: 600, color: '#374151' }}>
                  {test.testName}
                </span>
                <span 
                  style={{
                    fontWeight: 700,
                    color: isPassed ? '#16a34a' : '#dc2626',
                    padding: '2px 10px',
                    borderRadius: '15px',
                    background: isPassed ? '#dcfce7' : '#fee2e2'
                  }}
                >
                  {test.percentage}%
                </span>
              </div>
              <div className="progress" style={{ height: '8px', borderRadius: '10px', background: '#e5e7eb' }}>
                <div
                  className="progress-bar"
                  style={{ 
                    width: `${test.percentage}%`,
                    background: `linear-gradient(90deg, ${color.gradient[0]}, ${color.gradient[1]})`,
                    borderRadius: '10px'
                  }}
                ></div>
              </div>
              <small className="text-muted mt-1 d-block">
                📅 {new Date(test.date).toLocaleDateString()} • ⏱️ {test.timeTaken} min
              </small>
            </div>
          );
        })
      )}
    </div>
  );
};

export default RecentTests;
