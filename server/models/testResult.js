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
  testName: String,
  date: { type: Date, default: Date.now },
  score: Number,
  totalQuestions: Number,
  totalPoints: Number,      // Total possible points across all questions
  earnedPoints: Number,     // Points actually earned by student
  timeTaken: Number,
  percentage: Number,
  passed: Boolean,
  theta: Number,            // CAT ability estimate
  se: Number,               // CAT standard error
  confidence: {             // Confidence level derived from SE
    level: String,          // 'Very High', 'High', 'Moderate', 'Low', 'Very Low'
    percentage: Number      // Numeric confidence percentage
  },
  answers: [answerSchema],
  proctoring: mongoose.Schema.Types.Mixed,
});

module.exports = mongoose.model('TestResult', testResultSchema);
