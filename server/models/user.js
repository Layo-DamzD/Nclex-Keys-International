const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['student', 'admin', 'superadmin'],
    default: 'student'
  },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  program: { type: String, enum: ['NCLEX-RN', 'NCLEX-PN'] },
  phone: String,
  approved: { type: Boolean, default: false },
  accessCode: { type: String },
  adminEmailVerified: { type: Boolean, default: false },
  adminVerificationCodeHash: String,
  adminVerificationExpire: Date,
  recoveryPinHash: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  examDate: Date,
  faceVerificationProvider: { type: String, default: 'luxand' },
  luxandPersonId: { type: String },
  faceEnrolledAt: { type: Date },
  seenQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  // Tracks questions already used in student's custom (Create Test) exams only.
  // This is separate from seenQuestions because students can "see" questions in
  // prepared tests/reviews without wanting to exhaust custom-test availability.
  customTestUsedQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  // Web push tokens (Firebase Cloud Messaging) for this student across browsers/devices.
  // Keep this simple as strings so legacy records remain compatible.
  fcmTokens: [{ type: String }],
  // Student trusted devices. New device login requires camera verification first.
  trustedDevices: [{
    deviceId: { type: String },
    label: { type: String },
    verifiedAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: Date.now }
  }],
  lastReview: { type: Number, default: 0 }, // timestamp of last review
  // ✅ Add incorrectQuestions here (inside the schema)
  incorrectQuestions: [{ 
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    lastAttempted: { type: Date, default: Date.now },
    attemptCount: { type: Number, default: 1 }
  }]
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.compareRecoveryPin = async function (candidatePin) {
  if (!this.recoveryPinHash) return false;
  return await bcrypt.compare(String(candidatePin ?? ''), this.recoveryPinHash);
};

module.exports = mongoose.model('User', userSchema);
