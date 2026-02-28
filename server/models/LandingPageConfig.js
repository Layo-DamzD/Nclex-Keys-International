const mongoose = require('mongoose');

const landingPageConfigSchema = new mongoose.Schema(
  {
    pageKey: {
      type: String,
      required: true,
      unique: true,
      enum: ['home', 'brainiac'],
      index: true,
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ canvas: {}, blocks: [] }),
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LandingPageConfig', landingPageConfigSchema);
