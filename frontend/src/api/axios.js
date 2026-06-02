import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 10000 })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    // 🔥 Ne redirige pas si la 401 vient de la tentative de connexion
    const isLoginAttempt = err.config?.url?.includes('/auth/login')
    if (err.response?.status === 401 && !isLoginAttempt) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err.response?.data ?? err)
  }
)

export default api