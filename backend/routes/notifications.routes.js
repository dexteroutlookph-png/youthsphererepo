const express = require('express');
const db = require('../database/connection');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT n.id, n.type, n.entity_id, n.message, n.is_read, n.created_at,
        u.first_name AS actor_first_name, u.last_name AS actor_last_name
       FROM notifications n LEFT JOIN users u ON u.id = n.actor_id
       WHERE n.user_id = $1 ORDER BY n.created_at DESC LIMIT 100`, [req.user.userId]
    );
    const unread = await db.query('SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE', [req.user.userId]);
    return res.json({ notifications: result.rows, unreadCount: unread.rows[0].count });
  } catch (error) {
    console.error('Load notifications error:', error);
    return res.status(500).json({ message: 'Unable to load notifications.' });
  }
});

router.patch('/:notificationId/read', async (req, res) => {
  const id = Number(req.params.notificationId);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid notification id.' });
  const result = await db.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.userId]);
  if (result.rows.length === 0) return res.status(404).json({ message: 'Notification not found.' });
  return res.json({ message: 'Notification marked as read.' });
});

router.patch('/read-all', async (req, res) => {
  await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [req.user.userId]);
  return res.json({ message: 'Notifications marked as read.' });
});

module.exports = router;