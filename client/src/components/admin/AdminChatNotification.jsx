import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';

const STORAGE_KEY = 'nclexkeys:admin-chat-notifications-seen';

const AdminChatNotification = ({
  enabled = true,
  token,
  onGoToLiveChat,
}) => {
  const [activeNotification, setActiveNotification] = useState(null);
  const lastSeenRef = useRef(null);
  const dismissedRef = useRef(new Set());

  // Get last seen timestamp from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        lastSeenRef.current = new Date(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  // Poll for new escalation notifications
  useEffect(() => {
    if (!enabled || !token) return;

    let mounted = true;
    const fetchEscalations = async () => {
      try {
        const res = await axios.get('/api/chat/admin/escalated', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const sessions = res.data?.sessions || [];
        if (!mounted || sessions.length === 0) return;

        // Find the most recent pending escalation
        const pendingSessions = sessions.filter(s => !s.adminResponded);
        if (pendingSessions.length === 0) return;

        // Sort by time (most recent first)
        const newest = pendingSessions.sort(
          (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
        )[0];

        const newestTime = new Date(newest.lastMessageAt);
        const newestId = newest.sessionId;

        // Skip if already dismissed or seen
        if (dismissedRef.current.has(newestId)) return;
        if (lastSeenRef.current && newestTime <= lastSeenRef.current) return;

        // Show notification
        if (!activeNotification) {
          setActiveNotification({
            sessionId: newestId,
            visitorName: newest.visitorName || 'Someone',
            lastMessage: newest.lastMessage || 'needs help',
            time: newestTime,
          });
        }
      } catch (err) {
        // Silent fail — don't spam console
      }
    };

    fetchEscalations();
    const intervalId = setInterval(fetchEscalations, 15000); // Every 15s

    // Also poll when tab gains focus
    const onFocus = () => fetchEscalations();
    window.addEventListener('focus', onFocus);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = () => {
    if (activeNotification?.sessionId) {
      dismissedRef.current.add(activeNotification.sessionId);
      lastSeenRef.current = activeNotification.time;
      try {
        localStorage.setItem(STORAGE_KEY, activeNotification.time.toISOString());
      } catch {
        // ignore
      }
    }
    setActiveNotification(null);
  };

  const handleGoToChat = () => {
    handleDismiss();
    if (typeof onGoToLiveChat === 'function') {
      onGoToLiveChat();
    }
  };

  if (!activeNotification) return null;

  const popup = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        padding: '24px',
        pointerEvents: 'none',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.15)',
          pointerEvents: 'auto',
        }}
      />

      {/* Toast card */}
      <div
        style={{
          position: 'relative',
          pointerEvents: 'auto',
          width: '380px',
          maxWidth: 'calc(100vw - 48px)',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          animation: 'slideInRight 0.4s ease-out',
        }}
      >
        {/* Colored header bar */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '1.1rem',
              flexShrink: 0,
            }}
          >
            <i className="fas fa-headset"></i>
          </div>
          <div style={{ flex: 1, color: '#fff' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              New Chat Escalation
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
              Someone needs human support
            </div>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#dc2626',
                animation: 'pulse 2s infinite',
              }}
            />
            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
              {activeNotification.visitorName}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
              &middot; Just now
            </span>
          </div>
          <p
            style={{
              margin: 0,
              color: '#64748b',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {activeNotification.lastMessage}
          </p>
        </div>

        {/* Actions */}
        <div
          style={{
            padding: '0 20px 16px',
            display: 'flex',
            gap: '8px',
          }}
        >
          <button
            onClick={handleGoToChat}
            style={{
              flex: 1,
              background: '#1d4ed8',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <i className="fas fa-comments"></i>
            Open Chat
          </button>
          <button
            onClick={handleDismiss}
            style={{
              background: '#f1f5f9',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined' || !document.body) {
    return popup;
  }

  return createPortal(popup, document.body);
};

export default AdminChatNotification;
