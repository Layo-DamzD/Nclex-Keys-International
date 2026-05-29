import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const FlaggedQuestions = () => {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('false'); // show unresolved by default
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/flags', {
        headers: { Authorization: `Bearer ${token}` },
        params: { resolved: filter, page, limit: 25 }
      });
      setFlags(response.data.flags || []);
      setTotalPages(response.data.totalPages || 1);
      setTotal(response.data.total || 0);
    } catch (err) {
      setError('Failed to load flagged questions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleResolve = async () => {
    if (!selectedFlag) return;
    setResolving(true);
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.put(`/api/admin/flags/${selectedFlag._id}/resolve`, {
        adminNote: resolveNote
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedFlag(null);
      setResolveNote('');
      fetchFlags();
    } catch (err) {
      console.error(err);
      alert('Failed to resolve flag');
    } finally {
      setResolving(false);
    }
  };

  const getReasonBadge = (reason) => {
    const styles = {
      wrong_answer: { bg: '#fef2f2', color: '#dc2626', label: 'Wrong Answer' },
      unclear_question: { bg: '#fff7ed', color: '#ea580c', label: 'Unclear Question' },
      typo_error: { bg: '#fefce8', color: '#ca8a04', label: 'Typo Error' },
      missing_image: { bg: '#f0f9ff', color: '#0284c7', label: 'Missing Image' },
      incorrect_options: { bg: '#fdf4ff', color: '#c026d3', label: 'Incorrect Options' },
      other: { bg: '#f8fafc', color: '#475569', label: 'Other' },
    };
    const s = styles[reason] || styles.other;
    return (
      <span
        style={{
          background: s.bg,
          color: s.color,
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
          display: 'inline-block'
        }}
      >
        {s.label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const truncateText = (text, maxLen = 80) => {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  };

  if (loading && flags.length === 0) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div><p className="mt-2 text-muted">Loading flagged questions...</p></div>;
  }

  return (
    <div className="flagged-questions">
      <div className="header" style={{ marginBottom: '20px' }}>
        <h1>
          <i className="fas fa-flag me-2" style={{ color: '#ef4444' }}></i>
          Flagged Questions
        </h1>
        <p style={{ color: '#64748b' }}>Review and resolve questions flagged by students</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Filters */}
      <div className="form-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 'min(200px, 100%)' }}>
            <label className="form-label">Status</label>
            <select
              className="form-control"
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            >
              <option value="">All</option>
              <option value="false">Unresolved</option>
              <option value="true">Resolved</option>
            </select>
          </div>
          <div style={{ marginTop: '24px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={() => fetchFlags()}>
              <i className="fas fa-sync-alt me-2"></i>Refresh
            </button>
            <span className="badge bg-secondary" style={{ fontSize: '14px', padding: '8px 14px' }}>
              {total} total
            </span>
          </div>
        </div>
      </div>

      {/* Flagged Questions List */}
      {!selectedFlag ? (
        <>
          {flags.length === 0 ? (
            <div className="form-card text-center py-5">
              <i className="fas fa-check-circle fa-3x mb-3" style={{ color: '#22c55e' }}></i>
              <h5>No flagged questions found</h5>
              <p className="text-muted">Students have not flagged any questions with this filter.</p>
            </div>
          ) : (
            <div className="form-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table table-hover mb-0" style={{ margin: 0 }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Question</th>
                    <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Student</th>
                    <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Reason</th>
                    <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Date</th>
                    <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                    <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {flags.map((flag) => (
                    <tr key={flag._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                        <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                          {truncateText(flag.questionId?.questionText || 'Question not found', 100)}
                        </div>
                        {flag.questionId?.type && (
                          <small className="text-muted" style={{ fontSize: '11px' }}>
                            {flag.questionId.type} &middot; {flag.questionId.category}
                          </small>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                        <div style={{ fontWeight: 500 }}>{flag.studentId?.name || 'Unknown'}</div>
                        <small className="text-muted" style={{ fontSize: '11px' }}>{flag.studentId?.email || ''}</small>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {getReasonBadge(flag.reason)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatDate(flag.createdAt)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: flag.resolved ? '#dcfce7' : '#fef2f2',
                            color: flag.resolved ? '#16a34a' : '#dc2626'
                          }}
                        >
                          {flag.resolved ? 'Resolved' : 'Open'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => setSelectedFlag(flag)}
                          style={{ fontSize: '12px' }}
                        >
                          {flag.resolved ? 'View' : 'Review'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', gap: '8px', borderTop: '1px solid #e2e8f0' }}>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#64748b', padding: '0 12px' }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Flag Detail View */
        <div className="form-card">
          <button
            className="btn btn-link mb-3"
            onClick={() => { setSelectedFlag(null); setResolveNote(''); }}
            style={{ fontSize: '14px' }}
          >
            <i className="fas fa-arrow-left me-2"></i>Back to list
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {/* Question Info */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0' }}>
              <h6 style={{ fontWeight: 600, marginBottom: '10px', color: '#334155' }}>
                <i className="fas fa-question-circle me-2"></i>Question
              </h6>
              <p style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '8px' }}>
                {selectedFlag.questionId?.questionText || 'Question not found'}
              </p>
              {selectedFlag.questionId && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge bg-secondary">{selectedFlag.questionId.type}</span>
                  {selectedFlag.questionId.category && <span className="badge bg-info">{selectedFlag.questionId.category}</span>}
                  {selectedFlag.questionId.subcategory && <span className="badge bg-light text-dark">{selectedFlag.questionId.subcategory}</span>}
                </div>
              )}
            </div>

            {/* Student Info */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0' }}>
              <h6 style={{ fontWeight: 600, marginBottom: '10px', color: '#334155' }}>
                <i className="fas fa-user me-2"></i>Student
              </h6>
              <div style={{ fontSize: '14px' }}>
                <div style={{ fontWeight: 500 }}>{selectedFlag.studentId?.name || 'Unknown Student'}</div>
                <div className="text-muted" style={{ fontSize: '12px' }}>{selectedFlag.studentId?.email || ''}</div>
              </div>
              <div className="mt-2">
                {getReasonBadge(selectedFlag.reason)}
              </div>
              {selectedFlag.comment && (
                <div className="mt-2" style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>
                  "{selectedFlag.comment}"
                </div>
              )}
              <div className="text-muted mt-1" style={{ fontSize: '12px' }}>
                Flagged: {formatDate(selectedFlag.createdAt)}
              </div>
            </div>
          </div>

          {/* Resolution Section */}
          {selectedFlag.resolved ? (
            <div style={{ background: '#dcfce7', borderRadius: '10px', padding: '16px', border: '1px solid #bbf7d0' }}>
              <h6 style={{ color: '#16a34a', fontWeight: 600 }}>
                <i className="fas fa-check-circle me-2"></i>Resolved
              </h6>
              {selectedFlag.adminNote && (
                <p style={{ fontSize: '14px', marginTop: '8px', color: '#166534' }}>{selectedFlag.adminNote}</p>
              )}
              <div className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                Resolved by {selectedFlag.resolvedBy?.name || 'Admin'} on {formatDate(selectedFlag.resolvedAt)}
              </div>
            </div>
          ) : (
            <div style={{ background: '#fefce8', borderRadius: '10px', padding: '16px', border: '1px solid #fef08a' }}>
              <h6 style={{ color: '#854d0e', fontWeight: 600 }}>
                <i className="fas fa-gavel me-2"></i>Resolve This Flag
              </h6>
              <textarea
                className="form-control mt-2"
                rows={3}
                placeholder="Add an admin note about how this was resolved (optional)..."
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
              />
              <div className="mt-3">
                <button
                  className="btn btn-success"
                  onClick={handleResolve}
                  disabled={resolving}
                >
                  {resolving ? (
                    <><i className="fas fa-spinner fa-spin me-2"></i>Resolving...</>
                  ) : (
                    <><i className="fas fa-check me-2"></i>Mark as Resolved</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FlaggedQuestions;
