import { useEffect, useRef, useCallback, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../contexts/AuthContext'

// Shared socket so React Strict Mode's unmount/remount doesn't disconnect
let sharedSocket = null
let subscriberCount = 0
let pendingDisconnectId = null

const DISCONNECT_DELAY_MS = 100

/**
 * Subscribe to real-time WhatsApp connection updates via WebSocket.
 * Calls onStatus(status) and onQR(qr) when received.
 * @param {object} callbacks - { onStatus, onQR }
 */
export function useWhatsAppSocket({ onStatus, onQR }) {
  const { user } = useAuth()
  const [connected, setConnected] = useState(false)
  
  const onStatusRef = useRef(onStatus)
  const onQRRef = useRef(onQR)
  
  useEffect(() => {
    onStatusRef.current = onStatus
    onQRRef.current = onQR
  }, [onStatus, onQR])

  useEffect(() => {
    if (!user) return

    if (pendingDisconnectId) {
      clearTimeout(pendingDisconnectId)
      pendingDisconnectId = null
    }

    if (!sharedSocket) {
      const baseUrl = window.location.origin
      sharedSocket = io(baseUrl, {
        path: '/socket.io',
        withCredentials: true,
        transports: ['websocket', 'polling']
      })
      sharedSocket.on('connect_error', () => setConnected(false))
    }

    const socket = sharedSocket
    subscriberCount += 1
    if (socket.connected) setConnected(true)

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    
    // Status handler
    const statusHandler = (payload) => {
        if (onStatusRef.current) onStatusRef.current(payload)
    }

    // QR handler
    const qrHandler = (payload) => {
        if (onQRRef.current) onQRRef.current(payload)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('whatsapp:status', statusHandler)
    socket.on('whatsapp:qr', qrHandler)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('whatsapp:status', statusHandler)
      socket.off('whatsapp:qr', qrHandler)
      
      subscriberCount -= 1
      if (subscriberCount <= 0) {
        subscriberCount = 0
        pendingDisconnectId = setTimeout(() => {
          pendingDisconnectId = null
          if (sharedSocket) {
            sharedSocket.disconnect()
            sharedSocket = null
          }
        }, DISCONNECT_DELAY_MS)
      }
    }
  }, [user])

  return { connected }
}
