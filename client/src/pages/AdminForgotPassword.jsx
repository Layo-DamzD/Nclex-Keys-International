import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import axios from 'axios';

const AdminForgotPassword = () => {
  const sendForm = useForm();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sendingLink, setSendingLink] = useState(false);

  const onSendLink = async (data) => {
    setSendingLink(true);
    setMessage('');
    setError('');

    try {
      const response = await axios.post('/api/auth/admin/forgot-password', { email: data.email });
      setMessage(response?.data?.message || 'Password reset link sent to your email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setSendingLink(false);
    }
  };

  return (
    <div
      className="forgot-password-container app-auth-lite-shell"
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
        className="forgot-card app-auth-lite-card"
        style={{
          maxWidth: '450px',
          width: '100%',
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}
      >
        <h2 className="text-center mb-4">Admin Forgot Password</h2>
        <p className="text-muted text-center mb-4">
          Enter your admin email to receive a password reset link.
        </p>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={sendForm.handleSubmit(onSendLink)} autoComplete="on">
          <div className="form-group mb-4">
            <label className="form-label fw-bold">Admin Email Address</label>
            <input
              type="email"
              autoComplete="email"
              className={`form-control ${sendForm.formState.errors.email ? 'is-invalid' : ''}`}
              {...sendForm.register('email', { required: 'Email is required' })}
            />
            {sendForm.formState.errors.email && <div className="invalid-feedback">{sendForm.formState.errors.email.message}</div>}
          </div>
          <button type="submit" className="btn btn-primary w-100 py-3" disabled={sendingLink}>
            {sendingLink ? 'Sending Link...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="text-center mt-3">
          <Link to="/admin/login" style={{ color: '#1a5fb4' }}>Back to Admin Login</Link>
        </div>
      </div>
    </div>
  );
};

export default AdminForgotPassword;
