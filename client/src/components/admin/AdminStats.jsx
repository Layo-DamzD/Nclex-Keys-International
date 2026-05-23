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
        <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '8px', lineHeight: '1.5', margin: '8px 4px 0' }}>
          <strong>{stats.totalQuestions}</strong> questions are currently available in your QBank.
          Categorized breakdowns are being finalized — thank you for your patience.
        </p>
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
