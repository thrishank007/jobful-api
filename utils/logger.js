const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (stack) log += `\nStack: ${stack}`;
    if (Object.keys(meta).length > 0) log += `\nMeta: ${JSON.stringify(meta)}`;
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'notify-backend' },
  transports: [
    // Write all logs to file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add console transport for non-production
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Security logging functions
const securityLogger = {
  authFailure: (ip, userAgent, reason) => {
    logger.warn('Authentication failure', {
      type: 'SECURITY',
      event: 'AUTH_FAILURE',
      ip,
      userAgent,
      reason,
      timestamp: new Date().toISOString()
    });
  },

  suspiciousActivity: (ip, userAgent, activity) => {
    logger.warn('Suspicious activity detected', {
      type: 'SECURITY',
      event: 'SUSPICIOUS_ACTIVITY',
      ip,
      userAgent,
      activity,
      timestamp: new Date().toISOString()
    });
  },

  rateLimitExceeded: (ip, endpoint, limit) => {
    logger.warn('Rate limit exceeded', {
      type: 'SECURITY',
      event: 'RATE_LIMIT_EXCEEDED',
      ip,
      endpoint,
      limit,
      timestamp: new Date().toISOString()
    });
  },

  dataAccess: (userId, resource, action) => {
    logger.info('Data access', {
      type: 'AUDIT',
      event: 'DATA_ACCESS',
      userId,
      resource,
      action,
      timestamp: new Date().toISOString()
    });
  }
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString()
  });
  next(err);
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  });
  
  next();
};

module.exports = {
  logger,
  securityLogger,
  errorLogger,
  requestLogger
};
