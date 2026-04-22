const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  // Conversation session - groups messages together
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  // Who is chatting: 'student', 'visitor' (not logged in), 'admin' (human response)
  senderRole: {
    type: String,
    enum: ['student', 'visitor', 'admin', 'ai'],
    required: true,
  },
  // User reference (null for visitors)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Visitor name (if not logged in)
  visitorName: {
    type: String,
    default: '',
  },
  // Visitor email (if not logged in and provided)
  visitorEmail: {
    type: String,
    default: '',
  },
  // The message content
  message: {
    type: String,
    required: true,
  },
  // Is this message from the AI?
  isAI: {
    type: Boolean,
    default: false,
  },
  // Has this conversation been escalated to a human?
  escalated: {
    type: Boolean,
    default: false,
  },
  // Has an admin responded to the escalation?
  adminResponded: {
    type: Boolean,
    default: false,
  },
  // Escalation resolved by admin?
  resolved: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for fetching conversations
chatMessageSchema.index({ sessionId: 1, createdAt: 1 });
chatMessageSchema.index({ escalated: 1, resolved: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
