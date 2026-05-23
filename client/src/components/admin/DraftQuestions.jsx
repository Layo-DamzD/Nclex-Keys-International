import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import RationaleContent from '../../utils/RationaleContent';

const DraftQuestions = () => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/questions?isDraft=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allQuestions = response.data?.questions || response.data || [];
      const draftQuestions = allQuestions.filter(q => q.isDraft === true);
      setDrafts(draftQuestions);
    } catch (err) {
      setError('Failed to load draft questions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (question) => {
    try {
      setPreviewLoading(true);
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get(`/api/admin/questions/${question._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreviewQuestion(response.data);
    } catch (err) {
      console.error('Error loading preview:', err);
      alert('Failed to load question preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleEdit = async (question) => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get(`/api/admin/questions/${question._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/admin/dashboard?section=upload', {
        state: { question: response.data }
      });
    } catch (error) {
      console.error('Error loading question for edit:', error);
      alert('Failed to load question for editing');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this draft?')) return;
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.delete(`/api/admin/questions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDrafts();
    } catch (err) {
      alert('Failed to delete draft');
    }
  };

  const handlePublish = async (question) => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const questionData = { ...question, isDraft: false };
      await axios.put(`/api/admin/questions/${question._id}`, questionData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Question published successfully!');
      fetchDrafts();
    } catch (err) {
      alert('Failed to publish question');
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      'multiple-choice': 'Multiple Choice',
      'sata': 'SATA',
      'fill-blank': 'Fill Blank',
      'highlight': 'Highlight',
      'drag-drop': 'Drag & Drop',
      'matrix': 'Matrix',
      'hotspot': 'Hotspot',
      'cloze-dropdown': 'Cloze'
    };
    return labels[type] || type;
  };

  const getOptionLetter = (index) => String.fromCharCode(65 + index);

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
      case 'matrix': return 'badge-info';
      case 'case-study': return 'badge-primary';
      case 'hotspot': case 'cloze-dropdown': return 'badge-info';
      default: return 'badge-info';
    }
  };

  const cleanQuestionPrefix = (text) =>
    String(text || '')
      .replace(/^[\uFEFF"'`\s]*Q\s*[-#:.)]?\s*\d+\s*[:.)-]?\s*/i, '')
      .replace(/^[\uFEFF"'`\s]*\d+\s*[:.)-]\s*/i, '')
      .trim();

  const renderTestLikePreview = (q) => {
    if (!q) return null;
    const isCorrectOption = (type, idx) => {
      if (type === 'multiple-choice') {
        return String(q.correctAnswer || '').trim() === getOptionLetter(idx);
      }
      if (type === 'sata') {
        return Array.isArray(q.correctAnswer) && q.correctAnswer.includes(getOptionLetter(idx));
      }
      return false;
    };

    return (
      <div style={{ maxWidth: '100%' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <span className={`badge ${getTypeBadge(q.type)}`} style={{ fontSize: '0.75rem' }}>{getTypeLabel(q.type)}</span>
          <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem' }}>{q.category || ''}</span>
          <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem' }}>{q.subcategory || ''}</span>
          {q.difficulty && <span className={`badge ${getDifficultyBadge(q.difficulty)}`} style={{ fontSize: '0.75rem' }}>{q.difficulty}</span>}
          <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.75rem' }}>DRAFT</span>
        </div>

        <div style={{ fontSize: '1rem', fontWeight: 500, lineHeight: 1.7, marginBottom: '20px', color: '#1e293b', whiteSpace: 'pre-line' }}>
          {cleanQuestionPrefix(q.questionText)}
          {q.questionImageUrl && (
            <div style={{ marginTop: '12px' }}>
              <img src={q.questionImageUrl} alt="Question" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            </div>
          )}
        </div>

        {(q.type === 'multiple-choice' || q.type === 'sata') && Array.isArray(q.options) && q.options.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {q.options.map((opt, idx) => {
              const letter = getOptionLetter(idx);
              const correct = isCorrectOption(q.type, idx);
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '12px 16px', borderRadius: '10px',
                  border: `2px solid ${correct ? '#22c55e' : '#e2e8f0'}`,
                  background: correct ? '#f0fdf4' : '#fff',
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                    display: 'grid', placeItems: 'center',
                    background: correct ? '#22c55e' : '#f1f5f9',
                    color: correct ? '#fff' : '#64748b',
                    fontWeight: 700, fontSize: '0.85rem',
                    border: correct ? 'none' : '2px solid #cbd5e1',
                  }}>{letter}</div>
                  <div style={{ flex: 1, paddingTop: '4px', fontSize: '0.92rem', color: '#334155', lineHeight: 1.5 }}>{opt}</div>
                  {correct && <i className="fas fa-check-circle" style={{ color: '#22c55e', fontSize: '1.1rem', marginTop: '4px', flexShrink: 0 }} />}
                </div>
              );
            })}
            {q.type === 'sata' && (
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', marginTop: '-4px' }}>
                Select All That Apply — {Array.isArray(q.correctAnswer) ? q.correctAnswer.length : 0} correct option(s)
              </div>
            )}
          </div>
        )}

        {q.type === 'fill-blank' && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'inline-block', padding: '10px 16px', borderRadius: '8px', border: '2px solid #e2e8f0', background: '#f8fafc', fontSize: '0.95rem', color: '#334155', minWidth: '200px' }}>
              {q.correctAnswer || 'N/A'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>Correct answer: <strong>{q.correctAnswer || 'N/A'}</strong></div>
          </div>
        )}

        {q.type === 'matrix' && Array.isArray(q.matrixRows) && Array.isArray(q.matrixColumns) && (
          <div style={{ marginBottom: '20px', overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>Row</th>
                  {q.matrixColumns.map((col, ci) => (
                    <th key={ci} style={{ padding: '10px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600 }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {q.matrixRows.map((row, ri) => (
                  <tr key={ri}>
                    <td style={{ padding: '10px 14px', border: '1px solid #e2e8f0', fontWeight: 500, fontSize: '0.9rem' }}>{row.rowText}</td>
                    {q.matrixColumns.map((_, ci) => {
                      const correctCols = Array.isArray(row.correctColumns) && row.correctColumns.length > 0 ? row.correctColumns : (row.correctColumn !== undefined ? [row.correctColumn] : []);
                      const isCorrect = correctCols.includes(ci);
                      return (
                        <td key={ci} style={{ padding: '10px 14px', border: '1px solid #e2e8f0', textAlign: 'center', background: isCorrect ? '#dcfce7' : '#fff' }}>
                          {isCorrect && <i className="fas fa-check" style={{ color: '#22c55e', fontWeight: 700 }} />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {q.type === 'hotspot' && q.hotspotImageUrl && (
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={q.hotspotImageUrl} alt="Hotspot" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              {Array.isArray(q.hotspotTargets) && q.hotspotTargets.map((t, i) => {
                const isCorrect = String(q.correctAnswer || '').trim() === String(t.id || '').trim();
                return (
                  <div key={i} style={{
                    position: 'absolute', left: `${t.x}%`, top: `${t.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${t.radius * 2}%`, height: `${t.radius * 2}%`,
                    borderRadius: '50%',
                    border: `3px solid ${isCorrect ? '#22c55e' : '#94a3b8'}`,
                    background: isCorrect ? 'rgba(34,197,94,0.25)' : 'rgba(148,163,184,0.15)',
                  }} title={`${t.label || t.id}${isCorrect ? ' (Correct)' : ''}`} />
                );
              })}
            </div>
          </div>
        )}

        {q.type === 'cloze-dropdown' && q.clozeTemplate && (
          <div style={{ marginBottom: '20px', fontSize: '1rem', lineHeight: 1.8, color: '#334155' }}>
            {q.clozeTemplate.split(/(\{\{[^}]+\}\})/).map((part, i) => {
              const match = part.match(/^\{\{(.+?)\}\}$/);
              if (match) {
                const key = match[1];
                const answer = q.correctAnswer?.[key] || '?';
                return (
                  <span key={i} style={{ display: 'inline-block', padding: '2px 10px', margin: '0 2px', background: '#dcfce7', border: '1px solid #22c55e', borderRadius: '6px', fontWeight: 600, color: '#166534', fontSize: '0.9rem' }}>
                    {answer}
                  </span>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </div>
        )}

        {q.type === 'drag-drop' && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>Correct Order:</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(String(q.correctAnswer || '').split('|').filter(Boolean)).map((item, i) => (
                <span key={i} style={{ padding: '8px 14px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', fontSize: '0.88rem', color: '#1e40af', fontWeight: 500 }}>
                  {i + 1}. {item.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {q.type === 'highlight' && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>Highlight Answer:</div>
            <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '0.9rem', color: '#92400e' }}>
              {q.correctAnswer || 'N/A'}
            </div>
          </div>
        )}

        {q.rationale && (
          <div style={{ marginTop: '20px', padding: '16px', borderRadius: '10px', background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e40af', marginBottom: '6px' }}>
              <i className="fas fa-lightbulb me-1" style={{ color: '#f59e0b' }}></i> Rationale
            </div>
            <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
              <RationaleContent text={q.rationale} />
            </div>
            {q.rationaleImageUrl && (
              <div style={{ marginTop: '10px' }}>
                <img src={q.rationaleImageUrl} alt="Rationale" style={{ maxWidth: '100%', borderRadius: '6px' }} />
              </div>
            )}
          </div>
        )}

        {!q.rationale && (
          <div style={{ marginTop: '20px', padding: '12px 16px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a' }}>
            <div style={{ fontSize: '0.82rem', color: '#92400e', fontWeight: 500 }}>
              <i className="fas fa-exclamation-triangle me-1"></i> No rationale provided for this draft
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="text-center py-5">Loading draft questions...</div>;

  return (
    <div className="draft-questions">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Draft Questions</h2>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/admin/dashboard?section=upload')}
        >
          <i className="fas fa-plus me-2"></i>
          Create New Question
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {drafts.length === 0 ? (
        <div className="text-center" style={{ padding: '60px', background: '#f8fafc', borderRadius: '12px' }}>
          <i className="fas fa-save" style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '16px' }}></i>
          <h4 style={{ color: '#64748b' }}>No Draft Questions</h4>
          <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Save questions as drafts to complete them later.</p>
          <button className="btn btn-primary" onClick={() => navigate('/admin/dashboard?section=upload')}>
            <i className="fas fa-plus me-2"></i>
            Create New Question
          </button>
        </div>
      ) : (
        <div className="draft-list">
          {drafts.map((draft) => (
            <div key={draft._id} className="card mb-3" style={{ border: '1px solid #fcd34d', borderRadius: '12px', background: '#fffbeb' }}>
              <div className="card-body" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, color: '#1e293b' }}>
                        {draft.questionText ? draft.questionText.substring(0, 60) + (draft.questionText.length > 60 ? '...' : '') : 'Untitled Draft'}
                      </h4>
                      <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: '12px', padding: '4px 10px', borderRadius: '12px' }}>DRAFT</span>
                      <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '12px', padding: '4px 10px', borderRadius: '12px' }}>{getTypeLabel(draft.type)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>
                      <span><i className="fas fa-folder me-1"></i>{draft.category || 'No category'}</span>
                      <span><i className="fas fa-tag me-1"></i>{draft.subcategory || 'No subcategory'}</span>
                      {draft.difficulty && <span><i className="fas fa-signal me-1"></i>{draft.difficulty}</span>}
                    </div>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: '12px' }}>
                      <i className="fas fa-clock me-1"></i>
                      Last updated: {new Date(draft.updatedAt || draft.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px', flexShrink: 0 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handlePreview(draft)} disabled={previewLoading} title="Preview">
                      <i className="fas fa-eye me-1"></i> Preview
                    </button>
                    <button className="btn btn-sm btn-success" onClick={() => handlePublish(draft)} title="Publish question">
                      <i className="fas fa-paper-plane me-1"></i> Publish
                    </button>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(draft)} title="Edit draft">
                      <i className="fas fa-edit me-1"></i> Edit
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(draft._id)} title="Delete draft">
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewQuestion && (
        <div
          className="modal fade show d-block"
          style={{ background: 'rgba(2,6,23,0.6)', zIndex: 1200 }}
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewQuestion(null); }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" style={{ maxWidth: '800px' }}>
            <div className="modal-content" style={{ borderRadius: '16px', border: 'none', overflow: 'hidden' }}>
              <div style={{
                padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
              }}>
                <h5 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
                  <i className="fas fa-eye me-2" style={{ color: '#6366f1' }}></i>Draft Preview
                </h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setPreviewQuestion(null)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                {renderTestLikePreview(previewQuestion)}
              </div>
              <div style={{
                padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', gap: '8px',
                background: '#f8fafc', borderTop: '1px solid #e2e8f0',
              }}>
                <button className="btn btn-sm btn-outline-primary" onClick={() => { setPreviewQuestion(null); handleEdit(previewQuestion); }}>
                  <i className="fas fa-edit me-1"></i> Edit Question
                </button>
                <button className="btn btn-sm btn-success" onClick={() => { setPreviewQuestion(null); handlePublish(previewQuestion); }}>
                  <i className="fas fa-paper-plane me-1"></i> Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftQuestions;
