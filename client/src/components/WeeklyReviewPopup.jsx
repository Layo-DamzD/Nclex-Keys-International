import React, { useEffect, useState } from 'react';
import axios from 'axios';

const WeeklyReviewPopup = ({ disabled = false }) => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (disabled) {
      setShow(false);
      return;
    }
    checkWeeklyReview();
  }, [disabled]);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const checkWeeklyReview = async () => {
    try {
      const response = await axios.get('/api/student/check-weekly-review', {
        headers: authHeaders()
      });
      setShow(Boolean(response.data?.needsReview));
    } catch (err) {
      console.error('Failed to check weekly review:', err);
    }
  };

  const dismissForWeek = async () => {
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/student/mark-review-done', {}, {
        headers: authHeaders()
      });
      setShow(false);
    } catch (err) {
      console.error('Failed to dismiss weekly review popup:', err);
      setError('Failed to dismiss reminder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPerformance = () => {
    setShow(false);
    window.dispatchEvent(new CustomEvent('student-dashboard:set-section', { detail: 'performance' }));
  };

  if (!show || disabled) return null;

  return (
    <div className="modal-overlay">
      <div className="weekly-review-modal">
        <div className="modal-header">
          <h3>Weekly System Feedback</h3>
          <button
            className="close-btn"
            onClick={dismissForWeek}
            disabled={loading}
            aria-label="Close weekly review popup"
          >
            x
          </button>
        </div>

        <div className="modal-body">
          <p>
            It&apos;s been a week since your last progress review.
          </p>
          <p style={{ marginBottom: 8 }}>Take a few minutes to:</p>
          <ul style={{ marginBottom: 0 }}>
            <li>Review your weak areas</li>
            <li>Check your performance trends</li>
            <li>Take a recommended practice test</li>
          </ul>

          {error && (
            <div className="alert alert-danger" style={{ marginTop: 12, marginBottom: 0 }}>
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={dismissForWeek}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Remind Me Later'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleOpenPerformance}
            disabled={loading}
          >
            Review Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReviewPopup;
