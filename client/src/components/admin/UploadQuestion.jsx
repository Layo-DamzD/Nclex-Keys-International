import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CATEGORIES } from '../../constants/Categories';

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
  const [questionText, setQuestionText] = useState('');
  const [questionImageUrl, setQuestionImageUrl] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [rationale, setRationale] = useState('');
  const [rationaleImageUrl, setRationaleImageUrl] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [, setHighlightStart] = useState(0);
  const [, setHighlightEnd] = useState(0);
  const [dragDropItems, setDragDropItems] = useState(['', '', '', '']);
  const [matrixColumns, setMatrixColumns] = useState(['Column 1', 'Column 2', 'Column 3']);
  const [matrixRows, setMatrixRows] = useState([
    { rowText: '', correctColumn: 0 },
    { rowText: '', correctColumn: 0 },
    { rowText: '', correctColumn: 0 },
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
    setQuestionText(editingQuestion.questionText || '');
    setQuestionImageUrl(editingQuestion.questionImageUrl || '');
    setOptions(editingQuestion.options || ['', '', '', '']);
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
        { rowText: '', correctColumn: 0 },
        { rowText: '', correctColumn: 0 },
        { rowText: '', correctColumn: 0 },
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
  }, [editingQuestion]);

  useEffect(() => {
    if (type === 'cloze-dropdown') return;
    if (typeof correctAnswer === 'string' || Array.isArray(correctAnswer)) return;
    setCorrectAnswer('');
  }, [type, correctAnswer]);

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setSubcategory('');
  };

  const handleOptionChange = (index, value) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  };

  const handleDragDropChange = (index, value) => {
    setDragDropItems((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addOption = () => setOptions((prev) => [...prev, '']);

  const withCacheBust = (rawUrl) => {
    const value = String(rawUrl || '').trim();
    if (!value) return '';
    const joiner = value.includes('?') ? '&' : '?';
    return `${value}${joiner}v=${Date.now()}`;
  };

  const resolveMediaCandidates = (rawUrl) => {
    const original = String(rawUrl || '').trim();
    if (!original) return [];
    const normalized = original.replace(/\\/g, '/');
    const apiBase = String(axios.defaults.baseURL || '').trim().replace(/\/+$/, '');
    const origin = window.location.origin.replace(/\/+$/, '');
    const candidates = [];

    const pushUnique = (value) => {
      const next = String(value || '').trim();
      if (!next) return;
      if (!candidates.includes(next)) candidates.push(next);
    };

    if (/^data:/i.test(normalized)) {
      pushUnique(normalized);
      return candidates;
    }

    if (/^https?:\/\//i.test(normalized)) {
      pushUnique(normalized);
      try {
        const parsed = new URL(normalized);
        if (parsed.pathname.includes('/uploads/')) {
          pushUnique(`${origin}${parsed.pathname}`);
          pushUnique(`${apiBase}${parsed.pathname}`);
        }
      } catch {
        // ignore parse failures
      }
    } else if (normalized.startsWith('/')) {
      pushUnique(`${origin}${normalized}`);
      pushUnique(`${apiBase}${normalized}`);
      if (!normalized.startsWith('/api/')) {
        pushUnique(`${origin}/api${normalized}`);
        pushUnique(`${apiBase}/api${normalized}`);
      }
      pushUnique(normalized);
    } else {
      pushUnique(`${origin}/${normalized}`);
      pushUnique(`${apiBase}/${normalized}`);
      pushUnique(normalized);
    }

    const uploadMatch = normalized.match(/(?:^|\/)uploads\/(.+)/i);
    if (uploadMatch?.[1]) {
      const suffix = uploadMatch[1].replace(/^\/+/, '');
      pushUnique(`${origin}/api/uploads/${suffix}`);
      pushUnique(`${apiBase}/api/uploads/${suffix}`);
    }

    return candidates;
  };

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
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to upload image');
    } finally {
      setAssetUploading('');
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setType('multiple-choice');
    setCategory('');
    setSubcategory('');
    setQuestionText('');
    setQuestionImageUrl('');
    setOptions(['', '', '', '']);
    setCorrectAnswer('');
    setRationale('');
    setRationaleImageUrl('');
    setDifficulty('medium');
    setHighlightStart(0);
    setHighlightEnd(0);
    setDragDropItems(['', '', '', '']);
    setMatrixColumns(['Column 1', 'Column 2', 'Column 3']);
    setMatrixRows([
      { rowText: '', correctColumn: 0 },
      { rowText: '', correctColumn: 0 },
      { rowText: '', correctColumn: 0 },
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
      correctColumn: Number(row.correctColumn || 0),
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
      if (
        Number.isNaN(cleanedRows[i].correctColumn) ||
        cleanedRows[i].correctColumn < 0 ||
        cleanedRows[i].correctColumn >= cleanedColumns.length
      ) {
        setError(`Matrix row ${i + 1} has an invalid correct column`);
        return null;
      }
    }

    questionData.matrixColumns = cleanedColumns;
    questionData.matrixRows = cleanedRows;
    questionData.correctAnswer = cleanedRows.map((r) => r.correctColumn);
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
      questionText,
      questionImageUrl,
      rationale,
      rationaleImageUrl,
      difficulty,
    };

    if (type === 'multiple-choice' || type === 'sata') {
      questionData.options = options.filter((opt) => opt.trim() !== '');

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
      questionData.correctAnswer = correctAnswer;
    } else if (type === 'drag-drop') {
      const items = dragDropItems.filter((item) => item.trim() !== '');
      if (items.length < 2) {
        setError('Please enter at least 2 items');
        setLoading(false);
        return;
      }
      questionData.options = items;
      questionData.correctAnswer = items.map((_, idx) => String.fromCharCode(65 + idx)).join(',');
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
            {QUESTION_TYPES.map((item) => (
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
            <label className="form-label">Main Category</label>
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

        {(category === 'Adult Health' || category === 'Child Health') && subcategory === 'Cardiovascular' && (
          <div className="form-group">
            <label className="form-label">ECG / Question Image (optional)</label>
            <input
              type="url"
              className="form-control mb-2"
              value={questionImageUrl}
              onChange={(e) => setQuestionImageUrl(e.target.value)}
              placeholder="https://.../ecg.png or /api/uploads/..."
            />
            <input type="file" className="form-control" accept="image/*" onChange={(e) => uploadAsset(e.target.files?.[0], 'question')} />
            {assetUploading === 'question' && <small className="text-muted">Uploading ECG image...</small>}
            {questionImageUrl && (
              <img
                src={firstMediaUrl(questionImageUrl)}
                data-raw-src={questionImageUrl}
                data-fallback-index="0"
                onError={handlePreviewImageFallback}
                alt="Question visual preview"
                style={{ marginTop: '10px', maxWidth: '320px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            )}
          </div>
        )}

        {(type === 'multiple-choice' || type === 'sata') && (
          <div className="form-group">
            <div className="upload-row-header">
              <label className="form-label">Answer Options</label>
              <button type="button" className="btn btn-sm btn-primary" onClick={addOption}>Add Option</button>
            </div>
            <div className="option-list">
              {options.map((opt, idx) => (
                <div key={idx} className="option-row">
                  <div className="option-index">{String.fromCharCode(65 + idx)}</div>
                  <input
                    type="text"
                    className="form-control option-input"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  />
                  {type === 'multiple-choice' && (
                    <label className="option-correct-toggle">
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
                    <label className="option-correct-toggle">
                      <input type="checkbox" name="sata-option" value={String.fromCharCode(65 + idx)} />
                      <span>Correct</span>
                    </label>
                  )}
                  {options.length > 2 && (
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => removeOption(idx)}>Remove</button>
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
              <label className="form-label">Text to Highlight</label>
              <textarea
                className="form-control highlight-textarea"
                rows="6"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <small className="text-muted">Enter the exact text fragment the student should highlight (no index numbers needed).</small>
            </div>
            <div className="form-group">
              <label className="form-label">Correct Answer (highlighted text)</label>
              <input
                type="text"
                className="form-control"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                placeholder="Enter what should be highlighted"
                required
              />
            </div>
          </>
        )}

        {type === 'drag-drop' && (
          <div className="form-group">
            <div className="upload-row-header">
              <label className="form-label">Drag & Drop Items (Ordered Response)</label>
              <button type="button" className="btn btn-sm btn-primary" onClick={() => setDragDropItems((prev) => [...prev, ''])}>Add Item</button>
            </div>
            <small className="text-muted d-block mb-3">Add items in the correct order. Students will drag to reorder.</small>
            <div className="option-list">
              {dragDropItems.map((item, idx) => (
                <div key={idx} className="option-row">
                  <div className="option-index">{String.fromCharCode(65 + idx)}</div>
                  <input
                    type="text"
                    className="form-control"
                    value={item}
                    onChange={(e) => handleDragDropChange(idx, e.target.value)}
                    placeholder={`Item ${String.fromCharCode(65 + idx)}`}
                  />
                  {dragDropItems.length > 2 && (
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => setDragDropItems((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                  )}
                </div>
              ))}
            </div>
            <div className="drag-preview-card">
              <div className="drag-preview-title">Preview of Student View</div>
              <div className="drag-preview-list">
                {dragPreviewItems.length === 0 ? (
                  <div className="drag-preview-item empty">Items will preview here</div>
                ) : (
                  dragPreviewItems.map((item, idx) => (
                    <div key={`${item}-${idx}`} className="drag-preview-item">{item}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {type === 'matrix' && (
          <div className="form-group">
            <div className="upload-row-header">
              <label className="form-label">Matrix Configuration</label>
            </div>

            <div className="form-group">
              <label className="form-label">Column Headers</label>
              <div className="option-list">
                {matrixColumns.map((col, idx) => (
                  <div key={idx} className="option-row">
                    <div className="option-index">{idx + 1}</div>
                    <input
                      type="text"
                      className="form-control"
                      value={col}
                      onChange={(e) => {
                        const next = [...matrixColumns];
                        next[idx] = e.target.value;
                        setMatrixColumns(next);
                      }}
                      placeholder={`Column ${idx + 1}`}
                    />
                    {matrixColumns.length > 2 && (
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => setMatrixColumns((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-sm btn-primary mt-2" onClick={() => setMatrixColumns((prev) => [...prev, `Column ${prev.length + 1}`])}>
                Add Column
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Rows and Correct Column</label>
              <div className="option-list">
                {matrixRows.map((row, rowIdx) => (
                  <div key={rowIdx} className="matrix-row-builder">
                    <div className="upload-grid-two">
                      <div>
                        <label className="form-label">Row {rowIdx + 1} Text</label>
                        <input
                          type="text"
                          className="form-control"
                          value={row.rowText}
                          onChange={(e) => {
                            const next = [...matrixRows];
                            next[rowIdx] = { ...next[rowIdx], rowText: e.target.value };
                            setMatrixRows(next);
                          }}
                          placeholder="Row text"
                        />
                      </div>
                      <div>
                        <label className="form-label">Correct Column</label>
                        <select
                          className="form-control"
                          value={row.correctColumn}
                          onChange={(e) => {
                            const next = [...matrixRows];
                            next[rowIdx] = { ...next[rowIdx], correctColumn: Number(e.target.value) };
                            setMatrixRows(next);
                          }}
                        >
                          {matrixColumns.map((col, colIdx) => (
                            <option key={colIdx} value={colIdx}>{col || `Column ${colIdx + 1}`}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {matrixRows.length > 1 && (
                      <button type="button" className="btn btn-sm btn-danger mt-2" onClick={() => setMatrixRows((prev) => prev.filter((_, i) => i !== rowIdx))}>
                        Remove Row
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary mt-2"
                onClick={() => setMatrixRows((prev) => [...prev, { rowText: '', correctColumn: 0 }])}
              >
                Add Row
              </button>
            </div>
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
            <label className="form-label">Cloze Template</label>
            <textarea
              className="form-control"
              rows="4"
              value={clozeTemplate}
              onChange={(e) => {
                setClozeTemplate(e.target.value);
                setQuestionText(e.target.value);
              }}
              placeholder="Example: The mitral valve is best heard at {{blank1}}."
            />
            <small className="text-muted d-block mt-2">
              Use placeholders like <code>{'{{blank1}}'}</code>, <code>{'{{blank2}}'}</code>.
            </small>

            <div className="upload-row-header mt-3">
              <label className="form-label mb-0">Blank Definitions</label>
              <button type="button" className="btn btn-sm btn-primary" onClick={addClozeBlank}>Add Blank</button>
            </div>

            <div className="option-list">
              {clozeBlanks.map((blank, idx) => (
                <div key={`blank-${idx}`} className="matrix-row-builder">
                  <div className="upload-grid-three">
                    <div>
                      <label className="form-label">Blank Key</label>
                      <input
                        type="text"
                        className="form-control"
                        value={blank.key}
                        onChange={(e) => updateClozeBlank(idx, 'key', e.target.value)}
                        placeholder={`blank${idx + 1}`}
                      />
                    </div>
                    <div>
                      <label className="form-label">Options (; separated)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={blank.optionsText}
                        onChange={(e) => updateClozeBlank(idx, 'optionsText', e.target.value)}
                        placeholder="left 5th ICS MCL; right 2nd ICS"
                      />
                    </div>
                    <div>
                      <label className="form-label">Correct Answer</label>
                      <input
                        type="text"
                        className="form-control"
                        value={blank.correctAnswer}
                        onChange={(e) => updateClozeBlank(idx, 'correctAnswer', e.target.value)}
                      />
                    </div>
                  </div>
                  {clozeBlanks.length > 1 && (
                    <button type="button" className="btn btn-sm btn-danger mt-2" onClick={() => removeClozeBlank(idx)}>
                      Remove Blank
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Rationale/Explanation</label>
          <textarea className="form-control" rows="3" value={rationale} onChange={(e) => setRationale(e.target.value)} required />
          <div className="mt-2">
            <label className="form-label">Rationale Image (optional)</label>
            <input type="url" className="form-control mb-2" value={rationaleImageUrl} onChange={(e) => setRationaleImageUrl(e.target.value)} placeholder="https://.../rationale.png or /api/uploads/..." />
            <input type="file" className="form-control" accept="image/*" onChange={(e) => uploadAsset(e.target.files?.[0], 'rationale')} />
            {assetUploading === 'rationale' && <small className="text-muted">Uploading image...</small>}
            {rationaleImageUrl && (
              <img
                src={firstMediaUrl(rationaleImageUrl)}
                data-raw-src={rationaleImageUrl}
                data-fallback-index="0"
                onError={handlePreviewImageFallback}
                alt="Rationale preview"
                style={{ marginTop: '10px', maxWidth: '260px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
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

        <div className="upload-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : editingQuestion ? 'Update Question' : 'Save Question'}
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
          <strong>CSV format recommended:</strong> First row headers: type, category, subcategory, questionText, options, correctAnswer, rationale, difficulty
          <br />- no row limit per import
          <br />- type: multiple-choice | sata | fill-blank | highlight | drag-drop | matrix | hotspot | cloze-dropdown
          <br />- options: semicolon-separated (e.g., A) Option1;B) Option2)
          <br />- correctAnswer: letters (e.g., A) or comma-separated for SATA
          <br />- hotspot: use hotspotImageUrl and hotspotTargets (JSON or id|label|x|y|radius;...)
          <br />- cloze-dropdown: use clozeTemplate and clozeBlanks (JSON or key|opt1/opt2|correct;;...)
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
