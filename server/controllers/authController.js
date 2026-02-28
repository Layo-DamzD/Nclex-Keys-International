const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
  sendPasswordResetOtpEmail,
  sendAdminSignupVerificationEmail,
  isEmailConfigured
} = require('../services/emailService');
const {
  createPersonFromFace,
  searchFaceMatches,
  detectLiveness,
  evaluateFaceMatch,
  isLuxandConfigured
} = require('../services/luxandService');

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
const SIGNUP_ACCESS_HELP_NUMBER = '07037367480';
const LUXAND_STUDENT_COLLECTION = process.env.LUXAND_STUDENT_COLLECTION || 'students';
const FACE_MATCH_MIN_SCORE = Number.isFinite(Number(process.env.LUXAND_FACE_MATCH_MIN_SCORE))
  ? Number(process.env.LUXAND_FACE_MATCH_MIN_SCORE)
  : 0.78;
const LIVENESS_MIN_SCORE = Number.isFinite(Number(process.env.LUXAND_LIVENESS_MIN_SCORE))
  ? Number(process.env.LUXAND_LIVENESS_MIN_SCORE)
  : 0.75;

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
    const { name, email, password, program, phone, examDate, deviceId, deviceLabel, accessCode, faceCapture } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    if (String(accessCode || '').trim() !== STUDENT_SIGNUP_ACCESS_CODE) {
      return res.status(403).json({
        message: `Invalid access code. Message ${SIGNUP_ACCESS_HELP_NUMBER} on WhatsApp to get your access code.`
      });
    }

    const facePayload = String(faceCapture || '');
    const looksLikeImage = facePayload.startsWith('data:image/') && facePayload.length > 500;
    if (!looksLikeImage) {
      return res.status(400).json({ message: 'Face verification is required before signup.' });
    }

    if (!isLuxandConfigured()) {
      return res.status(503).json({
        message: 'Face verification service is unavailable. Try again shortly or contact support.'
      });
    }

    const normalizedDeviceId = normalizeDeviceId(deviceId);
    if (!normalizedDeviceId) {
      return res.status(400).json({ message: 'Device verification failed. Refresh and try again.' });
    }

    let luxandPersonId = '';
    try {
      const liveness = await detectLiveness({ faceCapture: facePayload });
      const livenessScore = Number.isFinite(Number(liveness.score)) ? Number(liveness.score) : null;
      const livenessThreshold = LIVENESS_MIN_SCORE <= 1 ? LIVENESS_MIN_SCORE : LIVENESS_MIN_SCORE / 100;
      const livenessPassed = liveness.isLive && (livenessScore == null || livenessScore >= livenessThreshold);
      if (!livenessPassed) {
        return res.status(401).json({
          message: 'Liveness check failed. Please capture a live selfie and try again.'
        });
      }

      const enrollment = await createPersonFromFace({
        name,
        faceCapture: facePayload,
        collection: LUXAND_STUDENT_COLLECTION
      });
      luxandPersonId = enrollment.personId;
    } catch (luxandError) {
      console.error('Luxand signup enrollment failed:', luxandError?.message || luxandError);
      return res.status(502).json({
        message: 'Face verification enrollment failed. Please retake your selfie and try again.'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'student',
      program,
      phone,
      examDate: examDate || null,
      faceVerificationProvider: 'luxand',
      luxandPersonId,
      faceEnrolledAt: new Date(),
      trustedDevices: [{
        deviceId: normalizedDeviceId,
        label: normalizeDeviceLabel(deviceLabel) || 'Signup Device',
        verifiedAt: new Date(),
        lastUsedAt: new Date()
      }]
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

    if (normalizedDeviceId && !trustedDevice) {
      const verificationToken = jwt.sign(
        {
          id: user._id,
          purpose: 'student_device_face_verify',
          deviceId: normalizedDeviceId
        },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
      );

      return res.status(202).json({
        requiresFaceVerification: true,
        verificationToken,
        message: 'New device detected. Complete face verification to continue.'
      });
    }

    if (trustedDevice) {
      trustedDevice.lastUsedAt = new Date();
      if (!trustedDevice.label && normalizeDeviceLabel(deviceLabel)) {
        trustedDevice.label = normalizeDeviceLabel(deviceLabel);
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
  try {
    const { verificationToken, faceCapture, deviceId, deviceLabel } = req.body;
    if (!verificationToken || !faceCapture || !deviceId) {
      return res.status(400).json({ message: 'Verification token, device id and face capture are required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(String(verificationToken), process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: 'Verification token is invalid or expired.' });
    }

    if (decoded?.purpose !== 'student_device_face_verify' || !decoded?.id || !decoded?.deviceId) {
      return res.status(401).json({ message: 'Invalid verification context.' });
    }

    const normalizedDeviceId = normalizeDeviceId(deviceId);
    if (!normalizedDeviceId || normalizedDeviceId !== decoded.deviceId) {
      return res.status(401).json({ message: 'Device verification mismatch. Please log in again.' });
    }

    const facePayload = String(faceCapture || '');
    const looksLikeImage = facePayload.startsWith('data:image/') && facePayload.length > 500;
    if (!looksLikeImage) {
      return res.status(400).json({ message: 'Invalid face capture. Please retake and try again.' });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.role !== 'student') {
      return res.status(404).json({ message: 'Student account not found.' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({
        message: 'Your acct has been suspended, kindly renew your subscription to continue enjoying the service. For assistance, contact support via WhatsApp below.'
      });
    }

    if (!isLuxandConfigured()) {
      return res.status(503).json({
        message: 'Face verification service is unavailable. Please try again shortly.'
      });
    }

    if (!String(user.luxandPersonId || '').trim()) {
      return res.status(403).json({
        message: 'This account has no enrolled face profile yet. Contact support to re-enroll.'
      });
    }

    let verification = { matched: false, score: null, reason: 'unknown' };
    try {
      const liveness = await detectLiveness({ faceCapture: facePayload });
      const livenessScore = Number.isFinite(Number(liveness.score)) ? Number(liveness.score) : null;
      const livenessThreshold = LIVENESS_MIN_SCORE <= 1 ? LIVENESS_MIN_SCORE : LIVENESS_MIN_SCORE / 100;
      const livenessPassed = liveness.isLive && (livenessScore == null || livenessScore >= livenessThreshold);
      if (!livenessPassed) {
        return res.status(401).json({
          message: 'Liveness check failed. Please use a live selfie to verify this device.'
        });
      }

      const search = await searchFaceMatches({ faceCapture: facePayload, limit: 5 });
      verification = evaluateFaceMatch({
        expectedPersonId: user.luxandPersonId,
        matches: search.matches,
        minScore: FACE_MATCH_MIN_SCORE
      });
    } catch (luxandError) {
      console.error('Luxand face verification failed:', luxandError?.message || luxandError);
      return res.status(502).json({
        message: 'Face verification failed due to network error. Please try again.'
      });
    }

    if (!verification.matched) {
      return res.status(401).json({
        message: 'Face does not match this account profile. Access denied on this device.'
      });
    }

    const now = new Date();
    const label = normalizeDeviceLabel(deviceLabel) || 'Unknown Device';
    if (!Array.isArray(user.trustedDevices)) user.trustedDevices = [];

    const existingDevice = user.trustedDevices.find((entry) => entry && entry.deviceId === normalizedDeviceId);
    if (existingDevice) {
      existingDevice.label = existingDevice.label || label;
      existingDevice.verifiedAt = now;
      existingDevice.lastUsedAt = now;
    } else {
      user.trustedDevices.push({
        deviceId: normalizedDeviceId,
        label,
        verifiedAt: now,
        lastUsedAt: now
      });
      if (user.trustedDevices.length > 25) {
        user.trustedDevices = user.trustedDevices
          .sort((a, b) => new Date(b.lastUsedAt || 0).getTime() - new Date(a.lastUsedAt || 0).getTime())
          .slice(0, 25);
      }
    }

    await user.save();

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      examDate: user.examDate,
      token: generateToken(user._id)
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
      const isExistingAdmin = ['admin', 'superadmin'].includes(existingUser.role);
      const canResendVerification =
        isExistingAdmin &&
        existingUser.role === 'admin' &&
        !existingUser.adminEmailVerified;

      if (canResendVerification) {
        if (!isEmailConfigured()) {
          return res.status(503).json({
            message: 'Email service is not configured. Cannot resend admin verification code.'
          });
        }

        if (!existingUser.accessCode) {
          existingUser.accessCode = Math.floor(100000 + Math.random() * 900000).toString();
        }

        const verificationCode = await saveAdminVerificationCode(existingUser);
        const emailResult = await sendAdminSignupVerificationEmail({
          to: existingUser.email,
          name: existingUser.name,
          verificationCode,
          accessCode: existingUser.accessCode
        });

        if (!emailResult.sent) {
          return res.status(502).json({
            message: 'Failed to send verification code. Please check SMTP settings and try again.',
            reason: emailResult.reason || 'unknown',
            error: emailResult.error || undefined
          });
        }

        return res.status(200).json({
          email: existingUser.email,
          accessCode: existingUser.accessCode,
          role: existingUser.role,
          message: 'Account already exists but not verified. New verification code sent to your email.',
          requiresVerification: true
        });
      }

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
      adminEmailVerified: role === 'superadmin'
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
      return res.status(502).json({
        message: 'Failed to send verification code. Please check SMTP settings and try again.',
        reason: emailResult.reason || 'unknown',
        error: emailResult.error || undefined
      });
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
    const { email, password, accessCode, deviceId, deviceLabel } = req.body;
    const user = await User.findOne({ email, role: { $in: ['admin', 'superadmin'] } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // Super admin should not be blocked by signup-email verification.
    if (user.role === 'superadmin' && !user.adminEmailVerified) {
      user.adminEmailVerified = true;
      await user.save();
    }
    // Legacy approved admins created before verification flow should not be blocked.
    if (
      user.role === 'admin' &&
      !user.adminEmailVerified &&
      user.approved === true &&
      user.accessCode &&
      !user.adminVerificationCodeHash
    ) {
      user.adminEmailVerified = true;
      await user.save();
    }
    if (user.role === 'admin' && !user.adminEmailVerified) {
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
  verifyStudentFace,
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
