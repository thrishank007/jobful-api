const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route as JWT verification failed' });
  }
};