import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CATEGORIES } from '../../constants/Categories';
import { NCLEX_CLIENT_NEEDS_CATEGORIES } from '../../constants/ClientNeeds';
import { resolveMediaCandidates, withCacheBust } from '../../utils/imageUpload';

const QUESTION_TYPES = [
  { value: 'multiple-choice', label: 'Multiple Choice', icon: 'fas fa-list-ul' },
  { value: 'sata', label: 'SATA (Select All That Apply)', icon: 'fas fa-check-square' },
  { value: 'fill-blank', label: 'Fill in the Blank', icon: 'fas fa-pen' },
  { value: 'highlight', label: 'Highlight Text', icon: 'fas fa-highlighter' },
  { value: 'drag-drop', label: 'Drag & Drop (Ordered Response)', icon: 'fas fa-arrows-alt' },
  { value: 'matrix', label: 'Matrix', icon: 'fas fa-table' },
  { value: 'hotspot', label: 'Hotspot', icon: 'fas fa-map-marker-alt' },
  { value: 'cloze-dropdown', label: 'Cloze Dropdown', icon: 'fas fa-caret-square-down' },
];

const UploadQuestion = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const editingQuestion = location.state?.question;

  const [type, setType] = useState('multiple-choice');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [clientNeed, setClientNeed] = useState('');
  const [clientNeedSubcategory, setClientNeedSubcategory] = useState('');
  const [isNextGen, setIsNextGen] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionImageUrl, setQuestionImageUrl] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [optionImages, setOptionImages] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [rationale, setRationale] = useState('');
  const [rationaleImageUrl, setRationaleImageUrl] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [, setHighlightStart] = useState(0);
  const [, setHighlightEnd] = useState(0);
  // New highlight click-to-select states
  const [highlightSelectableWords, setHighlightSelectableWords] = useState([]); // array of word indices that are clickable
  const [highlightCorrectWords, setHighlightCorrectWords] = useState([]); // array of word indices that are correct
  const [dragDropItems, setDragDropItems] = useState(['', '', '', '']);
  const [matrixColumns, setMatrixColumns] = useState(['Column 1', 'Column 2', 'Column 3']);
  const [matrixRows, setMatrixRows] = useState([
    { rowText: '', correctColumns: [0] },
    { rowText: '', correctColumns: [0] },
    { rowText: '', correctColumns: [0] },
  ]);
  const [hotspotImageUrl, setHotspotImageUrl] = useState('');
  const [hotspotTargets, setHotspotTargets] = useState([
    { id: 'A', label: 'Target A', x: 50, y: 50, radius: 6 }
  ]);
  const [clozeTemplate, setClozeTemplate] = useState('');
  const [clozeBlanks, setClozeBlanks] = useState([
    { key: 'blank1', optionsText: '', correctAnswer: '' }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [assetUploading, setAssetUploading] = useState('');

  useEffect(() => {
    if (!editingQuestion) return;

    setType(editingQuestion.type || 'multiple-choice');
    setCategory(editingQuestion.category || '');
    setSubcategory(editingQuestion.subcategory || '');
    setClientNeed(editingQuestion.clientNeed || '');
    setClientNeedSubcategory(editingQuestion.clientNeedSubcategory || '');
    setIsNextGen(editingQuestion.isNextGen || false);
    setQuestionText(editingQuestion.questionText || '');
    setQuestionImageUrl(editingQuestion.questionImageUrl || '');
    setOptions(editingQuestion.options || ['', '', '', '']);
    setOptionImages(editingQuestion.optionImages || ['', '', '', '']);
    setCorrectAnswer(editingQuestion.correctAnswer || '');
    setRationale(editingQuestion.rationale || '');
    setRationaleImageUrl(editingQuestion.rationaleImageUrl || '');
    setDifficulty(editingQuestion.difficulty || 'medium');
    setHighlightStart(editingQuestion.highlightStart || 0);
    setHighlightEnd(editingQuestion.highlightEnd || 0);
    setDragDropItems(editingQuestion.type === 'drag-drop' ? (editingQuestion.options || ['', '', '', '']) : ['', '', '', '']);
    setMatrixColumns(editingQuestion.matrixColumns || ['Column 1', 'Column 2', 'Column 3']);
    setMatrixRows(
      editingQuestion.matrixRows || [
        { rowText: '', correctColumns: [0] },
        { rowText: '', correctColumns: [0] },
        { rowText: '', correctColumns: [0] },
      ],
    );
    setHotspotImageUrl(editingQuestion.hotspotImageUrl || '');
    setHotspotTargets(
      Array.isArray(editingQuestion.hotspotTargets) && editingQuestion.hotspotTargets.length
        ? editingQuestion.hotspotTargets.map((t, idx) => ({
            id: String(t.id || `target${idx + 1}`),
            label: String(t.label || `Target ${idx + 1}`),
            x: Number(t.x ?? 50),
            y: Number(t.y ?? 50),
            radius: Number(t.radius ?? 6),
          }))
        : [{ id: 'A', label: 'Target A', x: 50, y: 50, radius: 6 }]
    );
    setClozeTemplate(editingQuestion.clozeTemplate || editingQuestion.questionText || '');
    setClozeBlanks(
      Array.isArray(editingQuestion.clozeBlanks) && editingQuestion.clozeBlanks.length
        ? editingQuestion.clozeBlanks.map((b, idx) => ({
            key: String(b.key || `blank${idx + 1}`),
            optionsText: Array.isArray(b.options) ? b.options.join('; ') : '',
            correctAnswer: String(b.correctAnswer || ''),
          }))
        : [{ key: 'blank1', optionsText: '', correctAnswer: '' }]
    );
    // Load highlight clickable words data
    setHighlightSelectableWords(Array.isArray(editingQuestion.highlightSelectableWords) ? editingQuestion.highlightSelectableWords : []);
    setHighlightCorrectWords(Array.isArray(editingQuestion.highlightCorrectWords) ? editingQuestion.highlightCorrectWords : []);
  }, [editingQuestion]);

  useEffect(() => {
    if (type === 'cloze-dropdown') return;
    if (typeof correctAnswer === 'string' || Array.isArray(correctAnswer)) return;
    setCorrectAnswer('');
  }, [type, correctAnswer]);

  const availableQuestionTypes = QUESTION_TYPES;

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setCategory(newCategory);
    setSubcategory('');
  };

  const handleOptionChange = (index, value) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  };

  const handleDragDropChange = (index, value) => {
    setDragDropItems((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addOption = () => {
    setOptions((prev) => [...prev, '']);
    setOptionImages((prev) => [...prev, '']);
  };

  // Use shared utility functions from imageUpload.js
  const firstMediaUrl = (rawUrl) => resolveMediaCandidates(rawUrl)[0] || '';

  const handlePreviewImageFallback = (event) => {
    const target = event.currentTarget;
    const raw = target.getAttribute('data-raw-src') || '';
    const index = Number(target.getAttribute('data-fallback-index') || '0');
    const candidates = resolveMediaCandidates(raw);
    if (index + 1 >= candidates.length) return;
    target.setAttribute('data-fallback-index', String(index + 1));
    target.src = candidates[index + 1];
  };

  const uploadAsset = async (file, targetField) => {
    if (!file) return;
    try {
      setAssetUploading(targetField);
      const token = sessionStorage.getItem('adminToken');
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/api/admin/content/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      const uploadedUrl = String(res?.data?.fileUrl || '').trim();
      if (!uploadedUrl) {
        setError('Upload succeeded but no file URL was returned');
        return;
      }
      const freshUrl = withCacheBust(uploadedUrl);
      if (targetField === 'hotspot') {
        setHotspotImageUrl(freshUrl);
      } else if (targetField === 'rationale') {
        setRationaleImageUrl(freshUrl);
      } else if (targetField === 'question') {
        setQuestionImageUrl(freshUrl);
      } else if (targetField.startsWith('option-')) {
        const idx = parseInt(targetField.replace('option-', ''), 10);
        setOptionImages(prev => {
          const updated = [...prev];
          while (updated.length <= idx) updated.push('');
          updated[idx] = freshUrl;
          return updated;
        });
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to upload image');
    } finally {
      setAssetUploading('');
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions((prev) => prev.filter((_, i) => i !== index));
      setOptionImages((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const resetForm = () => {
    setType('multiple-choice');
    setCategory('');
    setSubcategory('');
    setClientNeed('');
    setClientNeedSubcategory('');
    setIsNextGen(false);
    setQuestionText('');
    setQuestionImageUrl('');
    setOptions(['', '', '', '']);
    setOptionImages(['', '', '', '']);
    setCorrectAnswer('');
    setRationale('');
    setRationaleImageUrl('');
    setDifficulty('medium');
    setHighlightStart(0);
    setHighlightEnd(0);
    setHighlightSelectableWords([]);
    setHighlightCorrectWords([]);
    setDragDropItems(['', '', '', '']);
    setMatrixColumns(['Column 1', 'Column 2', 'Column 3']);
    setMatrixRows([
      { rowText: '', correctColumns: [0] },
      { rowText: '', correctColumns: [0] },
      { rowText: '', correctColumns: [0] },
    ]);
    setHotspotImageUrl('');
    setHotspotTargets([{ id: 'A', label: 'Target A', x: 50, y: 50, radius: 6 }]);
    setClozeTemplate('');
    setClozeBlanks([{ key: 'blank1', optionsText: '', correctAnswer: '' }]);
    setError('');
  };

  const updateHotspotTarget = (index, field, value) => {
    setHotspotTargets((prev) =>
      prev.map((target, i) =>
        i === index
          ? {
              ...target,
              [field]: ['x', 'y', 'radius'].includes(field) ? Number(value) : value
            }
          : target
      )
    );
  };

  const addHotspotTarget = () => {
    setHotspotTargets((prev) => [
      ...prev,
      {
        id: `target${prev.length + 1}`,
        label: `Target ${prev.length + 1}`,
        x: 50,
        y: 50,
        radius: 6
      }
    ]);
  };

  const removeHotspotTarget = (index) => {
    if (hotspotTargets.length <= 1) return;
    setHotspotTargets((prev) => prev.filter((_, i) => i !== index));
  };

  const updateClozeBlank = (index, field, value) => {
    setClozeBlanks((prev) =>
      prev.map((blank, i) => (i === index ? { ...blank, [field]: value } : blank))
    );
  };

  const addClozeBlank = () => {
    setClozeBlanks((prev) => [
      ...prev,
      { key: `blank${prev.length + 1}`, optionsText: '', correctAnswer: '' }
    ]);
  };

  const removeClozeBlank = (index) => {
    if (clozeBlanks.length <= 1) return;
    setClozeBlanks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBulkImport = async () => {
    if (!bulkFile) {
      setBulkStatus('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', bulkFile);
    setBulkLoading(true);
    setBulkStatus('Uploading...');

    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.post('/api/admin/questions/bulk-import', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      const inserted = Number(response.data?.inserted || 0);
      const updated = Number(response.data?.updated || 0);
      setBulkStatus(`Imported ${response.data.imported} questions (${inserted} new, ${updated} updated). ${response.data.errors} errors.`);
      setBulkFile(null);
    } catch (err) {
      setBulkStatus(`Import failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setBulkLoading(false);
    }
  };

  const buildMatrixQuestionData = (questionData) => {
    if (matrixColumns.length < 2) {
      setError('Please add at least 2 matrix columns');
      return null;
    }

    const cleanedColumns = matrixColumns.map((c) => c.trim()).filter(Boolean);
    if (cleanedColumns.length < 2) {
      setError('Please provide at least 2 matrix column names');
      return null;
    }

    const cleanedRows = matrixRows.map((row) => ({
      rowText: (row.rowText || '').trim(),
      correctColumns: Array.isArray(row.correctColumns) ? row.correctColumns : (row.correctColumn !== undefined ? [Number(row.correctColumn)] : []),
    }));

    if (cleanedRows.length < 1) {
      setError('Please add at least one matrix row');
      return null;
    }

    for (let i = 0; i < cleanedRows.length; i += 1) {
      if (!cleanedRows[i].rowText) {
        setError(`Matrix row ${i + 1} text is required`);
        return null;
      }
      const cols = cleanedRows[i].correctColumns;
      if (!Array.isArray(cols) || cols.length === 0) {
        setError(`Matrix row ${i + 1} must have at least one correct column selected`);
        return null;
      }
      for (const c of cols) {
        if (Number.isNaN(c) || c < 0 || c >= cleanedColumns.length) {
          setError(`Matrix row ${i + 1} has an invalid correct column index`);
          return null;
        }
      }
    }

    questionData.matrixColumns = cleanedColumns;
    questionData.matrixRows = cleanedRows;
    questionData.correctAnswer = cleanedRows.map((r) => r.correctColumns);
    questionData.options = [];
    return questionData;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const questionData = {
      type,
      category,
      subcategory,
      clientNeed,
      clientNeedSubcategory,
      isNextGen,
      questionText,
      questionImageUrl,
      rationale,
      rationaleImageUrl,
      difficulty,
      optionImages,
    };

    if (type === 'multiple-choice' || type === 'sata') {
      questionData.options = options.filter((opt) => opt.trim() !== '');
      // Keep optionImages aligned: only keep images for non-empty options
      const filteredOptionImages = options
        .map((opt, idx) => (opt.trim() !== '' ? (optionImages[idx] || '') : null))
        .filter(Boolean);
      questionData.optionImages = filteredOptionImages;

      if (type === 'multiple-choice') {
        if (!correctAnswer) {
          setError('Please select the correct answer');
          setLoading(false);
          return;
        }
        questionData.correctAnswer = correctAnswer;
      } else {
        const selected = Array.from(document.querySelectorAll('input[name="sata-option"]:checked')).map((cb) => cb.value);
        if (selected.length === 0) {
          setError('Please select at least one correct answer');
          setLoading(false);
          return;
        }
        questionData.correctAnswer = selected;
      }
    } else if (type === 'fill-blank') {
      questionData.correctAnswer = correctAnswer;
    } else if (type === 'highlight') {
      // New click-to-select highlight
      if (highlightSelectableWords.length === 0) {
        setError('Please select at least one clickable word');
        setLoading(false);
        return;
      }
      if (highlightCorrectWords.length === 0) {
        setError('Please select at least one correct word');
        setLoading(false);
        return;
      }
      questionData.highlightSelectableWords = highlightSelectableWords;
      questionData.highlightCorrectWords = highlightCorrectWords;
      // Store the correct word text as correctAnswer for backward compatibility
      const words = questionText.split(/\s+/).filter(w => w.trim());
      questionData.correctAnswer = highlightCorrectWords.map(idx => words[idx]).join('|');
    } else if (type === 'drag-drop') {
      const items = dragDropItems.filter((item) => item.trim() !== '');
      if (items.length < 2) {
        setError('Please enter at least 2 items');
        setLoading(false);
        return;
      }
      questionData.options = items;
      questionData.correctAnswer = items.join('|');
    } else if (type === 'matrix') {
      const matrixData = buildMatrixQuestionData(questionData);
      if (!matrixData) {
        setLoading(false);
        return;
      }
    } else if (type === 'hotspot') {
      if (!questionData.questionText || !questionData.questionText.trim()) {
        questionData.questionText = 'Tap the correct spot on the image.';
      }
      if (!hotspotImageUrl.trim()) {
        setError('Please provide a hotspot image URL');
        setLoading(false);
        return;
      }

      const cleanedTargets = hotspotTargets
        .map((target, idx) => ({
          id: String(target.id || `target${idx + 1}`).trim(),
          label: String(target.label || '').trim(),
          x: Number(target.x),
          y: Number(target.y),
          radius: Number(target.radius || 6),
        }))
        .filter((target) => target.id && !Number.isNaN(target.x) && !Number.isNaN(target.y));

      if (!cleanedTargets.length) {
        setError('Please add at least one valid hotspot target');
        setLoading(false);
        return;
      }

      const normalizedCorrect = String(correctAnswer || '').trim();
      if (!normalizedCorrect) {
        setError('Please choose the correct hotspot target');
        setLoading(false);
        return;
      }

      if (!cleanedTargets.some((target) => target.id === normalizedCorrect)) {
        setError('Correct hotspot target must match one target id');
        setLoading(false);
        return;
      }

      questionData.hotspotImageUrl = hotspotImageUrl.trim();
      questionData.hotspotTargets = cleanedTargets.map((target) => ({
        ...target,
        x: Math.max(0, Math.min(100, target.x)),
        y: Math.max(0, Math.min(100, target.y)),
        radius: Math.max(1, Math.min(20, Number.isFinite(target.radius) ? target.radius : 6)),
      }));
      questionData.correctAnswer = normalizedCorrect;
      questionData.options = [];
    } else if (type === 'cloze-dropdown') {
      const template = String(clozeTemplate || questionText || '').trim();
      if (!template) {
        setError('Please provide a cloze template');
        setLoading(false);
        return;
      }

      const parsedBlanks = clozeBlanks
        .map((blank, idx) => ({
          key: String(blank.key || `blank${idx + 1}`).trim(),
          options: String(blank.optionsText || '')
            .split(';')
            .map((opt) => opt.trim())
            .filter(Boolean),
          correctAnswer: String(blank.correctAnswer || '').trim(),
        }))
        .filter((blank) => blank.key && blank.correctAnswer);

      if (!parsedBlanks.length) {
        setError('Please define at least one blank with a correct answer');
        setLoading(false);
        return;
      }

      for (const blank of parsedBlanks) {
        if (blank.options.length && !blank.options.includes(blank.correctAnswer)) {
          setError(`Correct answer for ${blank.key} must be one of its options`);
          setLoading(false);
          return;
        }
      }

      const missingTokens = parsedBlanks.filter((blank) => !template.includes(`{{${blank.key}}}`));
      if (missingTokens.length > 0) {
        setError(`Template is missing placeholder(s): ${missingTokens.map((b) => `{{${b.key}}}`).join(', ')}`);
        setLoading(false);
        return;
      }

      const correctMap = {};
      parsedBlanks.forEach((blank) => {
        correctMap[blank.key] = blank.correctAnswer;
      });

      questionData.questionText = template;
      questionData.clozeTemplate = template;
      questionData.clozeBlanks = parsedBlanks;
      questionData.correctAnswer = correctMap;
      questionData.options = [];
    }

    try {
      const token = sessionStorage.getItem('adminToken');
      if (editingQuestion) {
        await axios.put(`/api/admin/questions/${editingQuestion._id}`, questionData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert('Question updated successfully!');
      } else {
        await axios.post('/api/admin/questions', questionData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert('Question created successfully!');
      }
      navigate('/admin/dashboard?section=questions');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  // Save as Draft - minimal validation, saves current state
  const handleSaveDraft = async () => {
    setLoading(true);
    setError('');

    const questionData = {
      type,
      category,
      subcategory,
      clientNeed,
      clientNeedSubcategory,
      isNextGen,
      questionText,
      questionImageUrl,
      rationale,
      rationaleImageUrl,
      difficulty,
      isDraft: true, // Mark as draft
      options: options.filter((opt) => opt.trim() !== ''),
      optionImages,
      correctAnswer: correctAnswer || '',
      highlightSelectableWords,
      highlightCorrectWords,
      dragDropItems: dragDropItems.filter((item) => item.trim() !== ''),
      matrixColumns,
      matrixRows,
      hotspotImageUrl,
      hotspotTargets,
      clozeTemplate,
      clozeBlanks,
    };

    try {
      const token = sessionStorage.getItem('adminToken');
      if (editingQuestion) {
        await axios.put(`/api/admin/questions/${editingQuestion._id}`, questionData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert('Draft updated successfully!');
      } else {
        await axios.post('/api/admin/questions', questionData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert('Draft saved successfully!');
      }
      navigate('/admin/dashboard?section=questions');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const dragPreviewItems = dragDropItems.filter((item) => item.trim() !== '');

  return (
    <div className="upload-question">
      <div className="upload-question-header">
        <h2>{editingQuestion ? 'Edit NCLEX Question' : 'Upload NCLEX Questions'}</h2>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit} className="form-card upload-form-card">
        <div className="form-group">
          <label className="form-label">Question Type</label>
          <div className="type-selector">
            {availableQuestionTypes.map((item) => (
              <button
                type="button"
                key={item.value}
                className={`type-btn ${type === item.value ? 'active' : ''}`}
                onClick={() => setType(item.value)}
              >
                <i className={item.icon} aria-hidden="true"></i>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="upload-grid-two">
          <div className="form-group">
            <label className="form-label">Main Category (Subject)</label>
            <select className="form-control" value={category} onChange={handleCategoryChange} required>
              <option value="">Select Category</option>
              {Object.keys(CATEGORIES).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Subcategory</label>
            <select className="form-control" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} required>
              <option value="">Select Subcategory</option>
              {category && CATEGORIES[category]?.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>

        {/* NCLEX Client Needs Classification */}
        <div className="form-group" style={{ marginTop: '16px', padding: '16px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
          <label className="form-label" style={{ color: '#0369a1', fontWeight: 600 }}>
            <i className="fas fa-clipboard-list me-2"></i>
            NCLEX Client Needs Classification (Optional)
          </label>
          <p className="text-muted small mb-3">
            Categorize this question by NCLEX Client Needs framework for better test filtering.
          </p>
          <div className="form-group">
            <label className="form-label">Client Need Category</label>
            <select 
              className="form-control" 
              value={clientNeedSubcategory || clientNeed} 
              onChange={(e) => {
                setClientNeed(e.target.value);
                setClientNeedSubcategory(e.target.value);
              }}
            >
              <option value="">Select Client Need</option>
              {NCLEX_CLIENT_NEEDS_CATEGORIES.map((cn) => (
                <option key={cn} value={cn}>{cn}</option>
              ))}
            </select>
          </div>
          <div className="form-check mt-3">
            <input
              type="checkbox"
              className="form-check-input"
              id="isNextGen"
              checked={isNextGen}
              onChange={(e) => setIsNextGen(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="isNextGen">
              <strong>Next Generation (NGN) Question</strong>
              <span className="text-muted d-block small">Check if this is a Next Generation NCLEX question type</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Question Text</label>
          <textarea
            className="form-control"
            rows="4"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder={type === 'hotspot' ? 'Optional text prompt (image can be the question)' : 'Enter the question or clinical scenario...'}
            required={type !== 'hotspot'}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <i className="fas fa-image me-2" style={{ color: '#6366f1' }}></i>
            Question Image (optional)
          </label>
          <small className="text-muted d-block mb-2">
            Attach an image to this question (e.g., ECG strip, chart, diagram, clinical photo). You can paste a URL or upload a file.
          </small>
          <input
            type="url"
            className="form-control mb-2"
            value={questionImageUrl}
            onChange={(e) => setQuestionImageUrl(e.target.value)}
            placeholder="Paste image URL (https://.../image.png or /api/uploads/...)"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>or</span>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="file"
              className="form-control"
              accept="image/*"
              onChange={(e) => uploadAsset(e.target.files?.[0], 'question')}
              style={{ display: 'block' }}
            />
          </div>
          {assetUploading === 'question' && (
            <small className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
              <i className="fas fa-spinner fa-spin"></i> Uploading image...
            </small>
          )}
          {questionImageUrl && (
            <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
              <img
                src={firstMediaUrl(questionImageUrl)}
                data-raw-src={questionImageUrl}
                data-fallback-index="0"
                onError={handlePreviewImageFallback}
                alt="Question visual preview"
                style={{ maxWidth: '400px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <button
                type="button"
                onClick={() => setQuestionImageUrl('')}
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  background: 'rgba(239, 68, 68, 0.9)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Remove image"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
        </div>

        {(type === 'multiple-choice' || type === 'sata') && (
          <div className="form-group">
            <div className="upload-row-header">
              <label className="form-label">Answer Options</label>
              <button type="button" className="btn btn-sm btn-primary" onClick={addOption}>Add Option</button>
            </div>
            <small className="text-muted d-block mb-3">
              Each option can have text, an image, or both. Use the image button to attach an image to any option.
            </small>
            <div className="option-list">
              {options.map((opt, idx) => (
                <div key={idx} className="option-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px', padding: '12px', marginBottom: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fafbfc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="option-index" style={{ minWidth: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{String.fromCharCode(65 + idx)}</div>
                    <input
                      type="text"
                      className="form-control option-input"
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        const input = document.getElementById(`option-image-input-${idx}`);
                        if (input) input.click();
                      }}
                      style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#6366f1', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}
                      title="Attach image to this option"
                    >
                      <i className="fas fa-image"></i>
                    </button>
                    <input
                      id={`option-image-input-${idx}`}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => uploadAsset(e.target.files?.[0], `option-${idx}`)}
                    />
                    {type === 'multiple-choice' && (
                      <label className="option-correct-toggle" style={{ whiteSpace: 'nowrap' }}>
                        <input
                          type="radio"
                          name="correct-option"
                          value={String.fromCharCode(65 + idx)}
                          checked={correctAnswer === String.fromCharCode(65 + idx)}
                          onChange={(e) => setCorrectAnswer(e.target.value)}
                        />
                        <span>Correct</span>
                      </label>
                    )}
                    {type === 'sata' && (
                      <label className="option-correct-toggle" style={{ whiteSpace: 'nowrap' }}>
                        <input type="checkbox" name="sata-option" value={String.fromCharCode(65 + idx)} />
                        <span>Correct</span>
                      </label>
                    )}
                    {options.length > 2 && (
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => removeOption(idx)}>Remove</button>
                    )}
                  </div>
                  {assetUploading === `option-${idx}` && (
                    <small className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '40px' }}>
                      <i className="fas fa-spinner fa-spin"></i> Uploading image...
                    </small>
                  )}
                  {optionImages[idx] && (
                    <div style={{ paddingLeft: '40px', position: 'relative', display: 'inline-block' }}>
                      <img
                        src={firstMediaUrl(optionImages[idx])}
                        data-raw-src={optionImages[idx]}
                        data-fallback-index="0"
                        onError={handlePreviewImageFallback}
                        alt={`Option ${String.fromCharCode(65 + idx)} image`}
                        style={{ maxHeight: '120px', maxWidth: '300px', borderRadius: '6px', border: '1px solid #e2e8f0', objectFit: 'contain' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setOptionImages(prev => {
                            const updated = [...prev];
                            updated[idx] = '';
                            return updated;
                          });
                        }}
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                          fontSize: '0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                        title="Remove image"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {type === 'fill-blank' && (
          <div className="form-group">
            <label className="form-label">Correct Answer</label>
            <input
              type="text"
              className="form-control"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              placeholder="Enter the correct answer"
              required
            />
            <small className="text-muted">For multiple acceptable answers, separate with semicolons (;)</small>
          </div>
        )}

        {type === 'highlight' && (
          <>
            <div className="form-group">
              <label className="form-label">Sentence / Question Text</label>
              <textarea
                className="form-control highlight-textarea"
                rows="3"
                value={questionText}
                onChange={(e) => {
                  setQuestionText(e.target.value);
                  // Reset selections when text changes
                  setHighlightSelectableWords([]);
                  setHighlightCorrectWords([]);
                }}
                placeholder="e.g., I am a boy, what am I?"
                required
              />
              <small className="text-muted">Enter the sentence. Words will be split by spaces.</small>
            </div>
            
            {questionText.trim() && (
              <>
                <div className="form-group">
                  <label className="form-label">Step 1: Click words to make them <strong style={{ color: '#3b82f6' }}>SELECTABLE</strong> (blue = selectable)</label>
                  <div 
                    className="highlight-word-picker"
                    style={{ 
                      padding: '16px', 
                      background: '#f8fafc', 
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0',
                      lineHeight: '2'
                    }}
                  >
                    {questionText.split(/\s+/).filter(w => w.trim()).map((word, idx) => {
                      const isSelectable = highlightSelectableWords.includes(idx);
                      const isCorrect = highlightCorrectWords.includes(idx);
                      return (
                        <span
                          key={idx}
                          onClick={() => {
                            if (isSelectable) {
                              // Remove from selectable
                              setHighlightSelectableWords(prev => prev.filter(i => i !== idx));
                              // Also remove from correct if it was correct
                              setHighlightCorrectWords(prev => prev.filter(i => i !== idx));
                            } else {
                              // Add to selectable
                              setHighlightSelectableWords(prev => [...prev, idx]);
                            }
                          }}
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            margin: '4px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: isCorrect ? '2px solid #22c55e' : isSelectable ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                            background: isCorrect ? '#dcfce7' : isSelectable ? '#dbeafe' : '#fff',
                            color: isCorrect ? '#166534' : isSelectable ? '#1e40af' : '#64748b',
                            fontWeight: isCorrect ? 600 : 400,
                            transition: 'all 0.15s'
                          }}
                          title={isCorrect ? 'Correct answer (click to deselect)' : isSelectable ? 'Selectable (click to deselect)' : 'Click to make selectable'}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </div>
                  <small className="text-muted">Click on words to toggle them as selectable. Selected words turn blue.</small>
                </div>

                <div className="form-group">
                  <label className="form-label">Step 2: Click selectable words to mark them as <strong style={{ color: '#22c55e' }}>CORRECT</strong> (green = correct answer)</label>
                  <div 
                    className="highlight-correct-picker"
                    style={{ 
                      padding: '16px', 
                      background: '#f0fdf4', 
                      borderRadius: '8px', 
                      border: '1px solid #bbf7d0',
                      lineHeight: '2'
                    }}
                  >
                    {highlightSelectableWords.length === 0 ? (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No selectable words yet. Select words above first.</span>
                    ) : (
                      questionText.split(/\s+/).filter(w => w.trim()).map((word, idx) => {
                        const isSelectable = highlightSelectableWords.includes(idx);
                        if (!isSelectable) return null;
                        const isCorrect = highlightCorrectWords.includes(idx);
                        return (
                          <span
                            key={idx}
                            onClick={() => {
                              if (isCorrect) {
                                setHighlightCorrectWords(prev => prev.filter(i => i !== idx));
                              } else {
                                setHighlightCorrectWords(prev => [...prev, idx]);
                              }
                            }}
                            style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              margin: '4px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              border: isCorrect ? '2px solid #22c55e' : '2px solid #3b82f6',
                              background: isCorrect ? '#dcfce7' : '#dbeafe',
                              color: isCorrect ? '#166534' : '#1e40af',
                              fontWeight: isCorrect ? 600 : 400,
                              transition: 'all 0.15s'
                            }}
                            title={isCorrect ? 'Click to remove from correct answers' : 'Click to mark as correct answer'}
                          >
                            {word}
                            {isCorrect && <span style={{ marginLeft: '4px' }}>✓</span>}
                          </span>
                        );
                      })
                    )}
                  </div>
                  <small className="text-muted">Click on blue words to mark them as correct answers (turns green).</small>
                </div>

                <div className="form-group" style={{ padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                  <strong>Summary:</strong>
                  <ul style={{ margin: '8px 0 0 20px' }}>
                    <li>Selectable words: {highlightSelectableWords.length} - {highlightSelectableWords.map(idx => `"${questionText.split(/\s+/).filter(w => w.trim())[idx]}"`).join(', ') || 'None'}</li>
                    <li>Correct answer(s): {highlightCorrectWords.length} - {highlightCorrectWords.map(idx => `"${questionText.split(/\s+/).filter(w => w.trim())[idx]}"`).join(', ') || 'None'}</li>
                  </ul>
                </div>
              </>
            )}
          </>
        )}

        {type === 'drag-drop' && (
          <div className="form-group">
            <div className="upload-row-header">
              <label className="form-label">Drag & Drop Items (Ordered Response)</label>
              <button type="button" className="btn btn-sm btn-primary" onClick={() => setDragDropItems(prev => [...prev, ''])}>Add Item</button>
            </div>
            <small className="text-muted d-block mb-3">
              Enter items in the <strong>correct order</strong> (top to bottom). Students will see them shuffled and must drag to match this order.
            </small>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}>Position</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}>Item Text (Correct Order)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {dragDropItems.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 600, color: '#64748b', width: '60px' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0' }}>
                      <input
                        type="text"
                        className="form-control"
                        value={item}
                        onChange={(e) => handleDragDropChange(idx, e.target.value)}
                        placeholder={`Step ${idx + 1}`}
                        style={{ border: '1px solid #e2e8f0', borderRadius: '6px' }}
                      />
                    </td>
                    <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0', textAlign: 'center', width: '80px' }}>
                      {dragDropItems.length > 2 && (
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => setDragDropItems(prev => prev.filter((_, i) => i !== idx))}>
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <small className="text-muted mt-2 d-block">
              {dragDropItems.filter(i => i.trim()).length} item(s) entered. Minimum 2 required.
            </small>
          </div>
        )}

        {type === 'matrix' && (
          <div className="form-group">
            <div className="upload-row-header">
              <label className="form-label" style={{ fontWeight: 700, color: '#0369a1', marginBottom: '12px', display: 'block' }}>
                Matrix Configuration
              </label>
            </div>

            {/* Column Headers - inline editable */}
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Column Headers</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {matrixColumns.map((col, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      style={{ width: '140px' }}
                      value={col}
                      onChange={(e) => {
                        const next = [...matrixColumns];
                        next[idx] = e.target.value;
                        setMatrixColumns(next);
                      }}
                      placeholder={`Col ${idx + 1}`}
                    />
                    {matrixColumns.length > 2 && (
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => {
                        const next = matrixColumns.filter((_, i) => i !== idx);
                        // Update correctColumns values that point to removed or later columns
                        const updatedRows = matrixRows.map(row => ({
                          ...row,
                          correctColumns: (Array.isArray(row.correctColumns) ? row.correctColumns : (row.correctColumn !== undefined ? [row.correctColumn] : []))
                            .map(c => c > idx ? c - 1 : (c === idx ? 0 : c))
                        }));
                        setMatrixColumns(next);
                        setMatrixRows(updatedRows);
                      }} style={{ padding: '2px 6px' }}>x</button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => {
                  setMatrixColumns((prev) => [...prev, `Column ${prev.length + 1}`]);
                }} style={{ padding: '2px 8px' }}>+ Col</button>
              </div>
            </div>

            {/* Rows - inline with radio-style correct column selection */}
            <div>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Rows (select correct column for each row)</label>
              {matrixRows.map((row, rowIdx) => (
                <div key={rowIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, color: '#64748b', minWidth: '20px' }}>{rowIdx + 1}.</span>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    style={{ flex: 1 }}
                    value={row.rowText || ''}
                    onChange={(e) => {
                      const next = [...matrixRows];
                      next[rowIdx] = { ...next[rowIdx], rowText: e.target.value };
                      setMatrixRows(next);
                    }}
                    placeholder="Row description..."
                  />
                  {matrixColumns.map((col, colIdx) => {
                    const isSelected = Array.isArray(row.correctColumns) && row.correctColumns.includes(colIdx);
                    return (
                    <label key={colIdx} style={{
                      display: 'flex', alignItems: 'center', gap: '3px',
                      padding: '3px 8px', borderRadius: '6px', cursor: 'pointer',
                      background: isSelected ? '#dcfce7' : '#f1f5f9',
                      border: `1px solid ${isSelected ? '#22c55e' : '#e2e8f0'}`,
                      fontSize: '0.8rem', whiteSpace: 'nowrap'
                    }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const next = [...matrixRows];
                          const current = Array.isArray(next[rowIdx].correctColumns) ? [...next[rowIdx].correctColumns] : (next[rowIdx].correctColumn !== undefined ? [next[rowIdx].correctColumn] : []);
                          if (isSelected) {
                            next[rowIdx] = { ...next[rowIdx], correctColumns: current.filter(c => c !== colIdx) };
                          } else {
                            next[rowIdx] = { ...next[rowIdx], correctColumns: [...current, colIdx] };
                          }
                          setMatrixRows(next);
                        }}
                        style={{ margin: 0 }}
                      />
                      {col || `Col ${colIdx + 1}`}
                    </label>
                    );
                  })}
                  {matrixRows.length > 1 && (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => {
                      setMatrixRows((prev) => prev.filter((_, i) => i !== rowIdx));
                    }} style={{ padding: '2px 6px' }}>x</button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-sm btn-outline-primary mt-2" onClick={() => {
                setMatrixRows((prev) => [...prev, { rowText: '', correctColumns: [0] }]);
              }}>+ Add Row</button>
            </div>

            {/* Preview Table */}
            {matrixRows.length > 0 && matrixColumns.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Preview</label>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '6px 10px', background: '#0369a1', color: '#fff', textAlign: 'left', borderRadius: '4px 0 0 0' }}>Row</th>
                        {matrixColumns.map((col, cIdx) => (
                          <th key={cIdx} style={{ padding: '6px 10px', background: '#0369a1', color: '#fff', textAlign: 'center' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixRows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: 500 }}>{row.rowText || `Row ${rIdx + 1}`}</td>
                          {matrixColumns.map((_, cIdx) => (
                            <td key={cIdx} style={{
                              padding: '6px 10px',
                              border: '1px solid #e2e8f0',
                              textAlign: 'center',
                              background: Array.isArray(row.correctColumns) && row.correctColumns.includes(cIdx) ? '#dcfce7' : '#fff'
                            }}>
                              {Array.isArray(row.correctColumns) && row.correctColumns.includes(cIdx) ? '\u2713' : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {type === 'hotspot' && (
          <div className="form-group">
            <label className="form-label">Hotspot Question Image URL</label>
            <input
              type="url"
              className="form-control"
              value={hotspotImageUrl}
              onChange={(e) => setHotspotImageUrl(e.target.value)}
              placeholder="https://.../image.png or /api/uploads/..."
            />
            <div className="mt-2">
              <label className="form-label">Upload Hotspot Image</label>
              <input
                type="file"
                className="form-control"
                accept="image/*"
                onChange={(e) => uploadAsset(e.target.files?.[0], 'hotspot')}
              />
              {assetUploading === 'hotspot' && <small className="text-muted">Uploading image...</small>}
            </div>
            {hotspotImageUrl && (
              <div className="mt-3">
                <small className="text-muted d-block mb-2">Click image to place a spot. If no target is selected, a new circle is created automatically.</small>
                <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}
                  onClick={(e) => {
                    const selectedId = String(correctAnswer || '').trim();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    const hasSelected = selectedId && hotspotTargets.some((t) => String(t.id) === selectedId);
                    if (!hasSelected) {
                      const nextId = `T${hotspotTargets.length + 1}`;
                      setHotspotTargets((prev) => [
                        ...prev,
                        {
                          id: nextId,
                          label: `Spot ${prev.length + 1}`,
                          x: Number(x.toFixed(2)),
                          y: Number(y.toFixed(2)),
                          radius: 6,
                        },
                      ]);
                      setCorrectAnswer(nextId);
                      return;
                    }
                    setHotspotTargets((prev) => prev.map((t) => (
                      String(t.id) === selectedId ? { ...t, x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) } : t
                    )));
                  }}
                >
                  <img
                    src={firstMediaUrl(hotspotImageUrl)}
                    data-raw-src={hotspotImageUrl}
                    data-fallback-index="0"
                    onError={handlePreviewImageFallback}
                    alt="Hotspot source"
                    style={{ maxWidth: '420px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                  {hotspotTargets.map((t, idx) => (
                    <span key={`dot-${idx}`} style={{ position: 'absolute', left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%, -50%)', width: `${Math.max(10, Number(t.radius || 6) * 2)}px`, height: `${Math.max(10, Number(t.radius || 6) * 2)}px`, borderRadius: '999px', border: '2px solid #ef4444', background: 'rgba(239,68,68,0.2)' }} />
                  ))}
                </div>
              </div>
            )}
            <small className="text-muted d-block mt-2">Target coordinates use percentages (x/y from 0 to 100).</small>

            <div className="upload-row-header mt-3">
              <label className="form-label mb-0">Hotspot Targets</label>
              <button type="button" className="btn btn-sm btn-primary" onClick={addHotspotTarget}>Add Target</button>
            </div>

            <div className="option-list">
              {hotspotTargets.map((target, idx) => (
                <div key={`target-${idx}`} className="matrix-row-builder">
                  <div className="upload-grid-three">
                    <div>
                      <label className="form-label">Target ID</label>
                      <input
                        type="text"
                        className="form-control"
                        value={target.id}
                        onChange={(e) => updateHotspotTarget(idx, 'id', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Label</label>
                      <input
                        type="text"
                        className="form-control"
                        value={target.label}
                        onChange={(e) => updateHotspotTarget(idx, 'label', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Correct</label>
                      <div>
                        <input
                          type="radio"
                          name="hotspot-correct"
                          value={target.id}
                          checked={correctAnswer === target.id}
                          onChange={(e) => setCorrectAnswer(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="upload-grid-three mt-2">
                    <div>
                      <label className="form-label">X (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="form-control"
                        value={target.x}
                        onChange={(e) => updateHotspotTarget(idx, 'x', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Y (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="form-control"
                        value={target.y}
                        onChange={(e) => updateHotspotTarget(idx, 'y', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Radius (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        className="form-control"
                        value={target.radius}
                        onChange={(e) => updateHotspotTarget(idx, 'radius', e.target.value)}
                      />
                    </div>
                  </div>

                  {hotspotTargets.length > 1 && (
                    <button type="button" className="btn btn-sm btn-danger mt-2" onClick={() => removeHotspotTarget(idx)}>
                      Remove Target
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {type === 'cloze-dropdown' && (
          <div className="form-group">
            <div className="upload-row-header">
              <label className="form-label">Cloze Dropdown (Fill-in with Dropdowns)</label>
            </div>
            <small className="text-muted d-block mb-3">
              Type a sentence. Click "Add Blank" to insert a dropdown placeholder. Then fill in 4 options for each blank and select the correct one.
            </small>
            
            {/* Sentence builder */}
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>Sentence with Blanks</label>
              <textarea
                className="form-control mb-2"
                rows="3"
                value={clozeTemplate}
                onChange={(e) => {
                  const val = e.target.value;
                  setClozeTemplate(val);
                  setQuestionText(val);
                  // Auto-detect {{blankN}} placeholders and sync clozeBlanks
                  const placeholderRegex = /\{\{(\w+)\}\}/g;
                  const found = [];
                  let match;
                  while ((match = placeholderRegex.exec(val)) !== null) {
                    found.push(match[1]);
                  }
                  if (found.length > 0) {
                    setClozeBlanks((prev) => {
                      const existingMap = {};
                      prev.forEach((b) => { existingMap[b.key] = b; });
                      return found.map((key) => existingMap[key] || { key, optionsText: '', correctAnswer: '' });
                    });
                  }
                }}
                placeholder="e.g., The nurse should {{blank1}} the patient and {{blank2}} the medication."
              />
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addClozeBlank}>
                <i className="fas fa-plus me-1"></i>Add Blank
              </button>
            </div>
            
            {/* Sentence preview */}
            {clozeTemplate.trim() && (
              <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', border: '2px solid #3b82f6', marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 600, marginBottom: '8px', display: 'block', color: '#1e40af' }}>
                  <i className="fas fa-eye me-1"></i>Preview (how students see it)
                </label>
                <div style={{ fontSize: '1.05rem', lineHeight: '2' }}>
                  {(() => {
                    const parts = clozeTemplate.split(/({{blank\d+}})/g);
                    return parts.map((part, idx) => {
                      const blankMatch = part.match(/{{blank(\d+)}}/);
                      if (blankMatch) {
                        const blankIdx = parseInt(blankMatch[1]) - 1;
                        const blank = clozeBlanks[blankIdx];
                        return (
                          <span key={idx} style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            margin: '0 4px',
                            background: '#dbeafe',
                            border: '2px solid #3b82f6',
                            borderRadius: '6px',
                            color: '#1e40af',
                            fontWeight: 600,
                            minWidth: '80px',
                            textAlign: 'center',
                          }}>
                            {blank?.correctAnswer || `Dropdown ${blankIdx + 1}`}
                            <i className="fas fa-caret-down ms-1"></i>
                          </span>
                        );
                      }
                      return <span key={idx}>{part}</span>;
                    });
                  })()}
                </div>
              </div>
            )}
            
            {/* Blank configuration - table format */}
            {clozeBlanks.map((blank, blankIdx) => {
              const blankToken = `{{blank${blankIdx + 1}}}`;
              const isInTemplate = clozeTemplate.includes(blankToken);
              return (
                <div key={blankIdx} style={{
                  padding: '16px',
                  marginBottom: '12px',
                  background: isInTemplate ? '#f0fdf4' : '#fef2f2',
                  borderRadius: '8px',
                  border: `1px solid ${isInTemplate ? '#bbf7d0' : '#fecaca'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <strong style={{ color: isInTemplate ? '#166534' : '#dc2626' }}>
                      {blankToken} {!isInTemplate && <span style={{ fontWeight: 400, fontSize: '0.85rem' }}>(not in sentence!)</span>}
                    </strong>
                    {clozeBlanks.length > 1 && (
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeClozeBlank(blankIdx)}>
                        <i className="fas fa-trash me-1"></i>Remove
                      </button>
                    )}
                  </div>
                  
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600 }}>Option</th>
                        <th style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600 }}>Text</th>
                        <th style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600 }}>Correct?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const options = String(blank.optionsText || '').split(';').filter(Boolean);
                        while (options.length < 4) options.push('');
                        return options.slice(0, 4).map((opt, optIdx) => {
                          const optionLetter = String.fromCharCode(65 + optIdx);
                          const isCorrect = blank.correctAnswer === opt.trim();
                          return (
                            <tr key={optIdx}>
                              <td style={{ padding: '4px 10px', border: '1px solid #e2e8f0', fontWeight: 600, color: '#64748b', textAlign: 'center' }}>{optionLetter}</td>
                              <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0' }}>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={opt}
                                  onChange={(e) => {
                                    const newOptions = [...options.slice(0, optIdx), e.target.value, ...options.slice(optIdx + 1)].filter(Boolean);
                                    updateClozeBlank(blankIdx, 'optionsText', newOptions.join('; '));
                                  }}
                                  placeholder={`Option ${optionLetter}`}
                                  style={{ border: isCorrect ? '2px solid #22c55e' : '1px solid #e2e8f0', borderRadius: '6px' }}
                                />
                              </td>
                              <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                <input
                                  type="radio"
                                  name={`cloze-correct-${blankIdx}`}
                                  checked={isCorrect}
                                  onChange={() => updateClozeBlank(blankIdx, 'correctAnswer', opt.trim())}
                                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                />
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Rationale/Explanation</label>
          <textarea className="form-control" rows="3" value={rationale} onChange={(e) => setRationale(e.target.value)} required />
          <div className="mt-2" style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label className="form-label">
              <i className="fas fa-image me-2" style={{ color: '#6366f1' }}></i>
              Rationale Image (optional)
            </label>
            <small className="text-muted d-block mb-2">
              Add an image to the explanation (e.g., diagram, chart, annotated image).
            </small>
            <input type="url" className="form-control mb-2" value={rationaleImageUrl} onChange={(e) => setRationaleImageUrl(e.target.value)} placeholder="Paste image URL (https://.../rationale.png or /api/uploads/...)" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>or</span>
            </div>
            <input type="file" className="form-control" accept="image/*" onChange={(e) => uploadAsset(e.target.files?.[0], 'rationale')} />
            {assetUploading === 'rationale' && (
              <small className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <i className="fas fa-spinner fa-spin"></i> Uploading image...
              </small>
            )}
            {rationaleImageUrl && (
              <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                <img
                  src={firstMediaUrl(rationaleImageUrl)}
                  data-raw-src={rationaleImageUrl}
                  data-fallback-index="0"
                  onError={handlePreviewImageFallback}
                  alt="Rationale preview"
                  style={{ maxWidth: '400px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
                <button
                  type="button"
                  onClick={() => setRationaleImageUrl('')}
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: 'rgba(239, 68, 68, 0.9)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Remove image"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Difficulty Level</label>
          <select className="form-control" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className="upload-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : editingQuestion ? 'Update Question' : 'Save Question'}
          </button>
          <button type="button" className="btn btn-outline-warning" onClick={handleSaveDraft} disabled={loading}>
            <i className="fas fa-save me-1"></i>
            {loading ? 'Saving...' : 'Save as Draft'}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>Clear Form</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/dashboard?section=questions')}>View All Questions</button>
        </div>
      </form>

      <div className="form-card bulk-import-card">
        <h2 className="bulk-import-title">Bulk Import Questions</h2>
        <p className="bulk-import-help">
          Upload a CSV file to import multiple questions at once.
          <br />
          <strong>CSV format recommended:</strong> First row headers: type, category, subcategory, clientneed, clientneedsubcategory, questiontext, options, correctanswer, rationale, difficulty
          <br />- no row limit per import
          <br />- type: multiple-choice | sata | fill-blank | highlight | drag-drop | matrix | hotspot | cloze-dropdown
          <br />- clientneed: NCLEX Client Need category (e.g., "Management of Care", "Safety and Infection Control", etc.)
          <br />- clientneedsubcategory: NCLEX Client Need subcategory (e.g., "Advance Directives", "Ethical Practice", etc.)
          <br />- options: semicolon-separated (e.g., A) Option1;B) Option2)
          <br />- correctAnswer: letters (e.g., A) or comma-separated for SATA
          <br />- hotspot: use hotspotImageUrl and hotspotTargets (JSON or id|label|x|y|radius;...)
          <br />- cloze-dropdown: use clozeTemplate and clozeBlanks (JSON or key|opt1/opt2|correct;;...)
          <br /><strong>Tip:</strong> Export existing questions first to get a properly formatted CSV template with all column headers.
        </p>

        <div className="form-group">
          <label className="form-label">Import File (CSV)</label>
          <input type="file" className="form-control" accept=".csv" onChange={(e) => setBulkFile(e.target.files?.[0] || null)} />
        </div>

        <div className="bulk-import-actions">
          <button className="btn btn-primary" onClick={handleBulkImport} disabled={bulkLoading} type="button">
            <i className="fas fa-file-import me-2"></i>
            {bulkLoading ? 'Importing...' : 'Import Questions'}
          </button>
          {bulkStatus && (
            <span className={`bulk-import-status ${bulkStatus.startsWith('Imported') ? 'success' : 'error'}`}>
              {bulkStatus}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadQuestion;
