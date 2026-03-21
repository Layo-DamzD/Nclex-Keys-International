import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudyMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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

  const handleDownload = async (fileUrl, title = 'study-material') => {
    try {
      if (!fileUrl) {
        window.alert('No file available for download.');
        return;
      }

      // For Cloudinary URLs or external URLs, open in new tab
      if (fileUrl.includes('cloudinary.com') || fileUrl.includes('res.cloudinary.com')) {
        window.open(fileUrl, '_blank');
        return;
      }

      // Resolve the full URL for local files - use backend API
      let fullUrl = fileUrl;
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://nclex-keys-international.onrender.com';
      
      if (!fileUrl.startsWith('http') && !fileUrl.startsWith('//')) {
        // Clean up the path and ensure it goes through /api/uploads/
        let cleanPath = fileUrl.replace(/^\/+/, '');
        if (!cleanPath.startsWith('api/')) {
          cleanPath = `api/${cleanPath}`;
        }
        fullUrl = `${apiBaseUrl}/${cleanPath}`;
      }

      // For files, open directly in new tab to trigger download
      window.open(fullUrl, '_blank');
    } catch (error) {
      console.error('Failed to download material:', error);
      window.alert('Could not download this material right now. Please try again.');
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
                    onClick={() => handleDownload(material.fileUrl, material.title)}
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
