import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminStats = () => {
  const [stats, setStats] = useState({
    totalQuestions: 0,
    subjectCount: 0,
    clientNeedCount: 0,
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
      <div className={`stat-card border-top-primary`}>
        <h3>Total Questions</h3>
        <div className="stat-number">{stats.totalQuestions}</div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
          {stats.subjectCount} subjects · {stats.clientNeedCount} client needs
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
