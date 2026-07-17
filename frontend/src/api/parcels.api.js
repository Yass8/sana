// src/api/parcels.api.js
import api from './axios'
export const parcelsApi = {
  getAll:       (p) => api.get('/parcels', { params: p }),
  getById:      (id) => api.get(`/parcels/${id}`),
  getByQRCode: (code) => api.get(`/parcels/track/${code}`),
  create:       (data) => api.post('/parcels', data),
  updateStatus: (id, data) => api.patch(`/parcels/${id}/status`, data),
  delete:      (id) => api.delete(`/parcels/${id}`),
  update:     (id, data) => api.put(`/parcels/${id}`, data),
  getDailyHistory: (params) => api.get('/parcels/daily-history', { params }),
}