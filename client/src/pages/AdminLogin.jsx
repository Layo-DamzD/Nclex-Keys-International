import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminAuth.css';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/admin/login', {
        email,
        password,
        accessCode
      });

      sessionStorage.setItem('adminToken', response.data.token);
      sessionStorage.setItem('adminUser', JSON.stringify(response.data));
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth-page">
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <i className="fas fa-shield-alt"></i>
            <h1>Admin Login</h1>
            <p>Secure access to NCLEX KEYS admin panel</p>
          </div>
          <div className="admin-login-form">
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit} autoComplete="on">
              <div className="form-group">
                <label className="form-label"><i className="fas fa-envelope"></i> Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="section-admin-login username"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label"><i className="fas fa-lock"></i> Password</label>
                <div className="password-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="section-admin-login current-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label"><i className="fas fa-key"></i> Permanent Access Code</label>
                <input
                  type="text"
                  className="form-control access-code-input"
                  maxLength="6"
                  autoComplete="section-admin-login one-time-code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="••••••"
                />
                <small className="text-muted">Required for Admin accounts only (not Super Admin)</small>
              </div>
              <button type="submit" className="btn-admin-login" disabled={loading}>
                <i className="fas fa-sign-in-alt"></i> {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
            <div className="text-center mt-3">
              <Link to="/admin/forgot-password">Forgot password?</Link>
            </div>
            <div className="text-center mt-2">
              <Link to="/admin/forgot-access-code">Forgot access code?</Link>
            </div>
            <div className="login-link">
              No account? <Link to="/admin/signup">Signup here</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
