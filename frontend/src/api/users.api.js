// src/api/users.api.js
import api from './axios'

export const usersApi = {
  getAll:    (params) => api.get('/users', { params }),
  getById:   (id)     => api.get(`/users/${id}`),
  update:    (id, data) => api.patch(`/users/${id}`, data),
  sendBulk:  (data)   => api.post('/notifications/bulk', data),
}