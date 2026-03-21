import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const AdminResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await axios.post(`/api/auth/admin/reset-password/${token}`, { password: data.password });
      setMessage('Admin password reset successful! Redirecting to admin login...');
      setTimeout(() => navigate('/admin/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="reset-password-container app-auth-lite-shell"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: '#f0f4ff'
      }}
    >
      <div
        className="reset-card app-auth-lite-card"
        style={{
          maxWidth: '450px',
          width: '100%',
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}
      >
        <h2 className="text-center mb-4">Admin Reset Password</h2>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group mb-4">
            <label className="form-label fw-bold">New Password</label>
            <input
              type="password"
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Minimum 8 characters' }
              })}
            />
            {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
          </div>
          <div className="form-group mb-4">
            <label className="form-label fw-bold">Confirm Password</label>
            <input
              type="password"
              className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
              {...register('confirmPassword', {
                required: 'Please confirm password',
                validate: (value) => value === password || 'Passwords do not match'
              })}
            />
            {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword.message}</div>}
          </div>
          <button type="submit" className="btn btn-primary w-100 py-3" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        <div className="text-center mt-3">
          <Link to="/admin/login" style={{ color: '#1a5fb4' }}>Back to Admin Login</Link>
        </div>
      </div>
    </div>
  );
};

export default AdminResetPassword;
