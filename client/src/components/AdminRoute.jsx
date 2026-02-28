import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

const AdminRoute = ({ children }) => {
  const [status, setStatus] = useState('checking');
  const [redirectTo, setRedirectTo] = useState(null);
  const token = sessionStorage.getItem('adminToken');

  useEffect(() => {
    const verifyAdmin = async () => {
      if (!token) {
        setRedirectTo('/admin/login');
        setStatus('done');
        return;
      }

      try {
        const response = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const user = response.data || {};

        sessionStorage.setItem('adminUser', JSON.stringify(user));

        if (user.role !== 'admin' && user.role !== 'superadmin') {
          setRedirectTo('/admin/login');
        } else if (user.role === 'admin' && !user.approved) {
          setRedirectTo('/admin/login');
        } else {
          setRedirectTo(null);
        }
      } catch {
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminUser');
        setRedirectTo('/admin/login');
      } finally {
        setStatus('done');
      }
    };

    verifyAdmin();
  }, [token]);

  if (status === 'checking') {
    return <div>Checking admin access...</div>;
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default AdminRoute;
