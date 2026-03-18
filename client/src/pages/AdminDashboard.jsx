import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import AdminStats from '../components/admin/AdminStats';
import QuickActions from '../components/admin/QuickActions';
import RecentQuestions from '../components/admin/RecentQuestions';
import ManageQuestions from '../components/admin/ManageQuestions';
import UploadQuestion from '../components/admin/UploadQuestion';
import CaseStudyBuilder from '../components/admin/CaseStudyBuilder';
import CreateTest from '../components/admin/CreateTest';
import LandingPageStudio from '../components/admin/LandingPageStudio';
import UsageAnalytics from '../components/admin/UsageAnalytics';
import CategoryStats from '../components/admin/CategoryStats';
import AllStudents from '../components/admin/AllStudents';
import ProgressReport from '../components/admin/ProgressReport';
import ContentManagement from '../components/admin/ContentManagement';
import SystemLogs from '../components/admin/SystemLogs';
import StudentFeedback from '../components/admin/StudentFeedback';
import AdminApproval from '../components/admin/AdminApproval';
import ExamSupportChat from '../components/admin/ExamSupportChat';
import AdminSettings from '../components/admin/AdminSettings';
import PwaInstallButton from '../components/PwaInstallButton';
import { useAppTheme } from '../context/AppThemeContext';
import './AdminDashboard.css';

