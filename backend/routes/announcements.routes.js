const express = require('express');
const db = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { uploadBase64 } = require('../config/cloudinary');

const router = express.Router();

const requireStaff = (req, res, next) => {
  if (!['admin', 'staff'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Staff access required.' });
  }
  return next();
};

router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.id, a.title, a.content, a.media_url, a.media_type, a.created_at,
        a.category, a.is_pinned,
        u.first_name || ' ' || u.last_name AS author_name
      FROM announcements a JOIN users u ON u.id = a.author_id
      WHERE a.archived_at IS NULL
       ORDER BY a.created_at DESC LIMIT 100`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Load announcements error:', error);
    return res.status(500).json({ message: 'Unable to load announcements.' });
  }
});

router.post('/', requireAuth, requireStaff, async (req, res) => {
  const { title, content, mediaBase64, category, isPinned } = req.body || {};

  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required.' });
  }

  try {
    const allowedCategories = ['GENERAL', 'EVENTS', 'MINISTRY', 'URGENT'];
    const normalizedCategory = allowedCategories.includes(String(category || '').toUpperCase()) ? String(category).toUpperCase() : 'GENERAL';
    const mediaUrl = mediaBase64 ? await uploadBase64(mediaBase64, 'youthsphere/announcements') : null;
    const result = await db.query(
      `INSERT INTO announcements (author_id, title, content, media_url, media_type, category, is_pinned)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, title, content, media_url, media_type, category, is_pinned, created_at`,
          [req.user.userId, title.trim(), content.trim(), mediaUrl, mediaUrl ? 'image' : null, normalizedCategory, Boolean(isPinned)]
    );
            await db.query(
          `INSERT INTO notifications (user_id, actor_id, type, entity_id, message)
           SELECT id, $1, 'announcement', $2, 'A new official announcement is available.'
           FROM users WHERE id <> $1`, [req.user.userId, result.rows[0].id]
            );
    return res.status(201).json({ ...result.rows[0], author_name: req.user.username });
  } catch (error) {
    console.error('Create announcement error:', error);
    return res.status(500).json({ message: error.message || 'Unable to create announcement.' });
  }
});

router.put('/:announcementId', requireAuth, requireStaff, async (req, res) => {
  const id = Number(req.params.announcementId);
  const { title, content, category, isPinned, archived } = req.body || {};
  if (!Number.isInteger(id) || !title || !content) return res.status(400).json({ message: 'Valid title and content are required.' });
  const categories = ['GENERAL', 'EVENTS', 'MINISTRY', 'URGENT'];
  const normalizedCategory = categories.includes(String(category || '').toUpperCase()) ? String(category).toUpperCase() : 'GENERAL';
  const result = await db.query(
    `UPDATE announcements SET title = $1, content = $2, category = $3, is_pinned = $4,
      archived_at = CASE WHEN $5 THEN COALESCE(archived_at, CURRENT_TIMESTAMP) ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *`,
    [title.trim(), content.trim(), normalizedCategory, Boolean(isPinned), Boolean(archived), id]
  );
  if (result.rows.length === 0) return res.status(404).json({ message: 'Announcement not found.' });
  return res.json(result.rows[0]);
});

router.delete('/:announcementId', requireAuth, requireStaff, async (req, res) => {
  const id = Number(req.params.announcementId);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid announcement id.' });
  const result = await db.query('UPDATE announcements SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) return res.status(404).json({ message: 'Announcement not found.' });
  return res.json({ message: 'Announcement archived.' });
});

module.exports = router;
