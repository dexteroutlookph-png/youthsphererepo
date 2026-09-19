const express = require('express');
const db = require('../database/connection');
const { requireAuth } = require('../middleware/auth');

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

    return res.json({ ...card, history: history.rows });
  } catch (error) {
    console.error('Load rewards error:', error);
    return res.status(500).json({ message: 'Unable to load reward card.' });
  }
});

router.get('/', requireAuth, (req, res) => res.redirect(307, '/api/rewards/my-card'));

module.exports = router;
