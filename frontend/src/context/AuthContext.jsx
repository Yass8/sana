// src/context/AuthContext.jsx
import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback((userData, token) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  const isRole = useCallback((...roles) => {
    return user ? roles.includes(user.role) : false
  }, [user])

  return (
    <AuthContext.Provider value={{ user, login, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être dans AuthProvider')
  return ctx
}