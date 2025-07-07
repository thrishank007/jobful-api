const Joi = require('joi');

class EnvValidator {
  static validateEnvironment() {
    const envSchema = Joi.object({
      NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
      PORT: Joi.number().port().default(5115),
      MONGO_URI: Joi.string().uri().required(),
      JWT_ACCESS_SECRET: Joi.string().min(32).required(),
      JWT_REFRESH_SECRET: Joi.string().min(32).required(),
      JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
      JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
      SMTP_HOST: Joi.string().required(),
      SMTP_PORT: Joi.number().port().required(),
      SMTP_USER: Joi.string().email().required(),
      SMTP_PASS: Joi.string().required(),
      EMAIL_FROM: Joi.string().email().required(),
      FIREBASE_PROJECT_ID: Joi.string().required(),
      FIREBASE_PRIVATE_KEY_ID: Joi.string().required(),
      FIREBASE_PRIVATE_KEY: Joi.string().required(),
      FIREBASE_CLIENT_EMAIL: Joi.string().email().required(),
      FIREBASE_CLIENT_ID: Joi.string().required(),
      FIREBASE_CLIENT_CERT_URL: Joi.string().uri().required(),
      NOTIFICATION_ICON_URL: Joi.string().uri().optional(),
      RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
      RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100)
    }).unknown();

    const { error, value } = envSchema.validate(process.env);
    
    if (error) {
      console.error('❌ Environment validation failed:');
      error.details.forEach(detail => {
        console.error(`  • ${detail.message}`);
      });
      process.exit(1);
    }

    console.log('✅ Environment variables validated successfully');
    return value;
  }

  static validateDatabaseConnection() {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is required');
    }
    
    // Basic MongoDB URI validation
    const mongoPattern = /^mongodb(\+srv)?:\/\/.+/;
    if (!mongoPattern.test(process.env.MONGO_URI)) {
      throw new Error('Invalid MongoDB URI format');
    }
  }

  static validateFirebaseConfig() {
    const requiredFirebaseVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY_ID', 
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_CLIENT_ID',
      'FIREBASE_CLIENT_CERT_URL'
    ];

    const missing = requiredFirebaseVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing Firebase environment variables: ${missing.join(', ')}`);
    }

    // Validate private key format
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
      throw new Error('Invalid Firebase private key format');
    }
  }
}

module.exports = EnvValidator;
