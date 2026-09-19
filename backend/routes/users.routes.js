const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const DEV_USER = {
  id: 1,
  firstName: 'Developer',
  lastName: 'User',
  username: 'devuser',
  email: 'dev@example.com',
  avatarUrl: 'https://placehold.co/100x100/062D58/FFFFFF?text=DU',
  clusterName: 'Alfonso Lista Cluster',
  churchName: 'Alfonso Lista First UMC',
  role: 'admin'
};

router.get('/me', requireAuth, (req, res) => {
  res.json(DEV_USER);
});

router.get('/profile', requireAuth, (req, res) => {
  res.json(DEV_USER);
});

module.exports = router;
