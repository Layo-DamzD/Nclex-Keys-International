import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminApproval = () => {
  const currentAdmin = JSON.parse(sessionStorage.getItem('adminUser') || '{}');
  const currentAdminId = currentAdmin?._id;
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visibleSecrets, setVisibleSecrets] = useState({});

  const isSecretVisible = (adminId, field) => Boolean(visibleSecrets[`${adminId}:${field}`]);
  const toggleSecretVisibility = (adminId, field) => {
    const key = `${adminId}:${field}`;
    setVisibleSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const maskSecret = (value) => {
    const str = String(value || '');
    if (!str) return 'Not set';
    return '*'.repeat(Math.max(12, Math.min(str.length, 64)));
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/users/admins', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdmins(response.data);
    } catch (err) {
      setError('Failed to load admins');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (adminId) => {
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.put(`/api/admin/approve/${adminId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdmins(prev => prev.map(admin =>
        admin._id === adminId ? { ...admin, approved: true } : admin
      ));
    } catch {
      alert('Failed to approve admin');
    }
  };

  const handleDelete = async (adminId) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.delete(`/api/admin/users/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdmins(prev => prev.filter(admin => admin._id !== adminId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete admin');
    }
  };

  if (loading) return <div>Loading admins...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="admin-approval">
      <div className="header" style={{ marginBottom: '20px' }}>
        <h1>Admin Approval</h1>
        <p style={{ color: '#64748b' }}>Manage and approve administrator accounts</p>
      </div>

      <div className="form-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Access Code</th>
              <th>Password Hash</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                  No admins found
                </td>
              </tr>
            ) : (
              admins.map(admin => {
                const isCurrentAdmin = String(admin._id) === String(currentAdminId || '');

                return (
                  <tr key={admin._id}>
                    <td>{admin.name}</td>
                    <td>{admin.email}</td>
                    <td>
                      <span className={`badge ${admin.role === 'superadmin' ? 'badge-info' : 'badge-primary'}`}>
                        {admin.role}
                      </span>
                    </td>
                    <td>
                      {admin.status === 'inactive' ? (
                        <span className="badge badge-danger">Inactive</span>
                      ) : admin.role === 'superadmin' ? (
                        <span className="badge badge-info">Active</span>
                      ) : admin.approved ? (
                        <span className="badge badge-success">Approved</span>
                      ) : (
                        <span className="badge badge-warning">Pending</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ fontSize: '0.8rem' }}>
                          {isSecretVisible(admin._id, 'accessCode')
                            ? (admin.accessCode || 'Not set')
                            : maskSecret(admin.accessCode)}
                        </code>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => toggleSecretVisibility(admin._id, 'accessCode')}
                          aria-label={isSecretVisible(admin._id, 'accessCode') ? 'Hide access code' : 'Show access code'}
                        >
                          <i className={`fas ${isSecretVisible(admin._id, 'accessCode') ? 'fa-eye-slash' : 'fa-eye'}`} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                          {isSecretVisible(admin._id, 'passwordHash')
                            ? (admin.password || 'Not available')
                            : maskSecret(admin.password)}
                        </code>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => toggleSecretVisibility(admin._id, 'passwordHash')}
                          aria-label={isSecretVisible(admin._id, 'passwordHash') ? 'Hide password hash' : 'Show password hash'}
                        >
                          <i className={`fas ${isSecretVisible(admin._id, 'passwordHash') ? 'fa-eye-slash' : 'fa-eye'}`} />
                        </button>
                      </div>
                    </td>
                    <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                    <td>
                      {admin.role !== 'superadmin' && !admin.approved && (
                        <button
                          className="btn btn-sm btn-success me-2"
                          onClick={() => handleApprove(admin._id)}
                        >
                          Approve
                        </button>
                      )}

                      {isCurrentAdmin ? (
                        <span className="badge badge-secondary">Current account</span>
                      ) : (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(admin._id)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminApproval;