const MOBILE_BREAKPOINT = 992;

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );
  const [now, setNow] = useState(() => new Date());
  const user = JSON.parse(sessionStorage.getItem('adminUser') || '{}');
  const userRole = user.role;
  const { theme, toggleTheme, isThemeEnabled } = useAppTheme();
  const [sidebarBadges, setSidebarBadges] = useState({});

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  const handleSectionChange = useCallback(
    (sectionId) => {
      setActiveSection(sectionId);
      if (isMobileViewport) {
        setSidebarCollapsed(true);
      }
    },
    [isMobileViewport]
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (userRole !== 'superadmin') {
      setSidebarBadges({});
      return;
    }

    let mounted = true;

    const fetchSidebarBadges = async () => {
      try {
        const token = sessionStorage.getItem('adminToken');
        if (!token) return;

        const [adminsRes, feedbackRes, supportRes] = await Promise.all([
          axios.get('/api/admin/users/admins', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('/api/admin/feedback', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('/api/admin/exam-support/conversations', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const admins = Array.isArray(adminsRes.data) ? adminsRes.data : [];
        const feedback = Array.isArray(feedbackRes.data) ? feedbackRes.data : [];
        const supportConversations = Array.isArray(supportRes.data) ? supportRes.data : [];

        const pendingApprovals = admins.filter(
          (item) => item?.role !== 'superadmin' && item?.approved !== true
        ).length;

        const unreadFeedback = feedback.filter(
          (item) => String(item?.status || '').toLowerCase() === 'new'
        ).length;

        const unreadSupport = supportConversations.reduce(
          (sum, item) => sum + Number(item?.unreadAdminCount || 0),
          0
        );

        if (mounted) {
          setSidebarBadges({
            'admin-approval': pendingApprovals,
            'student-feedback': unreadFeedback,
            'exam-support': unreadSupport
          });
        }
      } catch (error) {
        console.error('Failed to fetch sidebar badges:', error);
      }
    };

    fetchSidebarBadges();
    const intervalId = window.setInterval(fetchSidebarBadges, 30000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [userRole]);

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

  const handleExport = async () => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/questions/export', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'questions_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    }
  };

  return (
    <div
      className={`admin-dashboard-page admin-container ${userRole === 'admin' ? 'admin-regular' : 'admin-super'} ${isMobileViewport ? 'admin-mobile' : 'admin-desktop'}`}
      style={{ display: 'flex', minHeight: '100vh', width: '100%' }}
    >
      {isMobileViewport && !sidebarCollapsed && (
        <button
          type="button"
          className="admin-sidebar-overlay"
          onClick={toggleSidebar}
          aria-label="Close admin sidebar"
        />
      )}

      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        collapsed={sidebarCollapsed}
        toggleSidebar={toggleSidebar}
        userRole={userRole}
        isMobileViewport={isMobileViewport}
        sectionBadges={sidebarBadges}
      />

      {sidebarCollapsed && (
        <button
          onClick={toggleSidebar}
          type="button"
          className="admin-sidebar-floating-open-btn"
          style={{
            position: 'fixed',
            left: '10px',
            top: '10px',
            zIndex: 1000,
            background: '#1e40af',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 12px',
            cursor: 'pointer'
          }}
        >
          <i className="fas fa-bars"></i>
        </button>
      )}

      <main
        className={`main-content ${isMobileViewport ? 'admin-mobile-main-content' : ''}`}
        style={{
          flex: 1,
          marginLeft: isMobileViewport ? '0' : sidebarCollapsed ? '0' : '280px',
          transition: 'margin-left 0.3s',
          padding: isMobileViewport ? '14px' : '30px'
        }}
      >
        <div className="header">
          <div>
            <h1>
              Welcome to <span>Nclex Keys</span> Admin
            </h1>
            <p style={{ color: '#64748b', marginTop: '8px' }}>
              {userRole === 'superadmin' ? 'Super Admin' : 'Admin'} Dashboard
            </p>
          </div>

          <div className="user-info">
            <PwaInstallButton
              variant="admin-header"
              className="admin-header-install-btn"
              label="Install App"
              compactLabel="Install"
            />

            <div className="time-display">
              <div className="time">
                {now.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div className="date">{now.toLocaleDateString('en-GB')}</div>
            </div>

            {isThemeEnabled && (
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                title={theme === 'dark' ? 'Dark mode' : 'Light mode'}
              >
                <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
              </button>
            )}

            <div className="user-profile-meta">
              <div className="user-name">{user.name || 'Admin'}</div>
              <div className="user-role-label">
                {userRole === 'superadmin' ? 'Super Admin' : 'Admin'}
              </div>
            </div>

            <div className="user-avatar">{user.name?.charAt(0) || 'A'}</div>
          </div>
        </div>

        {activeSection === 'dashboard' && (
          <div className="section active">
            <AdminStats />
            <QuickActions
              onSectionChange={handleSectionChange}
              userRole={userRole}
              onExport={handleExport}
            />
            <RecentQuestions />
          </div>
        )}

        {activeSection === 'questions' && (
          <div className="section active">
            <ManageQuestions onSectionChange={handleSectionChange} />
          </div>
        )}

        {activeSection === 'upload' && (
          <div className="section active">
            <UploadQuestion />
          </div>
        )}

        {activeSection === 'case-studies' && (
          <div className="section active">
            <CaseStudyBuilder />
          </div>
        )}

        {activeSection === 'create-test' && (
          <div className="section active">
            <CreateTest />
          </div>
        )}

        {activeSection === 'landing-page' && userRole === 'superadmin' && (
          <div className="section active">
            <LandingPageStudio />
          </div>
        )}

        {activeSection === 'analytics' && (
          <div className="section active">
            <UsageAnalytics />
          </div>
        )}

        {activeSection === 'category-stats' && (
          <div className="section active">
            <CategoryStats />
          </div>
        )}

        {activeSection === 'all-students' && (
          <div className="section active">
            <AllStudents />
          </div>
        )}

        {activeSection === 'progress-report' && (
          <div className="section active">
            <ProgressReport />
          </div>
        )}

        {activeSection === 'exam-support' && (
          <div className="section active">
            <ExamSupportChat />
          </div>
        )}

        {activeSection === 'content-management' && (
          <div className="section active">
            <ContentManagement />
          </div>
        )}

        {activeSection === 'admin-approval' && userRole === 'superadmin' && (
          <div className="section active">
            <AdminApproval />
          </div>
        )}

        {activeSection === 'logs' && userRole === 'superadmin' && (
          <div className="section active">
            <SystemLogs />
          </div>
        )}

        {activeSection === 'student-feedback' && userRole === 'superadmin' && (
          <div className="section active">
            <StudentFeedback />
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="section active">
            <AdminSettings />
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
