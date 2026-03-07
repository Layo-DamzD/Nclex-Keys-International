const mongoose = require('mongoose');

const publicTestLeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    attempted: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    ip: { type: String, default: '' },
    location: { type: String, default: '' },
    device: { type: String, default: '' },
    browserLocation: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    source: { type: String, default: 'landing-page-public-test' },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    claimedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PublicTestLead', publicTestLeadSchema);
