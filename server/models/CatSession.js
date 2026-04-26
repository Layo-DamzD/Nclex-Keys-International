const mongoose = require('mongoose');

const catSessionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  testType: { type: String, enum: ['cat', 'assessment'], default: 'cat' },

  // Session state — mirrors the in-memory session object
  startTime: { type: Date, required: true },
  administered: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  responses: [Number],        // Binary correct/incorrect (for IRT)
  earnedMarks: [Number],      // Per-question earned points
  totalMarks: [Number],       // Per-question possible points
  theta: { type: Number, default: 0 },
  se: { type: Number, default: 1.0 },
  thetaHistory: [Number],

  // Full answer details for final TestResult
  answerDetails: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    subQuestionId: mongoose.Schema.Types.ObjectId,
    userAnswer: mongoose.Schema.Types.Mixed,
    earnedMarks: Number,
    totalMarks: Number,
    isCorrect: mongoose.Schema.Types.Mixed,
    questionType: String,
    scenario: String,
  }],

  // Question pool — store only IDs to keep the document manageable
  // The full pool is reconstructed from DB when resuming
  questionPoolIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],

  // Engine configuration
  engineConfig: {
    passingStandard: Number,
    minItems: Number,
    maxItems: Number,
    confidenceThreshold: Number,
    initialAdjustment: Number,
    minAdjustment: Number,
    seDecay: Number,
    borderlineSeDecay: Number,
    borderlineThreshold: Number,
    partialScoring: Boolean,
    negativeScoring: Boolean,
    negativePenalty: Number,
    partialThreshold: Number,
    sataScoringMode: String,
    clozePartialScoring: Boolean,
  },

  // The current question the student is viewing (for UI restore)
  currentQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  questionNumber: { type: Number, default: 1 },

  // For assessment mode: track weak area selections used during pool building
  weakCategories: [String],
  strongCategories: [String],

  // Time tracking
  lastActivityAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Auto-expire sessions after 48 hours (TTL index)
catSessionSchema.index({ lastActivityAt: 1 }, { expireAfterSeconds: 48 * 60 * 60 });

module.exports = mongoose.model('CatSession', catSessionSchema);
