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
  subscriptionStartDate: { type: Date, default: Date.now },
  program: { type: String, enum: ['NCLEX-RN', 'NCLEX-PN'] },
  phone: String,
  country: String,
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
  // Tracks questions attempted in student's custom (Create Test) exams.
  // This is separate from seenQuestions because students can "see" questions in
  // prepared tests/reviews without custom-test analytics being affected.
  customTestUsedQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  // Tracks questions omitted (left unanswered) in student's custom tests.
  customTestOmittedQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
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
  // Admin and super-admin login device records for security review.
  adminDeviceLogins: [{
    deviceId: { type: String },
    label: { type: String },
    userAgent: { type: String },
    ipAddress: { type: String },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now }
  }],
  // Super-admin managed scope: which students a regular admin can manage.
  managedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastReview: { type: Number, default: 0 }, // timestamp of last review
  // ✅ Add incorrectQuestions here (inside the schema)
  incorrectQuestions: [{ 
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    lastAttempted: { type: Date, default: Date.now },
    attemptCount: { type: Number, default: 1 }
  }],
  // Latest matched landing-page public test result, revealed after signup/login email match.
  publicTestResult: {
    source: { type: String, default: 'landing-page-public-test' },
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    attempted: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null }
  }
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
