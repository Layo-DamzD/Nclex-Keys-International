import React, { useState } from 'react';
import axios from 'axios';

const StudentFeedbackModal = ({ open, onClose }) => {
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!open) return null;

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const resetAndClose = () => {
    setRating(0);
    setMessage('');
    setError('');
    setSuccess('');
    onClose();
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (rating < 1) {
      setError('Please select a rating.');
      return;
    }

    if (!message.trim()) {
      setError('Please enter your feedback.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        '/api/student/feedback',
        { rating, message: message.trim() },
        { headers: authHeaders() }
      );
      setSuccess('Feedback sent successfully.');
      setTimeout(() => resetAndClose(), 700);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="weekly-review-modal">
        <div className="modal-header">
          <h3>Share Feedback</h3>
          <button className="close-btn" onClick={resetAndClose} disabled={submitting} aria-label="Close">
            x
          </button>
        </div>

        <div className="modal-body">
          <p>Send your feedback directly to the admin Student Feedback panel.</p>

          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Rate your experience (1-5)
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className="btn btn-sm"
                onClick={() => setRating(value)}
                disabled={submitting}
                style={{
                  minWidth: 42,
                  border: '1px solid #d1d5db',
                  background: value <= rating ? '#fbbf24' : '#ffffff',
                  color: '#111827',
                  fontWeight: 700
                }}
              >
                {value}
              </button>
            ))}
          </div>

          <label htmlFor="student-feedback-message" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Feedback message
          </label>
          <textarea
            id="student-feedback-message"
            className="form-control"
            rows="4"
            placeholder="Tell us what is working, what is confusing, or what you want added."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={submitting}
          />

          {error && <div className="alert alert-danger" style={{ marginTop: 12, marginBottom: 0 }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginTop: 12, marginBottom: 0 }}>{success}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={resetAndClose} disabled={submitting}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentFeedbackModal;

