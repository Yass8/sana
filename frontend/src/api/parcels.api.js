// src/api/parcels.api.js
import api from './axios'
export const parcelsApi = {
  getAll:       (p) => api.get('/parcels', { params: p }),
  getById:      (id) => api.get(`/parcels/${id}`),
  getByBarcode: (code) => api.get(`/parcels/track/${code}`),
  create:       (data) => api.post('/parcels', data),
  updateStatus: (id, data) => api.patch(`/parcels/${id}/status`, data),
}