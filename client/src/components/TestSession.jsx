import React, { useState, useEffect, useRef, useReducer } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

// --- Calculator Reducer and Component ---
const calculatorReducer = (state, action) => {
  switch (action.type) {
    case 'DIGIT':
      return {
        ...state,
        current: state.current === '0' ? action.digit : state.current + action.digit,
      };
    case 'OPERATOR':
      if (state.operator && state.previous !== null) {
        const prev = parseFloat(state.previous);
        const curr = parseFloat(state.current);
        let result;
        switch (state.operator) {
          case '+': result = prev + curr; break;
          case '-': result = prev - curr; break;
          case '*': result = prev * curr; break;
          case '/': result = prev / curr; break;
          default: result = curr;
        }
        return {
          previous: result.toString(),
          current: '0',
          operator: action.operator,
        };
      } else {
        return {
          previous: state.current,
          current: '0',
          operator: action.operator,
        };
      }
    case 'EQUALS':
      if (state.operator && state.previous !== null) {
        const prev = parseFloat(state.previous);
        const curr = parseFloat(state.current);
        let result;
        switch (state.operator) {
          case '+': result = prev + curr; break;
          case '-': result = prev - curr; break;
          case '*': result = prev * curr; break;
          case '/': result = prev / curr; break;
          default: result = curr;
        }
        return {
          previous: null,
          current: result.toString(),
          operator: null,
        };
      }
      return state;
    case 'CLEAR':
      return { previous: null, current: '0', operator: null };
    case 'CLEAR_ENTRY':
      return { ...state, current: '0' };
    default:
      return state;
  }
};

const CalculatorModal = ({ show, onClose }) => {
  const [state, dispatch] = useReducer(calculatorReducer, { previous: null, current: '0', operator: null });

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="calculator-modal" onClick={e => e.stopPropagation()}>
        <div className="calculator-header">
          <span>Calculator</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="calculator-display">
          <div className="previous-operand">{state.previous} {state.operator}</div>
          <div className="current-operand">{state.current}</div>
        </div>
        <div className="calculator-buttons">
          <button onClick={() => dispatch({ type: 'CLEAR' })}>AC</button>
          <button onClick={() => dispatch({ type: 'CLEAR_ENTRY' })}>C</button>
          <button onClick={() => dispatch({ type: 'OPERATOR', operator: '/' })}>÷</button>
          <button onClick={() => dispatch({ type: 'OPERATOR', operator: '*' })}>×</button>
          <button onClick={() => dispatch({ type: 'DIGIT', digit: '7' })}>7</button>
          <button onClick={() => dispatch({ type: 'DIGIT', digit: '8' })}>8</button>
          <button onClick={() => dispatch({ type: 'DIGIT', digit: '9' })}>9</button>
          <button onClick={() => dispatch({ type: 'OPERATOR', operator: '-' })}>−</button>
          <button onClick={() => dispatch({ type: 'DIGIT', digit: '4' })}>4</button>
          <button onClick={() => dispatch({ type: 'DIGIT', digit: '5' })}>5</button>
          <button onClick={() => dispatch({ type: 'DIGIT', digit: '6' })}>6</button>
          <button onClick={() => dispatch({ type: 'OPERATOR', operator: '+' })}>+</button>
          <button onClick={() => dispatch({ type: 'DIGIT', digit: '1' })}>1</button>
          <button onClick={() => dispatch({ type: 'DIGIT', digit: '2' })}>2</button>
          <button onClick={() => dispatch({ type: 'DIGIT', digit: '3' })}>3</button>
          <button onClick={() => dispatch({ type: 'EQUALS' })} className="equals">=</button>
          <button onClick={() => dispatch({ type: 'DIGIT', digit: '0' })}>0</button>
          <button onClick={() => dispatch({ type: 'DIGIT', digit: '.' })}>.</button>
        </div>
      </div>
    </div>
  );
};

