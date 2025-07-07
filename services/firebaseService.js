const admin = require('firebase-admin');

class FirebaseService {
  constructor() {
    this.initialized = false;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  initialize() {
    if (this.initialized) return;

    try {
      // Validate required environment variables
      const requiredVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_PRIVATE_KEY_ID',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_CLIENT_ID',
        'FIREBASE_CLIENT_CERT_URL'
      ];

      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      if (missingVars.length > 0) {
        throw new Error(`Missing Firebase environment variables: ${missingVars.join(', ')}`);
      }

      // Initialize Firebase Admin SDK
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
      };

      // Validate private key format
      if (!serviceAccount.private_key.includes('BEGIN PRIVATE KEY') || 
          !serviceAccount.private_key.includes('END PRIVATE KEY')) {
        throw new Error('Invalid Firebase private key format');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });

      this.initialized = true;
      console.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('❌ Firebase initialization error:', error.message);
      // Don't expose sensitive information in logs
      if (error.message.includes('private_key')) {
        console.error('❌ Private key validation failed - check environment variables');
      }
      throw error;
    }
  }

  async retryOperation(operation, retries = this.maxRetries) {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        console.log(`⏳ Retrying Firebase operation (${this.maxRetries - retries + 1}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.retryOperation(operation, retries - 1);
      }
      throw error;
    }
  }

  isRetryableError(error) {
    const retryableErrors = [
      'UNAVAILABLE',
      'DEADLINE_EXCEEDED',
      'INTERNAL',
      'RESOURCE_EXHAUSTED'
    ];
    return retryableErrors.some(code => error.code === code || error.message.includes(code));
  }

  async sendPushNotification(tokens, notification, data = {}) {
    if (!this.initialized) {
      this.initialize();
    }

    if (!tokens || tokens.length === 0) {
      console.log('⚠️ No FCM tokens provided');
      return { success: false, error: 'No tokens provided' };
    }

    // Validate notification object
    if (!notification || !notification.title || !notification.body) {
      return { success: false, error: 'Invalid notification object' };
    }

    // Ensure tokens is an array and validate tokens
    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
    const validTokens = tokenArray.filter(token => 
      typeof token === 'string' && token.length > 50 && token.length < 200
    );

    if (validTokens.length === 0) {
      return { success: false, error: 'No valid FCM tokens provided' };
    }

    const message = {
      notification: {
        title: String(notification.title).substring(0, 100), // Limit title length
        body: String(notification.body).substring(0, 500), // Limit body length
        imageUrl: notification.imageUrl || undefined
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      tokens: validTokens
    };

    return this.retryOperation(async () => {
      try {
        const response = await admin.messaging().sendMulticast(message);
        
        console.log(`✅ Successfully sent ${response.successCount} notifications`);
        
        if (response.failureCount > 0) {
          console.log(`⚠️ Failed to send ${response.failureCount} notifications`);
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              console.error(`❌ Token ${validTokens[idx].substring(0, 10)}... failed:`, resp.error?.code || resp.error?.message);
            }
          });
        }

        return {
          success: true,
          successCount: response.successCount,
          failureCount: response.failureCount,
          responses: response.responses
        };
      } catch (error) {
        console.error('❌ Error sending push notification:', error.message);
        throw error;
      }
    });
  }

  async sendTopicNotification(topic, notification, data = {}) {
    if (!this.initialized) {
      this.initialize();
    }

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl || undefined
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      topic: topic
    };

    try {
      const response = await admin.messaging().send(message);
      console.log('Successfully sent topic notification:', response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('Error sending topic notification:', error);
      return { success: false, error: error.message };
    }
  }

  async subscribeToTopic(tokens, topic) {
    if (!this.initialized) {
      this.initialize();
    }

    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];

    try {
      const response = await admin.messaging().subscribeToTopic(tokenArray, topic);
      console.log(`Successfully subscribed ${response.successCount} tokens to topic ${topic}`);
      return { success: true, successCount: response.successCount };
    } catch (error) {
      console.error('Error subscribing to topic:', error);
      return { success: false, error: error.message };
    }
  }

  async unsubscribeFromTopic(tokens, topic) {
    if (!this.initialized) {
      this.initialize();
    }

    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];

    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokenArray, topic);
      console.log(`Successfully unsubscribed ${response.successCount} tokens from topic ${topic}`);
      return { success: true, successCount: response.successCount };
    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new FirebaseService();
