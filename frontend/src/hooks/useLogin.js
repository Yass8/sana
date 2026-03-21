// src/hooks/useLogin.js
import { useMutation }  from '@tanstack/react-query'
import { useNavigate }  from 'react-router-dom'
import { useAuth }      from '../context/AuthContext'
import { authApi }      from '../api/auth.api'

export function useLogin() {
  const { login }  = useAuth()
  const navigate   = useNavigate()

  return useMutation({
    mutationFn: (credentials) => authApi.login(credentials),

    onSuccess: (data) => {
      // data = { token, user } retourné par Express
      login(data.user, data.token)
      navigate('/dashboard', { replace: true })
    },

    onError: (err) => {
      console.error('Login error:', err)
    },
  })
}