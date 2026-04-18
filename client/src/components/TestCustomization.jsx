import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../constants/Categories';
import { NCLEX_CLIENT_NEEDS_CATEGORIES } from '../constants/ClientNeeds';
import { useUser } from '../context/UserContext';
import './TestCustomization.css';

// ─── Constants ──────────────────────────────────────────────────────────
const CLIENT_NEEDS_CATEGORIES = NCLEX_CLIENT_NEEDS_CATEGORIES;

const TEAL = '#009688';
const TEAL_LIGHT = '#E0F2F1';
const TEAL_DARK = '#00796B';

// ─── Anti-Piracy CSS Injection ─────────────────────────────────────────
const ANTI_PIRACY_CSS = `
  .anti-piracy-active * {
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
  }
  .anti-piracy-active {
    -webkit-user-select: none !important;
    user-select: none !important;
  }
  @media print {
    body { display: none !important; }
  }
`;

// ─── Main Component ─────────────────────────────────────────────────────
const TestCustomization = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  // ── Flow: 'settings' → 'categories' → 'lessons' → 'generate' ──
  const [flowStep, setFlowStep] = useState('settings');
  const [animDirection, setAnimDirection] = useState('forward');
  const [animKey, setAnimKey] = useState(0);

  // ── Q-Bank Mode ──
  const [catMode, setCatMode] = useState(false);
  const [tutorialMode, setTutorialMode] = useState(false);
  const [timedMode, setTimedMode] = useState(true);
  const [assessmentMode, setAssessmentMode] = useState(false);

  // ── Test Type (question format): 'classic' | 'ngn' | 'mixed' ──
  const [questionFormat, setQuestionFormat] = useState('mixed');

  // ── Organization: 'subjects' | 'clientNeeds' ──
  const [organization, setOrganization] = useState('subjects');

  // ── Question Type Tab: 'all' | 'sata' | 'unfoldingNgn' | 'standardizedNgn' ──
  const [questionTypeTab, setQuestionTypeTab] = useState('all');

  // ── Status filter (radio): 'unused' | 'incorrect' | 'marked' | 'correctOnRetake' | 'custom' | 'all' | 'omitted' ──
  const [statusFilter, setStatusFilter] = useState('unused');

  // ── Selections ──
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedClientNeeds, setSelectedClientNeeds] = useState([]);
  const [selectedSubcategoryPairs, setSelectedSubcategoryPairs] = useState([]);

  // ── Question count ──
  const [questionCount, setQuestionCount] = useState(85);
  const [questionCountInput, setQuestionCountInput] = useState('85');

  // ── Data ──
  const [subcategoryCounts, setSubcategoryCounts] = useState({});
  const [usedSubcategoryCounts, setUsedSubcategoryCounts] = useState({});
  const [omittedSubcategoryCounts, setOmittedSubcategoryCounts] = useState({});
  const [clientNeedsCounts, setClientNeedsCounts] = useState({});
  const [clientNeedsNgnCounts, setClientNeedsNgnCounts] = useState({});
  const [statusCounts, setStatusCounts] = useState({
    unused: 0, unusedNgn: 0, incorrect: 0, incorrectNgn: 0,
    marked: 0, markedNgn: 0, omitted: 0, omittedNgn: 0,
    correct: 0, correctNgn: 0, total: 0
  });
  const [subjectStatusCounts, setSubjectStatusCounts] = useState(null);
  const [clientNeedStatusCounts, setClientNeedStatusCounts] = useState(null);

  // ── UI state ──
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countsLoaded, setCountsLoaded] = useState(false);

  // ── Helpers ──
  const normalizeKey = (value) => {
    const base = String(value || '')
      .trim().toLowerCase()
      .replace(/['']/g, '').replace(/\band\b/g, '&')
      .replace(/\s*\/\s*/g, '/').replace(/\s*&\s*/g, '&')
      .replace(/[(),.-]/g, ' ').replace(/\s+/g, ' ').trim();
    return base.replace(/[/&]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const getPairKey = (category, subcategory) => `${category}:::${subcategory}`;
  const isSubcategorySelected = (category, subcategory) =>
    selectedSubcategoryPairs.includes(getPairKey(category, subcategory));

  const getSubcategoryCount = (category, subcategory) =>
    subcategoryCounts?.[category]?.[subcategory] || 0;
  const getUsedSubcategoryCount = (category, subcategory) =>
    usedSubcategoryCounts?.[category]?.[subcategory] || 0;
  const getOmittedSubcategoryCount = (category, subcategory) =>
    omittedSubcategoryCounts?.[category]?.[subcategory] || 0;

  const getClientNeedCount = (cn) => clientNeedsCounts?.[normalizeKey(cn)] || 0;
  const getClientNeedNgnCount = (cn) => clientNeedsNgnCounts?.[normalizeKey(cn)] || 0;

  // ── Step Navigation ──
  const goForward = (step) => {
    setAnimDirection('forward');
    setAnimKey(k => k + 1);
    setFlowStep(step);
  };

  const goBack = (step) => {
    setAnimDirection('backward');
    setAnimKey(k => k + 1);
    setFlowStep(step);
  };

  // ── Anti-Piracy ──
  useEffect(() => {
    const styleId = 'anti-piracy-css';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = ANTI_PIRACY_CSS;
      document.head.appendChild(style);
    }
    const isActive = timedMode || catMode || assessmentMode;
    document.body.classList.toggle('anti-piracy-active', isActive);
    return () => document.body.classList.remove('anti-piracy-active');
  }, [timedMode, catMode, assessmentMode]);

  // ── Keyboard blocker ──
  useEffect(() => {
    const isActive = timedMode || catMode || assessmentMode;
    if (!isActive) return;
    const blockKeys = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['c','C','p','P','s','S','u','U'].includes(e.key)) {
        e.preventDefault(); e.stopPropagation(); return false;
      }
      if (e.key === 'PrintScreen') { e.preventDefault(); return false; }
    };
    const blockCtx = (e) => { e.preventDefault(); return false; };
    document.addEventListener('keydown', blockKeys, true);
    document.addEventListener('contextmenu', blockCtx, true);
    return () => {
      document.removeEventListener('keydown', blockKeys, true);
      document.removeEventListener('contextmenu', blockCtx, true);
    };
  }, [timedMode, catMode, assessmentMode]);

  // ── DevTools Detection ──
  useEffect(() => {
    let warnShown = false;
    const interval = window.setInterval(() => {
      const threshold = 160;
      const detected = window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold;
      if (detected && !warnShown) {
        warnShown = true;
        console.clear();
        console.log('%c⚠️ Developer Tools Detected', 'color: #dc2626; font-size: 24px; font-weight: bold;');
        console.log('%cUsing developer tools during a test session is not permitted.', 'color: #991b1b; font-size: 14px;');
      }
      if (!detected) warnShown = false;
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  // ── Data Fetching ──
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/student/subcategory-counts', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubcategoryCounts(response.data?.totalCountsByCategorySubcategory || response.data?.countsByCategorySubcategory || {});
        setUsedSubcategoryCounts(response.data?.usedCountsByCategorySubcategory || {});
        setOmittedSubcategoryCounts(response.data?.omittedCountsByCategorySubcategory || {});

        try {
          const cnRes = await axios.get('/api/student/client-needs-counts', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setClientNeedsCounts(cnRes.data?.countsByClientNeed || {});
          setClientNeedsNgnCounts(cnRes.data?.ngnCountsByClientNeed || {});
        } catch (e) { /* ignore */ }

        try {
          const statusRes = await axios.get('/api/student/question-status-counts', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setStatusCounts({
            unused: statusRes.data?.unused || 0, unusedNgn: statusRes.data?.unusedNgn || 0,
            incorrect: statusRes.data?.incorrect || 0, incorrectNgn: statusRes.data?.incorrectNgn || 0,
            marked: statusRes.data?.marked || 0, markedNgn: statusRes.data?.markedNgn || 0,
            omitted: statusRes.data?.omitted || 0, omittedNgn: statusRes.data?.omittedNgn || 0,
            correct: statusRes.data?.correct || 0, correctNgn: statusRes.data?.correctNgn || 0,
            total: statusRes.data?.total || 0
          });
          if (statusRes.data?.subjects) setSubjectStatusCounts({ ...statusRes.data.subjects, total: statusRes.data.subjects.total || 0 });
          if (statusRes.data?.clientNeeds) setClientNeedStatusCounts({ ...statusRes.data.clientNeeds, total: statusRes.data.clientNeeds.total || 0 });
        } catch (e) { /* ignore */ }
      } catch (err) {
        console.error('Failed to load counts', err);
      }
      setCountsLoaded(true);
    };
    fetchCounts();
  }, []);

  // ── Computed values ──
  const categoryTotals = useMemo(() => {
    return Object.fromEntries(
      Object.entries(CATEGORIES).map(([cat, subs]) => [
        cat, subs.reduce((sum, sub) => sum + getSubcategoryCount(cat, sub), 0)
      ])
    );
  }, [subcategoryCounts]);

  const clientNeedsTotal = useMemo(() =>
    CLIENT_NEEDS_CATEGORIES.reduce((sum, cn) => sum + getClientNeedCount(cn), 0),
    [clientNeedsCounts]
  );

  const selectedSubjectsTotal = useMemo(() => {
    if (selectedSubjects.length === 0) {
      return Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    }
    return selectedSubjects.reduce((sum, cat) => sum + (categoryTotals[cat] || 0), 0);
  }, [selectedSubjects, categoryTotals]);

  const selectedClientNeedsTotal = useMemo(() => {
    if (selectedClientNeeds.length === 0) return clientNeedsTotal;
    return selectedClientNeeds.reduce((sum, cn) => sum + getClientNeedCount(cn), 0);
  }, [selectedClientNeeds, clientNeedsCounts, clientNeedsTotal]);

  const allPossiblePairs = useMemo(() => {
    const subjects = selectedSubjects.length > 0 ? selectedSubjects : Object.keys(CATEGORIES);
    return subjects.flatMap(cat =>
      (CATEGORIES[cat] || []).map(sub => getPairKey(cat, sub))
    );
  }, [selectedSubjects]);

  const selectedSubcategoryStats = useMemo(() => {
    if (selectedSubcategoryPairs.length === 0) {
      return { available: selectedSubjectsTotal, used: 0, omitted: 0 };
    }
    return selectedSubcategoryPairs.reduce((totals, pairKey) => {
      const [cat, sub] = pairKey.split(':::');
      return {
        available: totals.available + getSubcategoryCount(cat, sub),
        used: totals.used + getUsedSubcategoryCount(cat, sub),
        omitted: totals.omitted + getOmittedSubcategoryCount(cat, sub),
      };
    }, { available: 0, used: 0, omitted: 0 });
  }, [selectedSubcategoryPairs, subcategoryCounts, usedSubcategoryCounts, omittedSubcategoryCounts, selectedSubjectsTotal]);

  const activeStatusCounts = organization === 'subjects'
    ? (subjectStatusCounts || statusCounts)
    : (clientNeedStatusCounts || statusCounts);

  const maxAllowed = Math.min(150, organization === 'clientNeeds'
    ? selectedClientNeedsTotal
    : selectedSubcategoryStats.available);

  // ── Selection Handlers ──
  const handleSubjectToggle = (cat) => {
    setSelectedSubjects(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };
  const handleSelectAllSubjects = () => {
    const allCats = Object.keys(CATEGORIES);
    setSelectedSubjects(prev => prev.length === allCats.length ? [] : [...allCats]);
  };
  const handleClientNeedToggle = (cn) => {
    setSelectedClientNeeds(prev =>
      prev.includes(cn) ? prev.filter(c => c !== cn) : [...prev, cn]
    );
  };
  const handleSelectAllClientNeeds = () => {
    setSelectedClientNeeds(prev => prev.length === CLIENT_NEEDS_CATEGORIES.length ? [] : [...CLIENT_NEEDS_CATEGORIES]);
  };
  const handleSubcategoryToggle = (category, subcat) => {
    const key = getPairKey(category, subcat);
    setSelectedSubcategoryPairs(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };
  const handleSelectAllSubcategories = () => {
    setSelectedSubcategoryPairs(prev =>
      prev.length === allPossiblePairs.length ? [] : [...allPossiblePairs]
    );
  };

  // ── Build status filters object for API ──
  const buildStatusFilters = () => {
    if (statusFilter === 'all') {
      return { unused: true, incorrect: true, marked: true, omitted: true, correct: true };
    }
    if (statusFilter === 'custom') {
      return { unused: false, incorrect: false, marked: false, omitted: false, correct: false };
    }
    const filters = { unused: false, incorrect: false, marked: false, omitted: false, correct: false };
    if (statusFilter === 'correctOnRetake') {
      filters.correct = true;
    } else {
      filters[statusFilter] = true;
    }
    return filters;
  };

  // ── Step 1: Settings Page (matches screenshot) ──
  const renderSettingsStep = () => {
    const totalQ = statusCounts.total || 0;
    const totalClassic = (statusCounts.total || 0) - (statusCounts.unusedNgn || 0) - (statusCounts.incorrectNgn || 0) - (statusCounts.markedNgn || 0) - (statusCounts.correctNgn || 0) - (statusCounts.omittedNgn || 0) + (statusCounts.unusedNgn || 0);
    // Simpler: classic total = total - ngn totals
    const ngnTotal = (statusCounts.unusedNgn || 0) + (statusCounts.incorrectNgn || 0) + (statusCounts.markedNgn || 0) + (statusCounts.correctNgn || 0) + (statusCounts.omittedNgn || 0);
    const classicTotal = Math.max(0, totalQ - ngnTotal);

    return (
      <div className="tc-settings-page">
        {/* Header */}
        <div className="tc-header">
          <h2 className="tc-title">CREATE TEST</h2>
          <button className="tc-close-btn" onClick={() => navigate('/dashboard')}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Q-BANK MODE */}
        <div className="tc-section">
          <div className="tc-section-title">Q-BANK MODE</div>

          <div className="tc-mode-grid">
            {/* CAT */}
            <div className="tc-mode-item">
              <div className="tc-mode-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="tc-mode-label">CAT</span>
              </div>
              <button
                className={`tc-toggle ${catMode ? 'on' : ''}`}
                onClick={() => {
                  setCatMode(!catMode);
                  if (!catMode) { setAssessmentMode(false); setTimedMode(false); }
                }}
              >
                <div className="tc-toggle-knob" />
              </button>
            </div>

            {/* Tutorial */}
            <div className="tc-mode-item">
              <div className="tc-mode-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="tc-mode-label">Tutorial</span>
              </div>
              <button
                className={`tc-toggle ${tutorialMode ? 'on' : ''}`}
                onClick={() => setTutorialMode(!tutorialMode)}
              >
                <div className="tc-toggle-knob" />
              </button>
            </div>

            {/* Timed */}
            <div className="tc-mode-item">
              <div className="tc-mode-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="tc-mode-label">Timed</span>
              </div>
              <button
                className={`tc-toggle ${timedMode ? 'on' : ''}`}
                onClick={() => setTimedMode(!timedMode)}
                disabled={catMode}
              >
                <div className="tc-toggle-knob" />
              </button>
            </div>

            {/* Assessment */}
            <div className="tc-mode-item">
              <div className="tc-mode-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="tc-mode-label">Readiness Assessment</span>
              </div>
              <div
                className={`tc-checkbox ${assessmentMode ? 'checked' : ''}`}
                onClick={() => {
                  setAssessmentMode(!assessmentMode);
                  if (!assessmentMode) { setCatMode(false); setTimedMode(false); }
                }}
              >
                {assessmentMode && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div className="tc-info-icon" title="150 questions, hard difficulty, tutor mode enabled">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke={TEAL} strokeWidth="1.5"/>
                  <path d="M8 7v3.5M8 5v.5" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Tutorial description */}
          {tutorialMode && (
            <div className="tc-tutorial-desc">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Receive instant explanations after submitting your answers.</span>
            </div>
          )}
        </div>

        {/* TEST TYPE */}
        <div className="tc-section">
          <div className="tc-section-title">TEST TYPE</div>
          <div className="tc-radio-row">
            {[
              { value: 'classic', label: 'Classic' },
              { value: 'ngn', label: 'NGN' },
              { value: 'mixed', label: 'Mixed' },
            ].map(opt => (
              <div
                key={opt.value}
                className={`tc-radio-item ${questionFormat === opt.value ? 'active' : ''}`}
                onClick={() => setQuestionFormat(opt.value)}
              >
                <div className={`tc-radio-circle ${questionFormat === opt.value ? 'active' : ''}`}>
                  {questionFormat === opt.value && <div className="tc-radio-dot" />}
                </div>
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ORGANIZATION */}
        <div className="tc-section">
          <div className="tc-section-title">ORGANIZATION</div>
          <div className="tc-radio-row">
            {[
              { value: 'subjects', label: 'Subject or System' },
              { value: 'clientNeeds', label: 'Client Need Areas' },
            ].map(opt => (
              <div
                key={opt.value}
                className={`tc-radio-item ${organization === opt.value ? 'active' : ''}`}
                onClick={() => setOrganization(opt.value)}
              >
                <div className={`tc-radio-circle ${organization === opt.value ? 'active' : ''}`}>
                  {organization === opt.value && <div className="tc-radio-dot" />}
                </div>
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* QUESTION TYPES */}
        <div className="tc-section">
          <div className="tc-section-title">QUESTION TYPES</div>

          {/* Tabs */}
          <div className="tc-qtype-tabs">
            {[
              { key: 'all', label: `All (${totalQ.toLocaleString()})` },
              { key: 'sata', label: `SATA (${(statusCounts.unused || 0).toLocaleString()})` },
              { key: 'unfoldingNgn', label: `Unfolding NGN Case Studies (${(statusCounts.markedNgn || 0).toLocaleString()})` },
              { key: 'standardizedNgn', label: `Standardized NGN Case Studies (${(statusCounts.unusedNgn || 0).toLocaleString()})` },
            ].map(tab => (
              <button
                key={tab.key}
                className={`tc-qtype-tab ${questionTypeTab === tab.key ? 'active' : ''}`}
                onClick={() => setQuestionTypeTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status radio buttons (2 columns) */}
          <div className="tc-status-grid">
            {[
              { key: 'unused', label: 'Unused', count: statusCounts.unused || 0, hasInfo: false },
              { key: 'marked', label: 'Marked', count: statusCounts.marked || 0, hasInfo: false },
              { key: 'incorrect', label: 'Incorrect', count: statusCounts.incorrect || 0, hasInfo: false },
              { key: 'all', label: 'All', count: statusCounts.total || 0, hasInfo: false },
              { key: 'correctOnRetake', label: 'Correct On Retake', count: statusCounts.correct || 0, hasInfo: true },
              { key: 'custom', label: 'Custom', count: 0, hasInfo: false },
              { key: 'omitted', label: 'Omitted', count: statusCounts.omitted || 0, hasInfo: false },
            ].map(item => (
              <div
                key={item.key}
                className={`tc-status-radio-item ${statusFilter === item.key ? 'active' : ''}`}
                onClick={() => setStatusFilter(item.key)}
              >
                <div className={`tc-radio-circle ${statusFilter === item.key ? 'active' : ''}`}>
                  {statusFilter === item.key && <div className="tc-radio-dot" />}
                </div>
                <div className="tc-status-radio-text">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="tc-status-radio-label">{item.label}</span>
                    {item.hasInfo && (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="8" cy="8" r="7" stroke="#009688" strokeWidth="1.5"/>
                        <path d="M8 7v3.5M8 5v.5" stroke="#009688" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                  {item.count > 0 && <span className="tc-status-radio-count">{item.count.toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TEST LENGTH */}
        <div className="tc-section">
          <div className="tc-section-title">TEST LENGTH</div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>
            Number of questions per test (maximum of 150)
          </div>
          <div className="tc-count-row">
            <input
              className="tc-count-input"
              type="number"
              value={questionCountInput}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  setQuestionCountInput(e.target.value);
                  setQuestionCount(Math.min(150, Math.max(5, val)));
                }
              }}
              onBlur={() => setQuestionCountInput(String(questionCount))}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="tc-actions-bar">
          <button className="tc-btn-cancel" onClick={() => navigate('/dashboard')}>
            Cancel
          </button>
          <button className="tc-btn-next" onClick={() => goForward('categories')}>
            Next &gt;
          </button>
        </div>
      </div>
    );
  };

  // ── Step 2: Categories (Subjects or Client Needs) ──
  const renderCategoriesStep = () => {
    const isSubjects = organization === 'subjects';
    const title = isSubjects ? 'SUBJECTS' : 'CLIENT NEEDS';
    const items = isSubjects ? Object.keys(CATEGORIES) : CLIENT_NEEDS_CATEGORIES;
    const counts = isSubjects
      ? (cat) => categoryTotals[cat] || 0
      : (cn) => getClientNeedCount(cn);
    const selected = isSubjects ? selectedSubjects : selectedClientNeeds;
    const allSelected = selected.length === items.length;
    const handleToggle = isSubjects ? handleSubjectToggle : handleClientNeedToggle;
    const handleSelectAll = isSubjects ? handleSelectAllSubjects : handleSelectAllClientNeeds;

    return (
      <div className="tc-categories-page">
        <div className="tc-header">
          <div className="tc-header-left">
            <button className="tc-back-btn" onClick={() => goBack('settings')}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2 className="tc-title">{title}</h2>
          </div>
          <span className="tc-badge">
            {selected.length === 0
              ? `${items.length} items`
              : `${selected.length} of ${items.length} selected`}
          </span>
        </div>

        {/* Select All */}
        <div className="tc-select-all-bar" onClick={handleSelectAll}>
          <div className={`tc-checkbox ${allSelected ? 'checked' : ''}`}>
            {allSelected && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
        </div>

        {/* Items */}
        <div className="tc-items-list">
          {items.map((item) => {
            const isSelected = selected.includes(item);
            const count = counts(item);
            return (
              <div
                key={item}
                className={`tc-item-row ${isSelected ? 'selected' : ''}`}
                onClick={() => handleToggle(item)}
              >
                <div className={`tc-checkbox ${isSelected ? 'checked' : ''}`}>
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="tc-item-label">{item}</span>
                <span className={`tc-item-count ${count === 0 ? 'zero' : ''}`}>{count}</span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="tc-actions-bar">
          <button className="tc-btn-cancel" onClick={() => goBack('settings')}>
            Back
          </button>
          {isSubjects ? (
            <button className="tc-btn-next" onClick={() => goForward('lessons')}>
              Next &gt;
            </button>
          ) : (
            <button className="tc-btn-next" onClick={() => goForward('generate')}>
              Next &gt;
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Step 3: Lessons/Subcategories ──
  const renderLessonsStep = () => {
    const subjectsToShow = selectedSubjects.length > 0 ? selectedSubjects : Object.keys(CATEGORIES);

    return (
      <div className="tc-categories-page">
        <div className="tc-header">
          <div className="tc-header-left">
            <button className="tc-back-btn" onClick={() => goBack('categories')}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2 className="tc-title">LESSONS</h2>
          </div>
          <span className="tc-badge">
            {selectedSubcategoryPairs.length === 0
              ? `${selectedSubcategoryStats.available} available`
              : `${selectedSubcategoryPairs.length} selected`}
          </span>
        </div>

        {/* Select All */}
        <div className="tc-select-all-bar" onClick={handleSelectAllSubcategories}>
          <div className={`tc-checkbox ${selectedSubcategoryPairs.length === allPossiblePairs.length ? 'checked' : ''}`}>
            {selectedSubcategoryPairs.length === allPossiblePairs.length && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span>{selectedSubcategoryPairs.length === allPossiblePairs.length ? 'Deselect All' : 'Select All'}</span>
        </div>

        {/* Grouped by subject */}
        <div className="tc-items-list">
          {subjectsToShow.map((category) => {
            const subcategories = CATEGORIES[category] || [];
            if (subcategories.length === 0) return null;
            const allSubSelected = subcategories.every(sub => isSubcategorySelected(category, sub));
            const catTotal = categoryTotals[category] || 0;

            return (
              <div key={category}>
                {/* Subject group header */}
                <div className="tc-subject-group">
                  <span className="tc-subject-name">{category}</span>
                  <div className="tc-subject-right">
                    <span className="tc-item-count">{catTotal}</span>
                    <button
                      className="tc-subject-toggle-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        const subcatKeys = subcategories.map(sub => getPairKey(category, sub));
                        if (allSubSelected) {
                          setSelectedSubcategoryPairs(prev => prev.filter(s => !subcatKeys.includes(s)));
                        } else {
                          const missing = subcatKeys.filter(k => !selectedSubcategoryPairs.includes(k));
                          setSelectedSubcategoryPairs(prev => [...prev, ...missing]);
                        }
                      }}
                    >
                      {allSubSelected ? 'Deselect' : 'Select All'}
                    </button>
                  </div>
                </div>
                {/* Subcategory items */}
                {subcategories.map((sub) => {
                  const isSelected = isSubcategorySelected(category, sub);
                  const count = getSubcategoryCount(category, sub);
                  return (
                    <div
                      key={`${category}-${sub}`}
                      className={`tc-item-row ${isSelected ? 'selected' : ''} tc-sub-item`}
                      onClick={() => handleSubcategoryToggle(category, sub)}
                    >
                      <div className={`tc-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className="tc-item-label">{sub}</span>
                      <span className={`tc-item-count ${count === 0 ? 'zero' : ''}`}>{count}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="tc-actions-bar">
          <button className="tc-btn-cancel" onClick={() => goBack('categories')}>
            Back
          </button>
          <button className="tc-btn-next" onClick={() => goForward('generate')}>
            Next &gt;
          </button>
        </div>
      </div>
    );
  };

  // ── Step 4: Generate Test ──
  const renderGenerateStep = () => {
    const isAssessment = assessmentMode;
    const effectiveQuestionCount = isAssessment ? 150 : questionCount;
    const effectiveMax = isAssessment ? 150 : maxAllowed;

    return (
      <div className="tc-settings-page">
        <div className="tc-header">
          <div className="tc-header-left">
            <button className="tc-back-btn" onClick={() => {
              if (organization === 'subjects') goBack('lessons');
              else goBack('categories');
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2 className="tc-title">GENERATE TEST</h2>
          </div>
        </div>

        {error && (
          <div className="tc-error">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#dc2626" strokeWidth="1.5"/>
              <path d="M8 5v3.5M8 10.5v.5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {error}
          </div>
        )}

        {/* Summary of selections */}
        <div className="tc-summary-section">
          <div className="tc-section-title">TEST SUMMARY</div>
          <div className="tc-summary-grid">
            <div className="tc-summary-item">
              <span className="tc-summary-label">Mode</span>
              <span className="tc-summary-value">
                {catMode ? 'CAT (Adaptive)' : assessmentMode ? 'Readiness Assessment' : 'Practice'}
              </span>
            </div>
            <div className="tc-summary-item">
              <span className="tc-summary-label">Format</span>
              <span className="tc-summary-value">
                {questionFormat === 'classic' ? 'Classic' : questionFormat === 'ngn' ? 'NGN' : 'Mixed'}
              </span>
            </div>
            <div className="tc-summary-item">
              <span className="tc-summary-label">Organization</span>
              <span className="tc-summary-value">
                {organization === 'subjects' ? 'Subject or System' : 'Client Need Areas'}
              </span>
            </div>
            <div className="tc-summary-item">
              <span className="tc-summary-label">Questions</span>
              <span className="tc-summary-value">
                {organization === 'subjects'
                  ? `${selectedSubcategoryPairs.length || 'All'} subcategories`
                  : `${selectedClientNeeds.length || 'All'} client needs`}
              </span>
            </div>
            <div className="tc-summary-item">
              <span className="tc-summary-label">Status</span>
              <span className="tc-summary-value capitalize">{statusFilter === 'all' ? 'All' : statusFilter}</span>
            </div>
            {!catMode && !assessmentMode && (
              <>
                <div className="tc-summary-item">
                  <span className="tc-summary-label">Tutorial</span>
                  <span className="tc-summary-value">{tutorialMode ? 'On' : 'Off'}</span>
                </div>
                <div className="tc-summary-item">
                  <span className="tc-summary-label">Timed</span>
                  <span className="tc-summary-value">{timedMode ? 'On' : 'Off'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Question Count */}
        {catMode ? (
          <div className="tc-section">
            <div className="tc-section-title">QUESTION COUNT</div>
            <div className="tc-cat-info">
              CAT mode adapts the number of questions based on your performance. Minimum 75, maximum 145 questions.
            </div>
          </div>
        ) : (
          <div className="tc-section">
            <div className="tc-section-title">
              NUMBER OF QUESTIONS {!isAssessment && `(max: ${effectiveMax})`}
            </div>
            <div className="tc-count-row">
              <button
                className="tc-count-btn"
                onClick={() => {
                  if (!isAssessment) {
                    const newVal = Math.max(5, questionCount - 5);
                    setQuestionCount(newVal);
                    setQuestionCountInput(String(newVal));
                  }
                }}
                disabled={isAssessment || questionCount <= 5}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5H8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <input
                className="tc-count-input"
                type="number"
                value={isAssessment ? '150' : questionCountInput}
                onChange={(e) => {
                  if (!isAssessment) {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setQuestionCountInput(e.target.value);
                      setQuestionCount(Math.min(effectiveMax, Math.max(5, val)));
                    }
                  }
                }}
                onBlur={() => setQuestionCountInput(String(questionCount))}
                readOnly={isAssessment}
              />
              <button
                className="tc-count-btn"
                onClick={() => {
                  if (!isAssessment) {
                    const newVal = Math.min(effectiveMax, questionCount + 5);
                    setQuestionCount(newVal);
                    setQuestionCountInput(String(newVal));
                  }
                }}
                disabled={isAssessment || questionCount >= effectiveMax}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5H8.5M5 1.5V8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="tc-actions-bar">
          <button className="tc-btn-cancel" onClick={() => {
            if (organization === 'subjects') goBack('lessons');
            else goBack('categories');
          }}>
            Back
          </button>
          <button
            className={`tc-btn-generate ${loading ? 'loading' : ''}`}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <span className="tc-spinner" /> : null}
            {loading ? 'Loading...' : 'GENERATE TEST'}
          </button>
        </div>
      </div>
    );
  };

  // ── Submit Handler ──
  const handleSubmit = async () => {
    setError('');

    const effectiveTimed = assessmentMode ? true : (catMode ? true : timedMode);
    const effectiveTutorMode = assessmentMode ? true : tutorialMode;
    const effectiveQuestionCount = assessmentMode ? 150 : questionCount;
    const statusFilters = buildStatusFilters();

    if (catMode) {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post('/api/student/cat/start', { testType: 'cat' }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        navigate('/cat-session', { state: { ...response.data, testType: 'cat' } });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to start CAT session.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Validation
    if (organization === 'clientNeeds') {
      if (selectedClientNeedsTotal === 0) { setError('No questions available in selected client needs.'); return; }
      if (effectiveQuestionCount > selectedClientNeedsTotal) { setError(`Only ${selectedClientNeedsTotal} questions available.`); return; }
    } else {
      if (!assessmentMode && selectedSubcategoryPairs.length === 0) { setError('Select at least one subcategory.'); return; }
      if (selectedSubcategoryStats.available === 0) { setError('No questions available in selected subcategories.'); return; }
      if (effectiveQuestionCount > selectedSubcategoryStats.available) { setError(`Only ${selectedSubcategoryStats.available} questions available.`); return; }
    }

    if (effectiveQuestionCount < 5 || effectiveQuestionCount > 150) {
      setError('Question count must be between 5 and 150.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const testType = assessmentMode ? 'assessment' : 'practice';

      if (organization === 'clientNeeds') {
        const clientNeedsSelections = selectedClientNeeds.length > 0
          ? selectedClientNeeds.map(cn => ({ clientNeed: cn, clientNeedSubcategory: cn }))
          : CLIENT_NEEDS_CATEGORIES.map(cn => ({ clientNeed: cn, clientNeedSubcategory: cn }));

        const response = await axios.post('/api/student/generate-test', {
          clientNeedsSelections,
          filterMode: 'clientNeeds',
          questionCount: effectiveQuestionCount,
          timed: effectiveTimed,
          tutorMode: effectiveTutorMode,
          statusFilters,
          testType,
          questionFormat,
          ...(assessmentMode ? { difficulty: 'hard' } : {})
        }, { headers: { Authorization: `Bearer ${token}` } });

        const navData = { ...response.data, testType };
        if (assessmentMode) navData.settings = { ...navData.settings, testName: 'Assessment' };
        navigate('/test-session', { state: navData });

      } else {
        const selections = selectedSubcategoryPairs.map(pairKey => {
          const [category, subcategory] = pairKey.split(':::');
          return { category, subcategory };
        });

        const response = await axios.post('/api/student/generate-test', {
          selections,
          subcategories: selections.map(item => item.subcategory),
          questionCount: effectiveQuestionCount,
          timed: effectiveTimed,
          tutorMode: effectiveTutorMode,
          statusFilters,
          testType,
          questionFormat,
          ...(assessmentMode ? { difficulty: 'hard' } : {})
        }, { headers: { Authorization: `Bearer ${token}` } });

        const navData = { ...response.data, testType };
        if (assessmentMode) navData.settings = { ...navData.settings, testName: 'Assessment' };
        navigate('/test-session', { state: navData });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate test.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tc-container">
      {/* Nclex Keys Watermark */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%) rotate(-35deg)',
        fontSize: '72px', fontWeight: 800,
        color: 'rgba(0,0,0,0.02)',
        whiteSpace: 'nowrap', pointerEvents: 'none',
        zIndex: 999998, letterSpacing: '8px'
      }}>
        Nclex Keys
      </div>

      {/* Animated Content */}
      <div key={animKey} className={animDirection === 'forward' ? 'tc-slide-enter' : 'tc-slide-enter-back'}>
        {flowStep === 'settings' && renderSettingsStep()}
        {flowStep === 'categories' && renderCategoriesStep()}
        {flowStep === 'lessons' && renderLessonsStep()}
        {flowStep === 'generate' && renderGenerateStep()}
      </div>
    </div>
  );
};

export default TestCustomization;
