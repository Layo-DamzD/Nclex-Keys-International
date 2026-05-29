const mongoose = require('mongoose');

const questionFlagSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true, enum: ['wrong_answer', 'unclear_question', 'typo_error', 'missing_image', 'incorrect_options', 'other'] },
  comment: { type: String, default: '', maxlength: 500 },
  testResultId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestResult' },
  resolved: { type: Boolean, default: false },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  adminNote: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

// One student can only flag a question once (per question)
questionFlagSchema.index({ questionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('QuestionFlag', questionFlagSchema);
