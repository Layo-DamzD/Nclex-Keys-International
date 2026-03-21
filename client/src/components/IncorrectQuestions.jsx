import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const IncorrectQuestions = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncorrectQuestions();
  }, []);

  const fetchIncorrectQuestions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/student/incorrect-questions', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const safeQuestions = Array.isArray(response.data)
        ? response.data.filter((q) => q && q._id && q.questionText)
        : [];

      setQuestions(safeQuestions);
    } catch (error) {
      console.error('Error fetching incorrect questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetakeQuestion = (question) => {
    if (!question?._id) {
      window.alert('Question could not be loaded for retake.');
      return;
    }

    navigate('/test-session', {
      state: {
        questions: [question],
        settings: {
          timed: false,
          tutorMode: false,
          totalQuestions: 1,
          source: 'incorrect-questions',
          returnTo: '/dashboard?section=incorrect-questions'
        }
      }
    });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="incorrect-questions">
      <h3>Incorrect Questions (Retake)</h3>
      {questions.length === 0 ? (
        <p className="text-muted">No incorrect questions to review. Great job!</p>
      ) : (
        <div className="question-list">
          {questions.map((q, idx) => {
            const preview = q.questionText?.length > 100
              ? `${q.questionText.substring(0, 100)}...`
              : q.questionText;

            return (
              <div key={q._id} className="question-item card mb-2">
                <div className="card-body">
                  <p className="mb-2">{idx + 1}. {preview}</p>
                  <p className="text-muted small mb-1">
                    Attempts: {q.attemptCount || 0} | Last: {q.lastAttempted ? new Date(q.lastAttempted).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="text-muted small mb-2">
                    Type: {q.type || 'question'}
                    {q.category ? ` | ${q.category}` : ''}
                    {q.subcategory ? ` > ${q.subcategory}` : ''}
                  </p>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleRetakeQuestion(q)}
                  >
                    Retake Question
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IncorrectQuestions;
