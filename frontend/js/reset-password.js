document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('resetPasswordForm');
  const alertBox = document.getElementById('resetAlert');
  const button = document.getElementById('resetPasswordBtn');
  const token = new URLSearchParams(window.location.search).get('token');
  const show = (message, success = false) => { alertBox.style.display = 'block'; alertBox.textContent = message; alertBox.style.backgroundColor = success ? '#DEF7EC' : '#FDE8E8'; alertBox.style.color = success ? '#03543F' : '#9B1C1C'; };
  if (!token) { show('This password reset link is invalid or expired.'); form.querySelector('button').disabled = true; return; }
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const password = document.getElementById('newPassword').value; const confirmPassword = document.getElementById('confirmPassword').value;
    if (password !== confirmPassword || password.length < 6) { show('Passwords must match and contain at least 6 characters.'); return; }
    button.disabled = true; button.textContent = 'Updating...';
    try { await api.request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password, confirmPassword }) }); show('Password reset successfully. You can now sign in.', true); form.reset(); }
    catch (error) { show(error.message || 'This reset link is invalid or expired.'); }
    finally { button.disabled = false; button.textContent = 'Set new password'; }
  });
});