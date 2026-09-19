const express = require('express');
const db = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  const { targetType, targetId, reason, explanation } = req.body || {};
  const validTypes = ['post', 'comment', 'user'];
  const validReasons = ['spam', 'harassment', 'inappropriate', 'misleading', 'other'];
  if (!validTypes.includes(targetType) || !Number.isInteger(Number(targetId)) || !validReasons.includes(reason)) {
    return res.status(400).json({ message: 'Invalid report details.' });
  }
  const details = typeof explanation === 'string' ? explanation.trim().slice(0, 2000) : '';
  try {
    const result = await db.query(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason)
       SELECT $1, $2, $3, $4 || CASE WHEN $5 = '' THEN '' ELSE ': ' || $5 END
       WHERE NOT EXISTS (
         SELECT 1 FROM reports WHERE reporter_id = $1 AND target_type = $2 AND target_id = $3 AND status = 'pending'
       ) RETURNING id`,
      [req.user.userId, targetType, Number(targetId), reason, details]
    );
    if (result.rows.length === 0) return res.status(409).json({ message: 'You already have a pending report for this content.' });
    return res.status(201).json({ message: 'Report submitted.' });
  } catch (error) {
    console.error('Create report error:', error);
    return res.status(500).json({ message: 'Unable to submit report.' });
  }
});

router.get('/', requireAuth, requireRole('staff', 'admin'), async (req, res) => {
  const status = ['pending', 'reviewed', 'dismissed', 'actioned'].includes(req.query.status) ? req.query.status : null;
  const result = await db.query(
    `SELECT r.*, ru.username AS reporter_username
     FROM reports r JOIN users ru ON ru.id = r.reporter_id
     WHERE ($1::text IS NULL OR r.status = $1) ORDER BY r.created_at DESC LIMIT 200`, [status]
  );
  return res.json(result.rows);
});

router.patch('/:reportId', requireAuth, requireRole('staff', 'admin'), async (req, res) => {
  const id = Number(req.params.reportId);
  const { status, action, reason } = req.body || {};
  if (!Number.isInteger(id) || !['reviewed', 'dismissed', 'actioned'].includes(status)) return res.status(400).json({ message: 'Invalid moderation update.' });
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const report = await client.query('SELECT * FROM reports WHERE id = $1 FOR UPDATE', [id]);
    if (report.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Report not found.' }); }
    await client.query('UPDATE reports SET status = $1, resolved_at = CURRENT_TIMESTAMP WHERE id = $2', [status, id]);
    if (action && status === 'actioned') {
      const allowed = ['remove', 'suspend_user'];
      if (!allowed.includes(action)) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'Invalid moderation action.' }); }
      const target = report.rows[0];
      await client.query(
        `INSERT INTO moderation_actions (moderator_id, target_type, target_id, action, reason)
         VALUES ($1, $2, $3, $4, $5)`, [req.user.userId, target.target_type, target.target_id, action, reason || null]
      );
      if (action === 'remove' && target.target_type === 'post') await client.query('DELETE FROM posts WHERE id = $1', [target.target_id]);
      if (action === 'remove' && target.target_type === 'comment') await client.query('DELETE FROM comments WHERE id = $1', [target.target_id]);
      if (action === 'suspend_user' && target.target_type === 'user') await client.query("UPDATE users SET account_status = 'suspended', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [target.target_id]);
    }
    await client.query('COMMIT');
    return res.json({ message: 'Moderation update saved.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Moderation update error:', error);
    return res.status(500).json({ message: 'Unable to save moderation update.' });
  } finally { client.release(); }
});

module.exports = router;