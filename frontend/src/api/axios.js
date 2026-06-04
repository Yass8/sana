// src/api/axios.js
import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 10000 })

const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password']

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  const isPublic = PUBLIC_ROUTES.some(route => config.url?.includes(route))
  
  if (token && !isPublic) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const isPublic = PUBLIC_ROUTES.some(route => err.config?.url?.includes(route))
    
    if (err.response?.status === 401 && !isPublic) {
      localStorage.clear()
      window.location.href = '/login'
    }
    
    return Promise.reject(err.response?.data ?? err)
  }
)

export default api