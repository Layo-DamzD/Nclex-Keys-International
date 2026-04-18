const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const Activity = require('../models/Activity');
const User = require('../models/user');
const ZAI = require('z-ai-web-dev-sdk').default;
const { authOnly, adminOnly } = require('../middleware/authMiddleware');
const { sendChatEscalationEmail } = require('../services/emailService');

// System prompt for the NCLEX AI Tutor
const NCLEX_SYSTEM_PROMPT = `You are Keys, a friendly and knowledgeable NCLEX tutor for NCLEX Keys International — a nursing exam preparation platform. Your role is to help nursing students understand concepts, answer NCLEX-related questions, and provide study guidance.

Key guidelines:
- Be warm, encouraging, and supportive. Use a conversational tone.
- When explaining concepts, relate them to real nursing scenarios when possible.
- If asked about a specific NCLEX question, explain the rationale and the "why" behind the correct answer.
- Use evidence-based nursing knowledge aligned with current NCLEX standards.
- If a question is outside nursing/NCLEX scope, politely redirect to NCLEX-related topics.
- Keep responses concise but thorough (2-4 paragraphs max unless the student asks for detailed explanations).
- Use simple language but don't oversimplify medical terminology — teach the proper terms.
- Encourage students to think critically about the "most correct" answer, as NCLEX often tests prioritization.
- If you're unsure about something, be honest and suggest they verify with their textbook or instructor.
- Never provide actual NCLEX exam questions or copyrighted content.
- You may suggest study strategies, mnemonic devices, and test-taking tips.
- If a student seems frustrated or anxious, offer words of encouragement.`;

// Initialize ZAI lazily (singleton)
// Tries .z-ai-config file first, then falls back to environment variables
let zaiInstance = null;
const getZAI = async () => {
  if (!zaiInstance) {
    try {
      zaiInstance = await ZAI.create();
    } catch {
      // Config file not found (e.g. on Render) — build from env vars
      console.log('[ZAI] .z-ai-config not found, loading from environment variables...');
      zaiInstance = new ZAI({
        baseUrl: process.env.ZAI_BASE_URL,
        apiKey: process.env.ZAI_API_KEY,
        chatId: process.env.ZAI_CHAT_ID,
        userId: process.env.ZAI_USER_ID,
        token: process.env.ZAI_TOKEN,
      });
      if (!process.env.ZAI_BASE_URL || !process.env.ZAI_API_KEY) {
        throw new Error('ZAI config missing: set ZAI_BASE_URL, ZAI_API_KEY, ZAI_CHAT_ID, ZAI_USER_ID, ZAI_TOKEN env vars (or provide .z-ai-config file)');
      }
      console.log('[ZAI] Successfully loaded from environment variables');
    }
  }
  if (!zaiInstance || !zaiInstance.chat) {
    throw new Error('ZAI instance is not properly initialized');
  }
  return zaiInstance;
};

// ============================================================
// STUDENT/VISITOR ROUTES (no auth required)
// ============================================================

