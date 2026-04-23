import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

// Unified popup dismissal helpers (shared across all popup components)
const POPUP_LS_PREFIX = 'popup-dismissed:';
const POPUP_SS_PREFIX = 'popup-session:';

const isPopupDismissed = (popupKey) => {
  // Check sessionStorage first (survives refresh, cleared on tab close)
  try {
    if (sessionStorage.getItem(`${POPUP_SS_PREFIX}${popupKey}`) === 'true') return true;
  } catch {}
  // Then localStorage (survives everything)
  try {
    if (localStorage.getItem(`${POPUP_LS_PREFIX}${popupKey}`) === 'true') return true;
  } catch {}
  return false;
};

const dismissPopup = (popupKey) => {
  try { sessionStorage.setItem(`${POPUP_SS_PREFIX}${popupKey}`, 'true'); } catch {}
  try { localStorage.setItem(`${POPUP_LS_PREFIX}${popupKey}`, 'true'); } catch {}
};

const WeeklyReviewPopup = ({ disabled = false }) => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const checkedRef = useRef(false);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    if (disabled) {
      setShow(false);
      return;
    }
    // Guard: only check ONCE per component mount
    if (checkedRef.current) return;
    checkedRef.current = true;

    const checkWeeklyReview = async () => {
      try {
        const response = await axios.get('/api/student/check-weekly-review', {
          headers: authHeaders()
        });

        // Server says no review needed — respect that
        if (!response.data?.needsReview) {
          setShow(false);
          return;
        }

        // Server says review needed — but check if already dismissed in this session or previously
        // Use a date-based key so it can re-trigger next week
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const popupKey = `weekly-review:${today}`;

        if (isPopupDismissed(popupKey)) {
          setShow(false);
          return;
        }

        setShow(true);
      } catch (err) {
        console.error('Failed to check weekly review:', err);
      }
    };

    checkWeeklyReview();
  }, [disabled]);

  const dismissForWeek = async () => {
    setLoading(true);
    setError('');
    try {
      // Dismiss locally first (immediate)
      const today = new Date().toISOString().slice(0, 10);
      dismissPopup(`weekly-review:${today}`);

      // Also try server-side dismissal
      await axios.post('/api/student/mark-review-done', {}, {
        headers: authHeaders()
      }).catch(() => {});
      setShow(false);
    } catch (err) {
      console.error('Failed to dismiss weekly review popup:', err);
      setError('Failed to dismiss reminder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPerformance = () => {
    const today = new Date().toISOString().slice(0, 10);
    dismissPopup(`weekly-review:${today}`);
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
