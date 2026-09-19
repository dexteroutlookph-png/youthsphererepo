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
        'GENERAL' AS category, FALSE AS is_pinned,
        u.first_name || ' ' || u.last_name AS author_name
       FROM announcements a JOIN users u ON u.id = a.author_id
       ORDER BY a.created_at DESC LIMIT 100`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Load announcements error:', error);
    return res.status(500).json({ message: 'Unable to load announcements.' });
  }
});

router.post('/', requireAuth, requireStaff, async (req, res) => {
  const { title, content, mediaBase64 } = req.body || {};

  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required.' });
  }

  try {
    const mediaUrl = mediaBase64 ? await uploadBase64(mediaBase64, 'youthsphere/announcements') : null;
    const result = await db.query(
      `INSERT INTO announcements (author_id, title, content, media_url, media_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, content, media_url, media_type, created_at`,
      [req.user.userId, title.trim(), content.trim(), mediaUrl, mediaUrl ? 'image' : null]
    );
    return res.status(201).json({ ...result.rows[0], author_name: req.user.username });
  } catch (error) {
    console.error('Create announcement error:', error);
    return res.status(500).json({ message: error.message || 'Unable to create announcement.' });
  }
});

module.exports = router;
