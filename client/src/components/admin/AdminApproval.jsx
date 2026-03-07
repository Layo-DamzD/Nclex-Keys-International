import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminApproval = () => {
  const currentAdmin = JSON.parse(sessionStorage.getItem('adminUser') || '{}');
  const currentAdminId = currentAdmin?._id;
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visibleSecrets, setVisibleSecrets] = useState({});
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [scopeSaving, setScopeSaving] = useState(false);
  const [scopeError, setScopeError] = useState('');
  const [scopeAdmin, setScopeAdmin] = useState(null);
  const [scopeStudents, setScopeStudents] = useState([]);
  const [scopeSelectedIds, setScopeSelectedIds] = useState([]);

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
      setAdmins((prev) => prev.map((admin) =>
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
      setAdmins((prev) => prev.filter((admin) => admin._id !== adminId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete admin');
    }
  };

  const openManageStudents = async (admin) => {
    try {
      setScopeModalOpen(true);
      setScopeLoading(true);
      setScopeSaving(false);
      setScopeError('');
      setScopeAdmin(admin);
      setScopeStudents([]);
      setScopeSelectedIds([]);

      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get(`/api/admin/users/${admin._id}/student-scope`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setScopeStudents(Array.isArray(response.data?.students) ? response.data.students : []);
      setScopeSelectedIds(Array.isArray(response.data?.assignedStudentIds) ? response.data.assignedStudentIds : []);
    } catch (err) {
      setScopeError(err.response?.data?.message || 'Failed to load student scope');
    } finally {
      setScopeLoading(false);
    }
  };

  const closeManageStudents = () => {
    setScopeModalOpen(false);
    setScopeError('');
    setScopeAdmin(null);
    setScopeStudents([]);
    setScopeSelectedIds([]);
  };

  const toggleScopeStudent = (studentId) => {
    setScopeSelectedIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleScopeSelectAll = () => {
    if (scopeSelectedIds.length === scopeStudents.length) {
      setScopeSelectedIds([]);
      return;
    }
    setScopeSelectedIds(scopeStudents.map((student) => student._id));
  };

  const saveManageStudents = async () => {
    if (!scopeAdmin?._id) return;

    try {
      setScopeSaving(true);
      setScopeError('');
      const token = sessionStorage.getItem('adminToken');
      await axios.put(
        `/api/admin/users/${scopeAdmin._id}/student-scope`,
        { studentIds: scopeSelectedIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAdmins((prev) =>
        prev.map((admin) =>
          admin._id === scopeAdmin._id ? { ...admin, managedStudents: [...scopeSelectedIds] } : admin
        )
      );
      closeManageStudents();
    } catch (err) {
      setScopeError(err.response?.data?.message || 'Failed to save student scope');
    } finally {
      setScopeSaving(false);
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
              <th>Your Students</th>
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
              admins.map((admin) => {
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
                    <td>{admin.role === 'admin' ? (Array.isArray(admin.managedStudents) ? admin.managedStudents.length : 0) : '-'}</td>
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

                      {admin.role === 'admin' && (
                        <button
                          className="btn btn-sm btn-primary me-2"
                          onClick={() => openManageStudents(admin)}
                        >
                          Manage Students
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

      {scopeModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px'
          }}
        >
          <div className="form-card" style={{ width: '100%', maxWidth: '720px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ marginBottom: 0 }}>Manage Students: {scopeAdmin?.name || 'Admin'}</h3>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeManageStudents}>
                Close
              </button>
            </div>

            {scopeError && <div className="alert alert-danger">{scopeError}</div>}

            {scopeLoading ? (
              <div>Loading students...</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ color: '#64748b' }}>
                    Assign which students this tutor can view and set tests for.
                  </div>
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={toggleScopeSelectAll}>
                    {scopeSelectedIds.length === scopeStudents.length && scopeStudents.length > 0 ? 'Clear All' : 'Select All'}
                  </button>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '420px', overflowY: 'auto' }}>
                  <table className="data-table" style={{ marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}></th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Program</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scopeStudents.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>No students found</td>
                        </tr>
                      ) : (
                        scopeStudents.map((student) => (
                          <tr key={student._id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={scopeSelectedIds.includes(student._id)}
                                onChange={() => toggleScopeStudent(student._id)}
                              />
                            </td>
                            <td>{student.name}</td>
                            <td>{student.email}</td>
                            <td>{student.program || 'NCLEX-RN'}</td>
                            <td>{student.status || 'active'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>{scopeSelectedIds.length} selected</span>
                  <button type="button" className="btn btn-success" onClick={saveManageStudents} disabled={scopeSaving}>
                    {scopeSaving ? 'Saving...' : 'Save Scope'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApproval;
