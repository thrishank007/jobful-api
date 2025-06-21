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

/**
 * Service for handling email operations
 */
class MailService {
  /**
   * Send a generic email
   * 
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text content (optional if html is provided)
   * @param {string} options.html - HTML content (optional if text is provided)
   * @returns {Promise<Object>} Success status and message
   */
  async sendMail(options) {
    const mailOptions = {
      from: `"Notify" <${process.env.EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      text: options.text || '',
    };

    // If HTML content is provided, add it to the mail options
    if (options.html) {
      mailOptions.html = options.html;
    } else if (options.text) {
      // Convert markdown to HTML if only text is provided
      mailOptions.html = this.markdownToHtml(options.text);
    }

    try {
      await transporter.sendMail(mailOptions);
      return {
        success: true,
        message: "Email sent successfully!",
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        message: "Failed to send email",
        error: error.message
      };
    }
  }

  /**
   * Send a job notification email
   * 
   * @param {string} to - Recipient email address
   * @param {string} content - Email content in markdown format
   * @returns {Promise<Object>} Success status and message
   */
  async sendJobNotification(to, content) {
    return this.sendMail({
      to,
      subject: 'New Job Notifications Available',
      text: content,
      html: this.markdownToHtml(content)
    });
  }
  
  /**
   * Simple conversion of markdown to HTML for email
   * 
   * @param {string} markdown - Markdown formatted text
   * @returns {string} HTML formatted text
   */
  markdownToHtml(markdown) {
    if (!markdown) return '';
    
    // Basic markdown to HTML conversion
    return markdown
      // Headers
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      
      // Italics
      .replace(/\_(.+?)\_/g, '<em>$1</em>')
      
      // Links
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      
      // Lists
      .replace(/^\- (.+)$/gm, '<li>$1</li>')
      
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      
      // Line breaks
      .replace(/\n/g, '<br>');
  }
  
  /**
   * Send password reset email
   * 
   * @param {string} toEmail - Recipient email address
   * @param {string} resetCode - Reset verification code
   * @param {string} fullName - User's full name
   * @returns {Promise<Object>} Success status and message
   */
  async sendResetEmail(toEmail, resetCode, fullName) {
    const mailOptions = {
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
          }
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
            <p>Dear ${fullName},</p>
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

    return this.sendMail(mailOptions);
  }
}

// Export singleton instance
const mailService = new MailService();

module.exports = { mailService };