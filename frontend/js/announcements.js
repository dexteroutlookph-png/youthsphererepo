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

  let rawAnnouncements = [];
  let activeCategory = 'ALL';

  // Logout Handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await api.logout();
      window.location.href = 'login.html';
    });
  }

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
    card.className = 'post-card';
    
    if (item.is_pinned) {
      card.style.borderLeft = '4px solid #D97706';
    }

    const categoryTag = item.category ? item.category.toUpperCase() : 'GENERAL';
    const publishedDate = new Date(item.created_at || Date.now()).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const pinnedBadge = item.is_pinned 
      ? `<span style="background: #FEF3C7; color: #92400E; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 12px; margin-right: 6px;">PINNED</span>` 
      : '';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
        <div>
          ${pinnedBadge}
          <span style="background: #E0F2FE; color: #0369A1; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 12px;">${categoryTag}</span>
        </div>
        <span style="font-size: 12px; color: var(--text-muted);">${publishedDate}</span>
      </div>

      <h3 style="color: var(--primary-navy); margin-bottom: 8px; font-size: 18px; font-weight: 700;">${escapeHtml(item.title)}</h3>
      
      <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.6; white-space: pre-line;">${escapeHtml(item.content)}</p>

      ${item.media_url ? `<img src="${item.media_url}" style="max-width: 100%; border-radius: var(--radius-md); margin-top: 12px; border: 1px solid var(--border-color);" alt="Announcement Media">` : ''}

      <div style="margin-top: 14px; font-size: 12px; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 10px; display: flex; justify-content: space-between;">
        <span>Published by <strong>${escapeHtml(item.author_name || 'ISIED Executive Board')}</strong></span>
      </div>
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