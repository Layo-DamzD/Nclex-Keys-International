const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
  sendPasswordResetEmail,
  sendPasswordResetOtpEmail,
  sendAdminAccessCodeEmail,
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
const normalizeDeviceId = (value = '') => String(value || '').trim().slice(0, 200);
const normalizeDeviceLabel = (value = '') => String(value || '').trim().slice(0, 160);
const normalizeIpAddress = (value = '') => String(value || '').trim().slice(0, 80);
const STUDENT_SIGNUP_ACCESS_CODE = process.env.STUDENT_SIGNUP_ACCESS_CODE || 'NCKeys5832';
const SIGNUP_ACCESS_HELP_NUMBER = '+2347037367480';
const normalizeAccessCode = (value = '') => String(value || '').replace(/\s+/g, '').toLowerCase();

const savePasswordResetOtp = async (user) => {
  const otp = generateOtp();
  user.resetPasswordToken = await hashValue(otp);
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();
  return otp;
};

const clearPasswordResetState = (user) => {
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
};

const resolveClientIp = (req) => {
  const forwarded = String(req.headers['x-forwarded-for'] || '').trim();
  if (forwarded) {
    return normalizeIpAddress(forwarded.split(',')[0]);
  }
  return normalizeIpAddress(req.ip || req.socket?.remoteAddress || '');
};

const inferAdminDeviceLabel = (userAgent = '') => {
  const ua = String(userAgent || '').toLowerCase();
  const os = ua.includes('windows')
    ? 'Windows'
    : ua.includes('android')
      ? 'Android'
      : ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')
        ? 'iOS'
        : ua.includes('mac os') || ua.includes('macintosh')
          ? 'macOS'
          : ua.includes('linux')
            ? 'Linux'
            : 'Unknown OS';

  const browser = ua.includes('edg/')
    ? 'Edge'
    : ua.includes('chrome/')
      ? 'Chrome'
      : ua.includes('firefox/')
        ? 'Firefox'
        : ua.includes('safari/') && !ua.includes('chrome/')
          ? 'Safari'
          : 'Browser';

  return `${os} - ${browser}`;
};

