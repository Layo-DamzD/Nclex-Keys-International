import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  useEffect(() => {
    fetchLogs();
  }, [filter, pagination.page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 50,
        ...(filter && { level: filter })
      });
      
      const response = await axios.get(`/api/admin/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setLogs(response.data.logs);
      setPagination({
        page: response.data.currentPage,
        totalPages: response.data.totalPages,
        total: response.data.total
      });
    } catch (err) {
      setError('Failed to load system logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getLevelBadge = (level) => {
    const badges = {
      info: 'badge-info',
      warning: 'badge-warning',
      error: 'badge-danger'
    };
    return badges[level] || 'badge-info';
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const simplifyAction = (action = '') => {
    const value = String(action || '');
    const [method = '', fullPath = ''] = value.split(' ');
    const [pathOnly] = fullPath.split('?');
    const shortPath = pathOnly.replace(/^\/api\//, '/').replace(/\/+$/, '');
    return `${method} ${shortPath}`.trim();
  };

  const summarizeDetails = (detailsRaw) => {
    try {
      const parsed = typeof detailsRaw === 'string' ? JSON.parse(detailsRaw || '{}') : (detailsRaw || {});
      const queryCount = Object.keys(parsed.query || {}).length;
      const paramCount = Object.keys(parsed.params || {}).length;
      const bodyCount = Object.keys(parsed.body || {}).length;
      const parts = [];
      if (queryCount) parts.push(`${queryCount} query`);
      if (paramCount) parts.push(`${paramCount} param`);
      if (bodyCount) parts.push(`${bodyCount} body`);
      return parts.length ? parts.join(' | ') : '-';
    } catch {
      return '-';
    }
  };

  if (loading) return <div className="text-center py-5">Loading logs...</div>;

  return (
    <div className="system-logs">
      <div className="header" style={{ marginBottom: '20px' }}>
        <h1>System Logs</h1>
        <p style={{ color: '#64748b' }}>Recent system activities and errors</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="form-card" style={{ marginBottom: '20px' }}>
        <div className="system-logs-filter-row" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div className="system-logs-filter-group" style={{ width: 'min(200px, 100%)' }}>
            <label className="form-label">Filter by Level</label>
            <select
              className="form-control"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">All Levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
          <button
            className="btn btn-primary system-logs-refresh-btn"
            onClick={() => fetchLogs()}
            style={{ marginTop: '24px' }}
          >
            <i className="fas fa-sync-alt me-2"></i>Refresh
          </button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Level</th>
              <th>Action</th>
              <th>Details</th>
              <th>User</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                  No logs found
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log._id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatTime(log.createdAt)}</td>
                  <td>
                    <span className={`badge ${getLevelBadge(log.level)}`}>
                      {log.level}
                    </span>
                  </td>
                  <td style={{ maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.action}>
                    {simplifyAction(log.action)}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }} title={String(log.details || '')}>
                    {summarizeDetails(log.details)}
                  </td>
                  <td>{log.user ? `${log.user.name} (${log.user.role})` : 'System'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{log.ip || 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
          <button
            className="btn btn-sm btn-outline-primary"
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </button>
          <span style={{ padding: '5px 10px' }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            className="btn btn-sm btn-outline-primary"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default SystemLogs;

