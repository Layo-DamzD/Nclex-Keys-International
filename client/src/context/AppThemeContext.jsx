import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'nclex-app-theme';
const AppThemeContext = createContext(null);

const isThemeExcludedRoute = (pathname = '') => {
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
    '/test-session',
    '/test-review/',
    '/admin/test-results/',
  ];

  return excludedPrefixes.some((prefix) => pathname.startsWith(prefix));
};

const readStoredTheme = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

export const AppThemeProvider = ({ children }) => {
  const location = useLocation();
  const [theme, setTheme] = useState(readStoredTheme);
  const isThemeEnabled = !isThemeExcludedRoute(location.pathname);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures and keep in-memory theme state.
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (!isThemeEnabled) {
      root.removeAttribute('data-app-theme');
      body.classList.remove('app-theme-active');
      return;
    }

    root.setAttribute('data-app-theme', theme);
    body.classList.add('app-theme-active');
  }, [isThemeEnabled, theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      isThemeEnabled,
    }),
    [theme, isThemeEnabled]
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
