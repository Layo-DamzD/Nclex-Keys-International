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

  const [uploadCounts, setUploadCounts] = useState(null);
  const [uploadCountsLoading, setUploadCountsLoading] = useState(true);

  const isSuperAdmin = String(currentAdmin?.role || '').trim().toLowerCase() === 'superadmin';
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [recalcMessage, setRecalcMessage] = useState('');

  // 30-day chart data
  const chartData = useMemo(() => {
    if (!uploadCounts?.dailyBreakdown) return [];
    return uploadCounts.dailyBreakdown.map((d) => ({
      label: d.label,
      value: d.count,
      isToday: d.date === new Date().toISOString().split('T')[0],
    }));
  }, [uploadCounts]);

  const maxChartValue = useMemo(() => {
    if (!chartData.length) return 1;
    return Math.max(...chartData.map((d) => d.value), 1);
  }, [chartData]);

  const fetchUploadCounts = async () => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const res = await axios.get('/api/admin/upload-counts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUploadCounts(res.data);
    } catch (err) {
      console.error('Failed to load upload counts', err);
    } finally {
      setUploadCountsLoading(false);
    }
  };

  const handleRecalculateScores = async () => {
    if (!window.confirm('This will recalculate scores for ALL past test results using the new scoring system (1 correct option = 1 point for SATA). Continue?')) return;
    try {
      setRecalcLoading(true);
      setRecalcMessage('');
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.post('/api/admin/recalculate-scores', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecalcMessage(response.data?.message || 'Done.');
    } catch (err) {
      setRecalcMessage(err.response?.data?.message || 'Failed to recalculate scores');
    } finally {
      setRecalcLoading(false);
    }
  };

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

  const perAdminStats = uploadCounts?.perAdminStats || {};

  const getAdminUploadInfo = (adminId) => {
    const stats = perAdminStats[String(adminId)] || perAdminStats[adminId];
    if (!stats) return null;
    return stats;
  };

  if (loading) return <div>Loading admins...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="admin-approval">
      <div className="header" style={{ marginBottom: '20px' }}>
        <h1>Admin Approval</h1>
        <p style={{ color: '#64748b' }}>Manage and approve administrator accounts</p>
      </div>

      {/* ─── Upload Stats Cards ─── */}
      {!uploadCountsLoading && uploadCounts && (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px', marginBottom: '16px',
          }}>
            {[
              { label: 'Today', value: uploadCounts.today, icon: 'fa-calendar-day', bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
              { label: 'This Month', value: uploadCounts.thisMonth, icon: 'fa-calendar', bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' },
              { label: 'This Year', value: uploadCounts.thisYear, icon: 'fa-calendar-check', bg: '#fef3c7', border: '#fde68a', color: '#92400e' },
              { label: 'Total Published', value: uploadCounts.totalPublished, icon: 'fa-database', bg: '#f5f3ff', border: '#ede9fe', color: '#5b21b6' },
              { label: 'Drafts', value: uploadCounts.totalDrafts, icon: 'fa-file-pen', bg: '#fff1f2', border: '#fecdd3', color: '#991b1b' },
            ].map((card) => (
              <div key={card.label} style={{
                background: card.bg, border: `1px solid ${card.border}`, borderRadius: '10px',
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px', background: card.border,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: card.color, fontSize: '0.9rem',
                }}>
                  <i className={`fas ${card.icon}`}></i>
                </div>
                <div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: card.color, lineHeight: 1.2 }}>
                    {card.value.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>{card.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ─── 30-Day Mini Chart ─── */}
          {chartData.length > 0 && (
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px',
              padding: '14px 16px', marginBottom: '16px',
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '10px' }}>
                Upload Activity (Last 30 Days)
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '60px' }}>
                {chartData.map((d, i) => (
                  <div
                    key={i}
                    title={`${d.label}: ${d.value} questions`}
                    style={{
                      flex: 1, minHeight: '2px',
                      height: `${Math.max(2, (d.value / maxChartValue) * 100)}%`,
                      background: d.isToday ? '#6366f1' : '#c7d2fe',
                      borderRadius: '2px 2px 0 0',
                      transition: 'height 0.2s',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ─── Per-Admin Upload Progress Cards ─── */}
          {admins.length > 0 && uploadCounts && (
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px',
              padding: '16px', marginBottom: '16px',
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '12px' }}>
                <i className="fas fa-users me-1"></i> Admin Upload Progress
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                {admins.map((admin) => {
                  const info = getAdminUploadInfo(admin._id) || { today: 0, thisMonth: 0, thisYear: 0, total: 0 };
                  const maxUpload = Math.max(...admins.map(a => {
                    const s = getAdminUploadInfo(a._id);
                    return s ? (s.thisMonth || 0) : 0;
                  }), 1);
                  const monthPercent = Math.round(((info.thisMonth || 0) / maxUpload) * 100);
                  return (
                    <div key={admin._id} style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                      padding: '12px 14px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>
                          {admin.name}
                          {admin.role === 'superadmin' && <span className="badge badge-info ms-1" style={{ fontSize: '0.65rem' }}>Super</span>}
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#6366f1' }}>
                          {info.total || 0}
                        </div>
                      </div>
                      {/* Monthly progress bar */}
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '3px' }}>
                          <span>This Month: {info.thisMonth || 0}</span>
                          <span>{monthPercent}%</span>
                        </div>
                        <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${monthPercent}%`, background: 'linear-gradient(90deg, #6366f1, #818cf8)', borderRadius: '3px', transition: 'width 0.3s' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem', color: '#64748b' }}>
                        <span><i className="fas fa-calendar-day me-1"></i>Today: <strong style={{ color: '#1e40af' }}>{info.today || 0}</strong></span>
                        <span><i className="fas fa-calendar me-1"></i>Month: <strong style={{ color: '#166534' }}>{info.thisMonth || 0}</strong></span>
                        <span><i className="fas fa-calendar-check me-1"></i>Year: <strong style={{ color: '#92400e' }}>{info.thisYear || 0}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Recalculate Scores ─── */}
      {isSuperAdmin && (
        <div style={{ marginBottom: '16px' }}>
          <button
            type="button"
            className="btn btn-sm"
            disabled={recalcLoading}
            onClick={handleRecalculateScores}
            style={{
              background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
              fontWeight: 600, borderRadius: '8px', padding: '8px 16px', fontSize: '0.85rem',
            }}
          >
            {recalcLoading ? (
              <><i className="fas fa-spinner fa-spin me-1"></i> Recalculating...</>
            ) : (
              <><i className="fas fa-calculator me-1"></i> Recalculate All Past Scores (SATA Fix)</>
            )}
          </button>
          {recalcMessage && (
            <div style={{
              display: 'inline-block', marginLeft: '12px',
              background: recalcMessage.toLowerCase().includes('error') || recalcMessage.toLowerCase().includes('fail')
                ? '#fef2f2' : '#f0fdf4',
              border: recalcMessage.toLowerCase().includes('error') || recalcMessage.toLowerCase().includes('fail')
                ? '1px solid #fecaca' : '1px solid #bbf7d0',
              borderRadius: '6px', padding: '6px 12px',
              color: recalcMessage.toLowerCase().includes('error') || recalcMessage.toLowerCase().includes('fail')
                ? '#991b1b' : '#166534',
              fontSize: '0.82rem', fontWeight: 500,
            }}>
              {recalcMessage}
            </div>
          )}
        </div>
      )}

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
                      {(() => {
                        const info = getAdminUploadInfo(admin._id);
                        if (!info) return <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>0</span>;
                        return (
                          <div style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>
                            <div style={{ fontWeight: 600 }}>{(info.total || 0).toLocaleString()}</div>
                            <div style={{ color: '#64748b' }}>
                              D:{info.today || 0} &middot; M:{info.thisMonth || 0} &middot; Y:{info.thisYear || 0}
                            </div>
                          </div>
                        );
                      })()}
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
