import React from 'react';
import { useNavigate } from 'react-router-dom';
import { unregisterStudentFcm } from '../services/firebaseMessaging';
import { formatStudentDisplayId } from '../utils/studentId';

const StudentSidebar = ({
  activeSection,
  onSectionChange,
  collapsed,
  toggleSidebar,
  user,
  isMobileViewport = false
}) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const authToken = localStorage.getItem('token');
    if (authToken) {
      await unregisterStudentFcm({ authToken });
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleSectionChange = (sectionId) => {
    onSectionChange(sectionId);
    if (isMobileViewport && !collapsed) {
      toggleSidebar();
    }
  };

  // Generate a display ID from the user's _id (fallback)
  const studentId = formatStudentDisplayId(user?._id);
  const program = user.program || 'NCLEX-RN';

  const navItems = [
    { id: 'dashboard', icon: 'tachometer-alt', label: 'Dashboard' },
    { id: 'prepared-tests', icon: 'file-alt', label: 'Take Prepared Test' },
    { id: 'create-test', icon: 'plus-circle', label: 'Create Test' },
    { id: 'previous-tests', icon: 'history', label: 'Previous Tests' },
    { id: 'incorrect-questions', icon: 'exclamation-circle', label: 'Incorrect Question' },
    { id: 'performance', icon: 'chart-line', label: 'Performance Analysis' },
    { id: 'topic-analysis', icon: 'chart-pie', label: 'Topic Analysis' },
    { id: 'materials', icon: 'book', label: 'Study Materials' },
    { id: 'profile', icon: 'user-circle', label: 'My Profile' },
  ];

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header" style={{ position: 'relative' }}>
        <button
          onClick={toggleSidebar}
          type="button"
          className="student-sidebar-collapse-btn"
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
        <div className="student-avatar">
          <i className="fas fa-user-graduate"></i>
        </div>
        <h5 className="mb-1">{user.name || 'Sarah Johnson'}</h5>
        <p className="mb-0">Student ID: {studentId}</p>
        <small>{program} Program</small>
      </div>
      <div className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => handleSectionChange(item.id)}
          >
            <i className={`fas fa-${item.icon}`}></i>
            {item.label}
          </button>
        ))}
        <button className="nav-link text-danger" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </div>
  );
};

export default StudentSidebar;
