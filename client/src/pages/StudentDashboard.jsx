import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
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
import TopicAnalysis from '../components/TopicAnalysis';
import WeeklyReviewPopup from '../components/WeeklyReviewPopup';
import Profile from '../components/Profile';
import StudentFeedbackModal from '../components/StudentFeedbackModal';
import ExamCountdownCelebration from '../components/ExamCountdownCelebration';
import StudentNotificationPopup from '../components/StudentNotificationPopup';
import ChatWidget from '../components/ChatWidget';

const MOBILE_BREAKPOINT = 992;

const StudentDashboard = () => {
  const { user, loading, refreshUser } = useUser(); // get user from context
  const location = useLocation();
  const navigate = useNavigate();
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
  const [examCelebrationDismissed, setExamCelebrationDismissed] = useState(() => {
    try {
      const key = `exam-celebration-dismissed:${user?._id || 'anon'}`;
      return localStorage.getItem(key) === 'true';
    } catch { return false; }
  });
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationItems, setNotificationItems] = useState([]);
  const [showPreparedTestAlert, setShowPreparedTestAlert] = useState(false);
  const [preparedTestCount, setPreparedTestCount] = useState(0);
  const [showWelcomeCelebration, setShowWelcomeCelebration] = useState(false);
  const [subscriptionDaysLeft, setSubscriptionDaysLeft] = useState(null);
  const [showPublicTestPrompt, setShowPublicTestPrompt] = useState(false);
  const [publicTestSubmittedAtIso, setPublicTestSubmittedAtIso] = useState('');
  const [publicReviewResultId, setPublicReviewResultId] = useState('');

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
    const startRaw = user?.subscriptionStartDate || user?.createdAt;
    if (!startRaw) {
      setSubscriptionDaysLeft(null);
      return;
    }
    const startDate = new Date(startRaw);
    if (Number.isNaN(startDate.getTime())) {
      setSubscriptionDaysLeft(null);
      return;
    }

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfPayment = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const elapsedDays = Math.max(0, Math.floor((startOfToday.getTime() - startOfPayment.getTime()) / (1000 * 60 * 60 * 24)));
    const daysLeft = Math.max(0, 30 - elapsedDays);
    setSubscriptionDaysLeft(daysLeft);
  }, [user?.subscriptionStartDate, user?.createdAt]);

  useEffect(() => {
    if (loading) return;
    if (activeSection !== 'dashboard') return;
    if (daysUntilExamCount == null || daysUntilExamCount > 5 || daysUntilExamCount < 0) return;
    if (showExamCelebration || examCelebrationDismissed) return;

    setShowExamCelebration(true);
  }, [loading, activeSection, daysUntilExamCount, showExamCelebration, examCelebrationDismissed]);

  useEffect(() => {
    if (daysUntilExamCount == null || daysUntilExamCount > 5 || daysUntilExamCount < 0) {
      // Re-allow celebration popup if exam date changes to within 5 days
      // but only if it hasn't been explicitly dismissed this exam cycle
      setExamCelebrationDismissed(false);
      try {
        const key = `exam-celebration-dismissed:${user?._id || 'anon'}`;
        localStorage.removeItem(key);
      } catch {}
    }
  }, [daysUntilExamCount, user?._id]);

  const handleCloseExamCelebration = useCallback(() => {
    setShowExamCelebration(false);
    setExamCelebrationDismissed(true);
    try {
      const key = `exam-celebration-dismissed:${user?._id || 'anon'}`;
      localStorage.setItem(key, 'true');
    } catch {}
  }, [user?._id]);

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
        // Only show alert if not previously dismissed this session
        const dismissedKey = `prepared-test-alert-dismissed:${user?._id || 'anon'}`;
        if (!sessionStorage.getItem(dismissedKey)) {
          setShowPreparedTestAlert(true);
        }
      } catch (error) {
        console.error('Failed to check prepared tests:', error);
      }
    };

    checkPreparedTests();
    return () => {
      mounted = false;
    };
  }, [loading, user?._id]);

  // Show welcome celebration only once per user (stored in database)
  useEffect(() => {
    if (loading || !user?._id) return;

    // Check if user has already seen welcome (from database via login response)
    if (user.hasSeenWelcome) return;

    setShowWelcomeCelebration(true);
  }, [loading, user?._id, user?.hasSeenWelcome]);

  // Mark welcome as seen when user dismisses it
  const handleWelcomeClose = async () => {
    setShowWelcomeCelebration(false);
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await axios.post('/api/student/mark-welcome-seen', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Refresh user data to ensure hasSeenWelcome is updated in context
        refreshUser();
      }
    } catch (error) {
      console.error('Failed to mark welcome as seen:', error);
    }
  };

  useEffect(() => {
    if (loading || !user?._id) return;
    let mounted = true;
    const loadPublicReviewStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await axios.get('/api/student/public-test-review-status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!mounted) return;

        const submittedAt = response?.data?.submittedAt ? new Date(response.data.submittedAt) : null;
        if (!response?.data?.hasReview || !submittedAt || Number.isNaN(submittedAt.getTime())) {
          setPublicTestSubmittedAtIso('');
          setPublicReviewResultId('');
          setShowPublicTestPrompt(false);
          return;
        }

        const submittedAtIso = submittedAt.toISOString();
        setPublicTestSubmittedAtIso(submittedAtIso);
        setPublicReviewResultId(String(response?.data?.reviewResultId || ''));

        if (!response?.data?.needsPrompt) {
          setShowPublicTestPrompt(false);
          return;
        }

        const deferredThisSessionKey = `student-public-test-later:${user._id}:${submittedAtIso}`;
        if (sessionStorage.getItem(deferredThisSessionKey) === 'later') {
          setShowPublicTestPrompt(false);
          return;
        }

        setShowPublicTestPrompt(true);
      } catch (error) {
        console.error('Failed to load public test review status:', error);
      }
    };

    loadPublicReviewStatus();
    return () => {
      mounted = false;
    };
  }, [loading, user?._id]);

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
        countdownDays={daysUntilExamCount}
        celebrationVideoUrl={import.meta.env.VITE_CELEBRATION_VIDEO_URL || 'https://www.youtube.com/watch?v=7ILVwUsfrAc'}
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
          <div className="student-notification-popup-backdrop" onClick={() => {
                  try { sessionStorage.setItem(`prepared-test-alert-dismissed:${user._id}`, 'true'); } catch {}
                  setShowPreparedTestAlert(false);
                }} />
          <div className="student-notification-popup-card">
            <div className="student-notification-popup-header">
              <div className="student-notification-popup-icon"><i className="fas fa-bell" /></div>
              <div>
                <div className="student-notification-popup-eyebrow">Tutor Update</div>
                <h3>Prepared test is ready</h3>
              </div>
              <button type="button" className="student-notification-popup-close" onClick={() => {
                  try { sessionStorage.setItem(`prepared-test-alert-dismissed:${user._id}`, 'true'); } catch {}
                  setShowPreparedTestAlert(false);
                }} aria-label="Close">
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="student-notification-popup-body">
              <p>Your tutor has prepared {preparedTestCount > 1 ? `${preparedTestCount} tests` : 'a test'} for you. Open <strong>Take Prepared Test</strong> to start now.</p>
            </div>
            <div className="student-notification-popup-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={() => {
                  try { sessionStorage.setItem(`prepared-test-alert-dismissed:${user._id}`, 'true'); } catch {}
                  setShowPreparedTestAlert(false);
                }}>Later</button>
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
          <div className="student-notification-popup-backdrop" onClick={handleWelcomeClose} />
          <div className="student-notification-popup-card">
            <div className="student-notification-popup-header">
              <div className="student-notification-popup-icon"><i className="fas fa-champagne-glasses" /></div>
              <div>
                <div className="student-notification-popup-eyebrow">🎉 Welcome</div>
                <h3>We are happy to have you on-board!</h3>
              </div>
              <button type="button" className="student-notification-popup-close" onClick={handleWelcomeClose} aria-label="Close">
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="student-notification-popup-body">
              <p>Pop champagne 🍾 — your NCLEX journey starts here. We are excited to support your success.</p>
            </div>
            <div className="student-notification-popup-footer">
              <button type="button" className="btn btn-primary" onClick={handleWelcomeClose}>Let&apos;s Go</button>
            </div>
          </div>
        </div>
      )}

      {showPublicTestPrompt && (
        <div className="student-notification-popup-overlay" role="dialog" aria-modal="true" aria-label="Public test result available">
          <div
            className="student-notification-popup-backdrop"
            onClick={() => {
              if (publicTestSubmittedAtIso) {
                sessionStorage.setItem(`student-public-test-later:${user._id}:${publicTestSubmittedAtIso}`, 'later');
              }
              setShowPublicTestPrompt(false);
            }}
          />
          <div className="student-notification-popup-card">
            <div className="student-notification-popup-header">
              <div className="student-notification-popup-icon"><i className="fas fa-chart-line" /></div>
              <div>
                <div className="student-notification-popup-eyebrow">Public Test</div>
                <h3>See your public test result here</h3>
              </div>
            </div>
            <div className="student-notification-popup-body">
              <p>Your pre-signup public test result is ready. Review it now in full exam-style format.</p>
            </div>
            <div className="student-notification-popup-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  if (publicTestSubmittedAtIso) {
                    sessionStorage.setItem(`student-public-test-later:${user._id}:${publicTestSubmittedAtIso}`, 'later');
                  }
                  setShowPublicTestPrompt(false);
                }}
              >
                See later
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  const token = localStorage.getItem('token');
                  if (token) {
                    try {
                      await axios.post('/api/student/public-test-review-reviewed', {}, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                    } catch (error) {
                      console.error('Failed to mark public test review as reviewed:', error);
                    }
                  }
                  if (publicTestSubmittedAtIso) {
                    sessionStorage.removeItem(`student-public-test-later:${user._id}:${publicTestSubmittedAtIso}`);
                  }
                  setShowPublicTestPrompt(false);
                  if (publicReviewResultId) {
                    navigate(`/test-review/${publicReviewResultId}`);
                  } else {
                    navigate('/dashboard?section=previous-tests');
                  }
                }}
              >
                Review now
              </button>
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
            {subscriptionDaysLeft !== null && subscriptionDaysLeft >= 0 && (
              <div className="alert alert-warning" style={{ fontWeight: 800, fontSize: '1.05rem', borderWidth: '2px' }}>
                Your subscription ends in {subscriptionDaysLeft} day{subscriptionDaysLeft === 1 ? '' : 's'}.
              </div>
            )}
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
        {activeSection === 'topic-analysis' && (
          <div id="topic-analysis" className="content-section active">
            <TopicAnalysis />
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
      <ChatWidget />
    </div>
  );
};

export default StudentDashboard;
