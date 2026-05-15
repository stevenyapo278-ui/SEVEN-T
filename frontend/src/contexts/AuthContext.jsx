import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

/** Décode les entités HTML pour l'affichage (ex: données déjà stockées avec &#039;) */
function decodeHtmlEntities(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function decodeUser(u) {
  if (!u) return u
  return {
    ...u,
    name: u.name ? decodeHtmlEntities(u.name) : u.name,
    company: u.company ? decodeHtmlEntities(u.company) : u.company
  }
}

// Durée d'inactivité avant déconnexion (minutes). 0 = désactivé.
const SESSION_IDLE_MINUTES = Number(import.meta.env.VITE_SESSION_IDLE_MINUTES) || 30

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const idleTimeoutRef = useRef(null)
  const didInitAuthCheckRef = useRef(false)

  useEffect(() => {
    // React StrictMode (dev) mounts effects twice; avoid duplicate /auth/me calls.
    if (didInitAuthCheckRef.current) return
    didInitAuthCheckRef.current = true
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me')
      if (response.data.user) {
        setUser(decodeUser(response.data.user))
        setIsAuthenticated(true)
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
    } catch (error) {
      setUser(null)
      setIsAuthenticated(false)
    }
    setLoading(false)
  }

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    setUser(decodeUser(response.data.user))
    setIsAuthenticated(Boolean(response.data.user))
    return response.data
  }

  const exchangeCode = useCallback(async (code) => {
    try {
      const response = await api.post('/auth/exchange-code', { code })
      setUser(decodeUser(response.data.user))
      setIsAuthenticated(Boolean(response.data.user))
      return response.data
    } catch (error) {
      throw error
    }
  }, [])

  const loginWithToken = useCallback(async (token) => {
    // Legacy support (if needed during migration)
    try {
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUser(decodeUser(response.data.user))
      setIsAuthenticated(Boolean(response.data.user))
      return response.data
    } catch (error) {
      throw error
    }
  }, [])

  const register = async (data) => {
    const response = await api.post('/auth/register', data)
    setUser(decodeUser(response.data.user))
    setIsAuthenticated(Boolean(response.data.user))
    return response.data
  }

  const logout = async (explicit = true) => {
    const isExplicit = explicit !== false;

    if (isExplicit) {
      window._isLoggingOut = true;
    }

    try {
      await api.post('/auth/logout')
    } catch (e) {
      console.warn('Logout error:', e)
    }

    if (isExplicit) {
      window.location.href = '/login';
      return;
    }

    setUser(null)
    setIsAuthenticated(false)
  }

  const updateUser = (userData) => {
    setUser(decodeUser(userData))
    setIsAuthenticated(Boolean(userData))
  }

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me')
      setUser(decodeUser(response.data.user))
      setIsAuthenticated(Boolean(response.data.user))
    } catch {
      // Keep current user on error
    }
  }, [])

  // Periodic check (optional with cookies)
  useEffect(() => {
    const interval = setInterval(() => {
      checkAuth()
    }, 5 * 60000) // Every 5 minutes

    const handleUnauthorized = () => {
      setUser(null);
      setIsAuthenticated(false)
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)

    return () => {
      clearInterval(interval)
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [])

  // Idle logout
  useEffect(() => {
    if (!user || SESSION_IDLE_MINUTES <= 0) return

    const scheduleIdleLogout = () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = setTimeout(() => {
        logout(false)
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
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, exchangeCode, loginWithToken, register, logout, updateUser, refreshUser }}>
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
