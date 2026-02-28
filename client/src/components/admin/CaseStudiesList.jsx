import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CaseStudiesList = () => {
  const navigate = useNavigate();
  const [caseStudies, setCaseStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCaseStudies();
  }, []);

  const fetchCaseStudies = async () => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/case-studies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCaseStudies(response.data);
    } catch (err) {
      setError('Failed to load case studies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this case study?')) return;
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.delete(`/api/admin/case-studies/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCaseStudies();
    } catch {
      alert('Failed to delete case study');
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      '6-question': '6-Question',
      'bowtie': 'Bowtie',
      'trend': 'Trend',
      'matrix': 'Matrix'
    };
    return labels[type] || type;
  };

  if (loading) return <div>Loading case studies...</div>;

  return (
    <div className="case-studies-list">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>Case Studies</h1>
        <button 
          className="btn btn-success"
          onClick={() => navigate('/admin/dashboard?section=case-studies/create')}
        >
          ➕ Create Case Study
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {caseStudies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 40px', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
          <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '10px' }}>No case studies yet</div>
          <div style={{ marginBottom: '25px' }}>Create your first case study to get started.</div>
          <button className="btn btn-success" onClick={() => navigate('/admin/dashboard?section=case-studies/create')}>
            ➕ Create Case Study
          </button>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Created</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {caseStudies.map(cs => (
                <tr key={cs._id}>
                  <td>{cs.title}</td>
                  <td>
                    <span className="badge badge-info">{getTypeLabel(cs.type)}</span>
                  </td>
                  <td>{new Date(cs.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${cs.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {cs.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      style={{ marginRight: '8px' }}
                      onClick={() => navigate(`/admin/dashboard?section=case-studies/edit/${cs._id}`)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(cs._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CaseStudiesList;
