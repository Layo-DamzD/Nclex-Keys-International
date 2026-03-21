import React from 'react';
import { Link } from 'react-router-dom';
import './AdminSecret.css';

const AdminSecret = () => {
  return (
    <div className="admin-secret-page">
      <div className="secret-container">
        <div className="security-header">
          <div className="security-icon">🔐</div>
          <h1>SECURE ACCESS</h1>
          <p>Administrator Portal Entry Point</p>
        </div>

        <div className="access-card">
          <div className="access-title">Choose Access Method</div>
          <div className="access-options">
            <Link to="/admin/login" className="access-btn">
              <i className="fas fa-sign-in-alt"></i>
              <span>Admin Login</span>
            </Link>
            <Link to="/admin/signup" className="access-btn">
              <i className="fas fa-user-plus"></i>
              <span>Admin Signup</span>
            </Link>
          </div>

          <div className="warning-box">
            <i className="fas fa-exclamation-triangle"></i>
            <div className="warning-text">
              <strong>Security Notice:</strong> This portal is restricted to authorized NCLEX KEYS administrators only.
              All access attempts are logged and monitored.
            </div>
          </div>
        </div>

        <div className="secret-footer">
          © 2026 NCLEX KEYS International • <Link to="/">Return to Public Site</Link>
        </div>
      </div>
    </div>
  );
};

export default AdminSecret;
