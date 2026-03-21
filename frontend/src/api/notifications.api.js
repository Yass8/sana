// src/api/notifications.api.js
import api from './axios'

export const notificationsApi = {
  getAll:  (params) => api.get('/notifications', { params }),
  getStats:()       => api.get('/notifications/stats'),
  retry:   (id)     => api.post(`/notifications/${id}/retry`),
  bulk:    (data)   => api.post('/notifications/bulk', data),
}