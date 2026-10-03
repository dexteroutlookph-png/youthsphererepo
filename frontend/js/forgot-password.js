document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgotPasswordForm');
  const alertBox = document.getElementById('resetAlert');
  const button = document.getElementById('resetRequestBtn');
  const show = (message, success = false) => { alertBox.style.display = 'block'; alertBox.textContent = message; alertBox.style.backgroundColor = success ? '#DEF7EC' : '#FDE8E8'; alertBox.style.color = success ? '#03543F' : '#9B1C1C'; };
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); button.disabled = true; button.textContent = 'Requesting...';
    try {
      await api.request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: document.getElementById('resetEmail').value.trim() }) });
      let emailConfigured = true;
      try {
        const health = await api.request('/health');
        emailConfigured = health.configuration?.passwordResetEmail !== false;
      } catch (error) {}
      if (emailConfigured) show('If an account matches that email, reset instructions will be sent.', true);
      else show('Password reset email is currently unavailable. Please contact your district administrator.');
    }
    catch (error) { show(error.message || 'Unable to request a reset right now.'); }
    finally { button.disabled = false; button.textContent = 'Request reset link'; }
  });
});