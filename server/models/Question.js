const mongoose = require('mongoose');

const matrixRowSchema = new mongoose.Schema({
  rowText: { type: String, required: true },
  columns: [String], // column headers for this row (if different per row)
  correctColumn: { type: Number }, // index of correct column (0-based) - legacy single-select
  correctColumns: [Number], // array of correct column indices for multi-select
}, { _id: false });

const hotspotTargetSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, default: '' },
  x: { type: Number, required: true }, // percentage 0-100
  y: { type: Number, required: true }, // percentage 0-100
  radius: { type: Number, default: 6 } // percentage 1-20
}, { _id: false });

const clozeBlankSchema = new mongoose.Schema({
  key: { type: String, required: true }, // e.g. blank1 used as {{blank1}}
  options: [{ type: String }],
  correctAnswer: { type: String, required: true }
}, { _id: false });

const caseStudySectionSchema = new mongoose.Schema({
  sectionId: { type: String, default: '' },
  title: { type: String, default: '' },
  content: { type: String, default: '' }
}, { _id: false });

const caseStudyQuestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['multiple-choice', 'sata', 'fill-blank', 'highlight', 'drag-drop', 'cloze-dropdown', 'bowtie', 'matrix', 'hotspot'],
    required: true
  },
  category: { type: String, default: '' },
  subcategory: { type: String, default: '' },
  questionText: { type: String, default: '' },
  questionImageUrl: { type: String, default: '' },
  options: [String],
  optionImages: [String], // image URL for each option (1:1 index mapping with options)
  correctAnswer: mongoose.Schema.Types.Mixed,
  rationale: { type: String, default: '' },
  rationaleImageUrl: { type: String, default: '' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  highlightStart: Number,
  highlightEnd: Number,
  highlightSelectableWords: [Number], // indices of words that are clickable
  highlightCorrectWords: [Number], // indices of words that are correct answers
  matrixRows: [matrixRowSchema],
  matrixColumns: [String]
  ,
  visibleSectionIds: [String],
  bowtieCondition: [String],
  bowtieActions: [String],
  bowtieParameters: [String],
  // Hotspot-specific fields
  hotspotImageUrl: String,
  hotspotTargets: [hotspotTargetSchema],

  // Cloze dropdown-specific fields
  clozeTemplate: String,
  clozeBlanks: [clozeBlankSchema]
}, { _id: true });

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['multiple-choice', 'sata', 'fill-blank', 'highlight', 'drag-drop', 'matrix', 'hotspot', 'cloze-dropdown', 'case-study'],
    required: true
  },

  // Basic fields
  category: { type: String, required: true },
  subcategory: { type: String, required: true },

  // Client Needs framework (NCLEX categorization)
  clientNeed: { type: String, default: '' }, // e.g., "Safe and Effective Care Environment"
  clientNeedSubcategory: { type: String, default: '' }, // e.g., "Management of Care"
  
  // Next Generation NCLEX flag
  isNextGen: { type: Boolean, default: false },

  questionText: { type: String, required: true },
  questionImageUrl: { type: String, default: '' },
  options: [String],
  optionImages: [String], // image URL for each option (1:1 index mapping with options)
  correctAnswer: mongoose.Schema.Types.Mixed,
  rationale: String,
  rationaleImageUrl: String,
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  
  // Draft status - allows saving incomplete questions
  isDraft: { type: Boolean, default: false },
  
  // Usage statistics
  timesUsed: { type: Number, default: 0 },
  correctAttempts: { type: Number, default: 0 },
  incorrectAttempts: { type: Number, default: 0 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  
  // Matrix-specific fields
  matrixRows: [matrixRowSchema],
  matrixColumns: [String],
  hotspotImageUrl: String,
  hotspotTargets: [hotspotTargetSchema],
  clozeTemplate: String,
  clozeBlanks: [clozeBlankSchema],

  // Case-study-specific fields
  caseStudyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaseStudy' },
  caseStudyType: { type: String, enum: ['layered', 'bowtie', 'trend'] },
  scenario: String,
  sections: [caseStudySectionSchema],
  questions: [caseStudyQuestionSchema],
  
  // Highlight-specific fields
  highlightStart: Number,
  highlightEnd: Number,
  highlightSelectableWords: [Number], // indices of words that are clickable
  highlightCorrectWords: [Number], // indices of words that are correct answers
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
