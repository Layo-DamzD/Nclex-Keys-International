import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CATEGORIES } from '../../constants/Categories';

const ManageQuestions = ({ onSectionChange }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = JSON.parse(sessionStorage.getItem('adminUser') || '{}');
  const isSuperAdmin = String(user?.role || '').trim().toLowerCase() === 'superadmin';
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    type: '',
    uncategorized: searchParams.get('uncategorized') === 'true'
  });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, perPage: '25' });
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(-1);

  const categories = ['__uncategorized__', '', ...Object.keys(CATEGORIES)];
  const types = ['', 'multiple-choice', 'sata', 'fill-blank', 'highlight', 'drag-drop', 'matrix', 'hotspot', 'cloze-dropdown', 'case-study'];

  // Sync filters with URL search params (e.g. when clicking "Uncategorized" from AdminStats)
  useEffect(() => {
    const uncategorizedParam = searchParams.get('uncategorized') === 'true';
    if (uncategorizedParam && !filters.uncategorized) {
      setFilters((prev) => ({ ...prev, category: '', type: '', uncategorized: true }));
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  }, [searchParams]);

  useEffect(() => {
    fetchQuestions();
  }, [filters, pagination.page, pagination.perPage]);

  const fetchQuestions = async () => {
    setLoading(true);
    setFetchError('');

    try {
      const token = sessionStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: pagination.perPage,
        ...(filters.uncategorized && { uncategorized: 'true' }),
        ...(!filters.uncategorized && filters.category && { category: filters.category }),
        ...(!filters.uncategorized && filters.type && { type: filters.type }),
      });

      const response = await axios.get(`/api/admin/questions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setQuestions(response.data?.questions || []);
      setSelectedQuestionIds([]);
      setPagination((prev) => ({
        ...prev,
        totalPages: Math.max(1, response.data?.totalPages || 1),
        total: response.data?.total || 0,
      }));
    } catch (error) {
      console.error('Error fetching questions:', error);
      setFetchError(error.response?.data?.message || 'Failed to load questions');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === 'category') {
      if (value === '__uncategorized__') {
        setFilters({ category: '', type: '', uncategorized: true });
        setSearchParams({ uncategorized: 'true' });
      } else {
        setFilters((prev) => ({ ...prev, category: value, uncategorized: false }));
        setSearchParams({});
      }
    } else {
      setFilters((prev) => ({ ...prev, [name]: value }));
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.delete(`/api/admin/questions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchQuestions();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete question');
    }
  };

  const fetchFullQuestion = async (questionId) => {
    const token = sessionStorage.getItem('adminToken');
    const response = await axios.get(`/api/admin/questions/${questionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  };

  const handleEdit = async (question) => {
    if (question.type === 'case-study' && question.caseStudyId) {
      navigate('/admin/dashboard', {
        state: {
          section: 'case-studies',
          caseStudyId: question.caseStudyId
        }
      });
      if (onSectionChange) onSectionChange('case-studies');
      return;
    }

    try {
      const fullQuestion = await fetchFullQuestion(question._id);
      navigate('/admin/dashboard', {
        state: {
          section: 'upload',
          question: fullQuestion
        }
      });
      if (onSectionChange) {
        onSectionChange('upload');
      }
    } catch (error) {
      console.error('Error loading full question for edit:', error);
      alert(error.response?.data?.message || 'Failed to load full question details');
    }
  };

  const handleUploadClick = () => {
    navigate('/admin/dashboard', { 
      state: { section: 'upload' }
    });
    if (onSectionChange) {
      onSectionChange('upload');
    }
  };

  const handlePreview = async (questionId) => {
    try {
      setPreviewLoading(true);
      const index = questions.findIndex((q) => q._id === questionId);
      const fullQuestion = await fetchFullQuestion(questionId);
      if (!fullQuestion?._id) {
        alert('Unable to load full question for preview.');
        return;
      }
      setPreviewQuestion(fullQuestion);
      setPreviewIndex(index);
    } catch (error) {
      console.error('Error loading question preview:', error);
      alert(error.response?.data?.message || 'Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const navigatePreview = async (direction) => {
    if (previewLoading || previewIndex < 0) return;
    const nextIndex = previewIndex + direction;
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    const nextQuestion = questions[nextIndex];
    if (!nextQuestion?._id) return;
    await handlePreview(nextQuestion._id);
  };

  const toggleQuestionSelection = (questionId) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );
  };

  const allVisibleSelected = questions.length > 0 && questions.every((q) => selectedQuestionIds.includes(q._id));
  const toggleSelectAllVisible = () => {
    if (!questions.length) return;
    if (allVisibleSelected) {
      setSelectedQuestionIds((prev) => prev.filter((id) => !questions.some((q) => q._id === id)));
      return;
    }
    setSelectedQuestionIds((prev) => {
      const merged = new Set(prev);
      questions.forEach((q) => merged.add(q._id));
      return Array.from(merged);
    });
  };

  const handleBulkDelete = async () => {
    if (!selectedQuestionIds.length) return;
    if (!window.confirm(`Delete ${selectedQuestionIds.length} selected question(s)?`)) return;
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.post(
        '/api/admin/questions/bulk-delete',
        { ids: selectedQuestionIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const deletedCount = Number(response?.data?.deletedCount || 0);
      const requestedCount = Number(response?.data?.requestedCount || selectedQuestionIds.length);
      if (deletedCount < requestedCount) {
        alert(`Deleted ${deletedCount} of ${requestedCount} selected question(s).`);
      }
      fetchQuestions();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete selected questions');
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      'multiple-choice': 'MC',
      sata: 'SATA',
      'fill-blank': 'Fill',
      highlight: 'Highlight',
      'drag-drop': 'Drag',
      matrix: 'Matrix',
      hotspot: 'Hotspot',
      'cloze-dropdown': 'Cloze',
      'case-study': 'Case Study',
    };
    return labels[type] || type;
  };

  const getSuccessRate = (q) => {
    if (!q.timesUsed || q.timesUsed === 0) return '0%';
    const rate = ((q.correctAttempts || 0) / q.timesUsed) * 100;
    return `${Math.round(rate)}%`;
  };

  const getDifficultyBadge = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'badge-success';
      case 'medium':
        return 'badge-warning';
      case 'hard':
        return 'badge-danger';
      default:
        return 'badge-info';
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'multiple-choice':
        return 'badge-success';
      case 'sata':
        return 'badge-warning';
      case 'matrix':
        return 'badge-info';
      case 'case-study':
        return 'badge-primary';
      case 'hotspot':
      case 'cloze-dropdown':
        return 'badge-info';
      default:
        return 'badge-info';
    }
  };

  const cleanQuestionPrefix = (text) =>
    String(text || '')
      .replace(/^[\uFEFF"'`\s]*Q\s*[-#:.)]?\s*\d+\s*[:.)-]?\s*/i, '')
      .replace(/^[\uFEFF"'`\s]*\d+\s*[:.)-]\s*/i, '')
      .trim();

  const formatAnswerForPreview = (q) => {
    if (!q) return '';
    if (q.type === 'multiple-choice') {
      const letter = String(q.correctAnswer || '').trim();
      if (!letter) return 'N/A';
      const idx = letter.charCodeAt(0) - 65;
      const optionText = Array.isArray(q.options) ? q.options[idx] : '';
      return optionText ? `${letter}. ${optionText}` : letter;
    }
    if (q.type === 'sata') {
      const values = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
      if (!values.length) return 'N/A';
      return values.join(', ');
    }
    if (q.type === 'cloze-dropdown' && q.correctAnswer && typeof q.correctAnswer === 'object') {
      return Object.entries(q.correctAnswer).map(([k, v]) => `${k}: ${v}`).join(' | ');
    }
    if (q.type === 'matrix' && Array.isArray(q.matrixRows) && Array.isArray(q.matrixColumns)) {
      return q.matrixRows
        .map((row) => `${row.rowText}: ${q.matrixColumns[row.correctColumn] || row.correctColumn}`)
        .join(' | ');
    }
    return Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer || 'N/A');
  };

  if (loading) return <div className="text-center py-5">Loading questions...</div>;

  return (
    <div className="manage-questions">
      <div className="header" style={{ marginBottom: '20px' }}>
        <h1>Manage Questions</h1>
        <div className="manage-questions-filter-row" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <select
            name="category"
            value={filters.uncategorized ? '__uncategorized__' : filters.category}
            onChange={handleFilterChange}
            className="form-control manage-questions-filter-control"
            style={{ width: 'min(220px, 100%)' }}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === '__uncategorized__' ? '⚠️ Uncategorized' : (cat || 'All Categories')}
              </option>
            ))}
          </select>

          <select
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            className="form-control manage-questions-filter-control"
            style={{ width: 'min(180px, 100%)' }}
          >
            {types.map((type) => (
              <option key={type} value={type}>
                {type || 'All Types'}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn btn-danger"
            disabled={!selectedQuestionIds.length}
            onClick={handleBulkDelete}
          >
            Delete Selected ({selectedQuestionIds.length})
          </button>
        </div>
      </div>

      {filters.uncategorized && (
        <div
          style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '10px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <span style={{ color: '#92400e', fontWeight: 500 }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px', color: '#f59e0b' }}></i>
            Showing only uncategorized questions ({pagination.total} found)
          </span>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setFilters({ category: '', type: '', uncategorized: false });
              setSearchParams({});
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            type="button"
          >
            Clear Filter
          </button>
        </div>
      )}

      {fetchError && <div className="alert alert-danger">{fetchError}</div>}

      <div className="data-table-container">
        <table className="data-table">
          <colgroup>
            <col className="col-select" />
            <col className="col-id" />
            <col className="col-question" />
            <col className="col-type" />
            <col className="col-category" />
            <col className="col-subcategory" />
            <col className="col-difficulty" />
            <col className="col-times" />
            <col className="col-success" />
            <col className="col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  aria-label="Select all visible questions"
                />
              </th>
              <th>ID</th>
              <th>Question</th>
              <th>Type</th>
              <th>Category</th>
              <th>Subcategory</th>
              <th>Difficulty</th>
              <th>Times Used</th>
              <th>Success Rate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q._id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedQuestionIds.includes(q._id)}
                    onChange={() => toggleQuestionSelection(q._id)}
                    aria-label={`Select question ${q._id}`}
                  />
                </td>
                <td className="mq-id-cell">
                  <span className="mq-id-text">{q._id?.substring(0, 8)}</span>
                </td>
                <td className="mq-question-cell">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {q.isDraft && (
                      <span 
                        className="badge" 
                        style={{ 
                          background: '#fef3c7', 
                          color: '#92400e', 
                          fontSize: '10px', 
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          flexShrink: 0
                        }}
                      >
                        DRAFT
                      </span>
                    )}
                    <span>
                      {(() => {
                        const cleanText = cleanQuestionPrefix(q.questionText);
                        return cleanText.length > 70 ? `${cleanText.substring(0, 70)}...` : cleanText;
                      })()}
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${getTypeBadge(q.type)}`}>
                    {getTypeLabel(q.type)}
                  </span>
                </td>
                <td className="mq-category-cell">{q.category}</td>
                <td>
                  <span className="mq-subcategory-text">{q.subcategory}</span>
                </td>
                <td>
                  <span className={`badge ${getDifficultyBadge(q.difficulty)}`}>
                    {q.difficulty}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: q.timesUsed > 0 ? '#1e40af' : '#64748b' }}>
                  {q.timesUsed || 0}
                </td>
                <td
                  style={{
                    fontWeight: 600,
                    color:
                      (q.timesUsed || 0) > 0
                        ? parseInt(getSuccessRate(q), 10) >= 70
                          ? '#065f46'
                          : parseInt(getSuccessRate(q), 10) >= 50
                            ? '#92400e'
                            : '#991b1b'
                        : '#64748b',
                  }}
                >
                  {getSuccessRate(q)}
                </td>
                <td className="mq-actions-cell">
                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ marginRight: '8px' }}
                    onClick={() => handlePreview(q._id)}
                    type="button"
                    disabled={previewLoading}
                  >
                    {previewLoading ? 'Loading...' : 'Preview'}
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    style={{ marginRight: '8px' }}
                    onClick={() => handleEdit(q)}
                    type="button"
                  >
                    Edit
                  </button>
                  {isSuperAdmin && (
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(q._id)} type="button">
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!fetchError && questions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 40px', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>
            <i className="fas fa-file-alt" aria-hidden="true"></i>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '10px' }}>No questions found</div>
          <div style={{ marginBottom: '25px' }}>Try adjusting your filters or upload a new question.</div>
          <button className="btn btn-primary" type="button" onClick={handleUploadClick}>
            <i className="fas fa-upload" aria-hidden="true"></i> Upload First Question
          </button>
        </div>
      )}

      {(pagination.totalPages > 1 || pagination.total > 0) && (
        <div
          className="pagination"
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}
        >
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
            <span>Questions per page:</span>
            <select
              className="form-control form-control-sm"
              value={pagination.perPage}
              onChange={(e) =>
                setPagination((prev) => ({
                  ...prev,
                  page: 1,
                  perPage: e.target.value
                }))
              }
              style={{ width: 'auto' }}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="75">75</option>
              <option value="100">100</option>
              <option value="all">All</option>
            </select>
          </label>
          <button
            className="btn btn-sm btn-outline-primary"
            disabled={pagination.perPage === 'all' || pagination.page === 1}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            type="button"
          >
            Previous
          </button>
          <span style={{ padding: '5px 10px' }}>
            {pagination.perPage === 'all'
              ? `Showing all ${pagination.total} question(s)`
              : `Page ${pagination.page} of ${pagination.totalPages}`}
          </span>
          <button
            className="btn btn-sm btn-outline-primary"
            disabled={pagination.perPage === 'all' || pagination.page === pagination.totalPages}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            type="button"
          >
            Next
          </button>
        </div>
      )}

      {previewQuestion && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ background: 'rgba(2,6,23,0.6)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Question Preview</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => {
                    setPreviewQuestion(null);
                    setPreviewIndex(-1);
                  }}
                />
              </div>
              <div className="modal-body">
                <p><strong>Type:</strong> {previewQuestion.type}</p>
                <p><strong>Category:</strong> {previewQuestion.category} / {previewQuestion.subcategory}</p>
                <p><strong>Question:</strong> {cleanQuestionPrefix(previewQuestion.questionText)}</p>
                {Array.isArray(previewQuestion.options) && previewQuestion.options.length > 0 && (
                  <div>
                    <strong>Options:</strong>
                    <ol type="A">
                      {previewQuestion.options.map((opt, idx) => (
                        <li key={`${previewQuestion._id}-opt-${idx}`}>{opt}</li>
                      ))}
                    </ol>
                  </div>
                )}
                <p><strong>Correct Answer:</strong> {formatAnswerForPreview(previewQuestion)}</p>
                <p style={{ whiteSpace: 'pre-line' }}><strong>Rationale:</strong> {previewQuestion.rationale || 'N/A'}</p>
              </div>
              <div className="modal-footer d-flex justify-content-between align-items-center w-100">
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => navigatePreview(-1)}
                    disabled={previewLoading || previewIndex <= 0}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigatePreview(1)}
                    disabled={previewLoading || previewIndex < 0 || previewIndex >= questions.length - 1}
                  >
                    Next
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setPreviewQuestion(null);
                    setPreviewIndex(-1);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageQuestions;
