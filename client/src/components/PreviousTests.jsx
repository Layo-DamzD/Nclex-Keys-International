import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const PreviousTests = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resumingId, setResumingId] = useState(null);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/student/test-history', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const allTests = Array.isArray(response.data) ? response.data : [];
        setTests(
          allTests.filter((test) => !String(test?.testName || '').toLowerCase().includes('public knowledge test'))
        );
      } catch (error) {
        console.error('Error fetching test history:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  const handleViewReview = (testId) => {
    navigate(`/test-review/${testId}`);
  };

  const handleResume = async (test) => {
    const testType = (test.testType || '').toLowerCase();
    setResumingId(test._id);

    try {
      const token = localStorage.getItem('token');

      if (testType === 'cat' || testType === 'assessment') {
        // CAT/Assessment: call resume endpoint to restore from DB
        const response = await axios.post('/api/student/cat/resume', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.resumed && response.data.question) {
          navigate('/cat-session', {
            state: {
              ...response.data,
              testType: response.data.testType || testType,
            }
          });
        } else {
          alert('Could not resume session. It may have expired.');
        }
      } else {
        // Practice/custom test: navigate to /test-session — localStorage will handle restore
        const saved = localStorage.getItem('nclex-test-session-state');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.savedAt && (Date.now() - parsed.savedAt) < 24 * 60 * 60 * 1000) {
            navigate('/test-session', { state: {} }); // no state → triggers localStorage restore
          } else {
            alert('This test session has expired (older than 24 hours).');
            localStorage.removeItem('nclex-test-session-state');
          }
        } else {
          // Check if there's a saved CAT state instead
          const catSaved = localStorage.getItem('nclex-cat-session-state');
          if (catSaved) {
            navigate('/cat-session', { state: {} });
          } else {
            alert('No saved test session found. The test data may have been cleared.');
          }
        }
      }
    } catch (error) {
      console.error('Resume error:', error);
      const msg = error.response?.data?.message || 'Failed to resume test.';
      alert(msg);
    } finally {
      setResumingId(null);
    }
  };

  const handleAbandon = async (testId) => {
    if (!window.confirm('Are you sure you want to abandon this test? It cannot be resumed after this.')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const testType = (tests.find(t => t._id === testId)?.testType || '').toLowerCase();

      if (testType === 'cat' || testType === 'assessment') {
        // Clean up CAT session from server
        await axios.post('/api/student/cat/abandon', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      // Remove localStorage state
      localStorage.removeItem('nclex-test-session-state');
      localStorage.removeItem('nclex-cat-session-state');

      // Remove from local list
      setTests(prev => prev.filter(t => t._id !== testId));
    } catch (error) {
      console.error('Abandon error:', error);
    }
  };

  const formatTime = (minutes) => {
    if (!Number.isFinite(minutes)) return '-';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) return <div>Loading...</div>;

  // Separate in-progress and completed tests
  const inProgressTests = tests.filter(t => t.status === 'in_progress');
  const completedTests = tests.filter(t => t.status !== 'in_progress');

  return (
    <div className="previous-tests">
      <h3>Previous Test Attempts</h3>

      {inProgressTests.length > 0 && (
        <>
          <h6 style={{ color: '#d97706', marginBottom: '12px', marginTop: '20px' }}>
            <i className="fas fa-clock" style={{ marginRight: '6px' }}></i>
            In Progress ({inProgressTests.length})
          </h6>
          <div className="test-table table-responsive" style={{ marginBottom: '24px' }}>
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Date Started</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inProgressTests.map((test) => {
                  const testType = (test.testType || '').toLowerCase();
                  const typeLabel = testType === 'assessment' ? 'Assessment'
                    : testType === 'cat' ? 'CAT'
                    : 'Practice';

                  return (
                    <tr key={test._id} style={{ background: '#fffbeb' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="fas fa-hourglass-half" style={{ color: '#d97706' }}></i>
                          {test.testName}
                        </div>
                      </td>
                      <td>{formatDate(test.date)}</td>
                      <td>
                        <span className="badge" style={{
                          background: testType === 'assessment' ? '#E1BEE7' : testType === 'cat' ? '#E8EAF6' : '#E3F2FD',
                          color: testType === 'assessment' ? '#6A1B9A' : testType === 'cat' ? '#283593' : '#1565C0',
                          fontWeight: 500,
                          fontSize: '0.75rem'
                        }}>
                          {typeLabel}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                          In Progress
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-warning me-2"
                          disabled={resumingId === test._id}
                          onClick={() => handleResume(test)}
                        >
                          {resumingId === test._id ? (
                            <>
                              <i className="fas fa-spinner fa-spin" style={{ marginRight: '4px' }}></i>
                              Resuming...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-play" style={{ marginRight: '4px' }}></i>
                              Resume
                            </>
                          )}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleAbandon(test._id)}
                          title="Abandon this test"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {completedTests.length === 0 && inProgressTests.length === 0 ? (
        <p className="text-muted">No tests taken yet.</p>
      ) : (
        <>
          {completedTests.length > 0 && (
            <>
              {inProgressTests.length > 0 && (
                <h6 style={{ color: '#64748b', marginBottom: '12px', marginTop: '20px' }}>
                  <i className="fas fa-check-circle" style={{ marginRight: '6px' }}></i>
                  Completed ({completedTests.length})
                </h6>
              )}
              <div className="test-table table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Test Name</th>
                      <th>Date</th>
                      <th>Score</th>
                      <th>Percentage</th>
                      <th>Time Taken</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedTests.map((test) => (
                      <tr key={test._id}>
                        <td>{test.testName}</td>
                        <td>{formatDate(test.date)}</td>
                        <td>{test.score}/{test.totalQuestions}</td>
                        <td>
                          <span className={`badge ${test.passed ? 'bg-success' : 'bg-danger'}`}>
                            {test.percentage}%
                          </span>
                        </td>
                        <td>{formatTime(test.timeTaken)}</td>
                        <td>
                          <button className="btn btn-sm btn-primary me-2" onClick={() => handleViewReview(test._id)}>
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default PreviousTests;
