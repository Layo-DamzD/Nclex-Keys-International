import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const PreviousTests = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

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
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inProgressTests.map((test) => (
                  <tr key={test._id} style={{ background: '#fffbeb' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-hourglass-half" style={{ color: '#d97706' }}></i>
                        {test.testName}
                      </div>
                    </td>
                    <td>{formatDate(test.date)}</td>
                    <td>
                      <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                        In Progress
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-warning me-2"
                        onClick={() => navigate('/create-test')}
                      >
                        Resume
                      </button>
                    </td>
                  </tr>
                ))}
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
