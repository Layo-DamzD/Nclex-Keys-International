import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminAuth.css';

const AdminSignup = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({ password: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/auth/admin/register', {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password
      });

      const { role, accessCodeSent } = response.data;

      if (role === 'superadmin') {
        setSuccess('Super Admin account created! You can now login.');
        setTimeout(() => navigate('/admin/login'), 3000);
      } else {
        setSuccess(
          accessCodeSent
            ? 'Access code has been sent to your email. Your account is pending approval by the super-admin.'
            : 'Account created and pending approval. Access code email was not delivered, contact super-admin.'
        );
        setTimeout(() => navigate('/admin/login'), 5000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth-page">
      <div className="admin-signup-container">
        <div className="admin-signup-card">
          <div className="admin-signup-header">
            <i className="fas fa-user-shield"></i>
            <h1>Admin Signup</h1>
            <p>Create administrator account for NCLEX KEYS</p>
            <div className="security-badge">
              <i className="fas fa-lock"></i> Restricted Access
            </div>
          </div>

          <div className="admin-signup-form">
            {error && <div className="alert alert-danger">{error}</div>}
            {success && (
              <div className="alert alert-success" style={{ whiteSpace: 'pre-line' }}>
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    className="form-control"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    className="form-control"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="password-input">
                    <input
                      type={showPassword.password ? 'text' : 'password'}
                      name="password"
                      className="form-control"
                      value={formData.password}
                      onChange={handleChange}
                      minLength="8"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword({ ...showPassword, password: !showPassword.password })}
                    >
                      <i className={`fas fa-eye${showPassword.password ? '-slash' : ''}`}></i>
                    </button>
                  </div>
                  <small className="text-muted">Minimum 8 characters</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div className="password-input">
                    <input
                      type={showPassword.confirm ? 'text' : 'password'}
                      name="confirmPassword"
                      className="form-control"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                    >
                      <i className={`fas fa-eye${showPassword.confirm ? '-slash' : ''}`}></i>
                    </button>
                  </div>
                </div>
              </div>

              <div className="terms-checkbox">
                <input type="checkbox" id="adminTerms" required />
                <label htmlFor="adminTerms">
                  I agree to the <a href="#">Administrator Terms of Service</a>, <a href="#">Privacy Policy</a>,
                  and <a href="#">Security Protocols</a>. I understand that admin access is monitored and logged.
                </label>
              </div>

              <button type="submit" className="btn-admin-signup" disabled={loading}>
                <i className="fas fa-user-shield me-2"></i>
                {loading ? 'Creating Account...' : 'Create Admin Account'}
              </button>
            </form>

            <div className="login-link">
              Already have an admin account? <Link to="/admin/login">Login here</Link>
            </div>
            <div className="back-home">
              <Link to="/">
                <i className="fas fa-arrow-left"></i> Back to Homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSignup;
