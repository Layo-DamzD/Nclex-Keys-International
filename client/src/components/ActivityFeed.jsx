import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ActivityFeed = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchActivities = async (isInitial = false) => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          if (mounted) setLoading(false);
          return;
        }
        const response = await axios.get('/api/student/activity', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (mounted) {
          setActivities(response.data);
        }
      } catch (error) {
        console.error('Error fetching activity:', error);
      } finally {
        if (mounted && isInitial) {
          setLoading(false);
        }
      }
    };

    fetchActivities(true);
    const intervalId = window.setInterval(() => fetchActivities(false), 10000);
    const onFocus = () => fetchActivities(false);
    window.addEventListener('focus', onFocus);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  if (loading) return <div>Loading activity...</div>;

  return (
    <div id="activityList">
      {activities.length === 0 ? (
        <p className="text-muted">No recent activity</p>
      ) : (
        activities.map((act, idx) => (
          <div className="activity-item mb-3" key={idx}>
            <div className="d-flex">
              <div className="flex-shrink-0">
                <div className="stats-icon icon-blue" style={{ width: '40px', height: '40px' }}>
                  <i className={`fas fa-${act.icon}`}></i>
                </div>
              </div>
              <div className="flex-grow-1 ms-3">
                <p className="mb-1 fw-bold">{act.text}</p>
                <small className="text-muted">{act.time} • {act.detail}</small>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ActivityFeed;
