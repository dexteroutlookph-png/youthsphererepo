const crypto = require('crypto');
const db = require('../database/connection');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createSession = async (userId, token, req) => {
  const sessionId = crypto.randomUUID();
  await db.query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '7 days')`,
    [sessionId, userId, hashToken(token)]
  );
  return sessionId;
};

const revokeSession = async (token) => {
  if (token) await db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
};

const revokeUserSessions = async (userId) => {
  await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
};

module.exports = { hashToken, createSession, revokeSession, revokeUserSessions };