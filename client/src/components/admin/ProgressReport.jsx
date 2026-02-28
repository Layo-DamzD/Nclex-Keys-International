import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ProgressReport = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progressData, setProgressData] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchProgress();
    }
  }, [selectedStudent, timeRange]);

  const fetchStudents = async () => {
    setError('');
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/students/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (err) {
      setStudents([]);
      setError(err?.response?.data?.message || 'Failed to load students');
      console.error('Failed to load students:', err);
    }
  };

  const fetchProgress = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get(`/api/admin/students/${selectedStudent}/progress?timeRange=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProgressData(response.data);
    } catch (err) {
      setError('Failed to load progress data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = progressData ? {
    labels: progressData.trendData.map(d => d.date),
    datasets: [
      {
        label: 'Score (%)',
        data: progressData.trendData.map(d => d.score),
        borderColor: '#1a5fb4',
        backgroundColor: 'rgba(26, 95, 180, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Score %'
        }
      }
    }
  };

return (
    <div className="progress-report">
      <div className="header" style={{ marginBottom: '20px' }}>
        <h1>Progress Report</h1>
        <p style={{ color: '#64748b' }}>Track student learning progress and performance</p>
      </div>

      <div className="form-card" style={{ marginBottom: '30px' }}>
        <div className="progress-report-filter-row" style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Select Student</label>
            <select
              className="form-control"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
            >
              <option value="">Choose a student</option>
              {students.map(s => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.email})
                </option>
              ))}
              {!students.length && <option value="" disabled>No students found</option>}
            </select>
          </div>

          <div className="form-group progress-report-time-range" style={{ width: 'min(200px, 100%)' }}>
            <label className="form-label">Time Range</label>
            <select
              className="form-control"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading && <div className="text-center py-5">Loading progress data...</div>}

      {progressData && !loading && (
        <>
          {/* Student Info & Stats */}
          <div className="form-card" style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '20px' }}>{progressData.student.name}</h3>
            <p className="text-muted mb-4">{progressData.student.email} • {progressData.student.program}</p>

            <div
              className="progress-report-stats-grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}
            >
              <div className="stat-card text-center">
                <h4>Total Tests</h4>
                <div className="stat-number" style={{ fontSize: '2rem' }}>{progressData.stats.totalTests}</div>
              </div>
              <div className="stat-card text-center">
                <h4>Avg Score</h4>
                <div className="stat-number" style={{ fontSize: '2rem' }}>{progressData.stats.averageScore}%</div>
              </div>
              <div className="stat-card text-center">
                <h4>Best Score</h4>
                <div className="stat-number" style={{ fontSize: '2rem' }}>{progressData.stats.bestScore}%</div>
              </div>
              <div className="stat-card text-center">
                <h4>Accuracy</h4>
                <div className="stat-number" style={{ fontSize: '2rem' }}>{progressData.stats.overallAccuracy}%</div>
              </div>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="form-card" style={{ marginBottom: '30px' }}>
            <h4 style={{ marginBottom: '20px' }}>Score Trend</h4>
            <div style={{ height: '300px' }}>
              {progressData.trendData.length > 0 ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <p className="text-muted text-center py-5">No test data available for this period</p>
              )}
            </div>
          </div>

          {/* Weak Areas */}
          <div className="form-card" style={{ marginBottom: '30px' }}>
            <h4 style={{ marginBottom: '20px' }}>Areas Needing Improvement</h4>
            {progressData.weakAreas.length === 0 ? (
              <p className="text-muted">No weak areas identified</p>
            ) : (
              <div className="weak-areas-list">
                {progressData.weakAreas.map((area, idx) => (
                  <div key={idx} className="weak-area-item progress-report-weak-area-item" style={{ 
                    padding: '15px', 
                    borderBottom: idx < progressData.weakAreas.length - 1 ? '1px solid #e2e8f0' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{area.category}</span>
                    <span style={{ 
                      background: area.accuracy < 50 ? '#fee2e2' : area.accuracy < 70 ? '#fef3c7' : '#d1fae5',
                      color: area.accuracy < 50 ? '#991b1b' : area.accuracy < 70 ? '#92400e' : '#065f46',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontWeight: 600
                    }}>
                      {area.accuracy}% accuracy ({area.attempts} attempts)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Test History */}
          <div className="form-card">
            <h4 style={{ marginBottom: '20px' }}>Test History</h4>
            {progressData.testResults.length === 0 ? (
              <p className="text-muted">No tests taken in this period</p>
            ) : (
              <div className="data-table-container progress-report-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Test Name</th>
                      <th>Score</th>
                      <th>Percentage</th>
                      <th>Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progressData.testResults.map(test => (
                      <tr key={test._id}>
                        <td>{new Date(test.date).toLocaleDateString()}</td>
                        <td>{test.testName}</td>
                        <td>{test.score}/{test.totalQuestions}</td>
                        <td>
                          <span className={`badge ${test.passed ? 'badge-success' : 'badge-danger'}`}>
                            {test.percentage}%
                          </span>
                        </td>
                        <td>{test.timeTaken} min</td>
                        <td>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => navigate(`/admin/test-results/${test._id}/review`)}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProgressReport;

