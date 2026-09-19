const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const DEV_ANNOUNCEMENTS = [
  {
    id: 1,
    title: 'Developer Debug Access',
    author: 'YouthSphere Admin',
    date: new Date().toISOString(),
    content: 'This is a non-production dev environment for testing features and debugging UI flows.',
    badge: 'Debug Mode'
  }
];

router.get('/', requireAuth, (req, res) => {
  res.json(DEV_ANNOUNCEMENTS);
});

router.post('/', requireAuth, (req, res) => {
  const { title, content, author } = req.body || {};

  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required.' });
  }

  const newAnnouncement = {
    id: Date.now(),
    title,
    author: author || 'YouthSphere Admin',
    date: new Date().toISOString(),
    content,
    badge: 'Debug Test'
  };

  DEV_ANNOUNCEMENTS.unshift(newAnnouncement);
  return res.status(201).json(newAnnouncement);
});

module.exports = router;
