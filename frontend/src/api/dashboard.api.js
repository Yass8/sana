// src/api/dashboard.api.js
import api from './axios'
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getQuickActions: () => api.get('/dashboard/quick-actions'),
}