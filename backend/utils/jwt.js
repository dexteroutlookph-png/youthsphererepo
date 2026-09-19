const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'youthsphere-dev-secret';

const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

module.exports = { signToken, verifyToken, JWT_SECRET };
