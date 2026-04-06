import React, { useState, useEffect, useReducer } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { resolveMediaCandidates } from '../utils/imageUpload';

const firstMediaUrl = (rawUrl) => resolveMediaCandidates(rawUrl)[0] || '';

const handleImageFallback = (event) => {
  const target = event.currentTarget;
  const raw = target.getAttribute('data-raw-src') || '';
  const index = Number(target.getAttribute('data-fallback-index') || '0');
  const candidates = resolveMediaCandidates(raw);
  if (index + 1 >= candidates.length) return;
  target.setAttribute('data-fallback-index', String(index + 1));
  target.src = candidates[index + 1];
};

// --- Calculator Reducer and Component (copied from TestSession) ---
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
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="calculator-display">
          <div className="previous-operand">{state.previous} {state.operator}</div>
          <div className="current-operand">{state.current}</div>
        </div>
        <div className="calculator-buttons">
          <button onClick={() => dispatch({ type: 'CLEAR' })}>AC</button>
          <button onClick={() => dispatch({ type: 'CLEAR_ENTRY' })}>C</button>
          <button onClick={() => dispatch({ type: 'OPERATOR', operator: '/' })}>&divide;</button>
          <button onClick={() => dispatch({ type: 'OPERATOR', operator: '*' })}>&times;</button>
          <button onClick={() => dispatch({ type: 'DIGIT', digit: '7' })}>7</button>
          <button onClick={() => dispatch({ type: 'DIGIT', digit: '8' })}>8</button>
          <button onClick={() => dispatch({ type: 'DIGIT', digit: '9' })}>9</button>
          <button onClick={() => dispatch({ type: 'OPERATOR', operator: '-' })}>&minus;</button>
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

// --- Assessment Speedometer Gauge Component (copied from TestSession) ---
const AssessmentGauge = ({ percentage }) => {
  const cx = 100;
  const cy = 90;
  const r = 70;
  const strokeWidth = 18;
  const clampedPct = Math.max(0, Math.min(100, percentage));

  const segments = [
    { start: 0, end: Math.PI * 0.2, color: '#ef4444' },
    { start: Math.PI * 0.2, end: Math.PI * 0.4, color: '#f97316' },
    { start: Math.PI * 0.4, end: Math.PI * 0.6, color: '#eab308' },
    { start: Math.PI * 0.6, end: Math.PI * 0.8, color: '#84cc16' },
    { start: Math.PI * 0.8, end: Math.PI, color: '#22c55e' },
  ];

  const polarToCart = (angle) => ({
    x: cx - r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
  });

  const arcPath = (startAngle, endAngle) => {
    const s = polarToCart(startAngle);
    const e = polarToCart(endAngle);
    return `M ${s.x} ${s.y} A ${r} ${r} 0 0 0 ${e.x} ${e.y}`;
  };

  const getGaugeColor = (p) => {
    if (p < 30) return '#ef4444';
    if (p < 50) return '#f97316';
    if (p < 65) return '#eab308';
    if (p < 80) return '#84cc16';
    return '#22c55e';
  };

  const getLabel = (p) => {
    if (p < 30) return 'Very Low';
    if (p < 50) return 'Low';
    if (p < 65) return 'Moderate';
    if (p < 80) return 'High';
    return 'Very High';
  };

  const needleAngle = (clampedPct / 100) * Math.PI;
  const needleR = r - strokeWidth / 2 - 4;
  const needleTip = {
    x: cx - needleR * Math.cos(needleAngle),
    y: cy - needleR * Math.sin(needleAngle),
  };

  const tickMarks = segments.map((seg) => {
    const tickR1 = r + strokeWidth / 2 + 2;
    const tickR2 = r + strokeWidth / 2 + 6;
    return {
      x1: cx - tickR1 * Math.cos(seg.start),
      y1: cy - tickR1 * Math.sin(seg.start),
      x2: cx - tickR2 * Math.cos(seg.start),
      y2: cy - tickR2 * Math.sin(seg.start),
    };
  });
  const lastTickR1 = r + strokeWidth / 2 + 2;
  const lastTickR2 = r + strokeWidth / 2 + 6;
  tickMarks.push({
    x1: cx - lastTickR1 * Math.cos(Math.PI),
    y1: cy - lastTickR1 * Math.sin(Math.PI),
    x2: cx - lastTickR2 * Math.cos(Math.PI),
    y2: cy - lastTickR2 * Math.sin(Math.PI),
  });

  return (
    <div style={{ textAlign: 'center', padding: '10px 0' }}>
      <svg width="200" height="120" viewBox="0 0 200 120">
        <path d={arcPath(0, Math.PI)} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} strokeLinecap="round" />
        {segments.map((seg, i) => (
          <path key={i} d={arcPath(seg.start + 0.008, seg.end - 0.008)} fill="none" stroke={seg.color} strokeWidth={strokeWidth - 2} strokeLinecap="round" opacity={0.9} />
        ))}
        {tickMarks.map((tick, i) => (
          <line key={i} x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke="#9ca3af" strokeWidth={1.5} strokeLinecap="round" />
        ))}
        <line x1={cx + 1} y1={cy + 1} x2={needleTip.x + 1} y2={needleTip.y + 1} stroke="#00000015" strokeWidth={3} strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y} stroke="#1f2937" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={6} fill="#1f2937" />
        <circle cx={cx} cy={cy} r={3} fill="#fff" />
      </svg>
      <div style={{
        fontSize: '2.25rem',
        fontWeight: 800,
        color: getGaugeColor(clampedPct),
        lineHeight: 1,
        marginTop: '-8px',
      }}>
        {percentage}%
      </div>
      <div style={{
        fontSize: '0.95rem',
        fontWeight: 600,
        color: getGaugeColor(clampedPct),
        marginTop: '6px',
      }}>
        {getLabel(percentage)} Chance of Passing NCLEX
      </div>
    </div>
  );
};

