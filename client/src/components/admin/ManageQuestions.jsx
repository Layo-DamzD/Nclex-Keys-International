import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CATEGORIES } from '../../constants/Categories';
import RationaleContent from '../../utils/RationaleContent';

const ManageQuestions = ({ onSectionChange }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = JSON.parse(sessionStorage.getItem('adminUser') || '{}');
  const isSuperAdmin = String(user?.role || '').trim().toLowerCase() === 'superadmin';
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchTimerRef = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    type: '',
    uncategorized: searchParams.get('uncategorized') === 'true'
  });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, perPage: '25' });
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(-1);
  const [deleteModal, setDeleteModal] = useState({ open: false, questionId: null, bulk: false, count: 0 });
  const [duplicateScan, setDuplicateScan] = useState({ scanning: false, results: null, error: null, actionLoading: null });
  const [individualScanId, setIndividualScanId] = useState(null);
  const [mergeModal, setMergeModal] = useState({ open: false, original: null, match: null, fullOriginal: null, fullMatch: null, loading: false });

  const categories = ['__uncategorized__', '', ...Object.keys(CATEGORIES).filter((cat) => cat !== 'Standalone NGN' && cat !== 'Unfolding NGN')];
  const types = ['', 'multiple-choice', 'sata', 'fill-blank', 'highlight', 'drag-drop', 'matrix', 'hotspot', 'cloze-dropdown', 'case-study'];

  // Sync filters with URL search params (e.g. when clicking "Uncategorized" from AdminStats)
  useEffect(() => {
    const uncategorizedParam = searchParams.get('uncategorized') === 'true';
    if (uncategorizedParam && !filters.uncategorized) {
      setFilters((prev) => ({ ...prev, category: '', type: '', uncategorized: true }));
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  }, [searchParams]);

  useEffect(() => {
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, []);

  // Debounce search input (400ms)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 400);
  }, [searchInput]);

  useEffect(() => {
    fetchQuestions();
  }, [filters, pagination.page, pagination.perPage, debouncedSearch]);

  const fetchQuestions = async () => {
    setLoading(true);
    setFetchError('');

    try {
      const token = sessionStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: pagination.perPage,
        isDraft: 'false',
        ...(filters.uncategorized && { uncategorized: 'true' }),
        ...(!filters.uncategorized && filters.category && { category: filters.category }),
        ...(!filters.uncategorized && filters.type && { type: filters.type }),
        ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
      });

      const response = await axios.get(`/api/admin/questions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setQuestions(response.data?.questions || []);
      setSelectedQuestionIds([]);
      setPagination((prev) => ({
        ...prev,
        totalPages: Math.max(1, response.data?.totalPages || 1),
        total: response.data?.total || 0,
      }));
    } catch (error) {
      console.error('Error fetching questions:', error);
      setFetchError(error.response?.data?.message || 'Failed to load questions');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === 'category') {
      if (value === '__uncategorized__') {
        setFilters({ category: '', type: '', uncategorized: true });
        setSearchParams({ uncategorized: 'true' });
      } else {
        setFilters((prev) => ({ ...prev, category: value, uncategorized: false }));
        setSearchParams({});
      }
    } else {
      setFilters((prev) => ({ ...prev, [name]: value }));
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleDelete = (id) => {
    setDeleteModal({ open: true, questionId: id, bulk: false, count: 1 });
  };

  const confirmDelete = async () => {
    if (!deleteModal.open) return;
    try {
      const token = sessionStorage.getItem('adminToken');
      if (deleteModal.bulk) {
        const response = await axios.post('/api/admin/questions/bulk-delete',
          { ids: selectedQuestionIds },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const deletedCount = Number(response?.data?.deletedCount || 0);
        const requestedCount = Number(response?.data?.requestedCount || selectedQuestionIds.length);
        setSelectedQuestionIds([]);
        if (deletedCount < requestedCount) {
          alert(`Deleted ${deletedCount} of ${requestedCount} selected question(s).`);
        }
      } else {
        await axios.delete(`/api/admin/questions/${deleteModal.questionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      fetchQuestions();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleteModal({ open: false, questionId: null, bulk: false, count: 0 });
    }
  };

  const fetchFullQuestion = async (questionId) => {
    const token = sessionStorage.getItem('adminToken');
    const response = await axios.get(`/api/admin/questions/${questionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  };

  const handleEdit = async (question) => {
    if (question.type === 'case-study' && question.caseStudyId) {
      navigate('/admin/dashboard', {
        state: {
          section: 'case-studies',
          caseStudyId: question.caseStudyId
        }
      });
      if (onSectionChange) onSectionChange('case-studies');
      return;
    }

    try {
      const fullQuestion = await fetchFullQuestion(question._id);
      navigate('/admin/dashboard', {
        state: {
          section: 'upload',
          question: fullQuestion
        }
      });
      if (onSectionChange) {
        onSectionChange('upload');
      }
    } catch (error) {
      console.error('Error loading full question for edit:', error);
      alert(error.response?.data?.message || 'Failed to load full question details');
    }
  };

  const handleUploadClick = () => {
    navigate('/admin/dashboard', { 
      state: { section: 'upload' }
    });
    if (onSectionChange) {
      onSectionChange('upload');
    }
  };

  const handlePreview = async (questionId) => {
    try {
      setPreviewLoading(true);
      const index = questions.findIndex((q) => q._id === questionId);
      const fullQuestion = await fetchFullQuestion(questionId);
      if (!fullQuestion?._id) {
        alert('Unable to load full question for preview.');
        return;
      }
      setPreviewQuestion(fullQuestion);
      setPreviewIndex(index);
    } catch (error) {
      console.error('Error loading question preview:', error);
      alert(error.response?.data?.message || 'Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const navigatePreview = async (direction) => {
    if (previewLoading || previewIndex < 0) return;
    const nextIndex = previewIndex + direction;
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    const nextQuestion = questions[nextIndex];
    if (!nextQuestion?._id) return;
    await handlePreview(nextQuestion._id);
  };

  const toggleQuestionSelection = (questionId) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );
  };

  const allVisibleSelected = questions.length > 0 && questions.every((q) => selectedQuestionIds.includes(q._id));
  const toggleSelectAllVisible = () => {
    if (!questions.length) return;
    if (allVisibleSelected) {
      setSelectedQuestionIds((prev) => prev.filter((id) => !questions.some((q) => q._id === id)));
      return;
    }
    setSelectedQuestionIds((prev) => {
      const merged = new Set(prev);
      questions.forEach((q) => merged.add(q._id));
      return Array.from(merged);
    });
  };

  const handleBulkDelete = () => {
    if (!selectedQuestionIds.length) return;
    setDeleteModal({ open: true, questionId: null, bulk: true, count: selectedQuestionIds.length });
  };

  const handleScanDuplicates = async () => {
    if (!questions.length) return;
    setDuplicateScan({ scanning: true, results: null, error: null });
    try {
      const token = sessionStorage.getItem('adminToken');
      const duplicateResults = [];

      for (const q of questions) {
        try {
          const response = await axios.post('/api/admin/questions/check-duplicate',
            { questionText: q.questionText, excludeId: q._id },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (response.data.isDuplicate && response.data.matches.length > 0) {
            duplicateResults.push({
              question: q,
              matches: response.data.matches,
              topSimilarity: response.data.matches[0].similarity,
            });
          }
        } catch (err) {
          // Skip individual errors, continue scanning
          console.warn(`Duplicate check failed for question ${q._id}:`, err);
        }
      }

      setDuplicateScan({ scanning: false, results: duplicateResults, error: null });
    } catch (error) {
      setDuplicateScan({ scanning: false, results: null, error: 'Failed to scan for duplicates' });
    }
  };

  const handleCheckSingleDuplicate = async (question) => {
    setIndividualScanId(question._id);
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.post('/api/admin/questions/check-duplicate',
        { questionText: question.questionText, excludeId: question._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.isDuplicate && response.data.matches.length > 0) {
        setDuplicateScan(prev => ({
          ...prev,
          results: [
            ...(prev.results || []),
            { question, matches: response.data.matches, topSimilarity: response.data.matches[0].similarity }
          ]
        }));
      } else {
        alert(response.data.message || 'No similar questions found.');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to check duplicate');
    } finally {
      setIndividualScanId(null);
    }
  };

  // ─── Duplicate Action Handlers ───

  const handleDeleteDuplicateQuestion = async (questionId, resultIndex) => {
    const actionKey = `del-dup-${questionId}`;
    setDuplicateScan(prev => ({ ...prev, actionLoading: actionKey }));
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.delete(`/api/admin/questions/${questionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Remove the result from the list
      setDuplicateScan(prev => ({
        ...prev,
        results: (prev.results || []).filter((_, i) => i !== resultIndex),
      }));
      fetchQuestions();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete duplicate');
    } finally {
      setDuplicateScan(prev => ({ ...prev, actionLoading: null }));
    }
  };

  const handleDeleteOriginalQuestion = async (questionId, resultIndex) => {
    const actionKey = `del-orig-${questionId}`;
    setDuplicateScan(prev => ({ ...prev, actionLoading: actionKey }));
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.delete(`/api/admin/questions/${questionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDuplicateScan(prev => ({
        ...prev,
        results: (prev.results || []).filter((_, i) => i !== resultIndex),
      }));
      fetchQuestions();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete original');
    } finally {
      setDuplicateScan(prev => ({ ...prev, actionLoading: null }));
    }
  };

  const handleDismissDuplicate = (resultIndex) => {
    setDuplicateScan(prev => ({
      ...prev,
      results: (prev.results || []).filter((_, i) => i !== resultIndex),
    }));
  };

  const handleDeleteAllDuplicates = async () => {
    if (!duplicateScan.results?.length) return;
    if (!window.confirm(`Delete all ${duplicateScan.results.length} duplicate match(es)? This keeps the originals and removes the matched questions.`)) return;
    setDuplicateScan(prev => ({ ...prev, actionLoading: 'bulk-del-dups' }));
    try {
      const token = sessionStorage.getItem('adminToken');
      const idsToDelete = duplicateScan.results.flatMap(r => r.matches.map(m => m._id));
      if (idsToDelete.length === 0) {
        alert('No duplicate match IDs found to delete.');
        return;
      }
      await axios.post('/api/admin/questions/bulk-delete',
        { ids: idsToDelete },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDuplicateScan(prev => ({ ...prev, results: null }));
      fetchQuestions();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to bulk delete duplicates');
    } finally {
      setDuplicateScan(prev => ({ ...prev, actionLoading: null }));
    }
  };

  const handleOpenMergeModal = async (original, match) => {
    setMergeModal({ open: true, original, match, fullOriginal: null, fullMatch: null, loading: true });
    try {
      const token = sessionStorage.getItem('adminToken');
      const [origFull, matchFull] = await Promise.all([
        fetchFullQuestion(original._id),
        fetchFullQuestion(match._id),
      ]);
      setMergeModal(prev => ({ ...prev, fullOriginal: origFull, fullMatch: matchFull, loading: false }));
    } catch (error) {
      alert('Failed to load full question details for merge preview.');
      setMergeModal({ open: false, original: null, match: null, fullOriginal: null, fullMatch: null, loading: false });
    }
  };

  const handleMergeKeepOriginal = async () => {
    if (!mergeModal.match?._id) return;
    setMergeModal(prev => ({ ...prev, loading: true }));
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.delete(`/api/admin/questions/${mergeModal.match._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Remove from results
      setDuplicateScan(prev => ({
        ...prev,
        results: (prev.results || []).filter(r => r.question._id !== mergeModal.original._id),
      }));
      setMergeModal({ open: false, original: null, match: null, fullOriginal: null, fullMatch: null, loading: false });
      fetchQuestions();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete duplicate during merge');
      setMergeModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleMergeKeepMatch = async () => {
    if (!mergeModal.original?._id) return;
    setMergeModal(prev => ({ ...prev, loading: true }));
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.delete(`/api/admin/questions/${mergeModal.original._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDuplicateScan(prev => ({
        ...prev,
        results: (prev.results || []).filter(r => r.question._id !== mergeModal.original._id),
      }));
      setMergeModal({ open: false, original: null, match: null, fullOriginal: null, fullMatch: null, loading: false });
      fetchQuestions();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete original during merge');
      setMergeModal(prev => ({ ...prev, loading: false }));
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      'multiple-choice': 'MC',
      sata: 'SATA',
      'fill-blank': 'Fill',
      highlight: 'Highlight',
      'drag-drop': 'Drag',
      matrix: 'Matrix',
      hotspot: 'Hotspot',
      'cloze-dropdown': 'Cloze',
      'case-study': 'Case Study',
    };
    return labels[type] || type;
  };

  const getSuccessRate = (q) => {
    if (!q.timesUsed || q.timesUsed === 0) return '0%';
    const rate = ((q.correctAttempts || 0) / q.timesUsed) * 100;
    return `${Math.round(rate)}%`;
  };

  const getDifficultyBadge = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'badge-success';
      case 'medium':
        return 'badge-warning';
      case 'hard':
        return 'badge-danger';
      default:
        return 'badge-info';
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'multiple-choice':
        return 'badge-success';
      case 'sata':
        return 'badge-warning';
      case 'matrix':
        return 'badge-info';
      case 'case-study':
        return 'badge-primary';
      case 'hotspot':
      case 'cloze-dropdown':
        return 'badge-info';
      default:
        return 'badge-info';
    }
  };

  const cleanQuestionPrefix = (text) =>
    String(text || '')
      .replace(/^[\uFEFF"'`\s]*Q\s*[-#:.)]?\s*\d+\s*[:.)-]?\s*/i, '')
      .replace(/^[\uFEFF"'`\s]*\d+\s*[:.)-]\s*/i, '')
      .trim();

  const getOptionLetter = (index) => String.fromCharCode(65 + index);

  const formatAnswerForPreview = (q) => {
    if (!q) return '';
    if (q.type === 'multiple-choice') {
      const letter = String(q.correctAnswer || '').trim();
      if (!letter) return 'N/A';
      const idx = letter.charCodeAt(0) - 65;
      const optionText = Array.isArray(q.options) ? q.options[idx] : '';
      return optionText ? `${letter}. ${optionText}` : letter;
    }
    if (q.type === 'sata') {
      const values = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
      if (!values.length) return 'N/A';
      return values.join(', ');
    }
    if (q.type === 'cloze-dropdown' && q.correctAnswer && typeof q.correctAnswer === 'object') {
      return Object.entries(q.correctAnswer).map(([k, v]) => `${k}: ${v}`).join(' | ');
    }
    if (q.type === 'matrix' && Array.isArray(q.matrixRows) && Array.isArray(q.matrixColumns)) {
      return q.matrixRows
        .map((row) => `${row.rowText}: ${q.matrixColumns[row.correctColumn] || row.correctColumn}`)
        .join(' | ');
    }
    return Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer || 'N/A');
  };

  // ─── Test-like question renderer for preview ───
  const renderTestLikePreview = (q) => {
    if (!q) return null;
    const isCorrectOption = (type, idx) => {
      if (type === 'multiple-choice') {
        const letter = getOptionLetter(idx);
        return String(q.correctAnswer || '').trim() === letter;
      }
      if (type === 'sata') {
        const letter = getOptionLetter(idx);
        return Array.isArray(q.correctAnswer) && q.correctAnswer.includes(letter);
      }
      return false;
    };

    return (
      <div style={{ maxWidth: '100%' }}>
        {/* Question meta */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <span className={`badge ${getTypeBadge(q.type)}`} style={{ fontSize: '0.75rem' }}>{getTypeLabel(q.type)}</span>
          <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem' }}>{q.category}</span>
          <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem' }}>{q.subcategory}</span>
          <span className={`badge ${getDifficultyBadge(q.difficulty)}`} style={{ fontSize: '0.75rem' }}>{q.difficulty}</span>
        </div>

        {/* Question text */}
        <div style={{
          fontSize: '1rem', fontWeight: 500, lineHeight: 1.7, marginBottom: '20px',
          color: '#1e293b', whiteSpace: 'pre-line',
        }}>
          {cleanQuestionPrefix(q.questionText)}
          {q.questionImageUrl && (
            <div style={{ marginTop: '12px' }}>
              <img src={q.questionImageUrl} alt="Question" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            </div>
          )}
        </div>

        {/* Options - MC and SATA */}
        {(q.type === 'multiple-choice' || q.type === 'sata') && Array.isArray(q.options) && q.options.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {q.options.map((opt, idx) => {
              const letter = getOptionLetter(idx);
              const correct = isCorrectOption(q.type, idx);
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    padding: '12px 16px', borderRadius: '10px',
                    border: `2px solid ${correct ? '#22c55e' : '#e2e8f0'}`,
                    background: correct ? '#f0fdf4' : '#fff',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                    display: 'grid', placeItems: 'center',
                    background: correct ? '#22c55e' : '#f1f5f9',
                    color: correct ? '#fff' : '#64748b',
                    fontWeight: 700, fontSize: '0.85rem',
                    border: correct ? 'none' : '2px solid #cbd5e1',
                  }}>
                    {letter}
                  </div>
                  <div style={{ flex: 1, paddingTop: '4px', fontSize: '0.92rem', color: '#334155', lineHeight: 1.5 }}>
                    {opt}
                  </div>
                  {correct && (
                    <i className="fas fa-check-circle" style={{ color: '#22c55e', fontSize: '1.1rem', marginTop: '4px', flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
            {q.type === 'sata' && (
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', marginTop: '-4px' }}>
                Select All That Apply — {Array.isArray(q.correctAnswer) ? q.correctAnswer.length : 0} correct option(s)
              </div>
            )}
          </div>
        )}

        {/* Fill-blank */}
        {q.type === 'fill-blank' && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'inline-block', padding: '10px 16px', borderRadius: '8px',
              border: '2px solid #e2e8f0', background: '#f8fafc',
              fontSize: '0.95rem', color: '#334155', minWidth: '200px',
            }}>
              {q.correctAnswer || 'N/A'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
              Correct answer: <strong>{q.correctAnswer || 'N/A'}</strong>
            </div>
          </div>
        )}

        {/* Matrix */}
        {q.type === 'matrix' && Array.isArray(q.matrixRows) && Array.isArray(q.matrixColumns) && (
          <div style={{ marginBottom: '20px', overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>Row</th>
                  {q.matrixColumns.map((col, ci) => (
                    <th key={ci} style={{ padding: '10px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600 }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {q.matrixRows.map((row, ri) => (
                  <tr key={ri}>
                    <td style={{ padding: '10px 14px', border: '1px solid #e2e8f0', fontWeight: 500, fontSize: '0.9rem' }}>{row.rowText}</td>
                    {q.matrixColumns.map((_, ci) => {
                      const correctCols = Array.isArray(row.correctColumns) && row.correctColumns.length > 0
                        ? row.correctColumns : (row.correctColumn !== undefined ? [row.correctColumn] : []);
                      const isCorrect = correctCols.includes(ci);
                      return (
                        <td key={ci} style={{
                          padding: '10px 14px', border: '1px solid #e2e8f0', textAlign: 'center',
                          background: isCorrect ? '#dcfce7' : '#fff',
                        }}>
                          {isCorrect && <i className="fas fa-check" style={{ color: '#22c55e', fontWeight: 700 }} />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Hotspot */}
        {q.type === 'hotspot' && q.hotspotImageUrl && (
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={q.hotspotImageUrl} alt="Hotspot" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              {Array.isArray(q.hotspotTargets) && q.hotspotTargets.map((t, i) => {
                const isCorrect = String(q.correctAnswer || '').trim() === String(t.id || '').trim();
                return (
                  <div key={i} style={{
                    position: 'absolute', left: `${t.x}%`, top: `${t.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${t.radius * 2}%`, height: `${t.radius * 2}%`,
                    borderRadius: '50%',
                    border: `3px solid ${isCorrect ? '#22c55e' : '#94a3b8'}`,
                    background: isCorrect ? 'rgba(34,197,94,0.25)' : 'rgba(148,163,184,0.15)',
                  }} title={`${t.label || t.id}${isCorrect ? ' (Correct)' : ''}`} />
                );
              })}
            </div>
          </div>
        )}

        {/* Cloze dropdown */}
        {q.type === 'cloze-dropdown' && q.clozeTemplate && (
          <div style={{ marginBottom: '20px', fontSize: '1rem', lineHeight: 1.8, color: '#334155' }}>
            {q.clozeTemplate.split(/(\{\{[^}]+\}\})/).map((part, i) => {
              const match = part.match(/^\{\{(.+?)\}\}$/);
              if (match) {
                const key = match[1];
                const answer = q.correctAnswer?.[key] || '?';
                return (
                  <span key={i} style={{
                    display: 'inline-block', padding: '2px 10px', margin: '0 2px',
                    background: '#dcfce7', border: '1px solid #22c55e', borderRadius: '6px',
                    fontWeight: 600, color: '#166534', fontSize: '0.9rem',
                  }}>
                    {answer}
                  </span>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </div>
        )}

        {/* Drag-drop */}
        {q.type === 'drag-drop' && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>Correct Order:</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(String(q.correctAnswer || '').split('|').filter(Boolean)).map((item, i) => (
                <span key={i} style={{
                  padding: '8px 14px', background: '#eff6ff', border: '1px solid #93c5fd',
                  borderRadius: '8px', fontSize: '0.88rem', color: '#1e40af', fontWeight: 500,
                }}>
                  {i + 1}. {item.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Highlight */}
        {q.type === 'highlight' && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>Highlight Answer:</div>
            <div style={{
              padding: '12px 16px', background: '#fffbeb', border: '1px solid #fcd34d',
              borderRadius: '8px', fontSize: '0.9rem', color: '#92400e',
            }}>
              {q.correctAnswer || 'N/A'}
            </div>
          </div>
        )}

        {/* Rationale */}
        <div style={{
          marginTop: '20px', padding: '16px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
          border: '1px solid #bfdbfe',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e40af', marginBottom: '6px' }}>
            <i className="fas fa-lightbulb me-1" style={{ color: '#f59e0b' }}></i> Rationale
          </div>
          <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
            <RationaleContent text={q.rationale} />
          </div>
          {q.rationaleImageUrl && (
            <div style={{ marginTop: '10px' }}>
              <img src={q.rationaleImageUrl} alt="Rationale" style={{ maxWidth: '100%', borderRadius: '6px' }} />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="text-center py-5">Loading questions...</div>;

  return (
    <div className="manage-questions">
      <div className="header" style={{ marginBottom: '20px' }}>
        <h1>Manage Questions</h1>
        <div className="manage-questions-filter-row" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 'min(280px, 100%)' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by text or question ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ paddingLeft: '36px', width: '100%' }}
            />
            {searchInput && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setSearchInput('');
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#94a3b8', padding: '2px 6px', cursor: 'pointer', fontSize: '0.8rem',
                }}
                aria-label="Clear search"
              >
                <i className="fas fa-times" />
              </button>
            )}
          </div>
          <select
            name="category"
            value={filters.uncategorized ? '__uncategorized__' : filters.category}
            onChange={handleFilterChange}
            className="form-control manage-questions-filter-control"
            style={{ width: 'min(220px, 100%)' }}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === '__uncategorized__' ? '⚠️ Uncategorized' : (cat || 'All Categories')}
              </option>
            ))}
          </select>

          <select
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            className="form-control manage-questions-filter-control"
            style={{ width: 'min(180px, 100%)' }}
          >
            {types.map((type) => (
              <option key={type} value={type}>
                {type || 'All Types'}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn btn-danger"
            disabled={!selectedQuestionIds.length}
            onClick={handleBulkDelete}
          >
            Delete Selected ({selectedQuestionIds.length})
          </button>
          <button
            type="button"
            className="btn btn-outline-warning"
            disabled={duplicateScan.scanning || questions.length === 0}
            onClick={handleScanDuplicates}
          >
            <i className="fas fa-copy me-1"></i>
            {duplicateScan.scanning ? 'Scanning...' : 'Scan Duplicates'}
          </button>
        </div>
      </div>

      {filters.uncategorized && (
        <div
          style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '10px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <span style={{ color: '#92400e', fontWeight: 500 }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px', color: '#f59e0b' }}></i>
            Showing only uncategorized questions ({pagination.total} found)
          </span>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setFilters({ category: '', type: '', uncategorized: false });
              setSearchParams({});
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            type="button"
          >
            Clear Filter
          </button>
        </div>
      )}

      {duplicateScan.results && duplicateScan.results.length > 0 && (
        <div style={{
          background: '#fffbeb',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 4px 16px rgba(245, 158, 11, 0.12)',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
            <h6 style={{ margin: 0, color: '#92400e', fontWeight: 700, fontSize: '1rem' }}>
              <i className="fas fa-clone me-2" style={{ color: '#f59e0b' }}></i>
              Found {duplicateScan.results.length} Potential Duplicate(s)
            </h6>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-sm btn-danger"
                disabled={duplicateScan.actionLoading === 'bulk-del-dups'}
                onClick={handleDeleteAllDuplicates}
                title="Delete all matched duplicates (keeps originals)"
                type="button"
              >
                {duplicateScan.actionLoading === 'bulk-del-dups' ? 'Deleting...' : 'Delete All Duplicates'}
              </button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setDuplicateScan({ scanning: false, results: null, error: null, actionLoading: null })} type="button">
                Clear All
              </button>
            </div>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#a16207' }}>
            Review each pair below. You can delete the duplicate, delete the original, merge them, or dismiss false positives.
          </p>

          {/* Duplicate result cards */}
          {duplicateScan.results.map((result, idx) => (
            <div key={result.question._id} style={{
              background: '#fff',
              border: '1px solid #fde68a',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: idx < duplicateScan.results.length - 1 ? '12px' : 0,
              fontSize: '0.85rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              {/* Original question row */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                <div style={{
                  minWidth: '40px', height: '40px', borderRadius: '8px', background: '#dbeafe',
                  color: '#1e40af', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0,
                }}>ORIG</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '2px', lineHeight: 1.45 }}>
                    {result.question.questionText.length > 120 ? result.question.questionText.substring(0, 120) + '...' : result.question.questionText}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '0.7rem' }}>{result.question.type || 'N/A'}</span>
                    <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem' }}>{result.question.category || 'N/A'}</span>
                    <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem' }}>ID: {result.question._id?.substring(0, 8)}</span>
                  </div>
                </div>
              </div>

              {/* Match rows */}
              {result.matches.map((match, mIdx) => (
                <div key={match._id} style={{
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                  marginLeft: '10px', paddingLeft: '12px',
                  borderLeft: '3px solid #f59e0b',
                  padding: '10px 0',
                }}>
                  <div style={{
                    minWidth: '40px', height: '40px', borderRadius: '8px', background: '#fef3c7',
                    color: '#92400e', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '0.7rem', flexShrink: 0,
                  }}>{match.similarity}%</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: '#475569', marginBottom: '2px', lineHeight: 1.45 }}>
                      {match.questionText.length > 120 ? match.questionText.substring(0, 120) + '...' : match.questionText}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem' }}>{match.type || 'N/A'}</span>
                      <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem' }}>{match.category || 'N/A'}</span>
                      <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem' }}>ID: {match._id?.substring(0, 8)}</span>
                    </div>

                    {/* Action buttons for this match */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-sm"
                        style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.78rem', padding: '4px 10px' }}
                        disabled={duplicateScan.actionLoading === `del-dup-${match._id}`}
                        onClick={() => handleDeleteDuplicateQuestion(match._id, idx)}
                        title="Delete this matched question (keep the original)"
                        type="button"
                      >
                        {duplicateScan.actionLoading === `del-dup-${match._id}` ? '...' : <><i className="fas fa-trash-alt me-1"></i>Delete Duplicate</>}
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.78rem', padding: '4px 10px' }}
                        disabled={duplicateScan.actionLoading === `del-orig-${result.question._id}`}
                        onClick={() => handleDeleteOriginalQuestion(result.question._id, idx)}
                        title="Delete the original question (keep this match)"
                        type="button"
                      >
                        {duplicateScan.actionLoading === `del-orig-${result.question._id}` ? '...' : <><i className="fas fa-exchange-alt me-1"></i>Keep Match Instead</>}
                      </button>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        style={{ borderRadius: '6px', fontSize: '0.78rem', padding: '4px 10px' }}
                        onClick={() => handleOpenMergeModal(result.question, match)}
                        title="Compare both questions side-by-side"
                        type="button"
                      >
                        <i className="fas fa-columns me-1"></i>Compare & Merge
                      </button>
                      <button
                        className="btn btn-sm btn-outline-success"
                        style={{ borderRadius: '6px', fontSize: '0.78rem', padding: '4px 10px' }}
                        onClick={() => handleDismissDuplicate(idx)}
                        title="Not a duplicate, remove from results"
                        type="button"
                      >
                        <i className="fas fa-check me-1"></i>Keep Both
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {duplicateScan.results && duplicateScan.results.length === 0 && !duplicateScan.scanning && (
        <div style={{
          background: '#d1fae5',
          border: '1px solid #10b981',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          color: '#065f46',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <i className="fas fa-check-circle"></i>
          No duplicates found among the {questions.length} visible question(s).
          <button className="btn btn-sm btn-outline-secondary ms-auto" onClick={() => setDuplicateScan({ scanning: false, results: null, error: null })} type="button">Dismiss</button>
        </div>
      )}

      {duplicateScan.error && (
        <div className="alert alert-warning">{duplicateScan.error}</div>
      )}

      {fetchError && <div className="alert alert-danger">{fetchError}</div>}

      <div className="data-table-container">
        <table className="data-table">
          <colgroup>
            <col className="col-select" />
            <col className="col-id" />
            <col className="col-question" />
            <col className="col-type" />
            <col className="col-category" />
            <col className="col-subcategory" />
            <col className="col-difficulty" />
            <col className="col-times" />
            <col className="col-success" />
            <col className="col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  aria-label="Select all visible questions"
                />
              </th>
              <th>ID</th>
              <th>Question</th>
              <th>Type</th>
              <th>Category</th>
              <th>Subcategory</th>
              <th>Difficulty</th>
              <th>Times Used</th>
              <th>Success Rate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q._id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedQuestionIds.includes(q._id)}
                    onChange={() => toggleQuestionSelection(q._id)}
                    aria-label={`Select question ${q._id}`}
                  />
                </td>
                <td className="mq-id-cell">
                  <span className="mq-id-text">{q._id?.substring(0, 8)}</span>
                </td>
                <td className="mq-question-cell">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {q.isDraft && (
                      <span 
                        className="badge" 
                        style={{ 
                          background: '#fef3c7', 
                          color: '#92400e', 
                          fontSize: '10px', 
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          flexShrink: 0
                        }}
                      >
                        DRAFT
                      </span>
                    )}
                    <span>
                      {(() => {
                        const cleanText = cleanQuestionPrefix(q.questionText);
                        return cleanText.length > 70 ? `${cleanText.substring(0, 70)}...` : cleanText;
                      })()}
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${getTypeBadge(q.type)}`}>
                    {getTypeLabel(q.type)}
                  </span>
                </td>
                <td className="mq-category-cell">{q.category}</td>
                <td>
                  <span className="mq-subcategory-text">{q.subcategory}</span>
                </td>
                <td>
                  <span className={`badge ${getDifficultyBadge(q.difficulty)}`}>
                    {q.difficulty}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: q.timesUsed > 0 ? '#1e40af' : '#64748b' }}>
                  {q.timesUsed || 0}
                </td>
                <td
                  style={{
                    fontWeight: 600,
                    color:
                      (q.timesUsed || 0) > 0
                        ? parseInt(getSuccessRate(q), 10) >= 70
                          ? '#065f46'
                          : parseInt(getSuccessRate(q), 10) >= 50
                            ? '#92400e'
                            : '#991b1b'
                        : '#64748b',
                  }}
                >
                  {getSuccessRate(q)}
                </td>
                <td className="mq-actions-cell">
                  <button
                    className="btn btn-sm btn-outline-info"
                    style={{ marginRight: '4px', fontSize: '0.75rem', padding: '2px 6px' }}
                    onClick={() => handleCheckSingleDuplicate(q)}
                    disabled={individualScanId === q._id || duplicateScan.scanning}
                    title="Check for duplicates"
                    type="button"
                  >
                    {individualScanId === q._id ? '...' : <i className="fas fa-copy"></i>}
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ marginRight: '8px' }}
                    onClick={() => handlePreview(q._id)}
                    type="button"
                    disabled={previewLoading}
                  >
                    {previewLoading ? 'Loading...' : 'Preview'}
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    style={{ marginRight: '8px' }}
                    onClick={() => handleEdit(q)}
                    type="button"
                  >
                    Edit
                  </button>
                  {isSuperAdmin && (
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(q._id)} type="button">
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!fetchError && questions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 40px', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>
            <i className="fas fa-file-alt" aria-hidden="true"></i>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '10px' }}>No questions found</div>
          <div style={{ marginBottom: '25px' }}>Try adjusting your filters or upload a new question.</div>
          <button className="btn btn-primary" type="button" onClick={handleUploadClick}>
            <i className="fas fa-upload" aria-hidden="true"></i> Upload First Question
          </button>
        </div>
      )}

      {(pagination.totalPages > 1 || pagination.total > 0) && (
        <div
          className="pagination"
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}
        >
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
            <span>Questions per page:</span>
            <select
              className="form-control form-control-sm"
              value={pagination.perPage}
              onChange={(e) =>
                setPagination((prev) => ({
                  ...prev,
                  page: 1,
                  perPage: e.target.value
                }))
              }
              style={{ width: 'auto' }}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="75">75</option>
              <option value="100">100</option>
              <option value="all">All</option>
            </select>
          </label>
          <button
            className="btn btn-sm btn-outline-primary"
            disabled={pagination.perPage === 'all' || pagination.page === 1}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            type="button"
          >
            Previous
          </button>
          <span style={{ padding: '5px 10px' }}>
            {pagination.perPage === 'all'
              ? `Showing all ${pagination.total} question(s)`
              : `Page ${pagination.page} of ${pagination.totalPages}`}
          </span>
          <button
            className="btn btn-sm btn-outline-primary"
            disabled={pagination.perPage === 'all' || pagination.page === pagination.totalPages}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            type="button"
          >
            Next
          </button>
        </div>
      )}

      {previewQuestion && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ background: 'rgba(2,6,23,0.6)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered" style={{ maxWidth: '800px' }}>
            <div className="modal-content" style={{ borderRadius: '16px', border: 'none', overflow: 'hidden' }}>
              <div className="modal-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '14px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <h5 className="modal-title" style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#334155' }}>
                    <i className="fas fa-eye me-2" style={{ color: '#6366f1' }}></i>
                    Question Preview
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 400, marginLeft: '8px' }}>
                      ({previewIndex + 1} of {questions.length})
                    </span>
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => {
                      setPreviewQuestion(null);
                      setPreviewIndex(-1);
                    }}
                  />
                </div>
              </div>
              <div className="modal-body" style={{ padding: '24px', maxHeight: '65vh', overflowY: 'auto' }}>
                {renderTestLikePreview(previewQuestion)}
              </div>
              <div className="modal-footer d-flex justify-content-between align-items-center w-100" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '12px 20px' }}>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => navigatePreview(-1)}
                    disabled={previewLoading || previewIndex <= 0}
                  >
                    <i className="fas fa-chevron-left me-1"></i> Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => navigatePreview(1)}
                    disabled={previewLoading || previewIndex < 0 || previewIndex >= questions.length - 1}
                  >
                    Next <i className="fas fa-chevron-right ms-1"></i>
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-warning btn-sm"
                  onClick={() => {
                    const q = previewQuestion;
                    setPreviewQuestion(null);
                    setPreviewIndex(-1);
                    handleEdit(q);
                  }}
                >
                  <i className="fas fa-pen me-1"></i> Edit Question
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge / Compare Modal */}
      {mergeModal.open && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ background: 'rgba(2,6,23,0.6)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content" style={{ borderRadius: '16px', border: 'none', overflow: 'hidden' }}>
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderBottom: 'none' }}>
                <h5 className="modal-title" style={{ fontWeight: 700, color: '#78350f' }}>
                  <i className="fas fa-columns me-2"></i>Compare & Merge Duplicates
                </h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setMergeModal({ open: false, original: null, match: null, fullOriginal: null, fullMatch: null, loading: false })} />
              </div>
              <div className="modal-body" style={{ padding: 0 }}>
                {mergeModal.loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-warning" role="status"><span className="visually-hidden">Loading...</span></div>
                    <p className="mt-2 text-muted">Loading full question details...</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    {/* Original Column */}
                    <div style={{ padding: '20px', borderRight: '2px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem' }}>ORIGINAL</span>
                        <span style={{ color: '#64748b', fontSize: '0.78rem' }}>ID: {mergeModal.original?._id?.substring(0, 12)}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem' }}>
                        <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                          <strong>Question:</strong> {cleanQuestionPrefix(mergeModal.fullOriginal?.questionText || mergeModal.original?.questionText || '')}
                        </p>
                        <p style={{ marginBottom: '4px' }}><strong>Type:</strong> <span className="badge bg-primary">{mergeModal.fullOriginal?.type || mergeModal.original?.type || 'N/A'}</span></p>
                        <p style={{ marginBottom: '4px' }}><strong>Category:</strong> {mergeModal.fullOriginal?.category || 'N/A'} / {mergeModal.fullOriginal?.subcategory || 'N/A'}</p>
                        <p style={{ marginBottom: '4px' }}><strong>Difficulty:</strong> <span className="badge bg-secondary">{mergeModal.fullOriginal?.difficulty || 'N/A'}</span></p>
                        {Array.isArray(mergeModal.fullOriginal?.options) && mergeModal.fullOriginal.options.length > 0 && (
                          <div style={{ marginTop: '8px' }}>
                            <strong>Options:</strong>
                            <ol type="A" style={{ paddingLeft: '20px', marginTop: '4px' }}>
                              {mergeModal.fullOriginal.options.map((opt, i) => (
                                <li key={i} style={{
                                  marginBottom: '3px',
                                  fontWeight: mergeModal.fullOriginal.correctAnswer === String.fromCharCode(65 + i) ? 700 : 400,
                                  color: mergeModal.fullOriginal.correctAnswer === String.fromCharCode(65 + i) ? '#059669' : '#475569',
                                }}>
                                  {opt} {mergeModal.fullOriginal.correctAnswer === String.fromCharCode(65 + i) && <i className="fas fa-check ms-1" style={{ color: '#059669' }}></i>}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                        <p style={{ marginTop: '8px' }}><strong>Answer:</strong> {formatAnswerForPreview(mergeModal.fullOriginal)}</p>
                        <p style={{ whiteSpace: 'pre-line', marginTop: '8px' }}><strong>Rationale:</strong> {mergeModal.fullOriginal?.rationale || 'N/A'}</p>
                        {mergeModal.fullOriginal?.timesUsed !== undefined && (
                          <p style={{ marginTop: '8px', color: '#64748b', fontSize: '0.82rem' }}>
                            <i className="fas fa-chart-bar me-1"></i>Used {mergeModal.fullOriginal.timesUsed} time(s) &middot; {getSuccessRate(mergeModal.fullOriginal)} success rate
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Match Column */}
                    <div style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem' }}>MATCH</span>
                        <span style={{ color: '#64748b', fontSize: '0.78rem' }}>ID: {mergeModal.match?._id?.substring(0, 12)}</span>
                        <span className="badge bg-warning text-dark" style={{ fontSize: '0.7rem' }}>{mergeModal.match?.similarity}% similar</span>
                      </div>
                      <div style={{ fontSize: '0.85rem' }}>
                        <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                          <strong>Question:</strong> {cleanQuestionPrefix(mergeModal.fullMatch?.questionText || mergeModal.match?.questionText || '')}
                        </p>
                        <p style={{ marginBottom: '4px' }}><strong>Type:</strong> <span className="badge bg-primary">{mergeModal.fullMatch?.type || mergeModal.match?.type || 'N/A'}</span></p>
                        <p style={{ marginBottom: '4px' }}><strong>Category:</strong> {mergeModal.fullMatch?.category || mergeModal.match?.category || 'N/A'} / {mergeModal.fullMatch?.subcategory || mergeModal.match?.subcategory || 'N/A'}</p>
                        <p style={{ marginBottom: '4px' }}><strong>Difficulty:</strong> <span className="badge bg-secondary">{mergeModal.fullMatch?.difficulty || mergeModal.match?.difficulty || 'N/A'}</span></p>
                        {Array.isArray(mergeModal.fullMatch?.options) && mergeModal.fullMatch.options.length > 0 && (
                          <div style={{ marginTop: '8px' }}>
                            <strong>Options:</strong>
                            <ol type="A" style={{ paddingLeft: '20px', marginTop: '4px' }}>
                              {mergeModal.fullMatch.options.map((opt, i) => (
                                <li key={i} style={{
                                  marginBottom: '3px',
                                  fontWeight: mergeModal.fullMatch.correctAnswer === String.fromCharCode(65 + i) ? 700 : 400,
                                  color: mergeModal.fullMatch.correctAnswer === String.fromCharCode(65 + i) ? '#059669' : '#475569',
                                }}>
                                  {opt} {mergeModal.fullMatch.correctAnswer === String.fromCharCode(65 + i) && <i className="fas fa-check ms-1" style={{ color: '#059669' }}></i>}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                        <p style={{ marginTop: '8px' }}><strong>Answer:</strong> {formatAnswerForPreview(mergeModal.fullMatch)}</p>
                        <p style={{ whiteSpace: 'pre-line', marginTop: '8px' }}><strong>Rationale:</strong> {mergeModal.fullMatch?.rationale || 'N/A'}</p>
                        {mergeModal.fullMatch?.timesUsed !== undefined && (
                          <p style={{ marginTop: '8px', color: '#64748b', fontSize: '0.82rem' }}>
                            <i className="fas fa-chart-bar me-1"></i>Used {mergeModal.fullMatch.timesUsed} time(s) &middot; {getSuccessRate(mergeModal.fullMatch)} success rate
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setMergeModal({ open: false, original: null, match: null, fullOriginal: null, fullMatch: null, loading: false })}
                >
                  Cancel
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, padding: '8px 16px' }}
                    disabled={mergeModal.loading}
                    onClick={handleMergeKeepOriginal}
                    title="Keep the original question and delete this match"
                  >
                    <i className="fas fa-check me-1"></i>Keep Original
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, padding: '8px 16px' }}
                    disabled={mergeModal.loading}
                    onClick={handleMergeKeepMatch}
                    title="Keep the matched question and delete the original"
                  >
                    <i className="fas fa-exchange-alt me-1"></i>Keep Match
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ background: 'rgba(2,6,23,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
            <div className="modal-content" style={{ borderRadius: '16px', border: 'none', overflow: 'hidden' }}>
              <div style={{
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                padding: '24px 24px 16px',
                textAlign: 'center',
              }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <i className="fas fa-exclamation-triangle" style={{ fontSize: '28px', color: '#dc2626' }}></i>
                </div>
                <h5 style={{ margin: '0 0 4px', fontWeight: 700, color: '#991b1b' }}>Confirm Deletion</h5>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#7f1d1d' }}>
                  {deleteModal.bulk
                    ? `You are about to permanently delete ${deleteModal.count} question(s). This action cannot be undone.`
                    : 'You are about to permanently delete this question. This action cannot be undone.'}
                </p>
              </div>
              <div style={{ padding: '20px 24px 24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn"
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontWeight: 600,
                    padding: '10px',
                  }}
                  onClick={() => setDeleteModal({ open: false, questionId: null, bulk: false, count: 0 })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    flex: 1,
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 600,
                    padding: '10px',
                  }}
                  onClick={confirmDelete}
                >
                  <i className="fas fa-trash-alt" style={{ marginRight: '6px' }}></i>
                  Delete {deleteModal.bulk ? `(${deleteModal.count})` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageQuestions;
