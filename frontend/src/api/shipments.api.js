// src/api/shipments.api.js
import api from './axios'
export const shipmentsApi = {
  getAll:  (p)    => api.get('/shipments', { params: p }),
  getById: (id)   => api.get(`/shipments/${id}`),
  create:  (data) => api.post('/shipments', data),
}