import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
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

// NCLEX Client Needs Framework
const CLIENT_NEEDS_FRAMEWORK = {
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
    "High Risk Behaviors",
    "Immunizations",
    "Lifestyle Choices",
    "Physical Assessment Techniques",
    "Self-Care"
  ],
  "Psychosocial Integrity": [
    "Abuse/Neglect",
    "Behavioral Interventions",
    "Chemical and Other Dependencies",
    "Coping Mechanisms",
    "Crisis Intervention",
    "Cultural Awareness",
    "End of Life Care",
    "Grief and Loss",
    "Mental Health Concepts",
    "Religious and Spiritual Influences on Health",
    "Sensory/Perceptual Alterations",
    "Situational Role Changes",
    "Stress Management",
    "Support Systems",
    "Therapeutic Communication",
    "Therapeutic Environment"
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

const TopicAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [allAnswers, setAllAnswers] = useState([]);
  const [testHistory, setTestHistory] = useState([]);

  // Filter states
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedClientNeed, setSelectedClientNeed] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'line' or 'doughnut'

  // Available subcategories based on selected client need
  const availableSubcategories = useMemo(() => {
    if (selectedClientNeed === 'all') return [];
    return CLIENT_NEEDS_FRAMEWORK[selectedClientNeed] || [];
  }, [selectedClientNeed]);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/student/performance-detailed', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data;

        setAllAnswers(data.allAnswers || []);
        setTestHistory(data.trend || []);
      } catch (error) {
        console.error('Error fetching performance data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  // Reset subcategory when client need changes
  useEffect(() => {
    setSelectedSubcategory('all');
  }, [selectedClientNeed]);

  // Filter answers based on selected filters
  const filteredAnswers = useMemo(() => {
    return allAnswers.filter(answer => {
      if (selectedSubject !== 'all' && answer.category !== selectedSubject) return false;
      if (selectedClientNeed !== 'all' && answer.clientNeed !== selectedClientNeed) return false;
      if (selectedSubcategory !== 'all' && answer.clientNeedSubcategory !== selectedSubcategory) return false;
      return true;
    });
  }, [allAnswers, selectedSubject, selectedClientNeed, selectedSubcategory]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const total = filteredAnswers.length;
    const correct = filteredAnswers.filter(a => a.isCorrect === true).length;
    const incorrect = filteredAnswers.filter(a => a.isCorrect === false).length;
    const omitted = filteredAnswers.filter(a => {
      const ans = a.userAnswer;
      return ans === null || ans === undefined || ans === '' ||
        (Array.isArray(ans) && ans.length === 0);
    }).length;

    return {
      total,
      correct,
      incorrect,
      omitted,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0
    };
  }, [filteredAnswers]);

  // Calculate topic breakdown (by subject category)
  const topicBreakdown = useMemo(() => {
    const breakdown = {};
    filteredAnswers.forEach(answer => {
      const topic = answer.category || 'Unknown';
      if (!breakdown[topic]) {
        breakdown[topic] = { total: 0, correct: 0, incorrect: 0, time: 0, count: 0 };
      }
      breakdown[topic].total += 1;
      breakdown[topic].count += 1;
      if (answer.isCorrect === true) breakdown[topic].correct += 1;
      else if (answer.isCorrect === false) breakdown[topic].incorrect += 1;
      if (answer.timeSpent) breakdown[topic].time += answer.timeSpent;
    });
    return Object.entries(breakdown).map(([topic, stats]) => ({
      topic,
      ...stats,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      avgTime: stats.count > 0 ? Math.round(stats.time / stats.count) : 0
    })).sort((a, b) => b.total - a.total);
  }, [filteredAnswers]);

  // Calculate client needs breakdown
  const clientNeedsBreakdown = useMemo(() => {
    const breakdown = {};
    filteredAnswers.forEach(answer => {
      const cn = answer.clientNeed || 'Uncategorized';
      if (!breakdown[cn]) {
        breakdown[cn] = { total: 0, correct: 0, incorrect: 0 };
      }
      breakdown[cn].total += 1;
      if (answer.isCorrect === true) breakdown[cn].correct += 1;
      else if (answer.isCorrect === false) breakdown[cn].incorrect += 1;
    });
    return Object.entries(breakdown).map(([clientNeed, stats]) => ({
      clientNeed,
      ...stats,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);
  }, [filteredAnswers]);

  // Calculate subcategory breakdown
  const subcategoryBreakdown = useMemo(() => {
    if (selectedClientNeed === 'all') return [];

    const breakdown = {};
    filteredAnswers.forEach(answer => {
      const sub = answer.clientNeedSubcategory || 'Uncategorized';
      if (!breakdown[sub]) {
        breakdown[sub] = { total: 0, correct: 0, incorrect: 0 };
      }
      breakdown[sub].total += 1;
      if (answer.isCorrect === true) breakdown[sub].correct += 1;
      else if (answer.isCorrect === false) breakdown[sub].incorrect += 1;
    });
    return Object.entries(breakdown).map(([subcategory, stats]) => ({
      subcategory,
      ...stats,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);
  }, [filteredAnswers, selectedClientNeed]);

  // Performance over time
  const performanceOverTime = useMemo(() => {
    // Group by date
    const byDate = {};
    filteredAnswers.forEach(answer => {
      const date = answer.answeredAt ? new Date(answer.answeredAt).toLocaleDateString() : 'Unknown';
      if (!byDate[date]) {
        byDate[date] = { total: 0, correct: 0 };
      }
      byDate[date].total += 1;
      if (answer.isCorrect === true) byDate[date].correct += 1;
    });

    return Object.entries(byDate).map(([date, stats]) => ({
      date,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      total: stats.total,
      correct: stats.correct
    })).slice(-10); // Last 10 days
  }, [filteredAnswers]);

  // Chart data for topic accuracy
  const topicChartData = {
    labels: topicBreakdown.slice(0, 8).map(t => t.topic.length > 15 ? t.topic.substring(0, 15) + '...' : t.topic),
    datasets: [{
      label: 'Accuracy %',
      data: topicBreakdown.slice(0, 8).map(t => t.accuracy),
      backgroundColor: topicBreakdown.slice(0, 8).map(t =>
        t.accuracy >= 80 ? '#22c55e' : t.accuracy >= 60 ? '#f59e0b' : '#ef4444'
      ),
      borderColor: topicBreakdown.slice(0, 8).map(t =>
        t.accuracy >= 80 ? '#16a34a' : t.accuracy >= 60 ? '#d97706' : '#dc2626'
      ),
      borderWidth: 1,
      borderRadius: 6,
    }]
  };

  // Chart data for client needs
  const clientNeedsChartData = {
    labels: clientNeedsBreakdown.map(cn => cn.clientNeed.length > 20 ? cn.clientNeed.substring(0, 20) + '...' : cn.clientNeed),
    datasets: [{
      label: 'Accuracy %',
      data: clientNeedsBreakdown.map(cn => cn.accuracy),
      backgroundColor: clientNeedsBreakdown.map(cn =>
        cn.accuracy >= 80 ? '#22c55e' : cn.accuracy >= 60 ? '#f59e0b' : '#ef4444'
      ),
      borderWidth: 0,
      borderRadius: 6,
    }]
  };

  // Doughnut chart data
  const doughnutChartData = {
    labels: ['Correct', 'Incorrect', 'Omitted'],
    datasets: [{
      data: [overallStats.correct, overallStats.incorrect, overallStats.omitted],
      backgroundColor: ['#22c55e', '#ef4444', '#6b7280'],
      borderWidth: 0,
      cutout: '65%',
    }]
  };

  // Line chart data for performance over time
  const lineChartData = {
    labels: performanceOverTime.map(p => p.date),
    datasets: [{
      label: 'Accuracy %',
      data: performanceOverTime.map(p => p.accuracy),
      borderColor: '#60a5fa',
      backgroundColor: 'rgba(96, 165, 250, 0.1)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#60a5fa',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
    }]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `Accuracy: ${context.raw}%`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { color: '#94a3b8' }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#94a3b8' }
      },
    }
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#94a3b8', padding: 20 }
      }
    }
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { color: '#94a3b8' }
      },
      x: {
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { color: '#94a3b8' }
      },
    }
  };

  if (loading) {
    return (
      <div className="topic-analysis-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="topic-analysis">
      {/* Header */}
      <div className="analysis-header">
        <h3>Topic Analysis</h3>
        <p className="text-muted">Track your performance by subject and client needs</p>
      </div>

      {/* Filter Dropdowns */}
      <div className="filter-section">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">
              <i className="fas fa-book-medical me-2"></i>Subject Category
            </label>
            <select
              className="form-select filter-dropdown"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="all">All Subjects</option>
              {SUBJECT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">
              <i className="fas fa-clipboard-list me-2"></i>Client Need
            </label>
            <select
              className="form-select filter-dropdown"
              value={selectedClientNeed}
              onChange={(e) => setSelectedClientNeed(e.target.value)}
            >
              <option value="all">All Client Needs</option>
              {Object.keys(CLIENT_NEEDS_FRAMEWORK).map(cn => (
                <option key={cn} value={cn}>{cn}</option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">
              <i className="fas fa-tags me-2"></i>Subcategory
            </label>
            <select
              className="form-select filter-dropdown"
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              disabled={selectedClientNeed === 'all'}
            >
              <option value="all">All Subcategories</option>
              {availableSubcategories.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="row g-3">
          <div className="col-md-3 col-sm-6">
            <div className="summary-card">
              <div className="summary-icon bg-primary-subtle">
                <i className="fas fa-question-circle text-primary"></i>
              </div>
              <div className="summary-info">
                <span className="summary-label">Total Questions</span>
                <strong className="summary-value">{overallStats.total}</strong>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="summary-card">
              <div className="summary-icon bg-success-subtle">
                <i className="fas fa-check-circle text-success"></i>
              </div>
              <div className="summary-info">
                <span className="summary-label">Correct</span>
                <strong className="summary-value text-success">{overallStats.correct}</strong>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="summary-card">
              <div className="summary-icon bg-danger-subtle">
                <i className="fas fa-times-circle text-danger"></i>
              </div>
              <div className="summary-info">
                <span className="summary-label">Incorrect</span>
                <strong className="summary-value text-danger">{overallStats.incorrect}</strong>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="summary-card">
              <div className="summary-icon bg-info-subtle">
                <i className="fas fa-percentage text-info"></i>
              </div>
              <div className="summary-info">
                <span className="summary-label">Accuracy</span>
                <strong className="summary-value text-info">{overallStats.accuracy}%</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="row g-4">
          {/* Subject Performance Chart */}
          <div className="col-lg-6">
            <div className="chart-card">
              <div className="chart-header">
                <h5><i className="fas fa-chart-bar me-2"></i>Subject Performance</h5>
                <div className="chart-type-toggle">
                  <button
                    className={`toggle-btn ${chartType === 'bar' ? 'active' : ''}`}
                    onClick={() => setChartType('bar')}
                  >
                    <i className="fas fa-chart-bar"></i>
                  </button>
                  <button
                    className={`toggle-btn ${chartType === 'doughnut' ? 'active' : ''}`}
                    onClick={() => setChartType('doughnut')}
                  >
                    <i className="fas fa-chart-pie"></i>
                  </button>
                </div>
              </div>
              <div className="chart-body">
                {chartType === 'bar' ? (
                  <Bar data={topicChartData} options={barChartOptions} />
                ) : (
                  <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
                )}
              </div>
            </div>
          </div>

          {/* Performance Trend */}
          <div className="col-lg-6">
            <div className="chart-card">
              <div className="chart-header">
                <h5><i className="fas fa-chart-line me-2"></i>Performance Trend</h5>
              </div>
              <div className="chart-body">
                <Line data={lineChartData} options={lineChartOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Client Needs Breakdown Table */}
      <div className="breakdown-section">
        <div className="row g-4">
          {/* Client Needs Table */}
          <div className="col-lg-6">
            <div className="table-card">
              <div className="table-header">
                <h5><i className="fas fa-layer-group me-2"></i>Client Needs Breakdown</h5>
              </div>
              <div className="table-body">
                {clientNeedsBreakdown.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Client Need</th>
                          <th>Total</th>
                          <th>Correct</th>
                          <th>Accuracy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientNeedsBreakdown.map((cn, idx) => (
                          <tr key={idx}>
                            <td>{cn.clientNeed}</td>
                            <td>{cn.total}</td>
                            <td>{cn.correct}</td>
                            <td>
                              <span className={`accuracy-badge ${cn.accuracy >= 70 ? 'success' : cn.accuracy >= 50 ? 'warning' : 'danger'}`}>
                                {cn.accuracy}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="no-data">
                    <i className="fas fa-inbox"></i>
                    <p>No client needs data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subcategory Breakdown */}
          {selectedClientNeed !== 'all' && (
            <div className="col-lg-6">
              <div className="table-card">
                <div className="table-header">
                  <h5><i className="fas fa-sitemap me-2"></i>{selectedClientNeed} - Subcategories</h5>
                </div>
                <div className="table-body">
                  {subcategoryBreakdown.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Subcategory</th>
                            <th>Total</th>
                            <th>Correct</th>
                            <th>Accuracy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subcategoryBreakdown.map((sub, idx) => (
                            <tr key={idx}>
                              <td>{sub.subcategory}</td>
                              <td>{sub.total}</td>
                              <td>{sub.correct}</td>
                              <td>
                                <span className={`accuracy-badge ${sub.accuracy >= 70 ? 'success' : sub.accuracy >= 50 ? 'warning' : 'danger'}`}>
                                  {sub.accuracy}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="no-data">
                      <i className="fas fa-inbox"></i>
                      <p>No subcategory data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Topic Details Table */}
          <div className="col-12">
            <div className="table-card">
              <div className="table-header">
                <h5><i className="fas fa-list-alt me-2"></i>Subject Details</h5>
              </div>
              <div className="table-body">
                {topicBreakdown.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Total Questions</th>
                          <th>Correct</th>
                          <th>Incorrect</th>
                          <th>Accuracy</th>
                          <th>Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topicBreakdown.map((topic, idx) => (
                          <tr key={idx}>
                            <td><strong>{topic.topic}</strong></td>
                            <td>{topic.total}</td>
                            <td className="text-success">{topic.correct}</td>
                            <td className="text-danger">{topic.incorrect}</td>
                            <td>
                              <span className={`accuracy-badge ${topic.accuracy >= 70 ? 'success' : topic.accuracy >= 50 ? 'warning' : 'danger'}`}>
                                {topic.accuracy}%
                              </span>
                            </td>
                            <td>
                              <div className="progress" style={{ height: '8px', width: '100px' }}>
                                <div
                                  className={`progress-bar ${topic.accuracy >= 70 ? 'bg-success' : topic.accuracy >= 50 ? 'bg-warning' : 'bg-danger'}`}
                                  style={{ width: `${topic.accuracy}%` }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="no-data">
                    <i className="fas fa-inbox"></i>
                    <p>No topic data available. Start taking tests to see your progress!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .topic-analysis {
          padding: 20px;
        }

        .topic-analysis-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 300px;
        }

        .analysis-header {
          margin-bottom: 24px;
        }

        .analysis-header h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .filter-section {
          background: #fff;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .filter-dropdown {
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          padding: 10px 12px;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .filter-dropdown:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
        }

        .filter-dropdown:disabled {
          background-color: #f8fafc;
        }

        .summary-cards {
          margin-bottom: 24px;
        }

        .summary-card {
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .summary-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .summary-info {
          display: flex;
          flex-direction: column;
        }

        .summary-label {
          font-size: 0.8rem;
          color: #64748b;
        }

        .summary-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
        }

        .charts-section {
          margin-bottom: 24px;
        }

        .chart-card {
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .chart-header {
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chart-header h5 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #334155;
        }

        .chart-type-toggle {
          display: flex;
          gap: 4px;
        }

        .toggle-btn {
          width: 32px;
          height: 32px;
          border: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 6px;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
        }

        .toggle-btn.active {
          background: #60a5fa;
          border-color: #60a5fa;
          color: #fff;
        }

        .chart-body {
          padding: 20px;
          height: 280px;
        }

        .breakdown-section {
          margin-bottom: 24px;
        }

        .table-card {
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .table-header {
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
        }

        .table-header h5 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #334155;
        }

        .table-body {
          padding: 0;
        }

        .table th {
          background: #f8fafc;
          font-weight: 600;
          font-size: 0.85rem;
          color: #475569;
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .table td {
          padding: 12px 16px;
          font-size: 0.9rem;
          color: #334155;
          vertical-align: middle;
        }

        .accuracy-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .accuracy-badge.success {
          background: #dcfce7;
          color: #16a34a;
        }

        .accuracy-badge.warning {
          background: #fef3c7;
          color: #d97706;
        }

        .accuracy-badge.danger {
          background: #fee2e2;
          color: #dc2626;
        }

        .no-data {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
        }

        .no-data i {
          font-size: 2.5rem;
          margin-bottom: 12px;
        }

        .no-data p {
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default TopicAnalysis;
