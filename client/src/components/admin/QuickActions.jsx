import React from 'react';

const QuickActions = ({ onSectionChange, userRole, onExport }) => {
  const actions = [
    { id: 'upload', label: 'Upload New Question', icon: 'cloud-upload-alt', color: 'primary' },
    { id: 'case-studies', label: 'Create Case Study', icon: 'folder-open', color: 'success' },
    { id: 'analytics', label: 'View Analytics', icon: 'chart-line', color: 'info' },
    { id: 'export', label: 'Export Data', icon: 'file-export', color: 'secondary', isExport: true },
  ];

  if (userRole === 'superadmin') {
    actions.push({ id: 'all-students', label: 'Notify All Students', icon: 'bell', color: 'warning' });
  }

  const handleClick = async (action) => {
    if (action.isExport) {
      if (onExport) {
        await onExport();
      }
    } else {
      onSectionChange(action.id);
    }
  };

  return (
    <div className="form-card">
      <h2 style={{ marginBottom: '25px', color: 'var(--dark)' }}>Quick Actions</h2>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {actions.map(action => (
          <button
            key={action.id}
            className={`btn btn-${action.color}`}
            onClick={() => handleClick(action)}
          >
            <i className={`fas fa-${action.icon} me-2`}></i>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
