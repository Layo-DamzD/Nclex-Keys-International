import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../constants/Categories';
import { CLIENT_NEEDS } from '../constants/ClientNeeds';

// Fun color palette for category cards
const CATEGORY_COLORS = [
  { border: '#14b8a6', bg: '#f0fdfa', accent: '#0d9488' }, // teal
  { border: '#f97316', bg: '#fff7ed', accent: '#ea580c' }, // orange
  { border: '#a855f7', bg: '#faf5ff', accent: '#9333ea' }, // purple
  { border: '#22c55e', bg: '#f0fdf4', accent: '#16a34a' }, // green
  { border: '#3b82f6', bg: '#eff6ff', accent: '#1d4ed8' }, // blue
  { border: '#ec4899', bg: '#fdf2f8', accent: '#db2777' }, // pink
  { border: '#06b6d4', bg: '#ecfeff', accent: '#0891b2' }, // cyan
  { border: '#eab308', bg: '#fefce8', accent: '#ca8a04' }, // yellow
];

// Color palette for Client Needs
const CLIENT_NEEDS_COLORS = [
  { border: '#2563eb', bg: '#eff6ff', accent: '#1d4ed8' }, // blue
  { border: '#7c3aed', bg: '#f5f3ff', accent: '#6d28d9' }, // violet
  { border: '#db2777', bg: '#fdf2f8', accent: '#be185d' }, // pink
  { border: '#059669', bg: '#ecfdf5', accent: '#047857' }, // emerald
];

