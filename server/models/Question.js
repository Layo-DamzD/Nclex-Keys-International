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

/**
 * Validate and sanitize correctAnswer before saving.
 * Prevents full-text answers and wrong formats from reaching the DB.
 * Runs on EVERY save — covers create, update, bulk import, draft publish.
 */
function validateCorrectAnswer(q) {
  const type = q.type;
  const ca = q.correctAnswer;

  // Skip drafts and types that don't need validation
  if (q.isDraft) return;
  if (!['multiple-choice', 'sata'].includes(type)) return;
  if (ca === undefined || ca === null || ca === '') return;

  if (type === 'multiple-choice') {
    const s = String(ca).trim();
    // If it's already a single letter, good
    if (/^[A-Z]$/i.test(s)) return;

    // If it's full text like "Increase the oxygen flow rate..."
    // Try to match it against the options array to find the correct letter
    const opts = Array.isArray(q.options) ? q.options : [];
    for (let i = 0; i < opts.length; i++) {
      const optText = String(opts[i]).trim();
      if (optText && s.toLowerCase() === optText.toLowerCase()) {
        q.correctAnswer = String.fromCharCode(65 + i); // A, B, C...
        return;
      }
    }

    // If it's a letter with extra text like "A. some text", extract just the letter
    const letterMatch = s.match(/^\s*([A-Z])[^A-Z]/i);
    if (letterMatch) {
      q.correctAnswer = letterMatch[1].toUpperCase();
      return;
    }

    // If it looks like a letter array from JSON stringify like "[\"A\",\"B\"]" → not valid for MC
    // Log warning but don't crash
    console.warn(`[validateCorrectAnswer] Question ${q._id || 'new'}: unusual correctAnswer format for MC: "${s.substring(0, 50)}"`);
  }

  if (type === 'sata') {
    // Should be an array of single letters
    if (Array.isArray(ca)) {
      const validLetters = [];
      for (const item of ca) {
        const s = String(item).trim();
        if (/^[A-Z]$/i.test(s)) {
          validLetters.push(s.toUpperCase());
        } else {
          // Full text — try to match against options
          const opts = Array.isArray(q.options) ? q.options : [];
          for (let i = 0; i < opts.length; i++) {
            const optText = String(opts[i]).trim();
            if (optText && s.toLowerCase() === optText.toLowerCase()) {
              validLetters.push(String.fromCharCode(65 + i));
              break;
            }
          }
        }
      }
      // De-duplicate and sort
      const unique = [...new Set(validLetters)].sort();
      if (unique.length > 0) {
        q.correctAnswer = unique;
      }
      return;
    }

    // If it's a string like "A, B, C" or "ABC"
    const s = String(ca).trim();
    const letters = s.split(/[\s,]+/).filter(l => /^[A-Z]$/i.test(l)).map(l => l.toUpperCase());
    if (letters.length > 0) {
      q.correctAnswer = [...new Set(letters)].sort();
    }
  }
}

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

  // Track which admin uploaded this question
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
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
  caseStudyType: { type: String, enum: ['layered', 'bowtie', 'trend', 'matrix'] },
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

// Pre-save hook: validate and sanitize correctAnswer for all non-draft MC/SATA questions
// Mongoose 9+ requires async middleware — do NOT use callback-style function(next)
questionSchema.pre('save', async function () {
  validateCorrectAnswer(this);
});

module.exports = mongoose.model('Question', questionSchema);
