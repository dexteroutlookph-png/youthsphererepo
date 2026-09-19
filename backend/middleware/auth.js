const { verifyToken } = require('../utils/jwt');
const db = require('../database/connection');
const { hashToken } = require('../utils/sessions');

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const decoded = verifyToken(token);

    try {
      const account = await db.query('SELECT account_status FROM users WHERE id = $1 LIMIT 1', [decoded.userId]);
      if (account.rows.length === 0 || account.rows[0].account_status !== 'active') {
        return res.status(403).json({ message: 'This account is not active.' });
      }
    } catch (accountError) {
      // The status column is additive. Keep existing production users working until migration 002 is applied.
      if (accountError.code !== '42703') throw accountError;
    }

    if (decoded.sessionManaged) {
      const session = await db.query(
        `SELECT id FROM sessions WHERE user_id = $1 AND token_hash = $2 AND expires_at > CURRENT_TIMESTAMP LIMIT 1`,
        [decoded.userId, hashToken(token)]
      );
      if (session.rows.length === 0) return res.status(401).json({ message: 'Session has ended. Please sign in again.' });
    }

    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired session token.' });
  }
};

module.exports = { requireAuth };
