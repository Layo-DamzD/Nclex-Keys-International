import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RecentTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/student/recent-tests', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTests(response.data);
      } catch (error) {
        console.error('Error fetching recent tests:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  if (loading) return <div>Loading recent tests...</div>;

  return (
    <div id="recentTestsList">
      {tests.length === 0 ? (
        <p className="text-muted">No tests taken yet</p>
      ) : (
        tests.map((test, idx) => (
          <div className="mb-3" key={idx}>
            <div className="d-flex justify-content-between mb-2">
              <span><strong>{test.testName}</strong></span>
              <span className={test.percentage >= 70 ? 'text-success' : 'text-danger'}>
                {test.percentage}%
              </span>
            </div>
            <div className="progress" style={{ height: '8px' }}>
              <div
                className={`progress-bar ${test.percentage >= 70 ? 'bg-success' : 'bg-danger'}`}
                style={{ width: `${test.percentage}%` }}
              ></div>
            </div>
            <small className="text-muted">
              Completed on {new Date(test.date).toLocaleDateString()} • {test.timeTaken} min
            </small>
          </div>
        ))
      )}
    </div>
  );
};

export default RecentTests;