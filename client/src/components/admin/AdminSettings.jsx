import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
};

const AdminSettings = () => {
  const token = useMemo(() => sessionStorage.getItem('adminToken'), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(null);
  const [name, setName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [clearingDevices, setClearingDevices] = useState(false);
  const [deviceMessage, setDeviceMessage] = useState('');
  const [deviceError, setDeviceError] = useState('');

  const getHeaders = useCallback(() => ({
    Authorization: `Bearer ${token}`
  }), [token]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/admin/settings', {
        headers: getHeaders()
      });
      setSettings(response.data);
      setName(response.data?.name || '');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load admin settings');
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileMessage('');
    setProfileError('');

    try {
      const response = await axios.put(
        '/api/admin/settings/profile',
        { name },
        { headers: getHeaders() }
      );

      const nextName = response?.data?.name || name;
      setName(nextName);
      setSettings((prev) => ({ ...(prev || {}), name: nextName }));
      setProfileMessage(response?.data?.message || 'Name updated successfully');

      const storedAdmin = JSON.parse(sessionStorage.getItem('adminUser') || '{}');
      sessionStorage.setItem('adminUser', JSON.stringify({
        ...storedAdmin,
        name: nextName
      }));
    } catch (err) {
      setProfileError(err?.response?.data?.message || 'Failed to update name');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    if (!currentPassword || !newPassword) {
      setPasswordError('Current and new password are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await axios.put(
        '/api/admin/settings/password',
        { currentPassword, newPassword },
        { headers: getHeaders() }
      );
      setPasswordMessage(response?.data?.message || 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err?.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleClearDevices = async () => {
    setDeviceMessage('');
    setDeviceError('');
    const proceed = window.confirm(
      'Clear all saved admin device login records for this account?'
    );
    if (!proceed) return;

    setClearingDevices(true);
    try {
      const response = await axios.delete('/api/admin/settings/devices', {
        headers: getHeaders()
      });
      setDeviceMessage(response?.data?.message || 'Device records cleared');
      setSettings((prev) => ({ ...(prev || {}), deviceLogins: [] }));
    } catch (err) {
      setDeviceError(err?.response?.data?.message || 'Failed to clear device records');
    } finally {
      setClearingDevices(false);
    }
  };

  const roleLabel = useMemo(() => {
    const normalizedRole = String(settings?.role || '').toLowerCase();
    return normalizedRole === 'superadmin' ? 'Super Admin' : 'Admin';
  }, [settings?.role]);

  const deviceLogins = Array.isArray(settings?.deviceLogins) ? settings.deviceLogins : [];

  if (loading) {
    return <div>Loading settings...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="admin-settings">
      <div className="header admin-settings-header" style={{ marginBottom: '20px' }}>
        <h1>Admin Settings</h1>
        <p style={{ color: '#64748b' }}>Update your profile and tighten account security</p>
      </div>

      <div className="form-card" style={{ marginBottom: '24px' }}>
        <h3 className="admin-section-title">Account Info</h3>
        <div className="admin-settings-info-grid">
          <div>
            <div className="admin-settings-label">Role</div>
            <div className="admin-settings-value">{roleLabel}</div>
          </div>
          <div>
            <div className="admin-settings-label">Email</div>
            <div className="admin-settings-value">{settings?.email || 'N/A'}</div>
          </div>
          <div>
            <div className="admin-settings-label">Access Code</div>
            <div className="admin-settings-value">
              {settings?.canEditAccessCode ? 'Editable' : 'Not editable in settings'}
            </div>
          </div>
        </div>
      </div>

      <form className="form-card" style={{ marginBottom: '24px' }} onSubmit={handleProfileSubmit}>
        <h3 className="admin-section-title">Profile</h3>
        {profileMessage && <div className="alert alert-success">{profileMessage}</div>}
        {profileError && <div className="alert alert-danger">{profileError}</div>}
        <div className="form-group">
          <label className="form-label">Display Name</label>
          <input
            type="text"
            className="form-control"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your full name"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={profileSaving}>
          {profileSaving ? 'Saving...' : 'Save Name'}
        </button>
      </form>

      <form className="form-card" style={{ marginBottom: '24px' }} onSubmit={handlePasswordSubmit}>
        <h3 className="admin-section-title">Change Password</h3>
        {passwordMessage && <div className="alert alert-success">{passwordMessage}</div>}
        {passwordError && <div className="alert alert-danger">{passwordError}</div>}

        <div className="admin-settings-password-grid">
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="form-control"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-control"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
          {passwordSaving ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      <div className="form-card">
        <div className="admin-settings-device-head">
          <h3 className="admin-section-title" style={{ marginBottom: 0 }}>Device Login Records</h3>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleClearDevices}
            disabled={clearingDevices}
          >
            {clearingDevices ? 'Clearing...' : 'Clear Device Records'}
          </button>
        </div>

        {deviceMessage && <div className="alert alert-success" style={{ marginTop: '14px' }}>{deviceMessage}</div>}
        {deviceError && <div className="alert alert-danger" style={{ marginTop: '14px' }}>{deviceError}</div>}

        <div className="admin-settings-device-table-wrap">
          <table className="admin-settings-device-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>IP</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {deviceLogins.length === 0 ? (
                <tr>
                  <td colSpan={3} className="admin-settings-device-empty">
                    No saved admin device records.
                  </td>
                </tr>
              ) : (
                deviceLogins.map((record, index) => (
                  <tr key={record.deviceId || record._id || index}>
                    <td>{record.label || 'Unknown Device'}</td>
                    <td>{record.ipAddress || 'N/A'}</td>
                    <td>{formatDateTime(record.lastSeenAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
