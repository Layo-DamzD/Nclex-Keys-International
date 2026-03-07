import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ContentManagement = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Study Guide',
    fileUrl: '',
    fileType: 'pdf'
  });

  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/content/materials', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMaterials(response.data);
    } catch (err) {
      setError('Failed to load materials');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const fileName = String(file.name || '').toLowerCase();
    if (!fileName.endsWith('.pdf')) {
      alert('Only PDF files are allowed.');
      e.target.value = '';
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.post('/api/admin/content/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setFormData(prev => ({
        ...prev,
        fileUrl: response.data.fileUrl,
        fileType: response.data.fileType
      }));
    } catch {
      alert('File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.fileUrl) {
      setError('Title and file are required');
      return;
    }

    try {
      const token = sessionStorage.getItem('adminToken');
      
      if (editingMaterial) {
        await axios.put(`/api/admin/content/materials/${editingMaterial._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/admin/content/materials', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setShowForm(false);
      setEditingMaterial(null);
      setFormData({ title: '', description: '', category: 'Study Guide', fileUrl: '', fileType: 'pdf' });
      setSelectedFile(null);
      fetchMaterials();
    } catch {
      setError('Failed to save material');
    }
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
    setFormData({
      title: material.title,
      description: material.description || '',
      category: material.category,
      fileUrl: material.fileUrl,
      fileType: material.fileType
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.delete(`/api/admin/content/materials/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMaterials();
    } catch {
      alert('Failed to delete material');
    }
  };

  const getFileIcon = (fileType) => {
    const icons = {
      pdf: 'fa-file-pdf',
      docx: 'fa-file-word',
      pptx: 'fa-file-powerpoint',
      mp4: 'fa-file-video',
      other: 'fa-file'
    };
    return icons[fileType] || 'fa-file';
  };

  if (loading) return <div>Loading materials...</div>;

  return (
    <div className="content-management">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1>Content Management</h1>
          <p style={{ color: '#64748b' }}>Manage study materials and resources</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowForm(!showForm);
            setEditingMaterial(null);
            setFormData({ title: '', description: '', category: 'Study Guide', fileUrl: '', fileType: 'pdf' });
            setSelectedFile(null);
          }}
        >
          {showForm ? 'Cancel' : '➕ Upload New Material'}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <div className="form-card" style={{ marginBottom: '30px' }}>
          <h3>{editingMaterial ? 'Edit Material' : 'Upload New Material'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                className="form-control"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-control"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Study Guide">Study Guide</option>
                <option value="Cheat Sheet">Cheat Sheet</option>
                <option value="Practice Test">Practice Test</option>
                <option value="Flashcards">Flashcards</option>
                <option value="Video">Video</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Upload File</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="file"
                  className="form-control"
                  onChange={handleFileChange}
                  accept=".pdf,application/pdf"
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
              {formData.fileUrl && (
                <small className="text-success d-block mt-2">
                  ✅ File uploaded: {formData.fileUrl}
                </small>
              )}
            </div>

            <div className="upload-actions">
              <button type="submit" className="btn btn-primary">
                {editingMaterial ? 'Update Material' : 'Save Material'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="form-card">
        <h3 style={{ marginBottom: '20px' }}>Study Materials</h3>
        {materials.length === 0 ? (
          <p className="text-muted">No materials uploaded yet.</p>
        ) : (
          <div className="row">
            {materials.map(material => (
              <div key={material._id} className="col-md-4 mb-4">
                <div className="card h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-3">
                      <i className={`fas ${getFileIcon(material.fileType)} fa-2x me-3`}></i>
                      <h5 className="card-title mb-0">{material.title}</h5>
                    </div>
                    <p className="card-text text-muted">{material.description}</p>
                    <span className="badge bg-info mb-2">{material.category}</span>
                    <p className="small text-muted mb-0">
                      Uploaded by {material.uploadedBy?.name || 'Admin'} • {new Date(material.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="card-footer bg-transparent d-flex justify-content-between">
                    <a
                      href={material.fileUrl}
                      className="btn btn-primary btn-sm"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="fas fa-download me-2"></i>Download
                    </a>
                    <div>
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => handleEdit(material)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(material._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentManagement;
