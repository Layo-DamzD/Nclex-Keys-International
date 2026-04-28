const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  userAnswer: mongoose.Schema.Types.Mixed,
  isCorrect: mongoose.Schema.Types.Mixed,
  earnedMarks: Number,
  totalMarks: Number,
  correctAnswer: mongoose.Schema.Types.Mixed,
  questionText: String,
  options: [String],
  type: String,
  category: String,     
  subcategory: String, 
  rationale: String,
  rationaleImageUrl: String,
  highlightStart: Number,
  highlightEnd: Number,
  scenario: String,
  hotspotImageUrl: String,
  hotspotTargets: [{
    id: String,
    label: String,
    x: Number,
    y: Number,
    radius: Number
  }],
  clozeTemplate: String,
  clozeBlanks: [{
    key: String,
    options: [String],
    correctAnswer: String
  }]
}, { _id: false });

const testResultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  testName: String,
  testType: String,
  date: { type: Date, default: Date.now },
  score: Number,
  totalQuestions: Number,
  totalPoints: Number,      // Total possible points across all questions
  earnedPoints: Number,     // Points actually earned by student
  timeTaken: Number,
  percentage: Number,
  passed: Boolean,
  status: { type: String, enum: ['completed', 'in_progress', 'exited'], default: 'completed' },
  theta: Number,            // CAT ability estimate
  se: Number,               // CAT standard error
  confidence: {             // Confidence level derived from SE
    level: String,          // 'Very High', 'High', 'Moderate', 'Low', 'Very Low'
    percentage: Number      // Numeric confidence percentage
  },
  answers: [answerSchema],
  proctoring: mongoose.Schema.Types.Mixed,

  // Full session snapshot for in_progress tests (enables resume)
  testSessionData: {
    questions: mongoose.Schema.Types.Mixed,  // Full question objects array
    settings: mongoose.Schema.Types.Mixed,   // { timed, tutorMode, totalQuestions, testName, testId, ... }
    currentIndex: Number,
    answers: mongoose.Schema.Types.Mixed,    // { questionId: userAnswer }
    caseAnswers: mongoose.Schema.Types.Mixed, // { subQuestionId: answer }
    caseIndex: Number,
    timeLeft: Number,
    questionTimeSpent: mongoose.Schema.Types.Mixed, // { questionId: seconds }
    markedQuestions: mongoose.Schema.Types.Mixed,   // { questionId: true }
    activeCaseTabByQuestion: mongoose.Schema.Types.Mixed,
    tutorRevealed: mongoose.Schema.Types.Mixed,
    dragSourceItems: mongoose.Schema.Types.Mixed,
    dragAnswerItems: mongoose.Schema.Types.Mixed,
    caseDragSourceItems: mongoose.Schema.Types.Mixed,
    caseDragAnswerItems: mongoose.Schema.Types.Mixed,
    chatMessages: mongoose.Schema.Types.Mixed,
    dashboardReturnPath: String,
    savedAt: Number,              // Timestamp when last saved
    examMode: String,             // 'classic', 'ngn', 'mixed'
    filterMode: String,           // 'clientNeeds', 'categories'
    clientNeedsSelections: mongoose.Schema.Types.Mixed,
    selections: mongoose.Schema.Types.Mixed,
  },
}, { minimize: false });

module.exports = mongoose.model('TestResult', testResultSchema);
