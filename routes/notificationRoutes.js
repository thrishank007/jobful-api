const express = require('express');
const router = express.Router();
const User = require('../models/User');
const firebaseService = require('../services/firebaseService');
const { protect } = require('../middleware/authMiddleware');
const { validate, schemas, sanitize, errorResponse } = require('../utils/validation');
const { notificationLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting to all notification routes
router.use(notificationLimiter);

// Register FCM token for push notifications
router.post('/fcm-token', protect, validate(schemas.fcmToken), async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;
    
    // Additional FCM token validation
    if (!token || typeof token !== 'string' || token.length < 100 || token.length > 200) {
      return errorResponse(res, 400, 'Invalid FCM token format');
    }

    // Sanitize token
    const sanitizedToken = sanitize.html(token);
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { fcmTokens: sanitizedToken } }, // Use $addToSet to avoid duplicates
      { new: true }
    ).select('fcmTokens');
    
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }
    
    res.json({ 
      success: true, 
      message: 'FCM token registered successfully', 
      tokenCount: user.fcmTokens.length 
    });
  } catch (error) {
    console.error('FCM token registration error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
});

// Remove FCM token
router.delete('/fcm-token', protect, validate(schemas.fcmToken), async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;
    
    // Sanitize token
    const sanitizedToken = sanitize.html(token);
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { fcmTokens: sanitizedToken } },
      { new: true }
    ).select('fcmTokens');
    
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }
    
    res.json({ 
      success: true, 
      message: 'FCM token removed successfully', 
      tokenCount: user.fcmTokens.length 
    });
  } catch (error) {
    console.error('FCM token removal error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
});

// Update notification settings
router.patch('/notification-settings', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, push } = req.body;
    
    const updateData = {};
    if (typeof email === 'boolean') updateData['notificationSettings.email'] = email;
    if (typeof push === 'boolean') updateData['notificationSettings.push'] = push;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('notificationSettings');
    
    res.json({ success: true, notificationSettings: user.notificationSettings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get notification settings
router.get('/notification-settings', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('notificationSettings');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, notificationSettings: user.notificationSettings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Subscribe to category topic (for Firebase topics)
router.post('/subscribe-topic/:category', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.params;
    
    const user = await User.findById(userId).select('fcmTokens');
    if (!user || !user.fcmTokens.length) {
      return res.status(400).json({ success: false, message: 'No FCM tokens found for user' });
    }
    
    const result = await firebaseService.subscribeToTopic(user.fcmTokens, category);
    res.json({ success: result.success, message: `Subscribed to ${category} topic`, result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Unsubscribe from category topic
router.post('/unsubscribe-topic/:category', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.params;
    
    const user = await User.findById(userId).select('fcmTokens');
    if (!user || !user.fcmTokens.length) {
      return res.status(400).json({ success: false, message: 'No FCM tokens found for user' });
    }
    
    const result = await firebaseService.unsubscribeFromTopic(user.fcmTokens, category);
    res.json({ success: result.success, message: `Unsubscribed from ${category} topic`, result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Send test notification (for testing purposes)
router.post('/test-notification', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('fcmTokens email');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Test push notification
    if (user.fcmTokens.length > 0) {
      const notification = {
        title: 'Test Notification',
        body: 'This is a test notification from Notify app',
      };
      
      const pushResult = await firebaseService.sendPushNotification(user.fcmTokens, notification, { type: 'test' });
      return res.json({ success: true, message: 'Test notification sent', pushResult });
    }
    
    res.json({ success: false, message: 'No FCM tokens found for user' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