// @route   POST /api/chat/send
// @desc    Send a message and get AI response
// @access  Public (available to students and visitors)
router.post('/send', async (req, res) => {
  try {
    const { sessionId, message, visitorName, visitorEmail } = req.body;

    if (!sessionId || !message || !message.trim()) {
      return res.status(400).json({ message: 'Session ID and message are required' });
    }

    // Check if this session has been escalated and resolved by admin
    const existingEscalated = await ChatMessage.findOne({
      sessionId,
      escalated: true,
      resolved: false,
    }).sort({ createdAt: -1 });

    // Save the user's message
    const userMsg = new ChatMessage({
      sessionId,
      senderRole: req.user ? 'student' : 'visitor',
      userId: req.user?._id || null,
      visitorName: visitorName || (req.user ? req.user.name : 'Visitor'),
      visitorEmail: visitorEmail || '',
      message: message.trim(),
    });
    await userMsg.save();

    // If escalated and not yet resolved, tell user a human will respond
    if (existingEscalated) {
      const pendingMessages = await ChatMessage.find({
        sessionId,
        escalated: true,
        resolved: false,
        senderRole: 'admin',
      });

      if (pendingMessages.length === 0) {
        return res.json({
          reply: "Our team has been notified and will respond to you shortly. Thank you for your patience! In the meantime, feel free to keep studying — we'll be right here. 💙",
          escalated: true,
          waitingForHuman: true,
        });
      }

      // If admin already responded, let conversation continue
    }

    // Get conversation history (last 10 messages for context)
    const history = await ChatMessage.find({ sessionId })
      .sort({ createdAt: 1 })
      .limit(10)
      .select('senderRole message isAI')
      .lean();

    // Build messages array for the AI
    const aiMessages = [
      { role: 'system', content: NCLEX_SYSTEM_PROMPT },
    ];

    // Add conversation context
    for (const msg of history) {
      if (msg.isAI) {
        aiMessages.push({ role: 'assistant', content: msg.message });
      } else {
        aiMessages.push({ role: 'user', content: msg.message });
      }
    }

    // Get AI response
    try {
      const zai = await getZAI();
      const completion = await zai.chat.completions.create({
        messages: aiMessages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const aiReply = completion.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";

      // Save AI response
      const aiMsg = new ChatMessage({
        sessionId,
        senderRole: 'ai',
        message: aiReply,
        isAI: true,
      });
      await aiMsg.save();

      return res.json({
        reply: aiReply,
        escalated: false,
        waitingForHuman: false,
      });
    } catch (aiError) {
      console.error('AI SDK error:', aiError.message);
      return res.json({
        reply: "I'm having trouble connecting right now. Please try again in a moment, or tap 'Talk to a Person' below to reach our support team directly. 💙",
        escalated: false,
        aiError: true,
      });
    }
  } catch (error) {
    console.error('Chat send error:', error);
    return res.status(500).json({ message: 'Failed to send message' });
  }
});

// @route   POST /api/chat/escalate
// @desc    Escalate conversation to a human
// @access  Public
router.post('/escalate', async (req, res) => {
  try {
    const { sessionId, visitorName, visitorEmail, reason } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    // Mark all messages in this session as escalated
    await ChatMessage.updateMany(
      { sessionId, escalated: false },
      { escalated: true }
    );

    // Save an escalation notice message
    const escalationMsg = new ChatMessage({
      sessionId,
      senderRole: 'ai',
      message: reason
        ? `[Escalated to human support] Reason: ${reason}`
        : '[Escalated to human support] This conversation has been escalated for human review.',
      isAI: true,
      escalated: true,
    });
    await escalationMsg.save();

    // ── Notify admin via email ──
    const chatHistory = await ChatMessage.find({ sessionId })
      .sort({ createdAt: 1 })
      .limit(20)
      .select('senderRole visitorName visitorEmail message createdAt')
      .lean();

    const lastUserMsg = [...chatHistory].reverse().find(m => m.senderRole === 'student' || m.senderRole === 'visitor');

    sendChatEscalationEmail({
      visitorName: visitorName || lastUserMsg?.visitorName || 'Unknown',
      visitorEmail: visitorEmail || lastUserMsg?.visitorEmail || '',
      sessionId,
      reason: reason || '',
      messageCount: chatHistory.length,
      lastMessage: lastUserMsg?.message || '',
    }).catch(err => console.error('Chat escalation email failed:', err.message));

    // ── Notify admin in-app via Activity ──
    try {
      // Find all admin users to notify
      const admins = await User.find({ role: { $in: ['admin', 'superadmin'] }, status: 'active' }).select('_id').lean();
      const activityPromises = admins.map(admin => {
        const activity = new Activity({
          student: admin._id,
          type: 'notification',
          text: 'New Chat Escalation',
          detail: `${visitorName || 'A visitor'} has requested to speak with a real person via the chat widget.`,
          description: `Session: ${sessionId}${reason ? ' | Reason: ' + reason : ''}`,
          metadata: {
            category: 'chat_escalation',
            sessionId,
            visitorName: visitorName || 'Unknown',
            visitorEmail: visitorEmail || '',
          },
        });
        return activity.save();
      });
      await Promise.all(activityPromises);
    } catch (actErr) {
      console.error('Chat escalation activity creation failed:', actErr.message);
    }

    return res.json({
      message: 'Your request has been sent to our support team. We will respond as soon as possible!',
      escalated: true,
    });
  } catch (error) {
    console.error('Escalation error:', error);
    return res.status(500).json({ message: 'Failed to escalate' });
  }
});

// @route   GET /api/chat/history/:sessionId
// @desc    Get chat history for a session
// @access  Public
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await ChatMessage.find({ sessionId })
      .sort({ createdAt: 1 })
      .select('senderRole visitorName message isAI createdAt')
      .lean();

    return res.json({ messages });
  } catch (error) {
    console.error('Chat history error:', error);
    return res.status(500).json({ message: 'Failed to load chat history' });
  }
});

