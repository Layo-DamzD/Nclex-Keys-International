import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatStudentDisplayId } from '../../utils/studentId';

const AllStudents = () => {
  const user = JSON.parse(sessionStorage.getItem('adminUser') || '{}');
  const userRole = user.role;
  const normalizedUserRole = String(userRole || '').trim().toLowerCase();
  const isSuperAdmin = ['superadmin', 'super-admin', 'super_admin'].includes(normalizedUserRole);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [togglingStudentId, setTogglingStudentId] = useState(null);
  const [actionStatus, setActionStatus] = useState('');
  const [actionStatusType, setActionStatusType] = useState('success');
  const [studentProgressById, setStudentProgressById] = useState({});
  const [studentHistoryLoadingById, setStudentHistoryLoadingById] = useState({});
  const [studentHistoryErrorById, setStudentHistoryErrorById] = useState({});
  const [clearingDevicesById, setClearingDevicesById] = useState({});

  // Notification state
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState('');

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString();
  };

  useEffect(() => {
    fetchStudents();
  }, [search, statusFilter]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('adminToken');
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter })
      });
      
      const response = await axios.get(`/api/admin/students?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load students');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentHistory = async (studentId, { force = false } = {}) => {
    if (!studentId) return;
    if (!force && studentProgressById[studentId]) return;

    try {
      setStudentHistoryLoadingById(prev => ({ ...prev, [studentId]: true }));
      setStudentHistoryErrorById(prev => ({ ...prev, [studentId]: '' }));

      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get(`/api/admin/students/${studentId}/progress?timeRange=all`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStudentProgressById(prev => ({ ...prev, [studentId]: response.data }));
    } catch (err) {
      console.error(err);
      setStudentHistoryErrorById(prev => ({
        ...prev,
        [studentId]: err?.response?.data?.message || 'Failed to load test history'
      }));
    } finally {
      setStudentHistoryLoadingById(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleToggleStatus = async (studentId) => {
    // Only superadmin can toggle status
    if (!isSuperAdmin) {
      alert('Only super admin can activate/deactivate students');
      return;
    }

    try {
      setTogglingStudentId(studentId);
      setActionStatus('');
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.put(`/api/admin/students/${studentId}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStudents(prev => prev.map(s =>
        s._id === studentId ? { ...s, status: response.data.status } : s
      ));

      setActionStatusType('success');
      setActionStatus(response?.data?.message || `Student ${response.data.status} successfully`);

      // Re-fetch so filtered lists (e.g. Active only) reflect the change immediately.
      await fetchStudents();
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to toggle student status';
      setActionStatusType('danger');
      setActionStatus(message);
      alert(message);
    } finally {
      setTogglingStudentId(null);
    }
  };

  const handleDelete = async (studentId) => {
    // Only superadmin can delete
    if (!isSuperAdmin) {
      alert('Only super admin can delete students');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      return;
    }

    try {
      setActionStatus('');
      const token = sessionStorage.getItem('adminToken');
      await axios.delete(`/api/admin/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove from list
      setStudents(prev => prev.filter(s => s._id !== studentId));
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
      setActionStatusType('success');
      setActionStatus('Student deleted successfully');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete student';
      setActionStatusType('danger');
      setActionStatus(message);
      alert(message);
    }
  };

  const handleSelectStudent = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s._id));
    }
  };

  const handleSendNotification = async (sendToAll = false) => {
    if (!notifyTitle || !notifyMessage) {
      setNotifyStatus('Please enter both title and message');
      return;
    }

    // Check permissions
    if (sendToAll && !isSuperAdmin) {
      setNotifyStatus('Only super admin can send notifications to all students');
      return;
    }

    if (!sendToAll && selectedStudents.length === 0) {
      setNotifyStatus('Please select at least one student');
      return;
    }

    setNotifyLoading(true);
    setNotifyStatus('');

    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.post('/api/admin/students/notify', {
        title: notifyTitle,
        message: notifyMessage,
        studentIds: sendToAll ? [] : selectedStudents
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotifyStatus(`✅ ${response.data.message}`);
      setNotifyTitle('');
      setNotifyMessage('');
      setSelectedStudents([]);
    } catch (err) {
      setNotifyStatus(`❌ ${err.response?.data?.message || 'Failed to send notification'}`);
    } finally {
      setNotifyLoading(false);
    }
  };

  const toggleStudentDetails = (studentId) => {
    const nextExpanded = expandedStudent === studentId ? null : studentId;
    setExpandedStudent(nextExpanded);

    if (nextExpanded) {
      fetchStudentHistory(studentId);
    }
  };

  const handleClearStudentDevices = async (studentId) => {
    if (!studentId) return;
    if (!window.confirm('Clear this student device history?')) return;

    try {
      setClearingDevicesById((prev) => ({ ...prev, [studentId]: true }));
      const token = sessionStorage.getItem('adminToken');
      await axios.delete(`/api/admin/students/${studentId}/devices`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStudentProgressById((prev) => {
        const existing = prev[studentId];
        if (!existing) return prev;
        return {
          ...prev,
          [studentId]: {
            ...existing,
            student: {
              ...(existing.student || {}),
              trustedDevices: []
            }
          }
        };
      });

      setActionStatusType('success');
      setActionStatus('Student device history cleared successfully');
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to clear student device history';
      setActionStatusType('danger');
      setActionStatus(message);
    } finally {
      setClearingDevicesById((prev) => ({ ...prev, [studentId]: false }));
    }
  };

  if (loading) return <div>Loading students...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="all-students">
      <div className="header all-students-header" style={{ marginBottom: '20px' }}>
        <h1>{isSuperAdmin ? 'All Students' : 'Your Students'}</h1>
        <p style={{ color: '#64748b' }}>
          {isSuperAdmin ? 'Manage student accounts and profiles' : 'Manage students assigned to your account'}
        </p>
      </div>

      {actionStatus && (
        <div className={`alert alert-${actionStatusType}`} style={{ marginBottom: '20px' }}>
          {actionStatus}
        </div>
      )}

      {/* Search and Filter */}
      <div className="form-card" style={{ marginBottom: '25px' }}>
        <div
          className="all-students-filter-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}
        >
          <div className="form-group">
            <label className="form-label">Search Students</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Filter by Status</label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Form */}
      <div className="form-card" style={{ marginBottom: '35px' }}>
        <h3 style={{ marginBottom: '25px' }}>Send Notification</h3>
        
        {notifyStatus && (
          <div className={`alert ${notifyStatus.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>
            {notifyStatus}
          </div>
        )}

        <div
          className="all-students-notify-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}
        >
          <div className="form-group">
            <label className="form-label">Notification Title</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g., Important Student Update"
              value={notifyTitle}
              onChange={(e) => setNotifyTitle(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Notification Message</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Enter your message..."
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
            />
          </div>
        </div>

        <div className="all-students-notify-actions" style={{ marginTop: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          {/* Send to All Students - Only Super Admin */}
          {isSuperAdmin && (
            <button
              className="btn btn-success"
              onClick={() => handleSendNotification(true)}
              disabled={notifyLoading}
            >
              <i className="fas fa-bell me-2"></i>
              {notifyLoading ? 'Sending...' : 'Send to All Students'}
            </button>
          )}

          {/* Send to Selected Students - Both Roles */}
          <button
            className="btn btn-primary"
            onClick={() => handleSendNotification(false)}
            disabled={notifyLoading || selectedStudents.length === 0}
          >
            <i className="fas fa-paper-plane me-2"></i>
            {notifyLoading ? 'Sending...' : `Send to Selected (${selectedStudents.length})`}
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="all-students-table-hint">
        Swipe left/right to view all columns on mobile.
      </div>
      <div className="data-table-container">
        <table className="data-table all-students-table">
          <colgroup>
            <col className="col-select" />
            <col className="col-student-id" />
            <col className="col-name" />
            <col className="col-email" />
            <col className="col-program" />
            <col className="col-progress" />
            <col className="col-status" />
            <col className="col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th style={{ width: '30px' }}>
                <input
                  type="checkbox"
                  checked={selectedStudents.length === students.length && students.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Student ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Program</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => {
              const progress = Math.floor(Math.random() * 100); // Placeholder - replace with real data
              const studentProgress = studentProgressById[student._id];
              const trustedDevices = studentProgress?.student?.trustedDevices || [];
              const isHistoryLoading = !!studentHistoryLoadingById[student._id];
              const historyError = studentHistoryErrorById[student._id];
              
              return (
                <React.Fragment key={student._id}>
                  <tr>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student._id)}
                        onChange={() => handleSelectStudent(student._id)}
                      />
                    </td>
                    <td className="all-students-id-cell" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {formatStudentDisplayId(student._id)}
                    </td>
                    <td className="all-students-name-cell"><strong>{student.name}</strong></td>
                    <td className="all-students-email-cell">{student.email}</td>
                    <td className="all-students-program-cell">{student.program || 'NCLEX-RN'}</td>
                    <td className="all-students-progress-cell">
                      <div className="all-students-progress" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="all-students-progress-track" style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px' }}>
                          <div style={{ 
                            width: `${progress}%`, 
                            height: '100%', 
                            background: progress >= 70 ? '#10b981' : progress >= 50 ? '#f59e0b' : '#ef4444',
                            borderRadius: '4px'
                          }} className="all-students-progress-fill"></div>
                        </div>
                        <span className="all-students-progress-value">{progress}%</span>
                      </div>
                    </td>
                    <td className="all-students-status-cell">
                      <span className={`badge ${student.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {student.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="all-students-actions-cell">
                      <div className="all-students-actions-group">
                      {/* Activate/Deactivate - Only Super Admin */}
                      {isSuperAdmin && (
                        <button
                          className="btn btn-sm"
                          style={{ 
                            background: student.status === 'active' ? '#dc2626' : '#10b981',
                            color: 'white',
                            marginRight: '8px'
                          }}
                          disabled={togglingStudentId === student._id}
                          onClick={() => handleToggleStatus(student._id)}
                        >
                          {togglingStudentId === student._id
                            ? 'Updating...'
                            : (student.status === 'active' ? 'Deactivate' : 'Activate')}
                        </button>
                      )}

                      {/* Delete - Only Super Admin */}
                      {isSuperAdmin && (
                        <button
                          className="btn btn-sm btn-danger"
                          style={{ marginRight: '8px' }}
                          onClick={() => handleDelete(student._id)}
                        >
                          Delete
                        </button>
                      )}

                      {/* Expand Details - Both Roles */}
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => toggleStudentDetails(student._id)}
                      >
                        <i className={`fas fa-chevron-${expandedStudent === student._id ? 'up' : 'down'}`}></i>
                      </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded details row */}
                  {expandedStudent === student._id && (
                    <tr>
                      <td colSpan="8" style={{ padding: '0' }}>
                        <div className="student-history-panel" style={{ background: '#f8fafc', padding: '20px', borderTop: '2px solid #e2e8f0' }}>
                          <div className="student-history-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '15px', flexWrap: 'wrap' }}>
                            <h4 style={{ margin: 0 }}>Student Device Details for {student.name}</h4>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => fetchStudentHistory(student._id, { force: true })}
                              disabled={isHistoryLoading}
                            >
                              {isHistoryLoading ? 'Refreshing...' : 'Refresh'}
                            </button>
                          </div>

                          {isHistoryLoading && (
                            <p className="text-muted" style={{ marginBottom: 0 }}>Loading student details...</p>
                          )}

                          {!isHistoryLoading && historyError && (
                            <div className="alert alert-danger" style={{ marginBottom: 0 }}>
                              {historyError}
                            </div>
                          )}

                          {!isHistoryLoading && !historyError && (
                            <>
                              <div style={{ marginBottom: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
                                  <strong>Device Login Records</strong>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleClearStudentDevices(student._id)}
                                    disabled={Boolean(clearingDevicesById[student._id])}
                                  >
                                    {clearingDevicesById[student._id] ? 'Clearing...' : 'Clear Device Records'}
                                  </button>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px' }}>
                                    <thead style={{ background: '#f8fafc' }}>
                                      <tr>
                                        <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>Label</th>
                                        <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>Device ID</th>
                                        <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>Verified</th>
                                        <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>Last Used</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {trustedDevices.length === 0 ? (
                                        <tr>
                                          <td colSpan="4" style={{ padding: '12px', color: '#64748b' }}>No saved student devices.</td>
                                        </tr>
                                      ) : (
                                        trustedDevices.map((device, idx) => (
                                          <tr key={`${device.deviceId || 'device'}-${idx}`}>
                                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{device.label || 'Unknown Device'}</td>
                                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontFamily: 'monospace', fontSize: '12px' }}>
                                              {device.deviceId || 'N/A'}
                                            </td>
                                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{formatDateTime(device.verifiedAt)}</td>
                                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{formatDateTime(device.lastUsedAt)}</td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {students.length === 0 && (
          <div className="all-students-empty-state" style={{ textAlign: 'center', padding: '60px 40px', color: '#64748b' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>👨‍🎓</div>
            <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '10px' }}>No students found</div>
            <div>Try adjusting your search or filter</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllStudents;

