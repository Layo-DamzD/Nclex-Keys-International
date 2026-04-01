let nodemailer = null;

try {
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null;
}

let cachedTransporter = null;

const normalizeBaseUrl = (value) => {
  const raw = (value || '').trim();
  if (!raw) return '';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
};

const getClientBaseUrl = () => {
  return (
    normalizeBaseUrl(process.env.FRONTEND_URL) ||
    normalizeBaseUrl(process.env.CLIENT_URL) ||
    normalizeBaseUrl(process.env.APP_URL) ||
    'http://localhost:5173'
  );
};

const getMailFrom = () => {
  return process.env.MAIL_FROM || process.env.SMTP_USER || null;
};

const isEmailConfigured = () => {
  if (!nodemailer) return false;

  const hasService = Boolean(process.env.SMTP_SERVICE);
  const hasHost = Boolean(process.env.SMTP_HOST);
  const hasAuth = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  const hasFrom = Boolean(getMailFrom());

  return hasFrom && hasAuth && (hasService || hasHost);
};

const createTransporter = () => {
  if (!nodemailer || !isEmailConfigured()) return null;

  if (cachedTransporter) {
    return cachedTransporter;
  }

  const auth = {
    user: process.env.SMTP_USER,
    pass: String(process.env.SMTP_PASS || '').replace(/\s+/g, '')
  };

  if (process.env.SMTP_SERVICE) {
    cachedTransporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE,
      auth
    });
    return cachedTransporter;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    typeof process.env.SMTP_SECURE === 'string'
      ? process.env.SMTP_SECURE.toLowerCase() === 'true'
      : port === 465;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth
  });

  return cachedTransporter;
};

const buildResetUrl = (path) => {
  const safePath = String(path || '').startsWith('/') ? path : `/${path || ''}`;
  return `${getClientBaseUrl()}${safePath}`;
};

const sendPasswordResetEmail = async ({
  to,
  name,
  resetPath,
  accountLabel = 'account'
}) => {
  if (!isEmailConfigured()) {
    return { sent: false, reason: 'not_configured', resetUrl: buildResetUrl(resetPath) };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return { sent: false, reason: 'transporter_unavailable', resetUrl: buildResetUrl(resetPath) };
  }

  const resetUrl = buildResetUrl(resetPath);
  const displayName = name || 'there';
  const subject = `NCLEX KEYS International - ${accountLabel} password reset`;
  const text = [
    `Hello ${displayName},`,
    '',
    `We received a request to reset your ${accountLabel} password.`,
    'Use the link below to reset it (valid for 5 minutes):',
    resetUrl,
    '',
    'If you did not request this, please ignore this email.',
    '',
    'NCLEX KEYS International'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 12px;color:#1d4ed8;">NCLEX KEYS International</h2>
      <p>Hello ${displayName},</p>
      <p>We received a request to reset your <strong>${accountLabel}</strong> password.</p>
      <p>This link expires in <strong>5 minutes</strong>.</p>
      <p style="margin:20px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;">
          Reset Password
        </a>
      </p>
      <p style="word-break:break-all;color:#4b5563;">If the button does not work, copy and paste this link:<br>${resetUrl}</p>
      <p>If you did not request this, you can ignore this email.</p>
      <p style="margin-top:24px;">NCLEX KEYS International</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: getMailFrom(),
      to,
      subject,
      text,
      html
    });
    return { sent: true, resetUrl };
  } catch (error) {
    return {
      sent: false,
      reason: 'send_failed',
      error: error?.message || 'Unknown email error',
      resetUrl
    };
  }
};

