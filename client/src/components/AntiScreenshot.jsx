import { useEffect, useCallback, useState, useRef } from 'react';

/**
 * AntiScreenshot — hardened deterrent layer for the student dashboard.
 *
 * Nothing on the client is 100 % bulletproof, but this raises the bar
 * significantly by:
 *
 *  1. Blocking PrintScreen, Win+Shift+S, Cmd+Shift+4, Ctrl+Shift+I (DevTools)
 *  2. Disabling right-click context menu
 *  3. Clearing the clipboard on copy/cut
 *  4. Showing a full-screen warning overlay whenever the window loses focus
 *     (switching apps, pressing Home, opening notification shade, etc.)
 *  5. Preventing drag-and-drop of images / content out of the page
 *  6. Injecting CSS that disables text-selection and print media
 *  7. Periodic visibility poll — catches edge cases where events don't fire
 *  8. Re-arm logic — protection stays active after every dismiss
 *
 * The overlay must be clicked to dismiss, so the student can't just
 * switch away and back silently.
 */
const AntiScreenshot = () => {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const dismissCountRef = useRef(0);
  const dismissTimeRef = useRef(0);           // timestamp of last dismiss
  const blurTimeoutRef = useRef(null);         // handle for the blur setTimeout
  const isDismissingRef = useRef(false);       // flag to suppress blur during dismiss
  const pollIntervalRef = useRef(null);        // handle for the visibility poll
  const violationCountRef = useRef(0);         // track how many times overlay was shown

  // Grace period after dismiss (ms) — ignore blur/focus during this window
  const GRACE_PERIOD = 400;

  // -------------------------------------------------------
  // Core protection handlers
  // -------------------------------------------------------
  const blockKeyDown = useCallback((e) => {
    // PrintScreen
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      e.stopPropagation();
      // Overwrite clipboard so nothing useful is captured
      navigator.clipboard?.writeText('').catch(() => {});
      setOverlayVisible(true);
      return false;
    }

    // Win + Shift + S  (snipping tool)
    // Win + PrintScreen (Xbox game bar capture)
    if (e.key === 's' && e.shiftKey && e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      setOverlayVisible(true);
      return false;
    }

    // Cmd + Shift + 3 / 4 / 5 (macOS screenshots)
    if ((e.key === '3' || e.key === '4' || e.key === '5') && e.shiftKey && e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      setOverlayVisible(true);
      return false;
    }

    // Ctrl + Shift + I  (DevTools)
    if (e.key === 'I' && e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // F12 (DevTools)
    if (e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + U (View source)
    if (e.key === 'u' && e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + S (Save page)
    if (e.key === 's' && e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + P (Print)
    if (e.key === 'p' && e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, []);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, []);

  const handleCopy = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard?.writeText('').catch(() => {});
    return false;
  }, []);

  const handleCut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, []);

  // Show overlay when window/tab loses focus — with grace period check
  const handleBlur = useCallback(() => {
    // Clear any existing timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }

    blurTimeoutRef.current = setTimeout(() => {
      // Don't show overlay if we're in the grace period after a dismiss
      const now = Date.now();
      if (isDismissingRef.current || (now - dismissTimeRef.current) < GRACE_PERIOD) {
        isDismissingRef.current = false;
        return;
      }
      setOverlayVisible(true);
    }, 150);
  }, []);

  const handleFocus = useCallback(() => {
    // Only show overlay on focus-return if we were NOT just dismissing
    const now = Date.now();
    if (isDismissingRef.current || (now - dismissTimeRef.current) < GRACE_PERIOD) {
      isDismissingRef.current = false;
      return;
    }
    // When the user returns to the tab, ensure the overlay is showing
    // so they have to actively dismiss it
    setOverlayVisible(true);
  }, []);

  const handleDragStart = useCallback((e) => {
    // Only block if dragging page content (not normal sidebar interactions)
    const target = e.target;
    if (target && target.closest && !target.closest('.student-sidebar-overlay')) {
      e.preventDefault();
      return false;
    }
  }, []);

  const handleDismiss = useCallback(() => {
    // Set flag so blur/focus handlers don't immediately re-show overlay
    isDismissingRef.current = true;
    dismissTimeRef.current = Date.now();
    dismissCountRef.current += 1;
    setOverlayVisible(false);

    // Clear any pending blur timeout that would re-trigger the overlay
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    // Reset the dismissing flag after the grace period
    setTimeout(() => {
      isDismissingRef.current = false;
    }, GRACE_PERIOD);
  }, []);

  // -------------------------------------------------------
  // Attach / detach event listeners
  // -------------------------------------------------------
  useEffect(() => {
    // Keyboard shortcuts
    document.addEventListener('keydown', blockKeyDown, true);

    // Right-click
    document.addEventListener('contextmenu', handleContextMenu, true);

    // Copy / Cut
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('cut', handleCut, true);

    // Window focus / blur
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    // Visibility change (tab switching)
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Always show overlay when page becomes hidden
        violationCountRef.current += 1;
        setOverlayVisible(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Drag
    document.addEventListener('dragstart', handleDragStart, true);

    // Mouse leave (desktop) — catches when mouse leaves browser window
    const handleMouseLeave = (e) => {
      if (!e.relatedTarget && e.toElement === null) {
        // Mouse left the window entirely (not just to another element)
        if (!isDismissingRef.current && (Date.now() - dismissTimeRef.current) >= GRACE_PERIOD) {
          setOverlayVisible(true);
        }
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);

    // Periodic visibility poll — catches edge cases where events don't fire
    // (e.g. some mobile screenshot tools don't trigger visibilitychange on 2nd attempt)
    let lastKnownVisible = !document.hidden;
    pollIntervalRef.current = setInterval(() => {
      const currentlyVisible = !document.hidden;
      if (!currentlyVisible && lastKnownVisible) {
        // Page just became hidden
        violationCountRef.current += 1;
        setOverlayVisible(true);
      }
      lastKnownVisible = currentlyVisible;
    }, 300);

    // Inject print-blocking CSS
    const styleId = 'anti-screenshot-print-css';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @media print {
          body * { display: none !important; }
          body::after {
            content: "Screenshots and printing are disabled for security purposes.";
            display: block !important;
            text-align: center;
            font-size: 24px;
            padding: 50px;
          }
        }
        .student-dashboard-shell {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        /* Allow text selection in input fields */
        .student-dashboard-shell input,
        .student-dashboard-shell textarea,
        .student-dashboard-shell select {
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          user-select: text;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      document.removeEventListener('keydown', blockKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('cut', handleCut, true);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [blockKeyDown, handleContextMenu, handleCopy, handleCut, handleBlur, handleFocus, handleDragStart]);

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------
  if (!overlayVisible) return null;

  return (
    <div
      onClick={handleDismiss}
      onKeyDown={(e) => { if (e.key === 'Escape') handleDismiss(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Security overlay"
      tabIndex={0}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        animation: 'antiSsFadeIn 0.15s ease-out',
      }}
    >
      <style>{`
        @keyframes antiSsFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Shield icon */}
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'rgba(239, 68, 68, 0.15)',
        border: '2px solid rgba(239, 68, 68, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}>
        <i className="fas fa-shield-halved" style={{ fontSize: 36, color: '#ef4444' }}></i>
      </div>

      <h2 style={{
        color: '#f1f5f9',
        fontSize: 24,
        fontWeight: 700,
        marginBottom: 12,
        textAlign: 'center',
        padding: '0 20px',
      }}>
        Security Notice
      </h2>

      <p style={{
        color: '#94a3b8',
        fontSize: 16,
        marginBottom: 8,
        textAlign: 'center',
        maxWidth: 400,
        lineHeight: 1.6,
        padding: '0 20px',
      }}>
        Screenshots, screen recording, and printing are <strong style={{ color: '#f87171' }}>not permitted</strong> on this platform.
      </p>

      <p style={{
        color: '#64748b',
        fontSize: 13,
        marginBottom: 32,
        textAlign: 'center',
      }}>
        Unauthorized sharing of exam content violates our terms of service.
      </p>

      <div style={{
        padding: '12px 32px',
        borderRadius: 8,
        background: 'rgba(59, 130, 246, 0.15)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        color: '#93c5fd',
        fontSize: 14,
        fontWeight: 600,
      }}>
        Tap anywhere to return to your dashboard
      </div>
    </div>
  );
};

export default AntiScreenshot;
