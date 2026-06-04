import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const FLAG_REASON_LABELS = {
  incorrect_answer: 'Incorrect Answer',
  unclear_question: 'Unclear Question',
  typo: 'Typo / Grammar',
  inappropriate: 'Inappropriate Content',
  other: 'Other',
};

const FlaggedQuestions = ({ onSectionChange }) => {
  const navigate = useNavigate();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveNote, setResolveNote] = useState('');
  const [showResolveModal, setShowResolveModal] = useState({ open: false, flagId: null });

  const fetchFlags = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('adminToken');
      const params = new URLSearchParams({ resolved: String(showResolved) });
      const response = await axios.get(`/api/admin/flags?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFlags(Array.isArray(response.data?.flags || response.data) ? (response.data.flags || response.data) : []);
    } catch (err) {
      console.error('Failed to fetch flags:', err);
      setError(err.response?.data?.message || 'Failed to load flagged questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, [showResolved]);

  const handleResolve = async () => {
    const { flagId } = showResolveModal;
    if (!flagId) return;
    setResolvingId(flagId);
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.put(`/api/admin/flags/${flagId}/resolve`, {
        adminNote: resolveNote.trim(),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowResolveModal({ open: false, flagId: null });
      setResolveNote('');
      fetchFlags();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resolve flag');
    } finally {
      setResolvingId(null);
    }
  };

  const handleEditQuestion = (flag) => {
    const questionId = flag.questionId || flag.question?._id;
    if (!questionId) return;
    navigate('/admin/dashboard', {
      state: { section: 'questions', editQuestionId: questionId },
    });
    if (onSectionChange) onSectionChange('questions');
  };

  const handleDeleteQuestion = async (flag) => {
    const questionId = flag.questionId || flag.question?._id;
    if (!questionId) return;
    if (!window.confirm('Are you sure you want to permanently delete this question? This cannot be undone.')) return;
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.delete(`/api/admin/questions/${questionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchFlags();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete question');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const truncate = (text, maxLen = 120) => {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '1.2rem', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin me-2"></i>Loading flagged questions...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#1e293b' }}>
          <i className="fas fa-flag me-2" style={{ color: '#dc2626' }}></i>
          {showResolved ? 'All Flags (Including Resolved)' : 'Flagged Questions'}
          <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#94a3b8', marginLeft: '10px' }}>
            ({flags.length} {flags.length === 1 ? 'flag' : 'flags'})
          </span>
        </h2>
        <button
          className={`btn ${showResolved ? 'btn-outline-secondary' : 'btn-outline-primary'}`}
          onClick={() => setShowResolved((prev) => !prev)}
          type="button"
        >
          <i className={`fas ${showResolved ? 'fa-eye-slash' : 'fa-eye'} me-1`}></i>
          {showResolved ? 'Hide Resolved' : 'Show Resolved'}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {!showResolved && flags.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 40px', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>
            <i className="fas fa-check-circle" style={{ color: '#22c55e' }}></i>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>No unresolved flags</div>
          <div>All questions are in good standing. Nice work!</div>
        </div>
      )}

      {flags.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {flags.map((flag) => (
            <div
              key={flag._id}
              style={{
                background: '#fff',
                border: flag.resolved ? '1px solid #d1d5db' : '1px solid #fecaca',
                borderLeft: flag.resolved ? '4px solid #9ca3af' : '4px solid #dc2626',
                borderRadius: '10px',
                padding: '16px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Question text */}
                  <div style={{ fontSize: '0.92rem', fontWeight: 500, color: '#1e293b', lineHeight: 1.6, marginBottom: '8px' }}>
                    {truncate(flag.questionText || flag.question?.questionText || 'Question text not available')}
                  </div>

                  {/* Meta badges */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                      background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                    }}>
                      <i className="fas fa-flag" style={{ fontSize: '0.65rem' }}></i>
                      {FLAG_REASON_LABELS[flag.reason] || flag.reason || 'Flagged'}
                    </span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem',
                      background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
                    }}>
                      <i className="fas fa-user" style={{ fontSize: '0.65rem' }}></i>
                      {flag.studentName || flag.student?.name || 'Unknown Student'}
                    </span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem',
                      background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
                    }}>
                      <i className="fas fa-clock" style={{ fontSize: '0.65rem' }}></i>
                      {formatDate(flag.createdAt || flag.dateFlagged)}
                    </span>
                    {flag.resolved && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                        background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0',
                      }}>
                        <i className="fas fa-check-circle" style={{ fontSize: '0.65rem' }}></i>
                        Resolved
                      </span>
                    )}
                  </div>

                  {/* Comment */}
                  {flag.comment && (
                    <div style={{
                      fontSize: '0.85rem', color: '#475569', lineHeight: 1.5,
                      padding: '8px 12px', background: '#f8fafc', borderRadius: '6px',
                      border: '1px solid #e2e8f0', marginBottom: '6px',
                    }}>
                      <strong style={{ color: '#334155', fontSize: '0.78rem' }}>Comment:</strong> {flag.comment}
                    </div>
                  )}

                  {/* Admin note if resolved */}
                  {flag.resolved && flag.adminNote && (
                    <div style={{
                      fontSize: '0.85rem', color: '#475569', lineHeight: 1.5,
                      padding: '8px 12px', background: '#f0fdf4', borderRadius: '6px',
                      border: '1px solid #bbf7d0',
                    }}>
                      <strong style={{ color: '#166534', fontSize: '0.78rem' }}>Admin Note:</strong> {flag.adminNote}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!flag.resolved && (
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => setShowResolveModal({ open: true, flagId: flag._id })}
                      disabled={resolvingId === flag._id}
                      title="Resolve this flag"
                      type="button"
                    >
                      {resolvingId === flag._id ? (
                        <><i className="fas fa-spinner fa-spin me-1"></i>Resolving...</>
                      ) : (
                        <><i className="fas fa-check me-1"></i>Resolve</>
                      )}
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleEditQuestion(flag)}
                      title="Edit the flagged question"
                      type="button"
                    >
                      <i className="fas fa-pen me-1"></i>Edit Question
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteQuestion(flag)}
                      title="Delete the flagged question"
                      type="button"
                    >
                      <i className="fas fa-trash me-1"></i>Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal.open && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ background: 'rgba(2,6,23,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '480px' }}>
            <div className="modal-content" style={{ borderRadius: '16px', border: 'none', overflow: 'hidden' }}>
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                padding: '24px 24px 16px',
                textAlign: 'center',
              }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                  <i className="fas fa-check-circle" style={{ fontSize: '24px', color: '#16a34a' }}></i>
                </div>
                <h5 style={{ margin: '0 0 4px', fontWeight: 700, color: '#166534' }}>Resolve Flag</h5>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#15803d' }}>
                  Add an optional note about the resolution.
                </p>
              </div>
              <div style={{ padding: '20px 24px 24px' }}>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Admin note (optional)..."
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  style={{ marginBottom: '16px', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setShowResolveModal({ open: false, flagId: null });
                      setResolveNote('');
                    }}
                    style={{ borderRadius: '10px', fontWeight: 600, padding: '8px 20px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleResolve}
                    style={{ borderRadius: '10px', fontWeight: 600, padding: '8px 20px' }}
                  >
                    <i className="fas fa-check me-1"></i>Resolve
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlaggedQuestions;
