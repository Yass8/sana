// src/api/agencies.api.js
import api from './axios'
export const agenciesApi = {
  getAll:  ()         => api.get('/agencies'),
  create:  (data)     => api.post('/agencies', data),
  update:  (id, data) => api.patch(`/agencies/${id}`, data),
  delete:  (id)      => api.delete(`/agencies/${id}`),
}