import React, { useEffect, useMemo, useState } from 'react';

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
  }, [testResult?._id, testResult?.date]);

  const answers = Array.isArray(testResult?.answers) ? testResult.answers : [];

  const summary = useMemo(() => {
    const partiallyCorrect = answers.filter((a) => a?.isCorrect === 'partial').length;
    const correct = answers.filter((a) => a?.isCorrect === true).length;
    const unanswered = answers.filter(
      (a) => isUnansweredValue(a?.userAnswer)
    ).length;
    const incorrect = Math.max(answers.length - correct - unanswered - partiallyCorrect, 0);

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
  const isFirstQuestion = activeQuestionIndex <= 0;
  const isLastQuestion = activeQuestionIndex >= Math.max(answers.length - 1, 0);
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
        difficultyLabel: item.difficulty ? normalizeTypeLabel(item.difficulty) : '-',
        marksLabel: formatMarksLabel(item),
        timeSpentLabel: formatQuestionTimeLabel(item),
      })),
    [answers]
  );

  const sectionChartMax = Math.max(
    1,
    ...summary.sections.map((row) => row.correct + row.partiallyCorrect + row.incorrect + row.unanswered)
  );

  const goToPrevQuestion = () => {
    setActiveQuestionIndex((prev) => Math.max(prev - 1, 0));
  };

  const goToNextQuestion = () => {
    setActiveQuestionIndex((prev) => Math.min(prev + 1, Math.max(answers.length - 1, 0)));
  };

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
    setQuestionRuntimeMode(true);
  };

  const goBackFromRuntimeQuestion = () => {
    setQuestionRuntimeMode(false);
    setTimeout(() => {
      scrollToQuestionList();
    }, 0);
  };

  const renderQuestionReviewRuntime = () => {
    if (!active) return null;
    const runtimeStatus = getAnswerStatusMeta(active);

    return (
      <div className="test-session exam-runtime-skin exam-review-question-runtime app-no-copy">
        <div className="test-header">
          <div className="d-flex align-items-center">
            <h3 className="mb-0 me-3">Review {activeQuestionIndex + 1} of {Math.max(answers.length, 1)}</h3>
          </div>
          <div className={`timer exam-review-runtime-status ${runtimeStatus.tone}`}>{runtimeStatus.label}</div>
        </div>

        <div className="exam-inline-toolbar">
          <button type="button" className="exam-toolbar-btn" onClick={goBackFromRuntimeQuestion}>
            <i className="fas fa-arrow-left"></i> Back to Summary
          </button>
          <button type="button" className="exam-toolbar-btn" onClick={scrollToQuestionList}>
            <i className="fas fa-list"></i> Navigator
          </button>
        </div>

        <div className="question-container exam-runtime-question-panel">
          <p className="question-text">{active.questionText || 'No question text'}</p>

          {Array.isArray(active.options) && active.options.length > 0 && (
            <div className="options">
              {active.options.map((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const userAns = active.userAnswer;
                const correctAns = active.correctAnswer;
                const selected = Array.isArray(userAns) ? userAns.includes(letter) : userAns === letter;
                const correct = Array.isArray(correctAns) ? correctAns.includes(letter) : correctAns === letter;
                return (
                  <div
                    key={`${letter}-${idx}`}
                    className={`option ${selected ? 'selected' : ''} ${correct ? 'review-correct-option' : ''}`}
                  >
                    <span className="option-letter">{letter}</span>
                    <span>{opt}</span>
                    {selected && <span className="exam-review-option-chip your-answer">Your answer</span>}
                    {correct && <span className="exam-review-option-chip correct-answer">Correct</span>}
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

          {active.rationale && (
            <div className="exam-review-rationale-box exam-review-rationale-runtime">
              <strong>Rationale:</strong> {active.rationale}
            </div>
          )}
        </div>

        <div className="navigation exam-runtime-navigation">
          <button type="button" className="btn btn-secondary" onClick={goBackFromRuntimeQuestion}>
            Back
          </button>
          <button type="button" className="btn btn-secondary" onClick={goToPrevQuestion} disabled={isFirstQuestion}>
            Previous
          </button>
          <button type="button" className="btn btn-primary" onClick={scrollToQuestionList}>
            Navigator
          </button>
          <button type="button" className="btn btn-primary" onClick={goToNextQuestion} disabled={isLastQuestion}>
            Next
          </button>
        </div>
      </div>
    );
  };

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

        <div className="exam-review-report-grid">
          <div className="exam-review-report-metrics">
            <div className="exam-review-report-metric">
              <span>Total Questions</span>
              <strong>{totalQuestions}</strong>
            </div>
            <div className="exam-review-report-metric">
              <span>Marks / Grades</span>
              <strong>{score}/{totalQuestions}</strong>
            </div>
            <div className="exam-review-report-metric">
              <span>Negative Mark</span>
              <strong>0%</strong>
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
              <div><strong>{score}</strong> / {totalQuestions}</div>
              <div>Accuracy: {percent}%</div>
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
          {reviewRows.length === 0 ? (
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
                    <th>Marks</th>
                    <th>Section</th>
                    <th>Time Spent</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewRows.map((row) => (
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
                            if (runtimeMode) openQuestionReviewRuntime(row.index);
                          }}
                        >
                          {runtimeMode ? 'Review' : 'Preview'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      <div className="navigation exam-runtime-navigation exam-review-runtime-footer">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn-secondary" onClick={goToPrevQuestion} disabled={isFirstQuestion}>
          Previous
        </button>
        <button type="button" className="btn btn-primary" onClick={scrollToQuestionList}>
          Navigator
        </button>
        <button type="button" className="btn btn-primary" onClick={goToNextQuestion} disabled={isLastQuestion}>
          Next
        </button>
      </div>
    </div>
  );
};

export default TestReviewExamView;
