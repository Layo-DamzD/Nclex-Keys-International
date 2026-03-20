import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../constants/Categories';

const TestCustomization = () => {
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


  const deriveCategoryMapFromCounts = (rawNestedCounts = {}) => {
    const entries = Object.entries(rawNestedCounts)
      .map(([category, subMap]) => {
        const subcategories = Object.keys(subMap || {}).filter(Boolean);
        return [category, subcategories];
      })
      .filter(([category, subcategories]) => category && subcategories.length > 0);

    if (!entries.length) return CATEGORIES;

    return Object.fromEntries(entries);
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

        setSubcategoryCounts(normalizeNestedCounts(totalRawNestedCounts));
        setCategoryMap(deriveCategoryMapFromCounts(totalRawNestedCounts));
        setUsedSubcategoryCounts(normalizeNestedCounts(usedRawNestedCounts));
        setOmittedSubcategoryCounts(normalizeNestedCounts(omittedRawNestedCounts));
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
    if (selectedSubcategoryPairs.length === 0) {
      setError('Select at least one subcategory');
      return;
    }
    if (selectedStats.available === 0) {
      setError('No questions are available in the selected subcategories.');
      return;
    }
    if (questionCount < questionRangeMin || questionCount > questionRangeMax) {
      setError(`Question count must be between ${questionRangeMin} and ${questionRangeMax}.`);
      return;
    }
    if (questionCount > selectedStats.available) {
      setError(`Only ${selectedStats.available} questions match your current category/subcategory selection.`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="test-customization">
      <h3>Customize Your Test</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      {countLoadError && <div className="alert alert-warning">{countLoadError}</div>}
      <form onSubmit={handleSubmit}>
        <div className="exam-review-filter-strip mb-4">
          {[
            { key: 'available', label: 'Available', count: selectedStats.available },
            { key: 'used', label: 'Used', count: selectedStats.used },
            { key: 'omitted', label: 'Omitted', count: selectedStats.omitted },
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
            This Test Uses <strong>{Math.min(questionCount, selectedStats.available)}</strong>
          </div>
        </div>

        <div className="categories-section">
          <label>Categories & Subcategories</label>
          <div className="category-grid">
            {categoryColumns.map((column, colIndex) => (
              <div key={colIndex} className="category-column">
                {column.map(([category, subcats]) => (
                  <div key={category} className={`category-card ${expandedCategory === category ? 'expanded' : ''}`}>
                    <div className="category-header" onClick={() => toggleCategory(category)}>
                      <i className={`fas fa-chevron-${expandedCategory === category ? 'down' : 'right'}`}></i>
                      <span className="fw-bold">
                        {category}
                        <span
                          className="subcategory-count-pill category-total"
                          title={`Used in your custom tests: ${usedCategoryTotals[category] || 0}`}
                        >
                          {categoryTotals[category] || 0}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary select-all-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCategorySelectAll(category, subcats);
                        }}
                      >
                        {subcats.every(sub => isSubcategorySelected(category, sub)) ? 'Deselect All' : 'Select All'}
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
                            />
                            <label className="form-check-label" htmlFor={`${category}-${sub}`}>
                              <span>{sub}</span>
                              <span
                                className="subcategory-count-pill"
                                title={`Used in your custom tests: ${getUsedSubcategoryCount(category, sub)}`}
                              >
                                {getSubcategoryCount(category, sub)}
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="controls-row">
          <div className="question-control">
            <label>Questions: {questionCount}</label>
            <input
              type="range"
              className="form-range"
              min={questionRangeMin}
              max={questionRangeMax}
              step={1}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
            />
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

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Generating...' : 'Start Test'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TestCustomization;
