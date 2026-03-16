import React, { useState } from 'react';
import axios from 'axios';
import { COUNTRIES } from '../../constants/Countries';

const CreateStudentModal = ({ isOpen, onClose, onStudentCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    program: 'NCLEX-RN',
    phone: '',
    country: '',
    examDate: '',
    lastPaymentDate: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.password || formData.password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setLoading(false);
        return;
    }

    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.post('/api/admin/students', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onStudentCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create student.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New Student</h2>
          <button onClick={onClose} className="modal-close-btn">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="form-grid">
              <div className="form-group">
                <label>Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="form-control" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="form-control" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} required className="form-control" />
              </div>
              <div className="form-group">
                <label>Program</label>
                <select name="program" value={formData.program} onChange={handleChange} className="form-control">
                  <option value="NCLEX-RN">NCLEX-RN</option>
                  <option value="NCLEX-PN">NCLEX-PN</option>
                </select>
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="form-control" />
              </div>
              <div className="form-group">
                <label>Country</label>
                <select name="country" value={formData.country} onChange={handleChange} required className="form-control">
                  <option value="">Select Country</option>
                  {COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Exam Date</label>
                <input type="date" name="examDate" value={formData.examDate} onChange={handleChange} className="form-control" />
              </div>
              <div className="form-group">
                <label>Last Payment Date (Subscription Start)</label>
                <input type="date" name="lastPaymentDate" value={formData.lastPaymentDate} onChange={handleChange} required className="form-control" />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1050;
        }
        .modal-content {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 700px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }
        .modal-header {
          padding: 1rem;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
        }
        .modal-body {
          padding: 1rem;
          overflow-y: auto;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }
        .modal-footer {
          padding: 1rem;
          border-top: 1px solid #dee2e6;
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default CreateStudentModal;
