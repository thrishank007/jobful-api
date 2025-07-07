const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Enhanced security middleware
const securityMiddleware = (app) => {
  // Enhanced helmet configuration
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    referrerPolicy: { policy: 'same-origin' },
    xssFilter: true,
    frameguard: { action: 'deny' }
  }));

  // Global rate limiting
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        retryAfter: Math.round(req.rateLimit.resetTime / 1000)
      });
    }
  });

  app.use(globalLimiter);

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      };

      // Log only non-sensitive information
      if (req.originalUrl.includes('/auth/') || req.originalUrl.includes('/notifications/')) {
        console.log(`🔐 ${logData.method} ${logData.url} ${logData.status} ${logData.duration}`);
      } else {
        console.log(`📝 ${logData.method} ${logData.url} ${logData.status} ${logData.duration}`);
      }
    });

    next();
  });

  // Body size limiting
  app.use((req, res, next) => {
    if (req.headers['content-length'] > 10 * 1024 * 1024) { // 10MB limit
      return res.status(413).json({
        success: false,
        message: 'Request entity too large'
      });
    }
    next();
  });

  // Prevent parameter pollution
  app.use((req, res, next) => {
    // Clean up query parameters
    for (const key in req.query) {
      if (Array.isArray(req.query[key])) {
        req.query[key] = req.query[key][0]; // Take first value only
      }
    }
    next();
  });

  // Add security headers
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'same-origin'
    });
    next();
  });
};

module.exports = securityMiddleware;
