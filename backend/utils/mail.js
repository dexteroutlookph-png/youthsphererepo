const nodemailer = require('nodemailer');

const hasMailConfiguration = () => Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASSWORD &&
  process.env.SMTP_FROM
);

const sendPasswordResetEmail = async ({ recipient, token }) => {
  if (!hasMailConfiguration()) return false;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
  });
  const frontendUrl = (process.env.FRONTEND_URL || process.env.CLIENT_URL || '').replace(/\/$/, '');
  if (!frontendUrl) throw new Error('FRONTEND_URL or CLIENT_URL must be configured for password reset links.');

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: recipient,
    subject: 'YouthSphere password reset',
    text: `Reset your YouthSphere password: ${frontendUrl}/reset-password?token=${encodeURIComponent(token)}\n\nThis link expires in one hour and can only be used once.`,
    html: `<p>Reset your YouthSphere password:</p><p><a href="${frontendUrl}/reset-password?token=${encodeURIComponent(token)}">Reset password</a></p><p>This link expires in one hour and can only be used once.</p>`
  });
  return true;
};

module.exports = { hasMailConfiguration, sendPasswordResetEmail };