const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { errorResponse } = require('../utils/validation');

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validate JWT environment variable on startup
if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32) {
  console.error('❌ JWT_ACCESS_SECRET must be at least 32 characters long');
  process.exit(1);
}

exports.protect = (req, res, next) => {
  let token;
  
  // Extract token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // Check if token exists
  if (!token) {
    return errorResponse(res, 401, 'Access denied. No token provided.');
  }

  // Validate token format (basic check)
  if (token.split('.').length !== 3) {
    return errorResponse(res, 401, 'Access denied. Invalid token format.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Check token expiration explicitly
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      return errorResponse(res, 401, 'Access denied. Token expired.');
    }

    // Validate required fields
    if (!decoded.userId) {
      return errorResponse(res, 401, 'Access denied. Invalid token payload.');
    }

    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    let message = 'Access denied. Invalid token.';
    
    if (error.name === 'TokenExpiredError') {
      message = 'Access denied. Token expired.';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Access denied. Malformed token.';
    } else if (error.name === 'NotBeforeError') {
      message = 'Access denied. Token not yet valid.';
    }
    
    return errorResponse(res, 401, message);
  }
};

exports.authLimiter = authLimiter;