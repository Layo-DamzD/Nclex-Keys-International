import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../constants/Categories';
import { NCLEX_CLIENT_NEEDS_CATEGORIES } from '../constants/ClientNeeds';
import { useUser } from '../context/UserContext';
import './TestCustomization.css';

// ─── Constants ──────────────────────────────────────────────────────────
const CLIENT_NEEDS_CATEGORIES = NCLEX_CLIENT_NEEDS_CATEGORIES;
const CASE_STUDY_SUBCATEGORIES = CATEGORIES['NGN Case Studies'] || [];

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

// ─── SVG Icons ──────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg className="tc-checkbox-check" viewBox="0 0 12 12" fill="none">
    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M4 9H14M14 9L9.5 4.5M14 9L9.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M14 9H4M4 9L8.5 4.5M4 9L8.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BackArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SelectAllIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1.75 7H12.25M7 1.75V12.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const MinusIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M1.5 5H8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M1.5 5H8.5M5 1.5V8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ─── Progress Bar Component ─────────────────────────────────────────────
const ProgressBar = ({ currentStep, totalSteps, stepLabels }) => {
  const steps = [];
  for (let i = 1; i <= totalSteps; i++) {
    steps.push({
      num: i,
      label: stepLabels[i - 1] || `Step ${i}`,
      isActive: i === currentStep,
      isCompleted: i < currentStep
    });
  }

  return (
    <div className="tc-progress-bar">
      {steps.map((step, idx) => (
        <React.Fragment key={step.num}>
          {idx > 0 && (
            <div className={`tc-progress-line${step.isCompleted ? ' completed' : ''}`} />
          )}
          <div className="tc-progress-step">
            <div className={`tc-progress-circle${step.isActive ? ' active' : ''}${step.isCompleted ? ' completed' : ''}`}>
              {step.isCompleted ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7L6 10L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : step.num}
            </div>
            <span className={`tc-progress-label${step.isActive ? ' active' : ''}${step.isCompleted ? ' completed' : ''}`}>
              {step.label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────
const TestCustomization = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  // ── Flow step: 'choose' → 'categories' → 'lessons' → 'settings' ──
  const [flowStep, setFlowStep] = useState('choose');
  const [animDirection, setAnimDirection] = useState('forward');
  const [animKey, setAnimKey] = useState(0);

  // ── Category type: 'clientNeeds' | 'subjects' | 'caseStudies' ──
  const [categoryType, setCategoryType] = useState(null);

  // ── Selections ──
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedClientNeeds, setSelectedClientNeeds] = useState([]);
  const [selectedCaseStudies, setSelectedCaseStudies] = useState([]);
  const [selectedSubcategoryPairs, setSelectedSubcategoryPairs] = useState([]);

  // ── Test settings ──
  const [questionCount, setQuestionCount] = useState(85);
  const [questionCountInput, setQuestionCountInput] = useState('85');
  const [timed, setTimed] = useState(true);
  const [tutorMode, setTutorMode] = useState(false);
  const [testType, setTestType] = useState('practice');

  // ── Question status filters ──
  const [statusFilters, setStatusFilters] = useState({
    unused: true,
    incorrect: false,
    marked: false,
    omitted: false,
    correct: false
  });

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
  const [caseStudyStatusCounts, setCaseStudyStatusCounts] = useState(null);

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
    const isTimedMode = timed && !tutorMode && (testType === 'practice' || testType === 'caseStudy' || testType === 'assessment');
    const isCatOrAssessment = testType === 'cat' || testType === 'assessment';
    document.body.classList.toggle('anti-piracy-active', isTimedMode || isCatOrAssessment);
    return () => document.body.classList.remove('anti-piracy-active');
  }, [timed, tutorMode, testType]);

  // ── Keyboard blocker ──
  useEffect(() => {
    const isTimedMode = timed && !tutorMode && (testType === 'practice' || testType === 'caseStudy' || testType === 'assessment');
    const isCatOrAssessment = testType === 'cat' || testType === 'assessment';
    if (!isTimedMode && !isCatOrAssessment) return;

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
  }, [timed, tutorMode, testType]);

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
          if (statusRes.data?.caseStudies) setCaseStudyStatusCounts({ ...statusRes.data.caseStudies, total: statusRes.data.caseStudies.total || 0 });
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

  const selectedCaseStudiesTotal = useMemo(() =>
    caseStudyStatusCounts?.total || 0,
    [caseStudyStatusCounts]
  );

  // Subcategory stats for selected subjects
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

  // Active status counts based on category type
  const activeStatusCounts = categoryType === 'subjects'
    ? (subjectStatusCounts || statusCounts)
    : categoryType === 'clientNeeds'
      ? (clientNeedStatusCounts || statusCounts)
      : (caseStudyStatusCounts || statusCounts);

  const maxAllowed = Math.min(150, categoryType === 'clientNeeds'
    ? selectedClientNeedsTotal
    : categoryType === 'caseStudies'
      ? selectedCaseStudiesTotal
      : selectedSubcategoryStats.available);

  // ── Mode handlers ──
  const isCatMode = testType === 'cat';
  const isAssessmentMode = testType === 'assessment';
  const isSpecialMode = isCatMode || isAssessmentMode;

  // ── Selection Handlers ──
  const handleSubjectToggle = (cat) => {
    setSelectedSubjects(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSelectAllSubjects = () => {
    const allCats = Object.keys(CATEGORIES);
    if (selectedSubjects.length === allCats.length) {
      setSelectedSubjects([]);
    } else {
      setSelectedSubjects(allCats);
    }
  };

  const handleClientNeedToggle = (cn) => {
    setSelectedClientNeeds(prev =>
      prev.includes(cn) ? prev.filter(c => c !== cn) : [...prev, cn]
    );
  };

  const handleSelectAllClientNeeds = () => {
    if (selectedClientNeeds.length === CLIENT_NEEDS_CATEGORIES.length) {
      setSelectedClientNeeds([]);
    } else {
      setSelectedClientNeeds([...CLIENT_NEEDS_CATEGORIES]);
    }
  };

  const handleCaseStudyToggle = (sub) => {
    setSelectedCaseStudies(prev =>
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  const handleSelectAllCaseStudies = () => {
    if (selectedCaseStudies.length === CASE_STUDY_SUBCATEGORIES.length) {
      setSelectedCaseStudies([]);
    } else {
      setSelectedCaseStudies([...CASE_STUDY_SUBCATEGORIES]);
    }
  };

  const handleSubcategoryToggle = (category, subcat) => {
    const key = getPairKey(category, subcat);
    setSelectedSubcategoryPairs(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  const handleSelectAllSubcategories = () => {
    if (selectedSubcategoryPairs.length === allPossiblePairs.length) {
      setSelectedSubcategoryPairs([]);
    } else {
      setSelectedSubcategoryPairs(allPossiblePairs);
    }
  };

  // ── Step 0: Choose Category Type ──
  const renderChooseStep = () => (
    <div>
      <div className="tc-step-header">
        <h2 className="tc-step-title">Create Test</h2>
        <span className="tc-step-badge">{countsLoaded ? `${statusCounts.total || 0} Questions` : 'Loading...'}</span>
      </div>
      <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '24px', lineHeight: 1.5 }}>
        Select how you want to filter questions for your practice test.
      </p>
      <div className="tc-category-cards">
        {/* Client Needs Card */}
        <div className="tc-category-card" onClick={() => { setCategoryType('clientNeeds'); goForward('categories'); }}>
          <div className="tc-category-card-icon client-needs">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="tc-category-card-title">Client Needs</div>
          <div className="tc-category-card-desc">Filter by NCLEX client need categories</div>
          <div className="tc-category-card-count">{clientNeedsTotal} questions</div>
        </div>
        {/* Subjects Card */}
        <div className="tc-category-card" onClick={() => { setCategoryType('subjects'); goForward('categories'); }}>
          <div className="tc-category-card-icon subjects">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="tc-category-card-title">Subjects</div>
          <div className="tc-category-card-desc">Filter by subject & subcategory</div>
          <div className="tc-category-card-count">{Object.values(categoryTotals).reduce((a, b) => a + b, 0)} questions</div>
        </div>
        {/* Case Studies Card */}
        <div className="tc-category-card" onClick={() => { setCategoryType('caseStudies'); setTestType('caseStudy'); goForward('categories'); }}>
          <div className="tc-category-card-icon case-studies">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="tc-category-card-title">Case Studies</div>
          <div className="tc-category-card-desc">NGN case study practice</div>
          <div className="tc-category-card-count">{selectedCaseStudiesTotal} questions</div>
        </div>
      </div>
    </div>
  );

  // ── Step 1: Category Selection (Subjects / Client Needs / Case Studies) ──
  const renderCategoriesStep = () => {
    const title = categoryType === 'clientNeeds' ? 'Client Needs' : categoryType === 'caseStudies' ? 'Case Studies' : 'Subjects';
    const totalAvailable = categoryType === 'clientNeeds'
      ? selectedClientNeedsTotal
      : categoryType === 'caseStudies'
        ? selectedCaseStudiesTotal
        : selectedSubjectsTotal;

    const items = categoryType === 'clientNeeds'
      ? CLIENT_NEEDS_CATEGORIES
      : categoryType === 'caseStudies'
        ? CASE_STUDY_SUBCATEGORIES
        : Object.keys(CATEGORIES);

    const counts = categoryType === 'clientNeeds'
      ? (cn) => getClientNeedCount(cn)
      : categoryType === 'caseStudies'
        ? () => 0
        : (cat) => categoryTotals[cat] || 0;

    const selected = categoryType === 'clientNeeds'
      ? selectedClientNeeds
      : categoryType === 'caseStudies'
        ? selectedCaseStudies
        : selectedSubjects;

    const allSelected = selected.length === items.length;

    const handleToggle = categoryType === 'clientNeeds'
      ? handleClientNeedToggle
      : categoryType === 'caseStudies'
        ? handleCaseStudyToggle
        : handleSubjectToggle;

    const handleSelectAll = categoryType === 'clientNeeds'
      ? handleSelectAllClientNeeds
      : categoryType === 'caseStudies'
        ? handleSelectAllCaseStudies
        : handleSelectAllSubjects;

    const canProceed = categoryType === 'caseStudies'
      ? true
      : totalAvailable > 0;

    return (
      <div>
        {/* Back + Title */}
        <div className="tc-step-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="tc-btn-back" onClick={() => goBack('choose')} style={{ padding: '8px 12px' }}>
              <BackArrowIcon />
            </button>
            <h2 className="tc-step-title">{title}</h2>
          </div>
          <span className="tc-step-badge">{totalAvailable} available</span>
        </div>

        {/* Selected summary */}
        {selected.length > 0 && categoryType !== 'caseStudies' && (
          <div className="tc-selected-summary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#16a34a" strokeWidth="1.5"/>
              <path d="M5 8l2 2 4-4" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {selected.length} of {items.length} selected &middot; {totalAvailable} questions available
          </div>
        )}

        {/* Checkbox List */}
        <div className="tc-checkbox-list">
          <div className="tc-checkbox-header">
            <span className="tc-checkbox-header-label">Select {title}</span>
            <button
              className={`tc-select-all-btn${allSelected ? ' active' : ''}`}
              onClick={handleSelectAll}
            >
              <SelectAllIcon />
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="tc-scrollable-list">
            {items.map((item) => {
              const isSelected = selected.includes(item);
              const count = counts(item);
              return (
                <div
                  key={item}
                  className={`tc-checkbox-item${isSelected ? ' selected' : ''}`}
                  onClick={() => handleToggle(item)}
                >
                  <div className="tc-checkbox-box">
                    <CheckIcon />
                  </div>
                  <span className="tc-checkbox-label">{item}</span>
                  <span className={`tc-checkbox-count${count === 0 ? ' zero' : ''}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="tc-actions">
          <button className="tc-btn tc-btn-back" onClick={() => goBack('choose')}>
            <ArrowLeftIcon /> Back
          </button>
          {categoryType === 'subjects' ? (
            <button className="tc-btn tc-btn-next" onClick={() => goForward('lessons')}>
              Next <ArrowRightIcon />
            </button>
          ) : (
            <button
              className="tc-btn tc-btn-next"
              onClick={() => goForward('settings')}
              disabled={!canProceed}
            >
              Next <ArrowRightIcon />
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Step 2: Subcategory/Lessons Selection (Subjects only) ──
  const renderLessonsStep = () => {
    const subjectsToShow = selectedSubjects.length > 0 ? selectedSubjects : Object.keys(CATEGORIES);

    return (
      <div>
        {/* Back + Title */}
        <div className="tc-step-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="tc-btn-back" onClick={() => goBack('categories')} style={{ padding: '8px 12px' }}>
              <BackArrowIcon />
            </button>
            <h2 className="tc-step-title">Lessons</h2>
          </div>
          <span className="tc-step-badge">{selectedSubcategoryStats.available} available</span>
        </div>

        {/* Selected summary */}
        {selectedSubcategoryPairs.length > 0 && (
          <div className="tc-selected-summary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#16a34a" strokeWidth="1.5"/>
              <path d="M5 8l2 2 4-4" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {selectedSubcategoryPairs.length} subcategories selected &middot; {selectedSubcategoryStats.available} questions available
          </div>
        )}

        {/* Grouped by subject */}
        <div style={{ marginBottom: '20px' }}>
          {subjectsToShow.map((category) => {
            const subcategories = CATEGORIES[category] || [];
            if (subcategories.length === 0) return null;
            const allSubSelected = subcategories.every(sub => isSubcategorySelected(category, sub));
            const catTotal = categoryTotals[category] || 0;

            return (
              <div key={category} className="tc-checkbox-list" style={{ marginBottom: '14px' }}>
                {/* Category header */}
                <div className="tc-checkbox-header" style={{ background: '#f0f9ff' }}>
                  <span className="tc-checkbox-header-label" style={{ color: '#0369a1' }}>{category}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="tc-checkbox-count" style={{ fontSize: '0.75rem' }}>{catTotal}</span>
                    <button
                      className={`tc-select-all-btn${allSubSelected ? ' active' : ''}`}
                      onClick={() => {
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
                {/* Subcategories */}
                <div className="tc-scrollable-list" style={{ maxHeight: '260px' }}>
                  {subcategories.map((sub) => {
                    const isSelected = isSubcategorySelected(category, sub);
                    const count = getSubcategoryCount(category, sub);
                    return (
                      <div
                        key={`${category}-${sub}`}
                        className={`tc-checkbox-item${isSelected ? ' selected' : ''}`}
                        onClick={() => handleSubcategoryToggle(category, sub)}
                      >
                        <div className="tc-checkbox-box">
                          <CheckIcon />
                        </div>
                        <span className="tc-checkbox-label">{sub}</span>
                        <span className={`tc-checkbox-count${count === 0 ? ' zero' : ''}`}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Select all subcategories */}
        <div style={{ marginBottom: '20px' }}>
          <button
            className={`tc-select-all-btn${selectedSubcategoryPairs.length === allPossiblePairs.length ? ' active' : ''}`}
            onClick={handleSelectAllSubcategories}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <SelectAllIcon />
            {selectedSubcategoryPairs.length === allPossiblePairs.length ? 'Deselect All Lessons' : 'Select All Lessons'}
          </button>
        </div>

        {/* Actions */}
        <div className="tc-actions">
          <button className="tc-btn tc-btn-back" onClick={() => goBack('categories')}>
            <ArrowLeftIcon /> Back
          </button>
          <button
            className="tc-btn tc-btn-next"
            onClick={() => goForward('settings')}
            disabled={selectedSubcategoryStats.available === 0}
          >
            Next <ArrowRightIcon />
          </button>
        </div>
      </div>
    );
  };

  // ── Step 3: Settings & Generate ──
  const renderSettingsStep = () => {
    const isAssessment = testType === 'assessment';
    const effectiveQuestionCount = isAssessment ? 150 : questionCount;
    const effectiveMax = isAssessment ? 150 : maxAllowed;

    return (
      <div>
        {/* Back + Title */}
        <div className="tc-step-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="tc-btn-back"
              onClick={() => {
                if (categoryType === 'subjects') goBack('lessons');
                else goBack('categories');
              }}
              style={{ padding: '8px 12px' }}
            >
              <BackArrowIcon />
            </button>
            <h2 className="tc-step-title">Test Settings</h2>
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

        {/* Test Type Selection */}
        <div className="tc-test-type-section">
          <div className="tc-test-type-label">Test Mode</div>
          <div className="tc-test-type-grid">
            <div
              className={`tc-test-type-card${testType === 'practice' ? ' active' : ''}`}
              onClick={() => setTestType('practice')}
            >
              <div className="tc-test-type-name">Practice</div>
              <div className="tc-test-type-desc">Standard practice test</div>
            </div>
            <div className={`tc-test-type-card${isCatMode ? ' active' : ''}${categoryType === 'caseStudies' ? ' disabled' : ''}`}
              onClick={() => { if (categoryType !== 'caseStudies') setTestType(testType === 'cat' ? 'practice' : 'cat'); }}
            >
              <div className="tc-test-type-name">CAT</div>
              <div className="tc-test-type-desc">Adaptive testing</div>
            </div>
            <div className={`tc-test-type-card${isAssessmentMode ? ' active' : ''}${categoryType === 'caseStudies' ? ' disabled' : ''}`}
              onClick={() => { if (categoryType !== 'caseStudies') setTestType(testType === 'assessment' ? 'practice' : 'assessment'); }}
            >
              <div className="tc-test-type-name">Assessment</div>
              <div className="tc-test-type-desc">150 questions, hard</div>
            </div>
            <div className={`tc-test-type-card${testType === 'caseStudy' ? ' active' : ''}${categoryType !== 'caseStudies' ? ' disabled' : ''}`}
              onClick={() => { if (categoryType === 'caseStudies') setTestType('caseStudy'); }}
            >
              <div className="tc-test-type-name">Case Study</div>
              <div className="tc-test-type-desc">NGN case studies</div>
            </div>
          </div>
        </div>

        {/* Question Count (not for CAT) */}
        {testType !== 'cat' && (
          <div className="tc-question-count-section">
            <div className="tc-question-count-label">
              Number of Questions
              {!isAssessment && ` (max: ${effectiveMax})`}
            </div>
            <div className="tc-question-count-row">
              <button
                className="tc-question-count-btn"
                onClick={() => {
                  if (!isAssessment) {
                    const newVal = Math.max(5, questionCount - 5);
                    setQuestionCount(newVal);
                    setQuestionCountInput(String(newVal));
                  }
                }}
                disabled={isAssessment || questionCount <= 5}
              >
                <MinusIcon />
              </button>
              <input
                className="tc-question-count-input"
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
                onBlur={() => {
                  setQuestionCountInput(String(questionCount));
                }}
                readOnly={isAssessment}
              />
              <button
                className="tc-question-count-btn"
                onClick={() => {
                  if (!isAssessment) {
                    const newVal = Math.min(effectiveMax, questionCount + 5);
                    setQuestionCount(newVal);
                    setQuestionCountInput(String(newVal));
                  }
                }}
                disabled={isAssessment || questionCount >= effectiveMax}
              >
                <PlusIcon />
              </button>
            </div>
          </div>
        )}

        {/* Timed / Tutor Mode (not for special modes) */}
        {!isSpecialMode && (
          <div className="tc-mode-section">
            <div className="tc-mode-title">Options</div>
            <div className="tc-mode-toggle">
              <div className="tc-mode-info">
                <div className="tc-mode-label">Timed Mode</div>
                <div className="tc-mode-desc">85 seconds per question</div>
              </div>
              <button
                className={`tc-toggle-switch${timed ? ' on' : ''}`}
                onClick={() => { setTimed(!timed); if (!timed) setTutorMode(false); }}
              >
                <div className="tc-toggle-knob" />
              </button>
            </div>
            <div className="tc-mode-toggle">
              <div className="tc-mode-info">
                <div className="tc-mode-label">Tutor Mode</div>
                <div className="tc-mode-desc">Shows rationale after each answer</div>
              </div>
              <button
                className={`tc-toggle-switch${tutorMode ? ' on' : ''}`}
                onClick={() => { setTutorMode(!tutorMode); if (!tutorMode) setTimed(false); }}
              >
                <div className="tc-toggle-knob" />
              </button>
            </div>
          </div>
        )}

        {/* Question Status Filters */}
        <div className="tc-status-filters">
          <div className="tc-checkbox-header">
            <span className="tc-checkbox-header-label">Question Status</span>
          </div>
          {[
            { key: 'unused', label: 'Unused', color: '#3b82f6' },
            { key: 'incorrect', label: 'Incorrect', color: '#ef4444' },
            { key: 'marked', label: 'Marked', color: '#f59e0b' },
            { key: 'correct', label: 'Correct On Reattempt', color: '#22c55e' },
            { key: 'omitted', label: 'Omitted', color: '#64748b' },
          ].map(status => {
            const isActive = statusFilters[status.key];
            return (
              <div
                key={status.key}
                className={`tc-status-item${isActive ? ' active' : ''}`}
                onClick={() => setStatusFilters(prev => ({ ...prev, [status.key]: !prev[status.key] }))}
              >
                <div className="tc-status-dot" style={{ background: isActive ? status.color : '#cbd5e1' }} />
                <span className="tc-status-label">{status.label}</span>
                <span className="tc-status-count">
                  {activeStatusCounts[status.key] || 0}
                </span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="tc-actions">
          <button className="tc-btn tc-btn-back" onClick={() => {
            if (categoryType === 'subjects') goBack('lessons');
            else goBack('categories');
          }}>
            <ArrowLeftIcon /> Back
          </button>
          <button
            className={`tc-btn tc-btn-generate${loading ? ' loading' : ''}`}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <span className="tc-spinner" /> : null}
            {loading ? 'Loading Pool...' : 'Generate Test'}
          </button>
        </div>
      </div>
    );
  };

  // ── Submit Handler ──
  const handleSubmit = async () => {
    setError('');

    if (testType === 'cat') {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post('/api/student/cat/start', { testType }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        navigate('/cat-session', { state: { ...response.data, testType } });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to start CAT session.');
      } finally {
        setLoading(false);
      }
      return;
    }

    const isAssessment = testType === 'assessment';
    const effectiveTutorMode = isAssessment ? true : tutorMode;
    const effectiveTimed = isAssessment ? true : timed;
    const effectiveQuestionCount = isAssessment ? 150 : questionCount;

    // Validation
    if (categoryType === 'clientNeeds') {
      if (selectedClientNeedsTotal === 0) { setError('No questions available in selected client needs.'); return; }
      if (effectiveQuestionCount > selectedClientNeedsTotal) { setError(`Only ${selectedClientNeedsTotal} questions available.`); return; }
    } else if (categoryType === 'caseStudies') {
      if (selectedCaseStudiesTotal === 0) { setError('No case study questions available.'); return; }
      if (effectiveQuestionCount > selectedCaseStudiesTotal) { setError(`Only ${selectedCaseStudiesTotal} case study questions available.`); return; }
    } else {
      if (!isAssessment && selectedSubcategoryPairs.length === 0) { setError('Select at least one subcategory.'); return; }
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

      if (categoryType === 'clientNeeds') {
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
          ...(isAssessment ? { difficulty: 'hard' } : {})
        }, { headers: { Authorization: `Bearer ${token}` } });

        const navData = { ...response.data, testType };
        if (isAssessment) navData.settings = { ...navData.settings, testName: 'Assessment' };
        navigate('/test-session', { state: navData });

      } else if (categoryType === 'caseStudies') {
        const response = await axios.post('/api/student/generate-test', {
          questionCount: effectiveQuestionCount,
          timed: effectiveTimed,
          tutorMode: effectiveTutorMode,
          statusFilters,
          testType: 'caseStudy',
        }, { headers: { Authorization: `Bearer ${token}` } });

        const navData = { ...response.data, testType: 'caseStudy' };
        navData.settings = { ...navData.settings, testName: 'Case Study' };
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
          ...(isAssessment ? { difficulty: 'hard' } : {})
        }, { headers: { Authorization: `Bearer ${token}` } });

        const navData = { ...response.data, testType };
        if (isAssessment) navData.settings = { ...navData.settings, testName: 'Assessment' };
        navigate('/test-session', { state: navData });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate test.');
    } finally {
      setLoading(false);
    }
  };

  // ── Compute total steps for progress bar ──
  const totalSteps = categoryType === 'subjects' ? 4 : 3;
  const currentStepNum = flowStep === 'choose' ? 1
    : flowStep === 'categories' ? 2
    : flowStep === 'lessons' ? 3
    : categoryType === 'subjects' ? 4 : 3;

  const stepLabels = categoryType === 'subjects'
    ? ['Choose', 'Subjects', 'Lessons', 'Settings']
    : ['Choose', categoryType === 'clientNeeds' ? 'Client Needs' : 'Case Studies', 'Settings'];

  return (
    <div className="tc-container">
      {/* Progress Bar */}
      {flowStep !== 'choose' && (
        <ProgressBar
          currentStep={currentStepNum}
          totalSteps={totalSteps}
          stepLabels={stepLabels}
        />
      )}

      {/* Watermark */}
      {user && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%) rotate(-35deg)',
          fontSize: '72px', fontWeight: 800,
          color: 'rgba(0,0,0,0.02)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
          zIndex: 999998, letterSpacing: '8px'
        }}>
          {user.name || user.email || ''}
        </div>
      )}

      {/* Animated Content */}
      <div key={animKey} className={animDirection === 'forward' ? 'tc-slide-enter' : 'tc-slide-enter-back'}>
        {flowStep === 'choose' && renderChooseStep()}
        {flowStep === 'categories' && renderCategoriesStep()}
        {flowStep === 'lessons' && renderLessonsStep()}
        {flowStep === 'settings' && renderSettingsStep()}
      </div>
    </div>
  );
};

export default TestCustomization;
