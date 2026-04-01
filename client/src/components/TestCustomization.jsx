import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../constants/Categories';
import { NCLEX_CLIENT_NEEDS_CATEGORIES } from '../constants/ClientNeeds';

// Use the imported constant
const CLIENT_NEEDS_CATEGORIES = NCLEX_CLIENT_NEEDS_CATEGORIES;

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
  const [questionCount, setQuestionCount] = useState(75);
  const [questionCountInput, setQuestionCountInput] = useState('75'); // For allowing empty input display
  const [timed, setTimed] = useState(true);
  const [tutorMode, setTutorMode] = useState(false);
  const [testType, setTestType] = useState('assessment'); // 'assessment', 'cat', 'practice'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subcategoryCounts, setSubcategoryCounts] = useState({});
  const [categoryMap, setCategoryMap] = useState(CATEGORIES);
  const [usedSubcategoryCounts, setUsedSubcategoryCounts] = useState({});
  const [omittedSubcategoryCounts, setOmittedSubcategoryCounts] = useState({});
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

  // Question status counts
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

  const navigate = useNavigate();

  // Auto-select all subcategories when switching to Assessment mode
  useEffect(() => {
    if (testType === 'assessment') {
      const allPairs = Object.entries(categoryMap).flatMap(([category, subcategories]) =>
        subcategories.map(sub => getPairKey(category, sub))
      );
      setSelectedSubcategoryPairs(allPairs);
      // Expand all categories so user can see all are selected
      const allCategories = Object.keys(categoryMap);
      setExpandedCategory(allCategories[0] || null);
    }
  }, [testType]);

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

  // Subject category helpers
  const getPairKey = (category, subcategory) => `${category}:::${subcategory}`;

  const isSubcategorySelected = (category, subcategory) =>
    selectedSubcategoryPairs.includes(getPairKey(category, subcategory));

  const getSubcategoryCount = (category, subcategory) =>
    subcategoryCounts?.[normalizeKey(category)]?.[normalizeKey(subcategory)] || 0;

  const getUsedSubcategoryCount = (category, subcategory) =>
    usedSubcategoryCounts?.[normalizeKey(category)]?.[normalizeKey(subcategory)] || 0;

  const getOmittedSubcategoryCount = (category, subcategory) =>
    omittedSubcategoryCounts?.[normalizeKey(category)]?.[normalizeKey(subcategory)] || 0;

  const normalizeNestedCounts = (rawNestedCounts = {}) =>
    Object.entries(rawNestedCounts).reduce((acc, [category, subMap]) => {
      const normalizedCategory = normalizeKey(category);
      if (!acc[normalizedCategory]) {
        acc[normalizedCategory] = {};
      }
      Object.entries(subMap || {}).forEach(([subcategory, count]) => {
        const normalizedSubcategory = normalizeKey(subcategory);
        acc[normalizedCategory][normalizedSubcategory] =
          (acc[normalizedCategory][normalizedSubcategory] || 0) + (Number(count) || 0);
      });
      return acc;
    }, {});

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

        setSubcategoryCounts(normalizeNestedCounts(totalRawNestedCounts));
        setCategoryMap(CATEGORIES);
        setUsedSubcategoryCounts(normalizeNestedCounts(usedRawNestedCounts));
        setOmittedSubcategoryCounts(normalizeNestedCounts(omittedRawNestedCounts));

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
    if (selectedClientNeeds.length === 0) {
      return clientNeedsTotal;
    }
    return selectedClientNeeds.reduce((sum, cn) => sum + getClientNeedCount(cn), 0);
  }, [selectedClientNeeds, clientNeedsCounts, clientNeedsTotal]);

  const selectedStats = useMemo(() => {
    // When no subcategories are explicitly selected, show the total Q-bank count
    // from statusCounts (which counts ALL questions regardless of category matching)
    // This fixes the bug where some DB questions have different category/subcategory
    // values than the CATEGORIES constant, causing undercounting.
    if (selectedSubcategoryPairs.length === 0) {
      return {
        available: statusCounts.total || 0,
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
  }, [selectedSubcategoryPairs, subcategoryCounts, usedSubcategoryCounts, omittedSubcategoryCounts, categoryMap, statusCounts]);

  const questionRangeMin = 5;
  const questionRangeMax = 150;

  useEffect(() => {
    if (questionCount > questionRangeMax || questionCount < questionRangeMin) {
      setQuestionCount(Math.min(questionRangeMax, Math.max(questionRangeMin, questionCount)));
    }
  }, [questionCount, questionRangeMax, questionRangeMin]);

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
  // Total questions in the question bank
  const totalQuestionBank = statusCounts.total || 0;
  const currentAvailable = categoryTab === 'clientNeeds' ? selectedClientNeedsTotal : selectedStats.available;
  const maxAllowed = Math.min(questionRangeMax, currentAvailable);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Handle CAT mode - redirect to CAT session
    if (testType === 'cat') {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post('/api/student/cat/start', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        navigate('/cat-session', { state: response.data });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to start CAT session. Make sure there are enough calibrated questions.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Handle Assessment mode - auto-enable tutor mode and timed, filter hard difficulty
    const isAssessment = testType === 'assessment';
    const effectiveTutorMode = isAssessment ? true : (testType === 'practice' ? true : tutorMode);
    const effectiveTimed = isAssessment ? true : (testType === 'practice' ? false : timed);

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
            onClick={() => setTestType('assessment')}
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
            onClick={() => setTestType('practice')}
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
        </div>
        {testType === 'assessment' && (
          <div style={{ marginTop: '12px', padding: '10px', background: '#ecfdf5', borderRadius: '6px', fontSize: '0.85rem', color: '#6b7280' }}>
            <i className="fas fa-info-circle me-2" style={{ color: '#059669' }}></i>
            Assessment mode tests your knowledge across all subjects with hard difficulty questions. All categories are automatically selected.
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
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {countLoadError && <div className="alert alert-warning">{countLoadError}</div>}
      
      <form onSubmit={handleSubmit}>
        {/* Assessment Settings */}
        {testType === 'assessment' && (
          <div className="test-mode-section" style={{
            marginBottom: '20px',
            padding: '16px',
            background: '#ecfdf5',
            borderRadius: '8px',
            border: '1px solid #059669'
          }}>
            <label style={{ fontWeight: 600, color: '#059669', marginBottom: '8px', display: 'block' }}>
              <i className="fas fa-clipboard-check me-2"></i>
              Assessment Settings
            </label>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
              Assessment mode automatically selects <strong>all subjects</strong> with <strong>hard difficulty</strong> questions. Tutor Mode and timer are both enabled for a realistic exam experience.
            </p>
          </div>
        )}

        {/* Practice Test Info */}
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
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
              Practice Test mode automatically enables <strong>Tutor Mode</strong> (immediate feedback) and disables the timer for a relaxed learning experience.
            </p>
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

        {/* Question Status Filter Section - Hide for CAT mode */}
        {testType !== 'cat' && (
          <div className="question-status-section" style={{
            marginBottom: '20px',
            padding: '16px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ fontWeight: 600, color: '#374151' }}>
                Question Status
              </label>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.9rem' }}>
                  {currentAvailable} questions available
                </span>
                <span style={{ display: 'block', color: '#6b7280', fontSize: '0.75rem', marginTop: '2px' }}>
                  {totalQuestionBank} total in Q-Bank
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { key: 'unused', label: 'Unused', count: statusCounts.unused, ngnCount: statusCounts.unusedNgn },
                { key: 'incorrect', label: 'Incorrect', count: statusCounts.incorrect, ngnCount: statusCounts.incorrectNgn },
                { key: 'marked', label: 'Marked', count: statusCounts.marked, ngnCount: statusCounts.markedNgn },
                { key: 'omitted', label: 'Omitted', count: statusCounts.omitted, ngnCount: statusCounts.omittedNgn },
                { key: 'correct', label: 'Correct', count: statusCounts.correct, ngnCount: statusCounts.correctNgn }
              ].map(({ key, label, count, ngnCount }) => (
                <div 
                  key={key}
                  className="form-check" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    padding: '8px 12px',
                    background: statusFilters[key] ? '#e0f2fe' : '#fff',
                    borderRadius: '6px',
                    border: statusFilters[key] ? '1px solid #0ea5e9' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setStatusFilters(prev => ({ ...prev, [key]: !prev[key] }))}
                >
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={`${key}Check`}
                    checked={statusFilters[key]}
                    onChange={(e) => {
                      e.stopPropagation();
                      setStatusFilters(prev => ({ ...prev, [key]: e.target.checked }));
                    }}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0ea5e9' }}
                  />
                  <label 
                    className="form-check-label" 
                    htmlFor={`${key}Check`} 
                    style={{ 
                      fontWeight: 500,
                      color: statusFilters[key] ? '#0369a1' : '#374151',
                      cursor: 'pointer',
                      marginRight: '4px'
                    }}
                  >
                    {label}
                  </label>
                  <span style={{
                    background: statusFilters[key] ? '#0ea5e9' : '#e2e8f0',
                    color: statusFilters[key] ? '#fff' : '#64748b',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}>
                    {count} ({ngnCount} NGN)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question Category Section - Hide for CAT mode */}
        {testType !== 'cat' && (
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
          </div>

          {/* Select All */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            background: '#fff'
          }}>
            <div className="form-check" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                className="form-check-input"
                id="selectAllCategories"
                checked={categoryTab === 'clientNeeds' 
                  ? selectedClientNeeds.length === CLIENT_NEEDS_CATEGORIES.length
                  : selectedSubcategoryPairs.length === Object.values(categoryMap).flat().length
                }
                onChange={categoryTab === 'clientNeeds' ? handleSelectAllClientNeeds : handleSelectAllSubjects}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label className="form-check-label" htmlFor="selectAllCategories" style={{ fontWeight: 500 }}>
                Select All
              </label>
            </div>
          </div>

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
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id={`cn-${clientNeed}`}
                            checked={isSelected}
                            onChange={() => handleClientNeedToggle(clientNeed)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <label 
                            className="form-check-label" 
                            htmlFor={`cn-${clientNeed}`}
                            style={{ 
                              flex: 1, 
                              cursor: 'pointer',
                              fontWeight: 500,
                              color: '#374151'
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
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  id={`${category}-${sub}`}
                                  checked={isSubcategorySelected(category, sub)}
                                  onChange={() => handleSubcategoryToggle(category, sub)}
                                  style={{ width: '16px', height: '16px' }}
                                />
                                <label 
                                  className="form-check-label" 
                                  htmlFor={`${category}-${sub}`}
                                  style={{ flex: 1, fontSize: '0.9rem', color: '#475569' }}
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
          </div>
        </div>
        )}

        {/* Number of Questions - Hide for CAT mode */}
        {testType !== 'cat' && (
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
            : (testType === 'cat' ? 'START CAT EXAM' : testType === 'practice' ? 'START PRACTICE TEST' : 'START ASSESSMENT')}
        </button>
      </form>
    </div>
  );
};

export default TestCustomization;
