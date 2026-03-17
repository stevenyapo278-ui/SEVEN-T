import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import api from '../services/api'

const PartnerAuthContext = createContext(null)

export function PartnerAuthProvider({ children }) {
  const [partner, setPartner] = useState(null)
  const [loading, setLoading] = useState(true)
  const idleTimeoutRef = useRef(null)

  useEffect(() => {
    const path = window.location?.pathname || ''
    const isPartnerRoute = path === '/partner' || path.startsWith('/partner/')

    if (!isPartnerRoute) {
      setLoading(false)
      setPartner(null)
      return
    }

    checkPartnerAuth()
  }, [])

  const checkPartnerAuth = async () => {
    try {
      const response = await api.get('/partner/auth/me')
      if (response.data.user) {
        setPartner(response.data.user)
      } else {
        setPartner(null)
      }
    } catch (error) {
      setPartner(null)
    }
    setLoading(false)
  }

  const loginPartner = async (email, password) => {
    const response = await api.post('/partner/auth/login', { email, password })
    setPartner(response.data.user)
    return response.data
  }

  const logoutPartner = async () => {
    try {
      await api.post('/partner/auth/logout')
    } catch (e) {
      console.warn('Logout error:', e)
    }
    setPartner(null)
  }

  return (
    <PartnerAuthContext.Provider value={{ partner, loading, loginPartner, logoutPartner, checkPartnerAuth }}>
      {children}
    </PartnerAuthContext.Provider>
  )
}

export function usePartnerAuth() {
  const context = useContext(PartnerAuthContext)
  if (!context) {
    throw new Error('usePartnerAuth must be used within a PartnerAuthProvider')
  }
  return context
}
