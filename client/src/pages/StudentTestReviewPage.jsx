import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import TestReviewExamView from '../components/TestReviewExamView';

const StudentTestReviewPage = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const fetchReview = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`/api/student/test-result/${resultId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTestResult(response.data);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load test review');
      } finally {
        setLoading(false);
      }
    };

    if (!resultId) {
      setError('Missing test result ID');
      setLoading(false);
      return;
    }

    fetchReview();
  }, [resultId]);

  if (loading) return <div className="p-4">Loading review...</div>;

  if (error) {
    return (
      <div className="p-4">
        <div className="alert alert-danger">{error}</div>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard?section=previous-tests')}>
          Back to Previous Tests
        </button>
      </div>
    );
  }

  return (
    <TestReviewExamView
      testResult={testResult}
      onBack={() => navigate('/dashboard?section=previous-tests')}
      backLabel="Back to list"
      titlePrefix="Test Review"
    />
  );
};

export default StudentTestReviewPage;
