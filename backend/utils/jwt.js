const jwt = require('jsonwebtoken');

const getJwtSecret = () => process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : process.env.SESSION_SECRET || 'youthsphere-dev-secret');

const signToken = (payload) => {
	const secret = getJwtSecret();
	if (!secret) throw new Error('JWT_SECRET must be configured in production.');
	return jwt.sign(payload, secret, { expiresIn: '7d' });
};

const verifyToken = (token) => {
	const secret = getJwtSecret();
	if (!secret) throw new Error('JWT_SECRET must be configured in production.');
	return jwt.verify(token, secret);
};

module.exports = { signToken, verifyToken };
