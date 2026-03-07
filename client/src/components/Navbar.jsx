import React from 'react';
import { Link } from 'react-router-dom';
import PwaInstallButton from './PwaInstallButton';

const Navbar = () => {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white fixed-top shadow-sm py-2">
      <div className="container-fluid px-4 nki-navbar-shell">
{/* Logo - replace the icon with image */}
<Link className="navbar-brand p-0 nki-navbar-brand" to="/">
  <div className="d-flex align-items-center">
    <img src="/images/logo.png.jpg" alt="NCLEX KEYS" height="50" className="me-2 nki-navbar-logo" />
    <div>
      <span className="fw-bold nki-navbar-brand-title nki-navbar-brand-nclex" style={{ fontSize: '1.8rem', color: '#1a5fb4', lineHeight: 1.2 }}>NCLEX</span>
      <span className="fw-bold nki-navbar-brand-title nki-navbar-brand-keys" style={{ fontSize: '1.8rem', color: '#28a745', lineHeight: 1.2 }}>KEYS</span>
      <div className="text-muted small nki-navbar-brand-tagline" style={{ fontSize: '0.8rem', marginTop: '-5px' }}>International</div>
    </div>
  </div>
</Link>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center nki-navbar-actions">
            {/* Brainiac button - purple outline, on right edge */}
            <li className="nav-item">
              <PwaInstallButton
                variant="navbar"
                className="me-2 nki-navbar-install-btn"
                label="Install App"
                compactLabel="Install"
              />
            </li>
            <li className="nav-item">
              <Link className="btn btn-outline-primary me-2 nki-navbar-brainiac-btn" to="/brainiac" style={{ borderColor: '#6f42c1', color: '#6f42c1' }}>
                <i className="fas fa-brain me-1"></i>Meet our Brainiac
              </Link>
            </li>
            <li className="nav-item">
              <Link className="btn btn-outline-success me-2 nki-navbar-knowledge-btn" to="/test-your-knowledge">
                <i className="fas fa-clipboard-check me-1"></i>Test Your Knowledge
              </Link>
            </li>
            {/* Login button - solid blue, on right edge */}
            <li className="nav-item">
              <Link className="btn btn-primary nki-navbar-login-btn" to="/login">
                <i className="fas fa-sign-in-alt me-1"></i>Login
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
