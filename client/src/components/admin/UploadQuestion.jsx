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
];

const UploadQuestion = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const editingQuestion = location.state?.question;

  const [type, setType] = useState('multiple-choice');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [rationale, setRationale] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [highlightStart, setHighlightStart] = useState(0);
  const [highlightEnd, setHighlightEnd] = useState(0);
  const [dragDropItems, setDragDropItems] = useState(['', '', '', '']);
  const [matrixColumns, setMatrixColumns] = useState(['Column 1', 'Column 2', 'Column 3']);
  const [matrixRows, setMatrixRows] = useState([
    { rowText: '', correctColumn: 0 },
    { rowText: '', correctColumn: 0 },
    { rowText: '', correctColumn: 0 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');

  useEffect(() => {
    if (!editingQuestion) return;

    setType(editingQuestion.type || 'multiple-choice');
    setCategory(editingQuestion.category || '');
    setSubcategory(editingQuestion.subcategory || '');
    setQuestionText(editingQuestion.questionText || '');
    setOptions(editingQuestion.options || ['', '', '', '']);
    setCorrectAnswer(editingQuestion.correctAnswer || '');
    setRationale(editingQuestion.rationale || '');
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
  }, [editingQuestion]);

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
  const removeOption = (index) => {
    if (options.length > 2) setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setType('multiple-choice');
    setCategory('');
    setSubcategory('');
    setQuestionText('');
    setOptions(['', '', '', '']);
    setCorrectAnswer('');
    setRationale('');
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
    setError('');
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
      setBulkStatus(`Imported ${response.data.imported} questions. ${response.data.errors} errors.`);
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
      rationale,
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
      questionData.highlightStart = highlightStart;
      questionData.highlightEnd = highlightEnd;
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
            placeholder="Enter the question or clinical scenario..."
            required
          />
        </div>

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
            <div className="upload-grid-two">
              <div className="form-group">
                <label className="form-label">Highlight Start Index</label>
                <input
                  type="number"
                  className="form-control"
                  value={highlightStart}
                  onChange={(e) => setHighlightStart(Number(e.target.value))}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Highlight End Index</label>
                <input
                  type="number"
                  className="form-control"
                  value={highlightEnd}
                  onChange={(e) => setHighlightEnd(Number(e.target.value))}
                  min="0"
                />
              </div>
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

        <div className="form-group">
          <label className="form-label">Rationale/Explanation</label>
          <textarea className="form-control" rows="3" value={rationale} onChange={(e) => setRationale(e.target.value)} required />
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
          <br />- type: multiple-choice | sata | fill-blank | highlight | drag-drop | matrix
          <br />- options: semicolon-separated (e.g., A) Option1;B) Option2)
          <br />- correctAnswer: letters (e.g., A) or comma-separated for SATA
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
