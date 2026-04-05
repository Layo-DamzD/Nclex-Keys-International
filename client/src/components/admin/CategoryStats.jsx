import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const CategoryStats = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryData, setCategoryData] = useState({});

  // Compute totals from category data
  const totals = useMemo(() => {
    let totalQuestions = 0;
    let totalUsage = 0;
    let totalCorrect = 0;
    Object.values(categoryData).forEach(stats => {
      totalQuestions += stats.totalQuestions || 0;
      totalUsage += stats.totalUsage || 0;
      totalCorrect += Math.round((stats.successRate || 0) * (stats.totalUsage || 0) / 100);
    });
    return {
      totalQuestions,
      totalUsage,
      overallSuccessRate: totalUsage > 0 ? Math.round((totalCorrect / totalUsage) * 100) : 0,
      categoryCount: Object.keys(categoryData).length
    };
  }, [categoryData]);

  useEffect(() => {
    fetchCategoryStats();
  }, []);

  const fetchCategoryStats = async () => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/analytics/category-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategoryData(response.data);
    } catch (err) {
      setError('Failed to load category statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading category statistics...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="category-stats">
      <div className="header">
        <h1>Category Statistics</h1>
        <p style={{ color: '#64748b' }}>Detailed breakdown by category and subcategory</p>
      </div>

      {/* Summary bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '30px',
        padding: '20px',
        background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#6366f1' }}>{totals.totalQuestions}</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Total Questions</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0891b2' }}>{totals.categoryCount}</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Categories</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#92400e' }}>{totals.totalUsage}</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Total Uses</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#065f46' }}>{totals.overallSuccessRate}%</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Overall Success Rate</div>
        </div>
      </div>

      {Object.entries(categoryData).map(([category, stats]) => (
        <div key={category} className="form-card" style={{ marginBottom: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>{category}</h2>
            <span className="badge badge-info">{stats.subcategoryCount} subcategories</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px', marginBottom: '30px' }}>
            <div style={{ textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', borderRadius: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--nclex-blue)' }}>{stats.totalQuestions}</div>
              <div style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>Questions</div>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderRadius: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#92400e' }}>{stats.totalUsage}</div>
              <div style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>Times Used</div>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', borderRadius: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#065f46' }}>{stats.successRate}%</div>
              <div style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>Success Rate</div>
            </div>
          </div>

          <div style={{ marginTop: '25px' }}>
            <h4 style={{ marginBottom: '15px', color: '#475569' }}>Subcategories</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
              {stats.subcategories.map((sub, index) => (
                <div key={index} style={{ padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 500, marginBottom: '10px' }}>{sub.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
                    <span>{sub.count} questions</span>
                    <span>{sub.usage} uses</span>
                    <span style={{ 
                      color: sub.successRate >= 70 ? '#065f46' : 
                             sub.successRate >= 50 ? '#92400e' : '#991b1b', 
                      fontWeight: 600 
                    }}>
                      {sub.successRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryStats;
