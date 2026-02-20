import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

// Durée d'inactivité avant déconnexion (minutes). 0 = désactivé. Définir VITE_SESSION_IDLE_MINUTES pour override.
const SESSION_IDLE_MINUTES = Number(import.meta.env.VITE_SESSION_IDLE_MINUTES) || 30

/** Retourne l'horodatage d'expiration du JWT (ms) ou null si invalide */
function getTokenExpiry(token) {
  if (!token || typeof token !== 'string') return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

/** true si le token est expiré (ou expire dans les 10 secondes) */
function isTokenExpired(token) {
  const exp = getTokenExpiry(token)
  if (exp == null) return true
  return Date.now() >= exp - 10000
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const idleTimeoutRef = useRef(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    if (isTokenExpired(token)) {
      localStorage.removeItem('token')
      setLoading(false)
      return
    }
    try {
      const response = await api.get('/auth/me')
      setUser(response.data.user)
    } catch (error) {
      localStorage.removeItem('token')
    }
    setLoading(false)
  }

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', response.data.token)
    setUser(response.data.user)
    return response.data
  }

  const loginWithToken = useCallback(async (token) => {
    localStorage.setItem('token', token)
    try {
      const response = await api.get('/auth/me')
      setUser(response.data.user)
    } catch (error) {
      localStorage.removeItem('token')
      throw error
    }
  }, [])

  const register = async (data) => {
    const response = await api.post('/auth/register', data)
    localStorage.setItem('token', response.data.token)
    setUser(response.data.user)
    return response.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const updateUser = (userData) => {
    setUser(userData)
  }

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const response = await api.get('/auth/me')
      setUser(response.data.user)
    } catch {
      // Keep current user on error (e.g. token expired will be handled on next nav)
    }
  }, [])

  // Vérification périodique de l'expiration du token (toutes les 60 s)
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      const token = localStorage.getItem('token')
      if (!token || isTokenExpired(token)) {
        localStorage.removeItem('token')
        setUser(null)
        window.location.href = '/login'
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [user])

  // Déconnexion après inactivité (optionnel, si SESSION_IDLE_MINUTES > 0)
  useEffect(() => {
    if (!user || SESSION_IDLE_MINUTES <= 0) return

    const scheduleIdleLogout = () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = setTimeout(() => {
        localStorage.removeItem('token')
        setUser(null)
        window.location.href = '/login'
      }, SESSION_IDLE_MINUTES * 60 * 1000)
    }

    scheduleIdleLogout()
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((ev) => window.addEventListener(ev, scheduleIdleLogout))
    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
      events.forEach((ev) => window.removeEventListener(ev, scheduleIdleLogout))
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithToken, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