// --- Main TestSession Component ---
const TestSession = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions, settings } = location.state || { questions: [], settings: {} };
  const dashboardReturnPath = settings?.returnTo || '/dashboard';
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(settings.timed ? settings.totalQuestions * 60 : null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState([]);
  const [showReview, setShowReview] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showCalculator, setShowCalculator] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [bootProgress, setBootProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Case study state
  const [caseIndex, setCaseIndex] = useState(0);
  const [caseAnswers, setCaseAnswers] = useState({});

  // Highlight ref
  const highlightRef = useRef(null);

  // Drag & drop state (non‑case)
  const [dragItems, setDragItems] = useState([]);
  const [caseDragItems, setCaseDragItems] = useState({});
  const hideInProgressAnswerHints = Boolean(settings?.tutorMode || settings?.timed);

  // Timer effect
  useEffect(() => {
    if (settings.timed && timeLeft !== null && timeLeft > 0 && !submitted && !isPaused) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [settings.timed, timeLeft, submitted, isPaused]);

  useEffect(() => {
    if (!questions.length || submitted) {
      setIsBooting(false);
      return;
    }

    setIsBooting(true);
    setBootProgress(0);

    let progress = 0;
    const timer = setInterval(() => {
      progress = Math.min(100, progress + (progress < 70 ? 12 : progress < 90 ? 6 : 3));
      setBootProgress(progress);
      if (progress >= 100) {
        clearInterval(timer);
        setTimeout(() => setIsBooting(false), 250);
      }
    }, 90);

    return () => clearInterval(timer);
  }, [questions.length, submitted]);

  // Initialize drag for non‑case drag-drop
  useEffect(() => {
    const q = questions[currentIndex];
    if (q && q.type !== 'case-study' && q.type === 'drag-drop') {
      const shuffled = [...q.options].sort(() => Math.random() - 0.5);
      setDragItems(shuffled.map((text, idx) => ({ id: idx, text })));
    }
  }, [currentIndex, questions]);

  // Initialize drag for case study sub‑questions
  useEffect(() => {
    const q = questions[currentIndex];
    if (q?.type === 'case-study') {
      const subQ = q.questions[caseIndex];
      if (subQ?.type === 'drag-drop') {
        const key = `${q._id}-${subQ._id}`;
        if (!caseDragItems[key]) {
          const shuffled = [...subQ.options].sort(() => Math.random() - 0.5);
          setCaseDragItems(prev => ({ ...prev, [key]: shuffled.map((text, idx) => ({ id: idx, text })) }));
        }
      }
    }
  }, [currentIndex, caseIndex, questions, caseDragItems]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAnswer = (qId, answer) => {
    if (isPaused) return;
    setAnswers(prev => ({ ...prev, [qId]: answer }));
  };
  const handleCaseAnswer = (subQId, answer) => {
    if (isPaused) return;
    setCaseAnswers(prev => ({ ...prev, [subQId]: answer }));
  };
  const clearCurrentQuestionAnswer = () => {
    if (isPaused) return;
    const q = questions[currentIndex];
    if (!q) return;
    if (q.type === 'case-study') {
      const subQ = q.questions?.[caseIndex];
      if (!subQ) return;
      setCaseAnswers((prev) => ({ ...prev, [subQ._id]: undefined }));
      return;
    }
    setAnswers((prev) => ({ ...prev, [q._id]: undefined }));
  };

  const handleNext = () => {
    if (isPaused) return;
    const q = questions[currentIndex];
    if (q?.type === 'case-study') {
      if (caseIndex < q.questions.length - 1) {
        setCaseIndex(caseIndex + 1);
      } else if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setCaseIndex(0);
      }
    } else {
      if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (isPaused) return;
    const q = questions[currentIndex];
    if (q?.type === 'case-study') {
      if (caseIndex > 0) {
        setCaseIndex(caseIndex - 1);
      } else if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
        const prevQ = questions[currentIndex - 1];
        if (prevQ?.type === 'case-study') setCaseIndex(prevQ.questions.length - 1);
      }
    } else {
      if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    }
  };

  const handleExitSession = () => {
    const shouldExit = window.confirm('Exit this test session and return to dashboard?');
    if (shouldExit) {
      navigate(dashboardReturnPath);
    }
  };

  const sessionId = useMemo(
    () => String(settings?.sessionId || settings?.testId || location?.state?.testId || 'live-session'),
    [settings?.sessionId, settings?.testId, location?.state?.testId]
  );

  const loadChatMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      setChatLoading(true);
      const res = await axios.get('/api/student/exam-support/messages', {
        params: { sessionId },
        headers: { Authorization: `Bearer ${token}` }
      });
      setChatMessages(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load exam support messages', error);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (!submitted && !isBooting) {
      loadChatMessages();
    }
    const timer = setInterval(() => {
      if (!submitted && !isBooting) loadChatMessages();
    }, 5000);
    return () => clearInterval(timer);
  }, [sessionId, submitted, isBooting]);

  const sendChatMessage = async () => {
    const trimmed = String(chatText || '').trim();
    if (!trimmed) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await axios.post('/api/student/exam-support/messages', {
        sessionId,
        message: trimmed
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChatText('');
      loadChatMessages();
    } catch (error) {
      console.error('Failed to send exam support message', error);
    }
  };

  const openQuestionNavigator = () => {
    if (isPaused) return;
    if (!questions.length) return;
    const currentNumber = currentIndex + 1;
    const input = window.prompt(`Go to question number (1-${questions.length})`, String(currentNumber));
    if (!input) return;
    const target = Number(input);
    if (!Number.isInteger(target) || target < 1 || target > questions.length) {
      window.alert(`Enter a number between 1 and ${questions.length}.`);
      return;
    }
    setCurrentIndex(target - 1);
    setCaseIndex(0);
  };

  // Highlight helpers
  const isSelectionWithinRange = (selection, container, allowedStart, allowedEnd) => {
    if (!selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return false;
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(container);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    const end = start + range.toString().length;
    return start >= allowedStart && end <= allowedEnd;
  };

  const captureHighlight = (qId, allowedStart, allowedEnd) => {
    if (isPaused) return;
    if (!highlightRef.current) return;
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      if (isSelectionWithinRange(selection, highlightRef.current, allowedStart, allowedEnd)) {
        handleAnswer(qId, selection.toString());
      } else {
        selection.removeAllRanges();
        alert(`You can only select characters ${allowedStart + 1} to ${allowedEnd}.`);
      }
    }
  };

  // Drag handlers for non‑case
  const handleDragStart = (e, index) => {
    if (isPaused) return;
    e.dataTransfer.setData('text/plain', index);
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, dropIndex) => {
    if (isPaused) return;
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex) return;
    const newItems = [...dragItems];
    const [removed] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, removed);
    setDragItems(newItems);
    handleAnswer(questions[currentIndex]._id, newItems.map(item => item.text).join('|'));
  };

  // Drag handlers for case study sub‑questions
  const handleCaseDragStart = (key, e, index) => {
    if (isPaused) return;
    e.dataTransfer.setData('text/plain', index);
    e.dataTransfer.setData('dragKey', key);
  };
  const handleCaseDragOver = (e) => e.preventDefault();
  const handleCaseDrop = (key, e, dropIndex) => {
    if (isPaused) return;
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const dragKey = e.dataTransfer.getData('dragKey');
    if (dragKey !== key || dragIndex === dropIndex) return;
    const newItems = [...caseDragItems[key]];
    const [removed] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, removed);
    setCaseDragItems(prev => ({ ...prev, [key]: newItems }));
    const subQ = questions[currentIndex].questions[caseIndex];
    handleCaseAnswer(subQ._id, newItems.map(item => item.text).join('|'));
  };

  // Correctness helpers
  const isFillBlankCorrect = (userAnswer, correctAnswer) => {
    if (!userAnswer || !correctAnswer) return false;
    const user = userAnswer.trim().toLowerCase();
    const acceptable = correctAnswer.split(';').map(a => a.trim().toLowerCase());
    return acceptable.includes(user);
  };
  const isHighlightCorrect = (userAnswer, correctAnswer) => {
    if (!userAnswer || !correctAnswer) return false;
    return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
  };
  const isDragDropCorrect = (userAnswer, correctAnswer) => {
    if (!userAnswer || !correctAnswer) return false;
    return userAnswer === correctAnswer;
  };
  const isMatrixCorrect = (userAnswer, matrixRows) => {
    if (!userAnswer || !Array.isArray(userAnswer)) return false;
    for (let i = 0; i < matrixRows.length; i++) {
      if (userAnswer[i] !== matrixRows[i].correctColumn) return false;
    }
    return true;
  };
  const isHotspotCorrect = (userAnswer, correctAnswer) => {
    if (!userAnswer || !correctAnswer) return false;
    return String(userAnswer).trim() === String(correctAnswer).trim();
  };
  const isClozeDropdownCorrect = (userAnswer, correctAnswer) => {
    if (!userAnswer || !correctAnswer || typeof correctAnswer !== 'object') return false;
    const expectedKeys = Object.keys(correctAnswer);
    if (!expectedKeys.length) return false;
    return expectedKeys.every((key) => String(userAnswer?.[key] || '').trim() === String(correctAnswer[key] || '').trim());
  };

  async function handleSubmit() {
    if (submitted) return;
    setIsPaused(false);
    setSubmitted(true);

    // Flatten all results (including case study sub‑questions)
    const allResults = [];
    questions.forEach(q => {
      if (q.type === 'case-study') {
        q.questions.forEach(subQ => {
          const userAnswer = caseAnswers[subQ._id];
          let isCorrect = false;
          if (subQ.type === 'multiple-choice') {
            isCorrect = userAnswer === subQ.correctAnswer;
          } else if (subQ.type === 'sata') {
            const user = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
            const correct = Array.isArray(subQ.correctAnswer) ? [...subQ.correctAnswer].sort() : [];
            isCorrect = user.length === correct.length && user.every((v, i) => v === correct[i]);
          } else if (subQ.type === 'fill-blank') {
            isCorrect = isFillBlankCorrect(userAnswer, subQ.correctAnswer);
          } else if (subQ.type === 'highlight') {
            isCorrect = isHighlightCorrect(userAnswer, subQ.correctAnswer);
          } else if (subQ.type === 'drag-drop') {
            isCorrect = isDragDropCorrect(userAnswer, subQ.correctAnswer);
          } else if (subQ.type === 'matrix') {
            isCorrect = isMatrixCorrect(userAnswer, subQ.matrixRows);
          } else if (subQ.type === 'hotspot') {
            isCorrect = isHotspotCorrect(userAnswer, subQ.correctAnswer);
          } else if (subQ.type === 'cloze-dropdown') {
            isCorrect = isClozeDropdownCorrect(userAnswer, subQ.correctAnswer);
          }
          allResults.push({
            questionId: subQ._id,
            userAnswer,
            isCorrect,
            correctAnswer: subQ.correctAnswer,
            questionText: subQ.questionText,
            options: subQ.options,
            type: subQ.type,
            rationale: subQ.rationale,
            scenario: q.scenario,
            highlightStart: subQ.highlightStart,
            highlightEnd: subQ.highlightEnd,
            category: subQ.category,
            subcategory: subQ.subcategory,
            matrixColumns: subQ.matrixColumns,
            matrixRows: subQ.matrixRows,
            hotspotImageUrl: subQ.hotspotImageUrl,
            hotspotTargets: subQ.hotspotTargets,
            clozeTemplate: subQ.clozeTemplate,
            clozeBlanks: subQ.clozeBlanks,
          });
        });
      } else {
        const userAnswer = answers[q._id];
        let isCorrect = false;
        if (q.type === 'multiple-choice') {
          isCorrect = userAnswer === q.correctAnswer;
        } else if (q.type === 'sata') {
          const user = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
          const correct = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort() : [];
          isCorrect = user.length === correct.length && user.every((v, i) => v === correct[i]);
        } else if (q.type === 'fill-blank') {
          isCorrect = isFillBlankCorrect(userAnswer, q.correctAnswer);
        } else if (q.type === 'highlight') {
          isCorrect = isHighlightCorrect(userAnswer, q.correctAnswer);
        } else if (q.type === 'drag-drop') {
          isCorrect = isDragDropCorrect(userAnswer, q.correctAnswer);
        } else if (q.type === 'matrix') {
          isCorrect = isMatrixCorrect(userAnswer, q.matrixRows);
        } else if (q.type === 'hotspot') {
          isCorrect = isHotspotCorrect(userAnswer, q.correctAnswer);
        } else if (q.type === 'cloze-dropdown') {
          isCorrect = isClozeDropdownCorrect(userAnswer, q.correctAnswer);
        }
        allResults.push({
          questionId: q._id,
          userAnswer,
          isCorrect,
          correctAnswer: q.correctAnswer,
          questionText: q.questionText,
          options: q.options,
          type: q.type,
          rationale: q.rationale,
          highlightStart: q.highlightStart,
          highlightEnd: q.highlightEnd,
          category: q.category,
          subcategory: q.subcategory,
          matrixColumns: q.matrixColumns,
          matrixRows: q.matrixRows,
          hotspotImageUrl: q.hotspotImageUrl,
          hotspotTargets: q.hotspotTargets,
          clozeTemplate: q.clozeTemplate,
          clozeBlanks: q.clozeBlanks,
        });
      }
    });

    setResults(allResults);

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/student/submit-test', {
        testName: 'Custom Test',
        answers: { ...answers, ...caseAnswers },
        results: allResults,
        totalQuestions: allResults.length,
        timeTaken: settings.timed ? (settings.totalQuestions * 60 - timeLeft) / 60 : 0,
        passed: allResults.filter(r => r.isCorrect).length / allResults.length >= 0.7,
        isCustomTest: true,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  if (!questions.length) return <div>No questions loaded.</div>;

  const togglePause = () => {
    if (submitted) return;
    setShowCalculator(false);
    setIsPaused((prev) => !prev);
  }

  if (isBooting) {
    return (
      <div className="exam-boot-screen">
        <div className="exam-boot-card">
          <div className="exam-boot-top">
            <div className="exam-boot-title">Loading...</div>
            <div className="exam-boot-percent">{bootProgress}%</div>
          </div>
          <div className="exam-boot-bar">
            <div className="exam-boot-bar-fill" style={{ width: `${bootProgress}%` }}></div>
          </div>
          <div className="exam-boot-subtitle">
            Generating dedicated question pool
          </div>
        </div>
      </div>
    );
  }

  // --- Submitted view (results) ---
  if (submitted) {
    const correctCount = results.filter(r => r.isCorrect).length;
    const incorrectCount = results.length - correctCount;
    const percentage = Math.round((correctCount / results.length) * 100);
    const passed = percentage >= 70;

    const chartData = {
      labels: ['Correct', 'Incorrect'],
      datasets: [{
        data: [correctCount, incorrectCount],
        backgroundColor: ['#28a745', '#dc3545'],
        borderWidth: 0,
      }],
    };
    const chartOptions = {
      cutout: '70%',
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      maintainAspectRatio: false,
    };

    const filtered = results.filter(r => {
      if (filter === 'correct') return r.isCorrect;
      if (filter === 'incorrect') return !r.isCorrect;
      return true;
    });

    return (
      <div className="test-results">
        <h3>Test Completed</h3>
        <div className="score-display d-flex align-items-center justify-content-between">
          <div className="chart-container" style={{ width: '150px', height: '150px' }}>
            <Doughnut data={chartData} options={chartOptions} />
          </div>
          <div className="score-text">
            <h2 className={passed ? 'text-success' : 'text-danger'}>{percentage}%</h2>
            <p>Correct: {correctCount} / {results.length}</p>
          </div>
        </div>

        <div className="action-buttons d-flex justify-content-between align-items-center mt-4">
          <div>
            <button className="btn btn-primary me-2" onClick={() => setShowReview(!showReview)}>
              {showReview ? 'Hide Review' : 'Review Answers'}
            </button>
            <button className="btn btn-secondary" onClick={() => navigate(dashboardReturnPath)}>
              Back to Dashboard
            </button>
          </div>
          {showReview && (
            <div className="filter-buttons">
              <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'} me-2`} onClick={() => setFilter('all')}>All ({results.length})</button>
              <button className={`btn btn-sm ${filter === 'correct' ? 'btn-success' : 'btn-outline-success'} me-2`} onClick={() => setFilter('correct')}>Correct ({correctCount})</button>
              <button className={`btn btn-sm ${filter === 'incorrect' ? 'btn-danger' : 'btn-outline-danger'}`} onClick={() => setFilter('incorrect')}>Incorrect ({incorrectCount})</button>
            </div>
          )}
        </div>

        {showReview && (
          <div className="review-list mt-4">
            <h4>Answer Review {filter !== 'all' && `(${filter} only)`}</h4>
            {filtered.map((item) => (
              <div key={item.questionId} className="review-item card mb-3">
                <div className="card-body">
                  <h6>Question {results.indexOf(item) + 1}{item.scenario ? ' (Case Study)' : ''}</h6>
                  {item.scenario && <p className="text-muted small">Scenario: {item.scenario}</p>}
                  <p className="question-text">{item.questionText}</p>
                  <div className="row">
                    <div className="col-md-6">
                      <p><strong>Your answer:</strong> {
                        item.userAnswer ?
                          (item.type === 'multiple-choice' ? `${item.userAnswer}. ${item.options?.[item.userAnswer.charCodeAt(0)-65]}` :
                           item.type === 'sata' ? (Array.isArray(item.userAnswer) ? item.userAnswer.map(l => `${l}. ${item.options?.[l.charCodeAt(0)-65]}`).join('; ') : 'None') :
                           item.type === 'fill-blank' ? item.userAnswer :
                           item.type === 'highlight' ? `"${item.userAnswer}"` :
                           item.type === 'drag-drop' ? item.userAnswer?.replace(/\|/g, ' → ') :
                           item.type === 'hotspot' ? (item.userAnswer ? `Selected: ${item.userAnswer}` : 'Not answered') :
                           item.type === 'cloze-dropdown' ? (
                             <div>
                               {Object.entries(item.userAnswer || {}).map(([key, val]) => (
                                 <div key={key}><strong>{key}:</strong> {String(val || '') || 'None'}</div>
                               ))}
                             </div>
                           ) :
                           item.type === 'matrix' ? (
                             <div>
                               {item.matrixRows.map((row, idx) => (
                                 <div key={idx}>
                                   <strong>{row.rowText}:</strong> {
                                     item.userAnswer?.[idx] !== undefined 
                                       ? item.matrixColumns[item.userAnswer[idx]] 
                                       : 'None'
                                   }
                                 </div>
                               ))}
                             </div>
                           ) : item.userAnswer)
                          : 'Not answered'
                      }</p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Correct answer:</strong> {
                        item.type === 'multiple-choice' ? `${item.correctAnswer}. ${item.options?.[item.correctAnswer.charCodeAt(0)-65]}` :
                        item.type === 'sata' ? (Array.isArray(item.correctAnswer) ? item.correctAnswer.map(l => `${l}. ${item.options?.[l.charCodeAt(0)-65]}`).join('; ') : item.correctAnswer) :
                        item.type === 'fill-blank' ? (item.correctAnswer.includes(';') ? item.correctAnswer.split(';').map(s => s.trim()).join(' or ') : item.correctAnswer) :
                        item.type === 'highlight' ? `"${item.correctAnswer}"` :
                        item.type === 'drag-drop' ? item.correctAnswer?.replace(/\|/g, ' → ') :
                        item.type === 'hotspot' ? `Target: ${item.correctAnswer}` :
                        item.type === 'cloze-dropdown' ? (
                          <div>
                            {Object.entries(item.correctAnswer || {}).map(([key, val]) => (
                              <div key={key}><strong>{key}:</strong> {String(val || '')}</div>
                            ))}
                          </div>
                        ) :
                        item.type === 'matrix' ? (
                          <div>
                            {item.matrixRows.map((row, idx) => (
                              <div key={idx}>
                                <strong>{row.rowText}:</strong> {item.matrixColumns[row.correctColumn]}
                              </div>
                            ))}
                          </div>
                        ) : item.correctAnswer
                      }</p>
                    </div>
                  </div>
                  {item.rationale && (
                    <div className="rationale mt-2">
                      <strong>Rationale:</strong> {item.rationale}
                    </div>
                  )}
                  <span className={`badge ${item.isCorrect ? 'bg-success' : 'bg-danger'}`}>
                    {item.isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Test taking view ---
  const currentQ = questions[currentIndex];

  // Case study split-screen
  if (currentQ?.type === 'case-study') {
    const subQ = currentQ.questions[caseIndex];
    const subQId = subQ._id;
    const dragKey = `${currentQ._id}-${subQId}`;
    const dragList = caseDragItems[dragKey];

    return (
      <div className="test-session case-study-session" style={{ position: 'relative' }}>
        <div className="test-header">
          <div className="d-flex align-items-center">
            <h3 className="mb-0 me-3">Case Study {currentIndex + 1} of {questions.length} – Q{caseIndex + 1}/{currentQ.questions.length}</h3>
          </div>
          <div className="d-flex align-items-center gap-2">
            {settings.timed && <div className="timer">Time left: {formatTime(timeLeft)}</div>}
            <button type="button" className={`btn btn-${isPaused ? 'success' : 'warning'} btn-sm`} onClick={togglePause}>
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>
        </div>

        <div className="case-study-layout row">
          {/* Left panel – patient data */}
          <div className="col-md-5 patient-data-panel">
            <div className="scenario-box p-3 mb-3 bg-light border rounded">
              <h5>Scenario</h5>
              <p>{currentQ.scenario}</p>
            </div>
            {currentQ.sections?.map((section, i) => (
              <div key={i} className="section-box p-3 mb-3 bg-white border rounded">
                <h6>{section.title}</h6>
                <p>{section.content}</p>
              </div>
            ))}
          </div>

          {/* Right panel – current question */}
          <div className="col-md-7 question-panel">
            <div className="question-container">
              <p className="question-text">{subQ.questionText}</p>

              {subQ.type === 'multiple-choice' && (
                <div className="options">
                  {subQ.options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <div
                        key={idx}
                        className={`option ${caseAnswers[subQId] === letter ? 'selected' : ''}`}
                        onClick={() => handleCaseAnswer(subQId, letter)}
                      >
                        <span className="option-letter">{letter}</span>
                        {opt}
                      </div>
                    );
                  })}
                </div>
              )}

              {subQ.type === 'sata' && (
                <div className="options">
                  {subQ.options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const selected = caseAnswers[subQId]?.includes(letter) || false;
                    return (
                      <div
                        key={idx}
                        className={`option ${selected ? 'selected' : ''}`}
                        onClick={() => {
                          const current = caseAnswers[subQId] || [];
                          if (current.includes(letter)) {
                            handleCaseAnswer(subQId, current.filter(l => l !== letter));
                          } else {
                            handleCaseAnswer(subQId, [...current, letter]);
                          }
                        }}
                      >
                        <span className="option-letter">{letter}</span>
                        {opt}
                      </div>
                    );
                  })}
                </div>
              )}

              {subQ.type === 'fill-blank' && (
                <div className="fill-blank-container">
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    placeholder="Type your answer"
                    value={caseAnswers[subQId] || ''}
                    disabled={isPaused}
                    onChange={(e) => handleCaseAnswer(subQId, e.target.value)}
                  />
                  {!hideInProgressAnswerHints && subQ.correctAnswer?.includes(';') && (
                    <small className="text-muted mt-2 d-block">
                      Acceptable answers: {subQ.correctAnswer.split(';').map(s => s.trim()).join(', ')}
                    </small>
                  )}
                </div>
              )}

              {subQ.type === 'highlight' && (
                <div className="highlight-container">
                  <div
                    ref={highlightRef}
                    className="highlight-textarea"
                    style={{ userSelect: 'text' }}
                    onMouseUp={() => captureHighlight(subQId, subQ.highlightStart || 0, subQ.highlightEnd)}
                  >
                    {subQ.questionText}
                  </div>
                  <p className="text-muted mt-2">
                    {subQ.highlightStart !== undefined && subQ.highlightEnd !== undefined ? (
                      <>Select characters {subQ.highlightStart + 1}–{subQ.highlightEnd}.</>
                    ) : (
                      <>Select the correct part of the text.</>
                    )}
                    Selection: <strong>{caseAnswers[subQId] || 'none'}</strong>
                  </p>
                </div>
              )}

              {subQ.type === 'drag-drop' && dragList && (
                <div className="drag-drop-container">
                  <p className="mb-2">Drag into correct order:</p>
                  <div className="drag-list">
                    {dragList.map((item, index) => (
                      <div
                        key={item.id}
                        className="drag-item"
                        draggable
                        onDragStart={(e) => handleCaseDragStart(dragKey, e, index)}
                        onDragOver={handleCaseDragOver}
                        onDrop={(e) => handleCaseDrop(dragKey, e, index)}
                      >
                        {item.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {subQ.type === 'matrix' && (
                <div className="matrix-container">
                  <p className="mb-3">For each item, select the correct option:</p>
                  <table className="matrix-table table table-bordered">
                    <thead>
                      <tr>
                        <th></th>
                        {subQ.matrixColumns.map((col, idx) => (
                          <th key={idx} className="text-center">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subQ.matrixRows.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          <td>{row.rowText}</td>
                          {subQ.matrixColumns.map((col, colIdx) => (
                            <td key={colIdx} className="text-center">
                              <input
                                type="radio"
                                name={`matrix-${subQId}-${rowIdx}`}
                                value={colIdx}
                                disabled={isPaused}
                                checked={caseAnswers[subQId]?.[rowIdx] === colIdx}
                                onChange={() => {
                                  const current = caseAnswers[subQId] || [];
                                  const newAnswers = [...current];
                                  newAnswers[rowIdx] = colIdx;
                                  handleCaseAnswer(subQId, newAnswers);
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {subQ.type === 'hotspot' && (
                <div className="hotspot-container">
                  <p className="mb-2">Click the correct location on the image:</p>
                  <div style={{ position: 'relative', maxWidth: 620 }}>
                    <img
                      src={subQ.hotspotImageUrl}
                      alt="Hotspot question"
                      style={{ width: '100%', borderRadius: 10, border: '1px solid #cbd5e1' }}
                    />
                    {(subQ.hotspotTargets || []).map((target, idx) => {
                      const isSelected = caseAnswers[subQId] === target.id;
                      return (
                        <button
                          key={`${target.id}-${idx}`}
                          type="button"
                          disabled={isPaused}
                          onClick={() => handleCaseAnswer(subQId, target.id)}
                          title={target.label || target.id}
                          style={{
                            position: 'absolute',
                            left: `${target.x}%`,
                            top: `${target.y}%`,
                            width: `${target.radius || 6}%`,
                            height: `${target.radius || 6}%`,
                            minWidth: 22,
                            minHeight: 22,
                            transform: 'translate(-50%, -50%)',
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? '#1d4ed8' : '#334155'}`,
                            background: isSelected ? 'rgba(29,78,216,0.35)' : 'rgba(255,255,255,0.65)',
                            cursor: 'pointer'
                          }}
                        />
                      );
                    })}
                  </div>
                  <p className="text-muted mt-2">Selected: <strong>{caseAnswers[subQId] || 'none'}</strong></p>
                </div>
              )}

              {subQ.type === 'cloze-dropdown' && (
                <div className="cloze-dropdown-container">
                  <p className="mb-2">Select the best answers from the dropdowns:</p>
                  <div className="p-3 border rounded bg-light">
                    {(subQ.clozeTemplate || subQ.questionText || '').split(/(\{\{[^}]+\}\})/g).map((chunk, idx) => {
                      const match = chunk.match(/^\{\{([^}]+)\}\}$/);
                      if (!match) return <span key={`txt-${idx}`}>{chunk}</span>;
                      const key = match[1].trim();
                      const blank = (subQ.clozeBlanks || []).find((b) => b.key === key);
                      const value = caseAnswers[subQId]?.[key] || '';
                      return (
                        <select
                          key={`sel-${key}-${idx}`}
                          className="form-select form-select-sm d-inline-block mx-1"
                          style={{ width: 'auto', minWidth: 170 }}
                          disabled={isPaused}
                          value={value}
                          onChange={(e) => {
                            const current = caseAnswers[subQId] || {};
                            handleCaseAnswer(subQId, { ...current, [key]: e.target.value });
                          }}
                        >
                          <option value="">Select...</option>
                          {(blank?.options || []).map((opt) => (
                            <option key={`${key}-${opt}`} value={opt}>{opt}</option>
                          ))}
                        </select>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="navigation exam-runtime-navigation">
          <button className="btn btn-secondary" onClick={handleExitSession}>
            Exit
          </button>
          <button className="btn btn-secondary" onClick={handlePrev} disabled={isPaused || (currentIndex === 0 && caseIndex === 0)}>
            Previous
          </button>
          <button className="btn btn-primary" onClick={openQuestionNavigator} disabled={isPaused}>
            Navigator
          </button>
          {currentIndex === questions.length - 1 && caseIndex === currentQ.questions.length - 1 ? (
            <button className="btn btn-success" onClick={handleSubmit} disabled={isPaused}>Submit Test</button>
          ) : (
            <button className="btn btn-primary" onClick={handleNext} disabled={isPaused}>Next</button>
          )}
        </div>
        {isPaused && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,6,23,0.55)', backdropFilter: 'blur(3px)', zIndex: 20, display: 'grid', placeItems: 'center', padding: '20px' }}>
            <div style={{ width: 'min(420px, 100%)', background: 'rgba(15,23,42,0.95)', color: '#fff', border: '1px solid rgba(148,163,184,0.28)', borderRadius: '16px', padding: '18px 18px 16px', boxShadow: '0 16px 40px rgba(0,0,0,0.35)' }}>
              <h4 style={{ margin: '0 0 8px' }}>Test Paused</h4>
              <p style={{ margin: '0 0 14px', color: 'rgba(226,232,240,0.9)' }}>
                Your timer is paused and question actions are locked.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-outline-light" onClick={handleExitSession}>Exit Test</button>
                <button type="button" className="btn btn-success" onClick={togglePause}>Resume Test</button>
              </div>
            </div>
          </div>
        )}
        <CalculatorModal show={showCalculator} onClose={() => setShowCalculator(false)} />
      </div>
    );
  }

  // Regular (non-case) question
  return (
    <div className="test-session exam-runtime-skin" style={{ position: 'relative' }}>
      <div className="test-header">
        <div className="d-flex align-items-center">
          <h3 className="mb-0 me-3">Question {currentIndex + 1} of {questions.length}</h3>
        </div>
        <div className="d-flex align-items-center gap-2">
          {settings.timed && <div className="timer">Time left: {formatTime(timeLeft)}</div>}
          <button type="button" className={`btn btn-${isPaused ? 'success' : 'warning'} btn-sm`} onClick={togglePause}>
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>

      <div className="exam-inline-toolbar">
        <button type="button" className="exam-toolbar-btn" onClick={() => setShowCalculator(true)} disabled={isPaused}>
          <i className="fas fa-calculator"></i> Calculator
        </button>
        <button type="button" className="exam-toolbar-btn" onClick={clearCurrentQuestionAnswer} disabled={isPaused}>
          <i className="fas fa-eraser"></i> Clear
        </button>
      </div>

      <div className="question-container exam-runtime-question-panel">
        <p className="question-text">{currentQ.questionText}</p>

        {currentQ.type === 'multiple-choice' && (
          <div className="options">
            {currentQ.options.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              return (
                <div
                  key={idx}
                  className={`option ${answers[currentQ._id] === letter ? 'selected' : ''}`}
                  onClick={() => handleAnswer(currentQ._id, letter)}
                >
                  <span className="option-letter">{letter}</span>
                  {opt}
                </div>
              );
            })}
          </div>
        )}

        {currentQ.type === 'sata' && (
          <div className="options">
            {currentQ.options.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const selected = answers[currentQ._id]?.includes(letter) || false;
              return (
                <div
                  key={idx}
                  className={`option ${selected ? 'selected' : ''}`}
                  onClick={() => {
                    const current = answers[currentQ._id] || [];
                    if (current.includes(letter)) {
                      handleAnswer(currentQ._id, current.filter(l => l !== letter));
                    } else {
                      handleAnswer(currentQ._id, [...current, letter]);
                    }
                  }}
                >
                  <span className="option-letter">{letter}</span>
                  {opt}
                </div>
              );
            })}
          </div>
        )}

        {currentQ.type === 'fill-blank' && (
          <div className="fill-blank-container">
            <input
              type="text"
              className="form-control form-control-lg"
              placeholder="Type your answer"
              value={answers[currentQ._id] || ''}
              disabled={isPaused}
              onChange={(e) => handleAnswer(currentQ._id, e.target.value)}
            />
            {!hideInProgressAnswerHints && currentQ.correctAnswer?.includes(';') && (
              <small className="text-muted mt-2 d-block">
                Acceptable answers: {currentQ.correctAnswer.split(';').map(s => s.trim()).join(', ')}
              </small>
            )}
          </div>
        )}

        {currentQ.type === 'highlight' && (
          <div className="highlight-container">
            <div
              ref={highlightRef}
              className="highlight-textarea"
              style={{ userSelect: 'text' }}
              onMouseUp={() => captureHighlight(currentQ._id, currentQ.highlightStart || 0, currentQ.highlightEnd)}
            >
              {currentQ.questionText}
            </div>
            <p className="text-muted mt-2">
              {currentQ.highlightStart !== undefined && currentQ.highlightEnd !== undefined ? (
                <>Select characters {currentQ.highlightStart + 1}–{currentQ.highlightEnd}.</>
              ) : (
                <>Select the correct part of the text.</>
              )}
              Selection: <strong>{answers[currentQ._id] || 'none'}</strong>
            </p>
          </div>
        )}

        {currentQ.type === 'drag-drop' && (
          <div className="drag-drop-container">
            <p className="mb-2">Drag into correct order:</p>
            <div className="drag-list">
              {dragItems.map((item, index) => (
                <div
                  key={item.id}
                  className="drag-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {currentQ.type === 'matrix' && (
          <div className="matrix-container">
            <p className="mb-3">For each item, select the correct option:</p>
            <table className="matrix-table table table-bordered">
              <thead>
                <tr>
                  <th></th>
                  {currentQ.matrixColumns.map((col, idx) => (
                    <th key={idx} className="text-center">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentQ.matrixRows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td>{row.rowText}</td>
                    {currentQ.matrixColumns.map((col, colIdx) => (
                      <td key={colIdx} className="text-center">
                        <input
                          type="radio"
                          name={`matrix-${currentQ._id}-${rowIdx}`}
                          value={colIdx}
                          disabled={isPaused}
                          checked={answers[currentQ._id]?.[rowIdx] === colIdx}
                          onChange={() => {
                            const current = answers[currentQ._id] || [];
                            const newAnswers = [...current];
                            newAnswers[rowIdx] = colIdx;
                            handleAnswer(currentQ._id, newAnswers);
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="navigation exam-runtime-navigation">
        <button className="btn btn-secondary" onClick={handleExitSession}>
          Exit
        </button>
        <button className="btn btn-secondary" onClick={handlePrev} disabled={isPaused || currentIndex === 0}>
          Previous
        </button>
        <button className="btn btn-primary" onClick={openQuestionNavigator} disabled={isPaused}>
          Navigator
        </button>
        {currentIndex === questions.length - 1 ? (
          <button className="btn btn-success" onClick={handleSubmit} disabled={isPaused}>Submit Test</button>
        ) : (
          <button className="btn btn-primary" onClick={handleNext} disabled={isPaused}>Next</button>
        )}
      </div>
      {isPaused && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,6,23,0.55)', backdropFilter: 'blur(3px)', zIndex: 20, display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div style={{ width: 'min(420px, 100%)', background: 'rgba(15,23,42,0.95)', color: '#fff', border: '1px solid rgba(148,163,184,0.28)', borderRadius: '16px', padding: '18px 18px 16px', boxShadow: '0 16px 40px rgba(0,0,0,0.35)' }}>
            <h4 style={{ margin: '0 0 8px' }}>Test Paused</h4>
            <p style={{ margin: '0 0 14px', color: 'rgba(226,232,240,0.9)' }}>
              Your timer is paused and question actions are locked.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-outline-light" onClick={handleExitSession}>Exit Test</button>
              <button type="button" className="btn btn-success" onClick={togglePause}>Resume Test</button>
            </div>
          </div>
        </div>
      )}
      <CalculatorModal show={showCalculator} onClose={() => setShowCalculator(false)} />
      <div style={{ position: 'fixed', right: 14, bottom: 14, zIndex: 1200 }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setChatOpen((v) => !v)}
          style={{ borderRadius: 999 }}
        >
          <i className="fas fa-comments me-1"></i> Exam Support
        </button>
        {chatOpen && (
          <div style={{ width: 320, maxWidth: '90vw', height: 360, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 12, boxShadow: '0 12px 28px rgba(15,23,42,0.2)', marginTop: 8, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>Live Support Chat</div>
            <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
              {chatLoading && <div className="text-muted small">Loading...</div>}
              {chatMessages.map((m) => {
                const mine = m.senderRole === 'student';
                return (
                  <div key={m._id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
                    <div style={{ maxWidth: '82%', background: mine ? '#dbeafe' : '#f1f5f9', borderRadius: 10, padding: '6px 8px' }}>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{m.senderName || m.senderRole}</div>
                      <div style={{ fontSize: '0.85rem' }}>{m.message}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ borderTop: '1px solid #e2e8f0', padding: 8, display: 'flex', gap: 6 }}>
              <input
                className="form-control form-control-sm"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Type message..."
              />
              <button type="button" className="btn btn-sm btn-primary" onClick={sendChatMessage}>Send</button>
            </div>
          </div>
        )}

        {currentQ.type === 'hotspot' && (
          <div className="hotspot-container">
            <p className="mb-2">Click the correct location on the image:</p>
            <div style={{ position: 'relative', maxWidth: 680 }}>
              <img
                src={currentQ.hotspotImageUrl}
                alt="Hotspot question"
                style={{ width: '100%', borderRadius: 10, border: '1px solid #cbd5e1' }}
              />
              {(currentQ.hotspotTargets || []).map((target, idx) => {
                const isSelected = answers[currentQ._id] === target.id;
                return (
                  <button
                    key={`${target.id}-${idx}`}
                    type="button"
                    disabled={isPaused}
                    onClick={() => handleAnswer(currentQ._id, target.id)}
                    title={target.label || target.id}
                    style={{
                      position: 'absolute',
                      left: `${target.x}%`,
                      top: `${target.y}%`,
                      width: `${target.radius || 6}%`,
                      height: `${target.radius || 6}%`,
                      minWidth: 22,
                      minHeight: 22,
                      transform: 'translate(-50%, -50%)',
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? '#1d4ed8' : '#334155'}`,
                      background: isSelected ? 'rgba(29,78,216,0.35)' : 'rgba(255,255,255,0.65)',
                      cursor: 'pointer'
                    }}
                  />
                );
              })}
            </div>
            <p className="text-muted mt-2">Selected: <strong>{answers[currentQ._id] || 'none'}</strong></p>
          </div>
        )}

        {currentQ.type === 'cloze-dropdown' && (
          <div className="cloze-dropdown-container">
            <p className="mb-2">Select the best answers from the dropdowns:</p>
            <div className="p-3 border rounded bg-light">
              {(currentQ.clozeTemplate || currentQ.questionText || '').split(/(\{\{[^}]+\}\})/g).map((chunk, idx) => {
                const match = chunk.match(/^\{\{([^}]+)\}\}$/);
                if (!match) return <span key={`txt-${idx}`}>{chunk}</span>;
                const key = match[1].trim();
                const blank = (currentQ.clozeBlanks || []).find((b) => b.key === key);
                const value = answers[currentQ._id]?.[key] || '';
                return (
                  <select
                    key={`sel-${key}-${idx}`}
                    className="form-select form-select-sm d-inline-block mx-1"
                    style={{ width: 'auto', minWidth: 170 }}
                    disabled={isPaused}
                    value={value}
                    onChange={(e) => {
                      const current = answers[currentQ._id] || {};
                      handleAnswer(currentQ._id, { ...current, [key]: e.target.value });
                    }}
                  >
                    <option value="">Select...</option>
                    {(blank?.options || []).map((opt) => (
                      <option key={`${key}-${opt}`} value={opt}>{opt}</option>
                    ))}
                  </select>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestSession;


