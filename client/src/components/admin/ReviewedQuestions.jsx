import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ReviewedQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 25;
  const [searchInput, setSearchInput] = useState('');
  const searchTimerRef = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [unmarkingId, setUnmarkingId] = useState(null);

  // Debounce search
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 400);
  }, [searchInput]);

  useEffect(() => {
    fetchQuestions();
  }, [page, debouncedSearch]);

  const fetchQuestions = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
      });
      const response = await axios.get(`/api/admin/reviewed-questions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data || {};
      setQuestions(Array.isArray(data.questions || data.data || data) ? (data.questions || data.data || data) : []);
      setTotal(data.total || data.totalCount || 0);
      setTotalPages(data.totalPages || Math.max(1, Math.ceil((data.total || 0) / limit)));
    } catch (err) {
      console.error('Failed to fetch reviewed questions:', err);
      setError(err.response?.data?.message || 'Failed to load reviewed questions');
    } finally {
      setLoading(false);
    }
  };

  const handleUnmarkReviewed = async (questionId) => {
    if (!window.confirm('Remove the "Reviewed" mark from this question?')) return;
    setUnmarkingId(questionId);
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.put(`/api/admin/questions/${questionId}/reviewed`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchQuestions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unmark question');
    } finally {
      setUnmarkingId(null);
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      'multiple-choice': 'MC', sata: 'SATA', 'fill-blank': 'Fill',
      highlight: 'Highlight', 'drag-drop': 'Drag', matrix: 'Matrix',
      hotspot: 'Hotspot', 'cloze-dropdown': 'Cloze', 'case-study': 'Case Study',
    };
    return labels[type] || type;
  };

  const getDifficultyBadge = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'badge-success';
      case 'medium': return 'badge-warning';
      case 'hard': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'multiple-choice': return 'badge-success';
      case 'sata': return 'badge-warning';
      case 'case-study': return 'badge-primary';
      default: return 'badge-info';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const truncate = (text, maxLen = 100) => {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  };

  if (loading && questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '1.2rem', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin me-2"></i>Loading reviewed questions...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#1e293b' }}>
          <i className="fas fa-check-double me-2" style={{ color: '#16a34a' }}></i>
          Reviewed Questions
          <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#94a3b8', marginLeft: '10px' }}>
            ({total} total)
          </span>
        </h2>
        <div style={{ position: 'relative', width: 'min(300px, 100%)' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by text or category..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ paddingLeft: '36px', width: '100%' }}
          />
          {searchInput && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => { setSearchInput(''); setPage(1); }}
              style={{
                position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: '#94a3b8', padding: '2px 6px', cursor: 'pointer', fontSize: '0.8rem',
              }}
              aria-label="Clear search"
            >
              <i className="fas fa-times" />
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {questions.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 40px', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>
            <i className="fas fa-clipboard-check" style={{ color: '#94a3b8' }}></i>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>No reviewed questions yet</div>
          <div>Questions marked as reviewed will appear here.</div>
        </div>
      )}

      {questions.length > 0 && (
        <>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Subcategory</th>
                  <th>Difficulty</th>
                  <th>Reviewed Date</th>
                  <th>Reviewed By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q._id}>
                    <td style={{ maxWidth: '300px' }}>
                      <div style={{ fontSize: '0.85rem', color: '#1e293b', lineHeight: 1.4 }}>
                        {truncate(q.questionText || q.question?.questionText || '')}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getTypeBadge(q.type)}`}>
                        {getTypeLabel(q.type)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                      {q.category || q.question?.category || 'N/A'}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                      {q.subcategory || q.question?.subcategory || 'N/A'}
                    </td>
                    <td>
                      <span className={`badge ${getDifficultyBadge(q.difficulty || q.question?.difficulty)}`}>
                        {q.difficulty || q.question?.difficulty || 'N/A'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#475569', whiteSpace: 'nowrap' }}>
                      {formatDate(q.reviewedAt || q.reviewedDate)}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                      {q.reviewedBy?.name || q.reviewedByName || 'N/A'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => handleUnmarkReviewed(q._id)}
                          disabled={unmarkingId === q._id}
                          title="Remove reviewed mark"
                          type="button"
                        >
                          {unmarkingId === q._id ? '...' : 'Unmark'}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-info"
                          title="View question details"
                          type="button"
                          disabled
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-sm btn-outline-primary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                type="button"
              >
                Previous
              </button>
              <span style={{ padding: '5px 10px', fontSize: '0.85rem', color: '#475569' }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-sm btn-outline-primary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                type="button"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReviewedQuestions;
