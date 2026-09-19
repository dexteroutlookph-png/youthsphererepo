document.addEventListener('DOMContentLoaded', () => {
  if (!api.getToken() || !api.getCurrentUser()) { window.location.href = '/login'; return; }
  const container = document.getElementById('notificationsContainer');
  const alert = document.getElementById('notificationAlert');
  const load = async () => {
    try {
      const data = await api.request('/notifications');
      if (!data.notifications.length) { container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">No notifications. You\'re all caught up.</div>'; return; }
      container.innerHTML = data.notifications.map((item) => `<article class="post-card" style="padding:14px;margin-bottom:10px;opacity:${item.is_read ? '0.7' : '1'}"><p style="margin:0 0 6px;">${escapeHtml(item.message)}</p><time style="font-size:12px;color:var(--text-muted);">${new Date(item.created_at).toLocaleString()}</time>${item.is_read ? '' : `<button class="btn btn-outline mark-read" data-id="${item.id}" style="float:right;font-size:12px;padding:4px 8px;">Mark read</button>`}</article>`).join('');
      container.querySelectorAll('.mark-read').forEach((button) => button.addEventListener('click', async () => { await api.request(`/notifications/${button.dataset.id}/read`, { method: 'PATCH' }); load(); }));
    } catch (error) { container.innerHTML = ''; alert.textContent = error.message || 'Unable to load notifications.'; alert.style.display = 'block'; }
  };
  document.getElementById('readAllBtn').addEventListener('click', async () => { await api.request('/notifications/read-all', { method: 'PATCH' }); load(); });
  document.getElementById('logoutBtn').addEventListener('click', async () => { await api.logout(); window.location.href = '/login'; });
  const escapeHtml = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  load();
});