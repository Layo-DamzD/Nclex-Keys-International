import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminChatPanel = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionMessages, setSessionMessages] = useState([]);
  const [adminReply, setAdminReply] = useState('');
  const [responding, setResponding] = useState(false);
  const [stats, setStats] = useState({ total: 0, responded: 0, pending: 0 });

  const token = sessionStorage.getItem('adminToken');

  const fetchEscalated = async () => {
    try {
      const res = await axios.get('/api/admin/chat/admin/escalated', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const s = res.data?.sessions || [];
      setSessions(s);
      setStats({
        total: s.length,
        responded: s.filter(x => x.adminResponded).length,
        pending: s.filter(x => !x.adminResponded).length,
      });
    } catch (err) {
      console.error('Failed to fetch escalated chats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalated();
  }, []);

  const openSession = async (sessionId) => {
    setActiveSession(sessionId);
    setAdminReply('');
    try {
      const res = await axios.get(`/api/admin/chat/admin/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessionMessages(res.data?.messages || []);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  const sendResponse = async () => {
    if (!adminReply.trim() || !activeSession) return;
    setResponding(true);
    try {
      await axios.post('/api/admin/chat/admin/respond', {
        sessionId: activeSession,
        message: adminReply.trim(),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdminReply('');
      // Refresh messages
      await openSession(activeSession);
      // Refresh session list
      await fetchEscalated();
    } catch (err) {
      alert('Failed to send response');
    } finally {
      setResponding(false);
    }
  };

  const resolveSession = async (sessionId) => {
    if (!confirm('Mark this conversation as resolved?')) return;
    try {
      await axios.post('/api/admin/chat/admin/resolve', {
        sessionId,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActiveSession(null);
      setSessionMessages([]);
      await fetchEscalated();
    } catch (err) {
      alert('Failed to resolve');
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="text-center" style={{ padding: '60px' }}>
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2" style={{ color: '#64748b' }}>Loading support chats...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#1e293b' }}>
            <i className="fas fa-headset" style={{ marginRight: '10px', color: '#0d6efd' }}></i>
            Live Chat Support
          </h3>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '0.9rem' }}>
            Respond to escalated student conversations
          </p>
        </div>
        <button className="btn btn-outline-primary btn-sm" onClick={fetchEscalated}>
          <i className="fas fa-sync-alt" style={{ marginRight: '6px' }}></i> Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b' }}>{stats.total}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Escalated</div>
        </div>
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#dc2626' }}>{stats.pending}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Pending Response</div>
        </div>
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#16a34a' }}>{stats.responded}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Responded</div>
        </div>
      </div>

      {/* Layout: sessions list + chat view */}
      <div style={{ display: 'grid', gridTemplateColumns: activeSession ? '320px 1fr' : '1fr', gap: '16px', minHeight: '500px' }}>
        {/* Sessions List */}
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
            fontWeight: 600, fontSize: '0.9rem', color: '#475569',
          }}>
            Escalated Conversations
          </div>
          {sessions.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <i className="fas fa-check-circle" style={{ fontSize: '2rem', marginBottom: '8px', display: 'block', color: '#22c55e' }}></i>
              No pending conversations!
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {sessions.map((s) => (
                <div
                  key={s.sessionId}
                  onClick={() => openSession(s.sessionId)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: activeSession === s.sessionId ? '#f0f7ff' : 'transparent',
                    borderLeft: activeSession === s.sessionId ? '3px solid #0d6efd' : '3px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
                      {s.visitorName || 'Unknown'}
                    </span>
                    {!s.adminResponded && (
                      <span style={{
                        background: '#fef2f2', color: '#dc2626', fontSize: '0.7rem',
                        padding: '2px 8px', borderRadius: '10px', fontWeight: 600,
                      }}>
                        Pending
                      </span>
                    )}
                    {s.adminResponded && (
                      <span style={{
                        background: '#f0fdf4', color: '#16a34a', fontSize: '0.7rem',
                        padding: '2px 8px', borderRadius: '10px', fontWeight: 600,
                      }}>
                        Responded
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                    {formatTime(s.lastMessageAt)} · {s.messageCount} messages
                  </div>
                  <div style={{
                    fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {s.lastMessage}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat View */}
        {activeSession && (
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Chat header */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontWeight: 600, color: '#1e293b' }}>
                <i className="fas fa-comments" style={{ marginRight: '8px', color: '#0d6efd' }}></i>
                Conversation
              </span>
              <button
                className="btn btn-sm"
                onClick={() => resolveSession(activeSession)}
                style={{
                  background: '#16a34a', color: '#fff', border: 'none',
                  borderRadius: '8px', fontSize: '0.8rem',
                }}
              >
                <i className="fas fa-check" style={{ marginRight: '4px' }}></i> Mark Resolved
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#f8fafc' }}>
              {sessionMessages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: msg.senderRole === 'admin' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '70%',
                    background: msg.senderRole === 'admin' ? '#0d6efd' : msg.isAI ? '#fff' : '#e0f2fe',
                    color: msg.senderRole === 'admin' ? '#fff' : '#1e293b',
                    padding: '10px 14px',
                    borderRadius: msg.senderRole === 'admin' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    border: msg.isAI ? '1px solid #e2e8f0' : 'none',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                  }}>
                    {msg.senderRole === 'ai' && (
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>
                        <i className="fas fa-robot" style={{ marginRight: '4px' }}></i> Keys AI
                      </div>
                    )}
                    {msg.senderRole === 'admin' && (
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                        <i className="fas fa-user-tie" style={{ marginRight: '4px' }}></i> You
                      </div>
                    )}
                    {msg.message.split('\n').map((line, i) => (
                      <span key={i}>{line}<br /></span>
                    ))}
                    <div style={{
                      fontSize: '0.65rem', marginTop: '6px',
                      color: msg.senderRole === 'admin' ? 'rgba(255,255,255,0.6)' : '#94a3b8',
                    }}>
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Admin reply */}
            <div style={{
              padding: '12px 16px', borderTop: '1px solid #e2e8f0',
              display: 'flex', gap: '8px',
            }}>
              <textarea
                className="form-control"
                placeholder="Type your response..."
                value={adminReply}
                onChange={(e) => setAdminReply(e.target.value)}
                rows={2}
                style={{ fontSize: '0.85rem', resize: 'none' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendResponse();
                  }
                }}
              />
              <button
                className="btn btn-primary"
                onClick={sendResponse}
                disabled={!adminReply.trim() || responding}
                style={{ alignSelf: 'flex-end' }}
              >
                {responding ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-paper-plane"></i>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChatPanel;
