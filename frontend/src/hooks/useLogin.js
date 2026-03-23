// src/hooks/useLogin.js
import { useMutation }  from '@tanstack/react-query'
import { useNavigate }  from 'react-router-dom'
import { useAuth }      from '../context/AuthContext'
import { authApi }      from '../api/auth.api'

export function useLogin() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  return useMutation({
    mutationFn: (creds) => authApi.login(creds),
    onSuccess:  (data)  => { login(data.user, data.token); navigate('/dashboard', { replace: true }) },
  })
}