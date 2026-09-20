/* YouthSphere Home Feed Controller */

document.addEventListener('DOMContentLoaded', () => {
  // Session Check: Guard feed page
  const currentUser = api.getCurrentUser();
  if (!api.getToken() || !currentUser) {
    window.location.href = 'login.html';
    return;
  }

  // Element Handles
  const logoutBtn = document.getElementById('logoutBtn');
  const feedContainer = document.getElementById('feedContainer');
  const feedAlert = document.getElementById('feedAlert');
  const openComposerTrigger = document.getElementById('openComposerTrigger');
  const userComposerAvatar = document.getElementById('userComposerAvatar');
  const composerPlaceholderText = document.getElementById('composerPlaceholderText');
  const composerModal = document.getElementById('composerModal');
  const closeComposerBtn = document.getElementById('closeComposerBtn');
  const cancelPostBtn = document.getElementById('cancelPostBtn');
  const postForm = document.getElementById('postForm');
  const postContentInput = document.getElementById('postContentInput');
  const postImageInput = document.getElementById('postImageInput');
  const postImagePreviewContainer = document.getElementById('postImagePreviewContainer');
  const postImagePreview = document.getElementById('postImagePreview');
  const postVideoPreview = document.getElementById('postVideoPreview');
  const removeImageBtn = document.getElementById('removeImageBtn');
  const submitPostBtn = document.getElementById('submitPostBtn');

  let attachedImageBase64 = null;

  // Render User Context in Composer
  if (currentUser.avatarUrl) {
    userComposerAvatar.src = currentUser.avatarUrl;
  }
  composerPlaceholderText.textContent = `What's on your mind, ${currentUser.firstName || 'Youth'}?`;

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await api.logout();
      window.location.href = 'login.html';
    });
  }

  // Display Alerts
  const showAlert = (message, type = 'error') => {
    feedAlert.style.display = 'block';
    feedAlert.textContent = message;
    if (type === 'error') {
      feedAlert.style.backgroundColor = '#FDE8E8';
      feedAlert.style.color = '#9B1C1C';
    } else {
      feedAlert.style.backgroundColor = '#DEF7EC';
      feedAlert.style.color = '#03543F';
    }
  };

  // Composer Modal Handlers
  const openComposer = () => composerModal.classList.add('active');
  const closeComposer = () => {
    composerModal.classList.remove('active');
    postForm.reset();
    attachedImageBase64 = null;
    postImagePreviewContainer.style.display = 'none';
    postVideoPreview.style.display = 'none';
    postVideoPreview.removeAttribute('src');
  };

  openComposerTrigger.addEventListener('click', openComposer);
  openComposerTrigger.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openComposer();
    }
  });
  closeComposerBtn.addEventListener('click', closeComposer);
  cancelPostBtn.addEventListener('click', closeComposer);

  // Attachment Image Preview Handler
  postImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type);
    if (!isImage && !isVideo) {
      showAlert('Please attach a JPG, PNG, WEBP, MP4, WEBM, or MOV file.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) { showAlert('Media attachments must be 25 MB or smaller.'); return; }

    const reader = new FileReader();
    reader.onload = (event) => {
      attachedImageBase64 = event.target.result;
      postImagePreview.style.display = isImage ? 'block' : 'none';
      postVideoPreview.style.display = isVideo ? 'block' : 'none';
      if (isImage) postImagePreview.src = attachedImageBase64;
      if (isVideo) postVideoPreview.src = attachedImageBase64;
      postImagePreviewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  removeImageBtn.addEventListener('click', () => {
    attachedImageBase64 = null;
    postImageInput.value = '';
    postImagePreviewContainer.style.display = 'none';
    postVideoPreview.style.display = 'none';
  });

  // Post Submission
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = postContentInput.value.trim();

    if (!content) {
      showAlert('Post content cannot be empty.');
      return;
    }

    submitPostBtn.disabled = true;
    submitPostBtn.textContent = 'Posting...';

    try {
      await api.request('/posts', {
        method: 'POST',
        body: JSON.stringify({
          content,
          imageBase64: attachedImageBase64 && attachedImageBase64.startsWith('data:image/') ? attachedImageBase64 : null,
          videoBase64: attachedImageBase64 && attachedImageBase64.startsWith('data:video/') ? attachedImageBase64 : null
        })
      });

      closeComposer();
      loadFeedPosts();
    } catch (err) {
      showAlert(err.message || 'Failed to publish post. Try again.');
    } finally {
      submitPostBtn.disabled = false;
      submitPostBtn.textContent = 'Publish Post';
    }
  });

  // Render Post Element
  const createPostCardElement = (post) => {
    const card = document.createElement('div');
    card.className = 'post-card';

    const defaultAvatar = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='%23062D58'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>`;

    const avatarSrc = post.author_avatar || defaultAvatar;
    const authorName = `${post.first_name || 'Youth'} ${post.last_name || ''}`.trim();
    const churchInfo = post.church_name ? `${post.church_name} (${post.cluster_name || 'ISIED'})` : 'ISIED District Youth';
    const postTime = new Date(post.created_at || Date.now()).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    let mediaHtml = '';
    if (post.media_url && post.media_type === 'video') {
      mediaHtml = `<video src="${post.media_url}" class="post-media-attachment" controls preload="metadata" aria-label="Post video"></video>`;
    } else if (post.media_url) {
      mediaHtml = `<img src="${post.media_url}" class="post-media-attachment" alt="Post attachment">`;
    }

    card.innerHTML = `
      <div class="post-header">
        <img src="${avatarSrc}" class="post-avatar" alt="${authorName}">
        <div class="post-author-info">
          <span class="post-author-name">${authorName}</span>
          <span class="post-meta-sub">${churchInfo} • ${postTime}</span>
        </div>
      </div>
      <div class="post-content-text">${escapeHtml(post.content)}</div>
      ${mediaHtml}
      <div class="post-action-bar">
        <button type="button" class="action-btn ${post.user_liked ? 'active-like' : ''}" data-post-id="${post.id}">
          ♥ <span class="like-count">${post.like_count || 0}</span> Likes
        </button>
        <button type="button" class="action-btn share-btn"><span class="share-count">${post.share_count || 0}</span> Share</button>
        <button type="button" class="action-btn report-btn">Report</button>
      </div>
      <div class="comments-section" style="margin-top:12px; border-top:1px solid var(--border-color); padding-top:10px;">
        <button type="button" class="action-btn comments-toggle">${post.comment_count || 0} Comments</button>
        <div class="comments-list" hidden></div>
        <form class="comment-form" hidden style="display:flex; gap:8px; margin-top:8px;">
          <label class="sr-only" for="comment-${post.id}">Add a comment</label>
          <input id="comment-${post.id}" class="form-control" placeholder="Add a comment..." maxlength="2000" required>
          <button class="btn btn-primary" type="submit">Post</button>
        </form>
      </div>
    `;

    // Add Like Click Event Listener
    const likeBtn = card.querySelector('.action-btn');
    likeBtn.addEventListener('click', () => toggleLike(post.id, likeBtn));
    card.querySelector('.share-btn').addEventListener('click', async (event) => {
      try { const result = await api.request(`/posts/${post.id}/share`, { method: 'POST' }); event.currentTarget.querySelector('.share-count').textContent = result.shareCount; event.currentTarget.disabled = true; } catch (error) { showAlert(error.message || 'Unable to share post.'); }
    });
    card.querySelector('.report-btn').addEventListener('click', async () => {
      const explanation = window.prompt('Optional report explanation:') || '';
      try { await api.request('/reports', { method: 'POST', body: JSON.stringify({ targetType: 'post', targetId: post.id, reason: 'other', explanation }) }); showAlert('Report submitted.', 'success'); } catch (error) { showAlert(error.message || 'Unable to submit report.'); }
    });
    const commentsToggle = card.querySelector('.comments-toggle');
    const commentsList = card.querySelector('.comments-list');
    const commentForm = card.querySelector('.comment-form');
    commentsToggle.addEventListener('click', async () => {
      commentsList.hidden = false; commentForm.hidden = false; commentsList.textContent = 'Loading comments...';
      try {
        const comments = await api.request(`/posts/${post.id}/comments`); commentsList.innerHTML = comments.length ? comments.map((comment) => `<p style="font-size:13px; margin:8px 0;"><strong>${escapeHtml(`${comment.first_name} ${comment.last_name}`)}</strong> ${escapeHtml(comment.content)} ${Number(comment.author_id) === Number(currentUser.id) ? `<button type="button" class="edit-comment action-btn" data-id="${comment.id}" data-content="${escapeHtml(comment.content)}">Edit</button><button type="button" class="delete-comment action-btn" data-id="${comment.id}">Delete</button>` : ''}</p>`).join('') : '<p style="font-size:13px; color:var(--text-muted);">No comments yet. Be the first to comment.</p>';
        commentsList.querySelectorAll('.edit-comment').forEach((button) => button.addEventListener('click', async () => { const content = window.prompt('Edit comment:', button.dataset.content); if (content && content.trim()) { await api.request(`/posts/comments/${button.dataset.id}`, { method: 'PUT', body: JSON.stringify({ content: content.trim() }) }); commentsToggle.click(); } }));
        commentsList.querySelectorAll('.delete-comment').forEach((button) => button.addEventListener('click', async () => { if (window.confirm('Delete this comment?')) { await api.request(`/posts/comments/${button.dataset.id}`, { method: 'DELETE' }); commentsToggle.click(); } }));
      } catch (error) { commentsList.textContent = error.message || 'Unable to load comments.'; }
    });
    commentForm.addEventListener('submit', async (event) => {
      event.preventDefault(); const input = commentForm.querySelector('input');
      try { await api.request(`/posts/${post.id}/comments`, { method: 'POST', body: JSON.stringify({ content: input.value.trim() }) }); input.value = ''; commentsToggle.click(); } catch (error) { showAlert(error.message || 'Unable to add comment.'); }
    });

    return card;
  };

  // Escape HTML to prevent XSS
  const escapeHtml = (str) => {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Toggle Like Handler
  const toggleLike = async (postId, buttonEl) => {
    const likeCountSpan = buttonEl.querySelector('.like-count');
    let currentLikes = parseInt(likeCountSpan.textContent, 10) || 0;
    const isLiked = buttonEl.classList.contains('active-like');

    // Optimistic UI Update
    if (isLiked) {
      buttonEl.classList.remove('active-like');
      likeCountSpan.textContent = Math.max(0, currentLikes - 1);
    } else {
      buttonEl.classList.add('active-like');
      likeCountSpan.textContent = currentLikes + 1;
    }

    try {
      await api.request(`/posts/${postId}/like`, { method: 'POST' });
    } catch (err) {
      // Revert on error
      if (isLiked) {
        buttonEl.classList.add('active-like');
        likeCountSpan.textContent = currentLikes;
      } else {
        buttonEl.classList.remove('active-like');
        likeCountSpan.textContent = currentLikes;
      }
    }
  };

  // Load All Posts from API
  const loadFeedPosts = async () => {
    try {
      const posts = await api.request('/posts');
      feedContainer.innerHTML = '';

      if (!posts || posts.length === 0) {
        feedContainer.innerHTML = `
          <div style="text-align: center; padding: 40px; background: var(--card-bg); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <h4 style="color: var(--primary-navy); margin-bottom: 6px;">No posts yet</h4>
            <p style="color: var(--text-muted); font-size: 13px;">Be the first to share an update with the district!</p>
          </div>
        `;
        return;
      }

      posts.forEach(post => {
        feedContainer.appendChild(createPostCardElement(post));
      });
    } catch (err) {
      feedContainer.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--color-error);">
          Failed to load feed posts. Please check your connection and refresh.
        </div>
      `;
    }
  };

  loadFeedPosts();
});