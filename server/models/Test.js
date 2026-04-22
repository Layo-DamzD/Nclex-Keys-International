const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: String,
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  duration: { type: Number, required: true }, // in minutes
  passingScore: { type: Number, default: 70 },
  maxAttempts: { type: Number, default: 0 }, // 0 = unlimited
  assignmentType: { 
    type: String, 
    enum: ['all', 'individual'],
    default: 'all'
  },
  assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  proctored: { type: Boolean, default: false }
});

module.exports = mongoose.model('Test', testSchema);