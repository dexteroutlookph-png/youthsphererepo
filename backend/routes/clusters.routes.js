const express = require('express');
const db = require('../database/connection');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name FROM clusters ORDER BY name ASC');
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load cluster list.' });
  }
});

router.get('/:clusterId/churches', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name FROM local_churches WHERE cluster_id = $1 ORDER BY name ASC',
      [Number(req.params.clusterId)]
    );

    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load church list.' });
  }
});

module.exports = router;
