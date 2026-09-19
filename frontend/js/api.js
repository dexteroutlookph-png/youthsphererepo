/* YouthSphere API Client Helper */

const HOSTNAME = window.location.hostname || 'localhost';
const DEV_API_PORTS = [5001, 5000, 5002, 5003, 5004, 5005];
const isLocalDevelopment = ['localhost', '127.0.0.1', '0.0.0.0'].includes(HOSTNAME);
const configuredApiBase = window.YOUTHSPHERE_API_URL || '';

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

    let lastError = null;
    const apiUrls = configuredApiBase
      ? [`${configuredApiBase.replace(/\/$/, '')}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`]
      : isLocalDevelopment
      ? DEV_API_PORTS.map((port) => `http://${HOSTNAME}:${port}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`)
      : [`/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`];

    for (const url of apiUrls) {
      try {
        const response = await fetch(url, config);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const requestError = new Error(data.message || `Request failed with status ${response.status}.`);
          requestError.isApiResponse = true;
          throw requestError;
        }

        return data;
      } catch (error) {
        lastError = error;
        if (error.isApiResponse) {
          break;
        }
      }
    }

    throw lastError || new Error('Unable to reach the YouthSphere API.');
  }
};