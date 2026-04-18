import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

// Generate a unique session ID for this browser
const getOrCreateSessionId = () => {
  const key = 'nclex_chat_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [waitingForHuman, setWaitingForHuman] = useState(false);
  const [showEscalateConfirm, setShowEscalateConfirm] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [unseenCount, setUnseenCount] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const sessionId = getOrCreateSessionId();

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await axios.get(`/api/chat/history/${sessionId}`);
        if (res.data?.messages?.length > 0) {
          setMessages(res.data.messages);
          // Check if any message is escalated
          const hasEscalation = res.data.messages.some(m => m.escalated && !m.resolved);
          setEscalated(hasEscalation);
          // Check if admin has already responded
          const hasAdminReply = res.data.messages.some(m => m.senderRole === 'admin');
          if (hasAdminReply) {
            setWaitingForHuman(false);
          }
        } else {
          // Show welcome message
          setMessages([{
            senderRole: 'ai',
            isAI: true,
            message: "Hey there! 👋 I'm Keys, your NCLEX study buddy. I'm here to help you with nursing concepts, NCLEX strategies, and anything else you need to ace your exam. What would you like to know?",
            createdAt: new Date().toISOString(),
          }]);
        }
      } catch (e) {
        // If history fails, just show welcome message
        setMessages([{
          senderRole: 'ai',
          isAI: true,
          message: "Hey there! 👋 I'm Keys, your NCLEX study buddy. How can I help you today?",
          createdAt: new Date().toISOString(),
        }]);
      }
    };
    loadHistory();
  }, [sessionId]);

  // Poll for new messages when escalated (so admin replies show up)
  useEffect(() => {
    if (!escalated) return;

    const pollMessages = async () => {
      try {
        const res = await axios.get(`/api/chat/history/${sessionId}`);
        const serverMessages = res.data?.messages || [];
        if (serverMessages.length > 0) {
          setMessages(serverMessages);
          // Check if admin has responded
          const hasAdminReply = serverMessages.some(m => m.senderRole === 'admin');
          if (hasAdminReply) {
            setWaitingForHuman(false);
          }
          // Check if conversation is resolved
          const allResolved = serverMessages.every(m => m.resolved);
          if (allResolved) {
            setEscalated(false);
          }
        }
      } catch (e) {
        // silent
      }
    };

    pollMessages();
    const intervalId = window.setInterval(pollMessages, 5000); // poll every 5s
    return () => window.clearInterval(intervalId);
  }, [escalated, sessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setUnseenCount(0);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    setInput('');
    setIsTyping(true);

    // Add user message optimistically
    const userMsg = {
      senderRole: 'student',
      message: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await axios.post('/api/chat/send', {
        sessionId,
        message: text,
        visitorName: visitorName || undefined,
        visitorEmail: visitorEmail || undefined,
      });

      const aiMsg = {
        senderRole: 'ai',
        isAI: true,
        message: res.data.reply,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);

      if (res.data.escalated) {
        setEscalated(true);
      }
      if (res.data.waitingForHuman) {
        setWaitingForHuman(true);
      }
    } catch (err) {
      const errorMsg = {
        senderRole: 'ai',
        isAI: true,
        message: "Oops, something went wrong. Please try again or tap 'Talk to a Person' below for help. 💙",
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEscalate = async () => {
    if (!showNamePrompt) {
      setShowNamePrompt(true);
      return;
    }

    try {
      const res = await axios.post('/api/chat/escalate', {
        sessionId,
        visitorName: visitorName || undefined,
        visitorEmail: visitorEmail || undefined,
      });

      setEscalated(true);
      setShowEscalateConfirm(false);
      setShowNamePrompt(false);
      setWaitingForHuman(true);

      const sysMsg = {
        senderRole: 'ai',
        isAI: true,
        message: res.data.message,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, sysMsg]);
    } catch (err) {
      // silent fail
    }
  };

  const toggleChat = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      setUnseenCount(0);
    }
  };

  // Format time
  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Floating Chat Bubble */}
      {!isOpen && (
        <button
          className="chat-widget-bubble"
          onClick={toggleChat}
          aria-label="Open chat"
        >
          <i className="fas fa-comment-dots"></i>
          {unseenCount > 0 && (
            <span className="chat-bubble-badge">{unseenCount > 9 ? '9+' : unseenCount}</span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-widget-window">
          {/* Header */}
          <div className="chat-widget-header">
            <div className="chat-widget-header-info">
              <div className="chat-widget-avatar">
                <i className="fas fa-graduation-cap"></i>
              </div>
              <div>
                <div className="chat-widget-title">Keys — NCLEX Tutor</div>
                <div className="chat-widget-status">
                  <span className={`chat-status-dot ${waitingForHuman ? 'away' : 'online'}`}></span>
                  {waitingForHuman ? 'Human support on the way' : 'Always online'}
                </div>
              </div>
            </div>
            <button className="chat-widget-close" onClick={toggleChat} aria-label="Close chat">
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Messages */}
          <div className="chat-widget-messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-message ${msg.isAI || msg.senderRole === 'ai' ? 'chat-message-ai' : 'chat-message-user'} ${msg.senderRole === 'admin' ? 'chat-message-admin' : ''}`}
              >
                {msg.senderRole === 'admin' && (
                  <div className="chat-message-sender-label">
                    <i className="fas fa-user-tie" style={{ marginRight: '4px' }}></i> Support Team
                  </div>
                )}
                <div className="chat-message-bubble">
                  {msg.message.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < msg.message.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
                <div className="chat-message-time">{formatTime(msg.createdAt)}</div>
              </div>
            ))}

            {isTyping && (
              <div className="chat-message chat-message-ai">
                <div className="chat-message-bubble chat-typing-bubble">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Escalation prompt */}
          {showNamePrompt && !escalated && (
            <div className="chat-escalate-form">
              <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '0.85rem', color: '#1e293b' }}>
                <i className="fas fa-user" style={{ marginRight: '6px' }}></i>
                Tell us about yourself (optional)
              </div>
              <input
                type="text"
                className="form-control"
                placeholder="Your name"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                style={{ fontSize: '0.85rem', marginBottom: '6px' }}
              />
              <input
                type="email"
                className="form-control"
                placeholder="Your email (optional)"
                value={visitorEmail}
                onChange={(e) => setVisitorEmail(e.target.value)}
                style={{ fontSize: '0.85rem', marginBottom: '8px' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-sm"
                  onClick={handleEscalate}
                  style={{
                    flex: 1,
                    background: '#0d6efd',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                  }}
                >
                  <i className="fas fa-paper-plane" style={{ marginRight: '4px' }}></i> Send Request
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => setShowNamePrompt(false)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Escalate confirmation */}
          {showEscalateConfirm && !showNamePrompt && (
            <div className="chat-escalate-confirm">
              <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                Connect with a real person?
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn btn-sm"
                  onClick={handleEscalate}
                  style={{
                    background: '#0d6efd',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    padding: '4px 12px',
                  }}
                >
                  Yes, please
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => setShowEscalateConfirm(false)}
                  style={{
                    background: '#f1f5f9',
                    color: '#64748b',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    padding: '4px 12px',
                  }}
                >
                  Not now
                </button>
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="chat-widget-input-area">
            <textarea
              ref={inputRef}
              className="chat-widget-input"
              placeholder={waitingForHuman ? "Type your message (support team will see it)..." : "Ask me anything about NCLEX..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isTyping}
            />
            <button
              className="chat-widget-send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              title="Send message"
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>

          {/* Footer - Talk to a person */}
          {!escalated && (
            <div className="chat-widget-footer">
              <button
                className="chat-escalate-btn"
                onClick={() => setShowEscalateConfirm(true)}
              >
                <i className="fas fa-headset" style={{ marginRight: '6px' }}></i>
                Talk to a Person
              </button>
            </div>
          )}
          {escalated && waitingForHuman && (
            <div className="chat-widget-footer chat-escalated-footer">
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                <i className="fas fa-clock" style={{ marginRight: '4px' }}></i>
                Waiting for support team response...
              </span>
            </div>
          )}
          {escalated && !waitingForHuman && (
            <div className="chat-widget-footer chat-escalated-footer" style={{ background: '#f0fdf4' }}>
              <span style={{ fontSize: '0.78rem', color: '#16a34a' }}>
                <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i>
                Support team is responding
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;
