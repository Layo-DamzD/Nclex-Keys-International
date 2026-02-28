import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile on mount
  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      // Optionally sync with localStorage
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      console.error('Failed to fetch user:', error);
      const statusCode = error?.response?.status;
      const authRejected = statusCode === 401 || statusCode === 403;

      if (authRejected) {
        // If the account was deactivated or token is invalid, do not restore a stale cached session.
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } else {
        // Fallback to cached user only for transient/network issues.
        const localUser = JSON.parse(localStorage.getItem('user') || 'null');
        setUser(localUser);
      }
    } finally {
      setLoading(false);
    }
  };

  // Call fetchUser on mount
  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const statusCode = error?.response?.status;
        const message = String(error?.response?.data?.message || '');
        const requestUrl = String(error?.config?.url || '');
        const hasStudentToken = Boolean(localStorage.getItem('token'));

        const isStudentAuthCheck =
          requestUrl.includes('/api/auth/me') || requestUrl.includes('/api/student/');
        const isAuthFailure = statusCode === 401 || statusCode === 403;
        const isInactiveOrAuthError = /inactive|suspended|not authorized/i.test(message) || statusCode === 401;

        if (hasStudentToken && isStudentAuthCheck && isAuthFailure && isInactiveOrAuthError) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setLoading(false);
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptorId);
    };
  }, []);

  // Expose a refresh function
  const refreshUser = () => fetchUser();

  return (
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
};
