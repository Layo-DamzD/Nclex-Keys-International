import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const IncorrectQuestions = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('lastAttempted'); // 'lastAttempted', 'attemptCount', 'category'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    fetchIncorrectQuestions();
  }, []);

  const fetchIncorrectQuestions = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/student/incorrect-questions', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const safeQuestions = Array.isArray(response.data)
        ? response.data.filter((q) => q && q._id && q.questionText)
        : [];

      setQuestions(safeQuestions);
    } catch (err) {
      console.error('Error fetching incorrect questions:', err);
      setError('Failed to load incorrect questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(questions.map(q => q.category).filter(Boolean));
    return ['all', ...Array.from(cats).sort()];
  }, [questions]);

  // Filter and sort questions
  const filteredQuestions = useMemo(() => {
    let result = [...questions];

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(q => q.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(q =>
        q.questionText?.toLowerCase().includes(term) ||
        q.category?.toLowerCase().includes(term) ||
        q.subcategory?.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'attemptCount':
          return (b.attemptCount || 0) - (a.attemptCount || 0);
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'lastAttempted':
        default:
          const dateA = a.lastAttempted ? new Date(a.lastAttempted).getTime() : 0;
          const dateB = b.lastAttempted ? new Date(b.lastAttempted).getTime() : 0;
          return dateB - dateA;
      }
    });

    return result;
  }, [questions, selectedCategory, searchTerm, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = questions.length;
    const byCategory = {};
    questions.forEach(q => {
      const cat = q.category || 'Unknown';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });
    return { total, byCategory };
  }, [questions]);

  const handleRetakeQuestion = (question) => {
    if (!question?._id) {
      window.alert('Question could not be loaded for retake.');
      return;
    }

    navigate('/test-session', {
      state: {
        questions: [question],
        settings: {
          timed: false,
          tutorMode: false,
          totalQuestions: 1,
          source: 'incorrect-questions',
          returnTo: '/dashboard?section=incorrect-questions'
        }
      }
    });
  };

  const handleRetakeAll = () => {
    if (filteredQuestions.length === 0) {
      window.alert('No questions to retake.');
      return;
    }

    navigate('/test-session', {
      state: {
        questions: filteredQuestions.slice(0, 50), // Limit to 50 questions max
        settings: {
          timed: false,
          tutorMode: true,
          totalQuestions: Math.min(filteredQuestions.length, 50),
          source: 'incorrect-questions',
          returnTo: '/dashboard?section=incorrect-questions'
        }
      }
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Adult Health': { bg: '#fef3c7', border: '#f59e0b', accent: '#d97706' },
      'Child Health': { bg: '#dbeafe', border: '#3b82f6', accent: '#2563eb' },
      'Fundamentals': { bg: '#dcfce7', border: '#22c55e', accent: '#16a34a' },
      'Leadership & Management': { bg: '#f3e8ff', border: '#a855f7', accent: '#9333ea' },
      'Maternal & Newborn Health': { bg: '#fce7f3', border: '#ec4899', accent: '#db2777' },
      'Mental Health': { bg: '#e0e7ff', border: '#6366f1', accent: '#4f46e5' },
      'Pharmacology': { bg: '#cffafe', border: '#06b6d4', accent: '#0891b2' },
    };
    return colors[category] || { bg: '#f1f5f9', border: '#64748b', accent: '#475569' };
  };

  const getTypeIcon = (type) => {
    const icons = {
      'multiple-choice': 'fa-list-ul',
      'sata': 'fa-check-double',
      'fill-blank': 'fa-pen',
      'hotspot': 'fa-crosshairs',
      'drag-drop': 'fa-arrows-alt',
      'matrix': 'fa-th',
      'case-study': 'fa-book-open',
      'default': 'fa-question-circle'
    };
    return icons[type] || icons.default;
  };

  if (loading) {
    return (
      <div className="incorrect-questions-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your incorrect questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="incorrect-questions">
      {/* Header */}
      <div className="iq-header">
        <div className="iq-header-content">
          <div className="iq-title-section">
            <h2>
              <i className="fas fa-exclamation-triangle me-2"></i>
              Incorrect Questions
            </h2>
            <p>Review and retake questions you answered incorrectly</p>
          </div>
          <div className="iq-header-stats">
            <div className="iq-stat-card">
              <div className="iq-stat-value">{stats.total}</div>
              <div className="iq-stat-label">Total Incorrect</div>
            </div>
            <div className="iq-stat-card">
              <div className="iq-stat-value">{Object.keys(stats.byCategory).length}</div>
              <div className="iq-stat-label">Categories</div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="iq-error">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
          <button className="btn btn-sm btn-outline-danger ms-3" onClick={fetchIncorrectQuestions}>
            <i className="fas fa-redo me-1"></i> Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="iq-filters">
        <div className="iq-search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="iq-clear-btn" onClick={() => setSearchTerm('')}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <div className="iq-filter-group">
          <select
            className="iq-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          <select
            className="iq-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="lastAttempted">Most Recent</option>
            <option value="attemptCount">Most Attempts</option>
            <option value="category">By Category</option>
          </select>

          <div className="iq-view-toggle">
            <button
              className={`iq-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <i className="fas fa-th-large"></i>
            </button>
            <button
              className={`iq-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <i className="fas fa-list"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {filteredQuestions.length > 0 && (
        <div className="iq-action-bar">
          <div className="iq-results-count">
            Showing <strong>{filteredQuestions.length}</strong> of <strong>{stats.total}</strong> questions
          </div>
          <button className="iq-btn iq-btn-primary" onClick={handleRetakeAll}>
            <i className="fas fa-redo me-2"></i>
            Retake All ({Math.min(filteredQuestions.length, 50)})
          </button>
        </div>
      )}

      {/* Questions */}
      {filteredQuestions.length === 0 ? (
        <div className="iq-empty-state">
          <div className="iq-empty-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <h3>Great Job!</h3>
          <p>
            {searchTerm || selectedCategory !== 'all'
              ? 'No questions match your current filters.'
              : 'You have no incorrect questions to review.'}
          </p>
          {(searchTerm || selectedCategory !== 'all') && (
            <button
              className="iq-btn iq-btn-secondary"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className={`iq-questions-${viewMode}`}>
          {filteredQuestions.map((q, idx) => {
            const colorStyle = getCategoryColor(q.category);
            return (
              <div
                key={q._id}
                className="iq-question-card"
                style={{
                  '--card-bg': colorStyle.bg,
                  '--card-border': colorStyle.border,
                  '--card-accent': colorStyle.accent
                }}
              >
                <div className="iq-card-header">
                  <div className="iq-card-category">
                    <i className="fas fa-folder me-1"></i>
                    {q.category || 'Unknown'}
                  </div>
                  <div className="iq-card-badges">
                    {q.type && (
                      <span className="iq-badge iq-badge-type">
                        <i className={`fas ${getTypeIcon(q.type)} me-1`}></i>
                        {q.type}
                      </span>
                    )}
                    <span className="iq-badge iq-badge-attempts">
                      <i className="fas fa-redo me-1"></i>
                      {q.attemptCount || 0} attempts
                    </span>
                  </div>
                </div>

                <div className="iq-card-body">
                  <p className="iq-question-text">
                    {(idx + 1)}. {q.questionText?.substring(0, 150)}
                    {q.questionText?.length > 150 ? '...' : ''}
                  </p>
                  {q.subcategory && (
                    <div className="iq-subcategory">
                      <i className="fas fa-tag me-1"></i>
                      {q.subcategory}
                    </div>
                  )}
                </div>

                <div className="iq-card-footer">
                  <div className="iq-last-attempt">
                    <i className="fas fa-clock me-1"></i>
                    Last attempted: {q.lastAttempted ? new Date(q.lastAttempted).toLocaleDateString() : 'N/A'}
                  </div>
                  <button
                    className="iq-btn iq-btn-retake"
                    onClick={() => handleRetakeQuestion(q)}
                  >
                    <i className="fas fa-play me-1"></i>
                    Retake
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Styles */}
      <style>{`
        .incorrect-questions {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .incorrect-questions-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .loading-spinner {
          text-align: center;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Header */
        .iq-header {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          color: white;
        }

        .iq-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .iq-title-section h2 {
          margin: 0 0 4px;
          font-size: 1.75rem;
          font-weight: 700;
        }

        .iq-title-section p {
          margin: 0;
          opacity: 0.9;
        }

        .iq-header-stats {
          display: flex;
          gap: 16px;
        }

        .iq-stat-card {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          padding: 12px 20px;
          border-radius: 12px;
          text-align: center;
          min-width: 100px;
        }

        .iq-stat-value {
          font-size: 1.75rem;
          font-weight: 700;
        }

        .iq-stat-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.9;
        }

        /* Error */
        .iq-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
        }

        /* Filters */
        .iq-filters {
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .iq-search-box {
          flex: 1;
          min-width: 200px;
          position: relative;
        }

        .iq-search-box i {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .iq-search-box input {
          width: 100%;
          padding: 10px 36px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .iq-search-box input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .iq-clear-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
        }

        .iq-filter-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .iq-select {
          padding: 10px 32px 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #fff;
          font-size: 0.9rem;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
        }

        .iq-view-toggle {
          display: flex;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }

        .iq-toggle-btn {
          padding: 10px 14px;
          background: #fff;
          border: none;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .iq-toggle-btn.active {
          background: #3b82f6;
          color: #fff;
        }

        /* Action Bar */
        .iq-action-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 0 4px;
        }

        .iq-results-count {
          color: #64748b;
          font-size: 0.9rem;
        }

        /* Buttons */
        .iq-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
        }

        .iq-btn-primary {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: #fff;
        }

        .iq-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .iq-btn-secondary {
          background: #f1f5f9;
          color: #475569;
        }

        .iq-btn-secondary:hover {
          background: #e2e8f0;
        }

        .iq-btn-retake {
          background: var(--card-bg);
          color: var(--card-accent);
          border: 1px solid var(--card-border);
          padding: 6px 12px;
          font-size: 0.85rem;
        }

        .iq-btn-retake:hover {
          background: var(--card-border);
          color: #fff;
        }

        /* Empty State */
        .iq-empty-state {
          text-align: center;
          padding: 60px 20px;
          background: #fff;
          border-radius: 16px;
        }

        .iq-empty-icon {
          width: 80px;
          height: 80px;
          background: #dcfce7;
          color: #16a34a;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 2rem;
        }

        .iq-empty-state h3 {
          margin: 0 0 8px;
          color: #1e293b;
        }

        .iq-empty-state p {
          color: #64748b;
          margin: 0 0 20px;
        }

        /* Questions Grid */
        .iq-questions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }

        .iq-questions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .iq-question-card {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .iq-question-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .iq-card-header {
          padding: 12px 16px;
          background: var(--card-bg);
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .iq-card-category {
          font-weight: 600;
          color: var(--card-accent);
          font-size: 0.85rem;
        }

        .iq-card-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .iq-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .iq-badge-type {
          background: rgba(255, 255, 255, 0.7);
          color: #475569;
        }

        .iq-badge-attempts {
          background: var(--card-border);
          color: #fff;
        }

        .iq-card-body {
          padding: 16px;
        }

        .iq-question-text {
          margin: 0 0 8px;
          color: #1e293b;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .iq-subcategory {
          font-size: 0.8rem;
          color: #64748b;
        }

        .iq-card-footer {
          padding: 12px 16px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .iq-last-attempt {
          font-size: 0.8rem;
          color: #64748b;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .iq-header-content {
            flex-direction: column;
            text-align: center;
          }

          .iq-filters {
            flex-direction: column;
          }

          .iq-search-box {
            width: 100%;
          }

          .iq-filter-group {
            width: 100%;
            justify-content: space-between;
          }

          .iq-select {
            flex: 1;
          }

          .iq-questions-grid {
            grid-template-columns: 1fr;
          }

          .iq-card-footer {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
};

export default IncorrectQuestions;
