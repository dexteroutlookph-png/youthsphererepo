/* YouthSphere District Announcements Controller */

document.addEventListener('DOMContentLoaded', () => {
  // Session Check
  const currentUser = api.getCurrentUser();
  if (!api.getToken() || !currentUser) {
    window.location.href = 'login.html';
    return;
  }

  const logoutBtn = document.getElementById('logoutBtn');
  const announcementsContainer = document.getElementById('announcementsContainer');
  const announcementSearch = document.getElementById('announcementSearch');
  const filterPills = document.querySelectorAll('.filter-pill');
  const createAnnouncementBtn = document.getElementById('createAnnouncementBtn');
  const announcementComposerModal = document.getElementById('announcementComposerModal');
  const announcementForm = document.getElementById('announcementForm');
  const publishAnnouncementBtn = document.getElementById('publishAnnouncementBtn');
  const announcementFormAlert = document.getElementById('announcementFormAlert');
  const announcementAdminAlert = document.getElementById('announcementAdminAlert');

  let rawAnnouncements = [];
  let activeCategory = 'ALL';

  if (String(currentUser.role || '').toLowerCase() === 'admin') {
    createAnnouncementBtn.hidden = false;
  }

  // Logout Handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await api.logout();
      window.location.href = 'login.html';
    });
  }

  const closeAnnouncementComposer = () => {
    announcementComposerModal.classList.remove('active');
    announcementForm.reset();
    announcementFormAlert.hidden = true;
    announcementFormAlert.textContent = '';
  };

  createAnnouncementBtn.addEventListener('click', () => announcementComposerModal.classList.add('active'));
  document.getElementById('closeAnnouncementComposer').addEventListener('click', closeAnnouncementComposer);
  document.getElementById('cancelAnnouncementComposer').addEventListener('click', closeAnnouncementComposer);

  announcementForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const imageFile = document.getElementById('announcementImage').files[0];
    let mediaBase64 = null;

    if (imageFile) {
      if (!imageFile.type.startsWith('image/') || imageFile.size > 20 * 1024 * 1024) {
        announcementFormAlert.textContent = 'Choose an image smaller than 20 MB.';
        announcementFormAlert.hidden = false;
        return;
      }
      try {
        mediaBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Unable to read the selected image.'));
          reader.readAsDataURL(imageFile);
        });
      } catch (error) {
        announcementFormAlert.textContent = error.message;
        announcementFormAlert.hidden = false;
        return;
      }
    }

    publishAnnouncementBtn.disabled = true;
    publishAnnouncementBtn.textContent = 'Publishing...';
    try {
      const announcement = await api.request('/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title: document.getElementById('announcementTitle').value.trim(),
          content: document.getElementById('announcementContent').value.trim(),
          category: document.getElementById('announcementCategory').value,
          isPinned: document.getElementById('announcementPinned').checked,
          mediaBase64
        })
      });
      rawAnnouncements.unshift(announcement);
      announcementSearch.value = '';
      activeCategory = 'ALL';
      filterPills.forEach((pill) => pill.classList.toggle('active', pill.dataset.category === 'ALL'));
      renderAnnouncements();
      closeAnnouncementComposer();
      announcementAdminAlert.textContent = 'Announcement published.';
      announcementAdminAlert.hidden = false;
    } catch (error) {
      announcementFormAlert.textContent = error.message || 'Unable to publish announcement.';
      announcementFormAlert.hidden = false;
    } finally {
      publishAnnouncementBtn.disabled = false;
      publishAnnouncementBtn.textContent = 'Publish';
    }
  });

  // Fetch Announcements from API
  const loadAnnouncements = async () => {
    try {
      rawAnnouncements = await api.request('/announcements');
      renderAnnouncements();
    } catch (err) {
      announcementsContainer.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--color-error);">
          Failed to load district announcements. Please refresh the page.
        </div>
      `;
    }
  };

  // Filter and Render Announcements
  const renderAnnouncements = () => {
    const searchTerm = announcementSearch ? announcementSearch.value.toLowerCase().trim() : '';

    const filtered = rawAnnouncements.filter(item => {
      const matchesCategory = (activeCategory === 'ALL') || 
        (item.category && item.category.toUpperCase() === activeCategory);

      const matchesSearch = !searchTerm || 
        item.title.toLowerCase().includes(searchTerm) || 
        item.content.toLowerCase().includes(searchTerm);

      return matchesCategory && matchesSearch;
    });

    announcementsContainer.innerHTML = '';

    if (filtered.length === 0) {
      announcementsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; background: var(--card-bg); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <h4 style="color: var(--primary-navy); margin-bottom: 6px;">No announcements found</h4>
          <p style="color: var(--text-muted); font-size: 13px;">There are no notices matching your selected criteria.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(item => {
      announcementsContainer.appendChild(createAnnouncementCard(item));
    });
  };

  // Build Announcement Card Component
  const createAnnouncementCard = (item) => {
    const card = document.createElement('div');
    card.className = `post-card announcement-card${item.is_pinned ? ' is-pinned' : ''}`;

    const categoryTag = item.category ? String(item.category).toUpperCase() : 'GENERAL';
    const categoryClass = categoryTag.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const publishedDate = new Date(item.created_at || Date.now()).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const pinnedBadge = item.is_pinned 
      ? '<span class="announcement-pinned">PINNED</span>'
      : '';

    card.innerHTML = `
      <div class="announcement-copy">
        <div class="announcement-meta">
          <div>${pinnedBadge}<span class="announcement-category announcement-category--${categoryClass}">${escapeHtml(categoryTag)}</span></div>
          <time>${publishedDate}</time>
        </div>
        <h2>${escapeHtml(item.title)}</h2>
        <p class="announcement-content">${escapeHtml(item.content)}</p>
        <div class="announcement-byline"><span class="announcement-author-dot">${escapeHtml((item.author_name || 'ISIED').slice(0, 1).toUpperCase())}</span><span>${escapeHtml(item.author_name || 'ISIED Executive Committee')}</span></div>
      </div>
      <div class="announcement-art announcement-art--${categoryClass}">${item.media_url ? `<img src="${escapeHtml(item.media_url)}" alt="Announcement media">` : `<span>${escapeHtml(categoryTag)}</span>`}</div>
    `;

    return card;
  };

  // Sanitization
  const escapeHtml = (str) => {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Category Filter Pills Toggle
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-category');
      renderAnnouncements();
    });
  });

  // Search Bar Real-time Listener
  if (announcementSearch) {
    announcementSearch.addEventListener('input', renderAnnouncements);
  }

  loadAnnouncements();
});