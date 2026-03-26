import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const normalizeTypeLabel = (type) => {
  if (!type) return 'Unknown';
  return String(type)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
};

const letterToOptionText = (letter, options = []) => {
  if (!letter || typeof letter !== 'string') return String(letter ?? '');
  const idx = letter.charCodeAt(0) - 65;
  const text = options?.[idx];
  return text ? `${letter}. ${text}` : letter;
};

const isUnansweredValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    const vals = Object.values(value);
    return vals.length === 0 || vals.every((v) => isUnansweredValue(v));
  }
  return false;
};

const getAnswerStatusMeta = (item) => {
  if (!item) return { label: 'Unknown', tone: 'unknown' };
  if (item.isCorrect === true) return { label: 'Correct', tone: 'correct' };
  if (item.isCorrect === 'partial') return { label: 'Partially Correct', tone: 'partial' };
  if (isUnansweredValue(item.userAnswer)) return { label: 'Unanswered', tone: 'unanswered' };
  return { label: 'Incorrect', tone: 'incorrect' };
};

const formatDateTimeLabel = (value) => {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatMinutesLabel = (minutes) => {
  const num = Number(minutes);
  if (!Number.isFinite(num)) return '-';
  if (num < 1) return `${Math.max(1, Math.round(num * 60))} sec`;
  if (Math.abs(num - Math.round(num)) < 0.001) return `${Math.round(num)} min`;
  return `${num.toFixed(2)} min`;
};

const formatQuestionTimeLabel = (item) => {
  const raw = item?.timeSpent ?? item?.timeSpentSeconds ?? item?.durationSeconds;
  if (raw === null || raw === undefined || raw === '') return '-';
  const num = Number(raw);
  if (!Number.isFinite(num)) return String(raw);
  if (num >= 60) {
    const min = Math.floor(num / 60);
    const sec = Math.round(num % 60);
    return `${min}m ${sec}s`;
  }
  return `${Math.round(num)} sec`;
};

const formatMarksLabel = (item) => {
  // For SATA questions, show earned/total marks (each correct option = 1 point)
  const itemType = String(item?.type || '').toLowerCase();
  if (itemType === 'sata') {
    const earned = item?.earnedMarks ?? 0;
    const total = item?.totalMarks ?? 1;
    return `${earned}/${total}`;
  }

  // For other questions, each question = 1 point
  const mark = item?.marks ?? item?.scorePerQuestion ?? item?.points;
  if (mark === null || mark === undefined || mark === '') {
    return item?.isCorrect === true ? '1/1' : '0/1';
  }
  const total = item?.totalMarks ?? item?.maxMarks ?? 1;
  const earned = item?.earnedMarks ?? (item?.isCorrect === true ? mark : 0);
  return `${earned}/${total}`;
};

const formatAnswerValue = (item, value) => {
  if (isUnansweredValue(value)) return 'Not answered';

  if (item.type === 'multiple-choice') {
    return letterToOptionText(String(value), item.options);
  }

  if (item.type === 'sata') {
    if (!Array.isArray(value) || value.length === 0) return 'None';
    return value.map((v) => letterToOptionText(String(v), item.options)).join('; ');
  }

  if (item.type === 'fill-blank') {
    return String(value);
  }

  if (item.type === 'highlight') {
    return `"${String(value)}"`;
  }

  if (item.type === 'drag-drop') {
    return String(value).replace(/\|/g, ' -> ');
  }

  if (item.type === 'hotspot') {
    return `Selected target: ${String(value)}`;
  }

  if (item.type === 'cloze-dropdown') {
    if (typeof value !== 'object' || value === null) return String(value ?? '');
    return Object.entries(value)
      .map(([key, val]) => `${key}: ${String(val ?? '')}`)
      .join(' | ');
  }

  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const formatCorrectAnswer = (item) => {
  if (item.type === 'fill-blank' && typeof item.correctAnswer === 'string') {
    return item.correctAnswer.includes(';')
      ? item.correctAnswer.split(';').map((s) => s.trim()).join(' or ')
      : item.correctAnswer;
  }

  if (item.type === 'cloze-dropdown' && item.correctAnswer && typeof item.correctAnswer === 'object') {
    return Object.entries(item.correctAnswer)
      .map(([key, val]) => `${key}: ${String(val ?? '')}`)
      .join(' | ');
  }

  return formatAnswerValue(item, item.correctAnswer);
};

const resolveMediaCandidates = (rawUrl) => {
  const value = String(rawUrl || '').trim();
  if (!value) return [];
  const normalized = value.replace(/\\/g, '/');
  const apiBase = String(axios.defaults.baseURL || '').trim().replace(/\/+$/, '');
  const origin = window.location.origin.replace(/\/+$/, '');
  const out = [];
  const pushUnique = (next) => {
    const url = String(next || '').trim();
    if (!url) return;
    if (!out.includes(url)) out.push(url);
  };

  if (/^data:/i.test(normalized)) return [normalized];
  if (/^https?:\/\//i.test(normalized)) {
    pushUnique(normalized);
  } else if (normalized.startsWith('/')) {
    if (normalized.startsWith('/api/')) pushUnique(apiBase ? `${apiBase}${normalized}` : '');
    pushUnique(`${origin}${normalized}`);
    pushUnique(apiBase ? `${apiBase}${normalized}` : '');
    pushUnique(normalized);
  } else {
    pushUnique(`${origin}/${normalized}`);
    pushUnique(apiBase ? `${apiBase}/${normalized}` : '');
    pushUnique(normalized);
  }
  return out;
};

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

const TestReviewExamView = ({
  testResult,
  onBack,
  backLabel = 'Back',
  titlePrefix = 'Test Review',
  actions = null,
  runtimeMode = false,
}) => {
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [questionRuntimeMode, setQuestionRuntimeMode] = useState(false);
  const [runtimeBooting, setRuntimeBooting] = useState(false);
  const [activeSummaryTab, setActiveSummaryTab] = useState('results');
  const [answerFilter, setAnswerFilter] = useState('all');

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

  useEffect(() => {
    setActiveQuestionIndex(0);
    setQuestionRuntimeMode(false);
    setRuntimeBooting(false);
    setActiveSummaryTab('results');
    setAnswerFilter('all');
  }, [testResult?._id, testResult?.date]);

  const answers = Array.isArray(testResult?.answers) ? testResult.answers : [];

  const summary = useMemo(() => {
    const partiallyCorrect = answers.filter((a) => a?.isCorrect === 'partial').length;
    const correct = answers.filter((a) => a?.isCorrect === true).length;
    const unanswered = answers.filter(
      (a) => isUnansweredValue(a?.userAnswer)
    ).length;
    const incorrect = Math.max(answers.length - correct - unanswered - partiallyCorrect, 0);

    // Calculate total points (sum of earnedMarks / totalMarks)
    let totalEarnedMarks = 0;
    let totalPossibleMarks = 0;
    answers.forEach((a) => {
      const earned = Number(a?.earnedMarks ?? (a?.isCorrect === true ? 1 : 0));
      const total = Number(a?.totalMarks ?? 1);
      totalEarnedMarks += earned;
      totalPossibleMarks += total;
    });

    const sectionsMap = {};
    answers.forEach((a) => {
      const section = a.category || a.subcategory || 'Uncategorized';
      if (!sectionsMap[section]) {
        sectionsMap[section] = {
          section,
          total: 0,
          correct: 0,
          partiallyCorrect: 0,
          incorrect: 0,
          unanswered: 0,
        };
      }
      sectionsMap[section].total += 1;
      if (a.isCorrect === true) sectionsMap[section].correct += 1;
      else if (a.isCorrect === 'partial') sectionsMap[section].partiallyCorrect += 1;
      else if (isUnansweredValue(a.userAnswer)) sectionsMap[section].unanswered += 1;
      else sectionsMap[section].incorrect += 1;
    });

    return {
      correct,
      partiallyCorrect,
      incorrect,
      unanswered,
      totalEarnedMarks,
      totalPossibleMarks,
      sections: Object.values(sectionsMap).sort((a, b) => b.total - a.total),
    };
  }, [answers]);

  const percent = Number(testResult?.percentage) || 0;
  const totalQuestions = Number(testResult?.totalQuestions) || answers.length || 0;
  const score = Number(testResult?.score) || 0;
  const dateLabel = testResult?.date ? new Date(testResult.date).toLocaleDateString('en-GB') : '';
  const timeTaken = testResult?.timeTaken;
  const timeTakenLabel = formatMinutesLabel(timeTaken);
  const active = answers[activeQuestionIndex];
  const candidateName =
    testResult?.studentName ||
    testResult?.userName ||
    testResult?.user?.name ||
    testResult?.student?.name ||
    testResult?.email ||
    'Student';

  const startTimeRaw = testResult?.startTime || testResult?.startedAt || testResult?.date;
  const startDate = startTimeRaw ? new Date(startTimeRaw) : null;
  const hasStartDate = startDate && !Number.isNaN(startDate.getTime());
  const timeTakenMinutesNum = Number(timeTaken);
  const endDate =
    testResult?.endTime || testResult?.completedAt
      ? new Date(testResult.endTime || testResult.completedAt)
      : hasStartDate && Number.isFinite(timeTakenMinutesNum)
        ? new Date(startDate.getTime() + timeTakenMinutesNum * 60 * 1000)
        : null;

  const reviewRows = useMemo(
    () =>
      answers.map((item, idx) => ({
        ...item,
        index: idx,
        status: getAnswerStatusMeta(item),
        sectionLabel: item.category || item.subcategory || 'General',
        qidLabel: item.qid || item.questionCode || (item.questionId ? String(item.questionId).slice(-6) : `${idx + 1}`),
        difficultyLabel: item.difficulty ? normalizeTypeLabel(item.difficulty) : normalizeTypeLabel(item.type || 'Unknown'),
        marksLabel: formatMarksLabel(item),
        timeSpentLabel:
          formatQuestionTimeLabel(item) === '-' && totalQuestions > 0 && Number.isFinite(Number(timeTaken))
            ? formatQuestionTimeLabel({ timeSpentSeconds: Math.round((Number(timeTaken) * 60) / totalQuestions) })
            : formatQuestionTimeLabel(item),
      })),
    [answers, totalQuestions, timeTaken]
  );

  const filteredReviewRows = useMemo(() => reviewRows.filter((row) => {
    if (answerFilter === 'all') return true;
    if (answerFilter === 'correct') return row.status.tone === 'correct';
    if (answerFilter === 'incorrect') return row.status.tone === 'incorrect';
    if (answerFilter === 'unanswered') return row.status.tone === 'unanswered';
    return true;
  }), [answerFilter, reviewRows]);

  const analysisBlocks = useMemo(() => {
    const bySubject = {};
    const bySystem = {};

    answers.forEach((item) => {
      const subjectKey = item.category || 'General';
      const systemKey = item.subcategory || item.category || 'General';
      const isCorrect = item?.isCorrect === true;

      if (!bySubject[subjectKey]) bySubject[subjectKey] = { name: subjectKey, total: 0, correct: 0 };
      if (!bySystem[systemKey]) bySystem[systemKey] = { name: systemKey, total: 0, correct: 0 };

      bySubject[subjectKey].total += 1;
      bySystem[systemKey].total += 1;

      if (isCorrect) {
        bySubject[subjectKey].correct += 1;
        bySystem[systemKey].correct += 1;
      }
    });

    const sortRows = (obj) =>
      Object.values(obj)
        .map((row) => ({
          ...row,
          pct: row.total ? Math.round((row.correct / row.total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

    return {
      subjects: sortRows(bySubject),
      systems: sortRows(bySystem),
    };
  }, [answers]);

  const difficultyMeter = useMemo(() => {
    const weight = { easy: 1, medium: 2, hard: 3 };
    const vals = answers
      .map((item) => weight[String(item?.difficulty || '').toLowerCase()])
      .filter(Boolean);
    if (!vals.length) return { score: 50, label: 'Medium' };
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const score = Math.round(((avg - 1) / 2) * 100);
    const label = avg < 1.67 ? 'Easy' : avg < 2.34 ? 'Medium' : 'Hard';
    return { score, label };
  }, [answers]);

  const answerChangeSummary = useMemo(() => {
    const out = {
      correctToIncorrect: 0,
      incorrectToCorrect: 0,
      incorrectToIncorrect: 0,
    };

    answers.forEach((item) => {
      const changeType = String(item?.answerChangeType || item?.changeType || '').toLowerCase();
      if (changeType === 'correct-to-incorrect') out.correctToIncorrect += 1;
      else if (changeType === 'incorrect-to-correct') out.incorrectToCorrect += 1;
      else if (changeType === 'incorrect-to-incorrect') out.incorrectToIncorrect += 1;
    });

    return out;
  }, [answers]);

  const sectionChartMax = Math.max(
    1,
    ...summary.sections.map((row) => row.correct + row.partiallyCorrect + row.incorrect + row.unanswered)
  );

  const scrollToQuestionList = () => {
    if (typeof document === 'undefined') return;
    const listEl = document.querySelector('.exam-review-questions');
    if (listEl) {
      listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const input = window.prompt(`Go to question number (1-${Math.max(answers.length, 1)})`, String(activeQuestionIndex + 1));
    if (!input) return;
    const target = Number(input);
    if (!Number.isInteger(target) || target < 1 || target > Math.max(answers.length, 1)) return;
    setActiveQuestionIndex(target - 1);
  };

  const openQuestionReviewRuntime = (index) => {
    setActiveQuestionIndex(index);
    setRuntimeBooting(true);
    window.setTimeout(() => {
      setQuestionRuntimeMode(true);
      setRuntimeBooting(false);
    }, 850);
  };

  const goBackFromRuntimeQuestion = () => {
    setQuestionRuntimeMode(false);
    setRuntimeBooting(false);
    setTimeout(() => {
      scrollToQuestionList();
    }, 0);
  };

  const renderQuestionReviewRuntime = () => {
    if (!active) return null;
    const runtimeStatus = getAnswerStatusMeta(active);
    const optionPercent = (choiceLetter) => {
      const raw = active?.optionStats?.[choiceLetter]
        ?? active?.choicePercentages?.[choiceLetter]
        ?? active?.percentages?.[choiceLetter];
      const num = Number(raw);
      return Number.isFinite(num) && num > 0 ? ` (${num}%)` : '';
    };
    const reviewStats = [
      { label: 'Points', value: formatMarksLabel(active) },
      { label: 'Scoring Rule', value: active?.scoringRule || 'Standard' },
      { label: 'Time Spent', value: formatQuestionTimeLabel(active) },
    ];

    return (
      <div className="test-session exam-runtime-skin exam-review-question-runtime app-no-copy">
        <div className="test-header">
          <div className="d-flex align-items-center">
            <h3 className="mb-0 me-3">Review {activeQuestionIndex + 1} of {Math.max(answers.length, 1)}</h3>
          </div>
          <div className={`timer exam-review-runtime-status ${runtimeStatus.tone}`}>{runtimeStatus.label}</div>
        </div>

        <div className="question-container exam-runtime-question-panel exam-review-runtime-split">
          <div className="exam-review-runtime-question-column">
            <p className="question-text">{active.questionText || 'No question text'}</p>

            {Array.isArray(active.options) && active.options.length > 0 && (
              <div className="exam-review-runtime-option-list">
                {active.options.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const userAns = active.userAnswer;
                  const correctAns = active.correctAnswer;
                  const selected = Array.isArray(userAns) ? userAns.includes(letter) : userAns === letter;
                  const correct = Array.isArray(correctAns) ? correctAns.includes(letter) : correctAns === letter;
                  const isWrong = selected && !correct;
                  const isCorrectNotSelected = correct && !selected;

                  // Determine background color
                  let bgStyle = {};
                  if (correct) {
                    bgStyle = {
                      backgroundColor: '#dcfce7',
                      border: '2px solid #22c55e',
                      borderRadius: '8px',
                      padding: '10px 12px',
                    };
                  }
                  if (isWrong) {
                    bgStyle = {
                      backgroundColor: '#fee2e2',
                      border: '2px solid #ef4444',
                      borderRadius: '8px',
                      padding: '10px 12px',
                    };
                  }

                  return (
                    <div
                      key={`${letter}-${idx}`}
                      className={`exam-review-runtime-option-row ${selected ? 'selected' : ''} ${correct ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                      style={bgStyle}
                    >
                      <span className="exam-review-runtime-option-indicator" />
                      <span className="exam-review-runtime-option-number">{idx + 1}.</span>
                      <span
                        className="exam-review-runtime-option-text"
                        style={isWrong ? { textDecoration: 'line-through', color: '#dc2626' } : correct ? { color: '#166534', fontWeight: 600 } : {}}
                      >
                        {opt}{optionPercent(letter)}
                        {correct && <span style={{ marginLeft: 8, fontSize: '0.85em' }}>✓</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {active.type === 'hotspot' && (
              <div className="mt-3">
                <div className="label mb-1">Hotspot Target</div>
                <div className="value">{formatAnswerValue(active, active.userAnswer)}</div>
                <div className="small text-muted mt-1">Correct: {formatCorrectAnswer(active)}</div>
              </div>
            )}

            {active.type === 'cloze-dropdown' && (
              <div className="mt-3">
                <div className="label mb-1">Cloze Responses</div>
                <div className="value">{formatAnswerValue(active, active.userAnswer)}</div>
                <div className="small text-muted mt-1">Correct: {formatCorrectAnswer(active)}</div>
              </div>
            )}

            <div className="exam-review-runtime-stats">
              {reviewStats.map((item) => (
                <div key={item.label} className="exam-review-runtime-stat-card">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="exam-review-runtime-explanation-column">
            <div className="exam-review-runtime-explanation-tab">Explanation</div>
            <div className="exam-review-rationale-box exam-review-rationale-runtime">
              <div className="exam-review-answer-grid exam-review-answer-grid-runtime">
                <div>
                  <div className="label">Your answer</div>
                  <div className="value">{formatAnswerValue(active, active.userAnswer)}</div>
                </div>
                <div>
                  <div className="label">Correct answer</div>
                  <div className="value">{formatCorrectAnswer(active)}</div>
                </div>
              </div>

              {active.rationale && (<div className="rationale-text-block"><strong>Rationale:</strong> {active.rationale}</div>)}
              {active.rationaleImageUrl && (
                <div className="mt-2">
                  <img src={firstMediaUrl(active.rationaleImageUrl)} data-raw-src={active.rationaleImageUrl} data-fallback-index="0" onError={handleImageFallback} alt="Rationale visual" style={{ maxWidth: '320px', width: '100%', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation buttons at the bottom */}
        <div className="exam-inline-toolbar" style={{ marginTop: 'auto', padding: '12px 0' }}>
          <button type="button" className="exam-toolbar-btn" onClick={goBackFromRuntimeQuestion}>
            <i className="fas fa-arrow-left"></i> Back to Summary
          </button>
          <button
            type="button"
            className="exam-toolbar-btn"
            onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
            disabled={activeQuestionIndex === 0}
          >
            <i className="fas fa-arrow-left"></i> Previous
          </button>
          <button type="button" className="exam-toolbar-btn" onClick={scrollToQuestionList}>
            <i className="fas fa-map"></i> Navigator
          </button>
          <button
            type="button"
            className="exam-toolbar-btn"
            onClick={() => setActiveQuestionIndex((prev) => Math.min(answers.length - 1, prev + 1))}
            disabled={activeQuestionIndex >= answers.length - 1}
          >
            Next <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    );
  };


  if (runtimeMode && runtimeBooting) {
    return (
      <div className="exam-boot-screen">
        <div className="exam-boot-card">
          <div className="exam-boot-top">
            <div className="exam-boot-title">Loading review interface...</div>
            <div className="exam-boot-percent">100%</div>
          </div>
          <div className="exam-boot-bar">
            <div className="exam-boot-bar-fill" style={{ width: '100%' }}></div>
          </div>
          <div className="exam-boot-subtitle">Generating dedicated question pool</div>
        </div>
      </div>
    );
  }

  if (runtimeMode && questionRuntimeMode) {
    return renderQuestionReviewRuntime();
  }

  return (
    <div className="exam-review-shell exam-review-runtime app-no-copy">
      <div className="exam-review-topbar">
        <div className="exam-review-topbar-left">
          <button type="button" className="btn btn-link p-0" onClick={onBack}>
            {backLabel}
          </button>
        </div>
        <div className="exam-review-topbar-center">
          {testResult?.testName || titlePrefix}
        </div>
        <div className="exam-review-topbar-right">
          Review {Math.min(activeQuestionIndex + 1, Math.max(answers.length, 1))} of {Math.max(answers.length, 1)}
        </div>
      </div>

      <div className="exam-review-card exam-review-report-card">
        <div className="exam-review-header">
          <div>
            <h3>{titlePrefix}{dateLabel ? ` - ${dateLabel}` : ''}</h3>
            <p className="exam-review-subtitle">
              {testResult?.testName || 'Exam Review'}{timeTakenLabel !== '-' ? ` - ${timeTakenLabel}` : ''}
            </p>
          </div>
          {actions && <div className="exam-review-actions">{actions}</div>}
        </div>

        <div className="exam-review-summary-tabs" role="tablist" aria-label="Summary tabs">
          <button
            type="button"
            className={`exam-review-summary-tab ${activeSummaryTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveSummaryTab('results')}
          >
            Test Results
          </button>
          <button
            type="button"
            className={`exam-review-summary-tab ${activeSummaryTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveSummaryTab('analysis')}
          >
            Test Analysis
          </button>
        </div>

        <div className="exam-review-filter-strip">
          {[
            { key: 'all', label: 'Unused', count: reviewRows.length },
            { key: 'incorrect', label: 'Incorrect', count: summary.incorrect },
            { key: 'unanswered', label: 'Omitted', count: summary.unanswered },
            { key: 'correct', label: 'Correct', count: summary.correct },
          ].map((item) => (
            <label key={item.key} className={`exam-review-filter-pill ${answerFilter === item.key ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={answerFilter === item.key}
                onChange={() => setAnswerFilter((prev) => (prev === item.key ? 'all' : item.key))}
              />
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </label>
          ))}
          <div className="exam-review-filter-total">Total Available <strong>{reviewRows.length}</strong></div>
        </div>

        <div className="exam-review-summary-hero">
          <div className="exam-review-summary-hero-head">
            <h4>Review Exam</h4>
          </div>
          <div className="exam-review-summary-hero-title">{testResult?.testName || 'NCLEX KEYS Exam'}</div>
          <div className="exam-review-summary-scoreline">
            <span>Your Score</span>
            <strong>{percent}%</strong>
          </div>
          <div className="exam-review-score-progress">
            <div
              className="exam-review-score-progress-fill"
              style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
            />
            <span className="exam-review-score-progress-tag">{percent}%</span>
          </div>
        </div>

        <div className="exam-review-insight-strip">
          <div className="exam-review-insight-card">
            <span>Points Scored</span>
            <strong>{summary.totalEarnedMarks}/{summary.totalPossibleMarks}</strong>
            <div className="exam-review-insight-progress"><i style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} /></div>
          </div>
          <div className="exam-review-insight-card">
            <span>Difficulty Level</span>
            <strong>{difficultyMeter.label}</strong>
            <div className="exam-review-insight-meter"><i style={{ left: `${difficultyMeter.score}%` }} /></div>
          </div>
          <div className="exam-review-insight-card">
            <span>Answer Changes</span>
            <strong>{answerChangeSummary.correctToIncorrect + answerChangeSummary.incorrectToCorrect + answerChangeSummary.incorrectToIncorrect}</strong>
            <small>C→I: {answerChangeSummary.correctToIncorrect} · I→C: {answerChangeSummary.incorrectToCorrect} · I→I: {answerChangeSummary.incorrectToIncorrect}</small>
          </div>
          <div className="exam-review-insight-card">
            <span>Time Settings</span>
            <strong>{timeTakenLabel}</strong>
            <small>Mode: {testResult?.mode || 'Timed'} · Pool: {totalQuestions} Qs</small>
          </div>
        </div>

        {activeSummaryTab === 'analysis' ? (
          <div className="exam-review-analysis-dashboard">
            {/* Top Stats Row */}
            <div className="analysis-stats-row">
              <div className="analysis-stat-card">
                <div className="analysis-stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a' }}>
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="analysis-stat-info">
                  <span className="analysis-stat-label">Correct Answers</span>
                  <strong className="analysis-stat-value correct-value">{summary.correct}</strong>
                  <div className="analysis-stat-progress">
                    <div className="analysis-progress-bar" style={{ width: `${totalQuestions > 0 ? (summary.correct / totalQuestions) * 100 : 0}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)' }}></div>
                  </div>
                </div>
              </div>
              <div className="analysis-stat-card">
                <div className="analysis-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' }}>
                  <i className="fas fa-times-circle"></i>
                </div>
                <div className="analysis-stat-info">
                  <span className="analysis-stat-label">Incorrect Answers</span>
                  <strong className="analysis-stat-value incorrect-value">{summary.incorrect}</strong>
                  <div className="analysis-stat-progress">
                    <div className="analysis-progress-bar" style={{ width: `${totalQuestions > 0 ? (summary.incorrect / totalQuestions) * 100 : 0}%`, background: 'linear-gradient(90deg, #f87171, #dc2626)' }}></div>
                  </div>
                </div>
              </div>
              <div className="analysis-stat-card">
                <div className="analysis-stat-icon" style={{ background: 'rgba(251, 146, 60, 0.15)', color: '#ea580c' }}>
                  <i className="fas fa-signal"></i>
                </div>
                <div className="analysis-stat-info">
                  <span className="analysis-stat-label">Difficulty Level</span>
                  <strong className="analysis-stat-value">{difficultyMeter.label}</strong>
                  <div className="analysis-difficulty-meter">
                    <div className="difficulty-track">
                      <div className="difficulty-indicator" style={{ left: `${difficultyMeter.score}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="analysis-stat-card">
                <div className="analysis-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb' }}>
                  <i className="fas fa-sync-alt"></i>
                </div>
                <div className="analysis-stat-info">
                  <span className="analysis-stat-label">Answer Changes</span>
                  <strong className="analysis-stat-value">{answerChangeSummary.correctToIncorrect + answerChangeSummary.incorrectToCorrect}</strong>
                  <small className="analysis-stat-detail">C→I: {answerChangeSummary.correctToIncorrect} · I→C: {answerChangeSummary.incorrectToCorrect}</small>
                </div>
              </div>
            </div>

            {/* Subjects and Systems Tables */}
            <div className="analysis-tables-grid">
              {/* Subjects Table */}
              <div className="analysis-table-section">
                <div className="analysis-section-header">
                  <h4><i className="fas fa-book-medical"></i> Subjects</h4>
                  <span className="analysis-section-count">{analysisBlocks.subjects.length} items</span>
                </div>
                <div className="analysis-table-container">
                  {analysisBlocks.subjects.length === 0 ? (
                    <p className="text-muted p-3">No subject data available</p>
                  ) : (
                    analysisBlocks.subjects.map((row, idx) => (
                      <div key={`subject-${row.name}-${idx}`} className="analysis-row">
                        <div className="analysis-row-name">{row.name}</div>
                        <div className="analysis-row-data">
                          <div className="analysis-progress-wrapper">
                            <div className="analysis-progress-track">
                              <div className="analysis-progress-fill" style={{ width: `${row.pct}%` }}></div>
                            </div>
                            <span className="analysis-progress-pct">{row.pct}%</span>
                          </div>
                          <div className="analysis-row-stats">
                            <span className="stat-correct"><i className="fas fa-check"></i> {row.correct}</span>
                            <span className="stat-total">/ {row.total}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Systems Table */}
              <div className="analysis-table-section">
                <div className="analysis-section-header">
                  <h4><i className="fas fa-heartbeat"></i> Systems</h4>
                  <span className="analysis-section-count">{analysisBlocks.systems.length} items</span>
                </div>
                <div className="analysis-table-container">
                  {analysisBlocks.systems.length === 0 ? (
                    <p className="text-muted p-3">No system data available</p>
                  ) : (
                    analysisBlocks.systems.map((row, idx) => (
                      <div key={`system-${row.name}-${idx}`} className="analysis-row">
                        <div className="analysis-row-name">{row.name}</div>
                        <div className="analysis-row-data">
                          <div className="analysis-progress-wrapper">
                            <div className="analysis-progress-track">
                              <div className="analysis-progress-fill" style={{ width: `${row.pct}%` }}></div>
                            </div>
                            <span className="analysis-progress-pct">{row.pct}%</span>
                          </div>
                          <div className="analysis-row-stats">
                            <span className="stat-correct"><i className="fas fa-check"></i> {row.correct}</span>
                            <span className="stat-total">/ {row.total}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeSummaryTab === 'results' ? (
          <>
        <div className="exam-review-report-grid">
          <div className="exam-review-report-metrics">
            <div className="exam-review-report-metric">
              <span>Total Questions</span>
              <strong>{totalQuestions}</strong>
            </div>
            <div className="exam-review-report-metric">
              <span>Points</span>
              <strong>{summary.totalEarnedMarks}/{summary.totalPossibleMarks}</strong>
            </div>
            <div className="exam-review-report-metric">
              <span>Score</span>
              <strong>{score}/{totalQuestions}</strong>
            </div>
            <div className="exam-review-report-metric">
              <span>Time Taken</span>
              <strong>{timeTakenLabel}</strong>
            </div>
          </div>

          <div className="exam-review-score-card exam-review-score-card-report">
            <div
              className="exam-review-score-ring"
              style={{ '--score-angle': `${Math.max(0, Math.min(100, percent)) * 3.6}deg` }}
            >
              <div className="exam-review-score-inner">
                <div className="exam-review-score-value">{percent}%</div>
                <div className="exam-review-score-label">Score</div>
              </div>
            </div>
            <div className="exam-review-score-meta exam-review-score-meta-report">
              <div><strong>{summary.totalEarnedMarks}</strong> / {summary.totalPossibleMarks} Points</div>
              <div>{summary.correct} Correct of {totalQuestions}</div>
            </div>
          </div>

          <div className="exam-review-report-side">
            <div className="exam-review-report-breakdown">
              <div className="exam-review-breakdown-row"><span>Correct</span><strong className="ok">{summary.correct}</strong></div>
              <div className="exam-review-breakdown-row"><span>Partially Correct</span><strong>{summary.partiallyCorrect}</strong></div>
              <div className="exam-review-breakdown-row"><span>Incorrect</span><strong className="bad">{summary.incorrect}</strong></div>
              <div className="exam-review-breakdown-row"><span>Unanswered</span><strong>{summary.unanswered}</strong></div>
            </div>

            <div className="exam-review-report-candidate">
              <div className="exam-review-candidate-name">{candidateName}</div>
              <div className="exam-review-candidate-line">
                <span>Start Time</span>
                <strong>{formatDateTimeLabel(startDate)}</strong>
              </div>
              <div className="exam-review-candidate-line">
                <span>End Time</span>
                <strong>{formatDateTimeLabel(endDate)}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="exam-review-sections">
          <h4>Section Wise Summary</h4>
          {summary.sections.length === 0 ? (
            <p className="text-muted mb-0">No section data available.</p>
          ) : (
            <>
              <div className="exam-review-section-chart-card">
                {summary.sections.map((row) => {
                  const total = row.correct + row.partiallyCorrect + row.incorrect + row.unanswered;
                  const widthPct = `${Math.max(8, Math.round((total / sectionChartMax) * 100))}%`;
                  const correctPct = total ? (row.correct / total) * 100 : 0;
                  const partialPct = total ? (row.partiallyCorrect / total) * 100 : 0;
                  const incorrectPct = total ? (row.incorrect / total) * 100 : 0;
                  const unansweredPct = total ? (row.unanswered / total) * 100 : 0;

                  return (
                    <div key={`bar-${row.section}`} className="exam-review-section-bar-row">
                      <div className="exam-review-section-bar-label">{row.section}</div>
                      <div className="exam-review-section-bar-track" style={{ width: widthPct }}>
                        <span className="seg correct" style={{ width: `${correctPct}%` }} />
                        <span className="seg partial" style={{ width: `${partialPct}%` }} />
                        <span className="seg incorrect" style={{ width: `${incorrectPct}%` }} />
                        <span className="seg unanswered" style={{ width: `${unansweredPct}%` }} />
                      </div>
                      <div className="exam-review-section-bar-total">{total}</div>
                    </div>
                  );
                })}
              </div>

              <div className="exam-review-table-wrap">
                <table className="exam-review-table compact">
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>Correct</th>
                      <th>Partially</th>
                      <th>Incorrect</th>
                      <th>Unanswered</th>
                      <th>Total</th>
                      <th>Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.sections.map((row) => {
                      const acc = row.total ? Math.round((row.correct / row.total) * 100) : 0;
                      return (
                        <tr key={row.section}>
                          <td>{row.section}</td>
                          <td>{row.correct}</td>
                          <td>{row.partiallyCorrect}</td>
                          <td>{row.incorrect}</td>
                          <td>{row.unanswered}</td>
                          <td>{row.total}</td>
                          <td>{acc}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="exam-review-questions">
          <h4>Question Review</h4>
          {filteredReviewRows.length === 0 ? (
            <p className="text-muted mb-0">No question review data available.</p>
          ) : (
            <div className="exam-review-table-wrap exam-review-table-wrap-report">
              <table className="exam-review-table exam-review-table-report">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>QID</th>
                    <th>Answer Status</th>
                    <th>Difficulty</th>
                    <th>Points</th>
                    <th>Section</th>
                    <th>Time Spent</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviewRows.map((row) => (
                    <tr
                      key={`${row.questionId || 'q'}-${row.index}`}
                      className={row.index === activeQuestionIndex ? 'active' : ''}
                      onClick={() => setActiveQuestionIndex(row.index)}
                    >
                      <td>{row.index + 1}</td>
                      <td>{row.qidLabel}</td>
                      <td>
                        <span className={`exam-review-status ${row.status.tone}`}>
                          {row.status.label}
                        </span>
                      </td>
                      <td>{row.difficultyLabel}</td>
                      <td>{row.marksLabel}</td>
                      <td>{row.sectionLabel}</td>
                      <td>{row.timeSpentLabel}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary exam-review-row-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveQuestionIndex(row.index);
                            openQuestionReviewRuntime(row.index);
                          }}
                        >
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
          </>
        ) : null}

      </div>
    </div>
  );
};

export default TestReviewExamView;
