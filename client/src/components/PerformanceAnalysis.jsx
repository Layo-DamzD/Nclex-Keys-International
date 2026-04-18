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

// Client Needs Framework
const CLIENT_NEEDS = {
  "Safe and Effective Care Environment": [
    "Management of Care",
    "Safety and Infection Control"
  ],
  "Health Promotion and Maintenance": [
    "Aging Process",
    "Ante/Intra/Postpartum and Newborn Care",
    "Developmental Stages and Transitions",
    "Health Promotion/Disease Prevention",
    "Health Screening",
    "Physical Assessment Techniques"
  ],
  "Psychosocial Integrity": [
    "Mental Health Concepts",
    "Crisis Intervention",
    "Coping Mechanisms",
    "Therapeutic Communication"
  ],
  "Physiological Integrity": [
    "Basic Care and Comfort",
    "Pharmacological and Parenteral Therapies",
    "Reduction of Risk Potential",
    "Physiological Adaptation"
  ]
};

// Subject Categories
const SUBJECT_CATEGORIES = [
  "Adult Health",
  "Child Health",
  "Fundamentals",
  "Leadership & Management",
  "Maternal & Newborn Health",
  "Mental Health",
  "Pharmacology"
];

const PerformanceAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState({ labels: [], scores: [] });
  const [weakAreas, setWeakAreas] = useState([]);
  const [stats, setStats] = useState({ totalTests: 0, averageScore: 0, bestScore: 0 });
  const [allAnswers, setAllAnswers] = useState([]);
  const [viewMode, setViewMode] = useState('statistics');

  // Filter states
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedClientNeed, setSelectedClientNeed] = useState('all');
  const [selectedClientNeedSub, setSelectedClientNeedSub] = useState('all');

  // Available subcategories based on selected client need
  const availableClientNeedSubs = useMemo(() => {
    if (selectedClientNeed === 'all') return [];
    return CLIENT_NEEDS[selectedClientNeed] || [];
  }, [selectedClientNeed]);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/student/performance-detailed', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data;

        setTrendData({
          labels: data.trend.map(t => t.date),
          scores: data.trend.map(t => t.score)
        });
        setWeakAreas(data.weakAreas || []);
        setStats(data.stats || { totalTests: 0, averageScore: 0, bestScore: 0 });
        setAllAnswers(data.allAnswers || []);
      } catch (error) {
        console.error('Error fetching performance data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  // Filter answers based on selected filters
  const filteredAnswers = useMemo(() => {
    return allAnswers.filter(answer => {
      if (selectedSubject !== 'all' && answer.category !== selectedSubject) return false;
      if (selectedClientNeed !== 'all' && answer.clientNeed !== selectedClientNeed) return false;
      if (selectedClientNeedSub !== 'all' && answer.clientNeedSubcategory !== selectedClientNeedSub) return false;
      return true;
    });
  }, [allAnswers, selectedSubject, selectedClientNeed, selectedClientNeedSub]);

  // Calculate statistics for filtered data
  const questionStats = useMemo(() => {
    const total = filteredAnswers.length;
    const correct = filteredAnswers.filter(a => a.isCorrect === true).length;
    const incorrect = filteredAnswers.filter(a => a.isCorrect === false).length;
    const omitted = filteredAnswers.filter(a => {
      const ans = a.userAnswer;
      return ans === null || ans === undefined || ans === '' ||
        (Array.isArray(ans) && ans.length === 0);
    }).length;
    const partial = filteredAnswers.filter(a => a.isCorrect === 'partial').length;

    // Calculate points (each correct answer = 1 point)
    let totalPoints = 0;
    let earnedPoints = 0;
    filteredAnswers.forEach(a => {
      const points = a.totalMarks || 1;
      totalPoints += points;
      earnedPoints += a.earnedMarks || (a.isCorrect === true ? 1 : 0);
    });

    return {
      totalQuestions: total,
      correct,
      incorrect,
      omitted,
      partial,
      totalPoints,
      earnedPoints,
      correctPercent: total > 0 ? Math.round((correct / total) * 100) : 0,
      incorrectPercent: total > 0 ? Math.round((incorrect / total) * 100) : 0,
      omittedPercent: total > 0 ? Math.round((omitted / total) * 100) : 0
    };
  }, [filteredAnswers]);

  // Calculate subject breakdown
  const subjectBreakdown = useMemo(() => {
    const breakdown = {};
    filteredAnswers.forEach(answer => {
      const cat = answer.category || 'Unknown';
      if (!breakdown[cat]) {
        breakdown[cat] = { total: 0, correct: 0, incorrect: 0, omitted: 0 };
      }
      breakdown[cat].total += 1;
      if (answer.isCorrect === true) breakdown[cat].correct += 1;
      else if (answer.isCorrect === false) breakdown[cat].incorrect += 1;
      else breakdown[cat].omitted += 1;
    });
    return Object.entries(breakdown).map(([category, stats]) => ({
      category,
      ...stats,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);
  }, [filteredAnswers]);

  // Calculate client needs breakdown
  const clientNeedsBreakdown = useMemo(() => {
    const breakdown = {};
    filteredAnswers.forEach(answer => {
      const cn = answer.clientNeed || 'Uncategorized';
      if (!breakdown[cn]) {
        breakdown[cn] = { total: 0, correct: 0, incorrect: 0, omitted: 0 };
      }
      breakdown[cn].total += 1;
      if (answer.isCorrect === true) breakdown[cn].correct += 1;
      else if (answer.isCorrect === false) breakdown[cn].incorrect += 1;
      else breakdown[cn].omitted += 1;
    });
    return Object.entries(breakdown).map(([clientNeed, stats]) => ({
      clientNeed,
      ...stats,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);
  }, [filteredAnswers]);

  // Reset subcategory when client need changes
  useEffect(() => {
    setSelectedClientNeedSub('all');
  }, [selectedClientNeed]);

  // Chart data
  const usageChartData = {
    labels: ['Correct', 'Incorrect', 'Omitted'],
    datasets: [{
      data: [questionStats.correct, questionStats.incorrect, questionStats.omitted],
      backgroundColor: ['#22c55e', '#ef4444', '#3b82f6'],
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

  const subjectChartData = {
    labels: subjectBreakdown.slice(0, 6).map(s => s.category),
    datasets: [{
      label: 'Accuracy %',
      data: subjectBreakdown.slice(0, 6).map(s => s.accuracy),
      backgroundColor: subjectBreakdown.slice(0, 6).map(s =>
        s.accuracy >= 80 ? '#22c55e' : s.accuracy >= 60 ? '#f59e0b' : '#ef4444'
      ),
      borderWidth: 0,
      borderRadius: 6,
    }],
  };

  const subjectChartOptions = {
    responsive: true,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { beginAtZero: true, max: 100, grid: { color: 'rgba(96, 165, 250, 0.1)' } },
      y: { grid: { display: false } },
    },
  };

  const trendChartData = {
    labels: trendData.labels,
    datasets: [{
      label: 'Score (%)',
      data: trendData.scores,
      borderColor: '#60a5fa',
      backgroundColor: 'rgba(96, 165, 250, 0.1)',
      tension: 0.4,
      fill: true,
    }],
  };

  const trendChartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, max: 100, grid: { color: 'rgba(96, 165, 250, 0.1)' } },
      x: { grid: { color: 'rgba(96, 165, 250, 0.1)' } },
    },
  };

  if (loading) return <div className="text-center py-5">Loading performance data...</div>;

  return (
    <div className="performance-analysis">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0">Statistics</h3>
        <div className="d-flex gap-2">
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
      </div>

      {viewMode === 'statistics' ? (
        <>
          {/* Filter Dropdowns */}
          <div className="row mb-4">
            <div className="col-md-4 mb-3">
              <label className="form-label text-light">Subject</label>
              <select
                className="form-select"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="all">All Subjects</option>
                {SUBJECT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label text-light">Client Need</label>
              <select
                className="form-select"
                value={selectedClientNeed}
                onChange={(e) => setSelectedClientNeed(e.target.value)}
              >
                <option value="all">All Client Needs</option>
                {Object.keys(CLIENT_NEEDS).map(cn => (
                  <option key={cn} value={cn}>{cn}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label text-light">Subcategory</label>
              <select
                className="form-select"
                value={selectedClientNeedSub}
                onChange={(e) => setSelectedClientNeedSub(e.target.value)}
                disabled={selectedClientNeed === 'all'}
              >
                <option value="all">All Subcategories</option>
                {availableClientNeedSubs.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Statistics Dashboard */}
          <div className="row">
            {/* Questions Section */}
            <div className="col-md-6 mb-4">
              <div className="stats-dashboard-card">
                <h5 className="stats-card-title">Questions</h5>
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
                      <span className="stats-label">Total Correct</span>
                      <span className="stats-value">
                        {questionStats.correct}
                        <span className="stats-badge stats-badge-green">{questionStats.correctPercent}%</span>
                      </span>
                    </div>
                    <div className="stats-info-row">
                      <span className="stats-label">Total Incorrect</span>
                      <span className="stats-value">
                        {questionStats.incorrect}
                        <span className="stats-badge stats-badge-orange">{questionStats.incorrectPercent}%</span>
                      </span>
                    </div>
                    <div className="stats-info-row">
                      <span className="stats-label">Total Omitted</span>
                      <span className="stats-value">
                        {questionStats.omitted}
                        <span className="stats-badge stats-badge-blue">{questionStats.omittedPercent}%</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Points Section */}
            <div className="col-md-6 mb-4">
              <div className="stats-dashboard-card">
                <h5 className="stats-card-title">Points</h5>
                <div className="stats-info">
                  <div className="stats-info-row">
                    <span className="stats-label">Points Scored</span>
                    <span className="stats-value">
                      <span className="stats-badge stats-badge-green me-2">
                        {questionStats.totalPoints > 0 ? Math.round((questionStats.earnedPoints / questionStats.totalPoints) * 100) : 0}%
                      </span>
                      {questionStats.earnedPoints}/{questionStats.totalPoints}
                    </span>
                  </div>
                  <div className="stats-info-row">
                    <span className="stats-label">Correct Questions</span>
                    <span className="stats-value">{questionStats.correct}</span>
                  </div>
                  <div className="stats-info-row">
                    <span className="stats-label">Partial Correct</span>
                    <span className="stats-value">{questionStats.partial}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subject Statistics */}
          <div className="row">
            <div className="col-lg-6 mb-4">
              <div className="stats-dashboard-card">
                <h5 className="stats-card-title">Subjects Statistics</h5>
                {subjectBreakdown.length > 0 ? (
                  <Bar data={subjectChartData} options={subjectChartOptions} />
                ) : (
                  <p className="text-muted">No subject data available</p>
                )}
              </div>
            </div>
            <div className="col-lg-6 mb-4">
              <div className="stats-dashboard-card">
                <h5 className="stats-card-title">Client Needs Statistics</h5>
                {clientNeedsBreakdown.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-dark table-striped">
                      <thead>
                        <tr>
                          <th>Client Need</th>
                          <th>Total</th>
                          <th>Correct</th>
                          <th>Accuracy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientNeedsBreakdown.map(cn => (
                          <tr key={cn.clientNeed}>
                            <td>{cn.clientNeed}</td>
                            <td>{cn.total}</td>
                            <td>{cn.correct}</td>
                            <td>
                              <span className={`stats-badge ${cn.accuracy >= 70 ? 'stats-badge-green' : 'stats-badge-orange'}`}>
                                {cn.accuracy}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted">No client needs data available</p>
                )}
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
                <strong className="summary-stat-value">{questionStats.totalQuestions}</strong>
              </div>
            </div>
          </div>
        </>
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
                  <Line data={trendChartData} options={trendChartOptions} />
                ) : (
                  <p className="text-muted">No test data available yet.</p>
                )}
              </div>
            </div>
            <div className="col-lg-4 mb-4">
              <div className="chart-container">
                <h5>Weak Areas</h5>
                {weakAreas.length > 0 ? (
                  <ul className="list-group mt-3">
                    {weakAreas.slice(0, 5).map(w => (
                      <li key={w.category} className="list-group-item d-flex justify-content-between align-items-center">
                        {w.category}
                        <span className={`badge ${w.accuracy >= 70 ? 'bg-success' : w.accuracy >= 50 ? 'bg-warning' : 'bg-danger'}`}>
                          {w.accuracy}%
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">No weak area data available yet.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PerformanceAnalysis;
