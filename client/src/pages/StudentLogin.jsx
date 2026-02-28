import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const [pendingFaceToken, setPendingFaceToken] = useState('');
  const [capturedFace, setCapturedFace] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [faceSubmitting, setFaceSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();
  const { refreshUser } = useUser();
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);
  const deviceLabel = useMemo(() => getDeviceLabel(), []);

  const techOfficerRawNumber = '07038377480';
  const techOfficerWhatsAppDigits = techOfficerRawNumber.replace(/\D/g, '');
  const isSuspendedAccountError = /(account|acct) has been suspended/i.test(loginError);
  const techOfficerWhatsappLink = techOfficerWhatsAppDigits
    ? `https://wa.me/${techOfficerWhatsAppDigits}?text=${encodeURIComponent(
        'Hello Tech Officer, my NCLEX KEYS account was suspended and I need help logging in.'
      )}`
    : '';

  const toggleLamp = () => setLampOn((prev) => !prev);

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
    setCameraError('');
    setCameraLoading(true);
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
      setCameraError('Unable to access camera. Please allow camera permission and try again.');
    } finally {
      setCameraLoading(false);
    }
  };

  useEffect(() => {
    if (!pendingFaceToken) {
      stopCamera();
      return undefined;
    }
    startCamera();
    return () => stopCamera();
  }, [pendingFaceToken]);

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
    const image = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedFace(image);
  };

  const submitFaceVerification = async () => {
    if (!capturedFace || !pendingFaceToken) {
      setLoginError('Capture your face before continuing.');
      return;
    }
    setFaceSubmitting(true);
    setLoginError('');
    try {
      const response = await axios.post('/api/auth/student/verify-face', {
        verificationToken: pendingFaceToken,
        faceCapture: capturedFace,
        deviceId,
        deviceLabel
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
      await refreshUser();
      setPendingFaceToken('');
      setCapturedFace('');
      navigate('/dashboard');
    } catch (error) {
      setLoginError(error.response?.data?.message || 'Face verification failed');
    } finally {
      setFaceSubmitting(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setLoginError('');
    setCameraError('');
    try {
      const response = await axios.post('/api/auth/student/login', {
        email: data.email,
        password: data.password,
        deviceId,
        deviceLabel
      });
      if (response?.data?.requiresFaceVerification) {
        setPendingFaceToken(response.data.verificationToken || '');
        setCapturedFace('');
        setLampOn(true);
        setLoginError(response.data.message || 'New device detected. Complete face verification.');
        return;
      }
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

          {pendingFaceToken ? (
            <div className="lamp-face-verify">
              <div className="lamp-face-verify-title">Face Verification Required</div>
              <p className="lamp-face-verify-note">
                New device detected. Capture your face to continue.
              </p>
              <div className="lamp-face-verify-preview">
                {capturedFace ? (
                  <img src={capturedFace} alt="Captured face for verification" />
                ) : (
                  <video ref={videoRef} autoPlay muted playsInline />
                )}
              </div>
              {cameraError && <div className="lamp-face-verify-error">{cameraError}</div>}
              <div className="lamp-face-verify-actions">
                {!capturedFace ? (
                  <button
                    type="button"
                    className="btn lamp-login-submit-btn w-100 py-2 fw-bold"
                    onClick={captureFace}
                    disabled={cameraLoading || faceSubmitting}
                  >
                    {cameraLoading ? 'Starting camera...' : 'Capture Face'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn lamp-login-submit-btn w-100 py-2 fw-bold"
                      onClick={submitFaceVerification}
                      disabled={faceSubmitting}
                    >
                      {faceSubmitting ? 'Verifying...' : 'Verify and Continue'}
                    </button>
                    <button
                      type="button"
                      className="btn lamp-login-toggle-cta w-100"
                      onClick={() => setCapturedFace('')}
                      disabled={faceSubmitting}
                    >
                      Retake
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
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
          )}

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

