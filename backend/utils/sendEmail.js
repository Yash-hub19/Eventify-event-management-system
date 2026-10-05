const nodemailer = require('nodemailer');

// If SMTP credentials aren't set, we just log the email to console (dev-friendly fallback)
const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('--- EMAIL (SMTP not configured, logging instead) ---');
    console.log(`To: ${to}\nSubject: ${subject}\n${html}`);
    console.log('-----------------------------------------------------');
    return { simulated: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
