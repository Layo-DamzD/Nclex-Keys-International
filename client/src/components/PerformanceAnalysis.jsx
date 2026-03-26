import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PerformanceAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState({ labels: [], scores: [] });
  const [weakAreas, setWeakAreas] = useState([]);
  const [stats, setStats] = useState({ totalTests: 0, averageScore: 0, bestScore: 0 });
  const [questionStats, setQuestionStats] = useState({
    totalQuestions: 0,
    usedQuestions: 0,
    unusedQuestions: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    totalOmitted: 0,
    totalCorrectOnReattempt: 0
  });
  const [viewMode, setViewMode] = useState('classic');

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/student/performance', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data;

        setTrendData({
          labels: data.trend.map(t => t.date),
          scores: data.trend.map(t => t.score)
        });
        setWeakAreas(data.weakAreas);
        setStats(data.stats);

        // Calculate question statistics from test results
        if (data.questionStats) {
          setQuestionStats(data.questionStats);
        }
      } catch (error) {
        console.error('Error fetching performance data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  // Calculate percentages for question stats
  const questionPercentages = useMemo(() => {
    const { totalQuestions, usedQuestions, totalCorrect, totalIncorrect, totalOmitted } = questionStats;
    return {
      usedPercent: totalQuestions > 0 ? Math.round((usedQuestions / totalQuestions) * 100) : 0,
      unusedPercent: totalQuestions > 0 ? Math.round(((totalQuestions - usedQuestions) / totalQuestions) * 100) : 0,
      correctPercent: usedQuestions > 0 ? Math.round((totalCorrect / usedQuestions) * 100) : 0,
      incorrectPercent: usedQuestions > 0 ? Math.round((totalIncorrect / usedQuestions) * 100) : 0,
      omittedPercent: usedQuestions > 0 ? Math.round((totalOmitted / usedQuestions) * 100) : 0,
    };
  }, [questionStats]);

  const trendChartData = {
    labels: trendData.labels,
    datasets: [
      {
        label: 'Score (%)',
        data: trendData.scores,
        borderColor: '#1a5fb4',
        backgroundColor: 'rgba(26, 95, 180, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#1a5fb4',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const trendOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Score Trend (Last 10 Tests)' },
    },
    scales: {
      y: { beginAtZero: true, max: 100, title: { display: true, text: 'Score %' } },
    },
  };

  const weakAreasChartData = {
    labels: weakAreas.map(w => w.category),
    datasets: [
      {
        label: 'Accuracy (%)',
        data: weakAreas.map(w => w.accuracy),
        backgroundColor: weakAreas.map(w =>
          w.accuracy >= 80 ? '#28a745' : w.accuracy >= 60 ? '#fd7e14' : '#dc3545'
        ),
        borderWidth: 0,
      },
    ],
  };

  const weakAreasOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Weak Areas (Accuracy by Category)' },
    },
    scales: {
      y: { beginAtZero: true, max: 100, title: { display: true, text: 'Accuracy %' } },
    },
  };

  // Usage donut chart data
  const usageChartData = {
    labels: ['Used Questions', 'Unused Questions'],
    datasets: [{
      data: [questionStats.usedQuestions, questionStats.totalQuestions - questionStats.usedQuestions],
      backgroundColor: ['#1a5fb4', '#e0e7ff'],
      borderWidth: 0,
      cutout: '70%',
    }],
  };

  const usageChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
  };

  // Questions donut chart data (correct/incorrect/omitted)
  const questionsChartData = {
    labels: ['Correct', 'Incorrect', 'Omitted'],
    datasets: [{
      data: [questionStats.totalCorrect, questionStats.totalIncorrect, questionStats.totalOmitted],
      backgroundColor: ['#22c55e', '#ef4444', '#3b82f6'],
      borderWidth: 0,
      cutout: '70%',
    }],
  };

  const questionsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
  };

  if (loading) return <div className="text-center py-5">Loading performance data...</div>;

  return (
    <div className="performance-analysis">
      <h3 className="mb-4">Performance Analysis</h3>

      {/* Toggle Buttons */}
      <div className="d-flex gap-2 mb-4">
        <button
          type="button"
          className={`btn ${viewMode === 'classic' ? 'btn-teal' : 'btn-outline-secondary'}`}
          onClick={() => setViewMode('classic')}
        >
          Classic ({stats.totalTests})
        </button>
        <button
          type="button"
          className={`btn ${viewMode === 'statistics' ? 'btn-teal' : 'btn-outline-secondary'}`}
          onClick={() => setViewMode('statistics')}
        >
          Statistics ({questionStats.totalQuestions})
        </button>
      </div>

      {viewMode === 'statistics' ? (
        /* Statistics View - Like the image */
        <div className="statistics-dashboard">
          <div className="row">
            {/* Usage Section */}
            <div className="col-md-6 mb-4">
              <div className="stats-dashboard-card">
                <h5 className="stats-card-title">Usage</h5>
                <div className="d-flex align-items-center">
                  <div className="stats-donut-wrapper">
                    <Doughnut data={usageChartData} options={usageChartOptions} />
                  </div>
                  <div className="stats-info ms-4">
                    <div className="stats-info-row">
                      <span className="stats-label">Total Questions</span>
                      <span className="stats-value">{questionStats.totalQuestions}</span>
                    </div>
                    <div className="stats-info-row">
                      <span className="stats-label">Used Questions</span>
                      <span className="stats-value">
                        {questionStats.usedQuestions}
                        <span className="stats-badge stats-badge-purple">{questionPercentages.usedPercent}%</span>
                      </span>
                    </div>
                    <div className="stats-info-row">
                      <span className="stats-label">Unused Questions</span>
                      <span className="stats-value">
                        {questionStats.totalQuestions - questionStats.usedQuestions}
                        <span className="stats-badge stats-badge-blue">{questionPercentages.unusedPercent}%</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Questions Section */}
            <div className="col-md-6 mb-4">
              <div className="stats-dashboard-card">
                <h5 className="stats-card-title">Questions</h5>
                <div className="d-flex align-items-center">
                  <div className="stats-donut-wrapper">
                    <Doughnut data={questionsChartData} options={questionsChartOptions} />
                  </div>
                  <div className="stats-info ms-4">
                    <div className="stats-info-row">
                      <span className="stats-label">Total Correct</span>
                      <span className="stats-value">
                        {questionStats.totalCorrect}
                        <span className="stats-badge stats-badge-green">{questionPercentages.correctPercent}%</span>
                      </span>
                    </div>
                    <div className="stats-info-row">
                      <span className="stats-label">Total Incorrect</span>
                      <span className="stats-value">
                        {questionStats.totalIncorrect}
                        <span className="stats-badge stats-badge-orange">{questionPercentages.incorrectPercent}%</span>
                      </span>
                    </div>
                    <div className="stats-info-row">
                      <span className="stats-label">Total Omitted</span>
                      <span className="stats-value">
                        {questionStats.totalOmitted}
                        <span className="stats-badge stats-badge-blue">{questionPercentages.omittedPercent}%</span>
                      </span>
                    </div>
                    <div className="stats-info-row">
                      <span className="stats-label">Total Correct On Reattempt</span>
                      <span className="stats-value">{questionStats.totalCorrectOnReattempt}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="row">
            <div className="col-md-3 mb-3">
              <div className="summary-stat-card">
                <span className="summary-stat-label">Total Tests</span>
                <strong className="summary-stat-value">{stats.totalTests}</strong>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="summary-stat-card">
                <span className="summary-stat-label">Average Score</span>
                <strong className="summary-stat-value">{stats.averageScore}%</strong>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="summary-stat-card">
                <span className="summary-stat-label">Best Score</span>
                <strong className="summary-stat-value">{stats.bestScore}%</strong>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="summary-stat-card">
                <span className="summary-stat-label">Questions Answered</span>
                <strong className="summary-stat-value">{questionStats.usedQuestions}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Classic View */
        <>
          <div className="row mb-4">
            <div className="col-md-4">
              <div className="stats-card">
                <h5>Total Tests</h5>
                <div className="stats-number">{stats.totalTests}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="stats-card">
                <h5>Average Score</h5>
                <div className="stats-number">{stats.averageScore}%</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="stats-card">
                <h5>Best Score</h5>
                <div className="stats-number">{stats.bestScore}%</div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-8 mb-4">
              <div className="chart-container">
                {trendData.labels.length > 0 ? (
                  <Line data={trendChartData} options={trendOptions} />
                ) : (
                  <p className="text-muted">No test data available yet.</p>
                )}
              </div>
            </div>
            <div className="col-lg-4 mb-4">
              <div className="chart-container">
                {weakAreas.length > 0 ? (
                  <Bar data={weakAreasChartData} options={weakAreasOptions} />
                ) : (
                  <p className="text-muted">No weak area data available yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="recommendations mt-4">
            <h4>Recommendations</h4>
            <ul className="list-group">
              {weakAreas
                .filter(w => w.accuracy < 70)
                .sort((a, b) => a.accuracy - b.accuracy)
                .slice(0, 3)
                .map(w => (
                  <li key={w.category} className="list-group-item">
                    Focus on <strong>{w.category}</strong> (current accuracy: {w.accuracy}%)
                  </li>
                ))}
              {weakAreas.filter(w => w.accuracy >= 70).length > 0 && (
                <li className="list-group-item list-group-item-success">
                  Great job in {weakAreas.filter(w => w.accuracy >= 70).map(w => w.category).join(', ')}!
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default PerformanceAnalysis;
