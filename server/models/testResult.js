const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  userAnswer: mongoose.Schema.Types.Mixed,
  isCorrect: Boolean,
  correctAnswer: mongoose.Schema.Types.Mixed,
  questionText: String,
  options: [String],
  type: String,
  category: String,     
  subcategory: String, 
  rationale: String,
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
  timeTaken: Number,
  percentage: Number,
  passed: Boolean,
  answers: [answerSchema],
});

module.exports = mongoose.model('TestResult', testResultSchema);
