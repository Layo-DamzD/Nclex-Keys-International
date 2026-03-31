import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

const AppThemeContext = createContext(null);

// Grey mode theme storage
const GREY_MODE_KEY = 'nclexkeys:grey-mode';

const isThemeExcludedRoute = (pathname = '') => {
  // Landing page keeps purple gradient
  if (pathname === '/') return true;

  const excludedPrefixes = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/admin/login',
    '/admin/signup',
    '/admin/forgot-password',
    '/admin/forgot-access-code',
    '/admin/reset-password',
    '/test-review/',
    '/admin/test-results/',
  ];

  return excludedPrefixes.some((prefix) => pathname.startsWith(prefix));
};

const isAdminRoute = (pathname = '') => {
  return pathname.startsWith('/admin/dashboard') ||
         pathname.startsWith('/admin/test-results') ||
         pathname.startsWith('/admin/review');
};

export const AppThemeProvider = ({ children }) => {
  const location = useLocation();
  const isThemeEnabled = !isThemeExcludedRoute(location.pathname);
  const isAdminPage = isAdminRoute(location.pathname);
  
  // Grey mode state
  const [isGreyMode, setIsGreyMode] = useState(() => {
    try {
      const saved = localStorage.getItem(GREY_MODE_KEY);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Apply grey mode class
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (isGreyMode && isThemeEnabled) {
      root.classList.add('theme-grey');
      body.classList.add('theme-grey');
    } else {
      root.classList.remove('theme-grey');
      body.classList.remove('theme-grey');
    }

    try {
      localStorage.setItem(GREY_MODE_KEY, String(isGreyMode));
    } catch {
      // Ignore
    }
  }, [isGreyMode, isThemeEnabled]);

  // Apply route-based theme
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Clear previous theme attributes
    root.removeAttribute('data-app-theme');
    root.removeAttribute('data-admin-role');
    body.classList.remove('app-theme-active', 'admin-regular-bg', 'admin-super-bg', 'student-bg');

    if (!isThemeEnabled) {
      return;
    }

    // Apply theme based on route
    if (isAdminPage) {
      body.classList.add('app-theme-active');
      // Check user role from localStorage
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.role === 'super-admin' || user.role === 'superadmin') {
            root.setAttribute('data-admin-role', 'super-admin');
            body.classList.add('admin-super-bg');
          } else {
            root.setAttribute('data-admin-role', 'admin');
            body.classList.add('admin-regular-bg');
          }
        } else {
          // Default to regular admin background
          root.setAttribute('data-admin-role', 'admin');
          body.classList.add('admin-regular-bg');
        }
      } catch {
        root.setAttribute('data-admin-role', 'admin');
        body.classList.add('admin-regular-bg');
      }
    } else {
      // Student pages - apply dull background for reduced brightness
      body.classList.add('app-theme-active', 'student-bg');
    }
  }, [isThemeEnabled, isAdminPage, location.pathname]);

  const toggleGreyMode = () => {
    setIsGreyMode(prev => !prev);
  };

  const value = useMemo(
    () => ({
      isThemeEnabled,
      isAdminPage,
      isGreyMode,
      toggleGreyMode,
    }),
    [isThemeEnabled, isAdminPage, isGreyMode]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
};

export const useAppTheme = () => {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }

  return context;
};
