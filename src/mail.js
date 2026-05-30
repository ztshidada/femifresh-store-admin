const nodemailer = require('nodemailer');
const { read, write } = require('./db');

function logEmail(entry) {
  const logs = read('emailLogs', []);
  logs.unshift({ id: Date.now().toString(), createdAt: new Date().toISOString(), ...entry });
  write('emailLogs', logs.slice(0, 500));
}

async function sendMail({ to, subject, html, text }) {
  if (!to) return { skipped: true, reason: 'No recipient' };
  const hasSmtp = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!hasSmtp) {
    logEmail({ to, subject, status: 'logged_only', html, text });
    return { loggedOnly: true };
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  const info = await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html, text });
  logEmail({ to, subject, status: 'sent', messageId: info.messageId });
  return info;
}

module.exports = { sendMail, logEmail };
