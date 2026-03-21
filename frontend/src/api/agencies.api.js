// src/api/agencies.api.js
import api from './axios'

export const agenciesApi = {
  getAll:  ()         => api.get('/agencies'),
  getById: (id)       => api.get(`/agencies/${id}`),
  create:  (data)     => api.post('/agencies', data),
  update:  (id, data) => api.patch(`/agencies/${id}`, data),
}