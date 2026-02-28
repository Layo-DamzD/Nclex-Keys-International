import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

const STORAGE_KEY_PREFIX = 'student-notification-seen:';

const StudentNotificationPopup = ({
  enabled = true,
  userId,
  blocked = false,
  onUnreadCountChange,
  onNotificationListChange
}) => {
  const [queue, setQueue] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const activeIdRef = useRef(null);

  const storageKey = useMemo(() => `${STORAGE_KEY_PREFIX}${userId || 'anonymous'}`, [userId]);

  const getSeenIds = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
    } catch {
      return new Set();
    }
  };

  const markSeen = (id) => {
    if (!id) return;
    const seen = getSeenIds();
    seen.add(String(id));
    localStorage.setItem(storageKey, JSON.stringify(Array.from(seen).slice(-200)));
  };

  useEffect(() => {
    if (!enabled || !userId) return undefined;

    let mounted = true;

    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get('/api/student/activity', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const seen = getSeenIds();
        const notificationItems = (response.data || [])
          .filter((item) => item?.type === 'notification' || item?.isNotification === true)
          .map((item) => ({
            ...item,
            isSeen: item?.id ? seen.has(String(item.id)) : true
          }));
        if (mounted) {
          setRecentNotifications(notificationItems);
        }

        const incoming = notificationItems
          .filter((item) => item?.id && !seen.has(String(item.id)));

        if (!mounted || incoming.length === 0) return;

        setQueue((prev) => {
          const existingIds = new Set(prev.map((x) => String(x.id)));
          if (activeIdRef.current) existingIds.add(String(activeIdRef.current));
          const merged = [...prev];
          incoming.forEach((item) => {
            if (!existingIds.has(String(item.id))) {
              merged.push(item);
              existingIds.add(String(item.id));
            }
          });
          return merged;
        });
      } catch (error) {
        console.error('Failed to fetch dashboard notifications:', error);
      }
    };

    fetchNotifications();
    const intervalId = window.setInterval(fetchNotifications, 4000);
    const onFocus = () => fetchNotifications();
    const onRealtimeRefresh = () => fetchNotifications();
    window.addEventListener('focus', onFocus);
    window.addEventListener('student-notification:refresh', onRealtimeRefresh);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('student-notification:refresh', onRealtimeRefresh);
    };
  }, [enabled, userId, storageKey]);

  useEffect(() => {
    if (blocked) return;
    if (activeNotification) return;
    if (queue.length === 0) return;

    const [next, ...rest] = queue;
    activeIdRef.current = next?.id ? String(next.id) : null;
    setActiveNotification(next);
    setQueue(rest);
  }, [blocked, queue, activeNotification]);

  useEffect(() => {
    if (typeof onUnreadCountChange !== 'function') return;
    const unreadCount = queue.length + (activeNotification ? 1 : 0);
    onUnreadCountChange(unreadCount);
  }, [queue, activeNotification, onUnreadCountChange]);

  useEffect(() => {
    if (typeof onNotificationListChange !== 'function') return;
    onNotificationListChange(recentNotifications);
  }, [recentNotifications, onNotificationListChange]);

  const closePopup = () => {
    if (activeNotification?.id) {
      markSeen(activeNotification.id);
      setRecentNotifications((prev) =>
        prev.map((item) =>
          String(item?.id) === String(activeNotification.id)
            ? { ...item, isSeen: true }
            : item
        )
      );
    }
    activeIdRef.current = null;
    setActiveNotification(null);
  };

  if (!enabled || blocked || !activeNotification) return null;

  return (
    <div className="student-notification-popup-overlay" role="dialog" aria-modal="true" aria-label="New notification">
      <div className="student-notification-popup-backdrop" onClick={closePopup} />
      <div className="student-notification-popup-card">
        <div className="student-notification-popup-glow" aria-hidden="true" />
        <div className="student-notification-popup-header">
          <div className="student-notification-popup-icon">
            <i className="fas fa-bell" />
          </div>
          <div>
            <div className="student-notification-popup-eyebrow">New Notification</div>
            <h3>{activeNotification.text || 'Notification'}</h3>
          </div>
          <button
            type="button"
            className="student-notification-popup-close"
            onClick={closePopup}
            aria-label="Close notification"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="student-notification-popup-body">
          <p>{activeNotification.detail || 'You have a new update from the admin team.'}</p>
          <small className="text-muted">{activeNotification.time || 'Just now'}</small>
        </div>

        <div className="student-notification-popup-footer">
          <button type="button" className="btn btn-primary" onClick={closePopup}>
            Okay
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentNotificationPopup;
