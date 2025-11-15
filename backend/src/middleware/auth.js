const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header
 */
function authenticateToken(req, res, next) {
  // Allow token from Authorization header OR query parameter OR cookie
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1] || req.query.token || req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    // Allow multiple sessions - no session restrictions
    next();
  });
}

/**
 * Generate JWT token
 * @param {object} payload - Token payload
 * @returns {string} JWT token
 */
function generateToken(payload) {
  // Default to 7 days (168 hours) for longer sessions
  // Can be set via JWT_EXPIRES_IN env variable
  // Examples: '24h', '7d', '30d', '365d', '9999d' (for development)
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, process.env.JWT_SECRET || 'default_secret', {
    expiresIn: expiresIn
  });
}

module.exports = {
  authenticateToken,
  generateToken
};

