import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import StudentSidebar from '../components/StudentSidebar';
import TestCustomization from '../components/TestCustomization';
import PreviousTests from '../components/PreviousTests';
import Profile from '../components/Profile';

const MOBILE_BREAKPOINT = 992;

const StudentDashboard = () => {
  const { user, loading, refreshUser } = useUser();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('create-test');
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const handleSectionChange = useCallback((sectionId) => {
    setActiveSection(sectionId);
    if (isMobileViewport) {
      setSidebarCollapsed(true);
    }
  }, [isMobileViewport]);

  // Responsive resize handler
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

  // Listen for section change events
  useEffect(() => {
    const handleSectionEvent = (event) => {
      if (event?.detail) {
        handleSectionChange(event.detail);
      }
    };

    window.addEventListener('student-dashboard:set-section', handleSectionEvent);
    return () => window.removeEventListener('student-dashboard:set-section', handleSectionEvent);
  }, [handleSectionChange]);

  // Handle URL section param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get('section');
    if (section) {
      handleSectionChange(section);
    }
  }, [location.search, handleSectionChange]);

  // Periodic user refresh
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
        {/* Simple Top Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobileViewport ? '12px 16px' : '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isMobileViewport && sidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px'
                }}
              >
                <i className="fas fa-bars"></i>
              </button>
            )}
            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.05rem' }}>
              {user?.name || 'Student'}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ padding: isMobileViewport ? '12px' : '20px 24px' }}>
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
          {activeSection === 'profile' && (
            <div id="profile" className="content-section active">
              <Profile />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
