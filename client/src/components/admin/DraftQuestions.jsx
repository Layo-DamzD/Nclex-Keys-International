import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const DraftQuestions = () => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      // Filter to only get drafts
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

  const handleEdit = (question) => {
    navigate('/admin/dashboard', {
      state: {
        section: 'upload',
        question: question
      }
    });
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, color: '#1e293b' }}>
                        {draft.questionText ? draft.questionText.substring(0, 60) + (draft.questionText.length > 60 ? '...' : '') : 'Untitled Draft'}
                      </h4>
                      <span
                        className="badge"
                        style={{
                          background: '#fef3c7',
                          color: '#92400e',
                          fontSize: '12px',
                          padding: '4px 10px',
                          borderRadius: '12px'
                        }}
                      >
                        DRAFT
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          fontSize: '12px',
                          padding: '4px 10px',
                          borderRadius: '12px'
                        }}
                      >
                        {getTypeLabel(draft.type)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>
                      <span><i className="fas fa-folder me-1"></i>{draft.category || 'No category'}</span>
                      <span><i className="fas fa-tag me-1"></i>{draft.subcategory || 'No subcategory'}</span>
                    </div>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: '12px' }}>
                      <i className="fas fa-clock me-1"></i>
                      Last updated: {new Date(draft.updatedAt || draft.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => handlePublish(draft)}
                      title="Publish question"
                    >
                      <i className="fas fa-paper-plane me-1"></i> Publish
                    </button>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleEdit(draft)}
                      title="Edit draft"
                    >
                      <i className="fas fa-edit me-1"></i> Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(draft._id)}
                      title="Delete draft"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DraftQuestions;
