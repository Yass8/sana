// src/api/axios.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',  // proxy Vite → localhost:3000/api
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err.response?.data ?? err)
  }
)

export default api