const upsertAdminDeviceLogin = (user, req, suppliedDeviceId = '', suppliedLabel = '') => {
  const userAgent = String(req.get('user-agent') || '').trim().slice(0, 500);
  const ipAddress = resolveClientIp(req);
  const fallbackSeed = `${userAgent}::${ipAddress}`;
  const fallbackDeviceId = crypto
    .createHash('sha256')
    .update(fallbackSeed)
    .digest('hex')
    .slice(0, 32);

  const normalizedDeviceId = normalizeDeviceId(suppliedDeviceId) || fallbackDeviceId;
  const normalizedLabel = normalizeDeviceLabel(suppliedLabel) || inferAdminDeviceLabel(userAgent);
  const now = new Date();

  if (!Array.isArray(user.adminDeviceLogins)) user.adminDeviceLogins = [];

  const existing = user.adminDeviceLogins.find((entry) => entry?.deviceId === normalizedDeviceId);

  if (existing) {
    existing.label = normalizedLabel || existing.label;
    existing.userAgent = userAgent || existing.userAgent;
    existing.ipAddress = ipAddress || existing.ipAddress;
    existing.lastSeenAt = now;
  } else {
    user.adminDeviceLogins.push({
      deviceId: normalizedDeviceId,
      label: normalizedLabel,
      userAgent,
      ipAddress,
      firstSeenAt: now,
      lastSeenAt: now
    });
  }

  if (user.adminDeviceLogins.length > 50) {
    user.adminDeviceLogins = user.adminDeviceLogins
      .sort((a, b) => new Date(b.lastSeenAt || 0).getTime() - new Date(a.lastSeenAt || 0).getTime())
      .slice(0, 50);
  }
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
    const { name, email, password, program, phone, examDate, deviceId, deviceLabel, accessCode } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    if (normalizeAccessCode(accessCode) !== normalizeAccessCode(STUDENT_SIGNUP_ACCESS_CODE)) {
      return res.status(403).json({
        message: `Message ${SIGNUP_ACCESS_HELP_NUMBER} on WhatsApp to get your access code.`
      });
    }

    const normalizedDeviceId = normalizeDeviceId(deviceId);
    const trustedDevices = normalizedDeviceId
      ? [{
          deviceId: normalizedDeviceId,
          label: normalizeDeviceLabel(deviceLabel) || 'Signup Device',
          verifiedAt: new Date(),
          lastUsedAt: new Date()
        }]
      : [];

    const user = await User.create({
      name,
      email,
      password,
      role: 'student',
      program,
      phone,
      examDate: examDate || null,
      trustedDevices
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
    const { email, password, deviceId, deviceLabel } = req.body;
    const user = await User.findOne({ email, role: 'student' });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({
        message: 'Your acct has been suspended, kindly renew your subscription to continue enjoying the service. For assistance, contact support via WhatsApp below.'
      });
    }

    const normalizedDeviceId = normalizeDeviceId(deviceId);
    const trustedDevices = Array.isArray(user.trustedDevices) ? user.trustedDevices : [];
    const trustedDevice = normalizedDeviceId
      ? trustedDevices.find((entry) => entry && entry.deviceId === normalizedDeviceId)
      : null;

    if (normalizedDeviceId) {
      if (trustedDevice) {
        trustedDevice.lastUsedAt = new Date();
        if (!trustedDevice.label && normalizeDeviceLabel(deviceLabel)) {
          trustedDevice.label = normalizeDeviceLabel(deviceLabel);
        }
      } else {
        if (!Array.isArray(user.trustedDevices)) user.trustedDevices = [];
        user.trustedDevices.push({
          deviceId: normalizedDeviceId,
          label: normalizeDeviceLabel(deviceLabel) || 'Login Device',
          verifiedAt: new Date(),
          lastUsedAt: new Date()
        });
        if (user.trustedDevices.length > 25) {
          user.trustedDevices = user.trustedDevices
            .sort((a, b) => new Date(b.lastUsedAt || 0).getTime() - new Date(a.lastUsedAt || 0).getTime())
            .slice(0, 25);
        }
      }
      await user.save();
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

const verifyStudentFace = async (req, res) => {
  return res.status(410).json({ message: 'Face verification is disabled.' });
};

// @desc    Verify public test email against signed-up student account
// @route   POST /api/auth/student/verify-public-test-email
// @access  Public
const verifyPublicTestEmail = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const student = await User.findOne({
      role: 'student',
      email: exactRegex(email)
    }).select('_id name email');

    if (!student) {
      return res.status(404).json({ message: 'Email not found. Use the same email you used during signup.' });
    }

    return res.json({
      verified: true,
      email: student.email
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error', error: error.message });
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
      adminEmailVerified: true,
      adminVerificationCodeHash: undefined,
      adminVerificationExpire: undefined
    });

    if (role === 'superadmin') {
      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approved: user.approved,
        accessCode: user.accessCode,
        token: generateToken(user._id),
        message: 'Super admin account created successfully.'
      });
    }

    const accessCodeEmailResult = await sendAdminAccessCodeEmail({
      to: user.email,
      name: user.name,
      accessCode: user.accessCode
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      approved: user.approved,
      accessCodeSent: Boolean(accessCodeEmailResult?.sent),
      accessCodeSendReason: accessCodeEmailResult?.reason || null,
      message: accessCodeEmailResult?.sent
        ? 'Access code sent to your email. Account pending approval by super admin.'
        : 'Account created and pending approval. Email delivery failed, contact super admin for your access code.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password, accessCode, deviceId, deviceLabel } = req.body;
    const user = await User.findOne({ email, role: { $in: ['admin', 'superadmin'] } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
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

    upsertAdminDeviceLogin(user, req, deviceId, deviceLabel);
    await user.save();

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
  return res.status(410).json({
    message: 'Admin email verification is disabled. Await super admin approval and use your access code to login.'
  });
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
      return res.json({
        message: 'Reset email service is temporarily unavailable. Please contact support to reset your password.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetPath: `/admin/reset-password/${resetToken}`,
      accountLabel: 'admin account'
    });

    if (!emailResult.sent) {
      return res.json({
        message: 'We could not deliver reset email right now. Please contact support for password reset assistance.',
        reason: emailResult?.reason || 'send_failed'
      });
    }

    return res.json({ message: 'Password reset link sent to your email.' });
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
    const hashedToken = crypto.createHash('sha256').update(String(token)).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: { $in: [String(token), hashedToken] },
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
  verifyStudentFace,
  verifyPublicTestEmail,
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
