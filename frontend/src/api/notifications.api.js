// src/api/notifications.api.js
import api from './axios'
export const notificationsApi = {
  getAll:   (p)  => api.get('/notifications', { params: p }),
  getStats: ()   => api.get('/dashboard/notif-stats'),
  retry:    (id) => api.post(`/notifications/${id}/retry`),
}