const TestCustomization = () => {
  // Define normalizeKey FIRST before any function uses it
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

    // Create a looser key so "immune / infectious disease" and "immune infectious disease" still match
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
  const [visibleSummary, setVisibleSummary] = useState({
    available: true,
    used: true,
    omitted: true,
  });
  const navigate = useNavigate();

  // Filter mode: 'standard' (by Subject) or 'clientNeeds' (by NCLEX Client Needs)
  const [filterMode, setFilterMode] = useState('standard');
  const [selectedClientNeedPairs, setSelectedClientNeedPairs] = useState([]);
  const [expandedClientNeed, setExpandedClientNeed] = useState(null);
  const [clientNeedsCounts, setClientNeedsCounts] = useState({});

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

  // Client Needs helper functions
  const getClientNeedPairKey = (clientNeed, subcategory) => `${clientNeed}:::${subcategory}`;

  const isClientNeedSubcategorySelected = (clientNeed, subcategory) =>
    selectedClientNeedPairs.includes(getClientNeedPairKey(clientNeed, subcategory));

  const getClientNeedCount = (clientNeed, subcategory) => {
    // Map client need subcategory to question counts
    const key = normalizeKey(subcategory);
    return clientNeedsCounts?.[key] || 0;
  };

  const handleClientNeedSubcategoryToggle = (clientNeed, subcategory) => {
    const key = getClientNeedPairKey(clientNeed, subcategory);
    setSelectedClientNeedPairs(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  const handleClientNeedSelectAll = (clientNeed, subcategories) => {
    const allSelected = subcategories.every(sub => isClientNeedSubcategorySelected(clientNeed, sub));
    if (allSelected) {
      const subcatKeys = new Set(subcategories.map(sub => getClientNeedPairKey(clientNeed, sub)));
      setSelectedClientNeedPairs(prev => prev.filter(s => !subcatKeys.has(s)));
    } else {
      const missing = subcategories
        .map(sub => getClientNeedPairKey(clientNeed, sub))
        .filter(key => !selectedClientNeedPairs.includes(key));
      setSelectedClientNeedPairs(prev => [...prev, ...missing]);
    }
  };

  // Calculate totals for Client Needs mode
  const clientNeedsTotals = useMemo(() => {
    const totals = {};
    Object.entries(CLIENT_NEEDS).forEach(([clientNeed, subcategories]) => {
      const total = subcategories.reduce((sum, sub) => sum + getClientNeedCount(clientNeed, sub), 0);
      totals[clientNeed] = total;
    });
    return totals;
  }, [clientNeedsCounts]);

  const selectedClientNeedsStats = useMemo(() => {
    if (selectedClientNeedPairs.length === 0) {
      // Calculate total from all client needs
      let total = 0;
      Object.entries(CLIENT_NEEDS).forEach(([clientNeed, subcategories]) => {
        subcategories.forEach(sub => {
          total += getClientNeedCount(clientNeed, sub);
        });
      });
      return { available: total, used: 0, omitted: 0 };
    }

    return selectedClientNeedPairs.reduce((totals, pairKey) => {
      const [clientNeed, subcategory] = pairKey.split(':::');
      const count = getClientNeedCount(clientNeed, subcategory);
      return {
        ...totals,
        available: totals.available + count,
      };
    }, { available: 0, used: 0, omitted: 0 });
  }, [selectedClientNeedPairs, clientNeedsCounts]);

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
        // Always show your configured category/subcategory taxonomy,
        // even when question counts are currently zero.
        setCategoryMap(CATEGORIES);
        setUsedSubcategoryCounts(normalizeNestedCounts(usedRawNestedCounts));
        setOmittedSubcategoryCounts(normalizeNestedCounts(omittedRawNestedCounts));

        // Also fetch client needs counts
        try {
          const clientNeedsResponse = await axios.get('/api/student/client-needs-counts', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setClientNeedsCounts(clientNeedsResponse.data?.countsByClientNeed || {});
        } catch (cnErr) {
          console.error('Failed to load client needs counts', cnErr);
          // Set empty counts if endpoint doesn't exist yet
          setClientNeedsCounts({});
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
    const cols = [[], [], []];
    Object.entries(categoryMap).forEach((entry, index) => {
      cols[index % 3].push(entry);
    });
    return cols;
  }, [categoryMap]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check based on filter mode
    if (filterMode === 'clientNeeds') {
      if (selectedClientNeedPairs.length === 0) {
        setError('Select at least one client need subcategory');
        return;
      }
      if (selectedClientNeedsStats.available === 0) {
        setError('No questions are available in the selected client needs.');
        return;
      }
      if (questionCount > selectedClientNeedsStats.available) {
        setError(`Only ${selectedClientNeedsStats.available} questions match your current client needs selection.`);
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
        setError(`Only ${selectedStats.available} questions match your current category/subcategory selection.`);
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

      if (filterMode === 'clientNeeds') {
        // Submit with client needs
        const clientNeedsSelections = selectedClientNeedPairs.map((pairKey) => {
          const [clientNeed, subcategory] = pairKey.split(':::');
          return { clientNeed, clientNeedSubcategory: subcategory };
        });

        const response = await axios.post('/api/student/generate-test', {
          clientNeedsSelections: clientNeedsSelections,
          filterMode: 'clientNeeds',
          questionCount,
          timed,
          tutorMode
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
          tutorMode
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

  // Get color for category by index
  const getCategoryColor = (index) => CATEGORY_COLORS[index % CATEGORY_COLORS.length];
  const getClientNeedColor = (index) => CLIENT_NEEDS_COLORS[index % CLIENT_NEEDS_COLORS.length];

  // Get current stats based on mode
  const currentStats = filterMode === 'clientNeeds' ? selectedClientNeedsStats : selectedStats;

  return (
    <div className="test-customization">
      <h3 style={{ 
        background: 'linear-gradient(135deg, #14b8a6, #3b82f6)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontWeight: 700,
        marginBottom: '16px'
      }}>
        ✨ Customize Your Test ✨
      </h3>
      {error && <div className="alert alert-danger">{error}</div>}
      {countLoadError && <div className="alert alert-warning">{countLoadError}</div>}
      <form onSubmit={handleSubmit}>
        {/* Filter Mode Toggle */}
        <div className="filter-mode-toggle mb-4">
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn ${filterMode === 'standard' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setFilterMode('standard')}
              style={{
                background: filterMode === 'standard' ? 'linear-gradient(135deg, #14b8a6, #0d9488)' : 'transparent',
                borderColor: filterMode === 'standard' ? '#14b8a6' : '#cbd5e1',
                color: filterMode === 'standard' ? 'white' : '#475569',
                fontWeight: 600,
                borderRadius: '8px 0 0 8px'
              }}
            >
              <i className="fas fa-book-medical me-2"></i>
              Standard (By Subject)
            </button>
            <button
              type="button"
              className={`btn ${filterMode === 'clientNeeds' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setFilterMode('clientNeeds')}
              style={{
                background: filterMode === 'clientNeeds' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                borderColor: filterMode === 'clientNeeds' ? '#2563eb' : '#cbd5e1',
                color: filterMode === 'clientNeeds' ? 'white' : '#475569',
                fontWeight: 600,
                borderRadius: '0 8px 8px 0'
              }}
            >
              <i className="fas fa-clipboard-list me-2"></i>
              NCLEX Client Needs
            </button>
          </div>
        </div>

        <div className="exam-review-filter-strip mb-4">
          {[
            { key: 'available', label: 'Available', count: currentStats.available },
            { key: 'used', label: 'Used', count: currentStats.used },
            { key: 'omitted', label: 'Omitted', count: currentStats.omitted },
          ].map((item) => (
            <div key={item.key} className={`exam-review-filter-pill ${visibleSummary[item.key] ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={visibleSummary[item.key]}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setVisibleSummary((prev) => ({ ...prev, [item.key]: checked }));
                }}
              />
              <span>{item.label}</span>
              <strong>{visibleSummary[item.key] ? item.count : '-'}</strong>
            </div>
          ))}
          <div className="exam-review-filter-total">
            This Test Uses <strong>{Math.min(questionCount, currentStats.available)}</strong>
          </div>
        </div>

        {/* Standard Categories Section */}
        {filterMode === 'standard' && (
          <div className="categories-section">
            <label style={{ 
              fontWeight: 600, 
              color: '#14b8a6',
              marginBottom: '12px',
              fontSize: '1rem'
            }}>
              📚 Categories & Subcategories
            </label>
          <div className="category-grid">
            {categoryColumns.map((column, colIndex) => (
              <div key={colIndex} className="category-column">
                {column.map(([category, subcats], cardIndex) => {
                  const colorStyle = getCategoryColor(colIndex * 10 + cardIndex);
                  return (
                  <div 
                    key={category} 
                    className={`category-card ${expandedCategory === category ? 'expanded' : ''}`}
                    style={{ 
                      borderLeft: `4px solid ${colorStyle.border}`,
                      background: `linear-gradient(135deg, ${colorStyle.bg} 0%, #ffffff 100%)`
                    }}
                  >
                    <div 
                      className="category-header" 
                      onClick={() => toggleCategory(category)}
                      style={{ color: colorStyle.accent }}
                    >
                      <i 
                        className={`fas fa-chevron-${expandedCategory === category ? 'down' : 'right'}`}
                        style={{ color: colorStyle.border }}
                      ></i>
                      <span className="fw-bold" style={{ color: colorStyle.accent }}>
                        {category}
                        <span
                          className="subcategory-count-pill category-total"
                          title={`Used in your custom tests: ${usedCategoryTotals[category] || 0}`}
                          style={{ 
                            background: colorStyle.border,
                            color: 'white'
                          }}
                        >
                          {categoryTotals[category] || 0}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm select-all-btn"
                        style={{
                          background: subcats.every(sub => isSubcategorySelected(category, sub)) 
                            ? `linear-gradient(135deg, ${colorStyle.accent}, ${colorStyle.border})`
                            : 'white',
                          color: subcats.every(sub => isSubcategorySelected(category, sub)) 
                            ? 'white' 
                            : colorStyle.accent,
                          border: `1px solid ${colorStyle.border}`,
                          fontWeight: 600
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCategorySelectAll(category, subcats);
                        }}
                      >
                        {subcats.every(sub => isSubcategorySelected(category, sub)) ? '✓ Deselect' : 'Select All'}
                      </button>
                    </div>
                    {expandedCategory === category && (
                      <div className="subcategory-list">
                        {subcats.map(sub => (
                          <div key={sub} className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id={`${category}-${sub}`}
                              checked={isSubcategorySelected(category, sub)}
                              onChange={() => handleSubcategoryToggle(category, sub)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ 
                                accentColor: colorStyle.border,
                              }}
                            />
                            <label 
                              className="form-check-label" 
                              htmlFor={`${category}-${sub}`}
                              style={{ color: '#374151' }}
                            >
                              <span>{sub}</span>
                              <span
                                className="subcategory-count-pill"
                                title={`Used in your custom tests: ${getUsedSubcategoryCount(category, sub)}`}
                                style={{
                                  background: `${colorStyle.bg}`,
                                  color: colorStyle.accent,
                                  border: `1px solid ${colorStyle.border}`
                                }}
                              >
                                {getSubcategoryCount(category, sub)}
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );})}
              </div>
            ))}
          </div>
          </div>
        )}

        {/* Client Needs Section */}
        {filterMode === 'clientNeeds' && (
          <div className="categories-section">
            <label style={{ 
              fontWeight: 600, 
              color: '#2563eb',
              marginBottom: '12px',
              fontSize: '1rem'
            }}>
              📋 NCLEX Client Needs Framework
            </label>
            <p className="text-muted small mb-3">
              Select questions based on the official NCLEX Client Needs categories. This aligns with how questions are organized in the actual NCLEX exam.
            </p>
            <div className="category-grid">
              {Object.entries(CLIENT_NEEDS).map(([clientNeed, subcategories], clientNeedIndex) => {
                const colorStyle = getClientNeedColor(clientNeedIndex);
                return (
                  <div 
                    key={clientNeed} 
                    className={`category-card ${expandedClientNeed === clientNeed ? 'expanded' : ''}`}
                    style={{ 
                      borderLeft: `4px solid ${colorStyle.border}`,
                      background: `linear-gradient(135deg, ${colorStyle.bg} 0%, #ffffff 100%)`
                    }}
                  >
                    <div 
                      className="category-header" 
                      onClick={() => setExpandedClientNeed(prev => prev === clientNeed ? null : clientNeed)}
                      style={{ color: colorStyle.accent }}
                    >
                      <i 
                        className={`fas fa-chevron-${expandedClientNeed === clientNeed ? 'down' : 'right'}`}
                        style={{ color: colorStyle.border }}
                      ></i>
                      <span className="fw-bold" style={{ color: colorStyle.accent }}>
                        {clientNeed}
                        <span
                          className="subcategory-count-pill category-total"
                          style={{ 
                            background: colorStyle.border,
                            color: 'white'
                          }}
                        >
                          {clientNeedsTotals[clientNeed] || 0}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm select-all-btn"
                        style={{
                          background: subcategories.every(sub => isClientNeedSubcategorySelected(clientNeed, sub)) 
                            ? `linear-gradient(135deg, ${colorStyle.accent}, ${colorStyle.border})`
                            : 'white',
                          color: subcategories.every(sub => isClientNeedSubcategorySelected(clientNeed, sub)) 
                            ? 'white' 
                            : colorStyle.accent,
                          border: `1px solid ${colorStyle.border}`,
                          fontWeight: 600
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClientNeedSelectAll(clientNeed, subcategories);
                        }}
                      >
                        {subcategories.every(sub => isClientNeedSubcategorySelected(clientNeed, sub)) ? '✓ Deselect' : 'Select All'}
                      </button>
                    </div>
                    {expandedClientNeed === clientNeed && (
                      <div className="subcategory-list">
                        {subcategories.map(sub => (
                          <div key={sub} className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id={`${clientNeed}-${sub}`}
                              checked={isClientNeedSubcategorySelected(clientNeed, sub)}
                              onChange={() => handleClientNeedSubcategoryToggle(clientNeed, sub)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ 
                                accentColor: colorStyle.border,
                              }}
                            />
                            <label 
                              className="form-check-label" 
                              htmlFor={`${clientNeed}-${sub}`}
                              style={{ color: '#374151' }}
                            >
                              <span>{sub}</span>
                              <span
                                className="subcategory-count-pill"
                                style={{
                                  background: `${colorStyle.bg}`,
                                  color: colorStyle.accent,
                                  border: `1px solid ${colorStyle.border}`
                                }}
                              >
                                {getClientNeedCount(clientNeed, sub)}
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="controls-row">
          <div className="question-control">
            <label style={{ fontWeight: 600, color: '#14b8a6' }}>🎯 Questions:</label>
            <input
              type="text"
              className="form-control"
              value={questionCount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                if (value === '') {
                  setQuestionCount('');
                } else {
                  const num = parseInt(value, 10);
                  if (!isNaN(num)) {
                    const clamped = Math.min(Math.max(num, questionRangeMin), Math.min(questionRangeMax, currentStats.available));
                    setQuestionCount(clamped);
                  }
                }
              }}
              onBlur={(e) => {
                const num = parseInt(e.target.value, 10);
                if (isNaN(num) || num < questionRangeMin) {
                  setQuestionCount(questionRangeMin);
                } else if (num > Math.min(questionRangeMax, currentStats.available)) {
                  setQuestionCount(Math.min(questionRangeMax, currentStats.available));
                }
              }}
              style={{ 
                width: '100px', 
                display: 'inline-block', 
                marginLeft: '10px',
                textAlign: 'center',
                fontSize: '1.1rem',
                fontWeight: 600,
                border: '2px solid #14b8a6',
                borderRadius: '8px'
              }}
              placeholder="75"
            />
            <span className="text-muted ms-2" style={{ fontSize: '0.85rem' }}>(Min: {questionRangeMin}, Max: {Math.min(questionRangeMax, currentStats.available)})</span>
          </div>

          <div className="mode-controls">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="timedSwitch"
                checked={timed}
                onChange={(e) => handleTimedToggle(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="timedSwitch">Timed</label>
            </div>

            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="tutorSwitch"
                checked={tutorMode}
                onChange={(e) => handleTutorToggle(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="tutorSwitch">Tutor</label>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
              border: 'none',
              fontWeight: 600,
              boxShadow: '0 4px 15px rgba(20, 184, 166, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            {loading ? '⏳ Generating...' : '🚀 Start Test'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TestCustomization;
