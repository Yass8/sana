// src/api/shipments.api.js
import api from './axios'

export const shipmentsApi = {
  getAll:       (params) => api.get('/shipments', { params }),
  getById:      (id)     => api.get(`/shipments/${id}`),
  create:       (data)   => api.post('/shipments', data),
  updateStatus: (id, data) => api.patch(`/shipments/${id}/status`, data),
}