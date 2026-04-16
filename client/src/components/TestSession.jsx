import React, { useState, useEffect, useRef, useReducer, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { resolveMediaCandidates } from '../utils/imageUpload';

ChartJS.register(ArcElement, Tooltip, Legend);

// Use shared utility for consistent image URL resolution
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

// --- Assessment Speedometer Gauge Component ---
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

  // polarToCart: angle 0 = left, π/2 = top, π = right
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

  // Needle calculation
  const needleAngle = (clampedPct / 100) * Math.PI;
  const needleR = r - strokeWidth / 2 - 4;
  const needleTip = {
    x: cx - needleR * Math.cos(needleAngle),
    y: cy - needleR * Math.sin(needleAngle),
  };

  // Segment boundary tick marks
  const tickMarks = segments.map((seg) => {
    const tickR1 = r + strokeWidth / 2 + 2;
    const tickR2 = r + strokeWidth / 2 + 6;
    const pt1 = {
      x: cx - tickR1 * Math.cos(seg.start),
      y: cy - tickR1 * Math.sin(seg.start),
    };
    const pt2 = {
      x: cx - tickR2 * Math.cos(seg.start),
      y: cy - tickR2 * Math.sin(seg.start),
    };
    return { x1: pt1.x, y1: pt1.y, x2: pt2.x, y2: pt2.y };
  });
  // Add last boundary
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
        {/* Background track */}
        <path
          d={arcPath(0, Math.PI)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Colored segments */}
        {segments.map((seg, i) => (
          <path
            key={i}
            d={arcPath(seg.start + 0.008, seg.end - 0.008)}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth - 2}
            strokeLinecap="round"
            opacity={0.9}
          />
        ))}
        {/* Tick marks at boundaries */}
        {tickMarks.map((tick, i) => (
          <line
            key={i}
            x1={tick.x1} y1={tick.y1}
            x2={tick.x2} y2={tick.y2}
            stroke="#9ca3af"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        ))}
        {/* Needle shadow */}
        <line
          x1={cx + 1} y1={cy + 1}
          x2={needleTip.x + 1} y2={needleTip.y + 1}
          stroke="#00000015"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={needleTip.x} y2={needleTip.y}
          stroke="#1f2937"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {/* Center cap */}
        <circle cx={cx} cy={cy} r={6} fill="#1f2937" />
        <circle cx={cx} cy={cy} r={3} fill="#fff" />
      </svg>
      {/* Score percentage */}
      <div style={{
        fontSize: '2.25rem',
        fontWeight: 800,
        color: getGaugeColor(clampedPct),
        lineHeight: 1,
        marginTop: '-8px',
      }}>
        {percentage}%
      </div>
      {/* Category label */}
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

