import { useEffect, useCallback, useState, useRef } from 'react';

/**
 * AntiScreenshot — blur-based deterrent layer for the student dashboard.
 *
 * Instead of a blocking overlay, this blurs the entire page when the user
 * switches tabs, presses PrintScreen, or loses focus. They tap to unblur.
 * The blur makes screenshots unreadable without being intrusive.
 *
 *  1. Blocks PrintScreen, Win+Shift+S, Cmd+Shift+4, Ctrl+Shift+I (DevTools)
 *  2. Disables right-click context menu
 *  3. Clears the clipboard on copy/cut
 *  4. Blurs the entire page on focus loss / tab switch / keyboard shortcuts
 *  5. Shows a small "Tap to continue" pill — tap to unblur
 *  6. Prevents drag-and-drop of content out of the page
 *  7. Injects CSS that disables text-selection and print media
 *  8. Periodic visibility poll — catches edge cases where events don't fire
 *  9. Re-arm logic — protection stays active after every dismiss
 */
const AntiScreenshot = () => {
  const [isBlurred, setIsBlurred] = useState(false);
  const dismissTimeRef = useRef(0);
  const blurTimeoutRef = useRef(null);
  const isDismissingRef = useRef(false);
  const pollIntervalRef = useRef(null);

  // Grace period after dismiss (ms) — ignore blur/focus during this window
  const GRACE_PERIOD = 500;

  // -------------------------------------------------------
  // Core protection handlers
  // -------------------------------------------------------
  const blockKeyDown = useCallback((e) => {
    // PrintScreen
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard?.writeText('').catch(() => {});
      setIsBlurred(true);
      return false;
    }

    // Win + Shift + S  (snipping tool)
    if (e.key === 's' && e.shiftKey && e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      setIsBlurred(true);
      return false;
    }

    // Cmd + Shift + 3 / 4 / 5 (macOS screenshots)
    if ((e.key === '3' || e.key === '4' || e.key === '5') && e.shiftKey && e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      setIsBlurred(true);
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

  // Blur the page when window/tab loses focus — with grace period check
  const handleBlur = useCallback(() => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    blurTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      if (isDismissingRef.current || (now - dismissTimeRef.current) < GRACE_PERIOD) {
        isDismissingRef.current = false;
        return;
      }
      setIsBlurred(true);
    }, 150);
  }, []);

  const handleFocus = useCallback(() => {
    const now = Date.now();
    if (isDismissingRef.current || (now - dismissTimeRef.current) < GRACE_PERIOD) {
      isDismissingRef.current = false;
      return;
    }
    setIsBlurred(true);
  }, []);

  const handleDragStart = useCallback((e) => {
    const target = e.target;
    if (target && target.closest && !target.closest('.student-sidebar-overlay')) {
      e.preventDefault();
      return false;
    }
  }, []);

  const handleDismiss = useCallback(() => {
    isDismissingRef.current = true;
    dismissTimeRef.current = Date.now();
    setIsBlurred(false);
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setTimeout(() => {
      isDismissingRef.current = false;
    }, GRACE_PERIOD);
  }, []);

  // -------------------------------------------------------
  // Apply / remove body blur via CSS
  // -------------------------------------------------------
  useEffect(() => {
    const body = document.body;
    if (isBlurred) {
      body.classList.add('nclex-ss-blur');
    } else {
      body.classList.remove('nclex-ss-blur');
    }
  }, [isBlurred]);

  // -------------------------------------------------------
  // Attach / detach event listeners
  // -------------------------------------------------------
  useEffect(() => {
    document.addEventListener('keydown', blockKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('cut', handleCut, true);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setIsBlurred(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    document.addEventListener('dragstart', handleDragStart, true);

    // Mouse leave (desktop)
    const handleMouseLeave = (e) => {
      if (!e.relatedTarget && e.toElement === null) {
        if (!isDismissingRef.current && (Date.now() - dismissTimeRef.current) >= GRACE_PERIOD) {
          setIsBlurred(true);
        }
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);

    // Periodic visibility poll — catches mobile screenshots that don't fire events
    let lastKnownVisible = !document.hidden;
    pollIntervalRef.current = setInterval(() => {
      const currentlyVisible = !document.hidden;
      if (!currentlyVisible && lastKnownVisible) {
        setIsBlurred(true);
      }
      lastKnownVisible = currentlyVisible;
    }, 300);

    // Inject CSS: blur class + print blocking + user-select
    const styleId = 'anti-screenshot-print-css';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Blur the entire page */
        .nclex-ss-blur,
        .nclex-ss-blur * {
          filter: blur(22px) !important;
          -webkit-filter: blur(22px) !important;
          transition: filter 0.15s ease !important;
        }
        /* Don't blur the tap-to-continue pill */
        .nclex-ss-blur .nclex-ss-unblur-pill,
        .nclex-ss-blur .nclex-ss-unblur-pill * {
          filter: none !important;
          -webkit-filter: none !important;
        }
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
      body.classList.remove('nclex-ss-blur');
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [blockKeyDown, handleContextMenu, handleCopy, handleCut, handleBlur, handleFocus, handleDragStart]);

  // -------------------------------------------------------
  // Render — just a small floating pill
  // -------------------------------------------------------
  if (!isBlurred) return null;

  return (
    <div
      className="nclex-ss-unblur-pill"
      onClick={handleDismiss}
      onKeyDown={(e) => { if (e.key === 'Escape') handleDismiss(); }}
      role="button"
      tabIndex={0}
      aria-label="Tap to continue"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 99999,
        padding: '16px 40px',
        borderRadius: 12,
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        color: '#93c5fd',
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        border: '1px solid rgba(59, 130, 246, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        userSelect: 'none',
      }}
    >
      <i className="fas fa-lock" style={{ fontSize: 14, color: '#60a5fa' }}></i>
      Tap to continue
    </div>
  );
};

export default AntiScreenshot;
