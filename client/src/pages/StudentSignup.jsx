import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { COUNTRIES } from '../constants/Countries';

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

// Self-contained falling hearts background for signup page.
const initLoveRainBackground = () => {
  const existing = document.getElementById('signup-love-rain-canvas');
  if (existing) existing.remove();

  const canvas = document.createElement('canvas');
  canvas.id = 'signup-love-rain-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '4';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return () => {};
  }

  const palette = ['#ff1f1f', '#e11d48', '#b91c1c'];
  let width = 0;
  let height = 0;
  let frameId = null;
  let hearts = [];

  const randomOpacity = () => 0.55 + Math.random() * 0.35;
  const colorWithOpacity = (hex, alpha) => {
    const val = parseInt(hex.slice(1), 16);
    const r = (val >> 16) & 255;
    const g = (val >> 8) & 255;
    const b = val & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
  };

  const createHeart = (yOffset = 0) => {
    const size = 10 + Math.random() * 15;
    return {
      x: Math.random() * width,
      y: Math.random() * height + yOffset,
      baseX: Math.random() * width,
      size,
      speed: 1.4 + Math.random() * 3.2,
      swayAmp: 6 + Math.random() * 18,
      swayFreq: 0.0013 + Math.random() * 0.003,
      swayPhase: Math.random() * Math.PI * 2,
      color: palette[Math.floor(Math.random() * palette.length)],
      opacity: randomOpacity(),
    };
  };

  const rebuildHearts = () => {
    const targetCount = Math.max(140, Math.round((width * height) / 14000));
    hearts = Array.from({ length: targetCount }, () => createHeart(-height));
  };

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuildHearts();
  };

  const drawHeart = (x, y, size, color) => {
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.3);
    ctx.bezierCurveTo(x, y, x - size * 0.5, y, x - size * 0.5, y + size * 0.3);
    ctx.bezierCurveTo(x - size * 0.5, y + size * 0.6, x, y + size * 0.9, x, y + size * 1.2);
    ctx.bezierCurveTo(x, y + size * 0.9, x + size * 0.5, y + size * 0.6, x + size * 0.5, y + size * 0.3);
    ctx.bezierCurveTo(x + size * 0.5, y, x, y, x, y + size * 0.3);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  const tick = (time) => {
    ctx.clearRect(0, 0, width, height);
    hearts.forEach((heart) => {
      heart.y += heart.speed;
      heart.x = heart.baseX + Math.sin(time * heart.swayFreq + heart.swayPhase) * heart.swayAmp;

      if (heart.x < -heart.size * 2) heart.x = width + heart.size;
      if (heart.x > width + heart.size * 2) heart.x = -heart.size;

      if (heart.y - heart.size * 2 > height) {
        Object.assign(heart, createHeart(-heart.size * 6));
      }

      ctx.shadowColor = colorWithOpacity(heart.color, Math.min(1, heart.opacity + 0.4));
      ctx.shadowBlur = 16;
      drawHeart(heart.x, heart.y, heart.size, colorWithOpacity(heart.color, heart.opacity));
      ctx.shadowBlur = 0;
    });

    frameId = window.requestAnimationFrame(tick);
  };

  resize();
  window.addEventListener('resize', resize);
  frameId = window.requestAnimationFrame(tick);

  return () => {
    if (frameId) window.cancelAnimationFrame(frameId);
    window.removeEventListener('resize', resize);
    canvas.remove();
  };
};