const sendPasswordResetOtpEmail = async ({
  to,
  name,
  otp,
  accountLabel = 'account'
}) => {
  if (!isEmailConfigured()) {
    return { sent: false, reason: 'not_configured' };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return { sent: false, reason: 'transporter_unavailable' };
  }

  const displayName = name || 'there';
  const subject = `NCLEX KEYS International - ${accountLabel} reset OTP`;
  const text = [
    `Hello ${displayName},`,
    '',
    `Use this OTP to reset your ${accountLabel} password: ${otp}`,
    'This OTP expires in 10 minutes.',
    '',
    'If you did not request this, please ignore this email.',
    '',
    'NCLEX KEYS International'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 12px;color:#1d4ed8;">NCLEX KEYS International</h2>
      <p>Hello ${displayName},</p>
      <p>Use this OTP to reset your <strong>${accountLabel}</strong> password:</p>
      <div style="display:inline-block;font-size:28px;letter-spacing:6px;font-weight:700;background:#eef2ff;color:#1d4ed8;padding:12px 16px;border-radius:8px;">
        ${otp}
      </div>
      <p style="margin-top:16px;">This OTP expires in <strong>10 minutes</strong>.</p>
      <p>If you did not request this, you can ignore this email.</p>
      <p style="margin-top:24px;">NCLEX KEYS International</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: getMailFrom(),
      to,
      subject,
      text,
      html
    });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: 'send_failed',
      error: error?.message || 'Unknown email error'
    };
  }
};

const sendAdminSignupVerificationEmail = async ({
  to,
  name,
  verificationCode,
  accessCode
}) => {
  if (!isEmailConfigured()) {
    return { sent: false, reason: 'not_configured' };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return { sent: false, reason: 'transporter_unavailable' };
  }

  const displayName = name || 'there';
  const subject = 'NCLEX KEYS International - Admin signup verification';
  const text = [
    `Hello ${displayName},`,
    '',
    'Use this verification code to complete your admin signup:',
    verificationCode,
    '',
    accessCode
      ? `Your permanent access code: ${accessCode}`
      : 'Your account does not require an access code.',
    '',
    'Verification code expires in 10 minutes.',
    '',
    'NCLEX KEYS International'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 12px;color:#1d4ed8;">NCLEX KEYS International</h2>
      <p>Hello ${displayName},</p>
      <p>Use this verification code to complete your admin signup:</p>
      <div style="display:inline-block;font-size:28px;letter-spacing:6px;font-weight:700;background:#eef2ff;color:#1d4ed8;padding:12px 16px;border-radius:8px;">
        ${verificationCode}
      </div>
      <p style="margin-top:16px;">
        ${accessCode ? `Your permanent access code: <strong>${accessCode}</strong>` : 'Your account does not require an access code.'}
      </p>
      <p>Verification code expires in <strong>10 minutes</strong>.</p>
      <p style="margin-top:24px;">NCLEX KEYS International</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: getMailFrom(),
      to,
      subject,
      text,
      html
    });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: 'send_failed',
      error: error?.message || 'Unknown email error'
    };
  }
};

const sendAdminAccessCodeEmail = async ({
  to,
  name,
  accessCode
}) => {
  if (!isEmailConfigured()) {
    return { sent: false, reason: 'not_configured' };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return { sent: false, reason: 'transporter_unavailable' };
  }

  const displayName = name || 'there';
  const subject = 'NCLEX KEYS International - Your admin access code';
  const text = [
    `Hello ${displayName},`,
    '',
    'Your admin account was created successfully.',
    `Your permanent admin access code is: ${accessCode || 'N/A'}`,
    '',
    'Keep this code private. You will need it during admin login after approval.',
    '',
    'NCLEX KEYS International'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 12px;color:#1d4ed8;">NCLEX KEYS International</h2>
      <p>Hello ${displayName},</p>
      <p>Your admin account was created successfully.</p>
      <p>Your permanent admin access code is:</p>
      <div style="display:inline-block;font-size:28px;letter-spacing:6px;font-weight:700;background:#eef2ff;color:#1d4ed8;padding:12px 16px;border-radius:8px;">
        ${accessCode || 'N/A'}
      </div>
      <p style="margin-top:16px;">Keep this code private. You will need it during admin login after approval.</p>
      <p style="margin-top:24px;">NCLEX KEYS International</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: getMailFrom(),
      to,
      subject,
      text,
      html
    });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: 'send_failed',
      error: error?.message || 'Unknown email error'
    };
  }
};


