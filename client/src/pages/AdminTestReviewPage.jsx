import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import TestReviewExamView from '../components/TestReviewExamView';

const AdminTestReviewPage = () => {
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
        const token = sessionStorage.getItem('adminToken');
        const response = await axios.get(`/api/admin/test-results/${resultId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTestResult(response.data);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load test review');
      } finally {
        setLoading(false);
      }
    };

    if (resultId) {
      fetchReview();
    } else {
      setError('Missing test result ID');
      setLoading(false);
    }
  }, [resultId]);

  if (loading) {
    return <div className="p-4">Loading test review...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="alert alert-danger">{error}</div>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/dashboard')}>
          Back to Admin Dashboard
        </button>
      </div>
    );
  }

  return (
    <TestReviewExamView
      testResult={testResult}
      onBack={() => navigate('/admin/dashboard')}
      backLabel="Back to Admin Dashboard"
      titlePrefix="Student Test Review"
      runtimeMode={true} 
    />
  );
};

export default AdminTestReviewPage;
