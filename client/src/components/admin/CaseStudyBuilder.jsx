import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { CATEGORIES } from '../../constants/Categories';

const CASE_STUDY_TYPES = [
  { value: '6-question', label: 'Layered Case Study' },
  { value: 'bowtie', label: 'Bowtie' },
  { value: 'trend', label: 'Trend' },
];

const QUESTION_TYPES = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'sata', label: 'SATA' },
  { value: 'fill-blank', label: 'Fill in the Blank' },
  { value: 'highlight', label: 'Highlight' },
  { value: 'drag-drop', label: 'Drag & Drop' },
  { value: 'matrix', label: 'Matrix' },
];

const HEMODYNAMIC_LAYERED_TEMPLATE = {
  title: 'Layered Case Study: Pneumonia with Early Septic Shock',
  type: '6-question',
  category: 'Case Studies',
  subcategory: 'Layered Case Study',
  scenario:
    'A 67-year-old client is admitted to the medical unit with community-acquired pneumonia. Past medical history includes hypertension and type 2 diabetes. Initial vital signs on admission: Temperature 38.8°C (101.8°F), Heart rate 108 bpm, Respiratory rate 24/min, Blood pressure 102/64 mmHg, SpO₂ 93% on room air. The client reports weakness, chills, and shortness of breath.',
  sections: [
    {
      title: 'Initial Vital Signs',
      content: 'Temp 38.8°C, HR 108 bpm, RR 24/min, BP 102/64 mmHg, SpO₂ 93% on room air'
    },
    {
      title: 'Clinical Concern',
      content: 'Nurse suspects early sepsis progression with risk for septic shock and tissue hypoperfusion.'
    }
  ],
  questions: [
    {
      type: 'sata',
      category: 'Case Studies',
      subcategory: 'Layered Case Study',
      questionText: 'Which findings indicate potential hemodynamic instability? (Select all that apply).',
      options: [
        'A. Temperature 38.8°C',
        'B. Heart rate 108 bpm',
        'C. Blood pressure 102/64 mmHg',
        'D. Respiratory rate 24/min',
        'E. Oxygen saturation 93%',
        'F. History of hypertension'
      ],
      correctAnswer: ['A', 'B', 'C', 'D', 'E'],
      rationale:
        'Correct: A, B, C, D, E. Fever, tachycardia, soft blood pressure, tachypnea, and mild hypoxia are current instability cues in possible sepsis. F is a risk factor/history item, not current evidence of instability.',
      difficulty: 'medium'
    },
    {
      type: 'multiple-choice',
      category: 'Case Studies',
      subcategory: 'Layered Case Study',
      questionText: 'The nurse suspects early septic shock. Which pathophysiologic process is most likely occurring?',
      options: [
        'A. Increased systemic vascular resistance causing hypertension',
        'B. Systemic vasodilation causing decreased tissue perfusion',
        'C. Increased preload leading to pulmonary edema',
        'D. Decreased heart rate leading to reduced cardiac output'
      ],
      correctAnswer: 'B',
      rationale:
        'Septic shock is classically low-SVR (vasodilatory) shock early. Inflammatory mediators cause vasodilation and capillary leak, reducing effective perfusion despite compensatory tachycardia/tachypnea.',
      difficulty: 'medium'
    },
    {
      type: 'multiple-choice',
      category: 'Case Studies',
      subcategory: 'Layered Case Study',
      questionText: 'Four clients are assigned to the nurse. Which client should the nurse assess first?',
      options: [
        'A. Pneumonia patient with BP 88/50, HR 124, confused',
        'B. COPD patient with SpO₂ 90% on 2 L nasal cannula',
        'C. Postoperative patient reporting pain 8/10',
        'D. Client with fever 38.3°C receiving antibiotics'
      ],
      correctAnswer: 'A',
      rationale:
        'Hypotension + tachycardia + altered mentation indicate immediate perfusion threat and likely shock (ABCs/Circulation priority).',
      difficulty: 'medium'
    },
    {
      type: 'sata',
      category: 'Case Studies',
      subcategory: 'Layered Case Study',
      questionText:
        "The pneumonia patient's condition worsens (BP 84/48, HR 126, RR 28, SpO₂ 90% on 2 L, urine output 20 mL/hr). Which interventions should be implemented immediately? (Select all that apply).",
      options: [
        'A. Increase oxygen to 4 L nasal cannula',
        'B. Administer 30 mL/kg IV normal saline bolus',
        'C. Place the client in Trendelenburg position',
        'D. Obtain blood cultures',
        'E. Prepare to administer IV broad-spectrum antibiotics',
        'F. Restrict fluids'
      ],
      correctAnswer: ['A', 'B', 'D', 'E'],
      rationale:
        'Septic shock priorities: oxygen support, rapid fluid resuscitation, blood cultures, and early broad-spectrum antibiotics. Trendelenburg is not recommended; fluid restriction is inappropriate with hypotension/low urine output.',
      difficulty: 'hard'
    },
    {
      type: 'multiple-choice',
      category: 'Case Studies',
      subcategory: 'Layered Case Study',
      questionText:
        'Despite fluid bolus, client remains hypotensive (BP 82/46, HR 132). Provider prescribes norepinephrine infusion. Which action is most appropriate?',
      options: [
        'A. Administer norepinephrine through a peripheral IV at maximum rate',
        'B. Initiate infusion using an infusion pump and titrate to maintain MAP ≥ 65',
        'C. Administer the medication as a rapid IV push',
        'D. Hold the medication until blood pressure improves'
      ],
      correctAnswer: 'B',
      rationale:
        'Norepinephrine is first-line vasopressor in septic shock. Administer by controlled infusion pump and titrate to perfusion target (commonly MAP ≥ 65), with close monitoring.',
      difficulty: 'hard'
    },
    {
      type: 'multiple-choice',
      category: 'Case Studies',
      subcategory: 'Layered Case Study',
      questionText:
        "After treatment (BP 104/66, HR 98, urine output 45 mL/hr, SpO₂ 95% on 3 L), which finding best indicates improved hemodynamic stability?",
      options: [
        'A. Decreased heart rate',
        'B. Urine output greater than 30 mL/hr',
        'C. Improved oxygen saturation',
        'D. Normal temperature'
      ],
      correctAnswer: 'B',
      rationale:
        'Urine output > 30 mL/hr is a strong perfusion endpoint and best marker of improved hemodynamic stability.\n\nReasoning Tip:\nHemodynamic instability clues: ↓ BP/soft BP, ↑ HR, ↑ RR, confusion, urine output < 30 mL/hr, cool clammy (some shocks) or warm vasodilated (early sepsis).\nSeptic shock priorities: O₂ → fluids 30 mL/kg → cultures → antibiotics → vasopressor to MAP ≥ 65 → monitor perfusion (UO/mentation/lactate reduction).',
      difficulty: 'medium'
    }
  ],
  isActive: true
};