const sendExamSupportUsageEmail = async ({
  to = 'nclexkeysintl.academy@gmail.com',
  studentName,
  studentEmail,
  sessionId,
  message
}) => {
  if (!isEmailConfigured()) {
    return { sent: false, reason: 'not_configured' };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return { sent: false, reason: 'transporter_unavailable' };
  }

  const subject = `NCLEX KEYS International - Exam Support Alert (${studentName || 'Student'})`;
  const text = [
    'A student has started using exam support.',
    '',
    `Student: ${studentName || 'Unknown'}`,
    `Email: ${studentEmail || 'Unknown'}`,
    `Session ID: ${sessionId || 'Unknown'}`,
    `First message: ${message || ''}`
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:640px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 12px;color:#1d4ed8;">NCLEX KEYS International</h2>
      <p style="margin:0 0 12px;">A student has started using exam support.</p>
      <table cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <tr><td style="font-weight:700;width:160px;">Student</td><td>${studentName || 'Unknown'}</td></tr>
        <tr><td style="font-weight:700;">Email</td><td>${studentEmail || 'Unknown'}</td></tr>
        <tr><td style="font-weight:700;">Session</td><td>${sessionId || 'Unknown'}</td></tr>
        <tr><td style="font-weight:700;">First Message</td><td>${message || ''}</td></tr>
      </table>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: getMailFrom(),
      to,
      subject,
      text,
      html
    });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: 'send_failed',
      error: error?.message || 'Unknown email error'
    };
  }
};

const sendPublicTestLeadEmail = async ({
  to = process.env.PUBLIC_TEST_LEAD_TO || 'nclexkeysintl.academy@gmail.com',
  name,
  email,
  ip = 'Unknown',
  location = 'Unknown'
}) => {
  if (!isEmailConfigured()) {
    return { sent: false, reason: 'not_configured' };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return { sent: false, reason: 'transporter_unavailable' };
  }

  const subject = `NCLEX KEYS International - Public Test Lead (${name || 'Unknown'})`;
  const text = [
    'New public test submission received.',
    '',
    `Name: ${name || 'Unknown'}`,
    `Email: ${email || 'Unknown'}`,
    `IP: ${ip || 'Unknown'}`,
    `Location: ${location || 'Unknown'}`
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:640px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 12px;color:#1d4ed8;">NCLEX KEYS International</h2>
      <p style="margin:0 0 12px;">New public test submission received.</p>
      <table cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <tr><td style="font-weight:700;width:160px;">Name</td><td>${name || 'Unknown'}</td></tr>
        <tr><td style="font-weight:700;">Email</td><td>${email || 'Unknown'}</td></tr>
        <tr><td style="font-weight:700;">IP Address</td><td>${ip || 'Unknown'}</td></tr>
        <tr><td style="font-weight:700;">Location</td><td>${location || 'Unknown'}</td></tr>
      </table>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: getMailFrom(),
      to,
      subject,
      text,
      html
    });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: 'send_failed',
      error: error?.message || 'Unknown email error'
    };
  }
};

