import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../context/UserContext';

const StudentLogin = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lampOn, setLampOn] = useState(false);
  const navigate = useNavigate();
  const { refreshUser } = useUser();

  const techOfficerRawNumber = '07038377480';
  const techOfficerWhatsAppDigits = techOfficerRawNumber.replace(/\D/g, '');
  const isSuspendedAccountError = /(account|acct) has been suspended/i.test(loginError);
  const techOfficerWhatsappLink = techOfficerWhatsAppDigits
    ? `https://wa.me/${techOfficerWhatsAppDigits}?text=${encodeURIComponent(
        'Hello Tech Officer, my NCLEX KEYS account was suspended and I need help logging in.'
      )}`
    : '';

  const toggleLamp = () => setLampOn((prev) => !prev);

  const onSubmit = async (data) => {
    setLoading(true);
    setLoginError('');
    try {
      const response = await axios.post('/api/auth/student/login', {
        email: data.email,
        password: data.password,
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
      await refreshUser();
      navigate('/dashboard');
    } catch (error) {
      setLoginError(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`lamp-login-page ${lampOn ? 'lamp-on' : 'lamp-off'}`}>
      <div className="lamp-login-bg-noise" aria-hidden="true" />
      <div className="lamp-login-vignette" aria-hidden="true" />

      <div className="lamp-login-layout">
        <div className="lamp-login-stage">
          <div className="lamp-login-cord" />
          <div className="lamp-login-lamp">
            <div className="lamp-login-shade" />
            <div className="lamp-login-stem" />
            <div className="lamp-login-base" />
            <button
              type="button"
              className="lamp-login-chain"
              onClick={toggleLamp}
              aria-label={lampOn ? 'Turn lamp off' : 'Turn lamp on'}
              title={lampOn ? 'Turn lamp off' : 'Turn lamp on'}
            >
              <span className="lamp-login-chain-line" />
              <span className="lamp-login-chain-bead" />
            </button>
          </div>

          <div className="lamp-login-light-cone" />
          <div className="lamp-login-light-haze" />
          <div className="lamp-login-stage-copy">
            <div className="lamp-login-subtitle">
              {lampOn ? 'Lamp is on' : 'Turn on the lamp'}
            </div>
            <p className="lamp-login-hint">
              {lampOn ? 'You can sign in now.' : 'Tap the button or pull the chain to continue.'}
            </p>
            <button
              type="button"
              className="lamp-login-toggle-cta"
              onClick={toggleLamp}
              aria-label={lampOn ? 'Turn lamp off' : 'Turn lamp on'}
            >
              {lampOn ? 'Turn lamp off' : 'Turn on the lamp'}
            </button>
          </div>

        </div>

        <div className={`lamp-login-card ${lampOn ? 'is-visible' : 'is-hidden'}`} aria-hidden={!lampOn}>
          <div className="lamp-login-card-glow" aria-hidden="true" />

          <div className="lamp-login-header">
            <div className="lamp-login-brand-mark">
              <i className="fas fa-user-graduate"></i>
            </div>
            <div>
              <h1>Welcome</h1>
              <p>Access your NCLEX KEYS account</p>
            </div>
          </div>

          {loginError && (
            <div className="lamp-login-alert" role="alert">
              <div>{loginError}</div>
              {isSuspendedAccountError && techOfficerWhatsappLink && (
                <div className="mt-2">
                  <a
                    href={techOfficerWhatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="lamp-login-whatsapp-link"
                  >
                    07038377480 (WhatsApp)
                  </a>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="lamp-login-form" autoComplete="on">
            <div className="form-group mb-3">
              <label className="form-label lamp-login-label">Email Address</label>
              <input
                type="email"
                className={`form-control form-control-lg ${errors.email ? 'is-invalid' : ''}`}
                placeholder="Enter your email"
                autoComplete="section-student-login username"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
            </div>

            <div className="form-group mb-3">
              <label className="form-label lamp-login-label">Password</label>
              <div className="input-group lamp-login-input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-control form-control-lg ${errors.password ? 'is-invalid' : ''}`}
                  placeholder="Enter your password"
                  autoComplete="section-student-login current-password"
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  className="btn lamp-login-eye-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                </button>
              </div>
              {errors.password && <div className="invalid-feedback d-block">{errors.password.message}</div>}
            </div>

            <div className="lamp-login-row">
              <label className="lamp-login-remember">
                <input type="checkbox" id="rememberMe" />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="lamp-login-forgot">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              className="btn lamp-login-submit-btn w-100 py-3 fw-bold"
              disabled={loading}
            >
              <span className="lamp-login-submit-label">
                {loading ? 'Logging in...' : 'Sign In'}
              </span>
            </button>
          </form>

          <div className="lamp-login-footer-links">
            <div className="signup-link text-center">
              Don't have an account?{' '}
              <Link to="/signup" className="lamp-login-link-accent">
                Sign up here
              </Link>
            </div>
            <div className="back-home text-center mt-2">
              <Link to="/" className="lamp-login-link-muted">
                <i className="fas fa-arrow-left me-2"></i>
                Back to Homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
