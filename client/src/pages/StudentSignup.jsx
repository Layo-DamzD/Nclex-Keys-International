import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

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

const StudentSignup = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [signupError, setSignupError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedFace, setCapturedFace] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);
  const deviceLabel = useMemo(() => getDeviceLabel(), []);

  const password = watch('password');
  const accessHelpNumber = '07037367480';
  const accessHelpWaLink = `https://wa.me/${accessHelpNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
    'Hello, I need my student signup access code for NCLEX KEYS.'
  )}`;
  const showAccessHelp = /invalid access code/i.test(signupError);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported on this device/browser.');
      return;
    }
    setCameraLoading(true);
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      setCameraError('Unable to access camera. Please allow camera permission and reload.');
    } finally {
      setCameraLoading(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const captureFace = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, width, height);
    setCapturedFace(canvas.toDataURL('image/jpeg', 0.92));
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setSignupError('');
    if (!capturedFace) {
      setSignupError('Face verification is required before signup.');
      setLoading(false);
      return;
    }
    try {
      await axios.post('/api/auth/student/register', {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        password: data.password,
        program: data.program,
        phone: data.phone,
        examDate: data.examDate || null,
        accessCode: data.accessCode,
        faceCapture: capturedFace,
        deviceId,
        deviceLabel
      });
      navigate('/login', { state: { message: 'Registration successful! Please login.' } });
    } catch (error) {
      setSignupError(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-clean-page">
      <div className="signup-clean-card-shell">
        <div className="signup-clean-card">
          <div className="signup-clean-header">
            <i className="fas fa-user-graduate signup-clean-header-icon" aria-hidden="true" />
            <h1>Signup</h1>
            <p>Create your NCLEX KEYS account</p>
          </div>
          <div className="signup-clean-form-wrap">
            {signupError && (
              <div className="alert alert-danger">
                <div>{signupError}</div>
                {showAccessHelp && (
                  <div className="mt-2">
                    <a href={accessHelpWaLink} target="_blank" rel="noreferrer">
                      Message {accessHelpNumber} on WhatsApp to get your access code
                    </a>
                  </div>
                )}
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="signup-clean-form">
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

            {/* Program field */}
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

              <div className="mb-3 signup-face-block">
                <label className="form-label fw-bold">Face Verification (required)</label>
                <div className="signup-face-preview">
                  {capturedFace ? (
                    <img src={capturedFace} alt="Captured face for signup verification" />
                  ) : (
                    <video ref={videoRef} autoPlay muted playsInline />
                  )}
                </div>
                {cameraError && <div className="text-danger mt-2 small">{cameraError}</div>}
                <div className="d-flex gap-2 mt-2 flex-wrap">
                  {!capturedFace ? (
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={captureFace}
                      disabled={cameraLoading}
                    >
                      {cameraLoading ? 'Starting camera...' : 'Capture Face'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setCapturedFace('')}
                    >
                      Retake
                    </button>
                  )}
                </div>
              </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">Password</label>
                <input
                  type="password"
                  className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                  autoComplete="new-password"
                  {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Minimum 8 characters' } })}
                />
                {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">Confirm Password</label>
                <input
                  type="password"
                  className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                  autoComplete="new-password"
                  {...register('confirmPassword', {
                    required: 'Please confirm password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                />
                {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword.message}</div>}
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
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
            </form>

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