// Welcome email for new students
const sendStudentWelcomeEmail = async ({
  to,
  name,
  isSelfSignup = false
}) => {
  if (!isEmailConfigured()) {
    return { sent: false, reason: 'not_configured' };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return { sent: false, reason: 'transporter_unavailable' };
  }

  const displayName = name || 'there';
  const subject = 'Welcome to NCLEX KEYS International - Your Journey Starts Here!';
  const text = [
    `Hello ${displayName},`,
    '',
    'Welcome to NCLEX KEYS International! We are thrilled to have you on board.',
    '',
    'Your NCLEX journey starts here. We are committed to supporting your success every step of the way.',
    '',
    'Here\'s what you can do next:',
    '1. Complete your profile setup',
    '2. Take a diagnostic test to assess your knowledge',
    '3. Explore our study materials and resources',
    '',
    'If you have any questions, our support team is here to help.',
    '',
    'Best regards,',
    'The NCLEX KEYS International Team'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 12px;color:#1d4ed8;">Welcome to NCLEX KEYS International! 🎉</h2>
      <p>Hello ${displayName},</p>
      <p>We are thrilled to have you on board. Your NCLEX journey starts here!</p>
      <p>We are committed to supporting your success every step of the way.</p>
      <h3 style="margin-top:24px;color:#111827;">Here's what you can do next:</h3>
      <ol style="margin:12px 0;padding-left:24px;">
        <li style="margin:8px 0;">Complete your profile setup</li>
        <li style="margin:8px 0;">Take a diagnostic test to assess your knowledge</li>
        <li style="margin:8px 0;">Explore our study materials and resources</li>
      </ol>
      <p style="margin-top:20px;">If you have any questions, our support team is here to help.</p>
      <p style="margin-top:24px;color:#6b7280;">Best regards,<br>The NCLEX KEYS International Team</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: getMailFrom(),
      to,
      subject,
      text,
      html
    });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: 'send_failed',
      error: error?.message || 'Unknown email error'
    };
  }
};

// OTP verification email for student self-signup
const sendStudentOtpEmail = async ({
  to,
  name,
  otp
}) => {
  if (!isEmailConfigured()) {
    return { sent: false, reason: 'not_configured' };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return { sent: false, reason: 'transporter_unavailable' };
  }

  const displayName = name || 'there';
  const subject = 'NCLEX KEYS International - Verify Your Email';
  const text = [
    `Hello ${displayName},`,
    '',
    'Thank you for signing up with NCLEX KEYS International!',
    '',
    `Your email verification code is: ${otp}`,
    '',
    'This code expires in 10 minutes.',
    '',
    'If you did not create an account, please ignore this email.',
    '',
    'Best regards,',
    'The NCLEX KEYS International Team'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 12px;color:#1d4ed8;">NCLEX KEYS International</h2>
      <p>Hello ${displayName},</p>
      <p>Thank you for signing up with NCLEX KEYS International!</p>
      <p>Please verify your email address using the code below:</p>
      <div style="display:inline-block;font-size:28px;letter-spacing:6px;font-weight:700;background:#eef2ff;color:#1d4ed8;padding:12px 16px;border-radius:8px;margin:16px 0;">
        ${otp}
      </div>
      <p style="margin-top:16px;">This code expires in <strong>10 minutes</strong>.</p>
      <p style="color:#6b7280;">If you did not create an account, please ignore this email.</p>
      <p style="margin-top:24px;color:#6b7280;">Best regards,<br>The NCLEX KEYS International Team</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: getMailFrom(),
      to,
      subject,
      text,
      html
    });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: 'send_failed',
      error: error?.message || 'Unknown email error'
    };
  }
};

