import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const sanitizeOtpMessage = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  const lower = text.toLowerCase();
  if (lower.includes('simulated') || lower.includes('password reset link generated')) {
    return 'OTP sent to your email.';
  }
  return text;
};

const AdminForgotPassword = () => {
  const navigate = useNavigate();
  const sendForm = useForm();
  const resetForm = useForm();

  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const requestOtp = async (targetEmail, { isResend = false } = {}) => {
    setSendingOtp(true);
    setMessage('');
    setError('');

    try {
      const response = await axios.post('/api/auth/admin/forgot-password', { email: targetEmail });
      setEmail(targetEmail);
      setOtpSent(true);
      setResendCooldown(30);
      setMessage(
        isResend
          ? 'A new OTP has been sent to your email.'
          : (sanitizeOtpMessage(response.data.message) || 'OTP sent to your email.')
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const onSendOtp = async (data) => {
    await requestOtp(data.email);
  };

  const onResetWithOtp = async (data) => {
    setResetting(true);
    setMessage('');
    setError('');

    try {
      const response = await axios.post('/api/auth/admin/reset-password-otp', {
        email,
        otp: data.otpCode,
        password: data.password
      });
      setMessage(response.data.message || 'Password reset successful. Redirecting to admin login...');
      setTimeout(() => navigate('/admin/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetting(false);
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
          {!otpSent ? 'Enter your admin email to receive a password reset OTP.' : `Enter the OTP sent to ${email} and set a new password.`}
        </p>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        {!otpSent ? (
          <form onSubmit={sendForm.handleSubmit(onSendOtp)} autoComplete="on">
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
            <button type="submit" className="btn btn-primary w-100 py-3" disabled={sendingOtp}>
              {sendingOtp ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetForm.handleSubmit(onResetWithOtp)} autoComplete="off">
            <input
              type="email"
              autoComplete="username"
              value={email}
              readOnly
              tabIndex={-1}
              aria-hidden="true"
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }}
            />
            <div className="form-group mb-3">
              <label className="form-label fw-bold">OTP</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                name="otp_code"
                className={`form-control ${resetForm.formState.errors.otpCode ? 'is-invalid' : ''}`}
                {...resetForm.register('otpCode', {
                  required: 'OTP is required',
                  pattern: { value: /^\d{6}$/, message: 'OTP must be 6 digits' }
                })}
              />
              {resetForm.formState.errors.otpCode && <div className="invalid-feedback">{resetForm.formState.errors.otpCode.message}</div>}
            </div>
            <div className="form-group mb-3">
              <label className="form-label fw-bold">New Password</label>
              <input
                type="password"
                autoComplete="new-password"
                className={`form-control ${resetForm.formState.errors.password ? 'is-invalid' : ''}`}
                {...resetForm.register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Minimum 8 characters' }
                })}
              />
              {resetForm.formState.errors.password && <div className="invalid-feedback">{resetForm.formState.errors.password.message}</div>}
            </div>
            <div className="form-group mb-4">
              <label className="form-label fw-bold">Confirm Password</label>
              <input
                type="password"
                autoComplete="new-password"
                className={`form-control ${resetForm.formState.errors.confirmPassword ? 'is-invalid' : ''}`}
                {...resetForm.register('confirmPassword', {
                  required: 'Please confirm password',
                  validate: (value) => value === resetForm.watch('password') || 'Passwords do not match'
                })}
              />
              {resetForm.formState.errors.confirmPassword && <div className="invalid-feedback">{resetForm.formState.errors.confirmPassword.message}</div>}
            </div>
            <button type="submit" className="btn btn-primary w-100 py-3" disabled={resetting}>
              {resetting ? 'Resetting...' : 'Reset Password'}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary w-100 py-2 mt-2"
              onClick={() => requestOtp(email, { isResend: true })}
              disabled={sendingOtp || resendCooldown > 0}
            >
              {sendingOtp
                ? 'Sending...'
                : resendCooldown > 0
                  ? `Resend OTP in ${resendCooldown}s`
                  : 'Resend OTP'}
            </button>
          </form>
        )}

        <div className="text-center mt-3">
          <Link to="/admin/login" style={{ color: '#1a5fb4' }}>Back to Admin Login</Link>
        </div>
      </div>
    </div>
  );
};

export default AdminForgotPassword;
