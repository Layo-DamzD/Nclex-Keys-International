const mongoose = require('mongoose');

const examSupportMessageSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentName: { type: String, default: '' },
    sessionId: { type: String, required: true, index: true },
    senderRole: { type: String, enum: ['student', 'admin', 'superadmin'], required: true },
    senderName: { type: String, default: '' },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    isReadByStudent: { type: Boolean, default: false },
    isReadByAdmin: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ExamSupportMessage', examSupportMessageSchema);

