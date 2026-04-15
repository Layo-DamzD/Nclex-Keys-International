import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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
      { rowText: '', correctColumn: 0 },
      { rowText: '', correctColumn: 0 },
    ],
    rationale: '',
    difficulty: 'medium',
  });
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(-1);
  const [activeQuestionTab, setActiveQuestionTab] = useState('new');

  const getEmptyQuestion = () => ({
    type: 'matrix',
    questionText: '',
    options: [],
    correctAnswer: [],
    visibleSectionIds: [],
    matrixColumns: ['Column 1', 'Column 2', 'Column 3'],
    matrixRows: [
      { rowText: '', correctColumn: 0 },
      { rowText: '', correctColumn: 0 },
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

    // Matrix validation
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
      // Auto-set correctAnswer from matrixRows
      currentQuestion.correctAnswer = rows.map(r => r.correctColumn);
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
      matrixRows: Array.isArray(nextQuestion.matrixRows) && nextQuestion.matrixRows.length ? nextQuestion.matrixRows : [{ rowText: '', correctColumn: 0 }, { rowText: '', correctColumn: 0 }],
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

              {/* Options for MC/SATA - removed: only matrix in case studies */}
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
                        <select
                          className="form-control form-control-sm"
                          style={{ width: '140px' }}
                          value={row.correctColumn ?? 0}
                          onChange={(e) => {
                            const next = [...(currentQuestion.matrixRows || [])];
                            next[rowIdx] = { ...next[rowIdx], correctColumn: Number(e.target.value) };
                            handleQuestionChange('matrixRows', next);
                          }}
                        >
                          {(currentQuestion.matrixColumns || ['Column 1', 'Column 2', 'Column 3']).map((col, cIdx) => (
                            <option key={cIdx} value={cIdx}>{col}</option>
                          ))}
                        </select>
                        {(currentQuestion.matrixRows || []).length > 1 && (
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => {
                            const next = (currentQuestion.matrixRows || []).filter((_, i) => i !== rowIdx);
                            handleQuestionChange('matrixRows', next);
                          }} style={{ padding: '2px 6px' }}>×</button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="btn btn-sm btn-outline-primary mt-2" onClick={() => {
                      const next = [...(currentQuestion.matrixRows || []), { rowText: '', correctColumn: 0 }];
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
                                    background: row.correctColumn === cIdx ? '#dcfce7' : '#fff'
                                  }}>
                                    {row.correctColumn === cIdx ? '✓' : ''}
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
                    <input type="hidden" value={JSON.stringify((currentQuestion.matrixRows || []).map(r => r.correctColumn))} readOnly />
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