// --- Main CatSession Component ---
const CatSession = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialData = location.state || {};
  const testType = initialData.testType || 'cat';

  // Core state
  const [currentQuestion, setCurrentQuestion] = useState(initialData.question || null);
  const [questionNumber, setQuestionNumber] = useState(initialData.questionNumber || 1);
  const [theta, setTheta] = useState(initialData.theta || 0);
  const [se, setSe] = useState(initialData.se || null);
  const [status, setStatus] = useState('continue');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // showRationale is unused in CAT — rationale shown only in review after exam
  const [isCorrect, setIsCorrect] = useState(null);

  // Timer: 2 minutes per question
  const [timeLeft, setTimeLeft] = useState(120);

  // Answer state for all question types
  const [answer, setAnswer] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [fillBlankAnswer, setFillBlankAnswer] = useState('');
  const [dragSourceItems, setDragSourceItems] = useState([]);
  const [dragAnswerItems, setDragAnswerItems] = useState([]);
  const [matrixAnswers, setMatrixAnswers] = useState([]);
  const [clozeAnswers, setClozeAnswers] = useState({});
  const [hotspotAnswer, setHotspotAnswer] = useState('');
  const [bowtieAnswers, setBowtieAnswers] = useState({});
  const [highlightAnswer, setHighlightAnswer] = useState('');

  // Case study state
  const [caseIndex, setCaseIndex] = useState(0);
  const [caseAnswers, setCaseAnswers] = useState({});
  const [activeCaseTabByQuestion, setActiveCaseTabByQuestion] = useState({});
  const [caseDragSourceItems, setCaseDragSourceItems] = useState({});
  const [caseDragAnswerItems, setCaseDragAnswerItems] = useState({});

  // UI state
  const [showCalculator, setShowCalculator] = useState(false);
  const [markedQuestions, setMarkedQuestions] = useState([]);

  // Block copy/paste during exam
  useEffect(() => {
    const blockEvent = (event) => event.preventDefault();
    const blockShortcuts = (event) => {
      const key = String(event.key || '').toLowerCase();
      const isMod = event.ctrlKey || event.metaKey;
      if (!isMod) return;
      if (['c', 'x', 'a', 'u', 's', 'p'].includes(key)) {
        event.preventDefault();
      }
    };
    document.addEventListener('copy', blockEvent);
    document.addEventListener('cut', blockEvent);
    document.addEventListener('contextmenu', blockEvent);
    document.addEventListener('keydown', blockShortcuts);
    return () => {
      document.removeEventListener('copy', blockEvent);
      document.removeEventListener('cut', blockEvent);
      document.removeEventListener('contextmenu', blockEvent);
      document.removeEventListener('keydown', blockShortcuts);
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (status === 'completed' || loading) return;
    if (timeLeft <= 0) {
      // Auto-submit with no answer when time runs out
      submitAnswerWithCurrent();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, status, loading]);

  // Initialize drag-drop when question changes
  useEffect(() => {
    if (currentQuestion && currentQuestion.type === 'drag-drop') {
      const shuffled = [...currentQuestion.options].sort(() => Math.random() - 0.5);
      const items = shuffled.map((text, idx) => ({ id: `item-${idx}-${Date.now()}`, text }));
      setDragSourceItems(items);
      setDragAnswerItems([]);
    }
  }, [currentQuestion?._id]);

  // Initialize case study drag-drop
  useEffect(() => {
    if (currentQuestion?.type === 'case-study') {
      const subQ = currentQuestion.questions?.[caseIndex];
      if (subQ?.type === 'drag-drop') {
        const key = `${currentQuestion._id}-${subQ._id}`;
        if (!caseDragSourceItems[key]) {
          const shuffled = [...subQ.options].sort(() => Math.random() - 0.5);
          const items = shuffled.map((text, idx) => ({ id: `case-item-${idx}-${Date.now()}`, text }));
          setCaseDragSourceItems(prev => ({ ...prev, [key]: items }));
          setCaseDragAnswerItems(prev => ({ ...prev, [key]: [] }));
        }
      }
    }
  }, [currentQuestion?._id, caseIndex]);

  // Reset answer state when question changes
  useEffect(() => {
    setAnswer(null);
    setSelectedOptions([]);
    setFillBlankAnswer('');
    setMatrixAnswers([]);
    setClozeAnswers({});
    setHotspotAnswer('');
    setBowtieAnswers({});
    setHighlightAnswer('');
    setCaseIndex(0);
    setCaseAnswers({});
    setCaseDragSourceItems({});
    setCaseDragAnswerItems({});
    setActiveCaseTabByQuestion({});
    setTimeLeft(120);
    setError('');
    setIsCorrect(null);
  }, [currentQuestion?._id]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatTheta = (value) => {
    if (value === null || value === undefined || value === Infinity || value === -Infinity) return 'N/A';
    return value.toFixed(2);
  };

  // Get the user's current answer in the format expected by the backend
  const getCurrentUserAnswer = () => {
    if (!currentQuestion) return null;

    if (currentQuestion.type === 'case-study') {
      // For case studies, we need to submit all sub-question answers
      const subQ = currentQuestion.questions[caseIndex];
      if (!subQ) return null;
      return caseAnswers[subQ._id] || null;
    }

    switch (currentQuestion.type) {
      case 'multiple-choice':
      case 'mcq':
        return answer;
      case 'sata':
        return selectedOptions.length > 0 ? selectedOptions : null;
      case 'fill-blank':
        return fillBlankAnswer.trim() || null;
      case 'drag-drop':
        return dragAnswerItems.length > 0 ? dragAnswerItems.map(item => item.text).join('|') : null;
      case 'matrix':
        return matrixAnswers.length > 0 ? matrixAnswers : null;
      case 'hotspot':
        return hotspotAnswer || null;
      case 'cloze-dropdown':
        return Object.keys(clozeAnswers).length > 0 ? clozeAnswers : null;
      case 'bowtie':
        return (bowtieAnswers.actionLeft || bowtieAnswers.actionRight || bowtieAnswers.condition) ? bowtieAnswers : null;
      case 'highlight':
        return highlightAnswer || null;
      default:
        return answer;
    }
  };

  // Check if the current answer is valid for submission
  const hasValidAnswer = () => {
    if (!currentQuestion) return false;

    if (currentQuestion.type === 'case-study') {
      const subQ = currentQuestion.questions[caseIndex];
      if (!subQ) return false;
      return caseAnswers[subQ._id] !== undefined && caseAnswers[subQ._id] !== null;
    }

    const ans = getCurrentUserAnswer();
    if (ans === null || ans === undefined) return false;
    if (typeof ans === 'string' && ans.trim() === '') return false;
    if (Array.isArray(ans) && ans.length === 0) return false;
    if (typeof ans === 'object' && !Array.isArray(ans) && Object.keys(ans).length === 0) return false;
    return true;
  };

  // Submit answer
  const submitAnswerWithCurrent = async () => {
    if (!currentQuestion) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      if (currentQuestion.type === 'case-study') {
        // Submit all sub-question answers for the case study
        const subQ = currentQuestion.questions[caseIndex];
        if (!subQ) return;

        const response = await axios.post('/api/student/cat/answer', {
          questionId: currentQuestion._id,
          answer: caseAnswers[subQ._id] || ''
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        handleCatResponse(response, subQ);
      } else {
        const userAnswer = getCurrentUserAnswer();
        const response = await axios.post('/api/student/cat/answer', {
          questionId: currentQuestion._id,
          answer: userAnswer
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        handleCatResponse(response);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit answer');
      setLoading(false);
    }
  };

  const handleCatResponse = (response, subQ = null) => {
    const question = subQ || currentQuestion;
    const correctAnswer = question.correctAnswer;
    let wasCorrect = false;

    if (question.type === 'sata') {
      const userAns = subQ ? (caseAnswers[subQ._id] || []) : selectedOptions;
      const normalizedUser = (Array.isArray(userAns) ? userAns : [userAns]).map(v => String(v).toUpperCase()).sort();
      const normalizedCorrect = (Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]).map(v => String(v).toUpperCase()).sort();
      wasCorrect = JSON.stringify(normalizedUser) === JSON.stringify(normalizedCorrect);
    } else if (question.type === 'fill-blank') {
      const userAns = subQ ? (caseAnswers[subQ._id] || '') : fillBlankAnswer;
      const acceptable = String(correctAnswer).split(';').map(a => a.trim().toLowerCase());
      wasCorrect = acceptable.includes(String(userAns).trim().toLowerCase());
    } else if (question.type === 'drag-drop') {
      const userAns = subQ
        ? ((caseDragAnswerItems[`${currentQuestion._id}-${subQ._id}`] || []).map(item => item.text).join('|'))
        : dragAnswerItems.map(item => item.text).join('|');
      wasCorrect = userAns === String(correctAnswer);
    } else if (question.type === 'matrix') {
      const userAns = subQ ? (caseAnswers[subQ._id] || []) : matrixAnswers;
      const rows = question.matrixRows || [];
      if (Array.isArray(userAns) && rows.length > 0) {
        wasCorrect = rows.every((row, i) => userAns[i] === row.correctColumn);
      }
    } else if (question.type === 'hotspot') {
      const userAns = subQ ? (caseAnswers[subQ._id] || '') : hotspotAnswer;
      wasCorrect = String(userAns).trim() === String(correctAnswer).trim();
    } else if (question.type === 'cloze-dropdown') {
      const userAns = subQ ? (caseAnswers[subQ._id] || {}) : clozeAnswers;
      if (typeof correctAnswer === 'object' && correctAnswer !== null) {
        wasCorrect = Object.keys(correctAnswer).every(key =>
          String(userAns?.[key] || '').trim() === String(correctAnswer[key] || '').trim()
        );
      }
    } else if (question.type === 'bowtie') {
      const userAns = subQ ? (caseAnswers[subQ._id] || {}) : bowtieAnswers;
      if (typeof correctAnswer === 'object' && typeof userAns === 'object') {
        wasCorrect = ['condition', 'actionLeft', 'actionRight', 'parameterLeft', 'parameterRight'].every(
          key => String(userAns?.[key] || '').trim() === String(correctAnswer?.[key] || '').trim()
        );
      }
    } else if (question.type === 'highlight') {
      const userAns = subQ ? (caseAnswers[subQ._id] || '') : highlightAnswer;
      const correctOptions = String(correctAnswer).split('|').map(a => a.trim().toLowerCase());
      wasCorrect = correctOptions.includes(String(userAns).trim().toLowerCase());
    } else {
      // MCQ
      const userAns = subQ ? (caseAnswers[subQ._id] || '') : answer;
      wasCorrect = String(userAns).toUpperCase() === String(correctAnswer).toUpperCase();
    }

    setIsCorrect(wasCorrect);

    // CAT: no rationale during exam — proceed immediately to next question or review
    if (response.data.status === 'completed') {
      // Skip completion screen — go straight to test review
      if (response.data.result?._id) {
        navigate(`/test-review/${response.data.result._id}`);
      }
      return;
    } else {
      setCurrentQuestion(response.data.question);
      setQuestionNumber(response.data.questionNumber);
      setTheta(response.data.theta);
      setSe(response.data.se);
    }

    setLoading(false);
  };

  const submitAnswer = () => {
    if (loading) return;
    if (!hasValidAnswer()) {
      setError('Please select an answer before submitting.');
      return;
    }
    submitAnswerWithCurrent();
  };

  // Toggle mark for review
  const toggleMarkReview = () => {
    if (!currentQuestion) return;
    const qId = currentQuestion._id;
    setMarkedQuestions(prev =>
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  // Navigation
  const goToDashboard = () => navigate('/dashboard');
  const goToReview = () => {
    if (result?._id) navigate(`/test-review/${result._id}`);
  };

  const handleExitSession = () => {
    const shouldExit = window.confirm('Exit this CAT session? Your progress will be lost.');
    if (shouldExit) navigate('/dashboard');
  };

  // Case study navigation
  const handleCaseNext = () => {
    if (!currentQuestion || currentQuestion.type !== 'case-study') return;
    if (caseIndex < currentQuestion.questions.length - 1) {
      setCaseIndex(caseIndex + 1);
      // Reset sub-question answer state
      setCaseDragSourceItems(prev => {
        const subQ = currentQuestion.questions[caseIndex + 1];
        if (subQ?.type === 'drag-drop') {
          const key = `${currentQuestion._id}-${subQ._id}`;
          if (!prev[key]) {
            const shuffled = [...subQ.options].sort(() => Math.random() - 0.5);
            const items = shuffled.map((text, idx) => ({ id: `case-item-${idx}-${Date.now()}`, text }));
            return { ...prev, [key]: items };
          }
        }
        return prev;
      });
    }
  };

  const handleCasePrev = () => {
    if (!currentQuestion || currentQuestion.type !== 'case-study') return;
    if (caseIndex > 0) {
      setCaseIndex(caseIndex - 1);
    }
  };

  // Drag handlers - Two box system
  const handleDragStart = (e, index, source) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.setData('source', source);
  };
  // handleDragOver used inline below; declared here for clarity
  // const handleDragOver = (e) => e.preventDefault();

  const handleDropToSource = (e) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const fromSource = e.dataTransfer.getData('source');
    if (fromSource === 'answer') {
      const item = dragAnswerItems[dragIndex];
      if (item) {
        setDragSourceItems(prev => [...prev, item]);
        setDragAnswerItems(prev => prev.filter((_, i) => i !== dragIndex));
      }
    }
  };

  const handleDropToAnswer = (e, dropIndex = -1) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const fromSource = e.dataTransfer.getData('source');
    if (fromSource === 'source') {
      const item = dragSourceItems[dragIndex];
      if (item) {
        const newAnswerItems = dropIndex >= 0
          ? [...dragAnswerItems.slice(0, dropIndex), item, ...dragAnswerItems.slice(dropIndex)]
          : [...dragAnswerItems, item];
        setDragAnswerItems(newAnswerItems);
        setDragSourceItems(prev => prev.filter((_, i) => i !== dragIndex));
      }
    } else if (fromSource === 'answer') {
      if (dragIndex === dropIndex) return;
      const newItems = [...dragAnswerItems];
      const [removed] = newItems.splice(dragIndex, 1);
      if (dropIndex >= 0) newItems.splice(dropIndex, 0, removed);
      else newItems.push(removed);
      setDragAnswerItems(newItems);
    }
  };

  // Case study drag handlers
  const handleCaseDragStart = (key, e, index, source) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.setData('dragKey', key);
    e.dataTransfer.setData('source', source);
  };
  // handleCaseDragOver used inline below
  // const handleCaseDragOver = (e) => e.preventDefault();

  const handleCaseDropToSource = (key, e) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const dragKey = e.dataTransfer.getData('dragKey');
    const fromSource = e.dataTransfer.getData('source');
    if (dragKey !== key || fromSource !== 'answer') return;
    const answerItems = caseDragAnswerItems[key] || [];
    const item = answerItems[dragIndex];
    if (item) {
      setCaseDragSourceItems(prev => ({ ...prev, [key]: [...(prev[key] || []), item] }));
      setCaseDragAnswerItems(prev => ({ ...prev, [key]: answerItems.filter((_, i) => i !== dragIndex) }));
      const subQ = currentQuestion.questions[caseIndex];
      if (subQ) {
        const newAnswerItems = answerItems.filter((_, i) => i !== dragIndex);
        setCaseAnswers(prev => ({ ...prev, [subQ._id]: newAnswerItems.map(i => i.text).join('|') }));
      }
    }
  };

  const handleCaseDropToAnswer = (key, e, dropIndex = -1) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const dragKey = e.dataTransfer.getData('dragKey');
    const fromSource = e.dataTransfer.getData('source');
    if (dragKey !== key) return;
    const sourceItems = caseDragSourceItems[key] || [];
    const answerItems = caseDragAnswerItems[key] || [];
    if (fromSource === 'source') {
      const item = sourceItems[dragIndex];
      if (item) {
        const newAnswerItems = dropIndex >= 0
          ? [...answerItems.slice(0, dropIndex), item, ...answerItems.slice(dropIndex)]
          : [...answerItems, item];
        setCaseDragAnswerItems(prev => ({ ...prev, [key]: newAnswerItems }));
        setCaseDragSourceItems(prev => ({ ...prev, [key]: sourceItems.filter((_, i) => i !== dragIndex) }));
        const subQ = currentQuestion.questions[caseIndex];
        if (subQ) {
          setCaseAnswers(prev => ({ ...prev, [subQ._id]: newAnswerItems.map(i => i.text).join('|') }));
        }
      }
    } else if (fromSource === 'answer') {
      if (dragIndex === dropIndex) return;
      const newItems = [...answerItems];
      const [removed] = newItems.splice(dragIndex, 1);
      if (dropIndex >= 0) newItems.splice(dropIndex, 0, removed);
      else newItems.push(removed);
      setCaseDragAnswerItems(prev => ({ ...prev, [key]: newItems }));
      const subQ = currentQuestion.questions[caseIndex];
      if (subQ) {
        setCaseAnswers(prev => ({ ...prev, [subQ._id]: newItems.map(i => i.text).join('|') }));
      }
    }
  };

  // Handle case answer
  const handleCaseAnswer = (subQId, answer) => {
    setCaseAnswers(prev => ({ ...prev, [subQId]: answer }));
  };

  // Get question type label
  const getTypeLabel = (type) => {
    const labels = {
      'multiple-choice': 'Multiple Choice',
      'mcq': 'Multiple Choice',
      'sata': 'Select All That Apply',
      'fill-blank': 'Fill in the Blank',
      'drag-drop': 'Ordered Response',
      'hotspot': 'Hotspot',
      'matrix': 'Matrix',
      'bowtie': 'Bowtie',
      'cloze-dropdown': 'Cloze Dropdown',
      'highlight': 'Highlight',
      'case-study': 'Case Study',
    };
    return labels[type] || type || '';
  };

  // Short question ID
  const getShortId = (id) => {
    if (!id) return '';
    return `Q-${String(id).substring(0, 8)}`;
  };

  // ========================
  // COMPLETED STATE
  // ========================
  if (status === 'completed' && result) {
    const passed = result.passed;
    const earnedPoints = result.earnedPoints ?? result.score ?? 0;
    const totalPoints = result.totalPoints ?? result.totalQuestions ?? 1;
    const percentage = result.percentage || (totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0);
    const isAssessment = testType === 'assessment';
    const correctCount = (result.answers || []).filter(a => a.isCorrect === true).length;
    const incorrectCount = (result.answers || []).filter(a => a.isCorrect !== true).length;
    const partialCount = (result.answers || []).filter(a => a.isCorrect === 'partial').length;

    return (
      <div className="cat-session-container" style={{
        minHeight: '100vh',
        background: isAssessment
          ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
          : passed
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
          maxWidth: isAssessment ? '560px' : '600px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          {/* Assessment: Speedometer Gauge */}
          {isAssessment && (
            <div style={{ marginBottom: '24px' }}>
              <AssessmentGauge percentage={percentage} />
            </div>
          )}

          {/* Non-Assessment: Icon */}
          {!isAssessment && (
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
          )}

          <h1 style={{ fontSize: '28px', marginBottom: '8px', color: passed ? '#059669' : '#dc2626' }}>
            {isAssessment ? 'Assessment Complete' : (passed ? 'PASSED' : 'NOT PASSED')}
          </h1>

          <p style={{ color: '#6b7280', marginBottom: '28px', fontSize: '16px' }}>
            {isAssessment
              ? `${result.totalQuestions} Questions Answered`
              : 'CAT Adaptive Test Complete'}
          </p>

          {/* Points summary */}
          <div style={{ padding: '14px 18px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <i className="fas fa-star" style={{ color: '#f59e0b', fontSize: '0.9rem' }}></i>
            <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '1.1rem' }}>{earnedPoints}</span>
            <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>/</span>
            <span style={{ fontWeight: 600, color: '#6b7280', fontSize: '1.1rem' }}>{totalPoints}</span>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>points</span>
            {partialCount > 0 && (
              <span style={{ marginLeft: '12px', padding: '2px 10px', background: '#fef3c7', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, color: '#92400e' }}>
                {partialCount} partial
              </span>
            )}
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '28px' }}>
            <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
                {earnedPoints}<span style={{ fontSize: '1rem', fontWeight: 500, color: '#94a3b8' }}>/{totalPoints}</span>
              </div>
              <div style={{ color: '#16a34a', marginTop: '4px', fontSize: '0.8rem', fontWeight: 500 }}>Points Earned</div>
            </div>
            <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>
                {Math.max(0, totalPoints - earnedPoints)}
              </div>
              <div style={{ color: '#dc2626', marginTop: '4px', fontSize: '0.8rem', fontWeight: 500 }}>Points Lost</div>
            </div>
            {!isAssessment && (
              <>
                <div style={{ padding: '16px', background: '#f5f3ff', borderRadius: '12px', border: '1px solid #e9d5ff' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#7c3aed' }}>
                    {formatTheta(result.theta)}
                  </div>
                  <div style={{ color: '#7c3aed', marginTop: '4px', fontSize: '0.8rem', fontWeight: 500 }}>Ability (&theta;)</div>
                </div>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6b7280' }}>
                    {formatTheta(result.se)}
                  </div>
                  <div style={{ color: '#6b7280', marginTop: '4px', fontSize: '0.8rem', fontWeight: 500 }}>Std. Error</div>
                </div>
              </>
            )}
            {isAssessment && (
              <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>
                  {percentage}%
                </div>
                <div style={{ color: '#2563eb', marginTop: '4px', fontSize: '0.8rem', fontWeight: 500 }}>Score</div>
              </div>
            )}
          </div>

          {/* Theta/SE for assessment in a secondary row */}
          {isAssessment && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '28px' }}>
              <div style={{ padding: '16px', background: '#f5f3ff', borderRadius: '12px', border: '1px solid #e9d5ff' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#7c3aed' }}>
                  {formatTheta(result.theta)}
                </div>
                <div style={{ color: '#7c3aed', marginTop: '4px', fontSize: '0.8rem', fontWeight: 500 }}>Ability (&theta;)</div>
              </div>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6b7280' }}>
                  {formatTheta(result.se)}
                </div>
                <div style={{ color: '#6b7280', marginTop: '4px', fontSize: '0.8rem', fontWeight: 500 }}>Std. Error</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={goToReview}
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
              Review Answers
            </button>
            <button
              onClick={goToDashboard}
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
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================
  // LOADING STATE
  // ========================
  if (!currentQuestion) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#c9d5dd',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
          <p style={{ marginTop: '12px', fontSize: '1.1rem' }}>Loading CAT session...</p>
        </div>
      </div>
    );
  }

  // ========================
  // Determine if case study
  // ========================
  const isCaseStudy = currentQuestion.type === 'case-study';
  const activeQuestion = isCaseStudy ? currentQuestion.questions?.[caseIndex] : currentQuestion;
  // Get short ID for display
  const shortId = getShortId(currentQuestion._id);
  const isMarked = markedQuestions.includes(currentQuestion._id);

  // ========================
  // RENDER MCQ OPTIONS (shared between case-study sub-questions and regular)
  // ========================
  const renderMCQOptions = (options, questionId, currentAns, isCase) => {
    return (
      <div className="options">
        {options.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isSelected = isCase
            ? (caseAnswers[questionId] === letter)
            : (answer === letter);
          return (
            <div
              key={idx}
              className={`option ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                if (loading) return;
                if (isCase) {
                  handleCaseAnswer(questionId, letter);
                } else {
                  setAnswer(letter);
                }
              }}
            >
              <span className="option-letter">{letter}</span>
              {opt}
            </div>
          );
        })}
      </div>
    );
  };

  // ========================
  // RENDER SATA OPTIONS
  // ========================
  const renderSATAOptions = (options, questionId, isCase) => {
    return (
      <div className="options">
        {options.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const currentArr = isCase ? (caseAnswers[questionId] || []) : selectedOptions;
          const selected = Array.isArray(currentArr) && currentArr.includes(letter);
          return (
            <div
              key={idx}
              className={`option ${selected ? 'selected' : ''}`}
              onClick={() => {
                if (loading) return;
                if (isCase) {
                  const current = caseAnswers[questionId] || [];
                  if (current.includes(letter)) {
                    handleCaseAnswer(questionId, current.filter(l => l !== letter));
                  } else {
                    handleCaseAnswer(questionId, [...current, letter]);
                  }
                } else {
                  setSelectedOptions(prev =>
                    prev.includes(letter)
                      ? prev.filter(k => k !== letter)
                      : [...prev, letter]
                  );
                }
              }}
            >
              <span className="option-letter">{letter}</span>
              {opt}
            </div>
          );
        })}
      </div>
    );
  };

  // ========================
  // RENDER FILL-BLANK
  // ========================
  const renderFillBlank = (q, isCase) => {
    const value = isCase ? (caseAnswers[q._id] || '') : fillBlankAnswer;
    const setter = isCase
      ? (v) => handleCaseAnswer(q._id, v)
      : (e) => setFillBlankAnswer(e.target.value);
    return (
      <div className="fill-blank-container">
        <input
          type="text"
          className="form-control form-control-lg"
          placeholder="Type your answer"
          value={value}
          disabled={loading}
          onChange={setter}
        />
      </div>
    );
  };

  // ========================
  // RENDER HIGHLIGHT
  // ========================
  const renderHighlight = (q, isCase) => {
    const value = isCase ? (caseAnswers[q._id] || '') : highlightAnswer;
    const setter = isCase
      ? (v) => handleCaseAnswer(q._id, v)
      : (v) => setHighlightAnswer(v);
    const words = (q.questionText || '').split(/\s+/).filter(w => w.trim());
    const selectableIndices = q.highlightSelectableWords || [];
    return (
      <div className="highlight-container">
        <p className="text-muted mb-3">
          <i className="fas fa-mouse-pointer me-2"></i>
          Click on the correct word in the sentence below:
        </p>
        <div
          className="highlight-clickable-text"
          style={{
            padding: '20px',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            lineHeight: '2.2',
            fontSize: '16px'
          }}
        >
          {words.map((word, idx) => {
            const isSelectable = selectableIndices.includes(idx);
            const isSelected = value === word || value === String(idx);
            if (!isSelectable) {
              return <span key={idx} style={{ marginRight: '8px' }}>{word}</span>;
            }
            return (
              <span
                key={idx}
                onClick={() => !loading && setter(word)}
                style={{
                  display: 'inline-block',
                  padding: '6px 14px',
                  margin: '4px',
                  borderRadius: '8px',
                  cursor: loading ? 'default' : 'pointer',
                  border: isSelected ? '2px solid #22c55e' : '2px solid #3b82f6',
                  background: isSelected ? '#dcfce7' : '#dbeafe',
                  color: isSelected ? '#166534' : '#1e40af',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                  boxShadow: isSelected ? '0 2px 8px rgba(34, 197, 94, 0.3)' : 'none'
                }}
              >
                {word}
                {isSelected && <i className="fas fa-check ms-2"></i>}
              </span>
            );
          })}
        </div>
        <p className="text-muted mt-3">
          Your selection: <strong style={{ color: value ? '#22c55e' : '#94a3b8' }}>
            {value || 'none selected'}
          </strong>
        </p>
      </div>
    );
  };

  // ========================
  // RENDER DRAG-DROP (Two box system)
  // ========================
  const renderDragDrop = (q, isCase) => {
    const key = isCase ? `${currentQuestion._id}-${q._id}` : 'main';
    const sourceItems = isCase ? (caseDragSourceItems[key] || []) : dragSourceItems;
    const answerItems = isCase ? (caseDragAnswerItems[key] || []) : dragAnswerItems;
    const onDragStartFn = isCase
      ? (e, index, source) => handleCaseDragStart(key, e, index, source)
      : (e, index, source) => handleDragStart(e, index, source);
    const onDropToSourceFn = isCase
      ? (e) => handleCaseDropToSource(key, e)
      : (e) => handleDropToSource(e);
    const onDropToAnswerFn = isCase
      ? (e, dropIndex) => handleCaseDropToAnswer(key, e, dropIndex)
      : (e, dropIndex) => handleDropToAnswer(e, dropIndex);

    return (
      <div className="drag-drop-two-box-container" style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
        {/* Source Box */}
        <div
          className="drag-source-box"
          style={{ flex: 1, minHeight: '120px', padding: '16px', border: '2px dashed #94a3b8', borderRadius: '12px', background: '#f8fafc' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropToSourceFn}
        >
          <p className="mb-2 text-muted" style={{ fontSize: '13px', fontWeight: 600 }}>Available Options</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '40px' }}>
            {sourceItems.length === 0 ? (
              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>All items moved to answer box</span>
            ) : (
              sourceItems.map((item, index) => (
                <div
                  key={item.id}
                  className="drag-item"
                  draggable
                  onDragStart={(e) => onDragStartFn(e, index, 'source')}
                  style={{ padding: '10px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'grab', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', fontSize: '14px' }}
                >
                  {item.text}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Answer Box */}
        <div
          className="drag-answer-box"
          style={{ flex: 1, minHeight: '120px', padding: '16px', border: '2px solid #3b82f6', borderRadius: '12px', background: '#eff6ff' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDropToAnswerFn(e, answerItems.length)}
        >
          <p className="mb-2" style={{ fontSize: '13px', fontWeight: 600, color: '#3b82f6' }}>Your Answer (arrange in order)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '40px' }}>
            {answerItems.length === 0 ? (
              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Drag items here to arrange your answer</span>
            ) : (
              answerItems.map((item, index) => (
                <div
                  key={item.id}
                  className="drag-item"
                  draggable
                  onDragStart={(e) => onDragStartFn(e, index, 'answer')}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDropToAnswerFn(e, index)}
                  style={{ padding: '10px 16px', background: 'white', border: '1px solid #3b82f6', borderRadius: '8px', cursor: 'grab', boxShadow: '0 2px 6px rgba(59,130,246,0.2)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>
                    {index + 1}
                  </span>
                  {item.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // ========================
  // RENDER MATRIX
  // ========================
  const renderMatrix = (q, isCase) => {
    const currentMatrixAns = isCase ? (caseAnswers[q._id] || []) : matrixAnswers;
    const setter = isCase
      ? (newAnswers) => handleCaseAnswer(q._id, newAnswers)
      : (newAnswers) => setMatrixAnswers(newAnswers);
    return (
      <div className="matrix-container">
        <p className="mb-3">For each item, select the correct option:</p>
        <table className="matrix-table table table-bordered">
          <thead>
            <tr>
              <th></th>
              {(q.matrixColumns || []).map((col, idx) => (
                <th key={idx} className="text-center">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(q.matrixRows || []).map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td>{row.rowText}</td>
                {(q.matrixColumns || []).map((col, colIdx) => (
                  <td key={colIdx} className="text-center">
                    <input
                      type="radio"
                      name={`matrix-${q._id}-${rowIdx}`}
                      value={colIdx}
                      disabled={loading}
                      checked={currentMatrixAns[rowIdx] === colIdx}
                      onChange={() => {
                        const newAnswers = [...currentMatrixAns];
                        newAnswers[rowIdx] = colIdx;
                        setter(newAnswers);
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ========================
  // RENDER HOTSPOT
  // ========================
  const renderHotspot = (q, isCase) => {
    const value = isCase ? (caseAnswers[q._id] || '') : hotspotAnswer;
    const setter = isCase
      ? (v) => handleCaseAnswer(q._id, v)
      : (v) => setHotspotAnswer(v);
    return (
      <div className="hotspot-container">
        <p className="mb-2">Click the correct location on the image:</p>
        <div style={{ position: 'relative', maxWidth: 620 }}>
          <img
            src={firstMediaUrl(q.hotspotImageUrl)}
            data-raw-src={q.hotspotImageUrl}
            data-fallback-index="0"
            onError={handleImageFallback}
            alt="Hotspot question"
            style={{ width: '100%', borderRadius: 10, border: '1px solid #cbd5e1' }}
          />
          {(q.hotspotTargets || []).map((target, idx) => {
            const isSelected = value === target.id;
            return (
              <button
                key={`${target.id}-${idx}`}
                type="button"
                disabled={loading}
                onClick={() => setter(target.id)}
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
        <p className="text-muted mt-2">Selected: <strong>{value || 'none'}</strong></p>
      </div>
    );
  };

  // ========================
  // RENDER CLOZE DROPDOWN
  // ========================
  const renderClozeDropdown = (q, isCase) => {
    const currentCloze = isCase ? (caseAnswers[q._id] || {}) : clozeAnswers;
    const setter = isCase
      ? (newVal) => handleCaseAnswer(q._id, newVal)
      : (newVal) => setClozeAnswers(newVal);
    return (
      <div className="cloze-dropdown-container">
        <p className="mb-2">Select the best answers from the dropdowns:</p>
        <div className="p-3 border rounded bg-light">
          {(q.clozeTemplate || q.questionText || '').split(/(\{\{[^}]+\}\})/g).map((chunk, idx) => {
            const match = chunk.match(/^\{\{([^}]+)\}\}$/);
            if (!match) return <span key={`txt-${idx}`}>{chunk}</span>;
            const key = match[1].trim();
            const blank = (q.clozeBlanks || []).find((b) => b.key === key);
            const value = currentCloze[key] || '';
            return (
              <select
                key={`sel-${key}-${idx}`}
                className="form-select form-select-sm d-inline-block mx-1"
                style={{ width: 'auto', minWidth: 170 }}
                disabled={loading}
                value={value}
                onChange={(e) => {
                  const current = { ...currentCloze };
                  current[key] = e.target.value;
                  setter(current);
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
    );
  };

  // ========================
  // RENDER BOWTIE
  // ========================
  const renderBowtie = (q, isCase) => {
    const currentBowtie = isCase ? (caseAnswers[q._id] || {}) : bowtieAnswers;
    const setter = isCase
      ? (newVal) => handleCaseAnswer(q._id, newVal)
      : (newVal) => setBowtieAnswers(newVal);
    const updateField = (field, value) => {
      setter({ ...currentBowtie, [field]: value });
    };
    return (
      <div className="bowtie-container">
        <div className="bowtie-diagram">
          {/* Top row - Actions */}
          <div className="bowtie-row bowtie-top">
            <div className="bowtie-cell bowtie-action">
              <label className="bowtie-label">Action to Take</label>
              <select
                className="form-control"
                value={currentBowtie.actionLeft || ''}
                disabled={loading}
                onChange={(e) => updateField('actionLeft', e.target.value)}
              >
                <option value="">Select Action</option>
                {(q.bowtieActions || []).filter(Boolean).map((opt) => (
                  <option key={`al-${opt}`} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="bowtie-cell bowtie-action">
              <label className="bowtie-label">Action to Take</label>
              <select
                className="form-control"
                value={currentBowtie.actionRight || ''}
                disabled={loading}
                onChange={(e) => updateField('actionRight', e.target.value)}
              >
                <option value="">Select Action</option>
                {(q.bowtieActions || []).filter(Boolean).map((opt) => (
                  <option key={`ar-${opt}`} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bowtie-connector">
            <div className="bowtie-line bowtie-line-left"></div>
            <div className="bowtie-line bowtie-line-right"></div>
          </div>

          {/* Center - Condition */}
          <div className="bowtie-center">
            <div className="bowtie-condition-box">
              <label className="bowtie-label-center">Potential Condition</label>
              <select
                className="form-control"
                value={currentBowtie.condition || ''}
                disabled={loading}
                onChange={(e) => updateField('condition', e.target.value)}
              >
                <option value="">Select Condition</option>
                {(q.bowtieCondition || []).filter(Boolean).map((opt) => (
                  <option key={`c-${opt}`} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bowtie-connector bowtie-connector-bottom">
            <div className="bowtie-line bowtie-line-left"></div>
            <div className="bowtie-line bowtie-line-right"></div>
          </div>

          {/* Bottom row - Parameters */}
          <div className="bowtie-row bowtie-bottom">
            <div className="bowtie-cell bowtie-parameter">
              <label className="bowtie-label">Parameter to Monitor</label>
              <select
                className="form-control"
                value={currentBowtie.parameterLeft || ''}
                disabled={loading}
                onChange={(e) => updateField('parameterLeft', e.target.value)}
              >
                <option value="">Select Parameter</option>
                {(q.bowtieParameters || []).filter(Boolean).map((opt) => (
                  <option key={`pl-${opt}`} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="bowtie-cell bowtie-parameter">
              <label className="bowtie-label">Parameter to Monitor</label>
              <select
                className="form-control"
                value={currentBowtie.parameterRight || ''}
                disabled={loading}
                onChange={(e) => updateField('parameterRight', e.target.value)}
              >
                <option value="">Select Parameter</option>
                {(q.bowtieParameters || []).filter(Boolean).map((opt) => (
                  <option key={`pr-${opt}`} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ========================
  // RENDER QUESTION CONTENT (dispatches to appropriate renderer)
  // ========================
  const renderQuestionContent = (q, isCase = false) => {
    if (!q) return null;
    switch (q.type) {
      case 'multiple-choice':
      case 'mcq':
        return renderMCQOptions(q.options, q._id, answer, isCase);
      case 'sata':
        return renderSATAOptions(q.options, q._id, isCase);
      case 'fill-blank':
        return renderFillBlank(q, isCase);
      case 'highlight':
        return renderHighlight(q, isCase);
      case 'drag-drop':
        return renderDragDrop(q, isCase);
      case 'matrix':
        return renderMatrix(q, isCase);
      case 'hotspot':
        return renderHotspot(q, isCase);
      case 'cloze-dropdown':
        return renderClozeDropdown(q, isCase);
      case 'bowtie':
        return renderBowtie(q, isCase);
      default:
        // Fallback: try MCQ if options exist
        if (q.options && q.options.length > 0) {
          return renderMCQOptions(q.options, q._id, answer, isCase);
        }
        return <p style={{ color: '#6b7280' }}>Unsupported question type: {q.type}</p>;
    }
  };

  // ========================
  // PROGRESS BAR
  // ========================
  const progressPercent = Math.min(100, Math.round((questionNumber / 150) * 100));

  // ========================
  // CASE STUDY LAYOUT
  // ========================
  if (isCaseStudy && activeQuestion) {
    const subQ = activeQuestion;
    const subQId = subQ._id;
    const visibleSections = (currentQuestion.sections || []).filter((section, index) => {
      const sectionId = section?.sectionId || `section-${index + 1}`;
      const allowed = Array.isArray(subQ?.visibleSectionIds) ? subQ.visibleSectionIds : [];
      return allowed.length === 0 || allowed.includes(sectionId);
    });
    const activeCaseTab = activeCaseTabByQuestion[subQId] || 'scenario';

    return (
      <div className="test-session case-study-session app-no-copy exam-runtime-skin" style={{ position: 'relative' }}>
        {/* Header */}
        <div className="test-header">
          <div className="d-flex align-items-center">
            <h3 className="mb-0 me-3">
              Case Study &ndash; Q{caseIndex + 1}/{currentQuestion.questions.length}
            </h3>
            <span className="badge bg-light text-dark" style={{ fontSize: '0.75rem' }}>
              {shortId}
            </span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div className="timer" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              <i className="fas fa-clock me-1"></i>{formatTime(timeLeft)}
            </div>
            {isMarked && (
              <span style={{ color: '#fbbf24', fontSize: '1.1rem' }} title="Marked for review">
                <i className="fas fa-flag"></i>
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          background: '#0d5a8e',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            Question {questionNumber}/85 (min)
          </span>
          <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', background: '#34d399', borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
            &theta;={formatTheta(theta)} SE={formatTheta(se)}
          </span>
        </div>

        {/* Case study layout */}
        <div className="case-study-layout row">
          {/* Left panel - patient data */}
          <div className="col-md-5 patient-data-panel">
            <div className="case-study-section-header">
              <span className="patient-info-label">Patient Info</span>
            </div>
            {visibleSections.length > 0 && (
              <div className="case-study-tabs d-flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  className={`btn btn-sm ${activeCaseTab === 'scenario' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setActiveCaseTabByQuestion(prev => ({ ...prev, [subQId]: 'scenario' }))}
                >
                  Scenario
                </button>
                {visibleSections.map((section, index) => {
                  const sectionId = section?.sectionId || `section-${index + 1}`;
                  return (
                    <button
                      key={sectionId}
                      type="button"
                      className={`btn btn-sm ${activeCaseTab === sectionId ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setActiveCaseTabByQuestion(prev => ({ ...prev, [subQId]: sectionId }))}
                    >
                      {section.title}
                    </button>
                  );
                })}
              </div>
            )}
            {activeCaseTab === 'scenario' ? (
              <div className="scenario-box p-3 mb-3 bg-light border rounded">
                <h5>Scenario</h5>
                <p>{currentQuestion.scenario}</p>
              </div>
            ) : (() => {
              const selectedSection = visibleSections.find((section, index) => {
                const sectionId = section?.sectionId || `section-${index + 1}`;
                return sectionId === activeCaseTab;
              });
              return selectedSection ? (
                <div className="section-box p-3 mb-3 bg-white border rounded">
                  <h6>{selectedSection.title}</h6>
                  <p>{selectedSection.content}</p>
                </div>
              ) : (
                <div className="scenario-box p-3 mb-3 bg-light border rounded">
                  <h5>Scenario</h5>
                  <p>{currentQuestion.scenario}</p>
                </div>
              );
            })()}
          </div>

          {/* Right panel - current question */}
          <div className="col-md-7 question-panel">
            <div className="question-container">
              {/* Question ID & type */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>{getShortId(subQ._id)}</span>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>{getTypeLabel(subQ.type)}</span>
              </div>
              <p className="question-text">{subQ.questionText}</p>
              {subQ.questionImageUrl && (
                <div className="mb-3">
                  <img
                    src={firstMediaUrl(subQ.questionImageUrl)}
                    data-raw-src={subQ.questionImageUrl}
                    data-fallback-index="0"
                    onError={handleImageFallback}
                    alt="Question visual"
                    style={{ maxWidth: '420px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              )}
              {renderQuestionContent(subQ, true)}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="alert alert-danger" style={{ margin: '0 16px 16px' }}>{error}</div>
        )}

        {/* Navigation */}
        <div className="navigation exam-runtime-navigation">
          <button className="btn btn-secondary" onClick={handleExitSession}>
            <i className="fas fa-sign-out-alt me-1"></i> Exit
          </button>
          <button
            className="btn btn-secondary"
            onClick={toggleMarkReview}
            title={isMarked ? 'Remove mark' : 'Mark for review'}
            style={isMarked ? { color: '#fbbf24' } : {}}
          >
            <i className={`fas fa-flag${isMarked ? '' : ' me-1'}`}></i> {isMarked ? 'Marked' : 'Mark'}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowCalculator(true)} disabled={loading}>
            <i className="fas fa-calculator me-1"></i> Calculator
          </button>
          {caseIndex > 0 && (
            <button className="btn btn-secondary" onClick={handleCasePrev} disabled={loading}>
              <i className="fas fa-arrow-left me-1"></i> Prev Sub-Q
            </button>
          )}
          {caseIndex < currentQuestion.questions.length - 1 ? (
            <button className="btn btn-primary" onClick={handleCaseNext} disabled={loading}>
              Next Sub-Q <i className="fas fa-arrow-right ms-1"></i>
            </button>
          ) : (
            <button className="btn btn-success" onClick={submitAnswer} disabled={loading || !hasValidAnswer()}>
              <i className="fas fa-arrow-right me-1"></i> Next
            </button>
          )}
        </div>

        <CalculatorModal show={showCalculator} onClose={() => setShowCalculator(false)} />
      </div>
    );
  }

  // ========================
  // REGULAR (non-case-study) QUESTION LAYOUT
  // ========================
  return (
    <div className="test-session app-no-copy exam-runtime-skin" style={{ position: 'relative' }}>
      {/* Header */}
      <div className="test-header">
        <div className="d-flex align-items-center">
          <h3 className="mb-0 me-3">
            Question {questionNumber}
          </h3>
          <span className="badge bg-light text-dark" style={{ fontSize: '0.75rem' }}>
            {getTypeLabel(currentQuestion.type)}
          </span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="timer" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
            <i className="fas fa-clock me-1"></i>{formatTime(timeLeft)}
          </div>
          {isMarked && (
            <span style={{ color: '#fbbf24', fontSize: '1.1rem' }} title="Marked for review">
              <i className="fas fa-flag"></i>
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        background: '#0d5a8e',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
          Question {questionNumber}/85 (min)
        </span>
        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${progressPercent}%`, height: '100%', background: '#34d399', borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
          &theta;={formatTheta(theta)} SE={formatTheta(se)}
        </span>
      </div>

      {/* Toolbar */}
      <div className="exam-inline-toolbar">
        <button type="button" className="exam-toolbar-btn" onClick={() => setShowCalculator(true)} disabled={loading}>
          <i className="fas fa-calculator"></i> Calculator
        </button>
        <button type="button" className="exam-toolbar-btn" onClick={toggleMarkReview} disabled={loading}
          style={isMarked ? { color: '#fbbf24' } : {}}>
          <i className="fas fa-flag"></i> {isMarked ? 'Marked' : 'Mark for Review'}
        </button>
      </div>

      {/* Question Content */}
      <div className="question-container exam-runtime-question-panel">
        {/* Question ID (top-right corner, muted) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>{shortId}</span>
        </div>

        <p className="question-text">{currentQuestion.questionText}</p>
        {currentQuestion.questionImageUrl && (
          <div className="mb-3">
            <img
              src={firstMediaUrl(currentQuestion.questionImageUrl)}
              data-raw-src={currentQuestion.questionImageUrl}
              data-fallback-index="0"
              onError={handleImageFallback}
              alt="Question visual"
              style={{ maxWidth: '420px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>
        )}

        {renderQuestionContent(currentQuestion, false)}
      </div>

      {/* Error message */}
      {error && (
        <div className="alert alert-danger" style={{ margin: '0', borderRadius: 0 }}>{error}</div>
      )}

      {/* Navigation - NO Previous, NO Navigator, NO Submit Test */}
      <div className="navigation exam-runtime-navigation">
        <button className="btn btn-secondary" onClick={handleExitSession}>
          <i className="fas fa-sign-out-alt me-1"></i> Exit
        </button>
        <button
          className="btn btn-success"
          onClick={submitAnswer}
          disabled={loading || !hasValidAnswer()}
        >
          {loading ? (
            <>
              <i className="fas fa-spinner fa-spin me-1"></i> Processing...
            </>
          ) : (
            <>
              <i className="fas fa-arrow-right me-1"></i> Next
            </>
          )}
        </button>
      </div>

      <CalculatorModal show={showCalculator} onClose={() => setShowCalculator(false)} />
    </div>
  );
};

export default CatSession;