const CaseStudyBuilder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams(); // for editing
  const editingId = id || location?.state?.caseStudyId || '';
  const isEditing = Boolean(editingId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details'); // details, sections, questions

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

  // For adding new questions
  const [currentQuestion, setCurrentQuestion] = useState({
    type: 'multiple-choice',
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    rationale: '',
    difficulty: 'medium',
    highlightStart: 0,
    highlightEnd: 0,
  });
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(-1);
  const [activeQuestionTab, setActiveQuestionTab] = useState('new');

  const getEmptyQuestion = () => ({
    type: 'multiple-choice',
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    rationale: '',
    difficulty: 'medium',
    highlightStart: 0,
    highlightEnd: 0,
  });

  useEffect(() => {
    if (isEditing) {
      fetchCaseStudy();
    }
  }, [editingId]);

  const fetchCaseStudy = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get(`/api/admin/case-studies/${editingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCaseStudy(response.data);
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
      sections: [...prev.sections, newSection]
    }));
    setNewSection({ title: '', content: '' });
  };

  const removeSection = (index) => {
    setCaseStudy(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
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

    if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'sata') {
      const validOptions = currentQuestion.options.filter(opt => opt.trim() !== '');
      if (validOptions.length < 2) {
        alert('Please enter at least 2 options');
        return;
      }
    }

    if (currentQuestion.type === 'matrix') {
      alert('Matrix questions are disabled in Case Study Builder.');
      return;
    }

    const normalizedQuestion = {
      ...currentQuestion,
      category: caseStudy.category,
      subcategory: caseStudy.subcategory,
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
      options: Array.isArray(nextQuestion.options) && nextQuestion.options.length ? nextQuestion.options : ['', '', '', ''],
      highlightStart: Number(nextQuestion.highlightStart || 0),
      highlightEnd: Number(nextQuestion.highlightEnd || 0),
      matrixColumns: Array.isArray(nextQuestion.matrixColumns) ? nextQuestion.matrixColumns : [],
      matrixRows: Array.isArray(nextQuestion.matrixRows) ? nextQuestion.matrixRows : [],
    });
    setEditingQuestionIndex(index);
    setActiveQuestionTab(index);
    setActiveTab('questions');
  };

  const openNewQuestionTab = () => {
    setCurrentQuestion(getEmptyQuestion());
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
      navigate('/admin/dashboard?section=case-studies');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save case study');
    } finally {
      setLoading(false);
    }
  };

  const loadHemodynamicTemplate = () => {
    setCaseStudy({
      ...HEMODYNAMIC_LAYERED_TEMPLATE
    });
    setActiveTab('details');
    setEditingQuestionIndex(-1);
    setCurrentQuestion(getEmptyQuestion());
    setActiveQuestionTab('new');
    setError('');
  };

  if (loading && isEditing) return <div>Loading case study...</div>;

  return (
    <div className="case-study-builder">
      <h2>{isEditing ? 'Edit Case Study' : 'Create New Case Study'}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {!isEditing && (
        <div className="mb-3">
          <button type="button" className="btn btn-outline-primary" onClick={loadHemodynamicTemplate}>
            Load Layered Septic-Shock Template
          </button>
        </div>
      )}

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
                  <div className="card-body d-flex justify-content-between align-items-center">
                    <div>
                      <h6>{section.title}</h6>
                      <p className="mb-0 small">{section.content.substring(0, 100)}...</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => removeSection(index)}
                    >
                      Remove
                    </button>
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

              {/* Options for MC/SATA */}
              {(currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'sata') && (
                <div className="form-group">
                  <label className="form-label">Options</label>
                  {currentQuestion.options.map((opt, idx) => (
                    <div key={idx} className="input-group mb-2">
                      <span className="input-group-text">{String.fromCharCode(65 + idx)}</span>
                      <input
                        type="text"
                        className="form-control"
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      />
                      {currentQuestion.options.length > 2 && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => removeOption(idx)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="btn btn-sm btn-primary" onClick={addOption}>
                    Add Option
                  </button>
                </div>
              )}

              {/* Correct Answer for MC */}
              {currentQuestion.type === 'multiple-choice' && (
                <div className="form-group">
                  <label className="form-label">Correct Answer</label>
                  <select
                    className="form-control"
                    value={currentQuestion.correctAnswer}
                    onChange={(e) => handleQuestionChange('correctAnswer', e.target.value)}
                  >
                    <option value="">Select correct answer</option>
                    {currentQuestion.options.map((_, idx) => (
                      <option key={idx} value={String.fromCharCode(65 + idx)}>
                        {String.fromCharCode(65 + idx)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* SATA correct answers */}
              {currentQuestion.type === 'sata' && (
                <div className="form-group">
                  <label className="form-label">Correct Answers (check all that apply)</label>
                  <div className="sata-options">
                    {currentQuestion.options.map((opt, idx) => (
                      <div key={idx} className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`sata-${idx}`}
                          value={String.fromCharCode(65 + idx)}
                          checked={currentQuestion.correctAnswer?.includes(String.fromCharCode(65 + idx))}
                          onChange={(e) => {
                            const value = e.target.value;
                            const current = currentQuestion.correctAnswer || [];
                            if (e.target.checked) {
                              handleQuestionChange('correctAnswer', [...current, value]);
                            } else {
                              handleQuestionChange('correctAnswer', current.filter(v => v !== value));
                            }
                          }}
                        />
                        <label className="form-check-label" htmlFor={`sata-${idx}`}>
                          {String.fromCharCode(65 + idx)}. {opt || `Option ${idx + 1}`}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fill in Blank */}
              {currentQuestion.type === 'fill-blank' && (
                <div className="form-group">
                  <label className="form-label">Correct Answer</label>
                  <input
                    type="text"
                    className="form-control"
                    value={currentQuestion.correctAnswer}
                    onChange={(e) => handleQuestionChange('correctAnswer', e.target.value)}
                    placeholder="Enter the correct answer"
                  />
                  <small className="text-muted">For multiple answers, separate with semicolons</small>
                </div>
              )}

              {currentQuestion.type === 'matrix' && (
                <div className="alert alert-warning">
                  Matrix question setup is disabled in Case Study Builder.
                </div>
              )}
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

