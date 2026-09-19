const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { uploadBase64 } = require('../config/cloudinary');

const router = express.Router();

const DEV_POSTS = [
  {
    id: 1,
    first_name: 'Developer',
    last_name: 'User',
    author_avatar: 'https://placehold.co/100x100/062D58/FFFFFF?text=DU',
    cluster_name: 'Alfonso Lista Cluster',
    church_name: 'Alfonso Lista First UMC',
    content: 'Developer mode is active. You can test features and debug the app while Live Server is open.',
    created_at: new Date().toISOString(),
    like_count: 12,
    user_liked: false,
    media_url: null
  }
];

router.get('/', requireAuth, (req, res) => {
  return res.json(DEV_POSTS);
});

router.post('/', requireAuth, async (req, res) => {
  const { content, imageBase64 } = req.body || {};

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Post content cannot be empty.' });
  }

  let mediaUrl = null;
  if (imageBase64) {
    mediaUrl = await uploadBase64(imageBase64, 'youthsphere/posts');
  }

  const newPost = {
    id: Date.now(),
    first_name: 'Developer',
    last_name: 'User',
    author_avatar: 'https://placehold.co/100x100/062D58/FFFFFF?text=DU',
    cluster_name: 'Alfonso Lista Cluster',
    church_name: 'Alfonso Lista First UMC',
    content: content.trim(),
    created_at: new Date().toISOString(),
    like_count: 0,
    user_liked: false,
    media_url: mediaUrl
  };

  DEV_POSTS.unshift(newPost);
  return res.status(201).json(newPost);
});

router.post('/:postId/like', requireAuth, (req, res) => {
  const postId = Number(req.params.postId);
  const post = DEV_POSTS.find((item) => Number(item.id) === postId);

  if (!post) {
    return res.status(404).json({ message: 'Post not found.' });
  }

  post.user_liked = !post.user_liked;
  post.like_count = Math.max(0, post.like_count + (post.user_liked ? 1 : -1));

  return res.json({ success: true, liked: post.user_liked, likeCount: post.like_count });
});

module.exports = router;
