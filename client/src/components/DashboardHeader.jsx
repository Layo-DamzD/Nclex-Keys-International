import React, { useEffect, useRef, useState } from 'react';
import PwaInstallButton from './PwaInstallButton';

const DashboardHeader = ({
  userName,
  daysUntilExam,
  toggleMobileSidebar,
  onOpenFeedback,
  unreadNotificationCount = 0,
  onOpenNotifications,
  notificationItems = []
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const notificationMenuRef = useRef(null);
  const currentDate = new Date().toLocaleDateString('en-GB');
  const unreadLabel = unreadNotificationCount > 99 ? '99+' : String(unreadNotificationCount);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showNotificationMenu) return undefined;

    const handlePointerDown = (event) => {
      if (!notificationMenuRef.current) return;
      if (notificationMenuRef.current.contains(event.target)) return;
      setShowNotificationMenu(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowNotificationMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotificationMenu]);

  const handleNotificationBellClick = () => {
    setShowNotificationMenu((prev) => !prev);
    if (typeof onOpenNotifications === 'function') {
      onOpenNotifications();
    }
  };

  return (
    <div className="dashboard-header">
      <button className="sidebar-toggle" onClick={toggleMobileSidebar}>
        <i className="fas fa-bars"></i>
      </button>
      <div className="greeting">
        <h1>Welcome back, {userName}!</h1>
        <p className="mb-0 text-muted">{daysUntilExam}</p>
      </div>
      <div className="header-actions">
        <PwaInstallButton
          variant="dashboard"
          className="dashboard-install-app-btn"
          label="Install App"
          compactLabel="Install"
        />
        <div className="dashboard-notification-menu-wrap" ref={notificationMenuRef}>
          <button
            type="button"
            className="dashboard-notification-bell"
            onClick={handleNotificationBellClick}
            aria-label={`Notifications (${unreadNotificationCount} unread)`}
            title={`${unreadNotificationCount} unread notification${unreadNotificationCount === 1 ? '' : 's'}`}
            aria-expanded={showNotificationMenu}
            aria-haspopup="menu"
          >
            <i className="fas fa-bell" />
            <span className={`dashboard-notification-bell-badge ${unreadNotificationCount > 0 ? 'has-unread' : ''}`}>
              {unreadLabel}
            </span>
          </button>

          {showNotificationMenu && (
            <div className="dashboard-notification-dropdown" role="menu" aria-label="Notifications">
              <div className="dashboard-notification-dropdown-head">
                <div>
                  <strong>Notifications</strong>
                  <small>{unreadNotificationCount} unread</small>
                </div>
                <button
                  type="button"
                  className="dashboard-notification-dropdown-close"
                  onClick={() => setShowNotificationMenu(false)}
                  aria-label="Close notifications"
                >
                  <i className="fas fa-times" />
                </button>
              </div>

              <div className="dashboard-notification-dropdown-list">
                {notificationItems.length === 0 ? (
                  <div className="dashboard-notification-dropdown-empty">
                    No notifications yet
                  </div>
                ) : (
                  notificationItems.map((item) => (
                    <div
                      key={item.id || `${item.text}-${item.time}`}
                      className={`dashboard-notification-dropdown-item ${item.isSeen ? '' : 'unread'}`}
                      role="menuitem"
                      tabIndex={0}
                    >
                      <div className="dashboard-notification-dropdown-item-top">
                        <span className="dashboard-notification-dropdown-item-title">
                          {item.text || 'Notification'}
                        </span>
                        {!item.isSeen && <span className="dashboard-notification-dot" aria-hidden="true" />}
                      </div>
                      <div className="dashboard-notification-dropdown-item-body">
                        {item.detail || 'You have a new update from the admin team.'}
                      </div>
                      <div className="dashboard-notification-dropdown-item-time">
                        {item.time || 'Just now'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        {typeof onOpenFeedback === 'function' && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onOpenFeedback}
            style={{ whiteSpace: 'nowrap' }}
          >
            <i className="fas fa-comment-dots me-1"></i> Feedback
          </button>
        )}
        <div className="dashboard-clock-badge">
          <div className="clock-time">
            <i className="fas fa-clock me-1"></i> {currentTime}
          </div>
          <div className="clock-date">{currentDate}</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