const StudentSignup = () => {
  const { register, handleSubmit, watch, formState: { errors }, getValues } = useForm();
  const [signupError, setSignupError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1); // 1 = form, 2 = OTP verification
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);
  const deviceLabel = useMemo(() => getDeviceLabel(), []);

  const password = watch('password');
  const email = watch('email');
  const accessHelpNumber = '+2347037367480';
  const accessHelpWaLink = `https://wa.me/${accessHelpNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
    'Hello, I need my student signup access code for NCLEX KEYS.'
  )}`;
  const showAccessHelp = /access code/i.test(signupError) || /access code/i.test(otpError);

  useEffect(() => {
    document.body.classList.add('signup-love-rain-active');
    const cleanup = initLoveRainBackground();
    return () => {
      document.body.classList.remove('signup-love-rain-active');
      cleanup();
    };
  }, []);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setResendDisabled(false);
    }
  }, [countdown]);

  // Handle form submission - send OTP
  const onContinue = async (data) => {
    setLoading(true);
    setSignupError('');
    try {
      const response = await axios.post('/api/auth/student/send-otp', {
        email: data.email,
        name: `${data.firstName} ${data.lastName}`,
        accessCode: data.accessCode  // ⭐ Include access code for early validation
      });
      
      if (response.data.skipOtp) {
        // Email not configured, proceed directly with registration
        await registerUser(data, null);
      } else {
        // Move to OTP verification step
        setStep(2);
        setResendDisabled(true);
        setCountdown(60); // 60 second cooldown
      }
    } catch (error) {
      setSignupError(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification and registration
  const onVerifyAndRegister = async () => {
    if (!otp || otp.length < 6) {
      setOtpError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setOtpError('');
    
    try {
      await registerUser(getValues(), otp);
    } catch (error) {
      setOtpError(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Register user with or without OTP
  const registerUser = async (data, otpValue) => {
    const payload = {
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      password: data.password,
      program: data.program,
      phone: data.phone,
      country: data.country,
      examDate: data.examDate || null,
      accessCode: data.accessCode,
      deviceId,
      deviceLabel
    };

    if (otpValue) {
      payload.otp = otpValue;
    }

    if (otpValue) {
      // Use verify-otp-and-register endpoint
      const response = await axios.post('/api/auth/student/verify-otp-and-register', payload);
      // Redirect to login page with success message
      navigate('/login', { state: { message: 'Registration successful! Please login to continue.' } });
    } else {
      // Use regular register endpoint (email not configured)
      await axios.post('/api/auth/student/register', payload);
      navigate('/login', { state: { message: 'Registration successful! Please login.' } });
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendDisabled) return;
    
    setLoading(true);
    setOtpError('');
    try {
      const data = getValues();
      await axios.post('/api/auth/student/send-otp', {
        email: data.email,
        name: `${data.firstName} ${data.lastName}`,
        accessCode: data.accessCode  // ⭐ Include access code for early validation
      });
      setResendDisabled(true);
      setCountdown(60);
    } catch (error) {
      setOtpError(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // Go back to form step
  const handleBack = () => {
    setStep(1);
    setOtp('');
    setOtpError('');
  };

  return (
    <div className="signup-clean-page">
      <div className="signup-clean-card-shell">
        <div className="signup-clean-card">
          <div className="signup-clean-header">
            <i className="fas fa-user-graduate signup-clean-header-icon" aria-hidden="true" />
            <h1>{step === 1 ? 'Signup' : 'Verify Email'}</h1>
            <p>{step === 1 ? 'Create your NCLEX KEYS account' : `Enter the OTP sent to ${email}`}</p>
          </div>
          <div className="signup-clean-form-wrap">
            {step === 1 ? (
              // Step 1: Registration Form
              <>
                {signupError && (
                  <div className="alert alert-danger">
                    {showAccessHelp ? (
                      <a href={accessHelpWaLink} target="_blank" rel="noreferrer">
                        Message {accessHelpNumber} on WhatsApp to get your access code
                      </a>
                    ) : (
                      <div>{signupError}</div>
                    )}
                  </div>
                )}

                <form onSubmit={handleSubmit(onContinue)} className="signup-clean-form">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold">First Name</label>
                      <input
                        type="text"
                        className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                        autoComplete="given-name"
                        {...register('firstName', { required: 'First name is required' })}
                      />
                      {errors.firstName && <div className="invalid-feedback">{errors.firstName.message}</div>}
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold">Last Name</label>
                      <input
                        type="text"
                        className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                        autoComplete="family-name"
                        {...register('lastName', { required: 'Last name is required' })}
                      />
                      {errors.lastName && <div className="invalid-feedback">{errors.lastName.message}</div>}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Email Address</label>
                    <input
                      type="email"
                      className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                      autoComplete="email"
                      {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })}
                    />
                    {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Phone Number (optional)</label>
                    <input
                      type="tel"
                      className="form-control"
                      autoComplete="tel"
                      {...register('phone')}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Country</label>
                    <select
                      className={`form-control ${errors.country ? 'is-invalid' : ''}`}
                      autoComplete="country-name"
                      {...register('country', { required: 'Country is required' })}
                    >
                      <option value="">Select country</option>
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                    {errors.country && <div className="invalid-feedback">{errors.country.message}</div>}
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Program</label>
                    <select
                      className={`form-control ${errors.program ? 'is-invalid' : ''}`}
                      {...register('program', { required: 'Program is required' })}
                    >
                      <option value="">Select program</option>
                      <option value="NCLEX-RN">NCLEX-RN</option>
                      <option value="NCLEX-PN">NCLEX-PN</option>
                    </select>
                    {errors.program && <div className="invalid-feedback">{errors.program.message}</div>}
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Access Code Given To You By Admin</label>
                    <input
                      type="text"
                      className={`form-control ${errors.accessCode ? 'is-invalid' : ''}`}
                      autoComplete="one-time-code"
                      {...register('accessCode', { required: 'Access code is required' })}
                    />
                    {errors.accessCode && <div className="invalid-feedback">{errors.accessCode.message}</div>}
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Expected Exam Date (optional but recommended)</label>
                    <input
                      type="date"
                      className="form-control"
                      {...register('examDate')}
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold">Password</label>
                      <div className="input-group">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                          autoComplete="new-password"
                          {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Minimum 8 characters' } })}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                        </button>
                        {errors.password && <div className="invalid-feedback d-block">{errors.password.message}</div>}
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold">Confirm Password</label>
                      <div className="input-group">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                          autoComplete="new-password"
                          {...register('confirmPassword', {
                            required: 'Please confirm password',
                            validate: value => value === password || 'Passwords do not match'
                          })}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        >
                          <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                        </button>
                        {errors.confirmPassword && <div className="invalid-feedback d-block">{errors.confirmPassword.message}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="form-check mb-4">
                    <input
                      type="checkbox"
                      className={`form-check-input ${errors.terms ? 'is-invalid' : ''}`}
                      id="terms"
                      {...register('terms', { required: 'You must agree to the terms' })}
                    />
                    <label className="form-check-label" htmlFor="terms">
                      I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
                    </label>
                    {errors.terms && <div className="invalid-feedback d-block">{errors.terms.message}</div>}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100 py-3 fw-bold signup-clean-submit"
                    disabled={loading}
                  >
                    {loading ? 'Sending OTP...' : 'Continue'}
                  </button>
                </form>
              </>
            ) : (
              // Step 2: OTP Verification
              <>
                {otpError && (
                  <div className="alert alert-danger">
                    {showAccessHelp ? (
                      <a href={accessHelpWaLink} target="_blank" rel="noreferrer">
                        Message {accessHelpNumber} on WhatsApp to get your access code
                      </a>
                    ) : (
                      <div>{otpError}</div>
                    )}
                  </div>
                )}

                <div className="text-center mb-4">
                  <i className="fas fa-envelope-open-text fa-3x text-primary mb-3"></i>
                  <p className="text-muted">
                    We&apos;ve sent a 6-digit verification code to<br />
                    <strong>{email}</strong>
                  </p>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-bold">Enter OTP</label>
                  <input
                    type="text"
                    className="form-control form-control-lg text-center"
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    style={{ letterSpacing: '0.5em', fontSize: '1.5rem' }}
                  />
                </div>

                <div className="d-grid gap-2 mb-3">
                  <button
                    type="button"
                    className="btn btn-primary py-3 fw-bold"
                    onClick={onVerifyAndRegister}
                    disabled={loading || otp.length < 6}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Verifying...
                      </>
                    ) : (
                      'Verify & Complete Registration'
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    className="btn btn-link"
                    onClick={handleBack}
                    disabled={loading}
                  >
                    <i className="fas fa-arrow-left me-2"></i>Back to form
                  </button>
                </div>

                <div className="text-center mt-3">
                  <p className="text-muted mb-2">Didn&apos;t receive the code?</p>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={handleResendOtp}
                    disabled={resendDisabled || loading}
                  >
                    {resendDisabled ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                  </button>
                </div>
              </>
            )}

            <div className="login-link text-center mt-4 signup-clean-links">
              Already have an account? <Link to="/login">Login here</Link>
            </div>
            <div className="back-home text-center mt-3 signup-clean-links">
              <Link to="/" className="signup-clean-back-home">
                <i className="fas fa-arrow-left me-2"></i>Back to Homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSignup;
