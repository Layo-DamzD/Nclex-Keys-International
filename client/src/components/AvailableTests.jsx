import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AvailableTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [proctorWarningTest, setProctorWarningTest] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/student/available-tests', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTests(response.data);
      } catch (error) {
        console.error('Error fetching tests:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  const handleStartTest = async (testId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/student/test/${testId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const test = response.data;
      
      const questions = test.questions.map(q => ({
        _id: q._id,
        type: q.type,
        questionText: q.questionText,
        questionImageUrl: q.questionImageUrl,
        options: q.options,
        correctAnswer: q.correctAnswer,
        rationale: q.rationale,
        rationaleImageUrl: q.rationaleImageUrl,
        highlightStart: q.highlightStart,
        highlightEnd: q.highlightEnd,
        highlightSelectableWords: q.highlightSelectableWords,
        highlightCorrectWords: q.highlightCorrectWords,
        matrixRows: q.matrixRows,
        matrixColumns: q.matrixColumns,
        hotspotImageUrl: q.hotspotImageUrl,
        hotspotTargets: q.hotspotTargets,
        clozeTemplate: q.clozeTemplate,
        clozeBlanks: q.clozeBlanks,
        category: q.category,
        subcategory: q.subcategory,
        clientNeed: q.clientNeed,
        clientNeedSubcategory: q.clientNeedSubcategory,
        scenario: q.scenario,
        sections: q.sections,
        questions: q.questions,
        isNextGen: q.isNextGen,
      }));

      const settings = {
        timed: true,
        tutorMode: false,
        totalQuestions: questions.length,
        timeLimit: test.duration,
        testName: test.title,
        testId: test._id,
        fromPreparedTest: true,
        proctored: Boolean(test.proctored),
      };

      navigate('/test-session', { state: { questions, settings } });
    } catch (error) {
      console.error('Error starting test:', error);
      alert('Failed to load test. Please try again.');
    }
  };

  const filteredTests = tests.filter(test =>
    test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    test.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="data-table"><p>Loading tests...</p></div>;

  return (
    <div className="data-table">
      <div className="table-header available-tests-header mb-4">
        <h4 className="mb-0">Available Tests</h4>
        <div className="input-group available-tests-search-group" style={{ width: 'min(300px, 100%)' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search tests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="btn btn-outline-primary">Search</button>
        </div>
      </div>

      {filteredTests.length === 0 ? (
        <p className="text-muted">No tests available</p>
      ) : (
        filteredTests.map(test => (
          <div className="test-card" key={test._id}>
            <div className="d-flex justify-content-between align-items-start mb-2">
              <h4>{test.title}</h4>
              <div className="d-flex gap-2">
                <span className="badge bg-primary">{test.category}</span>
                {test.proctored && <span className="badge bg-warning text-dark">Proctored</span>}
              </div>
            </div>
            <p className="text-muted">{test.description}</p>
            <div className="test-meta">
              <span><i className="fas fa-question-circle me-1"></i>{test.questionCount} Questions</span>
              <span><i className="fas fa-clock me-1"></i>{test.duration} min</span>
              <span><i className="fas fa-trophy me-1"></i>Pass: {test.passingScore}%</span>
            </div>
            <button
              className="start-test-btn"
              onClick={() => {
                if (test.proctored) {
                  setProctorWarningTest(test);
                  return;
                }
                handleStartTest(test._id);
              }}
            >
              <i className="fas fa-play me-1"></i>Start Test
            </button>
          </div>
        ))
      )}


      {proctorWarningTest && (
        <div className="student-notification-popup-overlay" role="dialog" aria-modal="true" aria-label="Proctored test warning">
          <div className="student-notification-popup-backdrop" onClick={() => setProctorWarningTest(null)} />
          <div className="student-notification-popup-card">
            <div className="student-notification-popup-header">
              <div className="student-notification-popup-icon"><i className="fas fa-shield-alt" /></div>
              <div>
                <div className="student-notification-popup-eyebrow">Proctored Test</div>
                <h3>Read before you continue</h3>
              </div>
            </div>
            <div className="student-notification-popup-body">
              <ul style={{ marginBottom: 0, paddingLeft: '18px' }}>
                <li>Fullscreen is required throughout this test.</li>
                <li>Switching tabs, minimizing, or exiting fullscreen will trigger violations.</li>
                <li>Camera and microphone access are required.</li>
                <li>Periodic webcam snapshots will be captured for proctoring review.</li>
                <li>Repeated violations may auto-submit your test.</li>
              </ul>
            </div>
            <div className="student-notification-popup-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setProctorWarningTest(null)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const testId = proctorWarningTest?._id;
                  setProctorWarningTest(null);
                  if (testId) handleStartTest(testId);
                }}
              >I Understand, Start Test</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AvailableTests;
