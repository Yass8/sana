// src/api/users.api.js
import api from './axios'
export const usersApi = {
  getAll:   (p)       => api.get('/users', { params: p }),
  getById:  (id)      => api.get(`/users/${id}`),
  create:   (data)    => api.post('/users', data),
  update:   (id,data) => api.patch(`/users/${id}`, data),
  delete:   (id)     => api.delete(`/users/${id}`),
  desactivate: (id) => api.patch(`/users/${id}/desactivate`),
  sendBulk: (data)    => api.post('/notifications/bulk', data),
  updatePassword: (id, data) => api.put(`/users/${id}/update-password`, data),
}