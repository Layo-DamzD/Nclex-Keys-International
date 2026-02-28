import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PerformanceAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState({ labels: [], scores: [] });
  const [weakAreas, setWeakAreas] = useState([]);
  const [stats, setStats] = useState({ totalTests: 0, averageScore: 0, bestScore: 0 });

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/student/performance', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data;
        
        setTrendData({
          labels: data.trend.map(t => t.date),
          scores: data.trend.map(t => t.score)
        });
        setWeakAreas(data.weakAreas);
        setStats(data.stats);
      } catch (error) {
        console.error('Error fetching performance data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  const trendChartData = {
    labels: trendData.labels,
    datasets: [
      {
        label: 'Score (%)',
        data: trendData.scores,
        borderColor: '#1a5fb4',
        backgroundColor: 'rgba(26, 95, 180, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#1a5fb4',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const trendOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Score Trend (Last 10 Tests)' },
    },
    scales: {
      y: { beginAtZero: true, max: 100, title: { display: true, text: 'Score %' } },
    },
  };

  const weakAreasChartData = {
    labels: weakAreas.map(w => w.category),
    datasets: [
      {
        label: 'Accuracy (%)',
        data: weakAreas.map(w => w.accuracy),
        backgroundColor: weakAreas.map(w => 
          w.accuracy >= 80 ? '#28a745' : w.accuracy >= 60 ? '#fd7e14' : '#dc3545'
        ),
        borderWidth: 0,
      },
    ],
  };

  const weakAreasOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Weak Areas (Accuracy by Category)' },
    },
    scales: {
      y: { beginAtZero: true, max: 100, title: { display: true, text: 'Accuracy %' } },
    },
  };

  if (loading) return <div className="text-center py-5">Loading performance data...</div>;

  return (
    <div className="performance-analysis">
      <h3 className="mb-4">Performance Analysis</h3>

      <div className="row mb-4">
        <div className="col-md-4">
          <div className="stats-card">
            <h5>Total Tests</h5>
            <div className="stats-number">{stats.totalTests}</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stats-card">
            <h5>Average Score</h5>
            <div className="stats-number">{stats.averageScore}%</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stats-card">
            <h5>Best Score</h5>
            <div className="stats-number">{stats.bestScore}%</div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="chart-container">
            {trendData.labels.length > 0 ? (
              <Line data={trendChartData} options={trendOptions} />
            ) : (
              <p className="text-muted">No test data available yet.</p>
            )}
          </div>
        </div>
        <div className="col-lg-4 mb-4">
          <div className="chart-container">
            {weakAreas.length > 0 ? (
              <Bar data={weakAreasChartData} options={weakAreasOptions} />
            ) : (
              <p className="text-muted">No weak area data available yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="recommendations mt-4">
        <h4>Recommendations</h4>
        <ul className="list-group">
          {weakAreas
            .filter(w => w.accuracy < 70)
            .sort((a, b) => a.accuracy - b.accuracy)
            .slice(0, 3)
            .map(w => (
              <li key={w.category} className="list-group-item">
                Focus on <strong>{w.category}</strong> (current accuracy: {w.accuracy}%)
              </li>
            ))}
          {weakAreas.filter(w => w.accuracy >= 70).length > 0 && (
            <li className="list-group-item list-group-item-success">
              Great job in {weakAreas.filter(w => w.accuracy >= 70).map(w => w.category).join(', ')}!
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default PerformanceAnalysis;