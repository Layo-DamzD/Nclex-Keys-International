import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminSidebar = ({
  activeSection,
  onSectionChange,
  collapsed,
  toggleSidebar,
  userRole,
  isMobileViewport = false,
  sectionBadges = {},
  sidebarTheme = 'purple'
}) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminUser');
    navigate('/');
  };

  // Menu items for super admin (includes Usage Analytics and Exam Support Chat)
  const superAdminNavGroups = [
    {
      title: 'Main',
      items: [
        { id: 'dashboard', icon: 'tachometer-alt', label: 'Dashboard' },
        { id: 'questions', icon: 'question-circle', label: 'Manage Questions' },
        { id: 'upload', icon: 'cloud-upload-alt', label: 'Upload Questions' },
        { id: 'draft-questions', icon: 'save', label: 'Draft Questions' },
        { id: 'case-studies', icon: 'folder-open', label: 'Case Studies' },
        { id: 'create-test', icon: 'plus-circle', label: 'Create Test' },
        { id: 'landing-page', icon: 'edit', label: 'Edit Landing Page' }
      ]
    },
    {
      title: 'Analytics',
      items: [
        { id: 'analytics', icon: 'chart-line', label: 'Usage Analytics' },
        { id: 'category-stats', icon: 'chart-pie', label: 'Category Stats' },
        { id: 'all-students', icon: 'users', label: 'Your Students' },
        { id: 'progress-report', icon: 'chart-bar', label: 'Progress Report' },
        { id: 'content-management', icon: 'folder', label: 'Content Management' },
        { id: 'exam-support', icon: 'comments', label: 'Exam Support Chat' }
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'admin-approval', icon: 'user-check', label: 'Admin Approval' },
        { id: 'logs', icon: 'history', label: 'System Logs' },
        { id: 'student-feedback', icon: 'comment-dots', label: 'Student Feedback' },
        { id: 'live-chat', icon: 'headset', label: 'Live Chat Support' },
        { id: 'settings', icon: 'cog', label: 'Settings' }
      ]
    }
  ];

  // Menu items for regular admin (restricted)
  const regularAdminNavGroups = [
    {
      title: 'Main',
      items: [
        { id: 'dashboard', icon: 'tachometer-alt', label: 'Dashboard' },
        { id: 'questions', icon: 'question-circle', label: 'Manage Questions' },
        { id: 'upload', icon: 'cloud-upload-alt', label: 'Upload Questions' },
        { id: 'draft-questions', icon: 'save', label: 'Draft Questions' },
        { id: 'case-studies', icon: 'folder-open', label: 'Case Studies' },
        { id: 'create-test', icon: 'plus-circle', label: 'Create Test' }
      ]
    },
    {
      title: 'Analytics',
      items: [
        { id: 'category-stats', icon: 'chart-pie', label: 'Category Stats' },
        { id: 'all-students', icon: 'users', label: 'All Students' },
        { id: 'progress-report', icon: 'chart-bar', label: 'Progress Report' },
        { id: 'content-management', icon: 'folder', label: 'Content Management' }
      ]
    },
    {
      title: 'System',
      items: [{ id: 'settings', icon: 'cog', label: 'Settings' }]
    }
  ];

  const navGroups = userRole === 'superadmin' ? superAdminNavGroups : regularAdminNavGroups;

  const getBadgeValue = (sectionId) => {
    const count = Number(sectionBadges?.[sectionId] || 0);
    if (!Number.isFinite(count) || count <= 0) return null;
    return count > 99 ? '99+' : String(count);
  };

  const handleSectionClick = (sectionId) => {
    onSectionChange(sectionId);
    if (isMobileViewport && !collapsed) {
      toggleSidebar();
    }
  };

  return (
    <div className={`sidebar sidebar-theme-${sidebarTheme} ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header" style={{ position: 'relative' }}>
        <button
          onClick={toggleSidebar}
          type="button"
          className="admin-sidebar-collapse-btn"
          style={{
            position: 'absolute',
            right: '10px',
            top: '10px',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '1.2rem',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <i className={`fas fa-chevron-${collapsed ? 'right' : 'left'}`}></i>
        </button>

        <div className="logo">
          <div className="logo-icon" style={{ padding: 0, overflow: 'hidden', background: '#fff' }}>
            <img
              src="/logo.png.jpg"
              alt="Nclex Keys Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
          <div>
            <div>Nclex Keys</div>
            <div className="domain">Admin Panel</div>
          </div>
        </div>
      </div>

      <div className="sidebar-nav">
        {navGroups.map((group, idx) => (
          <div className="nav-group" key={idx}>
            <h3>{group.title}</h3>
            <ul className="nav flex-column">
              {group.items.map((item) => {
                const badgeValue = getBadgeValue(item.id);

                return (
                  <li className="nav-item" key={item.id}>
                    <button
                      className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
                      onClick={() => handleSectionClick(item.id)}
                    >
                      <span className="admin-sidebar-icon-wrap">
                        <i className={`fas fa-${item.icon}`}></i>
                        {badgeValue ? (
                          <span
                            className="admin-sidebar-icon-badge"
                            aria-label={`${item.label} unread count ${badgeValue}`}
                          >
                            {badgeValue}
                          </span>
                        ) : null}
                      </span>

                      <span>{item.label}</span>

                      {badgeValue ? (
                        <span className="admin-sidebar-item-badge" aria-hidden="true">
                          {badgeValue}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <button className="nav-link text-danger" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
