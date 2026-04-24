import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../constants/Categories';
import { NCLEX_CLIENT_NEEDS_CATEGORIES } from '../constants/ClientNeeds';
import './TestCustomization.css';

// Use the imported constant
const CLIENT_NEEDS_CATEGORIES = NCLEX_CLIENT_NEEDS_CATEGORIES;

const TestCustomization = () => {
  // ─── Normalize key for client-needs lookups ───
  const normalizeKey = (value) => {
    const base = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/['']/g, '')
      .replace(/\band\b/g, '&')
      .replace(/\s*\/\s*/g, '/')
      .replace(/\s*&\s*/g, '&')
      .replace(/[(),.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return base
      .replace(/[/&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // ─── Wizard step ───
  const [step, setStep] = useState(1);

  // ─── Selected categories for Step 2 ───
  const [selectedCategories, setSelectedCategories] = useState([]);

  // ─── All existing state variables preserved ───
  const [selectedSubcategoryPairs, setSelectedSubcategoryPairs] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [questionCount, setQuestionCount] = useState(85);
  const [questionCountInput, setQuestionCountInput] = useState('85');
  const [timed, setTimed] = useState(true);
  const [tutorMode, setTutorMode] = useState(false);
  const [testType, setTestType] = useState('practice'); // 'practice', 'cat', 'assessment'
  const [examMode, setExamMode] = useState('mixed'); // 'mixed', 'classic', 'ngn'
  const [questionTypeFilter, setQuestionTypeFilter] = useState([]); // [] = all, or ['sata','unfolding','standalone'] multi-select
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subcategoryCounts, setSubcategoryCounts] = useState({});
  const [usedSubcategoryCounts, setUsedSubcategoryCounts] = useState({});
  const [omittedSubcategoryCounts, setOmittedSubcategoryCounts] = useState({});
  // NGN (case-study) counts per subject — separate from normal questions
  const [ngnSubcategoryCounts, setNgnSubcategoryCounts] = useState({});
  const [ngnCategoryCounts, setNgnCategoryCounts] = useState({});
  const [usedNgnCategoryCounts, setUsedNgnCategoryCounts] = useState({});
  const [categoryMap, setCategoryMap] = useState(CATEGORIES);
  const [countLoadError, setCountLoadError] = useState('');

  // Category tab: 'subjects' or 'clientNeeds'
  const [categoryTab, setCategoryTab] = useState('clientNeeds');

  // Client Needs selections
  const [selectedClientNeeds, setSelectedClientNeeds] = useState([]);
  const [clientNeedsCounts, setClientNeedsCounts] = useState({});
  const [clientNeedsNgnCounts, setClientNeedsNgnCounts] = useState({});

  // Question status filters
  const [statusFilters, setStatusFilters] = useState({
    unused: true,
    incorrect: false,
    marked: false,
    omitted: false,
    correct: false
  });

  // Question status counts — tab-specific
  const [statusCounts, setStatusCounts] = useState({
    unused: 0,
    unusedNgn: 0,
    incorrect: 0,
    incorrectNgn: 0,
    marked: 0,
    markedNgn: 0,
    omitted: 0,
    omittedNgn: 0,
    correct: 0,
    correctNgn: 0,
    total: 0
  });
  const [subjectStatusCounts, setSubjectStatusCounts] = useState(null);
  const [subjectNgnStatusCounts, setSubjectNgnStatusCounts] = useState(null);
  const [clientNeedStatusCounts, setClientNeedStatusCounts] = useState(null);
  const [clientNeedNgnStatusCounts, setClientNeedNgnStatusCounts] = useState(null);
  const [caseStudyTotalCount, setCaseStudyTotalCount] = useState(0);
  const [typeCounts, setTypeCounts] = useState({ sata: { total: 0 }, unfolding: { total: 0 }, standalone: { total: 0 } });

  // Dismissed info banners — persisted to localStorage
  const [dismissedBanners, setDismissedBanners] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nclex-dismissed-banners') || '{}');
    } catch { return {}; }
  });
  const dismissBanner = (key) => {
    setDismissedBanners(prev => {
      const next = { ...prev, [key]: true };
      localStorage.setItem('nclex-dismissed-banners', JSON.stringify(next));
      return next;
    });
  };

  const navigate = useNavigate();

  // ─── Toggle handlers (independent — both can be on) ───
  const handleTimedToggle = (checked) => {
    setTimed(checked);
  };

  const handleTutorToggle = (checked) => {
    setTutorMode(checked);
  };

  const getClientNeedCount = (clientNeed) => {
    const key = normalizeKey(clientNeed);
    return clientNeedsCounts?.[key] || 0;
  };

  const getClientNeedNgnCount = (clientNeed) => {
    const key = normalizeKey(clientNeed);
    return clientNeedsNgnCounts?.[key] || 0;
  };

  const handleClientNeedToggle = (clientNeed) => {
    setSelectedClientNeeds(prev =>
      prev.includes(clientNeed)
        ? prev.filter(c => c !== clientNeed)
        : [...prev, clientNeed]
    );
  };

  const handleSelectAllClientNeeds = () => {
    if (selectedClientNeeds.length === NCLEX_CLIENT_NEEDS_CATEGORIES.length) {
      setSelectedClientNeeds([]);
    } else {
      setSelectedClientNeeds([...NCLEX_CLIENT_NEEDS_CATEGORIES]);
    }
  };

  const getPairKey = (category, subcategory) => `${category}:::${subcategory}`;

  const isSubcategorySelected = (category, subcategory) =>
    selectedSubcategoryPairs.includes(getPairKey(category, subcategory));

  const getSubcategoryCount = (category, subcategory) => {
    return subcategoryCounts?.[category]?.[subcategory] || 0;
  };

  const getUsedSubcategoryCount = (category, subcategory) => {
    return usedSubcategoryCounts?.[category]?.[subcategory] || 0;
  };

  const getOmittedSubcategoryCount = (category, subcategory) => {
    return omittedSubcategoryCounts?.[category]?.[subcategory] || 0;
  };

  // NGN (case-study) count helpers — separate from normal questions
  const getNgnSubcategoryCount = (category, subcategory) => {
    return ngnSubcategoryCounts?.[category]?.[subcategory] || 0;
  };

  const getNgnCategoryCount = (category) => {
    return ngnCategoryCounts?.[category] || 0;
  };

  // ─── Existing useEffect for fetching counts preserved ───
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setCountLoadError('');
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/student/subcategory-counts', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const totalRawNestedCounts =
          response.data?.totalCountsByCategorySubcategory || response.data?.countsByCategorySubcategory || {};
        const usedRawNestedCounts = response.data?.usedCountsByCategorySubcategory || {};
        const omittedRawNestedCounts = response.data?.omittedCountsByCategorySubcategory || {};

        setSubcategoryCounts(totalRawNestedCounts);
        setUsedSubcategoryCounts(usedRawNestedCounts);
        setOmittedSubcategoryCounts(omittedRawNestedCounts);

        // NGN (case-study) counts per subject — separate from normal
        setNgnSubcategoryCounts(response.data?.ngnCountsByCategorySubcategory || {});
        setNgnCategoryCounts(response.data?.ngnCountsByCategory || {});
        setUsedNgnCategoryCounts(response.data?.usedNgnCountsByCategory || {});

        // Fetch client needs counts
        try {
          const clientNeedsResponse = await axios.get('/api/student/client-needs-counts', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setClientNeedsCounts(clientNeedsResponse.data?.countsByClientNeed || {});
          setClientNeedsNgnCounts(clientNeedsResponse.data?.ngnCountsByClientNeed || {});
        } catch (cnErr) {
          console.error('Failed to load client needs counts', cnErr);
          setClientNeedsCounts({});
          setClientNeedsNgnCounts({});
        }

        // Fetch question status counts
        try {
          const statusResponse = await axios.get('/api/student/question-status-counts', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setStatusCounts({
            unused: statusResponse.data?.unused || 0,
            unusedNgn: statusResponse.data?.unusedNgn || 0,
            incorrect: statusResponse.data?.incorrect || 0,
            incorrectNgn: statusResponse.data?.incorrectNgn || 0,
            marked: statusResponse.data?.marked || 0,
            markedNgn: statusResponse.data?.markedNgn || 0,
            omitted: statusResponse.data?.omitted || 0,
            omittedNgn: statusResponse.data?.omittedNgn || 0,
            correct: statusResponse.data?.correct || 0,
            correctNgn: statusResponse.data?.correctNgn || 0,
            total: statusResponse.data?.total || 0
          });
          if (statusResponse.data?.subjects) {
            setSubjectStatusCounts({
              ...statusResponse.data.subjects,
              total: statusResponse.data.subjects.total || 0
            });
          }
          if (statusResponse.data?.subjectsNgn) {
            setSubjectNgnStatusCounts({
              ...statusResponse.data.subjectsNgn,
              total: statusResponse.data.subjectsNgn.total || 0
            });
          }
          if (statusResponse.data?.clientNeeds) {
            setClientNeedStatusCounts({
              ...statusResponse.data.clientNeeds,
              total: statusResponse.data.clientNeeds.total || 0
            });
          }
          if (statusResponse.data?.clientNeedsNgn) {
            setClientNeedNgnStatusCounts({
              ...statusResponse.data.clientNeedsNgn,
              total: statusResponse.data.clientNeedsNgn.total || 0
            });
          }
          if (statusResponse.data?.caseStudies) {
            setCaseStudyTotalCount(statusResponse.data.caseStudies.total || 0);
          }
          if (statusResponse.data?.byType) {
            setTypeCounts({
              sata: statusResponse.data.byType.sata || { total: 0 },
              unfolding: statusResponse.data.byType.unfolding || { total: 0 },
              standalone: statusResponse.data.byType.standalone || { total: 0 },
            });
          }
        } catch (statusErr) {
          console.error('Failed to load question status counts', statusErr);
        }
      } catch (err) {
        console.error('Failed to load subcategory counts', err);
        setCountLoadError('Could not load question counts');
      }
    };

    fetchCounts();
  }, []);

  // ─── Existing computed values preserved ───
  const categoryTotals = useMemo(() => {
    return Object.fromEntries(
      Object.entries(categoryMap).map(([category, subcats]) => [
        category,
        subcats.reduce((sum, sub) => sum + getSubcategoryCount(category, sub), 0)
      ])
    );
  }, [subcategoryCounts, categoryMap]);

  const usedCategoryTotals = useMemo(() => {
    return Object.fromEntries(
      Object.entries(categoryMap).map(([category, subcats]) => [
        category,
        subcats.reduce((sum, sub) => sum + getUsedSubcategoryCount(category, sub), 0)
      ])
    );
  }, [usedSubcategoryCounts, categoryMap]);

  const categoryColumns = useMemo(() => {
    const cols = [[], []];
    const entries = Object.entries(categoryMap);
    entries.forEach((entry, index) => {
      cols[index % 2].push(entry);
    });
    return cols;
  }, [categoryMap]);

  const clientNeedsColumns = useMemo(() => {
    const cols = [[], []];
    CLIENT_NEEDS_CATEGORIES.forEach((clientNeed, index) => {
      cols[index % 2].push(clientNeed);
    });
    return cols;
  }, []);

  const clientNeedsTotal = useMemo(() => {
    const normalTotal = CLIENT_NEEDS_CATEGORIES.reduce((sum, cn) => sum + getClientNeedCount(cn), 0);
    const ngnTotal = CLIENT_NEEDS_CATEGORIES.reduce((sum, cn) => sum + getClientNeedNgnCount(cn), 0);
    return (showNormalCount ? normalTotal : 0) + (showNgnCount ? ngnTotal : 0);
  }, [clientNeedsCounts, clientNeedsNgnCounts, showNormalCount, showNgnCount]);

  const selectedClientNeedsTotal = useMemo(() => {
    const allSelected = selectedClientNeeds.length === 0 ||
      selectedClientNeeds.length === NCLEX_CLIENT_NEEDS_CATEGORIES.length;
    if (allSelected) {
      return clientNeedsTotal;
    }
    return selectedClientNeeds.reduce((sum, cn) => {
      const normal = showNormalCount ? getClientNeedCount(cn) : 0;
      const ngn = showNgnCount ? getClientNeedNgnCount(cn) : 0;
      return sum + normal + ngn;
    }, 0);
  }, [selectedClientNeeds, clientNeedsCounts, clientNeedsNgnCounts, clientNeedsTotal, showNormalCount, showNgnCount]);

  const allPossiblePairs = useMemo(() => {
    return Object.entries(categoryMap).flatMap(([category, subcategories]) =>
      subcategories.map(sub => getPairKey(category, sub))
    );
  }, [categoryMap]);

  const selectedStats = useMemo(() => {
    const allSelected = selectedSubcategoryPairs.length === 0 ||
      selectedSubcategoryPairs.length === allPossiblePairs.length;

    if (allSelected) {
      return {
        available: (showNormalCount ? (subjectStatusCounts?.total || statusCounts.total || 0) : 0) +
                  (showNgnCount ? (subjectNgnStatusCounts?.total || 0) : 0),
        used: 0,
        omitted: 0,
      };
    }

    return selectedSubcategoryPairs.reduce((totals, pairKey) => {
      const [category, subcategory] = pairKey.split(':::');
      const normalAvailable = showNormalCount ? getSubcategoryCount(category, subcategory) : 0;
      const ngnAvailable = showNgnCount ? getNgnSubcategoryCount(category, subcategory) : 0;
      const used = getUsedSubcategoryCount(category, subcategory);
      const omitted = getOmittedSubcategoryCount(category, subcategory);

      return {
        available: totals.available + normalAvailable + ngnAvailable,
        used: totals.used + used,
        omitted: totals.omitted + omitted,
      };
    }, { available: 0, used: 0, omitted: 0 });
  }, [selectedSubcategoryPairs, allPossiblePairs, subcategoryCounts, ngnSubcategoryCounts, usedSubcategoryCounts, omittedSubcategoryCounts, categoryMap, statusCounts, subjectStatusCounts, subjectNgnStatusCounts, showNormalCount, showNgnCount]);

  const questionRangeMin = 5;
  const questionRangeMax = 150;

  useEffect(() => {
    if (questionCount > questionRangeMax || questionCount < questionRangeMin) {
      setQuestionCount(Math.min(questionRangeMax, Math.max(questionRangeMin, questionCount)));
    }
  }, [questionCount, questionRangeMax, questionRangeMin, testType]);

  const toggleCategory = (category) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  const handleSubcategoryToggle = (category, subcat) => {
    const key = getPairKey(category, subcat);
    setSelectedSubcategoryPairs(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  const handleCategorySelectAll = (category, subcats) => {
    const allSelected = subcats.every(sub => isSubcategorySelected(category, sub));
    if (allSelected) {
      const subcatKeys = new Set(subcats.map(sub => getPairKey(category, sub)));
      setSelectedSubcategoryPairs(prev => prev.filter(s => !subcatKeys.has(s)));
    } else {
      const missing = subcats
        .map(sub => getPairKey(category, sub))
        .filter(key => !selectedSubcategoryPairs.includes(key));
      setSelectedSubcategoryPairs(prev => [...prev, ...missing]);
    }
  };

  const handleSelectAllSubjects = () => {
    const allPairs = Object.entries(categoryMap).flatMap(([category, subcategories]) =>
      subcategories.map(sub => getPairKey(category, sub))
    );
    if (selectedSubcategoryPairs.length === allPairs.length) {
      setSelectedSubcategoryPairs([]);
    } else {
      setSelectedSubcategoryPairs(allPairs);
    }
  };

  // ─── Existing computed stats ───
  const activeStatusCounts = categoryTab === 'subjects'
    ? (subjectStatusCounts || statusCounts)
    : categoryTab === 'clientNeeds'
      ? (clientNeedStatusCounts || statusCounts)
      : statusCounts;
  const activeNgnStatusCounts = categoryTab === 'subjects'
    ? subjectNgnStatusCounts
    : categoryTab === 'clientNeeds'
      ? clientNeedNgnStatusCounts
      : null;

  // Dynamic display based on examMode:
  // classic = only normal, ngn = only case studies, mixed = both
  const showNormalCount = examMode !== 'ngn';
  const showNgnCount = examMode !== 'classic';
  const totalNgnBank = activeNgnStatusCounts?.total || 0;
  const normalBankTotal = activeStatusCounts.total || 0;
  const totalQuestionBank = (showNormalCount ? normalBankTotal : 0) + (showNgnCount ? totalNgnBank : 0);

  const currentAvailable = categoryTab === 'clientNeeds'
    ? selectedClientNeedsTotal
    : selectedStats.available;
  const maxAllowed = Math.min(questionRangeMax, currentAvailable);

  // ─── Existing handleSubmit preserved exactly ───
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // CAT and Assessment both use the adaptive CAT engine (NCLEX spec: 85–150 questions, theta-based decisions)
    if (testType === 'cat' || testType === 'assessment') {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post('/api/student/cat/start', { testType }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const navData = { ...response.data, testType };
        navigate('/cat-session', { state: navData });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to start session. Make sure there are enough calibrated questions.');
      } finally {
        setLoading(false);
      }
      return;
    }

    const isPractice = testType === 'practice';
    const effectiveTutorMode = false; // No tutoring for assessments
    const effectiveTimed = timed;

    if (categoryTab === 'clientNeeds') {
      if (currentAvailable === 0) {
        setError('No questions are available in the selected client needs.');
        return;
      }
      if (questionCount > currentAvailable) {
        setError(`Only ${currentAvailable} questions match your current selection.`);
        return;
      }
    } else {
      if (selectedSubcategoryPairs.length === 0) {
        setError('Select at least one subcategory');
        return;
      }
      if (selectedStats.available === 0) {
        setError('No questions are available in the selected subcategories.');
        return;
      }
      if (questionCount > selectedStats.available) {
        setError(`Only ${selectedStats.available} questions match your current selection.`);
        return;
      }
    }

    if (questionCount < questionRangeMin || questionCount > questionRangeMax) {
      setError(`Question count must be between ${questionRangeMin} and ${questionRangeMax}.`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');

      if (categoryTab === 'clientNeeds') {
        const clientNeedsSelections = selectedClientNeeds.length > 0
          ? selectedClientNeeds.map(cn => ({ clientNeed: cn, clientNeedSubcategory: cn }))
          : CLIENT_NEEDS_CATEGORIES.map(cn => ({ clientNeed: cn, clientNeedSubcategory: cn }));

        const response = await axios.post('/api/student/generate-test', {
          clientNeedsSelections: clientNeedsSelections,
          filterMode: 'clientNeeds',
          questionCount,
          timed: effectiveTimed,
          tutorMode: effectiveTutorMode,
          statusFilters,
          testType,
          ...(isPractice ? { examMode, questionTypeFilter } : {})
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const navData = { ...response.data, testType };
        navigate('/test-session', { state: navData });
      } else {
        const selections = selectedSubcategoryPairs.map((pairKey) => {
          const [category, subcategory] = pairKey.split(':::');
          return { category, subcategory };
        });
        const response = await axios.post('/api/student/generate-test', {
          selections,
          subcategories: selections.map((item) => item.subcategory),
          questionCount,
          timed: effectiveTimed,
          tutorMode: effectiveTutorMode,
          statusFilters,
          testType,
          ...(isPractice ? { examMode, questionTypeFilter } : {})
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const navData = { ...response.data, testType };
        navigate('/test-session', { state: navData });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate test');
    } finally {
      setLoading(false);
    }
  };

  // ─── Wizard navigation helpers ───
  const handleNextFromStep1 = () => {
    setError('');
    if (testType === 'cat' || testType === 'assessment') {
      handleSubmit();
      return;
    }
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    setError('');
    // If Client Needs organization, no Step 3 — generate directly
    if (categoryTab === 'clientNeeds') {
      handleSubmit();
      return;
    }
    // If subjects, ensure at least one category is selected for expansion in step 3
    if (selectedCategories.length === 0) {
      // Default to first category
      setSelectedCategories([Object.keys(categoryMap)[0]]);
    }
    setStep(3);
  };

  const handleBack = () => {
    setError('');
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // ─── Category selection for Step 2 ───
  const handleCategoryToggle = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSelectAllCategories = () => {
    const allCats = Object.keys(categoryMap);
    if (selectedCategories.length === allCats.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(allCats);
    }
  };

  // ─── Question type filter pills ───
  const questionTypePills = [
    { key: 'all', label: `All (${totalQuestionBank})` },
    { key: 'sata', label: `SATA (${typeCounts.sata.total || 0})` },
    { key: 'unfolding', label: `Unfolding Case Study (${typeCounts.unfolding.total || 0})` },
    { key: 'standalone', label: `Standalone Case Study (${typeCounts.standalone.total || 0})` },
  ];

  // ─── Active status filter for display ───
  const activeStatusFilter = 'unused'; // simplified: always showing unused by default

  // ─── Render helpers ───
  const renderCheckbox = (checked, onClick) => (
    <div
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onClick(); } }}
      tabIndex={0}
      className={`tc-checkbox-custom ${checked ? 'tc-checkbox-custom--checked' : ''}`}
    >
      {checked && <i className="fas fa-check" />}
    </div>
  );

  const renderRadioCircle = (active) => (
    <div className={`tc-radio-circle`}>
      <div className="tc-radio-circle__inner" style={{ background: active ? '#2196F3' : 'transparent' }} />
    </div>
  );

  // ═══════════════════════════════════════════════
  // STEP 1: Test Settings
  // ═══════════════════════════════════════════════
  const renderStep1 = () => (
    <div className="tc-step" key="step1">
      {/* Q-BANK MODE */}
      <div className="tc-section-title">Q-BANK MODE</div>
      <div>
        {/* Tutorial Toggle — only for practice mode */}
        {testType === 'practice' && (
          <div className="tc-toggle-row">
            <div className="tc-toggle-label" onClick={() => handleTutorToggle(!tutorMode)}>
              <i className="fas fa-book-open" />
              <span>Tutorial</span>
            </div>
            <label className="tc-toggle">
              <input type="checkbox" checked={tutorMode} onChange={() => handleTutorToggle(!tutorMode)} />
              <span className="tc-toggle__slider" />
            </label>
          </div>
        )}

        {/* Timed Toggle — always available, forced on for CAT/assessment */}
        <div className="tc-toggle-row" style={{ opacity: (testType === 'cat' || testType === 'assessment') ? 0.5 : 1 }}>
          <div className="tc-toggle-label" onClick={() => {
            if (testType === 'cat' || testType === 'assessment') return;
            handleTimedToggle(!timed);
          }}>
            <i className="fas fa-clock" />
            <span>Timed{(testType === 'cat' || testType === 'assessment') ? ' (Required)' : ''}</span>
          </div>
          <label className="tc-toggle">
            <input
              type="checkbox"
              checked={testType === 'cat' || testType === 'assessment' ? true : timed}
              disabled={testType === 'cat' || testType === 'assessment'}
              onChange={() => handleTimedToggle(!timed)}
            />
            <span className="tc-toggle__slider" />
          </label>
        </div>

        {/* CAT Toggle */}
        <div className="tc-toggle-row">
          <div className="tc-toggle-label" onClick={() => setTestType(testType === 'cat' ? 'practice' : 'cat')}>
            <i className="fas fa-brain" />
            <span>CAT (Adaptive Test)</span>
          </div>
          <label className="tc-toggle">
            <input
              type="checkbox"
              checked={testType === 'cat'}
              onChange={() => setTestType(testType === 'cat' ? 'practice' : 'cat')}
            />
            <span className="tc-toggle__slider" />
          </label>
        </div>

        {/* Readiness Assessment */}
        <div className="tc-assessment-row" onClick={() => setTestType(testType === 'assessment' ? 'practice' : 'assessment')}>
          <input
            type="checkbox"
            className="tc-assessment-checkbox"
            checked={testType === 'assessment'}
            onChange={() => setTestType(testType === 'assessment' ? 'practice' : 'assessment')}
          />
          <span className="tc-assessment-text">Readiness Assessment</span>
        </div>
      </div>

      {/* Tutorial Info Box */}
      {tutorMode && testType === 'practice' && (
        <div className="tc-info-box">
          <div className="tc-info-box__header">
            <i className="fas fa-file-alt" />
            <span>Tutorial</span>
          </div>
          <div className="tc-info-box__body">
            Tutorial mode shows the correct answer and detailed rationale immediately after you answer each question. Use this mode when learning new material or reviewing weak areas. No timer is used in tutorial mode.
          </div>
        </div>
      )}

      {/* TEST TYPE — hide for CAT and Assessment */}
      {testType === 'practice' && (
        <>
          <div className="tc-section-title">TEST TYPE</div>
          <div className="tc-radio-group">
            {['mixed', 'classic', 'ngn'].map((type) => (
              <div
                key={type}
                className={`tc-radio-item tc-radio-item--horizontal ${examMode === type ? 'tc-radio-item--active' : ''}`}
                onClick={() => setExamMode(type)}
              >
                {renderRadioCircle(examMode === type)}
                <span className="tc-radio-text">
                  {type === 'mixed' ? 'Mixed' : type === 'classic' ? 'Classic' : 'NGN'}
                </span>
              </div>
            ))}
          </div>

          {/* ORGANIZATION */}
          <div className="tc-section-title">ORGANIZATION</div>
          <div className="tc-radio-group tc-radio-group--vertical">
            <div
              className={`tc-radio-item ${categoryTab === 'subjects' ? 'tc-radio-item--active' : ''}`}
              onClick={() => setCategoryTab('subjects')}
            >
              {renderRadioCircle(categoryTab === 'subjects')}
              <span className="tc-radio-text">Subject or System</span>
            </div>
            <div
              className={`tc-radio-item ${categoryTab === 'clientNeeds' ? 'tc-radio-item--active' : ''}`}
              onClick={() => setCategoryTab('clientNeeds')}
            >
              {renderRadioCircle(categoryTab === 'clientNeeds')}
              <span className="tc-radio-text">Client Need Areas</span>
            </div>
          </div>

          {/* QUESTION TYPES (horizontal scrollable pills — multi-select) */}
          <div className="tc-section-title">QUESTION TYPES</div>
          <div className="tc-filter-pills">
            {questionTypePills.map((pill) => (
              <div
                key={pill.key}
                className={`tc-filter-pill ${pill.key === 'all'
                  ? questionTypeFilter.length === 0
                  : questionTypeFilter.includes(pill.key)
                  ? 'tc-filter-pill--active' : ''}`}
                onClick={() => {
                  if (pill.key === 'all') {
                    setQuestionTypeFilter([]);
                  } else {
                    setQuestionTypeFilter((prev) => {
                      const next = prev.includes(pill.key)
                        ? prev.filter((k) => k !== pill.key)
                        : [...prev, pill.key];
                      return next;
                    });
                  }
                }}
              >
                {pill.label}
              </div>
            ))}
          </div>

          {/* Status Filter */}
          <div className="tc-status-list">
            {[
              { key: 'unused', label: 'Unused', count: showNormalCount ? (activeStatusCounts.unused || 0) : 0, ngnCount: showNgnCount ? (activeNgnStatusCounts?.unused || 0) : 0 },
              { key: 'marked', label: 'Marked', count: showNormalCount ? (activeStatusCounts.marked || 0) : 0, ngnCount: showNgnCount ? (activeNgnStatusCounts?.marked || 0) : 0 },
              { key: 'incorrect', label: 'Incorrect', count: showNormalCount ? (activeStatusCounts.incorrect || 0) : 0, ngnCount: showNgnCount ? (activeNgnStatusCounts?.incorrect || 0) : 0 },
              { key: 'all', label: 'All', count: totalQuestionBank, ngnCount: showNgnCount ? totalNgnBank : 0 },
              { key: 'correct', label: 'Correct On Reattempt', count: showNormalCount ? (activeStatusCounts.correct || 0) : 0, ngnCount: showNgnCount ? (activeNgnStatusCounts?.correct || 0) : 0 },
              { key: 'omitted', label: 'Omitted', count: showNormalCount ? (activeStatusCounts.omitted || 0) : 0, ngnCount: showNgnCount ? (activeNgnStatusCounts?.omitted || 0) : 0 },
            ].map((status) => (
              <div
                key={status.key}
                className={`tc-radio-item ${statusFilters[status.key === 'all' ? 'unused' : status.key] ? 'tc-radio-item--active' : ''}`}
                onClick={() => {
                  if (status.key === 'all') {
                    setStatusFilters({ unused: true, incorrect: true, marked: true, omitted: true, correct: true });
                  } else {
                    setStatusFilters(prev => ({ ...prev, [status.key]: !prev[status.key] }));
                  }
                }}
              >
                {renderRadioCircle(statusFilters[status.key === 'all' ? 'unused' : status.key])}
                <span className="tc-radio-text">{status.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                  {status.ngnCount > 0 && (
                    <span className="tc-status-count" style={{ color: '#2E7D32', fontSize: 11 }}>
                      +{status.ngnCount} NGN
                    </span>
                  )}
                  <span className="tc-status-count">{status.count}</span>
                </div>
              </div>
            ))}
          </div>

          {/* TEST LENGTH */}
          <div className="tc-section-title">TEST LENGTH</div>
          <div className="tc-count-input-wrap">
            <div className="tc-count-description">
              Number of questions per test — maximum of {maxAllowed}
            </div>
            <input
              type="number"
              className="tc-count-input"
              value={questionCountInput}
              onChange={(e) => {
                const inputValue = e.target.value;
                setQuestionCountInput(inputValue);
                if (inputValue === '') return;
                const value = parseInt(inputValue, 10);
                if (!isNaN(value)) {
                  setQuestionCount(value);
                }
              }}
              onBlur={(e) => {
                const value = parseInt(e.target.value, 10);
                if (isNaN(value) || value < questionRangeMin) {
                  setQuestionCount(questionRangeMin);
                  setQuestionCountInput(String(questionRangeMin));
                } else if (value > maxAllowed) {
                  setQuestionCount(maxAllowed);
                  setQuestionCountInput(String(maxAllowed));
                } else {
                  setQuestionCount(value);
                  setQuestionCountInput(String(value));
                }
              }}
              min={questionRangeMin}
              max={maxAllowed}
            />
          </div>
        </>
      )}

      {/* Assessment info + proctoring warning */}
      {testType === 'assessment' && (
        <>
          {/* Proctoring Warning — dismissible */}
          {!dismissedBanners['assessment-proctoring'] && (
            <div className="tc-info-box" style={{ borderColor: '#C62828', position: 'relative' }}>
              <button
                type="button"
                onClick={() => dismissBanner('assessment-proctoring')}
                style={{ position: 'absolute', top: 8, right: 12, background: 'none', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer', opacity: 0.7 }}
              >
                <i className="fas fa-times" />
              </button>
              <div className="tc-info-box__header" style={{ background: '#C62828' }}>
                <i className="fas fa-video" />
                <span>Proctoring Enabled</span>
              </div>
              <div className="tc-info-box__body">
                This assessment is proctored. Your screen, webcam, and browser activity are monitored throughout the exam. Leaving the test window, switching tabs, or using unauthorized materials will be flagged as a violation and may result in automatic termination of your exam. Ensure you are in a quiet, well-lit environment with no distractions before proceeding.
              </div>
            </div>
          )}
          {/* Assessment Info */}
          <div className="tc-info-box" style={{ borderColor: '#FFE0B2' }}>
            <div className="tc-info-box__header" style={{ background: 'var(--orange)' }}>
              <i className="fas fa-clipboard-check" />
              <span>Readiness Assessment</span>
            </div>
            <div className="tc-info-box__body">
              Assessment mode uses real NCLEX CAT. The algorithm selects questions based on your ability, adjusting difficulty as you answer. Fixed at 150 questions with timed mode. Pause and tutorial features are disabled. The timer cannot be stopped once the assessment begins.
            </div>
          </div>
        </>
      )}

      {/* CAT info */}
      {testType === 'cat' && (
        <>
          <div className="tc-info-box" style={{ borderColor: '#E1BEE7' }}>
            <div className="tc-info-box__header" style={{ background: '#7B1FA2' }}>
              <i className="fas fa-brain" />
              <span>CAT Mode</span>
            </div>
            <div className="tc-info-box__body">
              CAT automatically selects questions based on your ability level. The test ends when the algorithm determines a pass/fail result with 95% confidence. No need to select categories or question count. Tutorial and pause features are disabled during CAT.
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════
  // STEP 2: Category/Subject Selection (or Client Needs)
  // ═══════════════════════════════════════════════
  const renderStep2 = () => {
    if (categoryTab === 'clientNeeds') {
      return renderStep2ClientNeeds();
    }
    return renderStep2Subjects();
  };

  const renderStep2Subjects = () => {
    const categories = Object.keys(categoryMap);
    const allSelected = selectedCategories.length === categories.length;

    return (
      <div className="tc-step" key="step2-subjects">
        <div className="tc-section-title">SUBJECTS</div>
        <div className="tc-checkbox-list-header">
          <span>Select All</span>
          {renderCheckbox(allSelected, handleSelectAllCategories)}
        </div>
        <hr className="tc-divider" />
        <div className="tc-checkbox-list">
          {categories.map((category) => {
            const count = showNormalCount ? (categoryTotals[category] || 0) : 0;
            const ngnCount = showNgnCount ? getNgnCategoryCount(category) : 0;
            const isSelected = selectedCategories.includes(category);
            return (
              <div
                key={category}
                className="tc-checkbox-item"
                onClick={() => handleCategoryToggle(category)}
              >
                {renderCheckbox(isSelected, () => handleCategoryToggle(category))}
                <span className="tc-checkbox-item-name">{category}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {showNgnCount && ngnCount > 0 && (
                    <span className="tc-count-badge" style={{ background: '#E8F5E9', color: '#2E7D32', fontSize: 11, fontWeight: 600 }}>
                      {ngnCount} NGN
                    </span>
                  )}
                  {showNormalCount && <span className="tc-count-badge">{count}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStep2ClientNeeds = () => {
    const allSelected = selectedClientNeeds.length === NCLEX_CLIENT_NEEDS_CATEGORIES.length;

    return (
      <div className="tc-step" key="step2-clientneeds">
        <div className="tc-section-title">CLIENT NEED AREAS</div>
        <div className="tc-checkbox-list-header">
          <span>Select All</span>
          {renderCheckbox(allSelected, handleSelectAllClientNeeds)}
        </div>
        <hr className="tc-divider" />
        <div className="tc-checkbox-list">
          {NCLEX_CLIENT_NEEDS_CATEGORIES.map((clientNeed) => {
            const count = showNormalCount ? getClientNeedCount(clientNeed) : 0;
            const ngnCount = showNgnCount ? getClientNeedNgnCount(clientNeed) : 0;
            const isSelected = selectedClientNeeds.includes(clientNeed);
            return (
              <div
                key={clientNeed}
                className="tc-checkbox-item"
                onClick={() => handleClientNeedToggle(clientNeed)}
              >
                {renderCheckbox(isSelected, () => handleClientNeedToggle(clientNeed))}
                <span className="tc-checkbox-item-name">{clientNeed}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {showNgnCount && ngnCount > 0 && (
                    <span className="tc-count-badge" style={{ background: '#E8F5E9', color: '#2E7D32', fontSize: 11, fontWeight: 600 }}>
                      {ngnCount} NGN
                    </span>
                  )}
                  {showNormalCount && <span className="tc-count-badge">{count}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════
  // STEP 3: Subcategory/Lessons Selection
  // ═══════════════════════════════════════════════
  const renderStep3 = () => {
    // Show subcategories for all selected categories
    const categoriesToShow = selectedCategories.length > 0
      ? selectedCategories
      : [Object.keys(categoryMap)[0]];

    return (
      <div className="tc-step" key="step3">
        <div className="tc-section-title">LESSONS</div>
        {categoriesToShow.map((category) => {
          const subcategories = categoryMap[category] || [];
          const allCatSelected = subcategories.every(sub => isSubcategorySelected(category, sub));
          const catNgnCount = showNgnCount ? getNgnCategoryCount(category) : 0;

          return (
            <div key={category}>
              {/* Category header with select all */}
              <div className="tc-subcategory-header">
                <i className="fas fa-folder" />
                <span>{category}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                  {showNgnCount && catNgnCount > 0 && (
                    <span className="tc-count-badge" style={{ background: '#E8F5E9', color: '#2E7D32', fontSize: 11, fontWeight: 600 }}>
                      {catNgnCount} NGN
                    </span>
                  )}
                  {showNormalCount && (
                    <span className="tc-count-badge">
                      {categoryTotals[category] || 0}
                    </span>
                  )}
                </div>
              </div>
              <div className="tc-checkbox-list-header">
                <span style={{ fontSize: 12 }}>Select All for {category}</span>
                {renderCheckbox(allCatSelected, () => handleCategorySelectAll(category, subcategories))}
              </div>
              <hr className="tc-divider" />
              <div className="tc-checkbox-list" style={{ maxHeight: '30vh' }}>
                {subcategories.map((sub) => {
                  const count = showNormalCount ? getSubcategoryCount(category, sub) : 0;
                  const ngnCount = showNgnCount ? getNgnSubcategoryCount(category, sub) : 0;
                  const isSelected = isSubcategorySelected(category, sub);
                  return (
                    <div
                      key={sub}
                      className="tc-checkbox-item"
                      onClick={() => handleSubcategoryToggle(category, sub)}
                    >
                      {renderCheckbox(isSelected, () => handleSubcategoryToggle(category, sub))}
                      <span className="tc-checkbox-item-name">{sub}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {showNgnCount && ngnCount > 0 && (
                          <span className="tc-count-badge" style={{ background: '#E8F5E9', color: '#2E7D32', fontSize: 11, fontWeight: 600 }}>
                            {ngnCount} NGN
                          </span>
                        )}
                        {showNormalCount && <span className="tc-count-badge">{count}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ═══════════════════════════════════════════════
  // Header title based on step
  // ═══════════════════════════════════════════════
  const getHeaderTitle = () => {
    switch (step) {
      case 1: return 'Create Test';
      case 2: return categoryTab === 'clientNeeds' ? 'Client Need Areas' : 'Subjects';
      case 3: return 'Lessons';
      default: return 'Create Test';
    }
  };

  // ═══════════════════════════════════════════════
  // Main render
  // ═══════════════════════════════════════════════
  return (
    <div className="tc-wizard">
      {/* Header */}
      <div className="tc-header">
        {step > 1 && (
          <button className="tc-header__back" onClick={handleBack} type="button">
            <i className="fas fa-arrow-left" />
            <span className="tc-header__back-text">Back</span>
          </button>
        )}
        <span className="tc-header__title">{getHeaderTitle()}</span>
        <div style={{ width: step > 1 ? 80 : 0 }} /> {/* Spacer for centering */}
      </div>

      {/* Error messages */}
      {error && (
        <div className="tc-error">
          <i className="fas fa-exclamation-circle" />
          <span>{error}</span>
        </div>
      )}
      {countLoadError && (
        <div className="tc-error" style={{ background: '#FFF3E0', color: '#E65100' }}>
          <i className="fas fa-exclamation-triangle" />
          <span>{countLoadError}</span>
        </div>
      )}

      {/* Content */}
      <div className="tc-content">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {/* Bottom Action Buttons */}
      {(step === 1 && testType === 'assessment') && (
        <div className="tc-actions">
          <button
            className="tc-btn-next tc-btn-next--full tc-btn-generate"
            type="button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'START ASSESSMENT'}
          </button>
        </div>
      )}

      {(step === 1 && testType === 'cat') && (
        <div className="tc-actions">
          <button
            className="tc-btn-next tc-btn-next--full tc-btn-generate"
            type="button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'START CAT'}
          </button>
        </div>
      )}

      {(step === 1 && testType === 'practice') && (
        <div className="tc-actions">
          <button
            className="tc-btn-next tc-btn-next--full"
            type="button"
            onClick={handleNextFromStep1}
          >
            Next <i className="fas fa-arrow-right" />
          </button>
        </div>
      )}

      {step === 2 && categoryTab === 'subjects' && (
        <div className="tc-actions">
          <button className="tc-btn-back" type="button" onClick={handleBack}>
            Back
          </button>
          <button
            className="tc-btn-next"
            type="button"
            onClick={handleNextFromStep2}
          >
            Next <i className="fas fa-arrow-right" />
          </button>
        </div>
      )}

      {step === 2 && categoryTab === 'clientNeeds' && (
        <div className="tc-actions">
          <button className="tc-btn-back" type="button" onClick={handleBack}>
            Back
          </button>
          <button
            className="tc-btn-next tc-btn-generate"
            type="button"
            onClick={handleNextFromStep2}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'GENERATE TEST'}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="tc-actions">
          <button className="tc-btn-back" type="button" onClick={handleBack}>
            Back
          </button>
          <button
            className="tc-btn-next tc-btn-generate"
            type="button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'GENERATE TEST'}
          </button>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="tc-loading">
          <div className="tc-loading__spinner" />
          <span className="tc-loading__text">
            {testType === 'cat' ? 'Starting CAT...' : testType === 'assessment' ? 'Initializing proctoring...' : 'Loading question pool...'}
          </span>
        </div>
      )}

    </div>
  );
};

export default TestCustomization;