// --- Main TestSession Component ---
const TestSession = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // --- Pause/Resume Persistence: check localStorage for saved state ---
  const [restoredState, setRestoredState] = useState(() => {
    // If a new test is being started (location.state has questions), don't restore
    if (location.state?.questions?.length > 0) {
      localStorage.removeItem('nclex-test-session-state');
      return null;
    }
    try {
      const saved = localStorage.getItem('nclex-test-session-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only restore if saved within 24 hours
        if (parsed.savedAt && (Date.now() - parsed.savedAt) < 24 * 60 * 60 * 1000) {
          return parsed;
        }
        localStorage.removeItem('nclex-test-session-state');
      }
    } catch (e) {
      console.warn('Failed to restore test state:', e);
    }
    return null;
  });

  const locationQuestions = location.state?.questions || [];
  const locationSettings = location.state?.settings || {};
  const locationTestType = location.state?.testType;

  // Use restored state if available and no new test was explicitly started
  const questions = restoredState?.questions?.length ? restoredState.questions : locationQuestions;
  const settings = restoredState?.settings || locationSettings;
  const testType = restoredState?.testType || locationTestType;
  const dashboardReturnPath = restoredState?.dashboardReturnPath || settings?.returnTo || '/dashboard';
  const [currentIndex, setCurrentIndex] = useState(restoredState?.currentIndex || 0);
  const [answers, setAnswers] = useState(restoredState?.answers || {});
  // Timer: 85 seconds per question
  const [timeLeft, setTimeLeft] = useState(() => {
    if (restoredState?.timeLeft !== undefined && restoredState?.timeLeft !== null) {
      return restoredState.timeLeft;
    }
    return settings.timed ? settings.totalQuestions * 85 : null;
  });
  // Per-question time tracking
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [questionTimeSpent, setQuestionTimeSpent] = useState(restoredState?.questionTimeSpent || {});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState([]);
  const [submittedResultId, setSubmittedResultId] = useState('');
  const [submitReviewError, setSubmitReviewError] = useState('');
  const [showReview] = useState(false);
  const [filter] = useState('all');
  const [markedQuestions, setMarkedQuestions] = useState(restoredState?.markedQuestions || {});
  const [showCalculator, setShowCalculator] = useState(false);
  const [showNavigatorModal, setShowNavigatorModal] = useState(false);
  const [activeCaseTabByQuestion, setActiveCaseTabByQuestion] = useState(restoredState?.activeCaseTabByQuestion || {});
  const [isBooting, setIsBooting] = useState(!restoredState);
  const [bootProgress, setBootProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState(restoredState?.chatMessages || []);
  const [chatText, setChatText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  // Case study state
  const [caseIndex, setCaseIndex] = useState(restoredState?.caseIndex || 0);
  const [caseAnswers, setCaseAnswers] = useState(restoredState?.caseAnswers || {});

  // Highlight ref
  const highlightRef = useRef(null);

  // Drag & drop state (non‑case) - Two box system
  const [dragSourceItems, setDragSourceItems] = useState(restoredState?.dragSourceItems || []); // Display box
  const [dragAnswerItems, setDragAnswerItems] = useState(restoredState?.dragAnswerItems || []);  // Answer arrangement box
  const [dragItems, setDragItems] = useState([]); // Legacy - kept for compatibility
  const [caseDragItems, setCaseDragItems] = useState({});
  const [caseDragSourceItems, setCaseDragSourceItems] = useState(restoredState?.caseDragSourceItems || {});
  const [caseDragAnswerItems, setCaseDragAnswerItems] = useState(restoredState?.caseDragAnswerItems || {});
  const hideInProgressAnswerHints = Boolean(settings?.tutorMode || settings?.timed);

  // Tutor mode: track which questions have been revealed (show rationale after answering)
  const [tutorRevealed, setTutorRevealed] = useState(restoredState?.tutorRevealed || {});

  const revealTutorQuestion = (qId) => {
    if (settings?.tutorMode) {
      setTutorRevealed(prev => ({ ...prev, [qId]: true }));
    }
  };

  // Helper: check if a tutor-mode answer is correct (for MCQ/SATA)
  const normalizeToLetter = (val) => {
    if (!val) return '';
    const s = String(val).trim().toUpperCase();
    if (/^[A-Z]$/.test(s)) return s;
    const n = parseInt(s, 10);
    if (n >= 1 && n <= 26) return String.fromCharCode(64 + n);
    return s;
  };

  const isTutorCorrect = (q, userAnswer, answerKey) => {
    if (!q || userAnswer === undefined || userAnswer === null) return null;
    const type = q.type;
    const correct = q.correctAnswer;
    if (type === 'multiple-choice' || type === 'highlight' || type === 'hotspot' || type === 'drag-drop' || type === 'fill-blank') {
      const normUser = normalizeToLetter(userAnswer);
      const normCorrect = normalizeToLetter(correct);
      if (type === 'fill-blank') {
        const acceptable = String(correct).split(';').map(a => a.trim().toLowerCase());
        return acceptable.includes(String(userAnswer).trim().toLowerCase());
      }
      return normUser === normCorrect && normUser !== '';
    }
    if (type === 'sata') {
      const parseArr = (v) => {
        if (Array.isArray(v)) return v.map(x => normalizeToLetter(x)).filter(Boolean);
        const s = String(v);
        if (s.includes(',')) return s.split(',').map(x => normalizeToLetter(x.trim())).filter(Boolean);
        if (/^[A-Za-z]+$/.test(s)) return s.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
        return [normalizeToLetter(v)].filter(Boolean);
      };
      const userArr = [...new Set(parseArr(userAnswer))];
      const correctArr = [...new Set(parseArr(correct))];
      const wrongPicked = userArr.filter(c => !correctArr.includes(c));
      if (wrongPicked.length > 0) return false;
      if (userArr.length === correctArr.length && correctArr.length > 0) return true;
      if (userArr.length > 0) return 'partial';
      return false;
    }
    if (type === 'matrix') {
      if (!Array.isArray(userAnswer) || !q.matrixRows?.length) return false;
      let totalCorrect = 0;
      let totalCells = 0;
      for (let i = 0; i < q.matrixRows.length; i++) {
        const row = q.matrixRows[i];
        let correctCols = [];
        if (Array.isArray(row.correctColumns) && row.correctColumns.length > 0) {
          correctCols = row.correctColumns;
        } else if (row.correctColumn !== undefined && row.correctColumn !== null) {
          correctCols = [row.correctColumn];
        }
        totalCells += correctCols.length;
        const userCols = Array.isArray(userAnswer[i]) ? userAnswer[i] : (userAnswer[i] !== undefined ? [userAnswer[i]] : []);
        totalCorrect += userCols.filter(c => correctCols.includes(c)).length;
      }
      if (totalCorrect === totalCells && totalCells > 0) return true;
      if (totalCorrect > 0) return 'partial';
      return false;
    }
    return null;
  };

  // Tutor rationale box component
  const TutorRationale = ({ q, revealed }) => {
    if (!settings?.tutorMode || !revealed || !q) return null;
    const answerVal = (q._id === (currentQ?.questions?.[caseIndex])?._id)
      ? caseAnswers[q._id] || answers[q._id]
      : answers[q._id] || caseAnswers[q._id];
    if (answerVal === undefined || answerVal === null || answerVal === '' || (Array.isArray(answerVal) && answerVal.length === 0)) return null;
    const correct = isTutorCorrect(q, answerVal, q.correctAnswer);
    const correctLetter = normalizeToLetter(q.correctAnswer);
    let correctText = correctLetter;
    if (q.type === 'sata' && q.correctAnswer) {
      const parseArr = (v) => {
        if (Array.isArray(v)) return v.map(x => normalizeToLetter(x)).filter(Boolean);
        const s = String(v);
        if (s.includes(',')) return s.split(',').map(x => normalizeToLetter(x.trim())).filter(Boolean);
        if (/^[A-Za-z]+$/.test(s)) return s.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
        return [normalizeToLetter(v)].filter(Boolean);
      };
      correctText = [...new Set(parseArr(q.correctAnswer))].sort().join(', ');
    }
    if (q.type === 'fill-blank') {
      correctText = q.correctAnswer;
    }
    return (
      <div style={{
        marginTop: '12px',
        padding: '12px 16px',
        borderRadius: '10px',
        border: `2px solid ${correct === true ? '#22c55e' : correct === 'partial' ? '#f59e0b' : '#ef4444'}`,
        background: correct === true ? '#f0fdf4' : correct === 'partial' ? '#fffbeb' : '#fef2f2',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: q.rationale ? '8px' : '0' }}>
          <i className={`fas ${correct === true ? 'fa-check-circle' : correct === 'partial' ? 'fa-exclamation-circle' : 'fa-times-circle'}`}
            style={{ fontSize: '1.1rem', color: correct === true ? '#16a34a' : correct === 'partial' ? '#d97706' : '#dc2626' }} />
          <strong style={{ color: correct === true ? '#166534' : correct === 'partial' ? '#92400e' : '#991b1b' }}>
            {correct === true ? 'Correct!' : correct === 'partial' ? 'Partially Correct' : 'Incorrect'}
          </strong>
          <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: 'auto' }}>
            Correct answer: <strong>{correctText}</strong>
          </span>
        </div>
        {q.rationale && (
          <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.5', borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
            <strong>Rationale:</strong> {q.rationale}
          </div>
        )}
      </div>
    );
  };

  // Reset question start time when question changes
  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIndex, caseIndex]);

  useEffect(() => {
    const blockEvent = (event) => {
      event.preventDefault();
    };

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

  // --- Pause/Resume: Save test state to localStorage when paused ---
  useEffect(() => {
    if (isPaused && !submitted && questions.length > 0) {
      const stateToSave = {
        questions, settings, testType,
        currentIndex, answers, timeLeft,
        questionTimeSpent, markedQuestions,
        caseIndex, caseAnswers,
        activeCaseTabByQuestion, tutorRevealed,
        dragSourceItems, dragAnswerItems,
        caseDragSourceItems, caseDragAnswerItems,
        chatMessages,
        savedAt: Date.now(),
        dashboardReturnPath
      };
      try {
        localStorage.setItem('nclex-test-session-state', JSON.stringify(stateToSave));
      } catch (e) {
        console.warn('Failed to save test state:', e);
      }
    }
  }, [isPaused, submitted, questions.length, currentIndex, answers, timeLeft,
      questionTimeSpent, markedQuestions, caseIndex, caseAnswers,
      activeCaseTabByQuestion, tutorRevealed, dragSourceItems, dragAnswerItems,
      caseDragSourceItems, caseDragAnswerItems, chatMessages, settings, testType, dashboardReturnPath]);

  // --- Pause/Resume: Clear saved state when test is submitted ---
  useEffect(() => {
    if (submitted) {
      localStorage.removeItem('nclex-test-session-state');
    }
  }, [submitted]);

  // Initialize drag for non‑case drag-drop - Two box system
  useEffect(() => {
    const q = questions[currentIndex];
    if (q && q.type !== 'case-study' && q.type === 'drag-drop') {
      const shuffled = [...q.options].sort(() => Math.random() - 0.5);
      const items = shuffled.map((text, idx) => ({ id: `item-${idx}-${Date.now()}`, text }));
      setDragSourceItems(items); // All items start in source box
      setDragAnswerItems([]);   // Answer box is empty
      setDragItems(items); // Legacy compatibility
    }
  }, [currentIndex, questions]);

  // Initialize drag for case study sub‑questions - Two box system
  useEffect(() => {
    const q = questions[currentIndex];
    if (q?.type === 'case-study') {
      const subQ = q.questions[caseIndex];
      if (subQ?.type === 'drag-drop') {
        const key = `${q._id}-${subQ._id}`;
        if (!caseDragItems[key]) {
          const shuffled = [...subQ.options].sort(() => Math.random() - 0.5);
          const items = shuffled.map((text, idx) => ({ id: `case-item-${idx}-${Date.now()}`, text }));
          setCaseDragItems(prev => ({ ...prev, [key]: items }));
          setCaseDragSourceItems(prev => ({ ...prev, [key]: items }));
          setCaseDragAnswerItems(prev => ({ ...prev, [key]: [] }));
        }
      }
    }
  }, [currentIndex, caseIndex, questions, caseDragItems]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAnswer = (qId, answer, qType) => {
    if (isPaused) return;
    setAnswers(prev => ({ ...prev, [qId]: answer }));
  };
  const handleCaseAnswer = (subQId, answer, subQType) => {
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

  // Helper: check if current question is revealed in tutor mode
  const getCurrentQuestionRevealed = () => {
    const q = questions[currentIndex];
    if (!q) return true;
    if (q.type === 'case-study') {
      const subQ = q.questions?.[caseIndex];
      return subQ?._id ? !!tutorRevealed[subQ._id] : true;
    }
    return q._id ? !!tutorRevealed[q._id] : true;
  };

  const handleNext = () => {
    if (isPaused) return;
    // Track time spent on current question before moving
    const q = questions[currentIndex];
    if (q) {
      const timeSpentOnQuestion = Math.round((Date.now() - questionStartTime) / 1000);
      setQuestionTimeSpent(prev => ({
        ...prev,
        [q._id]: (prev[q._id] || 0) + timeSpentOnQuestion
      }));
    }
    setQuestionStartTime(Date.now());
    // In tutor mode: first click reveals answer, second click moves to next
    if (settings?.tutorMode) {
      let currentQId;
      if (q?.type === 'case-study') {
        currentQId = q.questions?.[caseIndex]?._id;
      } else {
        currentQId = q?._id;
      }
      if (currentQId && !tutorRevealed[currentQId]) {
        // First click: reveal answer, don't move
        revealTutorQuestion(currentQId);
        return;
      }
      // Already revealed, fall through to move
    }
    
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

  // Check if a case study question has been answered
  const isCaseQuestionAnswered = (subQId) => {
    const answer = caseAnswers[subQId];
    if (answer === undefined || answer === null) return false;
    if (typeof answer === 'string' && answer.trim() === '') return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    if (typeof answer === 'object' && Object.keys(answer).length === 0) return false;
    return true;
  };

  // Check if Previous button should be disabled
  const shouldDisablePrev = () => {
    if (isPaused) return true;
    const q = questions[currentIndex];
    if (q?.type === 'case-study') {
      // At the very first question
      if (currentIndex === 0 && caseIndex === 0) return true;
      // Check if previous question was answered
      if (caseIndex > 0) {
        const prevSubQ = q.questions[caseIndex - 1];
        return isCaseQuestionAnswered(prevSubQ._id);
      } else if (currentIndex > 0) {
        const prevQ = questions[currentIndex - 1];
        if (prevQ?.type === 'case-study') {
          const lastSubQ = prevQ.questions[prevQ.questions.length - 1];
          return isCaseQuestionAnswered(lastSubQ._id);
        }
        return answers[prevQ._id] !== undefined;
      }
    } else {
      if (currentIndex === 0) return true;
      const prevQ = questions[currentIndex - 1];
      return answers[prevQ._id] !== undefined;
    }
    return false;
  };

  const handlePrev = () => {
    if (isPaused) return;
    // Track time spent on current question before moving
    const q = questions[currentIndex];
    if (q) {
      const timeSpentOnQuestion = Math.round((Date.now() - questionStartTime) / 1000);
      setQuestionTimeSpent(prev => ({
        ...prev,
        [q._id]: (prev[q._id] || 0) + timeSpentOnQuestion
      }));
    }
    setQuestionStartTime(Date.now());
    
    if (q?.type === 'case-study') {
      if (caseIndex > 0) {
        // Check if the previous sub-question has been answered
        const prevSubQ = q.questions[caseIndex - 1];
        if (isCaseQuestionAnswered(prevSubQ._id)) {
          // Don't allow going back to answered questions
          return;
        }
        setCaseIndex(caseIndex - 1);
      } else if (currentIndex > 0) {
        const prevQ = questions[currentIndex - 1];
        if (prevQ?.type === 'case-study') {
          // Check if the last sub-question of previous case study has been answered
          const lastSubQ = prevQ.questions[prevQ.questions.length - 1];
          if (isCaseQuestionAnswered(lastSubQ._id)) {
            return;
          }
          setCurrentIndex(currentIndex - 1);
          setCaseIndex(prevQ.questions.length - 1);
        } else {
          // Check if the previous regular question has been answered
          if (answers[prevQ._id] !== undefined) {
            return;
          }
          setCurrentIndex(currentIndex - 1);
        }
      }
    } else {
      if (currentIndex > 0) {
        const prevQ = questions[currentIndex - 1];
        // Don't allow going back to answered questions
        if (answers[prevQ._id] !== undefined) {
          return;
        }
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  const handleExitSession = () => {
    const shouldExit = window.confirm('Exit this test session and return to dashboard?');
    if (shouldExit) {
      localStorage.removeItem('nclex-test-session-state');
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
    setShowNavigatorModal(true);
  };

  const goToQuestion = (index) => {
    // Track time spent on current question before jumping
    const q = questions[currentIndex];
    if (q) {
      const timeSpentOnQuestion = Math.round((Date.now() - questionStartTime) / 1000);
      setQuestionTimeSpent(prev => ({
        ...prev,
        [q._id]: (prev[q._id] || 0) + timeSpentOnQuestion
      }));
    }
    setQuestionStartTime(Date.now());
    
    setCurrentIndex(index);
    setCaseIndex(0);
    setShowNavigatorModal(false);
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

  // Drag handlers for non‑case - Two box system
  const handleDragStart = (e, index, source) => {
    if (isPaused) return;
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.setData('source', source); // 'source' or 'answer'
  };
  const handleDragOver = (e) => e.preventDefault();
  
  // Handle drop in source box (move back from answer)
  const handleDropToSource = (e) => {
    if (isPaused) return;
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const fromSource = e.dataTransfer.getData('source');
    
    if (fromSource === 'answer') {
      // Move from answer box back to source box
      const item = dragAnswerItems[dragIndex];
      if (item) {
        setDragSourceItems(prev => [...prev, item]);
        setDragAnswerItems(prev => prev.filter((_, i) => i !== dragIndex));
        // Update answer
        const newAnswerItems = dragAnswerItems.filter((_, i) => i !== dragIndex);
        handleAnswer(questions[currentIndex]._id, newAnswerItems.map(item => item.text).join('|'));
      }
    }
  };
  
  // Handle drop in answer box (add from source or reorder within answer)
  const handleDropToAnswer = (e, dropIndex = -1) => {
    if (isPaused) return;
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const fromSource = e.dataTransfer.getData('source');
    
    if (fromSource === 'source') {
      // Move from source box to answer box
      const item = dragSourceItems[dragIndex];
      if (item) {
        const newAnswerItems = dropIndex >= 0 
          ? [...dragAnswerItems.slice(0, dropIndex), item, ...dragAnswerItems.slice(dropIndex)]
          : [...dragAnswerItems, item];
        setDragAnswerItems(newAnswerItems);
        setDragSourceItems(prev => prev.filter((_, i) => i !== dragIndex));
        handleAnswer(questions[currentIndex]._id, newAnswerItems.map(item => item.text).join('|'));
      }
    } else if (fromSource === 'answer') {
      // Reorder within answer box
      if (dragIndex === dropIndex) return;
      const newItems = [...dragAnswerItems];
      const [removed] = newItems.splice(dragIndex, 1);
      if (dropIndex >= 0) {
        newItems.splice(dropIndex, 0, removed);
      } else {
        newItems.push(removed);
      }
      setDragAnswerItems(newItems);
      handleAnswer(questions[currentIndex]._id, newItems.map(item => item.text).join('|'));
    }
  };
  
  // Legacy handlers for compatibility
  const handleDragStartLegacy = (e, index) => {
    if (isPaused) return;
    e.dataTransfer.setData('text/plain', index);
  };
  const handleDropLegacy = (e, dropIndex) => {
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

  // Drag handlers for case study sub‑questions - Two box system
  const handleCaseDragStart = (key, e, index, source) => {
    if (isPaused) return;
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.setData('dragKey', key);
    e.dataTransfer.setData('source', source);
  };
  const handleCaseDragOver = (e) => e.preventDefault();
  
  // Handle drop in case study source box
  const handleCaseDropToSource = (key, e) => {
    if (isPaused) return;
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const dragKey = e.dataTransfer.getData('dragKey');
    const fromSource = e.dataTransfer.getData('source');
    
    if (dragKey !== key) return;
    
    if (fromSource === 'answer') {
      const answerItems = caseDragAnswerItems[key] || [];
      const item = answerItems[dragIndex];
      if (item) {
        setCaseDragSourceItems(prev => ({ ...prev, [key]: [...(prev[key] || []), item] }));
        const newAnswerItems = answerItems.filter((_, i) => i !== dragIndex);
        setCaseDragAnswerItems(prev => ({ ...prev, [key]: newAnswerItems }));
        const subQ = questions[currentIndex].questions[caseIndex];
        handleCaseAnswer(subQ._id, newAnswerItems.map(item => item.text).join('|'));
      }
    }
  };
  
  // Handle drop in case study answer box
  const handleCaseDropToAnswer = (key, e, dropIndex = -1) => {
    if (isPaused) return;
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
        setCaseDragSourceItems(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== dragIndex) }));
        const subQ = questions[currentIndex].questions[caseIndex];
        handleCaseAnswer(subQ._id, newAnswerItems.map(item => item.text).join('|'));
      }
    } else if (fromSource === 'answer') {
      if (dragIndex === dropIndex) return;
      const newItems = [...answerItems];
      const [removed] = newItems.splice(dragIndex, 1);
      if (dropIndex >= 0) {
        newItems.splice(dropIndex, 0, removed);
      } else {
        newItems.push(removed);
      }
      setCaseDragAnswerItems(prev => ({ ...prev, [key]: newItems }));
      const subQ = questions[currentIndex].questions[caseIndex];
      handleCaseAnswer(subQ._id, newItems.map(item => item.text).join('|'));
    }
  };
  
  // Legacy case drag drop for compatibility
  const handleCaseDropLegacy = (key, e, dropIndex) => {
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

  // (normalizeToLetter is already defined above at line 333 - do not redeclare here)
  
  const isFillBlankCorrect = (userAnswer, correctAnswer) => {
    if (!userAnswer || !correctAnswer) return false;
    const user = userAnswer.trim().toLowerCase();
    const acceptable = correctAnswer.split(';').map(a => a.trim().toLowerCase());
    return acceptable.includes(user);
  };
  const isHighlightCorrect = (userAnswer, correctAnswer) => {
    if (!userAnswer || !correctAnswer) return false;
    // Support both old format (single text) and new format (pipe-separated words)
    const user = userAnswer.trim().toLowerCase();
    const correctOptions = correctAnswer.split('|').map(a => a.trim().toLowerCase());
    return correctOptions.includes(user);
  };
  const isDragDropCorrect = (userAnswer, correctAnswer) => {
    if (!userAnswer || !correctAnswer) return false;
    return userAnswer === correctAnswer;
  };
  const scoreMatrix = (userAnswer, matrixRows) => {
    if (!userAnswer || !Array.isArray(userAnswer) || !matrixRows || matrixRows.length === 0) {
      return { isCorrect: false, earnedMarks: 0, totalMarks: matrixRows?.length || 0 };
    }
    let totalCorrect = 0;
    let totalCells = 0;
    let earnedMarks = 0;
    for (let i = 0; i < matrixRows.length; i++) {
      const row = matrixRows[i];
      // Support both old (correctColumn) and new (correctColumns) formats
      let correctCols = [];
      if (Array.isArray(row.correctColumns) && row.correctColumns.length > 0) {
        correctCols = row.correctColumns;
      } else if (row.correctColumn !== undefined && row.correctColumn !== null) {
        correctCols = [row.correctColumn];
      }
      totalCells += correctCols.length;
      const userCols = Array.isArray(userAnswer[i]) ? userAnswer[i] : (userAnswer[i] !== undefined ? [userAnswer[i]] : []);
      // Correct selections
      const correctPicked = userCols.filter(c => correctCols.includes(c)).length;
      // Wrong selections (penalty)
      const wrongPicked = userCols.filter(c => !correctCols.includes(c)).length;
      const rowEarned = Math.max(0, correctPicked - wrongPicked * 0.5);
      earnedMarks += rowEarned;
      totalCorrect += correctPicked;
    }
    return {
      isCorrect: totalCorrect === totalCells && earnedMarks === totalCells ? true : (earnedMarks > 0 ? 'partial' : false),
      earnedMarks: Math.round(earnedMarks * 100) / 100,
      totalMarks: totalCells || matrixRows.length || 0
    };
  };
  const isHotspotCorrect = (userAnswer, correctAnswer) => {
    if (!userAnswer || !correctAnswer) return false;
    return String(userAnswer).trim() === String(correctAnswer).trim();
  };
  const isBowtieCorrect = (userAnswer, correctAnswer) => {
    if (!userAnswer || !correctAnswer || typeof userAnswer !== 'object' || typeof correctAnswer !== 'object') return false;
    const requiredKeys = ['condition', 'actionLeft', 'actionRight', 'parameterLeft', 'parameterRight'];
    return requiredKeys.every((key) => String(userAnswer?.[key] || '').trim() === String(correctAnswer?.[key] || '').trim());
  };
  const isClozeDropdownCorrect = (userAnswer, correctAnswer) => {
    if (!userAnswer || !correctAnswer || typeof correctAnswer !== 'object') return false;
    const expectedKeys = Object.keys(correctAnswer);
    if (!expectedKeys.length) return false;
    return expectedKeys.every((key) => String(userAnswer?.[key] || '').trim() === String(correctAnswer[key] || '').trim());
  };

  const evaluateSataAnswer = (userAnswer, correctAnswer) => {
    // Helper to parse correctAnswer which might be array or string
    const parseAnswerToArray = (answer) => {
      if (!answer) return [];
      // Already an array
      if (Array.isArray(answer)) {
        return answer.map(v => normalizeToLetter(v)).filter(Boolean);
      }
      // String format: could be "A,B,C", "A, B, C", "ABC", or "1,2,3"
      const str = String(answer).trim();
      // Check if it's comma-separated
      if (str.includes(',')) {
        return str.split(',').map(v => normalizeToLetter(v.trim())).filter(Boolean);
      }
      // Check if it's a string of letters like "ABC" or "acd"
      if (/^[A-Za-z]+$/.test(str)) {
        return str.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
      }
      // Check if it's space-separated
      if (str.includes(' ')) {
        return str.split(/\s+/).map(v => normalizeToLetter(v.trim())).filter(Boolean);
      }
      // Single value
      const normalized = normalizeToLetter(str);
      return normalized ? [normalized] : [];
    };

    // Normalize user answer
    const user = Array.isArray(userAnswer)
      ? [...new Set(userAnswer.map((v) => normalizeToLetter(v)).filter(Boolean))]
      : [];
    
    // Normalize correct answer (handle both array and string formats)
    const correct = [...new Set(parseAnswerToArray(correctAnswer))];

    // 1 answer = 1 point: every SATA question is worth exactly 1 point
    // All correct + no wrong = 1 pt | Some correct + no wrong = 0.5 pt | Any wrong = 0 pt
    const totalMarks = 1;
    const correctPicked = user.filter((choice) => correct.includes(choice)).length;
    const wrongPicked = user.filter((choice) => !correct.includes(choice)).length;
    let earnedMarks = 0;
    let isCorrect = false;

    if (wrongPicked > 0) {
      // Any wrong pick = 0 points
      earnedMarks = 0;
      isCorrect = false;
    } else if (correctPicked === correct.length && correct.length > 0) {
      // All correct options picked, none wrong = full point
      earnedMarks = 1;
      isCorrect = true;
    } else if (correctPicked > 0) {
      // Some correct, none wrong = half point
      earnedMarks = 0.5;
      isCorrect = 'partial';
    }

    return {
      isCorrect,
      earnedMarks,
      totalMarks,
    };
  };

  async function handleSubmit() {
    if (submitted) return;
    setIsPaused(false);
    // Reveal tutor rationale for the last question before submitting
    if (settings?.tutorMode) {
      const lastQ = questions[questions.length - 1];
      if (lastQ) {
        if (lastQ.type === 'case-study') {
          const lastSubQ = lastQ.questions?.[caseIndex];
          if (lastSubQ?._id) revealTutorQuestion(lastSubQ._id);
        } else if (lastQ._id) {
          revealTutorQuestion(lastQ._id);
        }
      }
    }
    // Don't show loading screen - go directly to test summary
    setSubmitted(true);

    // Flatten all results (including case study sub‑questions)
    const allResults = [];
    questions.forEach(q => {
      if (q.type === 'case-study') {
        q.questions.forEach(subQ => {
          const userAnswer = caseAnswers[subQ._id];
          let isCorrect = false;
          let sataScoreMeta = { earnedMarks: 0, totalMarks: 1 };
          if (subQ.type === 'multiple-choice') {
            // Normalize both answers to letter format (handles "2" vs "B" differences)
            const normalizedUser = normalizeToLetter(userAnswer);
            const normalizedCorrect = normalizeToLetter(subQ.correctAnswer);
            isCorrect = normalizedUser === normalizedCorrect && normalizedUser !== '';
          } else if (subQ.type === 'sata') {
            const sata = evaluateSataAnswer(userAnswer, subQ.correctAnswer);
            isCorrect = sata.isCorrect;
            sataScoreMeta = sata;
          } else if (subQ.type === 'fill-blank') {
            isCorrect = isFillBlankCorrect(userAnswer, subQ.correctAnswer);
          } else if (subQ.type === 'highlight') {
            isCorrect = isHighlightCorrect(userAnswer, subQ.correctAnswer);
          } else if (subQ.type === 'drag-drop') {
            isCorrect = isDragDropCorrect(userAnswer, subQ.correctAnswer);
          } else if (subQ.type === 'matrix') {
            const matrixScore = scoreMatrix(userAnswer, subQ.matrixRows);
            isCorrect = matrixScore.isCorrect;
            sataScoreMeta = { earnedMarks: matrixScore.earnedMarks, totalMarks: matrixScore.totalMarks };
          } else if (subQ.type === 'hotspot') {
            isCorrect = isHotspotCorrect(userAnswer, subQ.correctAnswer);
          } else if (subQ.type === 'bowtie') {
            isCorrect = isBowtieCorrect(userAnswer, subQ.correctAnswer);
          } else if (subQ.type === 'cloze-dropdown') {
            isCorrect = isClozeDropdownCorrect(userAnswer, subQ.correctAnswer);
          }
          if (subQ.type !== 'sata' && subQ.type !== 'matrix') {
            sataScoreMeta = { earnedMarks: isCorrect === true ? 1 : 0, totalMarks: 1 };
          }

          allResults.push({
            questionId: subQ._id,
            parentCaseStudyId: q._id,
            parentCaseStudyType: q.caseStudyType || 'layered',
            userAnswer,
            isCorrect,
            earnedMarks: sataScoreMeta.earnedMarks,
            totalMarks: sataScoreMeta.totalMarks,
            correctAnswer: subQ.correctAnswer,
            questionText: subQ.questionText,
            questionImageUrl: subQ.questionImageUrl,
            options: subQ.options,
            type: subQ.type,
            rationale: subQ.rationale,
            rationaleImageUrl: subQ.rationaleImageUrl,
            scenario: q.scenario,
            sections: q.sections || [],
            highlightStart: subQ.highlightStart,
            highlightEnd: subQ.highlightEnd,
            category: subQ.category || q.category,
            subcategory: subQ.subcategory || q.subcategory,
            matrixColumns: subQ.matrixColumns,
            matrixRows: subQ.matrixRows,
            hotspotImageUrl: subQ.hotspotImageUrl,
            hotspotTargets: subQ.hotspotTargets,
            clozeTemplate: subQ.clozeTemplate,
            clozeBlanks: subQ.clozeBlanks,
            timeSpentSeconds: questionTimeSpent[subQ._id] || 0,
          });
        });
      } else {
        const userAnswer = answers[q._id];
        let isCorrect = false;
        let sataScoreMeta = { earnedMarks: 0, totalMarks: 1 };
        if (q.type === 'multiple-choice') {
          // Normalize both answers to letter format (handles "2" vs "B" differences)
          const normalizedUser = normalizeToLetter(userAnswer);
          const normalizedCorrect = normalizeToLetter(q.correctAnswer);
          isCorrect = normalizedUser === normalizedCorrect && normalizedUser !== '';
        } else if (q.type === 'sata') {
          const sata = evaluateSataAnswer(userAnswer, q.correctAnswer);
          isCorrect = sata.isCorrect;
          sataScoreMeta = sata;
        } else if (q.type === 'fill-blank') {
          isCorrect = isFillBlankCorrect(userAnswer, q.correctAnswer);
        } else if (q.type === 'highlight') {
          isCorrect = isHighlightCorrect(userAnswer, q.correctAnswer);
        } else if (q.type === 'drag-drop') {
          isCorrect = isDragDropCorrect(userAnswer, q.correctAnswer);
        } else if (q.type === 'matrix') {
          const matrixScore = scoreMatrix(userAnswer, q.matrixRows);
          isCorrect = matrixScore.isCorrect;
          sataScoreMeta = { earnedMarks: matrixScore.earnedMarks, totalMarks: matrixScore.totalMarks };
        } else if (q.type === 'hotspot') {
          isCorrect = isHotspotCorrect(userAnswer, q.correctAnswer);
        } else if (q.type === 'bowtie') {
          isCorrect = isBowtieCorrect(userAnswer, q.correctAnswer);
        } else if (q.type === 'cloze-dropdown') {
          isCorrect = isClozeDropdownCorrect(userAnswer, q.correctAnswer);
        }
        if (q.type !== 'sata' && q.type !== 'matrix') {
          sataScoreMeta = { earnedMarks: isCorrect === true ? 1 : 0, totalMarks: 1 };
        }

        allResults.push({
          questionId: q._id,
          userAnswer,
          isCorrect,
          earnedMarks: sataScoreMeta.earnedMarks,
          totalMarks: sataScoreMeta.totalMarks,
          correctAnswer: q.correctAnswer,
          questionText: q.questionText,
          questionImageUrl: q.questionImageUrl,
          options: q.options,
          type: q.type,
          rationale: q.rationale,
          rationaleImageUrl: q.rationaleImageUrl,
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
          timeSpentSeconds: questionTimeSpent[q._id] || 0,
        });
      }
    });

    setResults(allResults);

    const earnedTotal = allResults.reduce((sum, row) => sum + Number(row?.earnedMarks ?? (row?.isCorrect === true ? 1 : 0)), 0);
    const possibleTotal = allResults.reduce((sum, row) => sum + Number(row?.totalMarks ?? 1), 0) || 1;

    try {
      const token = localStorage.getItem('token');
      const submitResponse = await axios.post('/api/student/submit-test', {
        testName: settings?.testName || 'Custom Test',
        answers: { ...answers, ...caseAnswers },
        results: allResults,
        totalQuestions: allResults.length,
        timeTaken: settings.timed ? (settings.totalQuestions * 85 - timeLeft) / 60 : 0,
        passed: (earnedTotal / possibleTotal) >= 0.7,
        isCustomTest: !settings?.fromPreparedTest,
        proctoring: null,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const createdResultId = submitResponse?.data?.testResult?._id;
      if (createdResultId) {
        setSubmittedResultId(createdResultId);
        setSubmitReviewError('');
        // Navigate directly to test summary without any loading screen
        navigate(`/test-review/${createdResultId}`);
      } else {
        setSubmitReviewError('Could not open summary automatically. Please use Previous Tests from dashboard.');
      }
    } catch (error) {
      console.error('Submit failed:', error);
      setSubmitReviewError('Submit saved locally but server review id was not created.');
    } finally {
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

  // --- Submitted view: show loading spinner while navigating to review ---
  if (submitted) {
    if (submittedResultId) {
      // Navigate to review (may already be navigating from handleSubmit, but ensure it)
      navigate(`/test-review/${submittedResultId}`);
    }
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0fdfa 100%)' }}>
        <div style={{ textAlign: 'center', maxWidth: '420px', padding: '20px' }}>
          <div style={{
            width: '80px', height: '80px', margin: '0 auto 28px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #059669, #10b981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(5, 150, 105, 0.3)',
          }}>
            <i className="fas fa-check" style={{ fontSize: '2rem', color: '#fff' }}></i>
          </div>
          <div style={{
            width: '48px', height: '48px', margin: '0 auto 24px',
            position: 'relative',
          }}>
            <div style={{
              width: '100%', height: '100%',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #059669',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}></div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
          <h3 style={{ color: '#065f46', fontSize: '1.3rem', fontWeight: 700, marginBottom: '10px' }}>
            Your test has been submitted successfully
          </h3>
          <p style={{ color: '#6b7280', fontSize: '1rem', lineHeight: 1.6 }}>
            Kindly hold on while the review page loads
          </p>
          {submitReviewError && (
            <div style={{
              marginTop: '20px', padding: '12px 16px', borderRadius: '10px',
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#dc2626', fontSize: '0.88rem'
            }}>
              {submitReviewError}
            </div>
          )}
          {!submittedResultId && (
            <button
              className="btn btn-outline-primary"
              style={{ marginTop: '20px' }}
              onClick={() => navigate(dashboardReturnPath)}
            >
              <i className="fas fa-home me-2"></i>Back to Dashboard
            </button>
          )}
        </div>
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
    const visibleSections = (currentQ.sections || []).filter((section, index) => {
      const sectionId = section?.sectionId || `section-${index + 1}`;
      const allowed = Array.isArray(subQ?.visibleSectionIds) ? subQ.visibleSectionIds : [];
      return allowed.length === 0 || allowed.includes(sectionId);
    });
    const activeCaseTab = activeCaseTabByQuestion[subQId] || 'scenario';
    const selectedSection = visibleSections.find((section, index) => {
      const sectionId = section?.sectionId || `section-${index + 1}`;
      return sectionId === activeCaseTab;
    });

    return (
      <div className="test-session case-study-session app-no-copy" style={{ position: 'relative' }}>
        <div className="test-header">
          <div className="d-flex align-items-center gap-2">
            <h3 className="mb-0 me-3">Case Study {currentIndex + 1} of {questions.length} – Q{caseIndex + 1}/{currentQ.questions.length}</h3>
            <span style={{
              fontSize: '0.72rem',
              background: '#f1f5f9',
              color: '#64748b',
              padding: '3px 10px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              fontFamily: 'monospace',
              fontWeight: 600,
              letterSpacing: '0.5px'
            }}>
              Q-{String(subQ._id).slice(-8).toUpperCase()}
            </span>
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
            {/* Patient Info header - not clickable */}
            <div className="case-study-section-header">
              <span className="patient-info-label">Patient Info</span>
            </div>
            {/* Section tabs - clickable */}
            {visibleSections.length > 0 && (
              <div className="case-study-tabs d-flex flex-wrap gap-2 mb-3">
                {visibleSections.map((section, index) => {
                  const sectionId = section?.sectionId || `section-${index + 1}`;
                  return (
                    <button
                      key={sectionId}
                      type="button"
                      className={`btn btn-sm ${activeCaseTab === sectionId ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setActiveCaseTabByQuestion((prev) => ({ ...prev, [subQId]: sectionId }))}
                    >
                      {section.title}
                    </button>
                  );
                })}
              </div>
            )}
            {activeCaseTab === 'scenario' || !visibleSections.find((section, index) => {
              const sectionId = section?.sectionId || `section-${index + 1}`;
              return sectionId === activeCaseTab;
            }) ? (
              <div className="scenario-box p-3 mb-3 bg-light border rounded">
                <h5>Scenario</h5>
                <p>{currentQ.scenario}</p>
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
              ) : null;
            })()}
          </div>

          {/* Right panel – current question */}
          <div className="col-md-7 question-panel">
            <div className="question-container">
              <p className="question-text">{subQ.questionText}</p>
              {subQ.questionImageUrl && (
                <div className="mb-3">
                  <img src={subQ.questionImageUrl} alt="Question visual" style={{ maxWidth: '420px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              )}

              {subQ.type === 'multiple-choice' && (
                <div className="options">
                  {subQ.options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const isSelected = caseAnswers[subQId] === letter;
                    const isRevealed = settings?.tutorMode && tutorRevealed[subQId];
                    const correctLetter = normalizeToLetter(subQ.correctAnswer);
                    const showCorrect = isRevealed && letter === correctLetter;
                    const showWrong = isRevealed && isSelected && letter !== correctLetter;
                    return (
                      <div
                        key={idx}
                        className={`option ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleCaseAnswer(subQId, letter)}
                        style={isRevealed ? {
                          borderColor: showCorrect ? '#22c55e' : showWrong ? '#ef4444' : undefined,
                          background: showCorrect ? '#f0fdf4' : showWrong ? '#fef2f2' : undefined,
                        } : undefined}
                      >
                        <span className="option-letter">{letter}</span>
                        {opt}
                        {isRevealed && showCorrect && <i className="fas fa-check ms-auto" style={{ color: '#22c55e' }} />}
                        {isRevealed && showWrong && <i className="fas fa-times ms-auto" style={{ color: '#ef4444' }} />}
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
                    const isRevealed = settings?.tutorMode && tutorRevealed[subQId];
                    const parseArr = (v) => {
                      if (Array.isArray(v)) return v.map(x => normalizeToLetter(x)).filter(Boolean);
                      const s = String(v);
                      if (s.includes(',')) return s.split(',').map(x => normalizeToLetter(x.trim())).filter(Boolean);
                      if (/^[A-Za-z]+$/.test(s)) return s.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
                      return [normalizeToLetter(v)].filter(Boolean);
                    };
                    const correctSet = isRevealed ? new Set(parseArr(subQ.correctAnswer)) : new Set();
                    const isCorrectOpt = isRevealed && correctSet.has(letter);
                    const isWrongOpt = isRevealed && selected && !correctSet.has(letter);
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
                        style={isRevealed ? {
                          borderColor: isCorrectOpt ? '#22c55e' : isWrongOpt ? '#ef4444' : undefined,
                          background: isCorrectOpt ? '#f0fdf4' : isWrongOpt ? '#fef2f2' : undefined,
                        } : undefined}
                      >
                        <span className="option-letter">{letter}</span>
                        {opt}
                        {isRevealed && isCorrectOpt && <i className="fas fa-check ms-auto" style={{ color: '#22c55e' }} />}
                        {isRevealed && isWrongOpt && <i className="fas fa-times ms-auto" style={{ color: '#ef4444' }} />}
                      </div>
                    );
                  })}
                </div>
              )}

              {subQ.type === 'bowtie' && (
                <div className="bowtie-runtime">
                  <div className="row g-3 align-items-center mb-4">
                    <div className="col-12 col-md-4">
                      <select
                        className="form-control"
                        value={caseAnswers[subQId]?.actionLeft || ''}
                        disabled={isPaused}
                        onChange={(e) => handleCaseAnswer(subQId, { ...(caseAnswers[subQId] || {}), actionLeft: e.target.value })}
                      >
                        <option value="">Action to Take</option>
                        {(subQ.bowtieActions || []).filter(Boolean).map((opt) => <option key={`al-${opt}`} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="col-12 col-md-4">
                      <select
                        className="form-control"
                        value={caseAnswers[subQId]?.condition || ''}
                        disabled={isPaused}
                        onChange={(e) => handleCaseAnswer(subQId, { ...(caseAnswers[subQId] || {}), condition: e.target.value })}
                      >
                        <option value="">Potential Condition</option>
                        {(subQ.bowtieCondition || []).filter(Boolean).map((opt) => <option key={`c-${opt}`} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="col-12 col-md-4">
                      <select
                        className="form-control"
                        value={caseAnswers[subQId]?.parameterLeft || ''}
                        disabled={isPaused}
                        onChange={(e) => handleCaseAnswer(subQId, { ...(caseAnswers[subQId] || {}), parameterLeft: e.target.value })}
                      >
                        <option value="">Parameter to Monitor</option>
                        {(subQ.bowtieParameters || []).filter(Boolean).map((opt) => <option key={`pl-${opt}`} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="col-12 col-md-4">
                      <select
                        className="form-control"
                        value={caseAnswers[subQId]?.actionRight || ''}
                        disabled={isPaused}
                        onChange={(e) => handleCaseAnswer(subQId, { ...(caseAnswers[subQId] || {}), actionRight: e.target.value })}
                      >
                        <option value="">Action to Take</option>
                        {(subQ.bowtieActions || []).filter(Boolean).map((opt) => <option key={`ar-${opt}`} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="col-12 col-md-4 offset-md-4">
                      <select
                        className="form-control"
                        value={caseAnswers[subQId]?.parameterRight || ''}
                        disabled={isPaused}
                        onChange={(e) => handleCaseAnswer(subQId, { ...(caseAnswers[subQId] || {}), parameterRight: e.target.value })}
                      >
                        <option value="">Parameter to Monitor</option>
                        {(subQ.bowtieParameters || []).filter(Boolean).map((opt) => <option key={`pr-${opt}`} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
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
                    onChange={(e) => handleCaseAnswer(subQId, e.target.value, 'fill-blank')}
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
                    {(() => {
                      const words = (subQ.questionText || '').split(/\s+/).filter(w => w.trim());
                      const selectableIndices = subQ.highlightSelectableWords || [];
                      const currentAnswer = caseAnswers[subQId];
                      
                      return words.map((word, idx) => {
                        const isSelectable = selectableIndices.includes(idx);
                        const isSelected = currentAnswer === word || currentAnswer === String(idx);
                        
                        if (!isSelectable) {
                          return <span key={idx} style={{ marginRight: '8px' }}>{word}</span>;
                        }
                        
                        return (
                          <span
                            key={idx}
                            onClick={() => !isPaused && handleCaseAnswer(subQId, word)}
                            style={{
                              display: 'inline-block',
                              padding: '6px 14px',
                              margin: '4px',
                              borderRadius: '8px',
                              cursor: isPaused ? 'not-allowed' : 'pointer',
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
                      });
                    })()}
                  </div>
                  <p className="text-muted mt-3">
                    Your selection: <strong style={{ color: caseAnswers[subQId] ? '#22c55e' : '#94a3b8' }}>
                      {caseAnswers[subQId] || 'none selected'}
                    </strong>
                  </p>
                </div>
              )}

              {subQ.type === 'drag-drop' && (() => {
                const sourceItems = caseDragSourceItems[dragKey] || [];
                const answerItems = caseDragAnswerItems[dragKey] || [];
                return (
                  <div className="drag-drop-two-box-container" style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
                    {/* Source/Display Box */}
                    <div 
                      className="drag-source-box" 
                      style={{ 
                        flex: 1, 
                        minHeight: '120px', 
                        padding: '16px', 
                        border: '2px dashed #94a3b8', 
                        borderRadius: '12px', 
                        background: '#f8fafc' 
                      }}
                      onDragOver={handleCaseDragOver}
                      onDrop={(e) => handleCaseDropToSource(dragKey, e)}
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
                              onDragStart={(e) => handleCaseDragStart(dragKey, e, index, 'source')}
                              style={{
                                padding: '10px 16px',
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                cursor: 'grab',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                fontSize: '14px'
                              }}
                            >
                              {item.text}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Answer/Arrangement Box */}
                    <div 
                      className="drag-answer-box" 
                      style={{ 
                        flex: 1, 
                        minHeight: '120px', 
                        padding: '16px', 
                        border: '2px solid #3b82f6', 
                        borderRadius: '12px', 
                        background: '#eff6ff' 
                      }}
                      onDragOver={handleCaseDragOver}
                      onDrop={(e) => handleCaseDropToAnswer(dragKey, e, answerItems.length)}
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
                              onDragStart={(e) => handleCaseDragStart(dragKey, e, index, 'answer')}
                              onDragOver={handleCaseDragOver}
                              onDrop={(e) => handleCaseDropToAnswer(dragKey, e, index)}
                              style={{
                                padding: '10px 16px',
                                background: 'white',
                                border: '1px solid #3b82f6',
                                borderRadius: '8px',
                                cursor: 'grab',
                                boxShadow: '0 2px 6px rgba(59, 130, 246, 0.2)',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <span style={{ 
                                width: '22px', 
                                height: '22px', 
                                borderRadius: '50%', 
                                background: '#3b82f6', 
                                color: 'white', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 600
                              }}>{index + 1}</span>
                              {item.text}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                                type="checkbox"
                                disabled={isPaused}
                                checked={Array.isArray(caseAnswers[subQId]?.[rowIdx]) ? caseAnswers[subQId][rowIdx].includes(colIdx) : false}
                                onChange={() => {
                                  const current = caseAnswers[subQId] ? [...caseAnswers[subQId]] : [];
                                  if (!Array.isArray(current[rowIdx])) current[rowIdx] = [];
                                  const rowSelections = [...current[rowIdx]];
                                  if (rowSelections.includes(colIdx)) {
                                    current[rowIdx] = rowSelections.filter(c => c !== colIdx);
                                  } else {
                                    current[rowIdx] = [...rowSelections, colIdx];
                                  }
                                  handleCaseAnswer(subQId, current);
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
                      src={firstMediaUrl(subQ.hotspotImageUrl)}
                      data-raw-src={subQ.hotspotImageUrl}
                      data-fallback-index="0"
                      onError={handleImageFallback}
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
              <TutorRationale q={subQ} revealed={tutorRevealed[subQId]} />
            </div>
          </div>
        </div>

        <div className="navigation exam-runtime-navigation">
          <button className="btn btn-secondary" onClick={handleExitSession}>
            Exit
          </button>
          <button className="btn btn-secondary" onClick={handlePrev} disabled={shouldDisablePrev()}>
            Previous
          </button>
          <button className="btn btn-primary" onClick={openQuestionNavigator} disabled={isPaused}>
            Navigator
          </button>
          {currentIndex === questions.length - 1 && caseIndex === currentQ.questions.length - 1 ? (
            settings?.tutorMode && !getCurrentQuestionRevealed() ? (
              <button className="btn btn-primary" onClick={handleNext} disabled={isPaused}>Check Answer</button>
            ) : (
              <button className="btn btn-success" onClick={handleSubmit} disabled={isPaused}>Submit Test</button>
            )
          ) : (
            <button className="btn btn-primary" onClick={handleNext} disabled={isPaused}>
              {settings?.tutorMode && !getCurrentQuestionRevealed() ? 'Check Answer' : 'Next'}
            </button>
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
    <div className="test-session exam-runtime-skin app-no-copy" style={{ position: 'relative' }}>
      <div className="test-header">
        <div className="d-flex align-items-center gap-2">
          <h3 className="mb-0 me-3">Question {currentIndex + 1} of {questions.length}</h3>
          <span style={{
            fontSize: '0.72rem',
            background: '#f1f5f9',
            color: '#64748b',
            padding: '3px 10px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            fontFamily: 'monospace',
            fontWeight: 600,
            letterSpacing: '0.5px'
          }}>
            Q-{String(currentQ._id).slice(-8).toUpperCase()}
          </span>
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
        <button
          type="button"
          className="exam-toolbar-btn"
          onClick={() => setMarkedQuestions(prev => ({ ...prev, [currentQ._id]: !prev[currentQ._id] }))}
          disabled={isPaused}
          style={{ color: markedQuestions[currentQ._id] ? '#f59e0b' : undefined, fontWeight: markedQuestions[currentQ._id] ? 700 : undefined, background: markedQuestions[currentQ._id] ? '#fffbeb' : undefined, borderColor: markedQuestions[currentQ._id] ? '#f59e0b' : undefined }}
        >
          <i className={`fas fa-flag${markedQuestions[currentQ._id] ? '' : ' '}`}></i> {markedQuestions[currentQ._id] ? 'Marked' : 'Mark'}
        </button>
      </div>

      <div className="question-container exam-runtime-question-panel">
        <p className="question-text">{currentQ.questionText}</p>
        {currentQ.questionImageUrl && (
          <div className="mb-3">
            <img src={currentQ.questionImageUrl} alt="Question visual" style={{ maxWidth: '420px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          </div>
        )}

        {currentQ.type === 'multiple-choice' && (
          <div className="options">
            {currentQ.options.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isSelected = answers[currentQ._id] === letter;
              const isRevealed = settings?.tutorMode && tutorRevealed[currentQ._id];
              const correctLetter = normalizeToLetter(currentQ.correctAnswer);
              const showCorrect = isRevealed && letter === correctLetter;
              const showWrong = isRevealed && isSelected && letter !== correctLetter;
              return (
                <div
                  key={idx}
                  className={`option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleAnswer(currentQ._id, letter)}
                  style={isRevealed ? {
                    borderColor: showCorrect ? '#22c55e' : showWrong ? '#ef4444' : undefined,
                    background: showCorrect ? '#f0fdf4' : showWrong ? '#fef2f2' : undefined,
                  } : undefined}
                >
                  <span className="option-letter">{letter}</span>
                  {opt}
                  {isRevealed && showCorrect && <i className="fas fa-check ms-auto" style={{ color: '#22c55e' }} />}
                  {isRevealed && showWrong && <i className="fas fa-times ms-auto" style={{ color: '#ef4444' }} />}
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
              const isRevealed = settings?.tutorMode && tutorRevealed[currentQ._id];
              const parseArr = (v) => {
                if (Array.isArray(v)) return v.map(x => normalizeToLetter(x)).filter(Boolean);
                const s = String(v);
                if (s.includes(',')) return s.split(',').map(x => normalizeToLetter(x.trim())).filter(Boolean);
                if (/^[A-Za-z]+$/.test(s)) return s.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
                return [normalizeToLetter(v)].filter(Boolean);
              };
              const correctSet = isRevealed ? new Set(parseArr(currentQ.correctAnswer)) : new Set();
              const isCorrectOpt = isRevealed && correctSet.has(letter);
              const isWrongOpt = isRevealed && selected && !correctSet.has(letter);
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
                  style={isRevealed ? {
                    borderColor: isCorrectOpt ? '#22c55e' : isWrongOpt ? '#ef4444' : undefined,
                    background: isCorrectOpt ? '#f0fdf4' : isWrongOpt ? '#fef2f2' : undefined,
                  } : undefined}
                >
                  <span className="option-letter">{letter}</span>
                  {opt}
                  {isRevealed && isCorrectOpt && <i className="fas fa-check ms-auto" style={{ color: '#22c55e' }} />}
                  {isRevealed && isWrongOpt && <i className="fas fa-times ms-auto" style={{ color: '#ef4444' }} />}
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
              onChange={(e) => handleAnswer(currentQ._id, e.target.value, 'fill-blank')}
              onBlur={() => {
                // Tutor rationale is revealed on Next, not on blur
              }}
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
              {(() => {
                const words = (currentQ.questionText || '').split(/\s+/).filter(w => w.trim());
                const selectableIndices = currentQ.highlightSelectableWords || [];
                const currentAnswer = answers[currentQ._id];
                
                return words.map((word, idx) => {
                  const isSelectable = selectableIndices.includes(idx);
                  const isSelected = currentAnswer === word || currentAnswer === String(idx);
                  
                  if (!isSelectable) {
                    return <span key={idx} style={{ marginRight: '8px' }}>{word}</span>;
                  }
                  
                  return (
                    <span
                      key={idx}
                      onClick={() => !isPaused && handleAnswer(currentQ._id, word)}
                      style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        margin: '4px',
                        borderRadius: '8px',
                        cursor: isPaused ? 'not-allowed' : 'pointer',
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
                });
              })()}
            </div>
            <p className="text-muted mt-3">
              Your selection: <strong style={{ color: answers[currentQ._id] ? '#22c55e' : '#94a3b8' }}>
                {answers[currentQ._id] || 'none selected'}
              </strong>
            </p>
          </div>
        )}

        {currentQ.type === 'drag-drop' && (
          <div className="drag-drop-two-box-container" style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
            {/* Source/Display Box */}
            <div 
              className="drag-source-box" 
              style={{ 
                flex: 1, 
                minHeight: '120px', 
                padding: '16px', 
                border: '2px dashed #94a3b8', 
                borderRadius: '12px', 
                background: '#f8fafc' 
              }}
              onDragOver={handleDragOver}
              onDrop={handleDropToSource}
            >
              <p className="mb-2 text-muted" style={{ fontSize: '13px', fontWeight: 600 }}>Available Options</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '40px' }}>
                {dragSourceItems.length === 0 ? (
                  <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>All items moved to answer box</span>
                ) : (
                  dragSourceItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="drag-item"
                      draggable
                      onDragStart={(e) => handleDragStart(e, index, 'source')}
                      style={{
                        padding: '10px 16px',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'grab',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        fontSize: '14px'
                      }}
                    >
                      {item.text}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Answer/Arrangement Box */}
            <div 
              className="drag-answer-box" 
              style={{ 
                flex: 1, 
                minHeight: '120px', 
                padding: '16px', 
                border: '2px solid #3b82f6', 
                borderRadius: '12px', 
                background: '#eff6ff' 
              }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropToAnswer(e, dragAnswerItems.length)}
            >
              <p className="mb-2" style={{ fontSize: '13px', fontWeight: 600, color: '#3b82f6' }}>Your Answer (arrange in order)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '40px' }}>
                {dragAnswerItems.length === 0 ? (
                  <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Drag items here to arrange your answer</span>
                ) : (
                  dragAnswerItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="drag-item"
                      draggable
                      onDragStart={(e) => handleDragStart(e, index, 'answer')}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropToAnswer(e, index)}
                      style={{
                        padding: '10px 16px',
                        background: 'white',
                        border: '1px solid #3b82f6',
                        borderRadius: '8px',
                        cursor: 'grab',
                        boxShadow: '0 2px 6px rgba(59, 130, 246, 0.2)',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ 
                        width: '22px', 
                        height: '22px', 
                        borderRadius: '50%', 
                        background: '#3b82f6', 
                        color: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>{index + 1}</span>
                      {item.text}
                    </div>
                  ))
                )}
              </div>
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
                          type="checkbox"
                          disabled={isPaused}
                          checked={Array.isArray(answers[currentQ._id]?.[rowIdx]) ? answers[currentQ._id][rowIdx].includes(colIdx) : false}
                          onChange={() => {
                            const current = answers[currentQ._id] ? [...answers[currentQ._id]] : [];
                            if (!Array.isArray(current[rowIdx])) current[rowIdx] = [];
                            const rowSelections = [...current[rowIdx]];
                            if (rowSelections.includes(colIdx)) {
                              current[rowIdx] = rowSelections.filter(c => c !== colIdx);
                            } else {
                              current[rowIdx] = [...rowSelections, colIdx];
                            }
                            handleAnswer(currentQ._id, current);
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
        <TutorRationale q={currentQ} revealed={tutorRevealed[currentQ._id]} />
      </div>

      <div className="navigation exam-runtime-navigation">
        <button className="btn btn-secondary" onClick={handleExitSession}>
          Exit
        </button>
        <button className="btn btn-secondary" onClick={handlePrev} disabled={shouldDisablePrev()}>
          Previous
        </button>
        <button className="btn btn-primary" onClick={openQuestionNavigator} disabled={isPaused}>
          Navigator
        </button>
        {currentIndex === questions.length - 1 ? (
          settings?.tutorMode && !getCurrentQuestionRevealed() ? (
            <button className="btn btn-primary" onClick={handleNext} disabled={isPaused}>Check Answer</button>
          ) : (
            <button className="btn btn-success" onClick={handleSubmit} disabled={isPaused}>Submit Test</button>
          )
        ) : (
          <button className="btn btn-primary" onClick={handleNext} disabled={isPaused}>
            {settings?.tutorMode && !getCurrentQuestionRevealed() ? 'Check Answer' : 'Next'}
          </button>
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
      <div style={{ position: 'fixed', right: 14, bottom: 76, zIndex: 1200 }}>
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
                src={firstMediaUrl(currentQ.hotspotImageUrl)}
                data-raw-src={currentQ.hotspotImageUrl}
                data-fallback-index="0"
                onError={handleImageFallback}
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

        {currentQ.type === 'bowtie' && (
          <div className="bowtie-container">
            <div className="bowtie-diagram">
              {/* Top row - Actions */}
              <div className="bowtie-row bowtie-top">
                <div className="bowtie-cell bowtie-action">
                  <label className="bowtie-label">Action to Take</label>
                  <select
                    className="form-control"
                    value={answers[currentQ._id]?.actionLeft || ''}
                    disabled={isPaused}
                    onChange={(e) => {
                      const current = answers[currentQ._id] || {};
                      handleAnswer(currentQ._id, { ...current, actionLeft: e.target.value });
                    }}
                  >
                    <option value="">Select Action</option>
                    {(currentQ.bowtieActions || []).filter(Boolean).map((opt) => (
                      <option key={`al-${opt}`} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="bowtie-cell bowtie-action">
                  <label className="bowtie-label">Action to Take</label>
                  <select
                    className="form-control"
                    value={answers[currentQ._id]?.actionRight || ''}
                    disabled={isPaused}
                    onChange={(e) => {
                      const current = answers[currentQ._id] || {};
                      handleAnswer(currentQ._id, { ...current, actionRight: e.target.value });
                    }}
                  >
                    <option value="">Select Action</option>
                    {(currentQ.bowtieActions || []).filter(Boolean).map((opt) => (
                      <option key={`ar-${opt}`} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bowtie connector lines */}
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
                    value={answers[currentQ._id]?.condition || ''}
                    disabled={isPaused}
                    onChange={(e) => {
                      const current = answers[currentQ._id] || {};
                      handleAnswer(currentQ._id, { ...current, condition: e.target.value });
                    }}
                  >
                    <option value="">Select Condition</option>
                    {(currentQ.bowtieCondition || []).filter(Boolean).map((opt) => (
                      <option key={`c-${opt}`} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bowtie connector lines bottom */}
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
                    value={answers[currentQ._id]?.parameterLeft || ''}
                    disabled={isPaused}
                    onChange={(e) => {
                      const current = answers[currentQ._id] || {};
                      handleAnswer(currentQ._id, { ...current, parameterLeft: e.target.value });
                    }}
                  >
                    <option value="">Select Parameter</option>
                    {(currentQ.bowtieParameters || []).filter(Boolean).map((opt) => (
                      <option key={`pl-${opt}`} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="bowtie-cell bowtie-parameter">
                  <label className="bowtie-label">Parameter to Monitor</label>
                  <select
                    className="form-control"
                    value={answers[currentQ._id]?.parameterRight || ''}
                    disabled={isPaused}
                    onChange={(e) => {
                      const current = answers[currentQ._id] || {};
                      handleAnswer(currentQ._id, { ...current, parameterRight: e.target.value });
                    }}
                  >
                    <option value="">Select Parameter</option>
                    {(currentQ.bowtieParameters || []).filter(Boolean).map((opt) => (
                      <option key={`pr-${opt}`} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Question Navigator Dropdown */}
      {showNavigatorModal && (
        <div
          className="navigator-dropdown-overlay"
          onClick={() => setShowNavigatorModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1040
          }}
        >
          <div
            className="navigator-dropdown-container"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <h5 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1e3a5f' }}>
                <i className="fas fa-list-ol me-2"></i>Question Navigator
              </h5>
              <button
                type="button"
                onClick={() => setShowNavigatorModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{
              padding: '12px 20px',
              borderBottom: '1px solid #e2e8f0',
              background: '#fff',
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              fontSize: '0.85rem'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 16, height: 16, background: '#dbeafe', border: '2px solid #3b82f6', borderRadius: 4 }}></span>
                Current
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 16, height: 16, background: '#3b82f6', borderRadius: 4 }}></span>
                Answered
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 16, height: 16, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4 }}></span>
                Omitted
              </span>
            </div>

            <div style={{
              padding: '16px',
              overflowY: 'auto',
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
              gap: '8px',
              alignContent: 'start'
            }}>
              {questions.map((q, idx) => {
                const isAnswered = q.type === 'case-study'
                  ? q.questions?.some(subQ => caseAnswers[subQ._id] !== undefined)
                  : answers[q._id] !== undefined;
                const isCurrent = idx === currentIndex;

                // Color coding: Blue=answered, White=omitted, Yellow=Current
                let bgColor = '#fff';
                let borderColor = '#cbd5e1';
                let textColor = '#374151';
                
                if (isCurrent) {
                  bgColor = '#fef3c7'; // Yellow
                  borderColor = '#f59e0b';
                  textColor = '#92400e';
                } else if (isAnswered) {
                  bgColor = '#3b82f6'; // Blue
                  borderColor = '#2563eb';
                  textColor = '#fff';
                } else {
                  bgColor = '#fff'; // White for omitted
                  borderColor = '#cbd5e1';
                  textColor = '#374151';
                }

                return (
                  <button
                    key={q._id || idx}
                    type="button"
                    onClick={() => goToQuestion(idx)}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      border: `2px solid ${borderColor}`,
                      backgroundColor: bgColor,
                      color: textColor,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: isCurrent ? '0 2px 8px rgba(245, 158, 11, 0.3)' : 'none'
                    }}
                    title={`Question ${idx + 1}${q.type === 'case-study' ? ' (Case Study)' : ''} - ${isAnswered ? 'Answered' : 'Omitted'}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowNavigatorModal(false)}
                style={{
                  background: '#3b82f6',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '6px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestSession;
