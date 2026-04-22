import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CATEGORIES } from '../../constants/Categories';
import { NCLEX_CLIENT_NEEDS_CATEGORIES } from '../../constants/ClientNeeds';

const CreateTest = () => {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('adminUser') || '{}');
  const userRole = user.role;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [filters, setFilters] = useState({ categoryType: 'subject', category: '', subcategory: '', clientNeed: '', type: '', difficulty: '' });

  const [testData, setTestData] = useState({
    title: '',
    description: '',
    category: '',
    duration: 60,
    passingScore: 70,
    assignmentType: userRole === 'superadmin' ? 'all' : 'individual', // 'all' or 'individual'
    assignedStudents: [],
    proctored: false,
    maxAttempts: 0,
  });

  // Fetch students for individual assignment
  useEffect(() => {
    if (testData.assignmentType === 'individual') {
      fetchStudents();
    }
  }, [testData.assignmentType]);

  // Fetch questions based on filters
  useEffect(() => {
    fetchQuestions();
  }, [filters]);

  const fetchStudents = async () => {
    setStudentsLoading(true);
    setStudentsError('');
    try {
      const adminToken = sessionStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/students', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setStudents(response.data);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      setStudents([]);
      setStudentsError(err.response?.data?.message || 'Failed to load students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const adminToken = sessionStorage.getItem('adminToken');
      const params = new URLSearchParams({
        limit: '100',
        ...(filters.categoryType === 'subject' && filters.category && { category: filters.category }),
        ...(filters.categoryType === 'subject' && filters.subcategory && { subcategory: filters.subcategory }),
        ...(filters.categoryType === 'clientNeed' && filters.clientNeed && { clientNeed: filters.clientNeed }),
        ...(filters.type && { type: filters.type }),
        ...(filters.difficulty && { difficulty: filters.difficulty }),
      });
      const response = await axios.get(`/api/admin/questions?${params}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setQuestions(response.data.questions || []);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    }
  };

  const handleTestDataChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTestData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAssignmentTypeChange = (type) => {
    setTestData(prev => ({
      ...prev,
      assignmentType: type,
      assignedStudents: type === 'individual' ? [] : []
    }));
  };

  const toggleQuestionSelection = (questionId) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!testData.title) {
      setError('Please enter a test title');
      return;
    }
    if (selectedQuestions.length === 0) {
      setError('Please select at least one question');
      return;
    }
    if (testData.assignmentType === 'individual' && testData.assignedStudents.length === 0) {
      setError('Please select at least one student');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.post('/api/admin/tests', {
        ...testData,
        questions: selectedQuestions,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Test created successfully!');
      navigate('/admin/dashboard?section=questions');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-test">
      <h2>Create New Test</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit} className="form-card">
        {/* Test Details */}
        <div className="form-group">
          <label className="form-label">Test Title</label>
          <input
            type="text"
            name="title"
            className="form-control"
            value={testData.title}
            onChange={handleTestDataChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            name="description"
            className="form-control"
            rows="3"
            value={testData.description}
            onChange={handleTestDataChange}
          />
        </div>

        <div className="upload-grid-two">
          <div className="form-group">
            <label className="form-label">Duration (minutes)</label>
            <input
              type="number"
              name="duration"
              className="form-control"
              min="1"
              value={testData.duration}
              onChange={handleTestDataChange}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Passing Score (%)</label>
            <input
              type="number"
              name="passingScore"
              className="form-control"
              min="0"
              max="100"
              value={testData.passingScore}
              onChange={handleTestDataChange}
              required
            />
          </div>
        </div>

        <div className="upload-grid-two">
          <div className="form-group">
            <label className="form-label">Max Attempts (0 = unlimited)</label>
            <input
              type="number"
              name="maxAttempts"
              className="form-control"
              min="0"
              value={testData.maxAttempts}
              onChange={handleTestDataChange}
            />
            <small className="text-muted">How many times students can take this test. Set to 0 for unlimited. Once exhausted, the test disappears from their Available Tests but results remain in history.</small>
          </div>
          <div className="form-group"></div>
        </div>


        <div className="form-group" style={{ border: '2px solid #0d6efd', borderRadius: '10px', padding: '12px 14px', background: '#f5f9ff' }}>
          <div className="form-check" style={{ marginBottom: '4px' }}>
            <input
              type="checkbox"
              name="proctored"
              id="proctored"
              className="form-check-input"
              checked={Boolean(testData.proctored)}
              onChange={handleTestDataChange}
              style={{ transform: 'scale(1.2)', marginTop: '0.35rem' }}
            />
            <label className="form-check-label fw-bold fs-5" htmlFor="proctored" style={{ color: '#0b3d91' }}>
              Make this exam proctored
            </label>
          </div>
          <small className="text-muted">
            If enabled, students must pass camera, microphone and fullscreen checks before starting.
          </small>
        </div>

        {/* Assignment Type - Role Based */}
        <div className="form-group">
          <label className="form-label">Assign To</label>
          <div className="assignment-type-selector">
            {userRole === 'superadmin' && (
              <label className="radio-inline me-3">
                <input
                  type="radio"
                  name="assignmentType"
                  value="all"
                  checked={testData.assignmentType === 'all'}
                  onChange={() => handleAssignmentTypeChange('all')}
                /> All Students
              </label>
            )}
            <label className="radio-inline">
              <input
                type="radio"
                name="assignmentType"
                value="individual"
                checked={testData.assignmentType === 'individual'}
                onChange={() => handleAssignmentTypeChange('individual')}
              /> Individual Students
            </label>
          </div>
        </div>

        {/* Student Selection - Only for Individual Assignment */}
        {testData.assignmentType === 'individual' && (
          <div className="form-group">
            <label className="form-label">Select Students</label>
            <div className="student-selection" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px' }}>
              {studentsLoading ? (
                <p className="text-muted">Loading students...</p>
              ) : studentsError ? (
                <div>
                  <p className="text-danger mb-2">{studentsError}</p>
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={fetchStudents}>
                    Retry
                  </button>
                </div>
              ) : students.length === 0 ? (
                <p className="text-muted">No students found.</p>
              ) : (
                students.map(student => (
                  <div key={student._id} className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id={`student-${student._id}`}
                      checked={testData.assignedStudents.includes(student._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTestData(prev => ({
                            ...prev,
                            assignedStudents: [...prev.assignedStudents, student._id]
                          }));
                        } else {
                          setTestData(prev => ({
                            ...prev,
                            assignedStudents: prev.assignedStudents.filter(id => id !== student._id)
                          }));
                        }
                      }}
                    />
                    <label className="form-check-label" htmlFor={`student-${student._id}`}>
                      {student.name} ({student.email})
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Question Filters */}
        <div className="form-group">
          <label className="form-label">Filter Questions</label>
          <div className="upload-grid-four" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
            <select
              className="form-control"
              value={filters.categoryType}
              onChange={(e) => setFilters({ ...filters, categoryType: e.target.value, category: '', subcategory: '', clientNeed: '' })}
            >
              <option value="subject">By Subject</option>
              <option value="clientNeed">By Client Need</option>
            </select>
            {filters.categoryType === 'subject' ? (
              <>
                <select
                  className="form-control"
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value, subcategory: '' })}
                >
                  <option value="">All Subjects</option>
                  {Object.keys(CATEGORIES).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  className="form-control"
                  value={filters.subcategory}
                  onChange={(e) => setFilters({ ...filters, subcategory: e.target.value })}
                  disabled={!filters.category}
                >
                  <option value="">All Subcategories</option>
                  {filters.category && CATEGORIES[filters.category]?.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <select
                  className="form-control"
                  value={filters.clientNeed}
                  onChange={(e) => setFilters({ ...filters, clientNeed: e.target.value })}
                >
                  <option value="">All Client Needs</option>
                  {NCLEX_CLIENT_NEEDS_CATEGORIES.map(cn => (
                    <option key={cn} value={cn}>{cn}</option>
                  ))}
                </select>
                <div></div>
              </>
            )}
            <select
              className="form-control"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="multiple-choice">Multiple Choice</option>
              <option value="sata">SATA</option>
              <option value="fill-blank">Fill in Blank</option>
              <option value="highlight">Highlight</option>
              <option value="drag-drop">Drag & Drop</option>
              <option value="matrix">Matrix</option>
              <option value="hotspot">Hotspot</option>
              <option value="cloze-dropdown">Cloze Dropdown</option>
              <option value="case-study">Case Study</option>
            </select>
            <select
              className="form-control"
              value={filters.difficulty}
              onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
            >
              <option value="">All Toughness</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

          </div>
        </div>

        {/* Question Selection */}
        <div className="form-group">
          <label className="form-label">Select Questions ({selectedQuestions.length} selected)</label>
          <div className="question-selection" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px' }}>
            {questions.length === 0 ? (
              <p className="text-muted">No questions match your filters</p>
            ) : (
              questions.map(q => (
                <div key={q._id} className="form-check mb-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={`q-${q._id}`}
                    checked={selectedQuestions.includes(q._id)}
                    onChange={() => toggleQuestionSelection(q._id)}
                  />
                  <label className="form-check-label" htmlFor={`q-${q._id}`}>
                    <strong>[{q.type}]</strong> {q.questionText.substring(0, 100)}...
                    <br />
                    <small className="text-muted">{q.category} › {q.subcategory} • {String(q.difficulty || 'medium').toUpperCase()}</small>
                  </label>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="upload-actions">
          <button type="submit" className="btn btn-success" disabled={loading}>
            {loading ? 'Creating...' : 'Create Test'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/dashboard?section=questions')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTest;
