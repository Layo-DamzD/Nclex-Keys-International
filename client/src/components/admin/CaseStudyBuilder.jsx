import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams, useBlocker } from 'react-router-dom';
import axios from 'axios';
import { CATEGORIES } from '../../constants/Categories';
import bowtiePreviewImage from '../../assets/exam-previews/bowtie-preview.svg';
import caseStudyPreviewImage from '../../assets/exam-previews/case-study-preview.svg';

const CASE_STUDY_TYPES = [
  { value: '6-question', label: 'Layered Case Study' },
  { value: 'bowtie', label: 'Bowtie' },
  { value: 'trend', label: 'Trend' },
];

const QUESTION_TYPES = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'sata', label: 'SATA (Select All That Apply)' },
  { value: 'fill-blank', label: 'Fill in the Blank' },
  { value: 'highlight', label: 'Highlight' },
  { value: 'drag-drop', label: 'Drag & Drop (Ordered Response)' },
  { value: 'matrix', label: 'Matrix' },
  { value: 'hotspot', label: 'Hotspot' },
  { value: 'cloze-dropdown', label: 'Cloze Dropdown' },
  { value: 'bowtie', label: 'Bowtie' },
];


const CaseStudyBuilder = ({ editId: propEditId }) => {
  const createSectionId = () => `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams(); // for editing from route params
  
  // Get edit ID from props (passed from AdminDashboard), route params, or location state
  const editingId = propEditId || id || location?.state?.caseStudyId || '';
  const isEditing = Boolean(editingId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details'); // details, sections, questions

  // List view state - show list if not editing
  const [showList, setShowList] = useState(!isEditing);
  const [caseStudies, setCaseStudies] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  // Case study data
  const [caseStudy, setCaseStudy] = useState({
    title: '',
    category: '',
    subcategory: '',
    type: '6-question',
    scenario: '',
    sections: [],
    questions: [],
    isActive: true
  });

  // For adding new sections
  const [newSection, setNewSection] = useState({ title: '', content: '' });
  
  // For editing sections
  const [editingSectionIndex, setEditingSectionIndex] = useState(-1);
  const [editSectionData, setEditSectionData] = useState({ title: '', content: '' });

  // For adding new questions
  const [currentQuestion, setCurrentQuestion] = useState({
    type: 'matrix',
    questionText: '',
    options: [],
    correctAnswer: [],
    visibleSectionIds: [],
    matrixColumns: ['Column 1', 'Column 2', 'Column 3'],
    matrixRows: [
      { rowText: '', correctColumns: [0] },
      { rowText: '', correctColumns: [0] },
    ],
    rationale: '',
    difficulty: 'medium',
  });
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(-1);
  const [activeQuestionTab, setActiveQuestionTab] = useState('new');

  // Drag-drop state
  const [dragDropItems, setDragDropItems] = useState(['', '', '', '']);

  // Highlight state
  const [highlightSelectableWords, setHighlightSelectableWords] = useState([]);
  const [highlightCorrectWords, setHighlightCorrectWords] = useState([]);

  // Cloze dropdown state
  const [clozeTemplate, setClozeTemplate] = useState('');
  const [clozeBlanks, setClozeBlanks] = useState([]);

  // Hotspot state
  const [hotspotImageUrl, setHotspotImageUrl] = useState('');
  const [hotspotTargets, setHotspotTargets] = useState([]);

  const handleDragDropChange = (index, value) => {
    setDragDropItems((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  // ── Unsaved changes detection & localStorage backup ──
  const CS_DRAFT_KEY = 'nclex_casestudy_draft_backup';
  const hasSavedRef = useRef(false);

  const getCaseStudyFormData = useCallback(() => ({
    caseStudy: { title: caseStudy.title, category: caseStudy.category, subcategory: caseStudy.subcategory, type: caseStudy.type, scenario: caseStudy.scenario, sections: caseStudy.sections, questions: caseStudy.questions, isActive: caseStudy.isActive },
    currentQuestion, activeTab, newSection, editingSectionIndex, editSectionData,
  }), [caseStudy, currentQuestion, activeTab, newSection, editingSectionIndex, editSectionData]);

  const isCaseStudyEmpty = useCallback(() => {
    return !caseStudy.title?.trim() && !caseStudy.scenario?.trim() && (caseStudy.questions || []).length === 0;
  }, [caseStudy]);

  const hasUnsavedChanges = useCallback(() => {
    if (hasSavedRef.current) return false;
    if (isEditing) return !isCaseStudyEmpty();
    return !isCaseStudyEmpty();
  }, [isEditing, isCaseStudyEmpty]);

  // Auto-save to localStorage every 5 seconds
  useEffect(() => {
    if (isEditing || isCaseStudyEmpty() || showList) return;
    const interval = setInterval(() => {
      if (!isCaseStudyEmpty()) {
        try {
          const data = getCaseStudyFormData();
          localStorage.setItem(CS_DRAFT_KEY, JSON.stringify({ ...data, _savedAt: Date.now() }));
        } catch (e) { /* ignore */ }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isEditing, isCaseStudyEmpty, getCaseStudyFormData, showList]);

  // Recovery banner
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState(null);

  useEffect(() => {
    if (isEditing) return;
    try {
      const raw = localStorage.getItem(CS_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft._savedAt && Date.now() - draft._savedAt < 24 * 60 * 60 * 1000) {
        const hasContent = draft.caseStudy?.title?.trim() || (draft.caseStudy?.questions || []).length > 0 || draft.caseStudy?.scenario?.trim();
        if (hasContent) {
          setRecoveredDraft(draft);
          setShowRecoveryBanner(true);
        }
      } else {
        localStorage.removeItem(CS_DRAFT_KEY);
      }
    } catch (e) { /* ignore */ }
  }, [isEditing]);

  const recoverCaseStudyDraft = () => {
    if (!recoveredDraft?.caseStudy) return;
    setCaseStudy(prev => ({
      ...prev,
      ...recoveredDraft.caseStudy,
      sections: recoveredDraft.caseStudy.sections || prev.sections,
      questions: recoveredDraft.caseStudy.questions || prev.questions,
    }));
    if (recoveredDraft.activeTab) setActiveTab(recoveredDraft.activeTab);
    setShowRecoveryBanner(false);
    setRecoveredDraft(null);
    localStorage.removeItem(CS_DRAFT_KEY);
  };

  const discardCaseStudyDraft = () => {
    localStorage.removeItem(CS_DRAFT_KEY);
    setShowRecoveryBanner(false);
    setRecoveredDraft(null);
  };

  // Browser back/refresh warning
  useEffect(() => {
    const handler = (e) => {
      if (hasUnsavedChanges() && !showList) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Your case study has been auto-saved.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges, showList]);

  // React Router navigation blocker
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges() && !showList && currentLocation.pathname !== nextLocation.pathname
  );

  const markSaved = () => {
    hasSavedRef.current = true;
    localStorage.removeItem(CS_DRAFT_KEY);
  };

  const addClozeBlank = () => {
    const nextIdx = clozeBlanks.length + 1;
    setClozeTemplate(prev => prev + `{{blank${nextIdx}}}`);
    setClozeBlanks(prev => [...prev, { key: `blank${nextIdx}`, optionsText: '', correctAnswer: '' }]);
  };

  const removeClozeBlank = (idx) => {
    setClozeBlanks(prev => prev.filter((_, i) => i !== idx));
  };

  const addHotspotTarget = () => {
    const nextId = `T${hotspotTargets.length + 1}`;
    setHotspotTargets(prev => [...prev, { id: nextId, label: `Spot ${prev.length + 1}`, x: 50, y: 50, radius: 6 }]);
  };

  const updateHotspotTarget = (idx, field, value) => {
    setHotspotTargets(prev => prev.map((t, i) => i === idx ? { ...t, [field]: field === 'x' || field === 'y' || field === 'radius' ? Number(value) : value } : t));
  };

  const removeHotspotTarget = (idx) => {
    setHotspotTargets(prev => prev.filter((_, i) => i !== idx));
  };

  const getEmptyQuestion = () => ({
    type: 'matrix',
    questionText: '',
    options: [],
    correctAnswer: [],
    visibleSectionIds: [],
    matrixColumns: ['Column 1', 'Column 2', 'Column 3'],
    matrixRows: [
      { rowText: '', correctColumns: [0] },
      { rowText: '', correctColumns: [0] },
    ],
    rationale: '',
    difficulty: 'medium',
  });

  useEffect(() => {
    if (isEditing) {
      fetchCaseStudy();
    }
  }, [editingId]);

  // Handle editId prop changes from parent (AdminDashboard)
  useEffect(() => {
    if (propEditId) {
      setShowList(false);
      setLoading(true);
      fetchCaseStudy();
    }
  }, [propEditId]);

  useEffect(() => {
    if (showList) {
      fetchCaseStudies();
    }
  }, [showList]);

  const fetchCaseStudies = async () => {
    setListLoading(true);
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/case-studies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCaseStudies(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to fetch case studies:', err);
    } finally {
      setListLoading(false);
    }
  };

  const handleDeleteCaseStudy = async (caseStudyId, caseStudyTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${caseStudyTitle}"?`)) {
      return;
    }
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.delete(`/api/admin/case-studies/${caseStudyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCaseStudies();
      alert('Case study deleted successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete case study');
    }
  };

  const handleEditCaseStudy = (caseStudyId) => {
    // Navigate with URL parameter for proper routing
    navigate(`/admin/dashboard?section=case-studies/edit/${caseStudyId}`);
    setShowList(false);
  };

  const handleCreateNew = () => {
    setCaseStudy({
      title: '',
      category: '',
      subcategory: '',
      type: '6-question',
      scenario: '',
      sections: [],
      questions: [],
      isActive: true
    });
    setShowList(false);
  };

  const handleBackToList = () => {
    setShowList(true);
    setActiveTab('details');
    setCurrentQuestion(getEmptyQuestion());
    setEditingQuestionIndex(-1);
    setActiveQuestionTab('new');
  };

  const fetchCaseStudy = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get(`/api/admin/case-studies/${editingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCaseStudy({
        ...response.data,
        sections: Array.isArray(response.data?.sections)
          ? response.data.sections.map((section, index) => ({
              ...section,
              sectionId: section?.sectionId || `section-${index + 1}`
            }))
          : []
      });
      if (Array.isArray(response.data?.questions) && response.data.questions.length > 0) {
        const firstQuestion = response.data.questions[0];
        setCurrentQuestion({
          ...getEmptyQuestion(),
          ...firstQuestion,
          options: Array.isArray(firstQuestion.options) && firstQuestion.options.length ? firstQuestion.options : ['', '', '', ''],
        });
        setEditingQuestionIndex(0);
        setActiveQuestionTab(0);
      }
    } catch (err) {
      setError('Failed to load case study');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCaseStudyChange = (e) => {
    const { name, value } = e.target;
    setCaseStudy(prev => ({ ...prev, [name]: value }));
  };

  // Section management
  const addSection = () => {
    if (!newSection.title || !newSection.content) {
      alert('Please enter both title and content');
      return;
    }
    setCaseStudy(prev => ({
      ...prev,
      sections: [...prev.sections, { ...newSection, sectionId: createSectionId() }]
    }));
    setNewSection({ title: '', content: '' });
  };

  const removeSection = (index) => {
    setCaseStudy(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
    // Cancel editing if the section being edited is removed
    if (editingSectionIndex === index) {
      setEditingSectionIndex(-1);
      setEditSectionData({ title: '', content: '' });
    }
  };

  const startEditSection = (index) => {
    const section = caseStudy.sections[index];
    setEditingSectionIndex(index);
    setEditSectionData({ title: section.title, content: section.content, sectionId: section.sectionId });
  };

  const cancelEditSection = () => {
    setEditingSectionIndex(-1);
    setEditSectionData({ title: '', content: '' });
  };

  const saveEditSection = () => {
    if (!editSectionData.title || !editSectionData.content) {
      alert('Please enter both title and content');
      return;
    }
    setCaseStudy(prev => ({
      ...prev,
      sections: prev.sections.map((section, i) => 
        i === editingSectionIndex 
          ? { ...editSectionData, sectionId: section.sectionId || createSectionId() }
          : section
      )
    }));
    setEditingSectionIndex(-1);
    setEditSectionData({ title: '', content: '' });
  };

  // Question management
  const handleQuestionChange = (field, value) => {
    setCurrentQuestion(prev => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const removeOption = (index) => {
    if (currentQuestion.options.length > 2) {
      setCurrentQuestion(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const addQuestion = () => {
    // Validate question
    if (!currentQuestion.questionText) {
      alert('Please enter question text');
      return;
    }

    // Type-specific validation
    if (currentQuestion.type === 'matrix') {
      const rows = currentQuestion.matrixRows || [];
      const cols = currentQuestion.matrixColumns || [];
      if (cols.length < 2) {
        alert('Please add at least 2 columns');
        return;
      }
      if (rows.length < 1 || !rows.some(r => r.rowText?.trim())) {
        alert('Please add at least one row with text');
        return;
      }
      currentQuestion.correctAnswer = rows.map(r => r.correctColumns || (r.correctColumn !== undefined ? [r.correctColumn] : []));
      for (const r of rows) {
        const cols = r.correctColumns || (r.correctColumn !== undefined ? [r.correctColumn] : []);
        if (!Array.isArray(cols) || cols.length === 0) {
          alert('Each row must have at least one correct column selected');
          return;
        }
      }
    } else if (currentQuestion.type === 'multiple-choice') {
      const opts = currentQuestion.options || [];
      if (opts.length < 2) { alert('Please add at least 2 options'); return; }
      if (opts.filter(Boolean).length < 2) { alert('Please fill in at least 2 options'); return; }
      if (!currentQuestion.correctAnswer) { alert('Please select a correct answer'); return; }
    } else if (currentQuestion.type === 'sata') {
      const opts = currentQuestion.options || [];
      if (opts.length < 3) { alert('Please add at least 3 options for SATA'); return; }
      if (!Array.isArray(currentQuestion.correctAnswer) || currentQuestion.correctAnswer.length < 2) {
        alert('Please select at least 2 correct answers'); return;
      }
    } else if (currentQuestion.type === 'fill-blank') {
      if (!currentQuestion.correctAnswer || !String(currentQuestion.correctAnswer).trim()) {
        alert('Please enter a correct answer'); return;
      }
    } else if (currentQuestion.type === 'highlight') {
      if (highlightSelectableWords.length === 0) { alert('Please select at least one clickable word'); return; }
      if (highlightCorrectWords.length === 0) { alert('Please select at least one correct word'); return; }
      currentQuestion.highlightSelectableWords = highlightSelectableWords;
      currentQuestion.highlightCorrectWords = highlightCorrectWords;
      const words = currentQuestion.questionText.split(/\s+/).filter(w => w.trim());
      currentQuestion.correctAnswer = highlightCorrectWords.map(idx => words[idx]).join('|');
    } else if (currentQuestion.type === 'drag-drop') {
      const items = dragDropItems.filter(item => item.trim() !== '');
      if (items.length < 2) { alert('Please enter at least 2 items'); return; }
      currentQuestion.options = items;
      currentQuestion.correctAnswer = items.join('|');
    } else if (currentQuestion.type === 'hotspot') {
      if (!hotspotImageUrl.trim()) { alert('Please provide a hotspot image URL'); return; }
      if (!currentQuestion.correctAnswer) { alert('Please select a correct target'); return; }
      currentQuestion.hotspotImageUrl = hotspotImageUrl;
      currentQuestion.hotspotTargets = hotspotTargets;
    } else if (currentQuestion.type === 'cloze-dropdown') {
      if (!clozeTemplate.trim()) { alert('Please enter a sentence with blanks'); return; }
      if (clozeBlanks.length === 0) { alert('Please add at least one blank'); return; }
      currentQuestion.clozeTemplate = clozeTemplate;
      currentQuestion.clozeBlanks = clozeBlanks;
    }

    const normalizedQuestion = {
      ...currentQuestion,
      category: caseStudy.category,
      subcategory: caseStudy.subcategory,
      visibleSectionIds: Array.isArray(currentQuestion.visibleSectionIds) ? currentQuestion.visibleSectionIds : [],
    };

    if (editingQuestionIndex >= 0) {
      setCaseStudy((prev) => ({
        ...prev,
        questions: prev.questions.map((q, idx) => (idx === editingQuestionIndex ? normalizedQuestion : q))
      }));
      setActiveQuestionTab(editingQuestionIndex);
    } else {
      const nextIndex = caseStudy.questions.length;
      setCaseStudy((prev) => ({
        ...prev,
        questions: [...prev.questions, normalizedQuestion]
      }));
      setEditingQuestionIndex(nextIndex);
      setActiveQuestionTab(nextIndex);
    }

    setCurrentQuestion({ ...normalizedQuestion });
  };

  const removeQuestion = (index) => {
    setCaseStudy(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
    if (editingQuestionIndex === index) {
      setEditingQuestionIndex(-1);
      setCurrentQuestion(getEmptyQuestion());
      setActiveQuestionTab('new');
    } else if (editingQuestionIndex > index) {
      const next = editingQuestionIndex - 1;
      setEditingQuestionIndex(next);
      setActiveQuestionTab(next);
    }
  };

  const openQuestionTab = (index) => {
    const nextQuestion = caseStudy.questions[index];
    if (!nextQuestion) return;

    setCurrentQuestion({
      ...getEmptyQuestion(),
      ...nextQuestion,
      options: Array.isArray(nextQuestion.options) && nextQuestion.options.length ? nextQuestion.options : [],
      highlightStart: Number(nextQuestion.highlightStart || 0),
      highlightEnd: Number(nextQuestion.highlightEnd || 0),
      visibleSectionIds: Array.isArray(nextQuestion.visibleSectionIds) ? nextQuestion.visibleSectionIds : [],
      bowtieCondition: Array.isArray(nextQuestion.bowtieCondition) && nextQuestion.bowtieCondition.length ? nextQuestion.bowtieCondition : ['', '', '', ''],
      bowtieActions: Array.isArray(nextQuestion.bowtieActions) && nextQuestion.bowtieActions.length ? nextQuestion.bowtieActions : ['', '', '', ''],
      bowtieParameters: Array.isArray(nextQuestion.bowtieParameters) && nextQuestion.bowtieParameters.length ? nextQuestion.bowtieParameters : ['', '', '', ''],
      matrixColumns: Array.isArray(nextQuestion.matrixColumns) && nextQuestion.matrixColumns.length ? nextQuestion.matrixColumns : ['Column 1', 'Column 2', 'Column 3'],
      matrixRows: Array.isArray(nextQuestion.matrixRows) && nextQuestion.matrixRows.length ? nextQuestion.matrixRows : [{ rowText: '', correctColumns: [0] }, { rowText: '', correctColumns: [0] }],
    });
    setEditingQuestionIndex(index);
    setActiveQuestionTab(index);
    setActiveTab('questions');
  };

  const openNewQuestionTab = () => {
    setCurrentQuestion({
      ...getEmptyQuestion(),
      visibleSectionIds: caseStudy.sections.slice(0, 1).map((section) => section.sectionId).filter(Boolean)
    });
    setEditingQuestionIndex(-1);
    setActiveQuestionTab('new');
    setActiveTab('questions');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!caseStudy.title) {
      setError('Please enter a title');
      return;
    }
    if (!caseStudy.category || !caseStudy.subcategory) {
      setError('Please select a section and sub section');
      return;
    }
    if (!caseStudy.scenario) {
      setError('Please enter a scenario');
      return;
    }
    if (caseStudy.questions.length === 0) {
      setError('Please add at least one question');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = sessionStorage.getItem('adminToken');
      if (isEditing) {
        await axios.put(`/api/admin/case-studies/${editingId}`, caseStudy, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Case study updated successfully');
      } else {
        await axios.post('/api/admin/case-studies', caseStudy, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Case study created successfully');
      }
      markSaved();
      setShowList(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save case study');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) return <div>Loading case study...</div>;

  // List View
  if (showList) {
    return (
      <div className="case-study-builder">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Case Studies</h2>
          <button className="btn btn-primary" onClick={handleCreateNew}>
            <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
            Create New Case Study
          </button>
        </div>

        {listLoading ? (
          <div className="text-center" style={{ padding: '40px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <p className="mt-2">Loading case studies...</p>
          </div>
        ) : caseStudies.length === 0 ? (
          <div className="text-center" style={{ padding: '60px', background: '#f8fafc', borderRadius: '12px' }}>
            <i className="fas fa-folder-open" style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '16px' }}></i>
            <h4 style={{ color: '#64748b' }}>No Case Studies Yet</h4>
            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Create your first case study to get started.</p>
            <button className="btn btn-primary" onClick={handleCreateNew}>
              <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
              Create New Case Study
            </button>
          </div>
        ) : (
          <div className="case-study-list">
            {caseStudies.map((cs) => (
              <div key={cs._id} className="card mb-3" style={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                <div className="card-body" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, color: '#1e293b' }}>{cs.title || 'Untitled Case Study'}</h4>
                        <span
                          className="badge"
                          style={{
                            background: cs.isActive ? '#dcfce7' : '#fee2e2',
                            color: cs.isActive ? '#166534' : '#991b1b',
                            fontSize: '12px',
                            padding: '4px 10px',
                            borderRadius: '12px'
                          }}
                        >
                          {cs.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span
                          className="badge"
                          style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            fontSize: '12px',
                            padding: '4px 10px',
                            borderRadius: '12px'
                          }}
                        >
                          {CASE_STUDY_TYPES.find(t => t.value === cs.type)?.label || cs.type}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>
                        <span><i className="fas fa-folder" style={{ marginRight: '6px' }}></i>{cs.category || 'No category'}</span>
                        <span><i className="fas fa-tag" style={{ marginRight: '6px' }}></i>{cs.subcategory || 'No subcategory'}</span>
                        <span><i className="fas fa-question-circle" style={{ marginRight: '6px' }}></i>{cs.questions?.length || 0} questions</span>
                      </div>
                      <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
                        {cs.scenario ? cs.scenario.substring(0, 150) + (cs.scenario.length > 150 ? '...' : '') : 'No scenario provided'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleEditCaseStudy(cs._id)}
                        title="Edit case study"
                      >
                        <i className="fas fa-edit"></i> Edit
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteCaseStudy(cs._id, cs.title)}
                        title="Delete case study"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Create/Edit View
  return (
    <div className="case-study-builder">
      {/* Recovery banner */}
      {showRecoveryBanner && (
        <div style={{
          padding: '16px 20px', background: '#fef3c7', border: '1px solid #f59e0b',
          borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        }}>
          <i className="fas fa-undo" style={{ color: '#d97706', fontSize: '1.2rem' }}></i>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <strong style={{ color: '#92400e' }}>We found an unsaved case study!</strong>
            <p style={{ margin: '4px 0 0', color: '#92400e', fontSize: '0.9rem' }}>
              You were working on a case study recently. Would you like to recover it?
            </p>
          </div>
          <button type="button" onClick={recoverCaseStudyDraft} style={{
            background: '#d97706', color: '#fff', border: 'none', borderRadius: '8px',
            padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
          }}>
            <i className="fas fa-magic me-1"></i> Recover
          </button>
          <button type="button" onClick={discardCaseStudyDraft} style={{
            background: '#fff', color: '#92400e', border: '1px solid #fbbf24', borderRadius: '8px',
            padding: '8px 16px', cursor: 'pointer', fontSize: '0.9rem',
          }}>
            Discard
          </button>
        </div>
      )}

      {/* Navigation blocker modal */}
      {blocker.state === 'blocked' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 9999,
        }} onClick={(e) => { if (e.target === e.currentTarget) blocker.reset?.(); }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '32px',
            maxWidth: '440px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-exclamation-triangle" style={{ color: '#d97706', fontSize: '1.3rem' }}></i>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>Unsaved Changes</h3>
            </div>
            <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '8px' }}>
              You have unsaved changes on this case study. Your progress has been <strong>auto-saved</strong>, so you can recover it later.
            </p>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>Are you sure you want to leave this page?</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => blocker.reset?.()} style={{
                background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1',
                borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: 600,
              }}>Stay & Continue</button>
              <button onClick={() => blocker.proceed?.()} style={{
                background: '#ef4444', color: '#fff', border: 'none',
                borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: 600,
              }}>Leave Anyway</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button className="btn btn-outline-secondary" onClick={handleBackToList}>
          <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i>
          Back to List
        </button>
        <h2 style={{ margin: 0 }}>{isEditing ? 'Edit Case Study' : 'Create New Case Study'}</h2>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="builder-tabs">
        <button
          className={`tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          1. Case Details
        </button>
        <button
          className={`tab ${activeTab === 'sections' ? 'active' : ''}`}
          onClick={() => setActiveTab('sections')}
        >
          2. Patient Data Sections
        </button>
        <button
          className={`tab ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          3. Questions
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form-card">
        {/* Tab 1: Case Details */}
        {activeTab === 'details' && (
          <div className="tab-pane">
            <div className="form-group">
              <label className="form-label">Case Study Title</label>
              <input
                type="text"
                name="title"
                className="form-control"
                value={caseStudy.title}
                onChange={handleCaseStudyChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Case Study Type</label>
              <select
                name="type"
                className="form-control"
                value={caseStudy.type}
                onChange={handleCaseStudyChange}
                required
              >
                {CASE_STUDY_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Exam View Preview</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                <div style={{ border: '1px solid #dbe5f0', borderRadius: '12px', padding: '10px', background: '#fff' }}>
                  <div style={{ fontWeight: 700, marginBottom: '8px' }}>Case Study Layout</div>
                  <img src={caseStudyPreviewImage} alt="Case study exam layout preview" style={{ width: '100%', borderRadius: '8px' }} />
                </div>
                <div style={{ border: '1px solid #dbe5f0', borderRadius: '12px', padding: '10px', background: '#fff' }}>
                  <div style={{ fontWeight: 700, marginBottom: '8px' }}>Bowtie Layout</div>
                  <img src={bowtiePreviewImage} alt="Bowtie exam layout preview" style={{ width: '100%', borderRadius: '8px' }} />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Section (Category)</label>
              <select
                name="category"
                className="form-control"
                value={caseStudy.category}
                onChange={(e) => setCaseStudy((prev) => ({ ...prev, category: e.target.value, subcategory: '' }))}
                required
              >
                <option value="">Select Section</option>
                {Object.keys(CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Sub Section (Subcategory)</label>
              <select
                name="subcategory"
                className="form-control"
                value={caseStudy.subcategory}
                onChange={handleCaseStudyChange}
                disabled={!caseStudy.category}
                required
              >
                <option value="">Select Sub Section</option>
                {(CATEGORIES[caseStudy.category] || []).map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Scenario / Initial Presentation</label>
              <textarea
                name="scenario"
                className="form-control"
                rows="6"
                value={caseStudy.scenario}
                onChange={handleCaseStudyChange}
                placeholder="Describe the patient, initial presentation, and setting..."
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={caseStudy.isActive}
                  onChange={(e) => setCaseStudy(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                Active (visible to students)
              </label>
            </div>

            <button type="button" className="btn btn-primary" onClick={() => setActiveTab('sections')}>
              Next: Patient Data Sections
            </button>
          </div>
        )}

        {/* Tab 2: Patient Data Sections */}
        {activeTab === 'sections' && (
          <div className="tab-pane">
            <h4>Additional Patient Data</h4>
            <p className="text-muted">Add sections like Vital Signs, Lab Results, Nurses' Notes, etc.</p>

            <div className="section-list mb-4">
              {caseStudy.sections.map((section, index) => (
                <div key={index} className="card mb-2">
                  <div className="card-body">
                    {editingSectionIndex === index ? (
                      // Edit mode
                      <div className="edit-section-form">
                        <div className="form-group mb-2">
                          <label className="form-label">Section Title</label>
                          <input
                            type="text"
                            className="form-control"
                            value={editSectionData.title}
                            onChange={(e) => setEditSectionData({ ...editSectionData, title: e.target.value })}
                            placeholder="e.g., Vital Signs, Lab Results, Nurses' Notes"
                          />
                        </div>
                        <div className="form-group mb-2">
                          <label className="form-label">Content</label>
                          <textarea
                            className="form-control"
                            rows="4"
                            value={editSectionData.content}
                            onChange={(e) => setEditSectionData({ ...editSectionData, content: e.target.value })}
                            placeholder="Enter the patient data..."
                          />
                        </div>
                        <div className="d-flex gap-2">
                          <button type="button" className="btn btn-success btn-sm" onClick={saveEditSection}>
                            <i className="fas fa-save me-1"></i> Save
                          </button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEditSection}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6>{section.title}</h6>
                          <p className="mb-0 small text-muted">{section.content.substring(0, 100)}{section.content.length > 100 ? '...' : ''}</p>
                        </div>
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => startEditSection(index)}
                            title="Edit section"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeSection(index)}
                            title="Remove section"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="add-section-form">
              <h5>Add New Section</h5>
              <div className="form-group">
                <label className="form-label">Section Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={newSection.title}
                  onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                  placeholder="e.g., Vital Signs, Lab Results, Nurses' Notes"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Content</label>
                <textarea
                  className="form-control"
                  rows="4"
                  value={newSection.content}
                  onChange={(e) => setNewSection({ ...newSection, content: e.target.value })}
                  placeholder="Enter the patient data..."
                />
              </div>
              <button type="button" className="btn btn-primary" onClick={addSection}>
                Add Section
              </button>
            </div>

            <div className="mt-4 d-flex justify-content-between">
              <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('details')}>
                Previous: Details
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setActiveTab('questions')}>
                Next: Questions
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Questions */}
        {activeTab === 'questions' && (
          <div className="tab-pane">
            <h4>Case Study Questions</h4>
            <p className="text-muted">Add questions for this case study. They will appear in order.</p>

            <div className="mb-3 d-flex flex-wrap gap-2">
              {caseStudy.questions.map((q, index) => (
                <button
                  key={`question-tab-${index}`}
                  type="button"
                  className={`btn btn-sm ${activeQuestionTab === index ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => openQuestionTab(index)}
                >
                  {`Question ${index + 1}`}
                </button>
              ))}
              <button
                type="button"
                className={`btn btn-sm ${activeQuestionTab === 'new' ? 'btn-success' : 'btn-outline-success'}`}
                onClick={openNewQuestionTab}
              >
                + New Question
              </button>
            </div>

            <div className="question-list mb-4">
              {caseStudy.questions.map((q, index) => (
                <div key={index} className="card mb-2">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <h6>Question {index + 1}: {q.questionText.substring(0, 50)}...</h6>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => openQuestionTab(index)}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => removeQuestion(index)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <span className="badge badge-info">{q.type}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="add-question-form">
              <h5>{editingQuestionIndex >= 0 ? `Edit Question ${editingQuestionIndex + 1}` : 'Add New Question'}</h5>
              
              <div className="form-group">
                <label className="form-label">Question Type</label>
                <select
                  className="form-control"
                  value={currentQuestion.type}
                  onChange={(e) => handleQuestionChange('type', e.target.value)}
                >
                  {QUESTION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Question Text</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={currentQuestion.questionText}
                  onChange={(e) => handleQuestionChange('questionText', e.target.value)}
                  placeholder="Enter the question..."
                />
              </div>

              {/* MULTIPLE CHOICE OPTIONS */}
              {(currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'sata') && (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">
                      {currentQuestion.type === 'multiple-choice' ? 'Options (select correct answer)' : 'Options (check all correct answers)'}
                    </label>
                    <button type="button" className="btn btn-sm btn-primary" onClick={addOption}>+ Add Option</button>
                  </div>
                  {currentQuestion.options.map((opt, idx) => (
                    <div key={idx} className="d-flex align-items-center gap-2 mb-2">
                      <span style={{ fontWeight: 600, minWidth: '24px' }}>{String.fromCharCode(65 + idx)}.</span>
                      <input
                        type="text"
                        className="form-control"
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      />
                      {currentQuestion.type === 'multiple-choice' ? (
                        <input
                          type="radio"
                          name="cs-mc-correct"
                          value={idx}
                          checked={currentQuestion.correctAnswer === idx || currentQuestion.correctAnswer === String.fromCharCode(65 + idx)}
                          onChange={() => handleQuestionChange('correctAnswer', String.fromCharCode(65 + idx))}
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={Array.isArray(currentQuestion.correctAnswer) ? currentQuestion.correctAnswer.includes(String.fromCharCode(65 + idx)) : false}
                          onChange={(e) => {
                            let selected = Array.isArray(currentQuestion.correctAnswer) ? [...currentQuestion.correctAnswer] : [];
                            const letter = String.fromCharCode(65 + idx);
                            if (e.target.checked) {
                              if (!selected.includes(letter)) selected.push(letter);
                            } else {
                              selected = selected.filter(s => s !== letter);
                            }
                            handleQuestionChange('correctAnswer', selected);
                          }}
                        />
                      )}
                      {currentQuestion.options.length > 2 && (
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeOption(idx)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  ))}
                  <small className="text-muted">
                    {currentQuestion.type === 'sata' ? 'Check all correct answers (2 or more).' : 'Select the single correct answer.'}
                  </small>
                </div>
              )}

              {/* FILL IN THE BLANK */}
              {currentQuestion.type === 'fill-blank' && (
                <div className="form-group">
                  <label className="form-label">Correct Answer</label>
                  <input
                    type="text"
                    className="form-control"
                    value={currentQuestion.correctAnswer || ''}
                    onChange={(e) => handleQuestionChange('correctAnswer', e.target.value)}
                    placeholder="Enter the correct answer"
                  />
                  <small className="text-muted">For multiple acceptable answers, separate with semicolons (;)</small>
                </div>
              )}

              {/* HIGHLIGHT */}
              {currentQuestion.type === 'highlight' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Step 1: Click words to make them <strong style={{ color: '#3b82f6' }}>SELECTABLE</strong> (blue = selectable)</label>
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', lineHeight: '2' }}>
                      {currentQuestion.questionText.split(/\s+/).filter(w => w.trim()).map((word, idx) => {
                        const isSelectable = highlightSelectableWords.includes(idx);
                        const isCorrect = highlightCorrectWords.includes(idx);
                        return (
                          <span
                            key={idx}
                            onClick={() => {
                              if (isSelectable) {
                                setHighlightSelectableWords(prev => prev.filter(i => i !== idx));
                                setHighlightCorrectWords(prev => prev.filter(i => i !== idx));
                              } else {
                                setHighlightSelectableWords(prev => [...prev, idx].sort((a, b) => a - b));
                              }
                            }}
                            style={{
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              margin: '2px',
                              display: 'inline-block',
                              background: isCorrect ? '#bbf7d0' : isSelectable ? '#dbeafe' : '#f1f5f9',
                              color: isCorrect ? '#166534' : isSelectable ? '#1e40af' : '#64748b',
                              border: isSelectable ? `2px solid ${isCorrect ? '#22c55e' : '#3b82f6'}` : '2px solid transparent',
                              fontWeight: isSelectable ? 600 : 400,
                            }}
                          >
                            {word}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {highlightSelectableWords.length > 0 && (
                    <div className="form-group">
                      <label className="form-label">Step 2: Click blue words to mark them as <strong style={{ color: '#22c55e' }}>CORRECT</strong></label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {highlightSelectableWords.map(idx => {
                          const word = currentQuestion.questionText.split(/\s+/).filter(w => w.trim())[idx];
                          const isCorrect = highlightCorrectWords.includes(idx);
                          return (
                            <span
                              key={idx}
                              onClick={() => {
                                if (isCorrect) {
                                  setHighlightCorrectWords(prev => prev.filter(i => i !== idx));
                                } else {
                                  setHighlightCorrectWords(prev => [...prev, idx].sort((a, b) => a - b));
                                }
                              }}
                              style={{
                                cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontWeight: 600,
                                background: isCorrect ? '#bbf7d0' : '#dbeafe',
                                color: isCorrect ? '#166534' : '#1e40af',
                                border: `2px solid ${isCorrect ? '#22c55e' : '#3b82f6'}`,
                              }}
                            >
                              {word}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* DRAG & DROP */}
              {currentQuestion.type === 'drag-drop' && (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Drag & Drop Items (Ordered Response)</label>
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => setDragDropItems(prev => [...prev, ''])}>Add Item</button>
                  </div>
                  <small className="text-muted d-block mb-3">
                    Enter items in the <strong>correct order</strong> (top to bottom). Students will see them shuffled.
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
                          <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 600, color: '#64748b', width: '60px' }}>{idx + 1}</td>
                          <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0' }}>
                            <input type="text" className="form-control" value={item} onChange={(e) => handleDragDropChange(idx, e.target.value)} placeholder={`Step ${idx + 1}`} style={{ border: '1px solid #e2e8f0', borderRadius: '6px' }} />
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
                  <small className="text-muted mt-2 d-block">{dragDropItems.filter(i => i.trim()).length} item(s) entered. Minimum 2 required.</small>
                </div>
              )}

              {/* HOTSPOT */}
              {currentQuestion.type === 'hotspot' && (
                <div className="form-group">
                  <label className="form-label">Hotspot Question Image URL</label>
                  <input
                    type="url"
                    className="form-control"
                    value={hotspotImageUrl}
                    onChange={(e) => setHotspotImageUrl(e.target.value)}
                    placeholder="https://.../image.png or /api/uploads/..."
                  />
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
                            <input type="text" className="form-control" value={target.id} onChange={(e) => updateHotspotTarget(idx, 'id', e.target.value)} />
                          </div>
                          <div>
                            <label className="form-label">Label</label>
                            <input type="text" className="form-control" value={target.label} onChange={(e) => updateHotspotTarget(idx, 'label', e.target.value)} />
                          </div>
                          <div>
                            <label className="form-label">Correct</label>
                            <input type="radio" name="cs-hotspot-correct" checked={currentQuestion.correctAnswer === target.id} onChange={() => handleQuestionChange('correctAnswer', target.id)} />
                          </div>
                        </div>
                        <div className="upload-grid-three mt-2">
                          <div>
                            <label className="form-label">X (%)</label>
                            <input type="number" min="0" max="100" className="form-control" value={target.x} onChange={(e) => updateHotspotTarget(idx, 'x', e.target.value)} />
                          </div>
                          <div>
                            <label className="form-label">Y (%)</label>
                            <input type="number" min="0" max="100" className="form-control" value={target.y} onChange={(e) => updateHotspotTarget(idx, 'y', e.target.value)} />
                          </div>
                          <div>
                            <label className="form-label">Radius (%)</label>
                            <input type="number" min="1" max="20" className="form-control" value={target.radius} onChange={(e) => updateHotspotTarget(idx, 'radius', e.target.value)} />
                          </div>
                        </div>
                        {hotspotTargets.length > 1 && (
                          <button type="button" className="btn btn-sm btn-danger mt-2" onClick={() => removeHotspotTarget(idx)}>Remove Target</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CLOZE DROPDOWN */}
              {currentQuestion.type === 'cloze-dropdown' && (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Cloze Dropdown (Fill-in with Dropdowns)</label>
                    <button type="button" className="btn btn-sm btn-primary" onClick={addClozeBlank}><i className="fas fa-plus me-1"></i>Add Blank</button>
                  </div>
                  <small className="text-muted d-block mb-3">Type a sentence. Click "Add Blank" to insert a dropdown placeholder.</small>
                  <textarea
                    className="form-control mb-3"
                    rows="3"
                    value={clozeTemplate || currentQuestion.questionText || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClozeTemplate(val);
                      handleQuestionChange('questionText', val);
                      const placeholderRegex = /\{\{(\w+)\}\}/g;
                      const found = [];
                      let match;
                      while ((match = placeholderRegex.exec(val)) !== null) { found.push(match[1]); }
                      if (found.length > 0) {
                        setClozeBlanks((prev) => {
                          const existingMap = {};
                          prev.forEach((b) => { existingMap[b.key] = b; });
                          return found.map((key) => existingMap[key] || { key, optionsText: '', correctAnswer: '' });
                        });
                      }
                    }}
                    placeholder="e.g., The nurse should {{blank1}} the patient."
                  />
                  {clozeBlanks.map((blank, blankIdx) => {
                    const blankToken = `{{blank${blankIdx + 1}}}`;
                    return (
                      <div key={blankIdx} style={{ padding: '12px', marginBottom: '8px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <strong style={{ color: '#166534' }}>{blankToken}</strong>
                        <div className="row g-2 mt-2">
                          <div className="col-md-6">
                            <label className="form-label" style={{ fontSize: '0.8rem' }}>Options (comma-separated)</label>
                            <input type="text" className="form-control form-control-sm" value={blank.optionsText} onChange={(e) => {
                              const next = [...clozeBlanks];
                              next[blankIdx] = { ...next[blankIdx], optionsText: e.target.value };
                              setClozeBlanks(next);
                            }} placeholder="assess, monitor, evaluate" />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label" style={{ fontSize: '0.8rem' }}>Correct Answer</label>
                            <input type="text" className="form-control form-control-sm" value={blank.correctAnswer} onChange={(e) => {
                              const next = [...clozeBlanks];
                              next[blankIdx] = { ...next[blankIdx], correctAnswer: e.target.value };
                              setClozeBlanks(next);
                            }} placeholder="assess" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* BOWTIE */}
              {currentQuestion.type === 'bowtie' && (
                <div className="form-group">
                  <label className="form-label">Bowtie Choices</label>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Potential Conditions</label>
                      {currentQuestion.bowtieCondition.map((opt, idx) => (
                        <input
                          key={`condition-${idx}`}
                          type="text"
                          className="form-control mb-2"
                          value={opt}
                          onChange={(e) => {
                            const next = [...currentQuestion.bowtieCondition];
                            next[idx] = e.target.value;
                            handleQuestionChange('bowtieCondition', next);
                          }}
                          placeholder={`Condition option ${idx + 1}`}
                        />
                      ))}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Actions to Take</label>
                      {currentQuestion.bowtieActions.map((opt, idx) => (
                        <input
                          key={`action-${idx}`}
                          type="text"
                          className="form-control mb-2"
                          value={opt}
                          onChange={(e) => {
                            const next = [...currentQuestion.bowtieActions];
                            next[idx] = e.target.value;
                            handleQuestionChange('bowtieActions', next);
                          }}
                          placeholder={`Action option ${idx + 1}`}
                        />
                      ))}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Parameters to Monitor</label>
                      {currentQuestion.bowtieParameters.map((opt, idx) => (
                        <input
                          key={`parameter-${idx}`}
                          type="text"
                          className="form-control mb-2"
                          value={opt}
                          onChange={(e) => {
                            const next = [...currentQuestion.bowtieParameters];
                            next[idx] = e.target.value;
                            handleQuestionChange('bowtieParameters', next);
                          }}
                          placeholder={`Parameter option ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="row g-3 mt-1">
                    <div className="col-md-4">
                      <label className="form-label">Correct Condition</label>
                      <select
                        className="form-control"
                        value={currentQuestion.correctAnswer?.condition || ''}
                        onChange={(e) => handleQuestionChange('correctAnswer', {
                          ...(currentQuestion.correctAnswer || {}),
                          condition: e.target.value
                        })}
                      >
                        <option value="">Select correct condition</option>
                        {currentQuestion.bowtieCondition.filter(Boolean).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Correct Actions (2)</label>
                      <select className="form-control mb-2" value={currentQuestion.correctAnswer?.actionLeft || ''} onChange={(e) => handleQuestionChange('correctAnswer', { ...(currentQuestion.correctAnswer || {}), actionLeft: e.target.value })}>
                        <option value="">Action slot 1</option>
                        {currentQuestion.bowtieActions.filter(Boolean).map((opt) => <option key={`left-${opt}`} value={opt}>{opt}</option>)}
                      </select>
                      <select className="form-control" value={currentQuestion.correctAnswer?.actionRight || ''} onChange={(e) => handleQuestionChange('correctAnswer', { ...(currentQuestion.correctAnswer || {}), actionRight: e.target.value })}>
                        <option value="">Action slot 2</option>
                        {currentQuestion.bowtieActions.filter(Boolean).map((opt) => <option key={`right-${opt}`} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Correct Parameters (2)</label>
                      <select className="form-control mb-2" value={currentQuestion.correctAnswer?.parameterLeft || ''} onChange={(e) => handleQuestionChange('correctAnswer', { ...(currentQuestion.correctAnswer || {}), parameterLeft: e.target.value })}>
                        <option value="">Parameter slot 1</option>
                        {currentQuestion.bowtieParameters.filter(Boolean).map((opt) => <option key={`pl-${opt}`} value={opt}>{opt}</option>)}
                      </select>
                      <select className="form-control" value={currentQuestion.correctAnswer?.parameterRight || ''} onChange={(e) => handleQuestionChange('correctAnswer', { ...(currentQuestion.correctAnswer || {}), parameterRight: e.target.value })}>
                        <option value="">Parameter slot 2</option>
                        {currentQuestion.bowtieParameters.filter(Boolean).map((opt) => <option key={`pr-${opt}`} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* MATRIX QUESTION BUILDER */}
              {currentQuestion.type === 'matrix' && (
                <div className="form-group" style={{ background: '#f0f9ff', padding: '16px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                  <label className="form-label" style={{ fontWeight: 700, color: '#0369a1', marginBottom: '12px', display: 'block' }}>
                    Matrix Configuration
                  </label>

                  {/* Column Headers */}
                  <div style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ fontSize: '0.85rem' }}>Column Headers</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(currentQuestion.matrixColumns || ['Column 1', 'Column 2', 'Column 3']).map((col, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            style={{ width: '140px' }}
                            value={col}
                            onChange={(e) => {
                              const next = [...(currentQuestion.matrixColumns || ['Column 1', 'Column 2', 'Column 3'])];
                              next[idx] = e.target.value;
                              handleQuestionChange('matrixColumns', next);
                            }}
                            placeholder={`Col ${idx + 1}`}
                          />
                          {(currentQuestion.matrixColumns || []).length > 2 && (
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => {
                              const next = (currentQuestion.matrixColumns || []).filter((_, i) => i !== idx);
                              handleQuestionChange('matrixColumns', next);
                            }} style={{ padding: '2px 6px' }}>×</button>
                          )}
                        </div>
                      ))}
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => {
                        const next = [...(currentQuestion.matrixColumns || ['Column 1', 'Column 2', 'Column 3']), `Column ${(currentQuestion.matrixColumns || []).length + 1}`];
                        handleQuestionChange('matrixColumns', next);
                      }} style={{ padding: '2px 8px' }}>+ Col</button>
                    </div>
                  </div>

                  {/* Rows */}
                  <div>
                    <label className="form-label" style={{ fontSize: '0.85rem' }}>Rows (each row is one matching task)</label>
                    {(currentQuestion.matrixRows || []).map((row, rowIdx) => (
                      <div key={rowIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, color: '#64748b', minWidth: '20px' }}>{rowIdx + 1}.</span>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          style={{ flex: 1 }}
                          value={row.rowText || ''}
                          onChange={(e) => {
                            const next = [...(currentQuestion.matrixRows || [])];
                            next[rowIdx] = { ...next[rowIdx], rowText: e.target.value };
                            handleQuestionChange('matrixRows', next);
                          }}
                          placeholder="Row description..."
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                          {(currentQuestion.matrixColumns || ['Column 1', 'Column 2', 'Column 3']).map((col, cIdx) => {
                            const isSelected = Array.isArray(row.correctColumns) && row.correctColumns.includes(cIdx);
                            return (
                              <label key={cIdx} style={{
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
                                    const next = [...(currentQuestion.matrixRows || [])];
                                    const current = Array.isArray(next[rowIdx].correctColumns) ? [...next[rowIdx].correctColumns] : (next[rowIdx].correctColumn !== undefined ? [next[rowIdx].correctColumn] : []);
                                    if (isSelected) {
                                      next[rowIdx] = { ...next[rowIdx], correctColumns: current.filter(c => c !== cIdx) };
                                    } else {
                                      next[rowIdx] = { ...next[rowIdx], correctColumns: [...current, cIdx] };
                                    }
                                    handleQuestionChange('matrixRows', next);
                                  }}
                                  style={{ margin: 0 }}
                                />
                                {col}
                              </label>
                            );
                          })}
                        </div>
                        {(currentQuestion.matrixRows || []).length > 1 && (
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => {
                            const next = (currentQuestion.matrixRows || []).filter((_, i) => i !== rowIdx);
                            handleQuestionChange('matrixRows', next);
                          }} style={{ padding: '2px 6px' }}>×</button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="btn btn-sm btn-outline-primary mt-2" onClick={() => {
                      const next = [...(currentQuestion.matrixRows || []), { rowText: '', correctColumns: [0] }];
                      handleQuestionChange('matrixRows', next);
                    }}>+ Add Row</button>
                  </div>

                  {/* Preview Table */}
                  {(currentQuestion.matrixRows || []).length > 0 && (currentQuestion.matrixColumns || []).length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>Preview</label>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '6px 10px', background: '#0369a1', color: '#fff', textAlign: 'left', borderRadius: '4px 0 0 0' }}>Row</th>
                              {(currentQuestion.matrixColumns || []).map((col, cIdx) => (
                                <th key={cIdx} style={{ padding: '6px 10px', background: '#0369a1', color: '#fff', textAlign: 'center' }}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(currentQuestion.matrixRows || []).map((row, rIdx) => (
                              <tr key={rIdx}>
                                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: 500 }}>{row.rowText || `Row ${rIdx + 1}`}</td>
                                {(currentQuestion.matrixColumns || []).map((_, cIdx) => (
                                  <td key={cIdx} style={{
                                    padding: '6px 10px',
                                    border: '1px solid #e2e8f0',
                                    textAlign: 'center',
                                    background: Array.isArray(row.correctColumns) && row.correctColumns.includes(cIdx) ? '#dcfce7' : '#fff'
                                  }}>
                                    {Array.isArray(row.correctColumns) && row.correctColumns.includes(cIdx) ? '✓' : ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Auto-set correctAnswer from matrixRows */}
                  {((currentQuestion.matrixRows || []).length > 0) && (
                    <input type="hidden" value={JSON.stringify((currentQuestion.matrixRows || []).map(r => r.correctColumns || (r.correctColumn !== undefined ? [r.correctColumn] : [])))} readOnly />
                  )}
                </div>
              )}

              {caseStudy.sections.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Visible Patient Tabs for this Question</label>
                  <div className="row g-2">
                    {caseStudy.sections.map((section) => (
                      <div key={section.sectionId} className="col-md-4">
                        <label className="form-label d-flex align-items-center gap-2">
                          <input
                            type="checkbox"
                            checked={currentQuestion.visibleSectionIds.includes(section.sectionId)}
                            onChange={(e) => {
                              const nextIds = e.target.checked
                                ? [...currentQuestion.visibleSectionIds, section.sectionId]
                                : currentQuestion.visibleSectionIds.filter((id) => id !== section.sectionId);
                              handleQuestionChange('visibleSectionIds', nextIds);
                            }}
                          />
                          <span>{section.title}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <small className="text-muted">
                    Example: show Nurses&apos; Notes only on question 3, Lab Results on question 2, etc.
                  </small>
                </div>
              )}

              {/* Correct Answer for MC - removed: only matrix in case studies */}
              <div className="form-group">
                <label className="form-label">Rationale</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={currentQuestion.rationale}
                  onChange={(e) => handleQuestionChange('rationale', e.target.value)}
                  placeholder="Explain the correct answer..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Difficulty</label>
                <select
                  className="form-control"
                  value={currentQuestion.difficulty}
                  onChange={(e) => handleQuestionChange('difficulty', e.target.value)}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <button type="button" className="btn btn-primary" onClick={addQuestion}>
                {editingQuestionIndex >= 0 ? 'Save Question Changes' : 'Add Question to Case Study'}
              </button>
              {editingQuestionIndex >= 0 && (
                <button
                  type="button"
                  className="btn btn-secondary ms-2"
                  onClick={openNewQuestionTab}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="mt-4 d-flex justify-content-between">
              <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('sections')}>
                Previous: Sections
              </button>
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'Saving...' : (isEditing ? 'Update Case Study' : 'Create Case Study')}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default CaseStudyBuilder;
