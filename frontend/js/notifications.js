document.addEventListener('DOMContentLoaded', () => {
  if (!api.getToken() || !api.getCurrentUser()) { window.location.href = 'login.html'; return; }
  const container = document.getElementById('notificationsContainer');
  const alert = document.getElementById('notificationAlert');
  const load = async () => {
    try {
      const data = await api.request('/notifications');
      if (!data.notifications.length) { container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">No notifications. You\'re all caught up.</div>'; return; }
      container.innerHTML = data.notifications.map((item) => `<article class="notification-card ${item.is_read ? 'is-read' : 'is-unread'}"><span class="notification-icon" aria-hidden="true">${item.is_read ? '✓' : '•'}</span><div class="notification-copy"><p>${escapeHtml(item.message)}</p><time>${new Date(item.created_at).toLocaleString()}</time></div>${item.is_read ? '' : `<button class="btn btn-outline mark-read" data-id="${item.id}">Mark read</button>`}</article>`).join('');
      container.querySelectorAll('.mark-read').forEach((button) => button.addEventListener('click', async () => { await api.request(`/notifications/${button.dataset.id}/read`, { method: 'PATCH' }); load(); }));
    } catch (error) { container.innerHTML = ''; alert.textContent = error.message || 'Unable to load notifications.'; alert.style.display = 'block'; }
  };
  document.getElementById('readAllBtn').addEventListener('click', async () => { await api.request('/notifications/read-all', { method: 'PATCH' }); load(); });
  const escapeHtml = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  load();
});