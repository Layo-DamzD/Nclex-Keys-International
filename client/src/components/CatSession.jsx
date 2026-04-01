import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { resolveMediaCandidates } from '../utils/imageUpload';

const firstMediaUrl = (rawUrl) => resolveMediaCandidates(rawUrl)[0] || '';

const CatSession = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialData = location.state || {};
  
  const [currentQuestion, setCurrentQuestion] = useState(initialData.question || null);
  const [questionNumber, setQuestionNumber] = useState(initialData.questionNumber || 1);
  const [theta, setTheta] = useState(initialData.theta || 0);
  const [se, setSe] = useState(initialData.se || null);
  const [status, setStatus] = useState('continue');
  const [result, setResult] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRationale, setShowRationale] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);

  // Handle answer selection for multiple choice
  const handleOptionSelect = (optionKey) => {
    if (currentQuestion?.type === 'sata') {
      // SATA: toggle selection
      setSelectedOptions(prev => 
        prev.includes(optionKey) 
          ? prev.filter(k => k !== optionKey)
          : [...prev, optionKey]
      );
    } else {
      // Single choice
      setAnswer(optionKey);
    }
  };

  // Submit answer and get next question
  const submitAnswer = async () => {
    if (!currentQuestion) return;
    
    const userAnswer = currentQuestion?.type === 'sata' ? selectedOptions : answer;
    if (!userAnswer || (Array.isArray(userAnswer) && userAnswer.length === 0)) {
      setError('Please select an answer before submitting.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/student/cat/answer', {
        questionId: currentQuestion._id,
        answer: userAnswer
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Show rationale briefly
      const correctAnswer = currentQuestion.correctAnswer;
      let wasCorrect = false;
      
      if (currentQuestion.type === 'sata') {
        const normalizedUser = selectedOptions.map(v => v.toUpperCase()).sort();
        const normalizedCorrect = (Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer])
          .map(v => v.toUpperCase()).sort();
        wasCorrect = JSON.stringify(normalizedUser) === JSON.stringify(normalizedCorrect);
      } else {
        wasCorrect = String(userAnswer).toUpperCase() === String(correctAnswer).toUpperCase();
      }
      
      setIsCorrect(wasCorrect);
      setShowRationale(true);
      
      // After 2 seconds, proceed to next question or show results
      setTimeout(() => {
        setShowRationale(false);
        setAnswer(null);
        setSelectedOptions([]);
        
        if (response.data.status === 'completed') {
          setStatus('completed');
          setResult(response.data.result);
        } else {
          setCurrentQuestion(response.data.question);
          setQuestionNumber(response.data.questionNumber);
          setTheta(response.data.theta);
          setSe(response.data.se);
        }
        
        setLoading(false);
      }, 2000);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit answer');
      setLoading(false);
    }
  };

  // Go to dashboard
  const goToDashboard = () => {
    navigate('/dashboard');
  };

  // Go to test review
  const goToReview = () => {
    if (result?._id) {
      navigate(`/test-review/${result._id}`);
    }
  };

  // Format ability estimate for display
  const formatTheta = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(2);
  };

  // Render completed state
  if (status === 'completed' && result) {
    const passed = result.passed;
    const percentage = Math.round((result.score / result.totalQuestions) * 100);
    
    return (
      <div className="cat-session-container" style={{
        minHeight: '100vh',
        background: passed 
          ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
          : 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '600px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: passed ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <i className={`fas ${passed ? 'fa-check' : 'fa-times'}`} style={{ fontSize: '40px', color: '#fff' }}></i>
          </div>
          
          <h1 style={{ fontSize: '32px', marginBottom: '8px', color: passed ? '#059669' : '#dc2626' }}>
            {passed ? 'PASSED' : 'NOT PASSED'}
          </h1>
          
          <p style={{ color: '#6b7280', marginBottom: '32px', fontSize: '18px' }}>
            CAT Adaptive Test Complete
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
            <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#1f2937' }}>
                {result.score}/{result.totalQuestions}
              </div>
              <div style={{ color: '#6b7280', marginTop: '4px' }}>Questions Correct</div>
            </div>
            <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#1f2937' }}>
                {percentage}%
              </div>
              <div style={{ color: '#6b7280', marginTop: '4px' }}>Score</div>
            </div>
            <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#7c3aed' }}>
                {formatTheta(result.theta)}
              </div>
              <div style={{ color: '#6b7280', marginTop: '4px' }}>Ability Estimate (θ)</div>
            </div>
            <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#6b7280' }}>
                {formatTheta(result.se)}
              </div>
              <div style={{ color: '#6b7280', marginTop: '4px' }}>Standard Error</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={goToDashboard}
              style={{
                padding: '14px 32px',
                background: '#059669',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Back to Dashboard
            </button>
            <button
              onClick={goToReview}
              style={{
                padding: '14px 32px',
                background: '#fff',
                color: '#059669',
                border: '2px solid #059669',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Review Answers
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render question
  return (
    <div className="cat-session-container" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '16px 24px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div>
          <h2 style={{ margin: 0, color: '#7c3aed', fontSize: '20px' }}>
            <i className="fas fa-brain me-2"></i>
            CAT Mode
          </h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Computerized Adaptive Testing
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
            Question {questionNumber}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            θ = {formatTheta(theta)} | SE = {formatTheta(se)}
          </div>
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '900px',
          margin: '0 auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          {/* Question Text */}
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '18px', lineHeight: 1.6, color: '#1f2937' }}>
              {currentQuestion.questionText}
            </p>
            {currentQuestion.questionImageUrl && (
              <img 
                src={firstMediaUrl(currentQuestion.questionImageUrl)}
                alt="Question"
                style={{ maxWidth: '100%', marginTop: '16px', borderRadius: '8px' }}
              />
            )}
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentQuestion.options?.map((option, index) => {
              const optionKey = String.fromCharCode(65 + index); // A, B, C, D
              const isSelected = currentQuestion.type === 'sata'
                ? selectedOptions.includes(optionKey)
                : answer === optionKey;
              
              let borderColor = '#e2e8f0';
              let background = '#fff';
              
              if (showRationale) {
                const correctAnswer = currentQuestion.correctAnswer;
                const isCorrectOption = currentQuestion.type === 'sata'
                  ? (Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer])
                      .map(v => v.toUpperCase()).includes(optionKey)
                  : String(correctAnswer).toUpperCase() === optionKey;
                
                if (isCorrectOption) {
                  borderColor = '#10b981';
                  background = '#ecfdf5';
                } else if (isSelected && !isCorrectOption) {
                  borderColor = '#ef4444';
                  background = '#fef2f2';
                }
              } else if (isSelected) {
                borderColor = '#7c3aed';
                background = '#f5f3ff';
              }
              
              return (
                <div
                  key={index}
                  onClick={() => !showRationale && !loading && handleOptionSelect(optionKey)}
                  style={{
                    padding: '16px 20px',
                    border: `2px solid ${borderColor}`,
                    borderRadius: '10px',
                    background,
                    cursor: showRationale || loading ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: currentQuestion.type === 'sata' ? '4px' : '50%',
                    background: isSelected ? '#7c3aed' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: isSelected ? '#fff' : '#64748b',
                    fontWeight: 600,
                    fontSize: '14px'
                  }}>
                    {currentQuestion.type === 'sata' ? (
                      <i className={`fas ${isSelected ? 'fa-check' : 'fa-square'}`} style={{ fontSize: '12px' }}></i>
                    ) : (
                      optionKey
                    )}
                  </div>
                  <div style={{ flex: 1, fontSize: '16px', color: '#374151' }}>
                    {option}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rationale */}
          {showRationale && currentQuestion.rationale && (
            <div style={{
              marginTop: '24px',
              padding: '20px',
              background: isCorrect ? '#ecfdf5' : '#fef2f2',
              borderRadius: '10px',
              border: `1px solid ${isCorrect ? '#10b981' : '#ef4444'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <i className={`fas ${isCorrect ? 'fa-check-circle' : 'fa-times-circle'}`} 
                   style={{ color: isCorrect ? '#10b981' : '#ef4444' }}></i>
                <strong style={{ color: isCorrect ? '#059669' : '#dc2626' }}>
                  {isCorrect ? 'Correct!' : 'Incorrect'}
                </strong>
              </div>
              <p style={{ margin: 0, color: '#374151' }}>
                <strong>Rationale:</strong> {currentQuestion.rationale}
              </p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger mt-3">{error}</div>
          )}

          {/* Submit Button */}
          {!showRationale && (
            <button
              onClick={submitAnswer}
              disabled={loading || (!answer && selectedOptions.length === 0)}
              style={{
                marginTop: '24px',
                width: '100%',
                padding: '16px',
                background: (loading || (!answer && selectedOptions.length === 0)) ? '#e2e8f0' : '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '18px',
                fontWeight: 600,
                cursor: (loading || (!answer && selectedOptions.length === 0)) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'Processing...' : 'Submit Answer'}
            </button>
          )}
        </div>
      )}

      {/* Exit Button */}
      <button
        onClick={() => {
          if (window.confirm('Are you sure you want to exit? Your progress will be lost.')) {
            navigate('/dashboard');
          }
        }}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '10px 20px',
          background: '#fff',
          border: '2px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer'
        }}
      >
        <i className="fas fa-times me-2"></i>
        Exit
      </button>
    </div>
  );
};

export default CatSession;
