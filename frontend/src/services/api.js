import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  updateRole: (id, role) => api.put(`/auth/users/${id}/role`, { role }),
};

// Weather API calls
export const weatherApi = {
  getCurrent: () => api.get('/weather/current'),
  getHistorical: (hours = 24, limit = 100) =>
    api.get('/weather/historical', { params: { hours, limit } }),
  getStats: (hours = 24) =>
    api.get('/weather/stats', { params: { hours } }),
  getDevices: () => api.get('/weather/devices'),
};

// Alerts API calls
export const alertsApi = {
  getAll: () => api.get('/alerts'),
  getById: (id) => api.get(`/alerts/${id}`),
  create: (alert) => api.post('/alerts', alert),
  update: (id, alert) => api.put(`/alerts/${id}`, alert),
  delete: (id) => api.delete(`/alerts/${id}`),
  toggle: (id) => api.patch(`/alerts/${id}/toggle`),
  getHistory: (limit = 50) =>
    api.get('/alerts/history', { params: { limit } }),
};

// Forecast API calls
export const forecastApi = {
  get: () => api.get('/forecast'),
};

// Lake API calls
export const lakeApi = {
  get: () => api.get('/lake'),
  getHistorical: (hours = 168) => api.get(`/lake/historical?hours=${hours}&limit=500`),
  getFishingReport: () => api.get('/fishing'),
};

// Settings API calls
export const settingsApi = {
  getAll: () => api.get('/settings'),
  update: (settings) => api.put('/settings', settings),
  getStats: () => api.get('/settings/stats'),
  purge: (type) => api.post('/settings/purge', { type }),
};

// Lots API calls
export const lotsApi = {
  getAll: () => api.get('/lots'),
  update: (id, data) => api.put(`/lots/${id}`, data),
};

// Facebook API calls
export const facebookApi = {
  getFeed: () => api.get('/facebook/feed'),
  getEvents: () => api.get('/facebook/events'),
};

// Discussion API calls
export const discussionApi = {
  getAll: (category) => api.get('/discussions', { params: category && category !== 'all' ? { category } : {} }),
  create: (data) => api.post('/discussions', data),
  delete: (id) => api.delete(`/discussions/${id}`),
  pin: (id) => api.put(`/discussions/${id}/pin`),
  like: (id) => api.put(`/discussions/${id}/like`),
  getComments: (id) => api.get(`/discussions/${id}/comments`),
  addComment: (id, data) => api.post(`/discussions/${id}/comments`, data),
  deleteComment: (id, commentId) => api.delete(`/discussions/${id}/comments/${commentId}`),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;
