// src/api/bags.api.js
import api from './axios'
export const bagsApi = {
  getAll:    (p)    => api.get('/bags', { params: p }),
  getById:   (id)   => api.get(`/bags/${id}`),
  create:    (data) => api.post('/bags', data),
  close:     (id)   => api.patch(`/bags/${id}/close`),
  sendAlert: (id, data) => api.post(`/bags/${id}/alert`, data),
}