import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudyMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [confirmDownload, setConfirmDownload] = useState(false);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/student/study-materials', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMaterials(response.data);
      } catch (error) {
        console.error('Error fetching study materials:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, []);

  const categories = ['all', ...new Set(materials.map(m => m.category))];
  const filtered = filter === 'all' 
    ? materials 
    : materials.filter(m => m.category === filter);

  const getIcon = (type) => {
    switch(type) {
      case 'pdf': return 'fa-file-pdf';
      case 'docx': return 'fa-file-word';
      case 'pptx': return 'fa-file-powerpoint';
      default: return 'fa-file';
    }
  };

  const openDownloadModal = (material) => {
    setSelectedMaterial(material);
    setConfirmDownload(false);
    setShowDownloadModal(true);
  };

  const closeDownloadModal = () => {
    setShowDownloadModal(false);
    setSelectedMaterial(null);
    setConfirmDownload(false);
    setDownloading(false);
  };

  const handleDownload = async () => {
    if (!selectedMaterial?.fileUrl) {
      window.alert('No file available for download.');
      closeDownloadModal();
      return;
    }

    if (!confirmDownload) {
      return;
    }

    setDownloading(true);
    try {
      const fileUrl = selectedMaterial.fileUrl;
      let fullUrl = fileUrl;
      
      // For Cloudinary URLs, fetch and download as blob
      if (fileUrl.includes('cloudinary.com') || fileUrl.includes('res.cloudinary.com')) {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = selectedMaterial.title || 'study-material';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        closeDownloadModal();
        return;
      }

      // For local files, construct the proper URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://nclex-keys-international.onrender.com';
      
      if (!fileUrl.startsWith('http') && !fileUrl.startsWith('//')) {
        let cleanPath = fileUrl.replace(/^\/+/, '');
        if (!cleanPath.startsWith('api/')) {
          cleanPath = `api/${cleanPath}`;
        }
        fullUrl = `${apiBaseUrl}/${cleanPath}`;
      }

      // Fetch and download as blob for direct download
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedMaterial.title || 'study-material';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      closeDownloadModal();
    } catch (error) {
      console.error('Failed to download material:', error);
      window.alert('Could not download this material right now. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="text-center py-5">Loading materials...</div>;

  return (
    <div className="study-materials">
      <h3 className="mb-4">Study Materials</h3>
      
      <div className="filter-buttons mb-4">
        {categories.map(cat => (
          <button
            key={cat}
            className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-outline-primary'} me-2`}
            onClick={() => setFilter(cat)}
          >
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted">No materials available in this category.</p>
      ) : (
        <div className="row">
          {filtered.map(material => (
            <div key={material._id} className="col-md-4 mb-4">
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <i className={`fas ${getIcon(material.fileType)} fa-2x me-3`}></i>
                    <h5 className="card-title mb-0">{material.title}</h5>
                  </div>
                  <p className="card-text text-muted">{material.description}</p>
                  <span className="badge bg-info mb-2">{material.category}</span>
                </div>
                <div className="card-footer bg-transparent">
                  <button 
                    className="btn btn-primary w-100"
                    onClick={() => openDownloadModal(material)}
                  >
                    <i className="fas fa-download me-2"></i>Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Download Confirmation Modal */}
      {showDownloadModal && selectedMaterial && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-download me-2"></i>Download File
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={closeDownloadModal}
                  disabled={downloading}
                ></button>
              </div>
              <div className="modal-body">
                <div className="d-flex align-items-center mb-3">
                  <i className={`fas ${getIcon(selectedMaterial.fileType)} fa-3x me-3 text-primary`}></i>
                  <div>
                    <h6 className="mb-1">{selectedMaterial.title}</h6>
                    <small className="text-muted">{selectedMaterial.category}</small>
                  </div>
                </div>
                <div className="alert alert-warning mb-3">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Warning:</strong> This file will be downloaded directly to your device. Make sure you have enough storage space.
                </div>
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="confirmDownload"
                    checked={confirmDownload}
                    onChange={(e) => setConfirmDownload(e.target.checked)}
                    disabled={downloading}
                  />
                  <label className="form-check-label" htmlFor="confirmDownload">
                    I understand this file will be downloaded to my device
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={closeDownloadModal}
                  disabled={downloading}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleDownload}
                  disabled={downloading || !confirmDownload}
                >
                  {downloading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check me-2"></i>
                      Yes, Download
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyMaterials;
