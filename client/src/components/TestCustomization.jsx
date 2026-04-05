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

  // Fuzzy key matcher — handles old DB names matching new CATEGORIES.jsx names
  // e.g., "cardiovascular" matches "cardiovascular system", "gastrointestinal nutrition" matches "gastrointestinal"
  const fuzzyMatchKey = (haystackKeys, needle) => {
    if (!needle || haystackKeys.includes(needle)) return needle;
    for (const key of haystackKeys) {
      if (key.startsWith(needle) || needle.startsWith(key)) return key;
    }
    return null;
  };

  const [selectedSubcategoryPairs, setSelectedSubcategoryPairs] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [questionCount, setQuestionCount] = useState(75);
  const [questionCountInput, setQuestionCountInput] = useState('75'); // For allowing empty input display
  const [timed, setTimed] = useState(true);
  const [tutorMode, setTutorMode] = useState(false);
  const [testType, setTestType] = useState('practice'); // 'practice', 'cat', 'assessment'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subcategoryCounts, setSubcategoryCounts] = useState({});
  // Raw (non-normalized) subcategory counts — used for Subjects tab direct lookup
  const [rawSubcategoryCounts, setRawSubcategoryCounts] = useState({});
  const [rawUsedSubcategoryCounts, setRawUsedSubcategoryCounts] = useState({});
  const [rawOmittedSubcategoryCounts, setRawOmittedSubcategoryCounts] = useState({});
  // categoryMap is populated dynamically from DB data in fetchCounts()
  // CATEGORIES is only used as initial placeholder before data loads
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

  // Subject category helpers
  const getPairKey = (category, subcategory) => `${category}:::${subcategory}`;

  const isSubcategorySelected = (category, subcategory) =>
    selectedSubcategoryPairs.includes(getPairKey(category, subcategory));

  const getSubcategoryCount = (category, subcategory) => {
    // Primary: use raw counts (exact match since categoryMap and rawCounts share same DB keys)
    const rawCounts = rawSubcategoryCounts || {};
    if (rawCounts[category]?.[subcategory] !== undefined) return rawCounts[category][subcategory];
    // Fallback: try normalized/fuzzy match for legacy compatibility
    const counts = subcategoryCounts || {};
    if (counts[category]?.[subcategory] !== undefined) return counts[category][subcategory];
    const catKeys = Object.keys(counts);
    const matchedCat = fuzzyMatchKey(catKeys, normalizeKey(category));
    if (!matchedCat) return 0;
    const subKeys = Object.keys(counts[matchedCat] || {});
    const matchedSub = fuzzyMatchKey(subKeys, normalizeKey(subcategory));
    return counts?.[matchedCat]?.[matchedSub] || 0;
  };

  const getUsedSubcategoryCount = (category, subcategory) => {
    // Primary: raw exact match
    const rawCounts = rawUsedSubcategoryCounts || {};
    if (rawCounts[category]?.[subcategory] !== undefined) return rawCounts[category][subcategory];
    // Fallback: normalized/fuzzy
    const counts = usedSubcategoryCounts || {};
    if (counts[category]?.[subcategory] !== undefined) return counts[category][subcategory];
    const catKeys = Object.keys(counts);
    const matchedCat = fuzzyMatchKey(catKeys, normalizeKey(category));
    if (!matchedCat) return 0;
    const subKeys = Object.keys(counts[matchedCat] || {});
    const matchedSub = fuzzyMatchKey(subKeys, normalizeKey(subcategory));
    return counts?.[matchedCat]?.[matchedSub] || 0;
  };

  const getOmittedSubcategoryCount = (category, subcategory) => {
    // Primary: raw exact match
    const rawCounts = rawOmittedSubcategoryCounts || {};
    if (rawCounts[category]?.[subcategory] !== undefined) return rawCounts[category][subcategory];
    // Fallback: normalized/fuzzy
    const counts = omittedSubcategoryCounts || {};
    if (counts[category]?.[subcategory] !== undefined) return counts[category][subcategory];
    const catKeys = Object.keys(counts);
    const matchedCat = fuzzyMatchKey(catKeys, normalizeKey(category));
    if (!matchedCat) return 0;
    const subKeys = Object.keys(counts[matchedCat] || {});
    const matchedSub = fuzzyMatchKey(subKeys, normalizeKey(subcategory));
    return counts?.[matchedCat]?.[matchedSub] || 0;
  };

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

        // Store RAW counts for exact-match lookup (Subjects tab)
        setRawSubcategoryCounts(totalRawNestedCounts);
        setRawUsedSubcategoryCounts(usedRawNestedCounts);
        setRawOmittedSubcategoryCounts(omittedRawNestedCounts);
        // Also store normalized counts for fuzzy-match fallback / Client Needs
        setSubcategoryCounts(normalizeNestedCounts(totalRawNestedCounts));
        setUsedSubcategoryCounts(normalizeNestedCounts(usedRawNestedCounts));
        setOmittedSubcategoryCounts(normalizeNestedCounts(omittedRawNestedCounts));

        // Build dynamic categoryMap from actual database data
        // This ensures the student side shows the same categories as the admin side
        const rawCategoryMap = {};
        Object.entries(totalRawNestedCounts).forEach(([category, subcats]) => {
          if (!rawCategoryMap[category]) rawCategoryMap[category] = [];
          Object.keys(subcats).forEach(sub => {
            if (!rawCategoryMap[category].includes(sub)) {
              rawCategoryMap[category].push(sub);
            }
          });
        });
        // Sort categories and subcategories alphabetically
        const sortedMap = {};
        Object.keys(rawCategoryMap).sort().forEach(cat => {
          sortedMap[cat] = rawCategoryMap[cat].sort();
        });
        setCategoryMap(sortedMap);

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
  }, [subcategoryCounts, rawSubcategoryCounts, categoryMap]);

  const usedCategoryTotals = useMemo(() => {
    return Object.fromEntries(
      Object.entries(categoryMap).map(([category, subcats]) => [
        category,
        subcats.reduce((sum, sub) => sum + getUsedSubcategoryCount(category, sub), 0)
      ])
    );
  }, [usedSubcategoryCounts, rawUsedSubcategoryCounts, categoryMap]);

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
    // use the total Q-bank count from statusCounts (which counts ALL questions
    // regardless of category matching). This fixes the bug where some DB questions
    // have different category/subcategory values than the CATEGORIES constant,
    // causing undercounting when "Select All" is clicked.
    const allSelected = selectedSubcategoryPairs.length === 0 ||
      selectedSubcategoryPairs.length === allPossiblePairs.length;

    if (allSelected) {
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
  }, [selectedSubcategoryPairs, allPossiblePairs, subcategoryCounts, usedSubcategoryCounts, omittedSubcategoryCounts, rawSubcategoryCounts, rawUsedSubcategoryCounts, rawOmittedSubcategoryCounts, categoryMap, statusCounts]);

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
                width: `${Math.min(100, totalQuestionBank > 0 ? ((statusCounts.correct + statusCounts.incorrect + statusCounts.omitted) / totalQuestionBank) * 100 : 0)}%`,
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
                <span style={{ fontWeight: 700, color: statusFilters.unused ? '#1e40af' : '#94a3b8', fontSize: '0.85rem' }}>{statusCounts.unused}</span>
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
                <span style={{ fontWeight: 700, color: statusFilters.correct ? '#166534' : '#94a3b8', fontSize: '0.85rem' }}>{statusCounts.correct}</span>
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
                <span style={{ fontWeight: 700, color: statusFilters.incorrect ? '#991b1b' : '#94a3b8', fontSize: '0.85rem' }}>{statusCounts.incorrect}</span>
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
                <span style={{ fontWeight: 700, color: statusFilters.marked ? '#92400e' : '#94a3b8', fontSize: '0.85rem' }}>{statusCounts.marked}</span>
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
                <span style={{ fontWeight: 700, color: statusFilters.omitted ? '#475569' : '#94a3b8', fontSize: '0.85rem' }}>{statusCounts.omitted}</span>
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
          </div>

          {/* Select All */}
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
            : (testType === 'cat' ? 'START CAT EXAM' : testType === 'practice' ? 'START PRACTICE TEST' : 'START ASSESSMENT')}
        </button>
      </form>
    </div>
  );
};

export default TestCustomization;
