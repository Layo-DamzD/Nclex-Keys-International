const mongoose = require('mongoose');

const instructorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  title: String,
  bio: String,
  specialties: [String],
  photoUrl: String,
  socialLinks: {
    facebook: String,
    twitter: String,
    linkedin: String,
    instagram: String
  },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Instructor', instructorSchema);