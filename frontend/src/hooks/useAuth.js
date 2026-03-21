// src/hooks/useLogin.js
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/auth.api'

export function useLogin() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  return useMutation({
    mutationFn: (credentials) => authApi.login(credentials),

    onSuccess: ({ user, token }) => {
      login(user, token)          // stocke dans AuthContext + localStorage
      navigate('/dashboard', { replace: true })
    },

    // L'erreur est accessible via mutation.error dans le composant
  })
}