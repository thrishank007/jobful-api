const Joi = require('joi');

// Input validation schemas
const schemas = {
  fcmToken: Joi.object({
    token: Joi.string().min(100).max(200).required()
  }),

  notificationSettings: Joi.object({
    email: Joi.boolean().optional(),
    push: Joi.boolean().optional()
  }).min(1),

  userInterests: Joi.object({
    categories: Joi.array().items(
      Joi.string().valid(
        'latest', 'defence', 'railway', 'engineering', 
        'bank', 'teaching', 'education', 'government',
        // State codes
        'state_AN', 'state_AP', 'state_AR', 'state_AS', 'state_BR',
        'state_CG', 'state_CH', 'state_DH', 'state_DD', 'state_DL',
        'state_GA', 'state_GJ', 'state_HR', 'state_HP', 'state_JK',
        'state_JH', 'state_KA', 'state_KL', 'state_LD', 'state_MP',
        'state_MH', 'state_MN', 'state_ML', 'state_MZ', 'state_NL',
        'state_OR', 'state_PY', 'state_PB', 'state_RJ', 'state_SK',
        'state_TN', 'state_TS', 'state_TR', 'state_UK', 'state_UP', 'state_WB'
      )
    ).min(1).max(20).required()
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(), // MongoDB ObjectId

  stateCode: Joi.string().length(2).pattern(/^[A-Z]{2}$/).required(),

  category: Joi.string().valid(
    'latest', 'defence', 'railway', 'engineering', 
    'bank', 'teaching', 'education', 'government'
  ).required()
};

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property]);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    req[property] = value;
    next();
  };
};

// Sanitization helpers
const sanitize = {
  html: (text) => {
    if (typeof text !== 'string') return text;
    return text
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  },

  url: (url) => {
    if (typeof url !== 'string') return url;
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
      return parsed.toString();
    } catch {
      throw new Error('Invalid URL format');
    }
  },

  email: (email) => {
    if (typeof email !== 'string') return email;
    return email.toLowerCase().trim();
  }
};

// Error response helper
const errorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return res.status(statusCode).json(response);
};

module.exports = {
  schemas,
  validate,
  sanitize,
  errorResponse
};
