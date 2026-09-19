const express = require('express');
const db = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { uploadBase64 } = require('../config/cloudinary');
const { createNotification } = require('../utils/notifications');

const router = express.Router();

const postQuery = `
  SELECT p.id, p.author_id, p.content, p.media_url, p.media_type, p.created_at,
    u.first_name, u.last_name, u.profile_photo_url AS author_avatar,
    c.name AS cluster_name, lc.name AS church_name,
    COUNT(DISTINCT r.id)::int AS like_count,
    COUNT(DISTINCT cmt.id)::int AS comment_count,
    COUNT(DISTINCT s.id)::int AS share_count,
    EXISTS(SELECT 1 FROM reactions own_r WHERE own_r.post_id = p.id AND own_r.user_id = $1 AND own_r.type = 'like') AS user_liked
  FROM posts p
  JOIN users u ON u.id = p.author_id
  LEFT JOIN clusters c ON c.id = u.cluster_id
  LEFT JOIN local_churches lc ON lc.id = u.church_id
  LEFT JOIN reactions r ON r.post_id = p.id AND r.type = 'like'
  LEFT JOIN comments cmt ON cmt.post_id = p.id
  LEFT JOIN post_shares s ON s.post_id = p.id
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
  const { content, imageBase64, videoBase64 } = req.body || {};

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Post content cannot be empty.' });
  }

  try {
    if (imageBase64 && videoBase64) return res.status(400).json({ message: 'A post can contain one media attachment.' });
    const mediaInput = imageBase64 || videoBase64 || null;
    const mediaType = videoBase64 ? 'video' : (imageBase64 ? 'image' : null);
    if (mediaInput && typeof mediaInput !== 'string') return res.status(400).json({ message: 'Invalid media attachment.' });
    if (mediaInput && mediaInput.length > 25 * 1024 * 1024) return res.status(413).json({ message: 'Media attachment is too large.' });
    const mediaUrl = mediaInput ? await uploadBase64(mediaInput, 'youthsphere/posts') : null;
    const result = await db.query(
      `INSERT INTO posts (author_id, content, media_url, media_type)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.user.userId, content.trim(), mediaUrl, mediaType]
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
      const owner = await db.query('SELECT author_id FROM posts WHERE id = $1', [postId]);
      if (owner.rows[0]) await createNotification({ userId: owner.rows[0].author_id, actorId: req.user.userId, type: 'reaction', entityId: postId, message: 'Someone reacted to your post.' });
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

router.get('/:postId/comments', requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);
  if (!Number.isInteger(postId)) return res.status(400).json({ message: 'Invalid post id.' });
  try {
    const result = await db.query(
      `SELECT c.id, c.content, c.created_at, c.updated_at, c.author_id,
        u.first_name, u.last_name, u.profile_photo_url AS author_avatar
       FROM comments c JOIN users u ON u.id = c.author_id
       WHERE c.post_id = $1 ORDER BY c.created_at ASC LIMIT 200`, [postId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Load comments error:', error);
    return res.status(500).json({ message: 'Unable to load comments.' });
  }
});

router.post('/:postId/comments', requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  if (!Number.isInteger(postId) || !content) return res.status(400).json({ message: 'A valid post and non-empty comment are required.' });
  if (content.length > 2000) return res.status(400).json({ message: 'Comment is too long.' });
  try {
    const post = await db.query('SELECT author_id FROM posts WHERE id = $1', [postId]);
    if (post.rows.length === 0) return res.status(404).json({ message: 'Post not found.' });
    const result = await db.query(
      `INSERT INTO comments (post_id, author_id, content) VALUES ($1, $2, $3)
       RETURNING id, post_id, author_id, content, created_at, updated_at`, [postId, req.user.userId, content]
    );
    await createNotification({ userId: post.rows[0].author_id, actorId: req.user.userId, type: 'comment', entityId: postId, message: 'Someone commented on your post.' });
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create comment error:', error);
    return res.status(500).json({ message: 'Unable to add comment.' });
  }
});

router.put('/comments/:commentId', requireAuth, async (req, res) => {
  const commentId = Number(req.params.commentId);
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  if (!Number.isInteger(commentId) || !content || content.length > 2000) return res.status(400).json({ message: 'Invalid comment.' });
  const result = await db.query(
    `UPDATE comments SET content = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND author_id = $3 RETURNING id, post_id, author_id, content, created_at, updated_at`,
    [content, commentId, req.user.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ message: 'Comment not found or not owned by you.' });
  return res.json(result.rows[0]);
});

router.delete('/comments/:commentId', requireAuth, async (req, res) => {
  const commentId = Number(req.params.commentId);
  if (!Number.isInteger(commentId)) return res.status(400).json({ message: 'Invalid comment id.' });
  const result = await db.query('DELETE FROM comments WHERE id = $1 AND author_id = $2 RETURNING id', [commentId, req.user.userId]);
  if (result.rows.length === 0) return res.status(404).json({ message: 'Comment not found or not owned by you.' });
  return res.json({ message: 'Comment deleted.' });
});

router.post('/:postId/share', requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);
  if (!Number.isInteger(postId)) return res.status(400).json({ message: 'Invalid post id.' });
  try {
    const post = await db.query('SELECT author_id FROM posts WHERE id = $1', [postId]);
    if (post.rows.length === 0) return res.status(404).json({ message: 'Post not found.' });
    const result = await db.query(
      `INSERT INTO post_shares (post_id, user_id) VALUES ($1, $2)
       ON CONFLICT (post_id, user_id) DO NOTHING RETURNING id`, [postId, req.user.userId]
    );
    if (result.rows.length > 0) {
      await db.query('UPDATE posts SET share_count = share_count + 1 WHERE id = $1', [postId]);
      await createNotification({ userId: post.rows[0].author_id, actorId: req.user.userId, type: 'share', entityId: postId, message: 'Someone shared your post.' });
    }
    const count = await db.query('SELECT share_count FROM posts WHERE id = $1', [postId]);
    return res.json({ shared: result.rows.length > 0, shareCount: count.rows[0].share_count });
  } catch (error) {
    console.error('Share post error:', error);
    return res.status(500).json({ message: 'Unable to share post.' });
  }
});

module.exports = router;
