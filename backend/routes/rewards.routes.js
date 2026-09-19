const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  res.json({
    linkedCard: null,
    physicalCardNumber: null,
    cardStatus: 'unlinked',
    message: 'Developer test mode: no physical reward card is required.'
  });
});

module.exports = router;
