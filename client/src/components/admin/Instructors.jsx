import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { uploadImage, fileToDataUrl, withCacheBust, resolveMediaUrl } from '../../utils/imageUpload';

const Instructors = () => {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    title: '',
    bio: '',
    specialties: [],
    photoUrl: '',
    socialLinks: {
      facebook: '',
      twitter: '',
      linkedin: '',
      instagram: ''
    }
  });

  const [specialtyInput, setSpecialtyInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/instructors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstructors(response.data);
    } catch (err) {
      setError('Failed to load instructors');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: { ...formData[parent], [child]: value }
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddSpecialty = () => {
    if (specialtyInput.trim()) {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, specialtyInput.trim()]
      });
      setSpecialtyInput('');
    }
  };

  const handleRemoveSpecialty = (index) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      return;
    }

    try {
      const token = sessionStorage.getItem('adminToken');
      
      if (editingInstructor) {
        await axios.put(`/api/admin/instructors/${editingInstructor._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/admin/instructors', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setShowForm(false);
      setEditingInstructor(null);
      setFormData({
        name: '',
        email: '',
        title: '',
        bio: '',
        specialties: [],
        photoUrl: '',
        socialLinks: { facebook: '', twitter: '', linkedin: '', instagram: '' }
      });
      fetchInstructors();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save instructor');
    }
  };

  const handleEdit = (instructor) => {
    setEditingInstructor(instructor);
    setFormData({
      name: instructor.name,
      email: instructor.email,
      title: instructor.title || '',
      bio: instructor.bio || '',
      specialties: instructor.specialties || [],
      photoUrl: instructor.photoUrl || '',
      socialLinks: instructor.socialLinks || {
        facebook: '', twitter: '', linkedin: '', instagram: ''
      }
    });
    setShowForm(true);
  };

  const handleToggleStatus = async (id) => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.put(`/api/admin/instructors/${id}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setInstructors(prev => prev.map(inst => 
        inst._id === id ? { ...inst, status: response.data.status } : inst
      ));
    } catch {
      alert('Failed to toggle status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this instructor?')) return;
    
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.delete(`/api/admin/instructors/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchInstructors();
    } catch {
      alert('Failed to delete instructor');
    }
  };

  if (loading) return <div>Loading instructors...</div>;

  return (
    <div className="instructors">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1>Instructors</h1>
          <p style={{ color: '#64748b' }}>Manage instructor accounts and profiles</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowForm(!showForm);
            setEditingInstructor(null);
            setFormData({
              name: '',
              email: '',
              title: '',
              bio: '',
              specialties: [],
              photoUrl: '',
              socialLinks: { facebook: '', twitter: '', linkedin: '', instagram: '' }
            });
          }}
        >
          {showForm ? 'Cancel' : '➕ Add Instructor'}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <div className="form-card" style={{ marginBottom: '30px' }}>
          <h3>{editingInstructor ? 'Edit Instructor' : 'Add New Instructor'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                name="title"
                className="form-control"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Pharmacology Specialist"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea
                name="bio"
                className="form-control"
                rows="3"
                value={formData.bio}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Specialties</label>
              <div className="d-flex mb-2">
                <input
                  type="text"
                  className="form-control me-2"
                  value={specialtyInput}
                  onChange={(e) => setSpecialtyInput(e.target.value)}
                  placeholder="Add a specialty"
                />
                <button type="button" className="btn btn-primary" onClick={handleAddSpecialty}>
                  Add
                </button>
              </div>
              <div className="specialties-list">
                {formData.specialties.map((spec, index) => (
                  <span key={index} className="badge bg-info me-2 mb-2" style={{ padding: '8px 12px' }}>
                    {spec}
                    <button
                      type="button"
                      className="btn-close btn-close-white ms-2"
                      onClick={() => handleRemoveSpecialty(index)}
                      style={{ fontSize: '10px' }}
                    ></button>
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Photo</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  style={{ flex: '1', minWidth: '200px' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    setUploading(true);
                    setUploadError('');
                    
                    try {
                      // First show preview
                      const dataUrl = await fileToDataUrl(file);
                      setFormData(prev => ({ ...prev, photoUrl: dataUrl }));
                      
                      // Then upload to server
                      const token = sessionStorage.getItem('adminToken');
                      const result = await uploadImage(file, token);
                      const freshUrl = withCacheBust(result.fileUrl);
                      setFormData(prev => ({ ...prev, photoUrl: freshUrl }));
                    } catch (err) {
                      setUploadError(err.message || 'Failed to upload image');
                    } finally {
                      setUploading(false);
                    }
                  }}
                  disabled={uploading}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
                  disabled={!formData.photoUrl}
                >
                  Clear
                </button>
              </div>
              {uploading && <small className="text-muted d-block mt-2">Uploading image...</small>}
              {uploadError && <small className="text-danger d-block mt-2">{uploadError}</small>}
              
              {/* Show current photo or preview */}
              {formData.photoUrl && (
                <div className="mt-3" style={{ textAlign: 'center' }}>
                  <img
                    src={resolveMediaUrl(formData.photoUrl)}
                    alt="Instructor preview"
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid #e2e8f0'
                    }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <small className="text-muted d-block mt-1">Photo Preview</small>
                </div>
              )}
              
              {/* Alternative: Enter URL manually */}
              <details className="mt-3">
                <summary style={{ cursor: 'pointer', color: '#64748b', fontSize: '0.85rem' }}>
                  Or enter image URL manually
                </summary>
                <input
                  type="text"
                  name="photoUrl"
                  className="form-control mt-2"
                  value={formData.photoUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/photo.jpg"
                />
              </details>
            </div>

            <h5 className="mt-4">Social Links</h5>
            <div className="row">
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Facebook</label>
                  <input
                    type="text"
                    name="socialLinks.facebook"
                    className="form-control"
                    value={formData.socialLinks.facebook}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Twitter</label>
                  <input
                    type="text"
                    name="socialLinks.twitter"
                    className="form-control"
                    value={formData.socialLinks.twitter}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">LinkedIn</label>
                  <input
                    type="text"
                    name="socialLinks.linkedin"
                    className="form-control"
                    value={formData.socialLinks.linkedin}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Instagram</label>
                  <input
                    type="text"
                    name="socialLinks.instagram"
                    className="form-control"
                    value={formData.socialLinks.instagram}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <div className="upload-actions mt-4">
              <button type="submit" className="btn btn-primary">
                {editingInstructor ? 'Update Instructor' : 'Save Instructor'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="form-card">
        <h3 style={{ marginBottom: '20px' }}>Instructor List</h3>
        {instructors.length === 0 ? (
          <p className="text-muted">No instructors added yet.</p>
        ) : (
          <div className="row">
            {instructors.map(instructor => (
              <div key={instructor._id} className="col-md-6 mb-4">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-3">
                      {instructor.photoUrl ? (
                        <img 
                          src={resolveMediaUrl(instructor.photoUrl)} 
                          alt={instructor.name}
                          style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', marginRight: '15px' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{ 
                          width: '60px', 
                          height: '60px', 
                          borderRadius: '50%', 
                          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px',
                          marginRight: '15px'
                        }}>
                          {instructor.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h5 className="mb-1">{instructor.name}</h5>
                        <p className="text-muted mb-0">{instructor.title}</p>
                      </div>
                    </div>
                    
                    <p className="card-text">{instructor.bio}</p>
                    
                    <div className="mb-2">
                      {instructor.specialties?.map((spec, idx) => (
                        <span key={idx} className="badge bg-secondary me-1">{spec}</span>
                      ))}
                    </div>
                    
                    <div className="mb-2">
                      <span className={`badge ${instructor.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                        {instructor.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    {instructor.socialLinks && (
                      <div className="social-links mb-3">
                        {instructor.socialLinks.facebook && (
                          <a href={instructor.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="me-2">
                            <i className="fab fa-facebook fa-lg"></i>
                          </a>
                        )}
                        {instructor.socialLinks.twitter && (
                          <a href={instructor.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="me-2">
                            <i className="fab fa-twitter fa-lg"></i>
                          </a>
                        )}
                        {instructor.socialLinks.linkedin && (
                          <a href={instructor.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="me-2">
                            <i className="fab fa-linkedin fa-lg"></i>
                          </a>
                        )}
                        {instructor.socialLinks.instagram && (
                          <a href={instructor.socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                            <i className="fab fa-instagram fa-lg"></i>
                          </a>
                        )}
                      </div>
                    )}
                    
                    <div className="d-flex justify-content-between mt-3">
                      <div>
                        <button
                          className="btn btn-sm btn-primary me-2"
                          onClick={() => handleEdit(instructor)}
                        >
                          Edit
                        </button>
                        <button
                          className={`btn btn-sm ${instructor.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                          onClick={() => handleToggleStatus(instructor._id)}
                        >
                          {instructor.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(instructor._id)}
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

export default Instructors;
