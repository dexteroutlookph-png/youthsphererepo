const express = require('express');
const db = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { createNotification } = require('../utils/notifications');

const router = express.Router();

router.get('/my-card', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rc.card_number, rc.status, COALESCE(r.completed_stamps, 0)::int AS stamps_count,
        COALESCE(r.current_points, 0)::int AS total_points,
        COALESCE(r.total_stamps, 10)::int AS total_stamps
       FROM reward_cards rc LEFT JOIN rewards r ON r.card_id = rc.id
      WHERE rc.user_id = $1 LIMIT 1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ stamps_count: 0, total_points: 0, total_stamps: 10, history: [], card_status: 'unlinked' });
    }

    const card = result.rows[0];
    const history = await db.query(
      `SELECT title AS event_name, description, stamps_awarded, points_awarded,
        transaction_date AS created_at, 'ISIED Rewards' AS stamped_by
       FROM reward_transactions WHERE card_id =
        (SELECT id FROM reward_cards WHERE user_id = $1) ORDER BY transaction_date DESC LIMIT 50`,
      [req.user.userId]
    );

    if (card.status !== 'active') return res.json({ ...card, history: history.rows, card_status: card.status });
    return res.json({ ...card, history: history.rows, card_status: card.status });
  } catch (error) {
    console.error('Load rewards error:', error);
    return res.status(500).json({ message: 'Unable to load reward card.' });
  }
});

router.get('/', requireAuth, (req, res) => res.redirect(307, '/api/rewards/my-card'));

router.post('/link', requireAuth, async (req, res) => {
  const cardNumber = typeof req.body?.cardNumber === 'string' ? req.body.cardNumber.trim() : '';
  if (!cardNumber || cardNumber.length > 100) return res.status(400).json({ message: 'A valid physical reward card number is required.' });
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const card = await client.query('SELECT id, user_id, status FROM reward_cards WHERE card_number = $1 FOR UPDATE', [cardNumber]);
    if (card.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'That reward card is not in the authoritative card registry.' }); }
    if (card.rows[0].user_id) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'That reward card is already linked to an account.' }); }
    if (['suspended', 'revoked'].includes(card.rows[0].status)) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'That reward card cannot be linked because it is not active.' }); }
    await client.query("UPDATE reward_cards SET user_id = $1, status = 'active', linked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id IS NULL", [req.user.userId, card.rows[0].id]);
    await client.query(
      `INSERT INTO rewards (card_id) VALUES ($1) ON CONFLICT (card_id) DO NOTHING`, [card.rows[0].id]
    );
    await client.query('COMMIT');
    return res.status(201).json({ message: 'Reward card linked successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Link reward card error:', error);
    return res.status(500).json({ message: 'Unable to link reward card.' });
  } finally { client.release(); }
});

router.patch('/:cardId/status', requireAuth, requireRole('staff', 'admin'), async (req, res) => {
  const cardId = Number(req.params.cardId);
  const { status } = req.body || {};
  if (!Number.isInteger(cardId) || !['active', 'suspended', 'revoked'].includes(status)) return res.status(400).json({ message: 'Invalid card status.' });
  const result = await db.query('UPDATE reward_cards SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING user_id, status', [status, cardId]);
  if (result.rows.length === 0) return res.status(404).json({ message: 'Reward card not found.' });
  if (result.rows[0].user_id) await createNotification({ userId: result.rows[0].user_id, actorId: req.user.userId, type: 'reward_status', entityId: cardId, message: `Your reward card status is now ${status}.` });
  return res.json(result.rows[0]);
});

router.post('/:cardId/transactions', requireAuth, requireRole('staff', 'admin'), async (req, res) => {
  const cardId = Number(req.params.cardId);
  const { title, description, stampsAwarded = 0, pointsAwarded = 0, reason } = req.body || {};
  if (!Number.isInteger(cardId) || !title || !Number.isInteger(Number(stampsAwarded)) || !Number.isInteger(Number(pointsAwarded))) return res.status(400).json({ message: 'Invalid reward transaction.' });
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT rc.user_id, r.completed_stamps, r.current_points FROM reward_cards rc JOIN rewards r ON r.card_id = rc.id WHERE rc.id = $1 FOR UPDATE', [cardId]);
    if (current.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Active reward card not found.' }); }
    const row = current.rows[0];
    const nextStamps = Math.max(0, row.completed_stamps + Number(stampsAwarded));
    const nextPoints = Math.max(0, row.current_points + Number(pointsAwarded));
    await client.query('UPDATE rewards SET completed_stamps = $1, current_points = $2, updated_at = CURRENT_TIMESTAMP WHERE card_id = $3', [nextStamps, nextPoints, cardId]);
    const transaction = await client.query(
      `INSERT INTO reward_transactions (card_id, title, description, stamps_awarded, points_awarded, transaction_type, previous_stamps, new_stamps, previous_points, new_points, actor_id, reason)
       VALUES ($1, $2, $3, $4, $5, 'adjustment', $6, $7, $8, $9, $10, $11) RETURNING *`,
      [cardId, title.trim(), description || null, Number(stampsAwarded), Number(pointsAwarded), row.completed_stamps, nextStamps, row.current_points, nextPoints, req.user.userId, reason || null]
    );
    await client.query('COMMIT');
    if (row.user_id) await createNotification({ userId: row.user_id, actorId: req.user.userId, type: 'reward_update', entityId: cardId, message: 'Your reward card was updated.' });
    return res.status(201).json(transaction.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reward transaction error:', error);
    return res.status(500).json({ message: 'Unable to record reward transaction.' });
  } finally { client.release(); }
});

module.exports = router;