// ============================================================
// ADMIN ROUTES (protected)
// ============================================================

// @route   GET /api/chat/admin/escalated
// @desc    Get all escalated conversations (grouped by session)
// @access  Admin only
router.get('/admin/escalated', authOnly, adminOnly, async (req, res) => {
  try {
    // Get all escalated sessions that are not yet resolved
    const escalatedMessages = await ChatMessage.find({
      escalated: true,
      resolved: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Group by sessionId
    const sessions = {};
    for (const msg of escalatedMessages) {
      if (!sessions[msg.sessionId]) {
        sessions[msg.sessionId] = {
          sessionId: msg.sessionId,
          visitorName: msg.visitorName || msg.userId?.name || 'Unknown',
          visitorEmail: msg.visitorEmail || '',
          lastMessage: msg.message,
          lastMessageAt: msg.createdAt,
          messageCount: 0,
          adminResponded: msg.adminResponded || false,
        };
      }
      sessions[msg.sessionId].messageCount++;
    }

    const sessionList = Object.values(sessions).sort(
      (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
    );

    return res.json({ sessions: sessionList });
  } catch (error) {
    console.error('Get escalated error:', error);
    return res.status(500).json({ message: 'Failed to fetch escalated chats' });
  }
});

// @route   GET /api/admin/chat/session/:sessionId
// @desc    Get full conversation for a session
// @access  Admin only
router.get('/admin/session/:sessionId', authOnly, adminOnly, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await ChatMessage.find({ sessionId })
      .sort({ createdAt: 1 })
      .select('senderRole visitorName message isAI escalated createdAt')
      .lean();

    return res.json({ messages });
  } catch (error) {
    console.error('Get session error:', error);
    return res.status(500).json({ message: 'Failed to fetch session' });
  }
});

// @route   POST /api/admin/chat/respond
// @desc    Admin sends a response to an escalated chat
// @access  Admin only
router.post('/admin/respond', authOnly, adminOnly, async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message || !message.trim()) {
      return res.status(400).json({ message: 'Session ID and message are required' });
    }

    // Save admin response
    const adminMsg = new ChatMessage({
      sessionId,
      senderRole: 'admin',
      userId: req.user?._id || null,
      visitorName: req.user?.name || 'Admin',
      message: message.trim(),
      escalated: true,
    });
    await adminMsg.save();

    // Mark as admin responded
    await ChatMessage.updateMany(
      { sessionId, escalated: true },
      { adminResponded: true }
    );

    return res.json({ message: 'Response sent successfully' });
  } catch (error) {
    console.error('Admin respond error:', error);
    return res.status(500).json({ message: 'Failed to send response' });
  }
});

// @route   POST /api/admin/chat/resolve
// @desc    Mark an escalated conversation as resolved
// @access  Admin only
router.post('/admin/resolve', authOnly, adminOnly, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    await ChatMessage.updateMany(
      { sessionId },
      { resolved: true }
    );

    return res.json({ message: 'Conversation marked as resolved' });
  } catch (error) {
    console.error('Resolve error:', error);
    return res.status(500).json({ message: 'Failed to resolve conversation' });
  }
});

module.exports = router;
