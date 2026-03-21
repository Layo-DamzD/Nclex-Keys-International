import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import axios from 'axios';

const AdminForgotAccessCode = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    setMessage('');
    setError('');
    setAccessCode('');

    try {
      const response = await axios.post('/api/auth/admin/forgot-access-code', {
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password
      });
      setMessage(response.data.message || 'Verification successful.');
      if (response.data.accessCode) {
        setAccessCode(response.data.accessCode);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to recover access code');
    } finally {
      setLoading(false);
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
        <h2 className="text-center mb-4">Forgot Access Code</h2>
        <p className="text-muted text-center mb-4">
          Verify your admin profile by answering this question: what is your password?
        </p>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        {accessCode && (
          <div className="alert alert-info text-center">
            <strong>Your Access Code:</strong> {accessCode}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="row">
            <div className="col-md-6 form-group mb-3">
              <label className="form-label fw-bold">First Name</label>
              <input
                type="text"
                className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                {...register('firstName', { required: 'First name is required' })}
              />
              {errors.firstName && <div className="invalid-feedback">{errors.firstName.message}</div>}
            </div>
            <div className="col-md-6 form-group mb-3">
              <label className="form-label fw-bold">Last Name</label>
              <input
                type="text"
                className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                {...register('lastName', { required: 'Last name is required' })}
              />
              {errors.lastName && <div className="invalid-feedback">{errors.lastName.message}</div>}
            </div>
          </div>
          <div className="form-group mb-4">
            <label className="form-label fw-bold">What is your password?</label>
            <input
              type="password"
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              {...register('password', { required: 'Password is required' })}
            />
            {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
          </div>
          <button type="submit" className="btn btn-primary w-100 py-3" disabled={loading}>
            {loading ? 'Verifying...' : 'Recover Access Code'}
          </button>
        </form>

        <div className="text-center mt-3">
          <Link to="/admin/login" style={{ color: '#1a5fb4' }}>Back to Admin Login</Link>
        </div>
      </div>
    </div>
  );
};

export default AdminForgotAccessCode;
