import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudyMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [filter, setFilter] = useState('all');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [confirmDownload, setConfirmDownload] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        setFetchError('');
        const token = localStorage.getItem('token');
        if (!token) {
          // No token found — user may have just signed up and token isn't stored yet.
          // Try fetching without auth header (backend uses authOnly, which returns 401 without token).
          // Show a helpful message instead of silently showing nothing.
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

  // Helper: extract file extension from URL
  const getExtFromUrl = (url) => {
    try {
      const pathname = new URL(url, window.location.origin).pathname;
      const match = pathname.match(/\.(\w{2,5})$/);
      return match ? match[1].toLowerCase() : null;
    } catch {
      return null;
    }
  };

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
    setDownloadError('');
    try {
      const fileUrl = selectedMaterial.fileUrl;
      const backupUrl = selectedMaterial.backupUrl || '';
      const token = localStorage.getItem('token');

      // Use server-side proxy download to avoid CORS issues with Cloudinary
      // This works for all storage backends (Cloudinary, local, etc.)
      const params = new URLSearchParams({
        url: fileUrl,
        title: selectedMaterial.title || 'study-material',
        fileType: selectedMaterial.fileType || 'pdf',
      });
      if (backupUrl) {
        params.set('backupUrl', backupUrl);
      }
      
      const response = await fetch(`/api/student/download-material?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      // Handle server redirect response (for /api/images/* MongoDB-stored files)
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json().catch(() => null);
          if (data?.redirect) {
            // Server told us to fetch directly from MongoDB
            console.log('Following server redirect to:', data.redirect);
            const directResp = await fetch(data.redirect);
            if (!directResp.ok) {
              throw new Error('Failed to retrieve the file from storage. Please try again.');
            }
            const blob = await directResp.blob();
            if (blob.size === 0) {
              throw new Error('The downloaded file is empty. Please contact support.');
            }
            triggerDownload(blob, selectedMaterial);
            closeDownloadModal();
            return;
          }
          // Not a redirect response — fall through to blob handling below
          // (need to re-read body since we consumed it with .json())
          throw new Error('Unexpected server response. Please try again.');
        }
        // Non-JSON ok response — proceed to blob download
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorCode = errorData.code;
        const errorMsg = errorData.message || `Download failed (HTTP ${response.status})`;

        // For 404 / FILE_NOT_FOUND: don't try fallback — the file is genuinely gone
        // For network/5xx errors with external URLs: try direct open as last resort
        if (errorCode !== 'FILE_NOT_FOUND' && fileUrl.startsWith('http')) {
          console.warn('Server proxy failed, falling back to direct URL open:', errorMsg);
          window.open(fileUrl, '_blank');
          closeDownloadModal();
          return;
        }
        throw new Error(errorMsg);
      }

      // Verify we got a binary response (not an HTML error page)
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error('The file could not be retrieved. It may have been moved or deleted.');
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('The downloaded file is empty. Please contact support.');
      }

      triggerDownload(blob, selectedMaterial);
      closeDownloadModal();
    } catch (error) {
      console.error('Failed to download material:', error);
      let userMessage = error.message || 'Could not download this material right now. Please try again.';
      if (userMessage.includes('Invalid') || userMessage.includes('invalid')) {
        userMessage += ' The file link may be broken. Please contact support.';
      }
      setDownloadError(userMessage);
    } finally {
      setDownloading(false);
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

  // Helper: retry download (clear error and allow re-attempt)
  const handleRetry = () => {
    setDownloadError('');
    setConfirmDownload(true);
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
                {downloadError && (
                  <div className="alert alert-danger mb-3">
                    <div className="d-flex align-items-start">
                      <i className="fas fa-times-circle me-2 mt-1"></i>
                      <div className="flex-grow-1">
                        {downloadError}
                      </div>
                      <button 
                        className="btn btn-sm btn-outline-danger ms-2" 
                        onClick={handleRetry}
                        disabled={downloading}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        <i className="fas fa-redo me-1"></i>Retry
                      </button>
                    </div>
                  </div>
                )}
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
