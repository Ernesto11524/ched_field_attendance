/**
 * Global error handler — catches any error thrown in a route
 * and returns a clean JSON response instead of crashing the server.
 */
function errorHandler(err, req, res, next) {
  console.error('Server error:', err.message);

  const status = err.status || 500;
  const message = err.message || 'Something went wrong on the server.';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
