const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'test',
      'video',
      'progress',
      'achievement',
      'test_completed',
      'video_watched',
      'progress_updated',
      'notification'
    ]
  },
  text: String,
  detail: String,
  description: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Activity', activitySchema);
