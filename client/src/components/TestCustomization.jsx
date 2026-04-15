import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../constants/Categories';
import { NCLEX_CLIENT_NEEDS_CATEGORIES } from '../constants/ClientNeeds';

// Use the imported constant
const CLIENT_NEEDS_CATEGORIES = NCLEX_CLIENT_NEEDS_CATEGORIES;

// Case Study subcategories extracted from NGN Case Studies category
const CASE_STUDY_SUBCATEGORIES = CATEGORIES['NGN Case Studies'] || [];

const TestCustomization = () => {
  const normalizeKey = (value) => {
    const base = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[’']/g, '')
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

  const [selectedSubcategoryPairs, setSelectedSubcategoryPairs] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [questionCount, setQuestionCount] = useState(85);
  const [questionCountInput, setQuestionCountInput] = useState('85'); // For allowing empty input display
  const [timed, setTimed] = useState(true);
  const [tutorMode, setTutorMode] = useState(false);
  const [testType, setTestType] = useState('practice'); // 'practice', 'cat', 'assessment', 'caseStudy'
  const [selectedCaseStudies, setSelectedCaseStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Counts from API — already canonical (backend remaps DB names)
  const [subcategoryCounts, setSubcategoryCounts] = useState({});
  const [usedSubcategoryCounts, setUsedSubcategoryCounts] = useState({});
  const [omittedSubcategoryCounts, setOmittedSubcategoryCounts] = useState({});
  // categoryMap: uses CATEGORIES constant + any extras from DB (via API categoriesWithExtras)
  const [categoryMap, setCategoryMap] = useState(CATEGORIES);
  const [countLoadError, setCountLoadError] = useState('');
  
  // Category tab: 'subjects' or 'clientNeeds' or 'caseStudies'
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
  const [clientNeedStatusCounts, setClientNeedStatusCounts] = useState(null);
  const [caseStudyStatusCounts, setCaseStudyStatusCounts] = useState(null);

  const navigate = useNavigate();

  // No auto-select needed for practice mode (user chooses manually)

  const handleTimedToggle = (checked) => {
    setTimed(checked);
    if (checked) {
      setTutorMode(false);
    }
  };

  const handleTutorToggle = (checked) => {
    setTutorMode(checked);
    if (checked) {
      setTimed(false);
    }
  };

  // Client Needs helper
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

  // Case Study helpers
  const handleCaseStudyToggle = (subcat) => {
    setSelectedCaseStudies(prev =>
      prev.includes(subcat)
        ? prev.filter(s => s !== subcat)
        : [...prev, subcat]
    );
  };

  const handleSelectAllCaseStudies = () => {
    if (selectedCaseStudies.length === CASE_STUDY_SUBCATEGORIES.length) {
      setSelectedCaseStudies([]);
    } else {
      setSelectedCaseStudies([...CASE_STUDY_SUBCATEGORIES]);
    }
  };

  const getCaseStudyCount = (subcat) => {
    // Case studies are stored under various subject categories, not just 'NGN Case Studies'
    // Use the total from the dedicated caseStudies response instead
    return 0;
  };

  const selectedCaseStudiesTotal = useMemo(() => {
    // Use the total from the server's caseStudies count (all type=case-study questions)
    return caseStudyStatusCounts?.total || 0;
  }, [caseStudyStatusCounts]);

  // Subject category helpers
  const getPairKey = (category, subcategory) => `${category}:::${subcategory}`;

  const isSubcategorySelected = (category, subcategory) =>
    selectedSubcategoryPairs.includes(getPairKey(category, subcategory));

  // Simple exact-match lookup — backend returns canonical category/subcategory names
  // that match our CATEGORIES constant, so no fuzzy matching needed
  const getSubcategoryCount = (category, subcategory) => {
    return subcategoryCounts?.[category]?.[subcategory] || 0;
  };

  const getUsedSubcategoryCount = (category, subcategory) => {
    return usedSubcategoryCounts?.[category]?.[subcategory] || 0;
  };

  const getOmittedSubcategoryCount = (category, subcategory) => {
    return omittedSubcategoryCounts?.[category]?.[subcategory] || 0;
  };

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

        // Backend already returns canonical category/subcategory names.
        // Use them directly — no normalization needed.
        setSubcategoryCounts(totalRawNestedCounts);
        setUsedSubcategoryCounts(usedRawNestedCounts);
        setOmittedSubcategoryCounts(omittedRawNestedCounts);

        // Backend now returns only canonical categories (no extras).
        // We keep using the hardcoded CATEGORIES constant from Categories.jsx
        // which is the single source of truth.

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
          // Store tab-specific status counts
          if (statusResponse.data?.subjects) {
            setSubjectStatusCounts({
              ...statusResponse.data.subjects,
              total: statusResponse.data.subjects.total || 0
            });
          }
          if (statusResponse.data?.clientNeeds) {
            setClientNeedStatusCounts({
              ...statusResponse.data.clientNeeds,
              total: statusResponse.data.clientNeeds.total || 0
            });
          }
          if (statusResponse.data?.caseStudies) {
            setCaseStudyStatusCounts({
              ...statusResponse.data.caseStudies,
              total: statusResponse.data.caseStudies.total || 0
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

  // Client needs columns (2 columns)
  const clientNeedsColumns = useMemo(() => {
    const cols = [[], []];
    CLIENT_NEEDS_CATEGORIES.forEach((clientNeed, index) => {
      cols[index % 2].push(clientNeed);
    });
    return cols;
  }, []);

  // Calculate totals for Client Needs
  const clientNeedsTotal = useMemo(() => {
    return CLIENT_NEEDS_CATEGORIES.reduce((sum, cn) => sum + getClientNeedCount(cn), 0);
  }, [clientNeedsCounts]);

  const selectedClientNeedsTotal = useMemo(() => {
    // When no client needs selected OR all are selected, use full total
    // to avoid fuzzy-match undercounting (same fix as subjects tab)
    const allSelected = selectedClientNeeds.length === 0 ||
      selectedClientNeeds.length === NCLEX_CLIENT_NEEDS_CATEGORIES.length;
    if (allSelected) {
      return clientNeedsTotal;
    }
    return selectedClientNeeds.reduce((sum, cn) => sum + getClientNeedCount(cn), 0);
  }, [selectedClientNeeds, clientNeedsCounts, clientNeedsTotal]);

  // Compute total number of selectable subcategory pairs (for "all selected" check)
  const allPossiblePairs = useMemo(() => {
    return Object.entries(categoryMap).flatMap(([category, subcategories]) =>
      subcategories.map(sub => getPairKey(category, sub))
    );
  }, [categoryMap]);

  const selectedStats = useMemo(() => {
    // When no subcategories are explicitly selected, OR when ALL are selected,
    // use the total Q-bank count from subjectStatusCounts (which counts only
    // questions in canonical subject categories). This fixes the bug where
    // undercounting happens when "Select All" is clicked.
    const allSelected = selectedSubcategoryPairs.length === 0 ||
      selectedSubcategoryPairs.length === allPossiblePairs.length;

    if (allSelected) {
      return {
        available: subjectStatusCounts?.total || statusCounts.total || 0,
        used: 0,
        omitted: 0,
      };
    }

    return selectedSubcategoryPairs.reduce((totals, pairKey) => {
      const [category, subcategory] = pairKey.split(':::');
      const available = getSubcategoryCount(category, subcategory);
      const used = getUsedSubcategoryCount(category, subcategory);
      const omitted = getOmittedSubcategoryCount(category, subcategory);

      return {
        available: totals.available + available,
        used: totals.used + used,
        omitted: totals.omitted + omitted,
      };
    }, { available: 0, used: 0, omitted: 0 });
  }, [selectedSubcategoryPairs, allPossiblePairs, subcategoryCounts, usedSubcategoryCounts, omittedSubcategoryCounts, categoryMap, statusCounts]);

  // Practice test and case study: min 5.
  const questionRangeMin = testType === 'caseStudy' ? 5 : 5;
  const questionRangeMax = 150;

  useEffect(() => {
    if (testType !== 'caseStudy') {
      if (questionCount > questionRangeMax || questionCount < questionRangeMin) {
        setQuestionCount(Math.min(questionRangeMax, Math.max(questionRangeMin, questionCount)));
      }
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

  // Get current stats based on selected tab
  // Total questions in the question bank — switch based on active tab
  const activeStatusCounts = categoryTab === 'subjects'
    ? (subjectStatusCounts || statusCounts)
    : categoryTab === 'clientNeeds'
      ? (clientNeedStatusCounts || statusCounts)
      : categoryTab === 'caseStudies'
        ? (caseStudyStatusCounts || statusCounts)
        : statusCounts;
  const totalQuestionBank = activeStatusCounts.total || 0;
  const currentAvailable = categoryTab === 'clientNeeds' 
    ? selectedClientNeedsTotal 
    : categoryTab === 'caseStudies'
      ? selectedCaseStudiesTotal
      : selectedStats.available;
  const maxAllowed = Math.min(questionRangeMax, currentAvailable);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Handle Assessment mode - same as CAT (real NCLEX adaptive testing)
    if (testType === 'assessment' || testType === 'cat') {
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
        setError(err.response?.data?.message || 'Failed to start CAT session. Make sure there are enough calibrated questions.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Assessment always uses CAT (handled above). For practice, let user choose timed/tutor.
    const isAssessment = testType === 'assessment';
    const isCaseStudy = testType === 'caseStudy';
    const isPractice = testType === 'practice';
    const effectiveTutorMode = isAssessment ? true : tutorMode;
    const effectiveTimed = isAssessment ? true : timed;

    if (categoryTab === 'clientNeeds') {
      if (currentAvailable === 0) {
        setError('No questions are available in the selected client needs.');
        return;
      }
      if (questionCount > currentAvailable) {
        setError(`Only ${currentAvailable} questions match your current selection.`);
        return;
      }
    } else if (categoryTab === 'caseStudies') {
      if (selectedCaseStudiesTotal === 0) {
        setError('No case study questions are available.');
        return;
      }
      if (questionCount > selectedCaseStudiesTotal) {
        setError(`Only ${selectedCaseStudiesTotal} case study questions match your selection.`);
        return;
      }
    } else {
      // Assessment auto-selects all subcategories, so skip the empty check
      if (!isAssessment && selectedSubcategoryPairs.length === 0) {
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
        // Submit with client needs
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
          ...(isAssessment ? { difficulty: 'hard' } : {})
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const navData = { ...response.data, testType };
        if (isAssessment) {
          navData.settings = { ...navData.settings, testName: 'Assessment' };
        }
        navigate('/test-session', { state: navData });
      } else if (categoryTab === 'caseStudies') {
        // Case study mode: server fetches ALL case-study type questions regardless of category
        // (admin creates case studies under various subject categories)
        const response = await axios.post('/api/student/generate-test', {
          questionCount,
          timed: effectiveTimed,
          tutorMode: effectiveTutorMode,
          statusFilters,
          testType: 'caseStudy',
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const navData = { ...response.data, testType: 'caseStudy' };
        navData.settings = { ...navData.settings, testName: 'Case Study' };
        navigate('/test-session', { state: navData });
      } else {
        // Standard mode - submit with categories
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
          ...(isAssessment ? { difficulty: 'hard' } : {})
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const navData = { ...response.data, testType };
        if (isAssessment) {
          navData.settings = { ...navData.settings, testName: 'Assessment' };
        }
        navigate('/test-session', { state: navData });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="test-customization" style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <h3 style={{
        color: '#059669',
        fontWeight: 700,
        marginBottom: '20px',
        fontSize: '1.5rem'
      }}>
        Create Test
      </h3>
      
      {/* Test Type Selection */}
      <div className="test-type-section" style={{
        marginBottom: '20px',
        padding: '16px',
        background: '#f0fdf4',
        borderRadius: '8px',
        border: '1px solid #a7f3d0'
      }}>
        <label style={{ fontWeight: 600, color: '#374151', marginBottom: '12px', display: 'block' }}>
          Test Type
        </label>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => { setTestType('practice'); }}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '12px 16px',
              border: testType === 'practice' ? '2px solid #0ea5e9' : '1px solid #d1d5db',
              borderRadius: '8px',
              background: testType === 'practice' ? '#f0f9ff' : '#fff',
              color: testType === 'practice' ? '#0ea5e9' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <i className="fas fa-graduation-cap me-2"></i>
            Practice Test
          </button>
          <button
            type="button"
            onClick={() => setTestType('cat')}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '12px 16px',
              border: testType === 'cat' ? '2px solid #7c3aed' : '1px solid #d1d5db',
              borderRadius: '8px',
              background: testType === 'cat' ? '#f5f3ff' : '#fff',
              color: testType === 'cat' ? '#7c3aed' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <i className="fas fa-brain me-2"></i>
            CAT Mode
          </button>
          <button
            type="button"
            onClick={() => { setTestType('assessment'); }}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '12px 16px',
              border: testType === 'assessment' ? '2px solid #059669' : '1px solid #d1d5db',
              borderRadius: '8px',
              background: testType === 'assessment' ? '#ecfdf5' : '#fff',
              color: testType === 'assessment' ? '#059669' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <i className="fas fa-clipboard-check me-2"></i>
            Assessment
          </button>
          <button
            type="button"
            onClick={() => { setTestType('caseStudy'); setCategoryTab('caseStudies'); }}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '12px 16px',
              border: testType === 'caseStudy' ? '2px solid #f59e0b' : '1px solid #d1d5db',
              borderRadius: '8px',
              background: testType === 'caseStudy' ? '#fffbeb' : '#fff',
              color: testType === 'caseStudy' ? '#d97706' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <i className="fas fa-book-open me-2"></i>
            Case Study
          </button>
        </div>
        {testType === 'assessment' && (
          <div style={{ marginTop: '12px', padding: '10px', background: '#ecfdf5', borderRadius: '6px', fontSize: '0.85rem', color: '#6b7280' }}>
            <i className="fas fa-info-circle me-2" style={{ color: '#059669' }}></i>
            Assessment uses real NCLEX Computerized Adaptive Testing (CAT) — questions adapt to your ability level in real time, just like the actual exam.
          </div>
        )}
        {testType === 'cat' && (
          <div style={{ marginTop: '12px', padding: '10px', background: '#f5f3ff', borderRadius: '6px', fontSize: '0.85rem', color: '#6b7280' }}>
            <i className="fas fa-info-circle me-2" style={{ color: '#7c3aed' }}></i>
            CAT (Computerized Adaptive Testing) adapts question difficulty based on your performance, similar to the real NCLEX.
          </div>
        )}
        {testType === 'practice' && (
          <div style={{ marginTop: '12px', padding: '10px', background: '#f0f9ff', borderRadius: '6px', fontSize: '0.85rem', color: '#6b7280' }}>
            <i className="fas fa-info-circle me-2" style={{ color: '#0ea5e9' }}></i>
            Practice Test mode provides a relaxed learning environment with immediate feedback after each question.
          </div>
        )}
        {testType === 'caseStudy' && (
          <div style={{ marginTop: '12px', padding: '10px', background: '#fffbeb', borderRadius: '6px', fontSize: '0.85rem', color: '#6b7280' }}>
            <i className="fas fa-info-circle me-2" style={{ color: '#d97706' }}></i>
            Case Study mode tests your clinical reasoning with NGN-style scenario-based questions. Select specific case study categories from the Case Studies tab below.
          </div>
        )}
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {countLoadError && <div className="alert alert-warning">{countLoadError}</div>}
      
      <form onSubmit={handleSubmit}>
        {/* Assessment Settings - Same as CAT */}
        {testType === 'assessment' && (
          <div className="test-mode-section" style={{
            marginBottom: '20px',
            padding: '16px',
            background: '#ecfdf5',
            borderRadius: '8px',
            border: '1px solid #059669'
          }}>
            <label style={{ fontWeight: 600, color: '#059669', marginBottom: '8px', display: 'block' }}>
              <i className="fas fa-brain me-2"></i>
              Assessment (NCLEX CAT)
            </label>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
              Assessment mode uses real NCLEX Computerized Adaptive Testing. The algorithm selects questions based on your ability, adjusting difficulty as you answer. The test ends when the system determines your result with 95% confidence — just like the actual NCLEX.
            </p>
          </div>
        )}

        {/* Practice Test Settings */}
        {testType === 'practice' && (
          <div className="test-mode-section" style={{
            marginBottom: '20px',
            padding: '16px',
            background: '#f0f9ff',
            borderRadius: '8px',
            border: '1px solid #0ea5e9'
          }}>
            <label style={{ fontWeight: 600, color: '#0369a1', marginBottom: '8px', display: 'block' }}>
              <i className="fas fa-graduation-cap me-2"></i>
              Practice Test Settings
            </label>
            <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: '0.9rem' }}>
              Choose how you want to practice — with or without a timer, and with or without immediate feedback.
            </p>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div className="form-check" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                onClick={() => handleTimedToggle(!timed)}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="practiceTimed"
                  checked={timed}
                  onChange={() => handleTimedToggle(!timed)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0ea5e9' }}
                />
                <label className="form-check-label" htmlFor="practiceTimed"
                  style={{ fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                  <i className="fas fa-clock me-1"></i> Timed
                </label>
              </div>
              <div className="form-check" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                onClick={() => handleTutorToggle(!tutorMode)}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="practiceTutor"
                  checked={tutorMode}
                  onChange={() => handleTutorToggle(!tutorMode)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0ea5e9' }}
                />
                <label className="form-check-label" htmlFor="practiceTutor"
                  style={{ fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                  <i className="fas fa-eye me-1"></i> Tutor Mode (immediate feedback)
                </label>
              </div>
            </div>
          </div>
        )}

        {/* CAT Info */}
        {testType === 'cat' && (
          <div className="test-mode-section" style={{
            marginBottom: '20px',
            padding: '16px',
            background: '#f5f3ff',
            borderRadius: '8px',
            border: '1px solid #7c3aed'
          }}>
            <label style={{ fontWeight: 600, color: '#6d28d9', marginBottom: '8px', display: 'block' }}>
              <i className="fas fa-brain me-2"></i>
              CAT Mode Settings
            </label>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
              CAT (Computerized Adaptive Testing) automatically selects questions based on your ability level. The test ends when the algorithm determines a pass/fail result with 95% confidence. No need to select categories or question count.
            </p>
          </div>
        )}

        {/* Case Study Settings */}
        {testType === 'caseStudy' && (
          <div className="test-mode-section" style={{
            marginBottom: '20px',
            padding: '16px',
            background: '#fffbeb',
            borderRadius: '8px',
            border: '1px solid #f59e0b'
          }}>
            <label style={{ fontWeight: 600, color: '#b45309', marginBottom: '8px', display: 'block' }}>
              <i className="fas fa-book-open me-2"></i>
              Case Study Settings
            </label>
            <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: '0.9rem' }}>
              Choose how you want to practice case studies — with or without a timer, and with or without immediate feedback.
            </p>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div className="form-check" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                onClick={() => handleTimedToggle(!timed)}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="caseStudyTimed"
                  checked={timed}
                  onChange={() => handleTimedToggle(!timed)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#f59e0b' }}
                />
                <label className="form-check-label" htmlFor="caseStudyTimed"
                  style={{ fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                  <i className="fas fa-clock me-1"></i> Timed
                </label>
              </div>
              <div className="form-check" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                onClick={() => handleTutorToggle(!tutorMode)}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="caseStudyTutor"
                  checked={tutorMode}
                  onChange={() => handleTutorToggle(!tutorMode)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#f59e0b' }}
                />
                <label className="form-check-label" htmlFor="caseStudyTutor"
                  style={{ fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                  <i className="fas fa-eye me-1"></i> Tutor Mode (immediate feedback)
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Question Bank Status Bar - UWorld style - Hide for CAT and Assessment mode */}
        {testType !== 'cat' && testType !== 'assessment' && (
          <div style={{
            marginBottom: '20px',
            background: '#fff',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}>
            {/* Progress bar at the very top */}
            <div style={{ height: '4px', background: '#f1f5f9' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, totalQuestionBank > 0 ? ((activeStatusCounts.correct + activeStatusCounts.incorrect + activeStatusCounts.omitted) / totalQuestionBank) * 100 : 0)}%`,
                background: 'linear-gradient(90deg, #22c55e 0%, #3b82f6 100%)',
                borderRadius: '0 2px 2px 0',
                transition: 'width 0.4s ease'
              }} />
            </div>

            {/* Header row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px 10px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-database" style={{ color: '#6366f1', fontSize: '0.9rem' }}></i>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>Question Bank</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                onClick={handleSelectAllSubjects}>
                <input
                  type="checkbox"
                  checked={categoryTab === 'clientNeeds'
                    ? selectedClientNeeds.length === CLIENT_NEEDS_CATEGORIES.length
                    : selectedSubcategoryPairs.length === Object.values(categoryMap).flat().length}
                  onChange={() => {}}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#6366f1' }}
                />
                <label style={{
                  fontWeight: 600,
                  color: '#6366f1',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}>
                  Select All
                </label>
              </div>
            </div>

            {/* Status pills row - clickable toggles */}
            <div style={{
              display: 'flex',
              gap: '8px',
              padding: '12px 18px 16px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              {/* Total (always visible, not toggleable) */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', background: '#f1f5f9', borderRadius: '20px', border: '1px solid #e2e8f0'
              }}>
                <i className="fas fa-layer-group" style={{ fontSize: '0.7rem', color: '#64748b' }}></i>
                <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.85rem' }}>{totalQuestionBank}</span>
                <span style={{ fontWeight: 500, color: '#94a3b8', fontSize: '0.75rem' }}>Total</span>
              </div>

              {/* Unused */}
              <button
                type="button"
                onClick={() => setStatusFilters(prev => ({ ...prev, unused: !prev.unused }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px',
                  background: statusFilters.unused ? '#dbeafe' : '#f8fafc',
                  borderRadius: '20px',
                  border: statusFilters.unused ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: statusFilters.unused ? '0 1px 4px rgba(59,130,246,0.25)' : 'none'
                }}
              >
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: statusFilters.unused ? '#3b82f6' : '#cbd5e1',
                  transition: 'all 0.2s'
                }}></div>
                <span style={{ fontWeight: 700, color: statusFilters.unused ? '#1e40af' : '#94a3b8', fontSize: '0.85rem' }}>{activeStatusCounts.unused}</span>
                <span style={{ fontWeight: 500, color: statusFilters.unused ? '#3b82f6' : '#cbd5e1', fontSize: '0.75rem' }}>Unused</span>
                {statusFilters.unused && <i className="fas fa-check" style={{ fontSize: '0.6rem', color: '#3b82f6' }}></i>}
              </button>

              {/* Correct */}
              <button
                type="button"
                onClick={() => setStatusFilters(prev => ({ ...prev, correct: !prev.correct }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px',
                  background: statusFilters.correct ? '#dcfce7' : '#f8fafc',
                  borderRadius: '20px',
                  border: statusFilters.correct ? '2px solid #22c55e' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: statusFilters.correct ? '0 1px 4px rgba(34,197,94,0.25)' : 'none'
                }}
              >
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: statusFilters.correct ? '#22c55e' : '#cbd5e1',
                  transition: 'all 0.2s'
                }}></div>
                <span style={{ fontWeight: 700, color: statusFilters.correct ? '#166534' : '#94a3b8', fontSize: '0.85rem' }}>{activeStatusCounts.correct}</span>
                <span style={{ fontWeight: 500, color: statusFilters.correct ? '#22c55e' : '#cbd5e1', fontSize: '0.75rem' }}>Correct</span>
                {statusFilters.correct && <i className="fas fa-check" style={{ fontSize: '0.6rem', color: '#22c55e' }}></i>}
              </button>

              {/* Incorrect */}
              <button
                type="button"
                onClick={() => setStatusFilters(prev => ({ ...prev, incorrect: !prev.incorrect }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px',
                  background: statusFilters.incorrect ? '#fee2e2' : '#f8fafc',
                  borderRadius: '20px',
                  border: statusFilters.incorrect ? '2px solid #ef4444' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: statusFilters.incorrect ? '0 1px 4px rgba(239,68,68,0.25)' : 'none'
                }}
              >
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: statusFilters.incorrect ? '#ef4444' : '#cbd5e1',
                  transition: 'all 0.2s'
                }}></div>
                <span style={{ fontWeight: 700, color: statusFilters.incorrect ? '#991b1b' : '#94a3b8', fontSize: '0.85rem' }}>{activeStatusCounts.incorrect}</span>
                <span style={{ fontWeight: 500, color: statusFilters.incorrect ? '#ef4444' : '#cbd5e1', fontSize: '0.75rem' }}>Incorrect</span>
                {statusFilters.incorrect && <i className="fas fa-check" style={{ fontSize: '0.6rem', color: '#ef4444' }}></i>}
              </button>

              {/* Marked */}
              <button
                type="button"
                onClick={() => setStatusFilters(prev => ({ ...prev, marked: !prev.marked }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px',
                  background: statusFilters.marked ? '#fef3c7' : '#f8fafc',
                  borderRadius: '20px',
                  border: statusFilters.marked ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: statusFilters.marked ? '0 1px 4px rgba(245,158,11,0.25)' : 'none'
                }}
              >
                <i className="fas fa-bookmark" style={{ fontSize: '0.65rem', color: statusFilters.marked ? '#f59e0b' : '#cbd5e1' }}></i>
                <span style={{ fontWeight: 700, color: statusFilters.marked ? '#92400e' : '#94a3b8', fontSize: '0.85rem' }}>{activeStatusCounts.marked}</span>
                <span style={{ fontWeight: 500, color: statusFilters.marked ? '#f59e0b' : '#cbd5e1', fontSize: '0.75rem' }}>Marked</span>
                {statusFilters.marked && <i className="fas fa-check" style={{ fontSize: '0.6rem', color: '#f59e0b' }}></i>}
              </button>

              {/* Omitted */}
              <button
                type="button"
                onClick={() => setStatusFilters(prev => ({ ...prev, omitted: !prev.omitted }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px',
                  background: statusFilters.omitted ? '#f1f5f9' : '#f8fafc',
                  borderRadius: '20px',
                  border: statusFilters.omitted ? '2px solid #64748b' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: statusFilters.omitted ? '0 1px 4px rgba(100,116,139,0.25)' : 'none'
                }}
              >
                <i className="fas fa-minus-circle" style={{ fontSize: '0.65rem', color: statusFilters.omitted ? '#64748b' : '#cbd5e1' }}></i>
                <span style={{ fontWeight: 700, color: statusFilters.omitted ? '#475569' : '#94a3b8', fontSize: '0.85rem' }}>{activeStatusCounts.omitted}</span>
                <span style={{ fontWeight: 500, color: statusFilters.omitted ? '#64748b' : '#cbd5e1', fontSize: '0.75rem' }}>Omitted</span>
                {statusFilters.omitted && <i className="fas fa-check" style={{ fontSize: '0.6rem', color: '#64748b' }}></i>}
              </button>
            </div>
          </div>
        )}

        {/* Question Category Section - Hide for CAT and Assessment mode */}
        {testType !== 'cat' && testType !== 'assessment' && (
          <div className="question-category-section" style={{
            marginBottom: '20px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #a7f3d0',
            background: '#f0fdf4'
          }}>
            <button
              type="button"
              onClick={() => setCategoryTab('subjects')}
              style={{
                flex: 1,
                padding: '12px 20px',
                border: 'none',
                background: categoryTab === 'subjects' ? '#fff' : 'transparent',
                borderBottom: categoryTab === 'subjects' ? '3px solid #059669' : '3px solid transparent',
                fontWeight: categoryTab === 'subjects' ? 600 : 500,
                color: categoryTab === 'subjects' ? '#059669' : '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Subjects
            </button>
            <button
              type="button"
              onClick={() => setCategoryTab('clientNeeds')}
              style={{
                flex: 1,
                padding: '12px 20px',
                border: 'none',
                background: categoryTab === 'clientNeeds' ? '#fff' : 'transparent',
                borderBottom: categoryTab === 'clientNeeds' ? '3px solid #059669' : '3px solid transparent',
                fontWeight: categoryTab === 'clientNeeds' ? 600 : 500,
                color: categoryTab === 'clientNeeds' ? '#059669' : '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Client Needs
            </button>
            <button
              type="button"
              onClick={() => { setCategoryTab('caseStudies'); setTestType('caseStudy'); }}
              style={{
                flex: 1,
                padding: '12px 20px',
                border: 'none',
                background: categoryTab === 'caseStudies' ? '#fff' : 'transparent',
                borderBottom: categoryTab === 'caseStudies' ? '3px solid #d97706' : '3px solid transparent',
                fontWeight: categoryTab === 'caseStudies' ? 600 : 500,
                color: categoryTab === 'caseStudies' ? '#d97706' : '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Case Studies
            </button>
          </div>

          {/* Select All */}
          {categoryTab !== 'caseStudies' && (
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            background: '#fff'
          }}>
            <div className="form-check" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                role="checkbox"
                aria-checked={categoryTab === 'clientNeeds' 
                  ? selectedClientNeeds.length === CLIENT_NEEDS_CATEGORIES.length
                  : selectedSubcategoryPairs.length === Object.values(categoryMap).flat().length}
                onClick={categoryTab === 'clientNeeds' ? handleSelectAllClientNeeds : handleSelectAllSubjects}
                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); (categoryTab === 'clientNeeds' ? handleSelectAllClientNeeds : handleSelectAllSubjects)(); } }}
                tabIndex={0}
                style={{
                  width: '22px', height: '22px', borderRadius: '6px',
                  border: '2px solid #a7f3d0',
                  background: (categoryTab === 'clientNeeds' 
                    ? selectedClientNeeds.length === CLIENT_NEEDS_CATEGORIES.length
                    : selectedSubcategoryPairs.length === Object.values(categoryMap).flat().length) ? '#059669' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0
                }}
              >
                {(categoryTab === 'clientNeeds' 
                  ? selectedClientNeeds.length === CLIENT_NEEDS_CATEGORIES.length
                  : selectedSubcategoryPairs.length === Object.values(categoryMap).flat().length) && (
                  <i className="fas fa-check" style={{ fontSize: '0.7rem', color: '#fff' }}></i>
                )}
              </div>
              <label
                onClick={categoryTab === 'clientNeeds' ? handleSelectAllClientNeeds : handleSelectAllSubjects}
                style={{ fontWeight: 600, cursor: 'pointer', color: '#374151', fontSize: '0.95rem' }}
              >
                Select All
              </label>
            </div>
          </div>
          )}
          {categoryTab === 'caseStudies' && (
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            background: '#fff'
          }}>
            <div className="form-check" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                role="checkbox"
                aria-checked={selectedCaseStudies.length === CASE_STUDY_SUBCATEGORIES.length}
                onClick={handleSelectAllCaseStudies}
                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleSelectAllCaseStudies(); } }}
                tabIndex={0}
                style={{
                  width: '22px', height: '22px', borderRadius: '6px',
                  border: '2px solid #fcd34d',
                  background: selectedCaseStudies.length === CASE_STUDY_SUBCATEGORIES.length ? '#d97706' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0
                }}
              >
                {selectedCaseStudies.length === CASE_STUDY_SUBCATEGORIES.length && (
                  <i className="fas fa-check" style={{ fontSize: '0.7rem', color: '#fff' }}></i>
                )}
              </div>
              <label
                onClick={handleSelectAllCaseStudies}
                style={{ fontWeight: 600, cursor: 'pointer', color: '#374151', fontSize: '0.95rem' }}
              >
                Select All Case Studies
              </label>
            </div>
          </div>
          )}

          {/* Categories Content */}
          <div style={{ padding: '16px', background: '#fff', maxHeight: '300px', overflowY: 'auto' }}>
            {/* Client Needs Tab */}
            {categoryTab === 'clientNeeds' && (
              <div className="client-needs-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {clientNeedsColumns.map((column, colIndex) => (
                  <div key={colIndex} className="client-needs-column">
                    {column.map((clientNeed) => {
                      const count = getClientNeedCount(clientNeed);
                      const ngnCount = getClientNeedNgnCount(clientNeed);
                      const isSelected = selectedClientNeeds.includes(clientNeed);
                      
                      return (
                        <div key={clientNeed} className="form-check" style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          background: isSelected ? '#f0fdf4' : '#f8fafc',
                          borderRadius: '6px',
                          marginBottom: '8px',
                          border: isSelected ? '1px solid #6ee7b7' : '1px solid #e2e8f0',
                          transition: 'all 0.2s'
                        }}>
                          <div
                            role="checkbox"
                            aria-checked={isSelected}
                            onClick={() => handleClientNeedToggle(clientNeed)}
                            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleClientNeedToggle(clientNeed); } }}
                            tabIndex={0}
                            style={{
                              width: '22px', height: '22px', borderRadius: '6px',
                              border: isSelected ? '2px solid #059669' : '2px solid #a7f3d0',
                              background: isSelected ? '#059669' : '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0
                            }}
                          >
                            {isSelected && <i className="fas fa-check" style={{ fontSize: '0.7rem', color: '#fff' }}></i>}
                          </div>
                          <label 
                            onClick={() => handleClientNeedToggle(clientNeed)}
                            style={{ 
                              flex: 1, 
                              cursor: 'pointer',
                              fontWeight: 500,
                              color: '#374151',
                              fontSize: '0.9rem'
                            }}
                          >
                            {clientNeed}
                          </label>
                          <span style={{
                            background: '#059669',
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            {count}
                            {ngnCount > 0 && <span style={{ opacity: 0.8 }}> | {ngnCount} NGN</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* Subjects Tab */}
            {categoryTab === 'subjects' && (
              <div className="subjects-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {categoryColumns.map((column, colIndex) => (
                  <div key={colIndex} className="subject-column">
                    {column.map(([category, subcats]) => (
                      <div key={category} style={{
                        marginBottom: '12px',
                        border: '1px solid #a7f3d0',
                        borderRadius: '8px',
                        overflow: 'hidden'
                      }}>
                        <div
                          onClick={() => toggleCategory(category)}
                          style={{
                            padding: '10px 12px',
                            background: expandedCategory === category ? '#f0fdf4' : '#f8fafc',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontWeight: 600,
                            color: '#059669'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className={`fas fa-chevron-${expandedCategory === category ? 'down' : 'right'}`} style={{ fontSize: '0.75rem' }}></i>
                            {category}
                          </span>
                          <span style={{
                            background: '#059669',
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem'
                          }}>
                            {categoryTotals[category] || 0}
                          </span>
                        </div>
                        {expandedCategory === category && (
                          <div style={{ padding: '8px 12px', background: '#fff' }}>
                            {subcats.map(sub => (
                              <div key={sub} className="form-check" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 0'
                              }}>
                                <div
                                  role="checkbox"
                                  aria-checked={isSubcategorySelected(category, sub)}
                                  onClick={() => handleSubcategoryToggle(category, sub)}
                                  onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleSubcategoryToggle(category, sub); } }}
                                  tabIndex={0}
                                  style={{
                                    width: '20px', height: '20px', borderRadius: '5px',
                                    border: isSubcategorySelected(category, sub) ? '2px solid #059669' : '2px solid #d1d5db',
                                    background: isSubcategorySelected(category, sub) ? '#059669' : '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0
                                  }}
                                >
                                  {isSubcategorySelected(category, sub) && <i className="fas fa-check" style={{ fontSize: '0.65rem', color: '#fff' }}></i>}
                                </div>
                                <label 
                                  onClick={() => handleSubcategoryToggle(category, sub)}
                                  style={{ flex: 1, fontSize: '0.9rem', color: '#475569', cursor: 'pointer' }}
                                >
                                  {sub}
                                </label>
                                <span style={{
                                  background: '#f1f5f9',
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                  fontSize: '0.7rem',
                                  color: '#64748b'
                                }}>
                                  {getSubcategoryCount(category, sub)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {/* Case Studies Tab */}
            {categoryTab === 'caseStudies' && (
              <div className="case-studies-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {(() => {
                  const cols = [[], []];
                  CASE_STUDY_SUBCATEGORIES.forEach((sub, idx) => cols[idx % 2].push(sub));
                  return cols.map((column, colIndex) => (
                    <div key={colIndex} className="case-study-column">
                      {column.map((subcat) => {
                        const count = getCaseStudyCount(subcat);
                        const isSelected = selectedCaseStudies.includes(subcat);
                        return (
                          <div key={subcat} className="form-check" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            background: isSelected ? '#fffbeb' : '#f8fafc',
                            borderRadius: '6px',
                            marginBottom: '8px',
                            border: isSelected ? '1px solid #fcd34d' : '1px solid #e2e8f0',
                            transition: 'all 0.2s'
                          }}>
                            <div
                              role="checkbox"
                              aria-checked={isSelected}
                              onClick={() => handleCaseStudyToggle(subcat)}
                              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleCaseStudyToggle(subcat); } }}
                              tabIndex={0}
                              style={{
                                width: '22px', height: '22px', borderRadius: '6px',
                                border: isSelected ? '2px solid #d97706' : '2px solid #fcd34d',
                                background: isSelected ? '#d97706' : '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0
                              }}
                            >
                              {isSelected && <i className="fas fa-check" style={{ fontSize: '0.7rem', color: '#fff' }}></i>}
                            </div>
                            <label
                              onClick={() => handleCaseStudyToggle(subcat)}
                              style={{
                                flex: 1,
                                cursor: 'pointer',
                                fontWeight: 500,
                                color: '#374151',
                                fontSize: '0.9rem'
                              }}
                            >
                              {subcat}
                            </label>
                            <span style={{
                              background: '#d97706',
                              color: '#fff',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}>
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Number of Questions - Hide for CAT and Assessment mode */}
        {testType !== 'cat' && testType !== 'assessment' && (
          <div className="question-count-section" style={{
            marginBottom: '20px',
            padding: '16px',
            background: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #a7f3d0'
          }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontWeight: 600, color: '#374151' }}>
              No. of Questions
            </label>
            <span style={{ color: '#059669', fontSize: '0.85rem', fontWeight: 500 }}>
              Max allowed: {maxAllowed}
            </span>
          </div>
          <input
            type="number"
            className="form-control"
            value={questionCountInput}
            onChange={(e) => {
              const inputValue = e.target.value;
              // Allow empty input for clearing
              setQuestionCountInput(inputValue);
              if (inputValue === '') {
                // Don't update questionCount while typing, just keep input empty
                return;
              }
              const value = parseInt(inputValue, 10);
              if (!isNaN(value)) {
                // Only clamp on blur, not during typing
                setQuestionCount(value);
              }
            }}
            onBlur={(e) => {
              // Clamp value when user leaves the field
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
            style={{
              width: '100%',
              marginTop: '8px',
              padding: '10px 12px',
              fontSize: '1rem',
              border: '2px solid #6ee7b7',
              borderRadius: '6px'
            }}
          />
        </div>
        )}

        {/* Generate Test Button */}
        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={loading}
          style={{
            background: testType === 'cat' ? '#7c3aed' : testType === 'practice' ? '#0ea5e9' : '#059669',
            border: 'none',
            padding: '14px 24px',
            fontSize: '1.1rem',
            fontWeight: 600,
            borderRadius: '8px',
            transition: 'all 0.2s'
          }}
        >
          {loading 
            ? (testType === 'cat' ? 'Starting CAT...' : 'Generating...') 
            : (testType === 'cat' ? 'START CAT EXAM' : testType === 'practice' ? 'START PRACTICE TEST' : testType === 'caseStudy' ? 'START CASE STUDY' : 'START ASSESSMENT')}
        </button>
      </form>
    </div>
  );
};

export default TestCustomization;
