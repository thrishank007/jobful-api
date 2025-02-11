const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // false for TLS - use port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendResetEmail = async (toEmail, resetCode) => {
  const mailOptions = {
    from: `"Notify Support" <${process.env.EMAIL_FROM}>`,
    to: toEmail,
    subject: 'Reset Your Password',
    html: `
      <h2>Password Reset</h2>
      <p>The One-time Code to reset your password: ${resetCode}</p>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn’t request this, you can ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return {
        success: true,
        message: "Verification code sent to email!",
      };
  } catch (error) {
    throw error;
  }
};

module.exports = { sendResetEmail };
