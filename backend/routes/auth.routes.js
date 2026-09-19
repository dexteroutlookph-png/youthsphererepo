const express = require('express');
const { signToken } = require('../utils/jwt');
const db = require('../database/connection');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { createSession, revokeSession, hashToken } = require('../utils/sessions');
const { sendPasswordResetEmail } = require('../utils/mail');

const router = express.Router();

const { uploadBase64 } = require('../config/cloudinary');

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many password reset requests. Please try again later.' }
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' }
});

const getUserResponse = (user) => ({
  id: user.id,
  firstName: user.first_name,
  middleName: user.middle_name,
  lastName: user.last_name,
  username: user.username,
  email: user.email,
  birthday: user.birthday,
  bio: user.bio,
  role: user.role,
  clusterName: user.cluster_name,
  churchName: user.church_name,
  avatarUrl: user.profile_photo_url || null
});

router.post('/login', loginLimiter, async (req, res) => {
  const { usernameOrEmail, password } = req.body || {};

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ message: 'Username/email and password are required.' });
  }

  try {
    const result = await db.query(
      `SELECT u.*, c.name AS cluster_name, lc.name AS church_name
       FROM users u
       LEFT JOIN clusters c ON c.id = u.cluster_id
       LEFT JOIN local_churches lc ON lc.id = u.church_id
       WHERE u.username = $1 OR u.email = $1 LIMIT 1`,
      [usernameOrEmail]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = signToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      sessionManaged: true
    });
    await createSession(user.id, token, req);

    return res.json({
      token,
      user: getUserResponse(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Unable to log in right now.' });
  }
});

router.post('/register', async (req, res) => {
  const {
    firstName,
    middleName,
    lastName,
    birthday,
    clusterId,
    localChurchId,
    username,
    email,
    password,
    avatarBase64,
    termsAccepted
  } = req.body || {};

  const normalizedUsername = typeof username === 'string' ? username.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  if (!firstName || !lastName || !birthday || !clusterId || !localChurchId || !normalizedUsername || !isValidEmail || !password || password.length < 6 || termsAccepted !== true) {
    return res.status(400).json({ message: 'Please complete all required registration fields.' });
  }

  try {
    const existingUser = await db.query(
      `SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1`,
      [normalizedUsername, normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'An account with that username or email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let profilePhotoUrl = null;
    let mediaWarning = null;

    if (avatarBase64) {
      try {
        profilePhotoUrl = await uploadBase64(avatarBase64, 'youthsphere/avatars');
      } catch (error) {
        console.error('Registration avatar upload skipped:', error.message);
        mediaWarning = 'Account created, but the profile photo could not be uploaded.';
      }
    }

    const client = await db.getClient();
    let result;
    try {
      await client.query('BEGIN');
      const location = await client.query(
        `SELECT c.id AS cluster_id, c.name AS cluster_name, lc.id AS church_id, lc.name AS church_name
         FROM clusters c JOIN local_churches lc ON lc.cluster_id = c.id
         WHERE c.id = $1 AND lc.id = $2`,
        [clusterId, localChurchId]
      );

      if (location.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Selected cluster and local church are invalid.' });
      }

      result = await client.query(
      `INSERT INTO users (
        first_name, middle_name, last_name, username, email, password_hash, birthday,
        cluster_id, church_id, profile_photo_url, role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'member') RETURNING *`,
      [
        firstName,
        middleName || null,
        lastName,
        normalizedUsername,
        normalizedEmail,
        passwordHash,
        birthday,
        clusterId,
        localChurchId,
          profilePhotoUrl,
        ]
      );

      const legalColumns = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'legal_agreements'
           AND column_name IN ('agreement_type', 'accepted')`
      );
      const supportsDetailedAgreements = legalColumns.rows.length === 2;
      if (supportsDetailedAgreements) {
        await client.query(
          `INSERT INTO legal_agreements (user_id, agreement_type, policy_version, accepted)
           VALUES ($1, 'terms', $2, TRUE), ($1, 'privacy', $2, TRUE)`,
          [result.rows[0].id, 'v1.0-2026']
        );
      } else {
        await client.query(
          `INSERT INTO legal_agreements (user_id, policy_version) VALUES ($1, $2)`,
          [result.rows[0].id, 'v1.0-2026']
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const userResult = await db.query(
      `SELECT u.*, c.name AS cluster_name, lc.name AS church_name
       FROM users u LEFT JOIN clusters c ON c.id = u.cluster_id
       LEFT JOIN local_churches lc ON lc.id = u.church_id WHERE u.id = $1`,
      [result.rows[0].id]
    );
    const user = userResult.rows[0];
    const token = signToken({ userId: user.id, username: user.username, email: user.email, role: user.role, sessionManaged: true });
    await createSession(user.id, token, req);

    return res.status(201).json({
      token,
      user: getUserResponse(user),
      ...(mediaWarning ? { warning: mediaWarning } : {})
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'An account with that username or email already exists.' });
    }
    return res.status(500).json({ message: 'Unable to create account. Please try again.' });
  }
});

router.post('/logout', async (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  await revokeSession(token);
  return res.json({ message: 'Logged out successfully.' });
});

router.post('/forgot-password', resetLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const genericResponse = { message: 'If an account matches that email, password reset instructions will be sent.' };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.json(genericResponse);

  try {
    const result = await db.query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [email]);
    if (result.rows.length === 0) return res.json(genericResponse);

    const rawToken = crypto.randomBytes(32).toString('hex');
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at < CURRENT_TIMESTAMP', [result.rows[0].id]);
    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '1 hour')`,
      [result.rows[0].id, hashToken(rawToken)]
    );

    try {
      await sendPasswordResetEmail({ recipient: email, token: rawToken });
    } catch (mailError) {
      console.error('Password reset delivery failed:', mailError.message);
    }
    return res.json(genericResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.json(genericResponse);
  }
});

router.post('/reset-password', resetLimiter, async (req, res) => {
  const { token, password, confirmPassword } = req.body || {};
  if (!token || !password || password !== confirmPassword || password.length < 6) {
    return res.status(400).json({ message: 'A valid token and matching password of at least 6 characters are required.' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
       FOR UPDATE`,
      [hashToken(token)]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'This password reset link is invalid or expired.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await client.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [passwordHash, result.rows[0].user_id]);
    await client.query('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [result.rows[0].id]);
    await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [result.rows[0].user_id]);
    await client.query('DELETE FROM sessions WHERE user_id = $1', [result.rows[0].user_id]);
    await client.query('COMMIT');
    return res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Unable to reset password right now.' });
  } finally {
    client.release();
  }
});

module.exports = router;
