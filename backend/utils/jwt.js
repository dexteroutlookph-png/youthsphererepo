const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : process.env.SESSION_SECRET || 'youthsphere-dev-secret');

if (!JWT_SECRET) {
	throw new Error('JWT_SECRET must be configured in production.');
}

const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

module.exports = { signToken, verifyToken, JWT_SECRET };
