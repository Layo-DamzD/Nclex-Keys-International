const mongoose = require('mongoose');

const caseStudySchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  subcategory: { type: String, required: true },
  scenario: { type: String, required: true }, // The patient scenario
  type: { 
    type: String, 
    enum: ['6-question', 'bowtie', 'trend', 'matrix'],
    required: true 
  },
  sections: [{
    sectionId: String,
    title: String,
    content: String
  }], // For additional patient data (vitals, labs, etc.)
  questions: [{
    type: { 
      type: String, 
      enum: ['multiple-choice', 'sata', 'fill-blank', 'highlight', 'drag-drop', 'matrix', 'hotspot', 'cloze-dropdown', 'bowtie'],
      required: true 
    },
    questionText: String,
    options: [String],
    correctAnswer: mongoose.Schema.Types.Mixed,
    rationale: String,
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    highlightStart: Number,
    highlightEnd: Number,
    matrixColumns: [String],
    matrixRows: [{
      rowText: String,
      correctColumn: Number,
      correctColumns: [Number],
    }],
    // For bowtie questions
    visibleSectionIds: [String],
    bowtieCondition: [String],
    bowtieActions: [String],
    bowtieParameters: [String],
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
    }],
    // For trend questions
    trendData: [{
      time: String,
      value: String
    }]
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  linkedQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('CaseStudy', caseStudySchema);
