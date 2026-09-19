const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { uploadBase64 } = require('../config/cloudinary');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

const userQuery = `
  SELECT u.*, c.name AS cluster_name, lc.name AS church_name
  FROM users u
  LEFT JOIN clusters c ON c.id = u.cluster_id
  LEFT JOIN local_churches lc ON lc.id = u.church_id
  WHERE u.id = $1`;

const serializeUser = (user) => ({
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

const loadUser = async (userId) => {
  const result = await db.query(userQuery, [userId]);
  return result.rows[0];
};

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await loadUser(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json(serializeUser(user));
  } catch (error) {
    console.error('Load user error:', error);
    return res.status(500).json({ message: 'Unable to load profile.' });
  }
});

router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await loadUser(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json(serializeUser(user));
  } catch (error) {
    console.error('Load profile error:', error);
    return res.status(500).json({ message: 'Unable to load profile.' });
  }
});

router.put('/profile', requireAuth, async (req, res) => {
  const { firstName, middleName, lastName, email, bio } = req.body || {};

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ message: 'First name, last name, and email are required.' });
  }

  try {
    const duplicate = await db.query('SELECT id FROM users WHERE email = $1 AND id <> $2', [email.trim(), req.user.userId]);
    if (duplicate.rows.length > 0) {
      return res.status(409).json({ message: 'That email address is already in use.' });
    }

    await db.query(
      `UPDATE users SET first_name = $1, middle_name = $2, last_name = $3, email = $4, bio = $5,
       updated_at = CURRENT_TIMESTAMP WHERE id = $6`,
      [firstName.trim(), middleName ? middleName.trim() : null, lastName.trim(), email.trim(), bio ? bio.trim() : null, req.user.userId]
    );
    return res.json(serializeUser(await loadUser(req.user.userId)));
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Unable to update profile.' });
  }
});

router.put('/profile/avatar', requireAuth, async (req, res) => {
  const { avatarBase64 } = req.body || {};
  if (!avatarBase64) return res.status(400).json({ message: 'An avatar image is required.' });

  try {
    const avatarUrl = await uploadBase64(avatarBase64, 'youthsphere/avatars');
    await db.query(
      'UPDATE users SET profile_photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [avatarUrl, req.user.userId]
    );
    return res.json(serializeUser(await loadUser(req.user.userId)));
  } catch (error) {
    console.error('Update avatar error:', error);
    return res.status(500).json({ message: error.message || 'Unable to update profile photo.' });
  }
});

router.put('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'A current password and a new password of at least 6 characters are required.' });
  }

  try {
    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0 || !(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [passwordHash, req.user.userId]);
    return res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Unable to change password.' });
  }
});

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const result = await db.query(
    `SELECT id, first_name, middle_name, last_name, username, email, role, created_at
     FROM users ORDER BY created_at DESC LIMIT 500`
  );
  return res.json(result.rows);
});

router.patch('/:userId/role', requireAuth, requireRole('admin'), async (req, res) => {
  const userId = Number(req.params.userId);
  const { role } = req.body || {};
  if (!Number.isInteger(userId) || !['member', 'staff', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role update.' });
  if (userId === req.user.userId && role !== 'admin') return res.status(400).json({ message: 'Administrators cannot remove their own admin role.' });
  const result = await db.query('UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, role', [role, userId]);
  if (result.rows.length === 0) return res.status(404).json({ message: 'User not found.' });
  return res.json(result.rows[0]);
});

router.patch('/:userId/status', requireAuth, requireRole('staff', 'admin'), async (req, res) => {
  const userId = Number(req.params.userId);
  const { status } = req.body || {};
  if (!Number.isInteger(userId) || !['active', 'suspended', 'restricted'].includes(status)) return res.status(400).json({ message: 'Invalid account status.' });
  const result = await db.query('UPDATE users SET account_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, account_status', [status, userId]);
  if (result.rows.length === 0) return res.status(404).json({ message: 'User not found.' });
  return res.json(result.rows[0]);
});

module.exports = router;
