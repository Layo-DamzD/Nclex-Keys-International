import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../context/UserContext';

const DEVICE_STORAGE_KEY = 'nclexkeys:student-device-id';

const getOrCreateDeviceId = () => {
  const existing = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (existing) return existing;
  const generated = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(DEVICE_STORAGE_KEY, generated);
  return generated;
};

const getDeviceLabel = () => {
  const platform = navigator?.platform || 'Unknown Platform';
  const ua = navigator?.userAgent || '';
  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  return `${browser} on ${platform}`.slice(0, 160);
};

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
  const [introDismissed, setIntroDismissed] = useState(false);
  const navigate = useNavigate();
  const { refreshUser } = useUser();
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);
  const deviceLabel = useMemo(() => getDeviceLabel(), []);

  const techOfficerRawNumber = '07038377480';
  const techOfficerWhatsAppDigits = techOfficerRawNumber.replace(/\D/g, '');
  const isSuspendedAccountError = /(account|acct) has been suspended/i.test(loginError);
  const isSubscriptionExpiredError = /subscription has expired|renew your subscription/i.test(loginError);
  const showSupportLink = isSuspendedAccountError || isSubscriptionExpiredError;
  const techOfficerWhatsappLink = techOfficerWhatsAppDigits
    ? `https://wa.me/${techOfficerWhatsAppDigits}?text=${encodeURIComponent(
      isSubscriptionExpiredError
        ? 'Hello, my NCLEX KEYS subscription has expired and I need to renew it.'
        : 'Hello Tech Officer, my NCLEX KEYS account was suspended and I need help logging in.'
    )}`
    : '';


  const handleLampStart = () => {
    if (lampOn) return;
    setLampOn(true);
    window.setTimeout(() => {
      setIntroDismissed(true);
    }, 850);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setLoginError('');
    try {
      const response = await axios.post('/api/auth/student/login', {
        email: data.email,
        password: data.password,
        deviceId,
        deviceLabel
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
    <div className={`lamp-login-page ${lampOn ? 'lamp-on' : 'lamp-off'} ${introDismissed ? 'intro-dismissed' : ''}`}>
      <div className="lamp-login-bg-noise" aria-hidden="true" />
      <div className="lamp-login-vignette" aria-hidden="true" />

      {!introDismissed && (
        <button
          type="button"
          className={`lamp-login-screen-cover ${lampOn ? 'fading' : ''}`}
          onClick={handleLampStart}
          aria-label={lampOn ? 'Opening login form' : 'Turn on lamp and open login form'}
        >
          <span>{lampOn ? 'Opening login...' : 'Tap Anywhere On Your Screen to continue'}</span>
        </button>
      )}


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
              onClick={handleLampStart}
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
              {lampOn ? 'Lamp is on' : 'Tap to continue'}
            </div>
            <p className="lamp-login-hint">
              {lampOn ? 'You can sign in now.' : 'Tap to continue.'}
            </p>
            <button
              type="button"
              className="lamp-login-toggle-cta"
              onClick={handleLampStart}
              aria-label={lampOn ? 'Turn lamp off' : 'Turn lamp on'}
            >
              {lampOn ? 'Turn lamp off' : 'Tap to continue'}
            </button>
          </div>
        </div>

        <div className={`lamp-login-card ${introDismissed ? 'is-visible' : 'is-hidden'}`} aria-hidden={!introDismissed}>
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
              {showSupportLink && techOfficerWhatsappLink && (
                <div className="mt-2">
                  <a
                    href={techOfficerWhatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="lamp-login-whatsapp-link"
                  >
                    <i className="fab fa-whatsapp me-2"></i>
                    Contact Support on WhatsApp
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
