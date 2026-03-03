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
    pass: process.env.SMTP_PASS
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
    'Use the link below to reset it (valid for 1 hour):',
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
      <p>This link expires in <strong>1 hour</strong>.</p>
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

  await transporter.sendMail({
    from: getMailFrom(),
    to,
    subject,
    text,
    html
  });

  return { sent: true, resetUrl };
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

  await transporter.sendMail({
    from: getMailFrom(),
    to,
    subject,
    text,
    html
  });

  return { sent: true };
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

module.exports = {
  isEmailConfigured,
  sendPasswordResetEmail,
  sendPasswordResetOtpEmail,
  sendAdminSignupVerificationEmail,
  sendAdminAccessCodeEmail,
  buildResetUrl
};
