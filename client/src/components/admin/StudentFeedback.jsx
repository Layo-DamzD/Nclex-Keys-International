import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudentFeedback = () => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchFeedback();
  }, [filter]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/feedback', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let data = response.data;
      if (filter) {
        data = data.filter(f => f.status === filter);
      }
      setFeedback(data);
    } catch (err) {
      setError('Failed to load feedback');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.put(`/api/admin/feedback/${id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFeedback();
      if (selectedFeedback?._id === id) {
        setSelectedFeedback(null);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to update status');
    }
  };

  const handleReply = async (id) => {
    if (!replyText.trim()) return;
    
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.put(`/api/admin/feedback/${id}`, { reply: replyText }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReplyText('');
      setSelectedFeedback(null);
      fetchFeedback();
    } catch (error) {
      console.error(error);
      alert('Failed to send reply');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.delete(`/api/admin/feedback/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFeedback();
      if (selectedFeedback?._id === id) {
        setSelectedFeedback(null);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to delete feedback');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      new: 'badge-danger',
      read: 'badge-warning',
      replied: 'badge-success'
    };
    return badges[status] || 'badge-info';
  };

  const getRatingStars = (rating) => {
    if (!rating) return null;
    return [...Array(5)].map((_, i) => (
      <i key={i} className={`fas fa-star${i < rating ? '' : '-o'}`} style={{ color: '#ffc107' }}></i>
    ));
  };

  if (loading) return <div className="text-center py-5">Loading feedback...</div>;

  return (
    <div className="student-feedback">
      <div className="header" style={{ marginBottom: '20px' }}>
        <h1>Student Feedback</h1>
        <p style={{ color: '#64748b' }}>View and manage student messages</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="form-card" style={{ marginBottom: '20px' }}>
        <div className="student-feedback-filter-row" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div className="student-feedback-filter-group" style={{ width: 'min(200px, 100%)' }}>
            <label className="form-label">Filter by Status</label>
            <select
              className="form-control"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
            </select>
          </div>
          <button
            className="btn btn-primary student-feedback-refresh-btn"
            onClick={() => fetchFeedback()}
            style={{ marginTop: '24px' }}
          >
            <i className="fas fa-sync-alt me-2"></i>Refresh
          </button>
        </div>
      </div>

      {selectedFeedback ? (
        <div className="form-card">
          <button
            className="btn btn-link mb-3"
            onClick={() => setSelectedFeedback(null)}
          >
            ← Back to list
          </button>
          
          <div className="feedback-detail">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h4>{selectedFeedback.studentName}</h4>
                <p className="text-muted">{selectedFeedback.studentEmail}</p>
              </div>
              <span className={`badge ${getStatusBadge(selectedFeedback.status)}`}>
                {selectedFeedback.status}
              </span>
            </div>

            {selectedFeedback.rating && (
              <div className="mb-3">
                {getRatingStars(selectedFeedback.rating)}
              </div>
            )}

            <div className="card bg-light mb-4">
              <div className="card-body">
                <p className="mb-0">{selectedFeedback.message}</p>
                <small className="text-muted">
                  Submitted on {new Date(selectedFeedback.createdAt).toLocaleString()}
                </small>
              </div>
            </div>

            {selectedFeedback.reply && (
              <div className="card bg-success bg-opacity-10 mb-4">
                <div className="card-body">
                  <h6>Your Reply:</h6>
                  <p className="mb-0">{selectedFeedback.reply}</p>
                  <small className="text-muted">
                    Replied on {new Date(selectedFeedback.repliedAt).toLocaleString()}
                  </small>
                </div>
              </div>
            )}

            <h5 className="mb-3">Reply to Feedback</h5>
            <textarea
              className="form-control mb-3"
              rows="4"
              placeholder="Type your reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            ></textarea>

            <div className="d-flex gap-2 student-feedback-detail-actions" style={{ flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => handleReply(selectedFeedback._id)}
                disabled={!replyText.trim()}
              >
                <i className="fas fa-paper-plane me-2"></i>Send Reply
              </button>
              <button
                className="btn btn-warning"
                onClick={() => handleStatusChange(selectedFeedback._id, 'read')}
              >
                Mark as Read
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(selectedFeedback._id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Student</th>
                <th>Message</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {feedback.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                    No feedback found
                  </td>
                </tr>
              ) : (
                feedback.map(item => (
                  <tr key={item._id}>
                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td>
                      <strong>{item.studentName}</strong>
                      <br />
                      <small>{item.studentEmail}</small>
                    </td>
                    <td>{item.message.substring(0, 100)}...</td>
                    <td>
                      {item.rating && (
                        <span>{item.rating} ★</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary me-2"
                        onClick={() => setSelectedFeedback(item)}
                      >
                        View
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(item._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentFeedback;
