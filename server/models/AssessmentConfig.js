const mongoose = require('mongoose');

const assessmentConfigSchema = new mongoose.Schema({
  // Singleton pattern — only one document, keyed by a fixed identifier
  key: { type: String, default: 'default', unique: true },

  // Assessment structure
  totalQuestions: { type: Number, default: 150, min: 10, max: 300 },
  minCaseStudies: { type: Number, default: 40, min: 0, max: 200 },
  passingScore: { type: Number, default: 70, min: 0, max: 100 },

  // Proctoring settings
  assessmentProctored: { type: Boolean, default: false },
  caseStudyProctored: { type: Boolean, default: false },

  // CAT engine settings (when CAT mode is enabled)
  catEnabled: { type: Boolean, default: false },
  catMinItems: { type: Number, default: 85, min: 15, max: 150 },
  catMaxItems: { type: Number, default: 150, min: 50, max: 300 },
  catPassingStandard: { type: Number, default: 0.0, min: -3.0, max: 3.0 },
  catConfidenceLevel: { type: Number, default: 0.95, min: 0.5, max: 0.999 },
  catTargetSE: { type: Number, default: 0.08, min: 0.01, max: 0.5 },
  // NCLEX-style adaptive tuning
  catInitialAdjustment: { type: Number, default: 0.3, min: 0.05, max: 1.0 },
  catMinAdjustment: { type: Number, default: 0.05, min: 0.01, max: 0.5 },
  catBorderlineThreshold: { type: Number, default: 0.2, min: 0.05, max: 1.0 },
  catSeDecay: { type: Number, default: 0.95, min: 0.80, max: 0.99 },
  catBorderlineSeDecay: { type: Number, default: 0.975, min: 0.90, max: 0.995 },

  // CAT scoring settings
  catPartialScoring: { type: Boolean, default: true },          // Enable partial credit for NGN types
  catNegativeScoring: { type: Boolean, default: true },          // Penalise wrong answers with extra theta penalty
  catNegativePenalty: { type: Number, default: 0.15, min: 0.01, max: 1.0 }, // Extra theta penalty for wrong answers
  catPartialThreshold: { type: Number, default: 0.6, min: 0.1, max: 0.9 }, // Proportion threshold for positive theta shift
  catSataScoringMode: { type: String, enum: ['partial_negative', 'all_or_nothing', 'partial_only'], default: 'partial_negative' },
  catClozePartialScoring: { type: Boolean, default: true },      // Cloze-dropdown: score each blank individually

  // Time & attempts
  assessmentDuration: { type: Number, default: 180, min: 10, max: 600 }, // minutes
  maxAttempts: { type: Number, default: 1, min: 0, max: 99 }, // 0 = unlimited

  // Question type weights for random generation
  includeMultipleChoice: { type: Boolean, default: true },
  includeSATA: { type: Boolean, default: true },
  includeFillBlank: { type: Boolean, default: true },
  includeMatrix: { type: Boolean, default: true },
  includeDragDrop: { type: Boolean, default: true },
  includeHighlight: { type: Boolean, default: true },
  includeHotspot: { type: Boolean, default: true },
  includeCloze: { type: Boolean, default: true },
  includeBowtie: { type: Boolean, default: true },
  includeCaseStudy: { type: Boolean, default: true },

  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Static method to get the singleton config (creates default if not exists)
assessmentConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne({ key: 'default' });
  if (!config) {
    config = await this.create({ key: 'default' });
  }
  return config;
};

assessmentConfigSchema.statics.updateConfig = async function (data, adminId) {
  const config = await this.findOne({ key: 'default' });
  if (!config) {
    const newConfig = await this.create({ ...data, key: 'default', updatedBy: adminId });
    return newConfig;
  }
  Object.keys(data).forEach((key) => {
    if (key !== '_id' && key !== 'key' && data[key] !== undefined) {
      config[key] = data[key];
    }
  });
  config.updatedAt = new Date();
  config.updatedBy = adminId;
  await config.save();
  return config;
};

module.exports = mongoose.model('AssessmentConfig', assessmentConfigSchema);
