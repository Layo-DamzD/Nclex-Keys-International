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
    return <div className="row">Loading stats...</div>;
  }

  return (
    <div className="row">
      <div className="col-lg-3 col-md-6 col-sm-6">
        <div className="stats-card">
          <div className="stats-icon icon-purple">
            <i className="fas fa-layer-group"></i>
          </div>
          <div className="stats-number">{stats.totalQuestionBank}</div>
          <p className="text-muted mb-0">Question Bank</p>
        </div>
      </div>
      <div className="col-lg-3 col-md-6 col-sm-6">
        <div className="stats-card">
          <div className="stats-icon icon-blue">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="stats-number">{stats.totalTests}</div>
          <p className="text-muted mb-0">Total Tests Taken</p>
        </div>
      </div>
      <div className="col-lg-3 col-md-6 col-sm-6">
        <div className="stats-card">
          <div className="stats-icon icon-green">
            <i className="fas fa-brain"></i>
          </div>
          <div className="stats-number">{stats.avgScore}%</div>
          <p className="text-muted mb-0">Average Score</p>
        </div>
      </div>
      <div className="col-lg-3 col-md-6 col-sm-6">
        <div className="stats-card">
          <div className="stats-icon icon-orange">
            <i className="fas fa-trophy"></i>
          </div>
          <div className="stats-number">{stats.attemptedQuestions}</div>
          <p className="text-muted mb-0">Questions Attempted</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
