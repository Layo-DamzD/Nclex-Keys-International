import React, { useState, useEffect, useMemo } from 'react';
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

  // Upload counts state
  const [uploadCounts, setUploadCounts] = useState(null);
  const [uploadCountsLoading, setUploadCountsLoading] = useState(true);

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
    fetchUploadCounts();
  }, []);

  const fetchUploadCounts = async () => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/upload-counts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUploadCounts(response.data);
    } catch (err) {
      console.error('Error fetching upload counts:', err);
    } finally {
      setUploadCountsLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/users/admins', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdmins(response.data);
    } catch (err) {
      setError('Failed to load admins');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Chart data derived from dailyBreakdown
  const chartData = useMemo(() => {
    if (!uploadCounts?.dailyBreakdown) return [];
    return uploadCounts.dailyBreakdown;
  }, [uploadCounts]);

  const maxChartValue = useMemo(() => {
    if (!chartData.length) return 1;
    return Math.max(...chartData.map((d) => d.count), 1);
  }, [chartData]);

  const handleApprove = async (adminId) => {
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.put(`/api/admin/approve/${adminId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdmins((prev) =>
        prev.map((admin) =>
          admin._id === adminId ? { ...admin, approved: true } : admin
        )
      );
    } catch {
      alert('Failed to approve admin');
    }
  };

  const handleDelete = async (adminId) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.delete(`/api/admin/users/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` },
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
        headers: { Authorization: `Bearer ${token}` },
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

      {/* ─── Upload Counters ─── */}
      <div style={{ marginBottom: '24px' }}>
        {uploadCountsLoading ? (
          <div style={{
            display: 'flex', gap: '16px', flexWrap: 'wrap',
          }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} style={{
                background: '#f1f5f9', borderRadius: '14px', padding: '20px 24px',
                minWidth: '180px', flex: 1, height: '110px',
              }}>
                <div style={{ width: '40%', height: '10px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '10px' }} />
                <div style={{ width: '60%', height: '24px', background: '#e2e8f0', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        ) : uploadCounts ? (
          <>
            {/* Stats Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '18px' }}>
              {/* Today */}
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                borderRadius: '14px', padding: '18px 20px', border: '1px solid #bfdbfe',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    background: '#3b82f6', color: '#fff', display: 'grid', placeItems: 'center',
                    fontSize: '1rem',
                  }}>
                    <i className="fas fa-calendar-day" />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e40af' }}>Today</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e40af', lineHeight: 1 }}>
                  {uploadCounts.today}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '2px' }}>questions uploaded</div>
              </div>

              {/* This Month */}
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                borderRadius: '14px', padding: '18px 20px', border: '1px solid #bbf7d0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    background: '#16a34a', color: '#fff', display: 'grid', placeItems: 'center',
                    fontSize: '1rem',
                  }}>
                    <i className="fas fa-calendar-alt" />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#166534' }}>This Month</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#166534', lineHeight: 1 }}>
                  {uploadCounts.thisMonth}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '2px' }}>questions uploaded</div>
              </div>

              {/* This Year */}
              <div style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                borderRadius: '14px', padding: '18px 20px', border: '1px solid #fcd34d',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    background: '#d97706', color: '#fff', display: 'grid', placeItems: 'center',
                    fontSize: '1rem',
                  }}>
                    <i className="fas fa-calendar" />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400e' }}>This Year</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#92400e', lineHeight: 1 }}>
                  {uploadCounts.thisYear}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '2px' }}>questions uploaded</div>
              </div>

              {/* Total Published */}
              <div style={{
                background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                borderRadius: '14px', padding: '18px 20px', border: '1px solid #ddd6fe',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    background: '#7c3aed', color: '#fff', display: 'grid', placeItems: 'center',
                    fontSize: '1rem',
                  }}>
                    <i className="fas fa-database" />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5b21b6' }}>Total Published</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#5b21b6', lineHeight: 1 }}>
                  {uploadCounts.totalPublished?.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '2px' }}>questions in bank</div>
              </div>

              {/* Drafts */}
              <div style={{
                background: 'linear-gradient(135deg, #fff1f2 0%, #fecdd3 100%)',
                borderRadius: '14px', padding: '18px 20px', border: '1px solid #fda4af',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    background: '#dc2626', color: '#fff', display: 'grid', placeItems: 'center',
                    fontSize: '1rem',
                  }}>
                    <i className="fas fa-file-pen" />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#991b1b' }}>Drafts</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#991b1b', lineHeight: 1 }}>
                  {uploadCounts.totalDrafts?.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '2px' }}>unfinished questions</div>
              </div>
            </div>

            {/* Mini Bar Chart: Last 30 Days */}
            {chartData.length > 0 && (
              <div style={{
                background: '#fff',
                borderRadius: '14px',
                padding: '18px 20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h6 style={{ margin: 0, fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>
                    <i className="fas fa-chart-bar me-2" style={{ color: '#6366f1' }}></i>
                    Upload Activity — Last 30 Days
                  </h6>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Total: {chartData.reduce((sum, d) => sum + d.count, 0)} questions
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '2px',
                  height: '100px',
                  padding: '0 2px',
                }}>
                  {chartData.map((day, i) => {
                    const heightPercent = maxChartValue > 0 ? (day.count / maxChartValue) * 100 : 0;
                    const isToday = i === chartData.length - 1;
                    return (
                      <div
                        key={day.date}
                        title={`${day.label}: ${day.count} question${day.count !== 1 ? 's' : ''}`}
                        style={{
                          flex: 1,
                          minWidth: '0',
                          height: `${Math.max(heightPercent, 2)}%`,
                          background: isToday
                            ? 'linear-gradient(180deg, #6366f1 0%, #818cf8 100%)'
                            : day.count > 0
                              ? 'linear-gradient(180deg, #a5b4fc 0%, #c7d2fe 100%)'
                              : '#f1f5f9',
                          borderRadius: '3px 3px 0 0',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.75';
                          e.currentTarget.style.transform = 'scaleY(1.05)';
                          e.currentTarget.style.transformOrigin = 'bottom';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.transform = 'scaleY(1)';
                        }}
                      />
                    );
                  })}
                </div>
                {/* Date labels */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '6px',
                  fontSize: '0.68rem',
                  color: '#94a3b8',
                }}>
                  <span>{chartData[0]?.label}</span>
                  <span>{chartData[Math.floor(chartData.length / 2)]?.label}</span>
                  <span style={{ fontWeight: 600, color: '#6366f1' }}>{chartData[chartData.length - 1]?.label} (Today)</span>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* ─── Admin Table ─── */}
      <div className="form-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Uploaded</th>
              <th>Access Code</th>
              <th>Your Students</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                  No admins found
                </td>
              </tr>
            ) : (
              admins.map((admin) => {
                const isCurrentAdmin = String(admin._id) === String(currentAdminId || '');
                const adminStats = uploadCounts?.perAdminStats?.[String(admin._id)];
                const todayCount = adminStats?.today || 0;
                const monthCount = adminStats?.thisMonth || 0;
                const yearCount = adminStats?.thisYear || 0;
                const totalAdminCount = adminStats?.total || 0;

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
                      <div style={{ minWidth: '110px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                            {totalAdminCount.toLocaleString()}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>total</span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.5 }}>
                          <span title="Today" style={{ cursor: 'default' }}>D: <strong>{todayCount}</strong></span>
                          {' · '}
                          <span title="This Month" style={{ cursor: 'default' }}>M: <strong>{monthCount}</strong></span>
                          {' · '}
                          <span title="This Year" style={{ cursor: 'default' }}>Y: <strong>{yearCount}</strong></span>
                        </div>
                      </div>
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

      {/* Student Scope Modal */}
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
            padding: '20px',
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
