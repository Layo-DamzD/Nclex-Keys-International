import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudyMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        setFetchError('');
        const token = localStorage.getItem('token');
        if (!token) {
          setFetchError('Please log in to view study materials.');
          setLoading(false);
          return;
        }
        const response = await axios.get('/api/student/study-materials', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMaterials(response.data || []);
      } catch (error) {
        if (error.response?.status === 401) {
          setFetchError('Your session has expired. Please log in again to view study materials.');
        } else if (error.response?.status === 403) {
          setFetchError('You do not have permission to view study materials. Please contact support.');
        } else {
          const msg = error.response?.data?.message || error.message || 'Failed to load study materials.';
          setFetchError(msg);
        }
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

  // Direct download — downloads straight to device without preview/modal
  const handleDownload = async (material) => {
    if (!material?.fileUrl) {
      window.alert('No file available for download.');
      return;
    }

    try {
      const fileUrl = material.fileUrl;
      const backupUrl = material.backupUrl || '';
      const token = localStorage.getItem('token');

      const params = new URLSearchParams({
        url: fileUrl,
        title: material.title || 'study-material',
        fileType: material.fileType || 'pdf',
      });
      if (backupUrl) {
        params.set('backupUrl', backupUrl);
      }

      const response = await fetch(`/api/student/download-material?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json().catch(() => null);
          if (data?.redirect) {
            const directResp = await fetch(data.redirect);
            if (!directResp.ok) throw new Error('Failed to retrieve file from storage.');
            const blob = await directResp.blob();
            if (blob.size === 0) throw new Error('The downloaded file is empty.');
            triggerDownload(blob, material);
            return;
          }
          throw new Error('Unexpected server response.');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorCode = errorData.code;
        if (errorCode !== 'FILE_NOT_FOUND' && fileUrl.startsWith('http')) {
          const link = document.createElement('a');
          link.href = fileUrl;
          link.setAttribute('download', '');
          link.setAttribute('target', '_blank');
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          link.remove();
          return;
        }
        throw new Error(errorData.message || `Download failed (HTTP ${response.status})`);
      }

      const respContentType = response.headers.get('content-type') || '';
      if (respContentType.includes('text/html')) {
        throw new Error('The file could not be retrieved.');
      }

      const blob = await response.blob();
      if (blob.size === 0) throw new Error('The downloaded file is empty.');

      triggerDownload(blob, material);
    } catch (error) {
      console.error('Failed to download material:', error);
      window.alert(error.message || 'Could not download this material right now.');
    }
  };

  // Helper: trigger file download with mobile fallback
  const triggerDownload = (blob, material) => {
    const ext = material.fileType || 'pdf';
    const fileName = `${material.title || 'study-material'}.${ext}`;

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 5000);

    // Mobile fallback: also open in new tab so the browser offers to save/open
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && blob.size > 0) {
      setTimeout(() => {
        const mobileUrl = window.URL.createObjectURL(blob);
        window.open(mobileUrl, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(mobileUrl), 10000);
      }, 500);
    }
  };

  if (loading) return <div className="text-center py-5">Loading materials...</div>;

  return (
    <div className="study-materials">
      <h3 className="mb-4">Study Materials</h3>

      {/* Fetch error banner */}
      {fetchError && (
        <div className="alert alert-danger mb-3" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-exclamation-circle"></i>
          <span>{fetchError}</span>
          <button className="btn btn-sm btn-outline-danger ms-auto" onClick={() => window.location.reload()}>
            <i className="fas fa-redo me-1"></i>Retry
          </button>
        </div>
      )}

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
                    onClick={() => handleDownload(material)}
                  >
                    <i className="fas fa-download me-2"></i>Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudyMaterials;
