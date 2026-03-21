// src/api/auth.api.js
import api from './axios'

export const authApi = {
  login:    (credentials) => api.post('/auth/login',    credentials),
  register: (data)        => api.post('/auth/register', data),
  logout:   ()            => api.post('/auth/logout'),
  me:       ()            => api.get('/auth/me'),
}