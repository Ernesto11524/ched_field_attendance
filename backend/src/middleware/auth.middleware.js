const jwt = require('jsonwebtoken');

/**
 * Protects routes — checks for a valid JWT token in the
 * Authorization header before allowing access.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach user info to the request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

/**
 * Checks that the logged-in user has the 'admin' or 'supervisor' role.
 * Must be used AFTER authenticate middleware.
 */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
