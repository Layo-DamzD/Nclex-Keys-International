import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RecentQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const token = sessionStorage.getItem('adminToken');
        const response = await axios.get('/api/admin/questions/recent', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQuestions(response.data);
      } catch (error) {
        console.error('Error fetching recent questions:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
  }, []);

  if (loading) return <div>Loading recent questions...</div>;

  return (
    <div className="form-card">
      <h2 className="admin-section-title">Recent Questions</h2>
      {questions.length === 0 ? (
        <p>No questions yet. Start by uploading your first NCLEX question!</p>
      ) : (
        questions.map((q, idx) => (
          <div key={idx} className="recent-question-item">
            <div className="recent-question-text">
              {q.questionText.length > 100 ? `${q.questionText.substring(0, 100)}...` : q.questionText}
            </div>
            <div className="recent-question-meta">
              <span>{q.category}</span>
              <span>•</span>
              <span>{q.subcategory}</span>
              <span>•</span>
              <span>{q.type}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default RecentQuestions;
