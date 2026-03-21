// src/api/dashboard.api.js
import api from './axios'

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
}