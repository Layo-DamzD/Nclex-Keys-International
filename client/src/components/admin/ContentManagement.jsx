import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ContentManagement = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  // ── Search & Filter ──
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // ── Bulk Selection & Download ──
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

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

  // ── Filtered materials ──
  const categories = ['all', ...new Set(materials.map(m => m.category))];
  const filtered = materials.filter(m => {
    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      (m.title || '').toLowerCase().includes(query) ||
      (m.description || '').toLowerCase().includes(query) ||
      (m.category || '').toLowerCase().includes(query) ||
      (m.uploadedBy?.name || '').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  // ── Selection handlers ──
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(m => m._id));
    }
  };
  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  // ── Direct download (no preview, no modal) ──
  const handleDirectDownload = async (material) => {
    try {
      let fullUrl = material.fileUrl;
      if (fullUrl && !fullUrl.startsWith('http') && !fullUrl.startsWith('//')) {
        fullUrl = `${window.location.origin}${fullUrl.startsWith('/') ? '' : '/'}${fullUrl}`;
      }

      const token = sessionStorage.getItem('adminToken');
      const response = await fetch(fullUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) throw new Error(`Download failed: ${response.status}`);

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const extension = String(material.fileUrl || '').split('.').pop() || material.fileType || 'pdf';

      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `${String(material.title || 'study-material').replace(/[^a-z0-9_-]/gi, '_')}.${extension}`);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Failed to download:', err);
      // Fallback for Cloudinary or external URLs
      if (material.fileUrl) {
        const link = document.createElement('a');
        link.href = material.fileUrl;
        link.setAttribute('download', '');
        link.setAttribute('target', '_blank');
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        window.alert('Could not download this material. Please try again.');
      }
    }
  };

  // ── Bulk download ──
  const handleBulkDownload = async () => {
    if (selectedIds.length === 0) return;
    setBulkDownloading(true);
    setBulkProgress({ current: 0, total: selectedIds.length });

    const selectedMaterials = materials.filter(m => selectedIds.includes(m._id));

    for (let i = 0; i < selectedMaterials.length; i++) {
      setBulkProgress({ current: i + 1, total: selectedMaterials.length });
      await handleDirectDownload(selectedMaterials[i]);
      // Small delay between downloads to avoid browser blocking
      if (i < selectedMaterials.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    setBulkDownloading(false);
    setSelectedIds([]);
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
    const uploadData = new FormData();
    uploadData.append('file', selectedFile);

    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.post('/api/admin/content/upload', uploadData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setFormData(prev => ({
        ...prev,
        fileUrl: response.data.fileUrl,
        backupUrl: response.data.backupUrl || '',
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
      setSelectedIds([]);
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
    setSelectedIds([]);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.delete(`/api/admin/content/materials/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedIds(prev => prev.filter(x => x !== id));
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

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading materials...</div>;

  return (
    <div className="content-management">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937', marginBottom: '4px' }}>Content Management</h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Manage study materials and resources</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowForm(!showForm);
            setEditingMaterial(null);
            setFormData({ title: '', description: '', category: 'Study Guide', fileUrl: '', fileType: 'pdf' });
            setSelectedFile(null);
            setSelectedIds([]);
          }}
          style={{ whiteSpace: 'nowrap' }}
        >
          {showForm ? 'Cancel' : 'Upload New Material'}
        </button>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Upload Form */}
      {showForm && (
        <div className="form-card" style={{ marginBottom: '24px', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            {editingMaterial ? 'Edit Material' : 'Upload New Material'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>Title</label>
              <input
                type="text"
                className="form-control"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Enter material title"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>Description</label>
              <textarea
                className="form-control"
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the material"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>Category</label>
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

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>Upload File</label>
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
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
              {formData.fileUrl && (
                <small style={{ color: '#16a34a', display: 'block', marginTop: '6px' }}>
                  File uploaded successfully
                </small>
              )}
            </div>

            <button type="submit" className="btn btn-primary">
              {editingMaterial ? 'Update Material' : 'Save Material'}
            </button>
          </form>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
          >
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            className="form-control"
            placeholder="Search materials by title, description, category..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedIds([]); }}
            style={{ paddingLeft: '36px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px' }}
          />
        </div>

        {/* Category filter */}
        <select
          className="form-control"
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setSelectedIds([]); }}
          style={{ width: 'auto', minWidth: '140px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px' }}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
          ))}
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: '#E0F2F1', borderRadius: '8px', marginBottom: '16px',
          border: '1px solid #b2dfdb'
        }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#00695C' }}>
            {selectedIds.length} material{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn"
              onClick={handleBulkDownload}
              disabled={bulkDownloading}
              style={{
                background: '#009688', color: '#fff', border: 'none', borderRadius: '6px',
                padding: '6px 16px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap'
              }}
            >
              {bulkDownloading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" style={{ width: '14px', height: '14px' }}></span>
                  Downloading {bulkProgress.current}/{bulkProgress.total}...
                </>
              ) : (
                <>
                  <i className="fas fa-download me-1"></i>
                  Download Selected
                </>
              )}
            </button>
            <button
              className="btn"
              onClick={() => setSelectedIds([])}
              style={{
                background: '#fff', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '6px',
                padding: '6px 12px', fontSize: '13px', fontWeight: 500
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Materials List */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        {/* Table Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '40px 1fr 120px 140px 100px',
          padding: '10px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
          fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase',
          letterSpacing: '0.05em', alignItems: 'center'
        }}>
          <div>
            <div
              style={{
                width: '16px', height: '16px', borderRadius: '3px', border: '2px solid #d1d5db',
                background: allSelected ? '#009688' : '#fff', borderColor: allSelected ? '#009688' : '#d1d5db',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onClick={toggleSelectAll}
            >
              {allSelected && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>
          <span>Material</span>
          <span>Category</span>
          <span>Uploaded</span>
          <span>Actions</span>
        </div>

        {/* Materials */}
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
            <i className="fas fa-search" style={{ fontSize: '24px', marginBottom: '8px', display: 'block', opacity: 0.4 }}></i>
            <p style={{ margin: 0 }}>
              {searchQuery || categoryFilter !== 'all'
                ? 'No materials match your search.'
                : 'No materials uploaded yet.'}
            </p>
          </div>
        ) : (
          filtered.map((material, index) => {
            const isSelected = selectedIds.includes(material._id);
            return (
              <div
                key={material._id}
                style={{
                  display: 'grid', gridTemplateColumns: '40px 1fr 120px 140px 100px',
                  padding: '12px 16px', alignItems: 'center',
                  borderBottom: index < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
                  background: isSelected ? '#E0F2F1' : '#fff',
                  transition: 'background 0.12s'
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = '#fff'; }}
              >
                {/* Checkbox */}
                <div>
                  <div
                    style={{
                      width: '16px', height: '16px', borderRadius: '3px', border: '2px solid #d1d5db',
                      background: isSelected ? '#009688' : '#fff', borderColor: isSelected ? '#009688' : '#d1d5db',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onClick={() => toggleSelect(material._id)}
                  >
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>

                {/* Material Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <i className={`fas ${getFileIcon(material.fileType)}`} style={{ fontSize: '20px', color: '#6b7280', flexShrink: 0 }}></i>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {material.title}
                    </div>
                    {material.description && (
                      <div style={{ fontSize: '12px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {material.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Category */}
                <span style={{
                  fontSize: '12px', fontWeight: 500, padding: '2px 8px', borderRadius: '10px',
                  background: '#f3f4f6', color: '#6b7280', textAlign: 'center', display: 'inline-block'
                }}>
                  {material.category}
                </span>

                {/* Upload Date */}
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {new Date(material.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-sm"
                    onClick={() => handleDirectDownload(material)}
                    title="Download"
                    style={{
                      background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px',
                      width: '30px', height: '30px', padding: 0, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: '#009688',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#E0F2F1'; e.currentTarget.style.borderColor = '#009688'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                  >
                    <i className="fas fa-download" style={{ fontSize: '12px' }}></i>
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => handleEdit(material)}
                    title="Edit"
                    style={{
                      background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px',
                      width: '30px', height: '30px', padding: 0, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: '#6b7280',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                  >
                    <i className="fas fa-pen" style={{ fontSize: '11px' }}></i>
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => handleDelete(material._id)}
                    title="Delete"
                    style={{
                      background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px',
                      width: '30px', height: '30px', padding: 0, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: '#ef4444',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                  >
                    <i className="fas fa-trash" style={{ fontSize: '11px' }}></i>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Results count */}
      <div style={{ marginTop: '12px', fontSize: '13px', color: '#9ca3af', textAlign: 'right' }}>
        Showing {filtered.length} of {materials.length} materials
      </div>
    </div>
  );
};

export default ContentManagement;
