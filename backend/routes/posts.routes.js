const express = require('express');
const db = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { uploadBase64 } = require('../config/cloudinary');

const router = express.Router();

const postQuery = `
  SELECT p.id, p.author_id, p.content, p.media_url, p.media_type, p.created_at,
    u.first_name, u.last_name, u.profile_photo_url AS author_avatar,
    c.name AS cluster_name, lc.name AS church_name,
    COUNT(DISTINCT r.id)::int AS like_count,
    EXISTS(SELECT 1 FROM reactions own_r WHERE own_r.post_id = p.id AND own_r.user_id = $1) AS user_liked
  FROM posts p
  JOIN users u ON u.id = p.author_id
  LEFT JOIN clusters c ON c.id = u.cluster_id
  LEFT JOIN local_churches lc ON lc.id = u.church_id
  LEFT JOIN reactions r ON r.post_id = p.id AND r.type = 'like'
  GROUP BY p.id, u.id, c.name, lc.name
  ORDER BY p.created_at DESC
  LIMIT 100`;

router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(postQuery, [req.user.userId]);
    return res.json(result.rows);
  } catch (error) {
    console.error('Load posts error:', error);
    return res.status(500).json({ message: 'Unable to load posts.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { content, imageBase64 } = req.body || {};

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Post content cannot be empty.' });
  }

  try {
    const mediaUrl = imageBase64 ? await uploadBase64(imageBase64, 'youthsphere/posts') : null;
    const result = await db.query(
      `INSERT INTO posts (author_id, content, media_url, media_type)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.user.userId, content.trim(), mediaUrl, mediaUrl ? 'image' : null]
    );
    const posts = await db.query(postQuery, [req.user.userId]);
    const createdPost = posts.rows.find((post) => post.id === result.rows[0].id);
    return res.status(201).json(createdPost);
  } catch (error) {
    console.error('Create post error:', error);
    return res.status(500).json({ message: error.message || 'Unable to publish post.' });
  }
});

router.post('/:postId/like', requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);

  if (!Number.isInteger(postId)) {
    return res.status(400).json({ message: 'Invalid post id.' });
  }

  try {
    const existing = await db.query(
      `SELECT id FROM reactions WHERE post_id = $1 AND user_id = $2 AND type = 'like'`,
      [postId, req.user.userId]
    );

    let liked;
    if (existing.rows.length > 0) {
      await db.query('DELETE FROM reactions WHERE id = $1', [existing.rows[0].id]);
      liked = false;
    } else {
      await db.query(
        `INSERT INTO reactions (post_id, user_id, type) VALUES ($1, $2, 'like')
         ON CONFLICT (post_id, user_id) DO UPDATE SET type = 'like'`,
        [postId, req.user.userId]
      );
      liked = true;
    }

    const count = await db.query(
      `SELECT COUNT(*)::int AS like_count FROM reactions WHERE post_id = $1 AND type = 'like'`,
      [postId]
    );
    return res.json({ success: true, liked, likeCount: count.rows[0].like_count });
  } catch (error) {
    console.error('Toggle like error:', error);
    return res.status(500).json({ message: 'Unable to update like.' });
  }
});

module.exports = router;
