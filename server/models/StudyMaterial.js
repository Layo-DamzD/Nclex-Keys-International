const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: { 
    type: String, 
    enum: ['Study Guide', 'Cheat Sheet', 'Practice Test', 'Flashcards', 'Video', 'Other'],
    default: 'Study Guide'
  },
  fileUrl: { type: String, required: true },
  backupUrl: { type: String, default: '' },
  fileType: { type: String, enum: ['pdf', 'docx', 'pptx', 'mp4', 'other'], default: 'pdf' },
  icon: { type: String, default: 'fa-file-pdf' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);