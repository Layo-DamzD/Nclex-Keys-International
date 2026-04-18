import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StatsCards = () => {
  const [stats, setStats] = useState({
    totalTests: 0,
    avgScore: 0,
    bestScore: 0,
    totalQuestionBank: 0,
    attemptedQuestions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/student/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="row">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="col-lg-3 col-md-6 col-sm-6">
            <div className="stats-card">
              <div className="placeholder-glow">
                <div className="placeholder col-12" style={{ height: '60px' }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      icon: 'fa-check-circle',
      value: stats.totalTests,
      label: 'Total Tests Taken',
      iconClass: 'icon-blue',
      gradientColors: ['#3b82f6', '#1d4ed8'] // blue
    },
    {
      icon: 'fa-brain',
      value: `${stats.avgScore}%`,
      label: 'Average Score',
      iconClass: 'icon-green',
      gradientColors: ['#22c55e', '#16a34a'] // green
    },
    {
      icon: 'fa-trophy',
      value: stats.attemptedQuestions,
      label: 'Questions Attempted',
      iconClass: 'icon-orange',
      gradientColors: ['#f97316', '#ea580c'] // orange
    }
  ];

  return (
    <div className="row">
      {statsData.map((stat, index) => (
        <div key={index} className="col-lg-3 col-md-6 col-sm-6">
          <div className="stats-card" style={{ animationDelay: `${index * 0.1}s` }}>
            <div 
              className="stats-icon"
              style={{
                background: `linear-gradient(135deg, ${stat.gradientColors[0]}, ${stat.gradientColors[1]})`,
                color: 'white',
                boxShadow: `0 4px 15px ${stat.gradientColors[0]}40`
              }}
            >
              <i className={`fas ${stat.icon}`}></i>
            </div>
            <div 
              className="stats-number"
              style={{
                background: `linear-gradient(135deg, ${stat.gradientColors[0]}, ${stat.gradientColors[1]})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              {stat.value}
            </div>
            <p className="text-muted mb-0" style={{ fontWeight: 500, fontSize: '0.9rem' }}>
              {stat.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
