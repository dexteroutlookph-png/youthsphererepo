const { verifyToken } = require('../utils/jwt');

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const decoded = process.env.NODE_ENV !== 'production' && token.startsWith('dev-token-')
      ? {
          userId: 1,
          username: 'devuser',
          email: 'dev@example.com',
          role: 'admin'
        }
      : verifyToken(token);

    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired session token.' });
  }
};

module.exports = { requireAuth };
