import api from './client';

// ─── Auth ──────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh-token'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, data) => api.patch(`/auth/reset-password/${token}`, data),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  changePassword: (data) => api.patch('/auth/change-password', data),
};

// ─── Users ─────────────────────────────────────────────
export const usersApi = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put('/users/me/profile', data),
  uploadAvatar: (formData) => api.post('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  getLoginHistory: (id) => api.get(`/users/${id}/login-history`),
};

// ─── Organizations ─────────────────────────────────────
export const orgsApi = {
  getAll: () => api.get('/organizations'),
  getOne: (id) => api.get(`/organizations/${id}`),
  create: (data) => api.post('/organizations', data),
  update: (id, data) => api.patch(`/organizations/${id}`, data),
  delete: (id) => api.delete(`/organizations/${id}`),
  getMembers: (id) => api.get(`/organizations/${id}/members`),
  addMember: (id, data) => api.post(`/organizations/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/organizations/${id}/members/${userId}`),
};

// ─── Projects ──────────────────────────────────────────
export const projectsApi = {
  getAll: (params) => api.get('/projects', { params }),
  getOne: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  archive: (id) => api.patch(`/projects/${id}/archive`),
  getStats: (id) => api.get(`/projects/${id}/stats`),
  getMembers: (id) => api.get(`/projects/${id}/members`),
  addMember: (id, data) => api.post(`/projects/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
  getBoardColumns: (id) => api.get(`/projects/${id}/board-columns`),
  updateBoardColumns: (id, data) => api.patch(`/projects/${id}/board-columns`, data),
};

// ─── Tasks ─────────────────────────────────────────────
export const tasksApi = {
  getAll: (params) => api.get('/tasks', { params }),
  getOne: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  move: (id, data) => api.patch(`/tasks/${id}/move`, data),
  logTime: (id, data) => api.post(`/tasks/${id}/time-logs`, data),
  toggleWatch: (id) => api.patch(`/tasks/${id}/watch`),
  bulkUpdate: (data) => api.patch('/tasks/bulk', data),
  getActivity: (id) => api.get(`/tasks/${id}/activity`),
};

// ─── Sprints ───────────────────────────────────────────
export const sprintsApi = {
  getAll: (params) => api.get('/sprints', { params }),
  getOne: (id) => api.get(`/sprints/${id}`),
  create: (data) => api.post('/sprints', data),
  update: (id, data) => api.put(`/sprints/${id}`, data),
  start: (id) => api.patch(`/sprints/${id}/start`),
  complete: (id, data) => api.patch(`/sprints/${id}/complete`, data),
  getTasks: (id, params) => api.get(`/sprints/${id}/tasks`, { params }),
  // Burndown endpoint is not available in backend routes yet.
};

// ─── Stories ───────────────────────────────────────────
export const storiesApi = {
  getAll: (params) => api.get('/stories', { params }),
  getOne: (id) => api.get(`/stories/${id}`),
  create: (data) => api.post('/stories', data),
  update: (id, data) => api.patch(`/stories/${id}`, data),
  delete: (id) => api.delete(`/stories/${id}`),
};

// ─── Comments ──────────────────────────────────────────
export const commentsApi = {
  getAll: (params) => api.get('/comments', { params }),
  create: (data) => api.post('/comments', data),
  update: (id, data) => api.patch(`/comments/${id}`, data),
  delete: (id) => api.delete(`/comments/${id}`),
};

// ─── Notifications ─────────────────────────────────────
export const notificationsApi = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

// ─── Search ────────────────────────────────────────────
export const searchApi = {
  global: (q) => api.get('/search', { params: { q } }),
};

// ─── Reports ───────────────────────────────────────────
export const reportsApi = {
  getSummary: (projectId) => api.get(`/reports/project/${projectId}/summary`),
  getVelocity: (projectId) => api.get(`/reports/project/${projectId}/velocity`),
  getWorkload: (projectId) => api.get(`/reports/project/${projectId}/workload`),
  getDashboard: () => api.get('/reports/dashboard'),
};

// ─── Feedback ──────────────────────────────────────────
export const feedbackApi = {
  getAll: (params) => api.get('/feedback', { params }),
  getOne: (id) => api.get(`/feedback/${id}`),
  submit: (data) => api.post('/feedback', data),
  update: (id, data) => api.patch(`/feedback/${id}`, data),
  delete: (id) => api.delete(`/feedback/${id}`),
  convertToStory: (id) => api.post(`/feedback/${id}/convert-to-story`),
};

// ─── Files ─────────────────────────────────────────────
export const filesApi = {
  upload: (formData) => api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/files/${id}`),
};

// ─── Settings ──────────────────────────────────────────
export const settingsApi = {
  get: () => api.get('/settings/organization'),
  update: (data) => api.put('/settings/organization', data),
};

// ─── Audit ─────────────────────────────────────────────
export const auditApi = {
  getAll: (params) => api.get('/audit', { params }),
};
