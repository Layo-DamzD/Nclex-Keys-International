import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../constants/Categories';

// NCLEX Client Needs - 8 main subcategories shown in UWorld interface
const CLIENT_NEEDS_CATEGORIES = [
  'Management of Care',
  'Safety and Infection Control',
  'Health Promotion and Maintenance',
  'Psychosocial Integrity',
  'Basic Care and Comfort',
  'Pharmacological and Parenteral Therapies',
  'Reduction of Risk Potential',
  'Physiological Adaptation'
];

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
  const [timed, setTimed] = useState(true);
  const [tutorMode, setTutorMode] = useState(false);
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

  // Question type filters
  const [includeTraditional, setIncludeTraditional] = useState(true);
  const [includeNextGen, setIncludeNextGen] = useState(true);

  const navigate = useNavigate();

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
    if (selectedClientNeeds.length === CLIENT_NEEDS_CATEGORIES.length) {
      setSelectedClientNeeds([]);
    } else {
      setSelectedClientNeeds([...CLIENT_NEEDS_CATEGORIES]);
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
    const selectedPairs = selectedSubcategoryPairs.length > 0
      ? selectedSubcategoryPairs
      : Object.entries(categoryMap).flatMap(([category, subcategories]) => (
          subcategories.map((subcategory) => getPairKey(category, subcategory))
        ));

    return selectedPairs.reduce((totals, pairKey) => {
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
  }, [selectedSubcategoryPairs, subcategoryCounts, usedSubcategoryCounts, omittedSubcategoryCounts, categoryMap]);

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
  const currentAvailable = categoryTab === 'clientNeeds' ? selectedClientNeedsTotal : selectedStats.available;
  const maxAllowed = Math.min(questionRangeMax, currentAvailable);

  const handleSubmit = async (e) => {
    e.preventDefault();

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
        // Submit with client needs
        const clientNeedsSelections = selectedClientNeeds.length > 0
          ? selectedClientNeeds.map(cn => ({ clientNeed: cn, clientNeedSubcategory: cn }))
          : CLIENT_NEEDS_CATEGORIES.map(cn => ({ clientNeed: cn, clientNeedSubcategory: cn }));

        const response = await axios.post('/api/student/generate-test', {
          clientNeedsSelections: clientNeedsSelections,
          filterMode: 'clientNeeds',
          questionCount,
          timed,
          tutorMode,
          includeTraditional,
          includeNextGen
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        navigate('/test-session', { state: response.data });
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
          timed,
          tutorMode,
          includeTraditional,
          includeNextGen
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        navigate('/test-session', { state: response.data });
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
        color: '#1e40af',
        fontWeight: 700,
        marginBottom: '20px',
        fontSize: '1.5rem'
      }}>
        Create Test
      </h3>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {countLoadError && <div className="alert alert-warning">{countLoadError}</div>}
      
      <form onSubmit={handleSubmit}>
        {/* Test Mode Section */}
        <div className="test-mode-section" style={{
          marginBottom: '20px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <label style={{ fontWeight: 600, color: '#374151', marginBottom: '12px', display: 'block' }}>
            Test Mode
          </label>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                className="form-check-input"
                type="checkbox"
                id="tutorSwitch"
                checked={tutorMode}
                onChange={(e) => handleTutorToggle(e.target.checked)}
                style={{ width: '40px', height: '20px', cursor: 'pointer' }}
              />
              <label className="form-check-label" htmlFor="tutorSwitch" style={{ fontWeight: 500 }}>Tutor</label>
            </div>
            <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                className="form-check-input"
                type="checkbox"
                id="timedSwitch"
                checked={timed}
                onChange={(e) => handleTimedToggle(e.target.checked)}
                style={{ width: '40px', height: '20px', cursor: 'pointer' }}
              />
              <label className="form-check-label" htmlFor="timedSwitch" style={{ fontWeight: 500 }}>Timed</label>
            </div>
          </div>
        </div>

        {/* Question Type Section */}
        <div className="question-type-section" style={{
          marginBottom: '20px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label style={{ fontWeight: 600, color: '#374151' }}>
              Question Type
            </label>
            <span style={{ color: '#1e40af', fontWeight: 600, fontSize: '0.9rem' }}>
              {currentAvailable} questions available
            </span>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div className="form-check" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                className="form-check-input"
                id="traditionalCheck"
                checked={includeTraditional}
                onChange={(e) => setIncludeTraditional(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label className="form-check-label" htmlFor="traditionalCheck" style={{ fontWeight: 500 }}>
                Traditional
              </label>
            </div>
            <div className="form-check" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                className="form-check-input"
                id="nextGenCheck"
                checked={includeNextGen}
                onChange={(e) => setIncludeNextGen(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label className="form-check-label" htmlFor="nextGenCheck" style={{ fontWeight: 500 }}>
                Next Gen
              </label>
            </div>
          </div>
        </div>

        {/* Question Category Section */}
        <div className="question-category-section" style={{
          marginBottom: '20px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc'
          }}>
            <button
              type="button"
              onClick={() => setCategoryTab('subjects')}
              style={{
                flex: 1,
                padding: '12px 20px',
                border: 'none',
                background: categoryTab === 'subjects' ? '#fff' : 'transparent',
                borderBottom: categoryTab === 'subjects' ? '3px solid #1e40af' : '3px solid transparent',
                fontWeight: categoryTab === 'subjects' ? 600 : 500,
                color: categoryTab === 'subjects' ? '#1e40af' : '#64748b',
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
                borderBottom: categoryTab === 'clientNeeds' ? '3px solid #1e40af' : '3px solid transparent',
                fontWeight: categoryTab === 'clientNeeds' ? 600 : 500,
                color: categoryTab === 'clientNeeds' ? '#1e40af' : '#64748b',
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
                          background: isSelected ? '#eff6ff' : '#f8fafc',
                          borderRadius: '6px',
                          marginBottom: '8px',
                          border: isSelected ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
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
                            background: '#1e40af',
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
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        overflow: 'hidden'
                      }}>
                        <div
                          onClick={() => toggleCategory(category)}
                          style={{
                            padding: '10px 12px',
                            background: expandedCategory === category ? '#eff6ff' : '#f8fafc',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontWeight: 600,
                            color: '#1e40af'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className={`fas fa-chevron-${expandedCategory === category ? 'down' : 'right'}`} style={{ fontSize: '0.75rem' }}></i>
                            {category}
                          </span>
                          <span style={{
                            background: '#1e40af',
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

        {/* Number of Questions */}
        <div className="question-count-section" style={{
          marginBottom: '20px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontWeight: 600, color: '#374151' }}>
              No. of Questions
            </label>
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
              Max allowed: {maxAllowed}
            </span>
          </div>
          <input
            type="number"
            className="form-control"
            value={questionCount}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!isNaN(value)) {
                setQuestionCount(Math.max(questionRangeMin, Math.min(maxAllowed, value)));
              }
            }}
            min={questionRangeMin}
            max={maxAllowed}
            style={{
              width: '100%',
              marginTop: '8px',
              padding: '10px 12px',
              fontSize: '1rem',
              border: '2px solid #cbd5e1',
              borderRadius: '6px'
            }}
          />
        </div>

        {/* Generate Test Button */}
        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={loading}
          style={{
            background: '#1e40af',
            border: 'none',
            padding: '14px 24px',
            fontSize: '1.1rem',
            fontWeight: 600,
            borderRadius: '8px',
            transition: 'all 0.2s'
          }}
        >
          {loading ? 'Generating...' : 'GENERATE TEST'}
        </button>
      </form>
    </div>
  );
};

export default TestCustomization;
