const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {
  sendPasswordResetOtpEmail,
  sendAdminSignupVerificationEmail,
  isEmailConfigured
} = require('../services/emailService');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashValue = async (value) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(String(value), salt);
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactRegex = (value = '') => new RegExp(`^${escapeRegex(String(value).trim())}$`, 'i');
const normalizeName = (firstName = '', lastName = '') => `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();

const savePasswordResetOtp = async (user) => {
  const otp = generateOtp();
  user.resetPasswordToken = await hashValue(otp);
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();
  return otp;
};

const saveAdminVerificationCode = async (user) => {
  const code = generateOtp();
  user.adminVerificationCodeHash = await hashValue(code);
  user.adminVerificationExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();
  return code;
};

const clearPasswordResetState = (user) => {
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
};

const findCandidateByPassword = async (candidates, password) => {
  for (const candidate of candidates) {
    if (await candidate.comparePassword(password)) return candidate;
  }
  return null;
};

// ===== STUDENT =====
const registerStudent = async (req, res) => {
  try {
    const { name, email, password, program, phone, examDate } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'student',
      program,
      phone,
      examDate: examDate || null
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      examDate: user.examDate,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: 'student' });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({
        message: 'Your acct has been suspended, kindly renew your subscription to continue enjoying the service. For assistance, contact support via WhatsApp below.'
      });
    }
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      examDate: user.examDate,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ===== ADMIN =====
const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Admin account with this email already exists' });
    }

    const adminCount = await User.countDocuments({ role: { $in: ['admin', 'superadmin'] } });
    let role = 'admin';
    let approved = false;
    let accessCode = null;

    if (adminCount === 0) {
      role = 'superadmin';
      approved = true;
    } else {
      accessCode = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      approved,
      accessCode,
      adminEmailVerified: false
    });

    if (!isEmailConfigured()) {
      await User.findByIdAndDelete(user._id);
      return res.status(503).json({ message: 'Email service is not configured. Cannot complete admin signup verification.' });
    }

    const verificationCode = await saveAdminVerificationCode(user);
    const emailResult = await sendAdminSignupVerificationEmail({
      to: user.email,
      name: user.name,
      verificationCode,
      accessCode: user.accessCode
    });

    if (!emailResult.sent) {
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({ message: 'Failed to send verification code. Please try again.' });
    }

    res.status(201).json({
      email: user.email,
      accessCode: user.accessCode,
      role: user.role,
      message: 'Verification code sent to your email. Enter it to complete admin signup.',
      requiresVerification: true
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password, accessCode } = req.body;
    const user = await User.findOne({ email, role: { $in: ['admin', 'superadmin'] } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!user.adminEmailVerified) {
      return res.status(403).json({ message: 'Please verify your admin signup code from email before logging in' });
    }
    if (user.status && user.status !== 'active') {
      return res.status(403).json({ message: 'This account is inactive' });
    }
    if (user.role === 'admin') {
      if (!user.approved) {
        return res.status(403).json({ message: 'Account pending approval by super admin' });
      }
      if (user.accessCode !== accessCode) {
        return res.status(401).json({ message: 'Invalid access code' });
      }
    }
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      approved: user.approved,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const verifyAdminSignupCode = async (req, res) => {
  try {
    const { email, verificationCode } = req.body;
    if (!email || !verificationCode) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    const user = await User.findOne({ email: exactRegex(email), role: { $in: ['admin', 'superadmin'] } });
    if (!user) {
      return res.status(404).json({ message: 'Admin account not found' });
    }

    if (!user.adminVerificationCodeHash || !user.adminVerificationExpire || user.adminVerificationExpire <= Date.now()) {
      return res.status(400).json({ message: 'Verification code is invalid or expired' });
    }

    const matches = await bcrypt.compare(String(verificationCode), user.adminVerificationCodeHash);
    if (!matches) {
      return res.status(401).json({ message: 'Invalid verification code' });
    }

    user.adminEmailVerified = true;
    user.adminVerificationCodeHash = undefined;
    user.adminVerificationExpire = undefined;
    await user.save();

    return res.json({
      message: 'Admin signup verified successfully. You can now log in.',
      token: user.role === 'superadmin' ? generateToken(user._id) : undefined
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const approveAdmin = async (req, res) => {
  try {
    const admin = await User.findById(req.params.adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ message: 'Admin not found' });
    }
    admin.approved = true;
    await admin.save();
    res.json({ message: 'Admin approved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ===== PASSWORD RESET (EMAIL OTP) =====
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: exactRegex(email), role: 'student' });
    if (!user) {
      return res.status(404).json({ message: 'No student account with that email exists' });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({ message: 'Email OTP is not configured yet. Contact support.' });
    }

    const otp = await savePasswordResetOtp(user);
    const emailResult = await sendPasswordResetOtpEmail({
      to: user.email,
      name: user.name,
      otp,
      accountLabel: 'student account'
    });

    if (!emailResult.sent) {
      return res.status(500).json({ message: 'Failed to send OTP email. Please try again.' });
    }

    return res.json({ message: 'OTP sent to your email. Enter it below to reset your password.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const forgotAdminPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: exactRegex(email), role: { $in: ['admin', 'superadmin'] } });
    if (!user) {
      return res.status(404).json({ message: 'No admin account with that email exists' });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({ message: 'Email OTP is not configured yet. Contact support.' });
    }

    const otp = await savePasswordResetOtp(user);
    const emailResult = await sendPasswordResetOtpEmail({
      to: user.email,
      name: user.name,
      otp,
      accountLabel: 'admin account'
    });

    if (!emailResult.sent) {
      return res.status(500).json({ message: 'Failed to send OTP email. Please try again.' });
    }

    return res.json({ message: 'OTP sent to your email. Enter it below to reset your password.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    const user = await User.findOne({
      email: exactRegex(email),
      role: 'student',
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user || !user.resetPasswordToken) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const otpMatches = await bcrypt.compare(String(otp), user.resetPasswordToken);
    if (!otpMatches) {
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    user.password = password;
    clearPasswordResetState(user);
    await user.save();

    return res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const resetAdminPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    const user = await User.findOne({
      email: exactRegex(email),
      role: { $in: ['admin', 'superadmin'] },
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user || !user.resetPasswordToken) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const otpMatches = await bcrypt.compare(String(otp), user.resetPasswordToken);
    if (!otpMatches) {
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    user.password = password;
    clearPasswordResetState(user);
    await user.save();

    return res.json({ message: 'Admin password reset successful' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Legacy token routes kept for backward compatibility
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
      role: 'student'
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = password;
    clearPasswordResetState(user);
    await user.save();

    return res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const resetAdminPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
      role: { $in: ['admin', 'superadmin'] }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = password;
    clearPasswordResetState(user);
    await user.save();

    return res.json({ message: 'Admin password reset successful' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const forgotAdminAccessCode = async (req, res) => {
  try {
    const { firstName, lastName, password } = req.body;

    if (!firstName || !lastName || !password) {
      return res.status(400).json({ message: 'Enter first name, last name and password' });
    }

    const fullName = normalizeName(firstName, lastName);
    const candidates = await User.find({
      role: { $in: ['admin', 'superadmin'] },
      name: exactRegex(fullName)
    });

    if (!candidates.length) {
      return res.status(404).json({ message: 'No matching admin account found' });
    }

    const user = await findCandidateByPassword(candidates, password);
    if (!user) {
      return res.status(401).json({ message: 'Verification details are incorrect' });
    }

    if (user.role === 'superadmin' || !user.accessCode) {
      return res.json({
        message: 'Super admin account does not use an access code.',
        accessCode: ''
      });
    }

    return res.json({
      message: 'Access code recovered successfully.',
      accessCode: user.accessCode
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ===== PROFILE =====
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -recoveryPinHash');
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  registerAdmin,
  loginAdmin,
  verifyAdminSignupCode,
  approveAdmin,
  getMe,
  forgotPassword,
  resetPassword,
  forgotAdminPassword,
  resetAdminPassword,
  resetPasswordWithOtp,
  resetAdminPasswordWithOtp,
  forgotAdminAccessCode
};
