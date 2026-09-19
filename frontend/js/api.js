/* YouthSphere API Client Helper */

const api = {
  getToken() {
    return localStorage.getItem('youthsphere_token');
  },

  setSession(token, user) {
    localStorage.setItem('youthsphere_token', token);
    localStorage.setItem('youthsphere_user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('youthsphere_token');
    localStorage.removeItem('youthsphere_user');
  },

  async logout() {
    const token = this.getToken();
    if (token) await this.request('/auth/logout', { method: 'POST' }).catch(() => {});
    this.clearSession();
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('youthsphere_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    const url = `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && !endpoint.startsWith('/auth/')) {
        this.clearSession();
        if (window.location.pathname !== '/login') window.location.href = '/login';
      }
      throw new Error(data.message || `Request failed with status ${response.status}.`);
    }

    return data;
  }
};