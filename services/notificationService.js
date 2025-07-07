const { mailService } = require('./mailService');
const firebaseService = require('./firebaseService');
const User = require('../models/User');

class NotificationService {
  // Fetch users from MongoDB whose interests include the category
  async getUsersByInterest(category) {
    return User.find({ interests: category }).select('email _id fcmTokens notificationSettings').lean();
  }

  async sendJobNotifications(category, newJobs) {
    const users = await this.getUsersByInterest(category);
    if (!users || users.length === 0) return;
    
    // Send email notifications
    const emailPromises = users
      .filter(user => user.notificationSettings?.email !== false)
      .map(user => this.sendEmailNotification(user.email, category, newJobs));
    
    // Send push notifications
    const pushPromises = users
      .filter(user => user.notificationSettings?.push !== false && user.fcmTokens?.length > 0)
      .map(user => this.sendPushNotification(user.fcmTokens, category, newJobs));
    
    await Promise.allSettled([...emailPromises, ...pushPromises]);
  }

  async sendEmailNotification(email, category, newJobs) {
    try {
      const subject = `New Jobs in ${category}`;
      const body = this.formatEmailBody(category, newJobs);
      await mailService.sendJobNotification(email, body);
    } catch (error) {
      console.error(`Email notification failed for ${email}:`, error);
    }
  }

  async sendPushNotification(fcmTokens, category, newJobs) {
    try {
      const notification = {
        title: `New Jobs in ${category}`,
        body: `${newJobs.length} new job${newJobs.length > 1 ? 's' : ''} available in ${category}`,
        imageUrl: process.env.NOTIFICATION_ICON_URL || undefined
      };

      const data = {
        category: category,
        jobCount: newJobs.length.toString(),
        type: 'job_notification',
        jobs: JSON.stringify(newJobs.slice(0, 3)) // Send first 3 jobs in data
      };

      await firebaseService.sendPushNotification(fcmTokens, notification, data);
    } catch (error) {
      console.error(`Push notification failed:`, error);
    }
  }

  formatEmailBody(category, newJobs) {
    return `
# New Jobs Available in ${category}
${newJobs.map(job => `\n## ${job.postName}\n- **Board:** ${job.postBoard}\n- **Posted:** ${job.postDate}\n- **Last Date:** ${job.lastDate}\n- **Qualification:** ${job.qualification}\n- **Apply Online:** ${job.apply_online || 'N/A'}\n- **Details:** ${job.link || 'N/A'}\n`).join('')}
---\n*You're receiving this because you subscribed to ${category} job notifications.*
    `;
  }
}

module.exports = new NotificationService();
