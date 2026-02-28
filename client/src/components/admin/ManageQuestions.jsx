import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CATEGORIES } from '../../constants/Categories';
import CaseStudiesList from '../admin/CaseStudiesList';

const ManageQuestions = ({ onSectionChange }) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [filters, setFilters] = useState({ category: '', type: '' });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const categories = ['', ...Object.keys(CATEGORIES)];
  const types = ['', 'multiple-choice', 'sata', 'fill-blank', 'highlight', 'drag-drop', 'matrix'];

  useEffect(() => {
    fetchQuestions();
  }, [filters, pagination.page]);

  const fetchQuestions = async () => {
    setLoading(true);
    setFetchError('');

    try {
      const token = sessionStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: '10',
        ...(filters.category && { category: filters.category }),
        ...(filters.type && { type: filters.type }),
      });

      const response = await axios.get(`/api/admin/questions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setQuestions(response.data?.questions || []);
      setPagination((prev) => ({
        ...prev,
        totalPages: response.data?.totalPages || 1,
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
    setFilters((prev) => ({ ...prev, [name]: value }));
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

  const handleEdit = (question) => {
    // Navigate to upload page with question data for editing
    navigate('/admin/dashboard', { 
      state: { 
        section: 'upload',
        question: question 
      }
    });
    // Also call onSectionChange if needed to update active section
    if (onSectionChange) {
      onSectionChange('upload');
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

  const getTypeLabel = (type) => {
    const labels = {
      'multiple-choice': 'MC',
      sata: 'SATA',
      'fill-blank': 'Fill',
      highlight: 'Highlight',
      'drag-drop': 'Drag',
      matrix: 'Matrix',
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
      default:
        return 'badge-info';
    }
  };

  if (loading) return <div className="text-center py-5">Loading questions...</div>;

  return (
    <div className="manage-questions">
      <div className="header" style={{ marginBottom: '20px' }}>
        <h1>Manage Questions</h1>
        <div className="manage-questions-filter-row" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <select
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            className="form-control manage-questions-filter-control"
            style={{ width: 'min(220px, 100%)' }}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat || 'All Categories'}
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
        </div>
      </div>

      {fetchError && <div className="alert alert-danger">{fetchError}</div>}

      <div className="data-table-container">
        <table className="data-table">
          <colgroup>
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
                <td className="mq-id-cell">
                  <span className="mq-id-text">{q._id?.substring(0, 8)}</span>
                </td>
                <td className="mq-question-cell">
                  {q.questionText?.length > 70 ? `${q.questionText.substring(0, 70)}...` : q.questionText}
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
                    className="btn btn-sm btn-primary"
                    style={{ marginRight: '8px' }}
                    onClick={() => handleEdit(q)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(q._id)} type="button">
                    Delete
                  </button>
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

      {pagination.totalPages > 1 && (
        <div
          className="pagination"
          style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}
        >
          <button
            className="btn btn-sm btn-outline-primary"
            disabled={pagination.page === 1}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            type="button"
          >
            Previous
          </button>
          <span style={{ padding: '5px 10px' }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            className="btn btn-sm btn-outline-primary"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            type="button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ManageQuestions;
