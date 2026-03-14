import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { enableStudentFcm } from '../services/firebaseMessaging';
import StudentSidebar from '../components/StudentSidebar';
import DashboardHeader from '../components/DashboardHeader';
import StatsCards from '../components/StatsCards';
import RecentTests from '../components/RecentTests';
import ActivityFeed from '../components/ActivityFeed';
import AvailableTests from '../components/AvailableTests';
import TestCustomization from '../components/TestCustomization';
import IncorrectQuestions from '../components/IncorrectQuestions';
import PreviousTests from '../components/PreviousTests';
import StudyMaterials from '../components/StudyMaterials';
import PerformanceAnalysis from '../components/PerformanceAnalysis';
import WeeklyReviewPopup from '../components/WeeklyReviewPopup';
import Profile from '../components/Profile';
import StudentFeedbackModal from '../components/StudentFeedbackModal';
import ExamCountdownCelebration from '../components/ExamCountdownCelebration';
import StudentNotificationPopup from '../components/StudentNotificationPopup';

const MOBILE_BREAKPOINT = 992;

const StudentDashboard = () => {
  const { user, loading, refreshUser } = useUser(); // get user from context
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );
  const [daysUntilExam, setDaysUntilExam] = useState('');
  const [daysUntilExamCount, setDaysUntilExamCount] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showExamCelebration, setShowExamCelebration] = useState(false);
  const [examCelebrationDismissed, setExamCelebrationDismissed] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationItems, setNotificationItems] = useState([]);
  const [showPreparedTestAlert, setShowPreparedTestAlert] = useState(false);
  const [preparedTestCount, setPreparedTestCount] = useState(0);
  const [showWelcomeCelebration, setShowWelcomeCelebration] = useState(false);

  // Calculate days until exam based on user.examDate
  useEffect(() => {
    if (user?.examDate) {
      const examDate = new Date(user.examDate);
      const today = new Date();
      const diffTime = examDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysUntilExamCount(diffDays);
      setDaysUntilExam(diffDays > 0 ? `${diffDays} days until exam` : 'Exam passed');
    } else {
      setDaysUntilExamCount(null);
      setDaysUntilExam('No exam date set');
    }
  }, [user?.examDate]);

  useEffect(() => {
    if (loading) return;
    if (activeSection !== 'dashboard') return;
    if (daysUntilExamCount == null || daysUntilExamCount > 5 || daysUntilExamCount < 0) return;
    if (showExamCelebration || examCelebrationDismissed) return;

    setShowExamCelebration(true);
  }, [loading, activeSection, daysUntilExamCount, showExamCelebration, examCelebrationDismissed]);

  useEffect(() => {
    if (daysUntilExamCount == null || daysUntilExamCount > 5 || daysUntilExamCount < 0) {
      setExamCelebrationDismissed(false);
    }
  }, [daysUntilExamCount]);

  const handleCloseExamCelebration = useCallback(() => {
    setShowExamCelebration(false);
    setExamCelebrationDismissed(true);
  }, []);

  useEffect(() => {
    if (!showExamCelebration) return undefined;
    // Parent-side failsafe close (avoids timer reset issues inside heavy animation component).
    const timerId = window.setTimeout(() => {
      handleCloseExamCelebration();
    }, 15000);
    return () => window.clearTimeout(timerId);
  }, [showExamCelebration, handleCloseExamCelebration]);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const handleSectionChange = useCallback((sectionId) => {
    setActiveSection(sectionId);
    if (isMobileViewport) {
      setSidebarCollapsed(true);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobileViewport((prevMobile) => {
        if (prevMobile !== mobile) {
          setSidebarCollapsed(mobile);
        }
        return mobile;
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleSectionEvent = (event) => {
      if (event?.detail) {
        handleSectionChange(event.detail);
      }
    };

    window.addEventListener('student-dashboard:set-section', handleSectionEvent);
    return () => window.removeEventListener('student-dashboard:set-section', handleSectionEvent);
  }, [handleSectionChange]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get('section');
    if (section) {
      handleSectionChange(section);
    }
  }, [location.search, handleSectionChange]);

  useEffect(() => {
    if (loading) return undefined;

    const handleFocus = () => {
      refreshUser();
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshUser();
      }
    }, 20000);

    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loading, refreshUser]);

  useEffect(() => {
    if (loading || !user) return undefined;

    let disposed = false;
    let unsubscribeForeground = null;

    const setupFcm = async () => {
      try {
        const authToken = localStorage.getItem('token');
        if (!authToken) return;

        const result = await enableStudentFcm({
          authToken
        });

        if (!disposed && typeof result?.unsubscribe === 'function') {
          unsubscribeForeground = result.unsubscribe;
        }
      } catch (error) {
        console.error('FCM setup failed:', error);
      }
    };

    setupFcm();

    return () => {
      disposed = true;
      if (typeof unsubscribeForeground === 'function') {
        unsubscribeForeground();
      }
    };
  }, [loading, user?._id]);


  useEffect(() => {
    if (loading || !user?._id) return;

    let mounted = true;
    const checkPreparedTests = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await axios.get('/api/student/available-tests', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const availableTests = Array.isArray(response.data) ? response.data : [];
        if (!mounted || availableTests.length === 0) return;
        setPreparedTestCount(availableTests.length);
        setShowPreparedTestAlert(true);
      } catch (error) {
        console.error('Failed to check prepared tests:', error);
      }
    };

    checkPreparedTests();
    return () => {
      mounted = false;
    };
  }, [loading, user?._id]);

  useEffect(() => {
    if (loading || !user?._id) return;

    const createdAt = user?.createdAt ? new Date(user.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return;

    const accountAgeMs = Date.now() - createdAt.getTime();
    const isNewSignup = accountAgeMs <= 48 * 60 * 60 * 1000;
    if (!isNewSignup) return;

    const seenKey = `student-welcome-celebration:${user._id}`;
    if (localStorage.getItem(seenKey) === 'done') return;

    setShowWelcomeCelebration(true);
    localStorage.setItem(seenKey, 'done');
  }, [loading, user?._id, user?.createdAt]);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="student-dashboard-shell" style={{ display: 'flex', minHeight: '100vh' }}>
      {isMobileViewport && !sidebarCollapsed && (
        <button
          type="button"
          className="student-sidebar-overlay"
          onClick={toggleSidebar}
          aria-label="Close sidebar"
        />
      )}
      <StudentSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        collapsed={sidebarCollapsed}
        toggleSidebar={toggleSidebar}
        user={user || {}}
        isMobileViewport={isMobileViewport}
      />
      
       <WeeklyReviewPopup disabled={showExamCelebration} />
      <ExamCountdownCelebration
        open={showExamCelebration}
        onClose={handleCloseExamCelebration}
        programName={user?.program || 'NCLEX Program'}
        durationMs={15000}
      />
      <StudentNotificationPopup
        enabled={Boolean(user)}
        blocked={showExamCelebration}
        userId={user?._id || user?.id}
        onUnreadCountChange={setUnreadNotificationCount}
        onNotificationListChange={setNotificationItems}
      />
      <StudentFeedbackModal open={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />

      {showPreparedTestAlert && (
        <div className="student-notification-popup-overlay" role="dialog" aria-modal="true" aria-label="Prepared tests available">
          <div className="student-notification-popup-backdrop" onClick={() => setShowPreparedTestAlert(false)} />
          <div className="student-notification-popup-card">
            <div className="student-notification-popup-header">
              <div className="student-notification-popup-icon"><i className="fas fa-bell" /></div>
              <div>
                <div className="student-notification-popup-eyebrow">Tutor Update</div>
                <h3>Prepared test is ready</h3>
              </div>
              <button type="button" className="student-notification-popup-close" onClick={() => setShowPreparedTestAlert(false)} aria-label="Close">
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="student-notification-popup-body">
              <p>Your tutor has prepared {preparedTestCount > 1 ? `${preparedTestCount} tests` : 'a test'} for you. Open <strong>Take Prepared Test</strong> to start now.</p>
            </div>
            <div className="student-notification-popup-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPreparedTestAlert(false)}>Later</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowPreparedTestAlert(false);
                  handleSectionChange('prepared-tests');
                }}
              >Open Prepared Tests</button>
            </div>
          </div>
        </div>
      )}

      {showWelcomeCelebration && (
        <div className="student-notification-popup-overlay" role="dialog" aria-modal="true" aria-label="Welcome celebration">
          <div className="student-notification-popup-backdrop" onClick={() => setShowWelcomeCelebration(false)} />
          <div className="student-notification-popup-card">
            <div className="student-notification-popup-header">
              <div className="student-notification-popup-icon"><i className="fas fa-champagne-glasses" /></div>
              <div>
                <div className="student-notification-popup-eyebrow">🎉 Welcome</div>
                <h3>We are happy to have you on-board!</h3>
              </div>
              <button type="button" className="student-notification-popup-close" onClick={() => setShowWelcomeCelebration(false)} aria-label="Close">
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="student-notification-popup-body">
              <p>Pop champagne 🍾 — your NCLEX journey starts here. We are excited to support your success.</p>
            </div>
            <div className="student-notification-popup-footer">
              <button type="button" className="btn btn-primary" onClick={() => setShowWelcomeCelebration(false)}>Let&apos;s Go</button>
            </div>
          </div>
        </div>
      )}

      {!isMobileViewport && sidebarCollapsed && (
        <button
          onClick={toggleSidebar}
          type="button"
          className="student-sidebar-floating-open-btn"
          style={{
            position: 'fixed',
            left: '12px',
            top: '12px',
            zIndex: 1105
          }}
        >
          <i className="fas fa-bars"></i>
        </button>
      )}

      <main
        className={`main-content ${isMobileViewport ? 'mobile-main-content' : ''}`}
        style={{
          flex: 1,
          marginLeft: isMobileViewport ? '0' : (sidebarCollapsed ? '0' : '260px'),
          transition: 'margin-left 0.3s'
        }}
      >
        <DashboardHeader
          userName={user?.name || 'Student'}
          daysUntilExam={daysUntilExam}
          toggleMobileSidebar={toggleSidebar}
          unreadNotificationCount={unreadNotificationCount}
          notificationItems={notificationItems}
          onOpenFeedback={() => setShowFeedbackModal(true)}
          onOpenNotifications={() => {
            if (isMobileViewport && !sidebarCollapsed) {
              setSidebarCollapsed(true);
            }
          }}
        />

        {activeSection === 'dashboard' && (
          <div id="dashboard" className="content-section active">
            <StatsCards />
            <div className="row">
              <div className="col-lg-8">
                <div className="progress-container">
                  <h4 className="mb-4">Recent Tests</h4>
                  <RecentTests />
                </div>
              </div>
              <div className="col-lg-4">
                <div className="progress-container">
                  <h4 className="mb-4">Recent Activity</h4>
                  <ActivityFeed />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'prepared-tests' && (
          <div id="prepared-tests" className="content-section active">
            <AvailableTests />
          </div>
        )}
        {activeSection === 'create-test' && (
          <div id="create-test" className="content-section active">
            <TestCustomization />
          </div>
        )}
        {activeSection === 'previous-tests' && (
          <div id="previous-tests" className="content-section active">
            <PreviousTests />
          </div>
        )}
        {activeSection === 'incorrect-questions' && (
          <div id="incorrect-questions" className="content-section active">
            <IncorrectQuestions />
          </div>
        )}
        {activeSection === 'performance' && (
          <div id="performance" className="content-section active">
            <PerformanceAnalysis />
          </div>
        )}
        {activeSection === 'materials' && (
          <div id="materials" className="content-section active">
            <StudyMaterials />
          </div>
        )}
        {activeSection === 'profile' && (
          <div id="profile" className="content-section active">
            <Profile />
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
