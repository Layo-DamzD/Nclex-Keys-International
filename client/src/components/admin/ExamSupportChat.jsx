import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
};

const ExamSupportChat = () => {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem('adminToken');

  const selectedKey = useMemo(
    () => (selected ? `${selected.studentId}:${selected.sessionId}` : ''),
    [selected]
  );

  const loadConversations = async () => {
    try {
      const res = await axios.get('/api/admin/exam-support/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load exam support conversations', err);
    }
  };

  const loadMessages = async (studentId, sessionId) => {
    if (!studentId || !sessionId) return;
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/exam-support/messages', {
        params: { studentId, sessionId },
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load exam support messages', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    const timer = setInterval(loadConversations, 7000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selected) return;
    loadMessages(selected.studentId, selected.sessionId);
    const timer = setInterval(() => {
      loadMessages(selected.studentId, selected.sessionId);
    }, 4000);
    return () => clearInterval(timer);
  }, [selectedKey]);

  const send = async () => {
    const trimmed = String(message || '').trim();
    if (!trimmed || !selected) return;
    try {
      await axios.post('/api/admin/exam-support/messages', {
        studentId: selected.studentId,
        sessionId: selected.sessionId,
        message: trimmed
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('');
      loadMessages(selected.studentId, selected.sessionId);
      loadConversations();
    } catch (err) {
      console.error('Failed to send exam support message', err);
    }
  };

  return (
    <div className="row g-3">
      <div className="col-lg-4">
        <div className="card p-3">
          <h5 className="mb-3">Exam Support Conversations</h5>
          <div style={{ maxHeight: 520, overflow: 'auto' }}>
            {conversations.length === 0 && <div className="text-muted">No active conversations yet.</div>}
            {conversations.map((conv) => {
              const key = `${conv.studentId}:${conv.sessionId}`;
              const active = key === selectedKey;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelected(conv)}
                  className={`btn w-100 text-start mb-2 ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
                >
                  <div style={{ fontWeight: 700 }}>{conv.studentName}</div>
                  <div style={{ fontSize: '0.82rem', opacity: 0.85 }}>Session: {conv.sessionId}</div>
                  <div style={{ fontSize: '0.8rem', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {conv.lastMessage}
                  </div>
                  {conv.unreadAdminCount > 0 && (
                    <span className="badge bg-danger mt-1">{conv.unreadAdminCount} new</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="col-lg-8">
        <div className="card p-3">
          <h5 className="mb-3">Live Exam Chat</h5>
          {!selected ? (
            <div className="text-muted">Select a conversation to start.</div>
          ) : (
            <>
              <div className="mb-2 text-muted">
                Chatting with <strong>{selected.studentName}</strong> ({selected.sessionId})
              </div>
              <div style={{ maxHeight: 430, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                {loading && <div className="text-muted">Loading...</div>}
                {!loading && messages.map((m) => {
                  const mine = m.senderRole !== 'student';
                  return (
                    <div key={m._id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                      <div style={{ maxWidth: '75%', background: mine ? '#dbeafe' : '#f1f5f9', borderRadius: 10, padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#475569' }}>{m.senderName} • {formatTime(m.createdAt)}</div>
                        <div>{m.message}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="d-flex gap-2 mt-2">
                <input
                  className="form-control"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type support response..."
                />
                <button className="btn btn-primary" type="button" onClick={send}>Send</button>
              </div>
              <small className="text-muted mt-2 d-block">
                Support only: do not send answer hints during live tests.
              </small>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamSupportChat;

