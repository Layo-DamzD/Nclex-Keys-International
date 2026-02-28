import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

const UsageAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState(7);
  
  const [usageByType, setUsageByType] = useState([]);
  const [successByCategory, setSuccessByCategory] = useState([]);
  const [difficultyDist, setDifficultyDist] = useState([]);
  const [dailyTrend, setDailyTrend] = useState([]);
  const [mostUsed, setMostUsed] = useState([]);

  useEffect(() => {
    fetchAllData();
  }, [timeRange]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('adminToken');
      
      const [typeRes, categoryRes, difficultyRes, trendRes, mostUsedRes] = await Promise.all([
        axios.get('/api/admin/analytics/usage-by-type', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/analytics/success-by-category', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/analytics/difficulty-distribution', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`/api/admin/analytics/daily-trend?days=${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/analytics/most-used', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setUsageByType(typeRes.data);
      setSuccessByCategory(categoryRes.data);
      setDifficultyDist(difficultyRes.data);
      setDailyTrend(trendRes.data);
      setMostUsed(mostUsedRes.data);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Chart configurations
  const typeChartData = {
    labels: usageByType.map(item => item.type),
    datasets: [{
      data: usageByType.map(item => item.count),
      backgroundColor: [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'
      ],
      borderWidth: 0
    }]
  };

  const categoryChartData = {
    labels: successByCategory.map(item => item.category),
    datasets: [{
      label: 'Success Rate (%)',
      data: successByCategory.map(item => item.successRate),
      backgroundColor: successByCategory.map(item => 
        item.successRate >= 70 ? '#10b981' : 
        item.successRate >= 50 ? '#f59e0b' : '#ef4444'
      ),
      borderWidth: 0
    }]
  };

  const difficultyChartData = {
    labels: difficultyDist.map(item => item.difficulty),
    datasets: [{
      data: difficultyDist.map(item => item.count),
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 0
    }]
  };

  const trendChartData = {
    labels: dailyTrend.map(item => item.date),
    datasets: [{
      label: 'Questions Used',
      data: dailyTrend.map(item => item.count),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  if (loading) return <div>Loading analytics...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="usage-analytics">
      <div className="admin-analytics-header form-card">
        <div>
          <h1>Usage Analytics</h1>
          <p className="admin-analytics-subtitle">Track question performance and usage patterns</p>
        </div>
      </div>

      <div className="admin-analytics-range-bar form-card">
        <div className="admin-analytics-range-buttons">
          <button 
            className={`btn ${timeRange === 7 ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setTimeRange(7)}
          >
            This Week
          </button>
          <button 
            className={`btn ${timeRange === 30 ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setTimeRange(30)}
          >
            This Month
          </button>
          <button 
            className={`btn ${timeRange === 90 ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setTimeRange(90)}
          >
            This Quarter
          </button>
          <button
            className={`btn ${timeRange === 365 ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setTimeRange(365)}
          >
            All Time
          </button>
        </div>
      </div>

      <div className="admin-analytics-grid">
        {/* Question Usage by Type */}
        <div className="admin-analytics-card">
          <h3>Question Usage by Type</h3>
          <div className="admin-analytics-chart-body">
            {usageByType.length > 0 ? (
              <Pie data={typeChartData} options={{ maintainAspectRatio: false }} />
            ) : (
              <p className="text-muted">No data available</p>
            )}
          </div>
        </div>

        {/* Success Rate by Category */}
        <div className="admin-analytics-card">
          <h3>Success Rate by Category</h3>
          <div className="admin-analytics-chart-body">
            {successByCategory.length > 0 ? (
              <Bar 
                data={categoryChartData} 
                options={{ 
                  maintainAspectRatio: false,
                  scales: { y: { beginAtZero: true, max: 100 } }
                }} 
              />
            ) : (
              <p className="text-muted">No data available</p>
            )}
          </div>
        </div>

        {/* Difficulty Distribution */}
        <div className="admin-analytics-card">
          <h3>Difficulty Distribution</h3>
          <div className="admin-analytics-chart-body">
            {difficultyDist.length > 0 ? (
              <Pie data={difficultyChartData} options={{ maintainAspectRatio: false }} />
            ) : (
              <p className="text-muted">No data available</p>
            )}
          </div>
        </div>

        {/* Daily Usage Trend */}
        <div className="admin-analytics-card">
          <h3>Daily Usage Trend</h3>
          <div className="admin-analytics-chart-body">
            {dailyTrend.length > 0 ? (
              <Line 
                data={trendChartData} 
                options={{ 
                  maintainAspectRatio: false,
                  scales: { y: { beginAtZero: true } }
                }} 
              />
            ) : (
              <p className="text-muted">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Most Used Questions */}
      <div className="form-card admin-analytics-section-card" style={{ marginTop: '35px' }}>
        <h3 style={{ marginBottom: '25px' }}>Most Used Questions</h3>
        {mostUsed.length === 0 ? (
          <p className="text-muted">No questions used yet</p>
        ) : (
          <div className="admin-analytics-table-wrap">
          <table className="admin-analytics-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Question</th>
                <th>Type</th>
                <th>Times Used</th>
                <th>Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {mostUsed.map((q, index) => (
                <tr key={q._id}>
                  <td>{index + 1}</td>
                  <td>{q.questionText.substring(0, 80)}...</td>
                  <td>
                    <span className="badge badge-info">{q.type}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{q.timesUsed}</td>
                  <td>
                    <span className={`badge ${
                      q.successRate >= 70 ? 'badge-success' : 
                      q.successRate >= 50 ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {q.successRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="form-card admin-analytics-section-card" style={{ marginTop: '30px' }}>
        <h3 style={{ marginBottom: '20px' }}>Export Analytics</h3>
        <div className="admin-analytics-export-actions">
          <button className="btn btn-primary" onClick={() => alert('Export as PDF')}>
            <i className="fas fa-file-pdf me-2"></i>Export as PDF
          </button>
          <button className="btn btn-success" onClick={() => alert('Export as CSV')}>
            <i className="fas fa-file-csv me-2"></i>Export as CSV
          </button>
          <button className="btn btn-info" onClick={() => alert('Export as Excel')}>
            <i className="fas fa-file-excel me-2"></i>Export as Excel
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsageAnalytics;
