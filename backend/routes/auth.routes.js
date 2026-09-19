const express = require('express');
const { signToken } = require('../utils/jwt');
const db = require('../database/connection');
const bcrypt = require('bcryptjs');

const router = express.Router();

const { uploadBase64 } = require('../config/cloudinary');

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

router.post('/login', async (req, res) => {
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
      role: user.role
    });

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
    avatarBase64
  } = req.body || {};

  if (!firstName || !lastName || !birthday || !clusterId || !localChurchId || !username || !email || !password) {
    return res.status(400).json({ message: 'Please complete all required registration fields.' });
  }

  try {
    const existingUser = await db.query(
      `SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1`,
      [username, email]
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
        username,
        email,
        passwordHash,
        birthday,
        clusterId,
        localChurchId,
          profilePhotoUrl,
        ]
      );

      await client.query(
        `INSERT INTO legal_agreements (user_id, policy_version) VALUES ($1, $2)`,
        [result.rows[0].id, 'v1.0-2026']
      );
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
    const token = signToken({ userId: user.id, username: user.username, email: user.email, role: user.role });

    return res.status(201).json({
      token,
      user: getUserResponse(user),
      ...(mediaWarning ? { warning: mediaWarning } : {})
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Unable to create account. Please try again.' });
  }
});

module.exports = router;
