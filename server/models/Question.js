const mongoose = require('mongoose');

const matrixRowSchema = new mongoose.Schema({
  rowText: { type: String, required: true },
  columns: [String], // column headers for this row (if different per row)
  correctColumn: { type: Number, required: true } // index of correct column (0-based)
}, { _id: false });

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['multiple-choice', 'sata', 'fill-blank', 'highlight', 'drag-drop', 'matrix', 'case-study'],
    required: true
  },
  
  // Basic fields
  category: { type: String, required: true },
  subcategory: { type: String, required: true },
  questionText: { type: String, required: true },
  options: [String],
  correctAnswer: mongoose.Schema.Types.Mixed,
  rationale: String,
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  
  // Usage statistics
  timesUsed: { type: Number, default: 0 },
  correctAttempts: { type: Number, default: 0 },
  incorrectAttempts: { type: Number, default: 0 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  
  // Matrix-specific fields
  matrixRows: [matrixRowSchema],
  matrixColumns: [String],
  
  // Highlight-specific fields
  highlightStart: Number,
  highlightEnd: Number,
  
  // IRT Parameters (for CAT)
  irtDiscrimination: { type: Number, default: 1.0 }, // a-parameter
  irtDifficulty: { type: Number, default: 0.0 },      // b-parameter
  irtGuessing: { type: Number, default: 0.2 },        // c-parameter (for MC)
  
  // IRT Model type
  irtModel: { 
    type: String, 
    enum: ['1PL', '2PL', '3PL', 'GRM', 'NRM'], 
    default: '3PL' 
  }
});

module.exports = mongoose.model('Question', questionSchema);