// Email notification when admin assigns a test to a student
const sendTestAssignmentEmail = async ({
  to,
  studentName,
  testTitle,
  duration,
  proctored = false,
  adminName = 'Your Tutor'
}) => {
  if (!isEmailConfigured()) {
    return { sent: false, reason: 'not_configured' };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return { sent: false, reason: 'transporter_unavailable' };
  }

  const displayName = studentName || 'there';
  const subject = `NCLEX KEYS International - New Test Assigned: ${testTitle}`;
  const proctoringTextBlock = proctored ? [
    '',
    '⚠️  PROCTORED EXAM — IMPORTANT RULES:',
    '',
    '• You must allow camera and microphone access before starting.',
    '• You must remain in fullscreen mode for the entire test.',
    '• Do NOT switch tabs, minimize the window, or leave the test.',
    '• Your webcam will take periodic snapshots during the exam.',
    '• 3 violations will result in AUTOMATIC SUBMISSION of your test.',
    '',
    'Violations include:',
    '  1. Switching to another tab or minimizing the browser',
    '  2. Clicking away from the test window',
    '  3. Exiting fullscreen mode',
    '',
    'Make sure you are in a quiet, well-lit room with no distractions before starting.',
    ''
  ] : [];

  const text = [
    `Hello ${displayName},`,
    '',
    `${adminName} has assigned a new test to you.`,
    '',
    `Test: ${testTitle}`,
    `Duration: ${duration} minutes`,
    ...proctoringTextBlock,
    'Log in to your account to take the test when you are ready.',
    '',
    'Good luck!',
    '',
    'NCLEX KEYS International'
  ].join('\n');

  const baseUrl = getClientBaseUrl();

  const proctoringHtmlBlock = proctored ? `
      <div style="margin:20px 0;padding:20px;background:#fef2f2;border:2px solid #dc2626;border-radius:10px;">
        <h3 style="margin:0 0 12px;color:#dc2626;font-size:16px;">⚠️ PROCTORED EXAM — IMPORTANT RULES</h3>
        <ul style="margin:0 0 16px;padding-left:20px;color:#374151;line-height:1.8;">
          <li>You must allow <strong>camera and microphone</strong> access before starting.</li>
          <li>You must remain in <strong>fullscreen mode</strong> for the entire test.</li>
          <li>Do <strong>NOT</strong> switch tabs, minimize the window, or leave the test.</li>
          <li>Your webcam will take <strong>periodic snapshots</strong> during the exam.</li>
          <li><strong style="color:#dc2626;">3 violations = automatic submission</strong> of your test.</li>
        </ul>
        <div style="background:#fff;border:1px solid #fca5a5;border-radius:8px;padding:14px;">
          <p style="margin:0 0 8px;font-weight:700;color:#991b1b;font-size:14px;">What counts as a violation:</p>
          <ol style="margin:0;padding-left:20px;color:#374151;line-height:2;font-size:14px;">
            <li>Switching to another tab or minimizing the browser</li>
            <li>Clicking away from the test window</li>
            <li>Exiting fullscreen mode (pressing Escape, etc.)</li>
          </ol>
        </div>
        <p style="margin:14px 0 0;color:#991b1b;font-size:14px;">
          📸 Make sure you are in a <strong>quiet, well-lit room</strong> with no distractions before starting.
        </p>
      </div>
  ` : '';

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 12px;color:#1d4ed8;">NCLEX KEYS International</h2>
      <p>Hello ${displayName},</p>
      <p><strong>${adminName}</strong> has assigned a new test to you:</p>
      <table cellpadding="10" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;">
        <tr>
          <td style="font-weight:700;width:140px;border-bottom:1px solid #e5e7eb;">Test</td>
          <td style="border-bottom:1px solid #e5e7eb;">${testTitle}</td>
        </tr>
        <tr>
          <td style="font-weight:700;">Duration</td>
          <td>${duration} minutes</td>
        </tr>
        ${proctored ? `<tr><td style="font-weight:700;">Proctored</td><td style="color:#dc2626;font-weight:600;">Yes — camera &amp; mic required</td></tr>` : ''}
      </table>
      ${proctoringHtmlBlock}
      <p style="margin:20px 0;">
        <a href="${baseUrl}/login" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
          Log In to Take Test
        </a>
      </p>
      <p style="color:#6b7280;">If the button does not work, go to: ${baseUrl}/login</p>
      <p style="margin-top:20px;">Good luck with your test!</p>
      <p style="margin-top:24px;color:#6b7280;">Best regards,<br>The NCLEX KEYS International Team</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: getMailFrom(),
      to,
      subject,
      text,
      html
    });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: 'send_failed',
      error: error?.message || 'Unknown email error'
    };
  }
};

module.exports = {
  isEmailConfigured,
  sendPasswordResetEmail,
  sendPasswordResetOtpEmail,
  sendAdminSignupVerificationEmail,
  sendAdminAccessCodeEmail,
  sendPublicTestLeadEmail,
  sendExamSupportUsageEmail,
  buildResetUrl,
  sendStudentWelcomeEmail,
  sendStudentOtpEmail,
  sendTestAssignmentEmail
};
