/* YouthSphere Login Page Controller */

document.addEventListener('DOMContentLoaded', () => {
  // Redirect immediately if session token already exists
  if (api.getToken() && api.getCurrentUser()) {
    window.location.href = '/';
    return;
  }

  const loginForm = document.getElementById('loginForm');
  const identityInput = document.getElementById('identityInput');
  const passwordInput = document.getElementById('passwordInput');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const submitBtn = document.getElementById('submitBtn');
  const loginAlert = document.getElementById('loginAlert');

  // Toggle Password Field Visibility
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    togglePasswordBtn.textContent = isPassword ? 'Hide' : 'Show';
  });

  // Display alert messages in UI
  const showAlert = (message, type = 'error') => {
    loginAlert.style.display = 'block';
    loginAlert.textContent = message;
    
    if (type === 'error') {
      loginAlert.style.backgroundColor = '#FDE8E8';
      loginAlert.style.color = '#9B1C1C';
      loginAlert.style.border = '1px solid #F8B4B4';
    } else {
      loginAlert.style.backgroundColor = '#DEF7EC';
      loginAlert.style.color = '#03543F';
      loginAlert.style.border = '1px solid #84E1BC';
    }
  };

  const hideAlert = () => {
    loginAlert.style.display = 'none';
  };

  // Handle Form Submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const usernameOrEmail = identityInput.value.trim();
    const password = passwordInput.value.trim();

    if (!usernameOrEmail || !password) {
      showAlert('Please fill in both username/email and password fields.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      const response = await api.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          usernameOrEmail,
          password
        })
      });

      if (response.token && response.user) {
        api.setSession(response.token, response.user);
        showAlert('Login successful! Redirecting...', 'success');
        
        setTimeout(() => {
          window.location.href = '/';
        }, 800);
      } else {
        throw new Error('Invalid response received from server.');
      }
    } catch (error) {
      showAlert(error.message || 'Unable to log in. Please check your credentials and try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
});