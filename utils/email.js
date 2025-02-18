const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, // false for TLS - use port 587
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
      <!DOCTYPE html>
<html>
<head>
  <title>Reset Your Password</title>
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #F9F9F9;
      margin: 0;
      padding: 0;
    }w
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      box-shadow: 0px 1px 5px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    .header {
      background: #7c3ade;
      color: white;
      text-align: center;
      padding: 20px;
      font-size: 24px;
      font-weight: bold;
    }
    .content {
      padding: 20px;
      font-size: 16px;
      color: #333;
    }
    .footer {
      text-align: center;
      font: italic 12px bold, sans-serif;
      padding: 10px;
      font-size: 12px;
      color: #666;
    }
    .footer img{
      display: block;
      margin: 0 auto;
    }
    .otp-box {
      font-size: 22px;
      font-weight: bold;
      background: #f3f3f3;
      padding: 15px;
      display: inline-block;
      border-radius: 6px;
      margin-top: 10px;
      text-align: center;
      letter-spacing: 2px;
    }
    .otp-box span {
      color: #7C3AED;
      text-shadow: 0px 0px 8px rgba(255, 255, 255, 0.8);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Password Reset OTP</div>
    <div class="content">
      <p>Dear [User Name],</p>
      <p>We received a request to reset your password for your Notify account.</p>
      <p>Please use the following One-Time Password (OTP) to reset your password:</p>
      <div class="otp-box"><span>${resetCode}</span></div>
      <p>This OTP is valid for 10 minutes.</p>
      <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
    </div>
    <div class="footer">
      <img src="https://i.postimg.cc/0QcSGb9X/logo20-removebg-preview.png" alt="Notify Logo" width="100"> 
      Sent by Notify Team | Contact: <a href="mailto:notify@blushy.dev">notify@blushy.dev</a>
    </div>
  </div>
</body>
</html>
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
