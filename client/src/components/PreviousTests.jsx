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
        setTests(response.data);
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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="previous-tests">
      <h3>Previous Test Attempts</h3>
      {tests.length === 0 ? (
        <p className="text-muted">No tests taken yet.</p>
      ) : (
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
              {tests.map((test) => (
                <tr key={test._id}>
                  <td>{test.testName}</td>
                  <td>{new Date(test.date).toLocaleDateString()}</td>
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
      )}
    </div>
  );
};

export default PreviousTests;
