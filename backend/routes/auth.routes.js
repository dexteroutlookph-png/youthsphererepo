const express = require('express');
const { signToken } = require('../utils/jwt');
const db = require('../database/connection');
const bcrypt = require('bcryptjs');

const router = express.Router();

const CLUSTERS = [
  { id: 1, name: 'Alfonso Lista Cluster' },
  { id: 2, name: 'BRASO Cluster' },
  { id: 3, name: 'Cabatuan Cluster' },
  { id: 4, name: 'Ramon Cluster' },
  { id: 5, name: 'San Mateo Cluster' },
  { id: 6, name: 'VillaSS Cluster' }
];

const CHURCHES_BY_CLUSTER = {
  1: ['Alfonso Lista First UMC', 'Bagong Sikat UMC', 'Namillangan UMC', 'San Quintin UMC', 'Sta. Maria UMC', 'Zion UMC'],
  2: ['Burgos UMC', 'General Aguinaldo UMC', 'Oscariz UMC', 'Rising Hope UMC', 'San Marcos UMC'],
  3: ['Cabatuan UMC', 'La Paz UMC', 'Namnama UMC', 'Tandul UMC'],
  4: ['Aldersgate UMC', 'Grace UMC', 'Ramon UMC', 'San Sebastian UMC', 'Wesley UMC'],
  5: ['Gaddanan UMC', 'Salinungan East UMC', 'Salinungan West UMC', 'San Mateo UMC', 'The Crossroad UMC', 'Victoria MC'],
  6: ['Sinamar Norte UMC', 'Sinamar Sur UMC', 'Villa Cruz UMC', 'Villa Fuerte UMC', 'Villa Magat UMC']
};

router.post('/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body || {};

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ message: 'Username/email and password are required.' });
  }

  try {
    const result = await db.query(
      `SELECT * FROM users WHERE username = $1 OR email = $1 LIMIT 1`,
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
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        email: user.email,
        role: user.role,
        clusterName: user.cluster_id ? 'Alfonso Lista Cluster' : 'Alfonso Lista Cluster',
        churchName: user.church_id ? 'Alfonso Lista First UMC' : 'Alfonso Lista First UMC',
        avatarUrl: user.profile_photo_url || null
      }
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
    const clusterName = CLUSTERS.find((cluster) => Number(cluster.id) === Number(clusterId))?.name || 'Alfonso Lista Cluster';
    const churchName = CHURCHES_BY_CLUSTER[Number(clusterId)]?.[Number(localChurchId) - 1] || 'Alfonso Lista First UMC';

    const result = await db.query(
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
        avatarBase64 || null,
      ]
    );

    const user = result.rows[0];
    const token = signToken({ userId: user.id, username: user.username, email: user.email, role: user.role });

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        email: user.email,
        role: user.role,
        clusterName,
        churchName,
        avatarUrl: user.profile_photo_url || null
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Unable to create account. Please try again.' });
  }
});

module.exports = router;
