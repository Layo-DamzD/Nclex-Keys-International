import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminStats = ({ onSectionChange }) => {
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalStudents: 0,
    totalUsage: 0,
    successRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = sessionStorage.getItem('adminToken');
        const response = await axios.get('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { title: 'Total Students', value: stats.totalStudents, color: 'success' },
    { title: 'Total Usage', value: stats.totalUsage, color: 'warning' },
    { title: 'Success Rate', value: `${stats.successRate}%`, color: 'danger' }
  ];

  if (loading) return <div>Loading stats...</div>;

  return (
    <div className="stats-grid">
      <div className={`stat-card border-top-primary`} style={{ textAlign: 'center' }}>
        <h3>Total Questions</h3>
        <div className="stat-number">{stats.totalQuestions}</div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span><i className="fas fa-book-medical" style={{ marginRight: '4px', color: '#6366f1' }}></i>{stats.subjectQuestions || 0} Subjects</span>
          <span><i className="fas fa-clipboard-list" style={{ marginRight: '4px', color: '#0891b2' }}></i>{stats.clientNeedQuestions || 0} Client Needs</span>
          {(stats.overlap || 0) > 0 && (
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>
              ({stats.overlap} overlap)
            </span>
          )}
          {(stats.uncategorized || 0) > 0 && (
            <span
              onClick={() => {
                if (onSectionChange) {
                  onSectionChange('questions');
                  // URL param is picked up by ManageQuestions via useSearchParams
                  setTimeout(() => {
                    window.history.pushState({}, '', '/admin/dashboard?section=questions&uncategorized=true');
                    window.dispatchEvent(new Event('popstate'));
                  }, 100);
                }
              }}
              style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '2px' }}
              title="Click to view uncategorized questions"
            >
              <i className="fas fa-exclamation-triangle" style={{ marginRight: '4px', color: '#f59e0b' }}></i>{stats.uncategorized} Uncategorized
            </span>
          )}
        </div>
      </div>
      {statCards.map((stat, idx) => (
        <div key={idx} className={`stat-card border-top-${stat.color}`}>
          <h3>{stat.title}</h3>
          <div className="stat-number">{stat.value}</div>
        </div>
      ))}
    </div>
  );
};

export default AdminStats;
