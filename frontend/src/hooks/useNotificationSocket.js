import { useEffect, useRef, useCallback, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../contexts/AuthContext'

let sharedSocket = null
let subscriberCount = 0
let pendingDisconnectId = null

const DISCONNECT_DELAY_MS = 100

/**
 * Subscribe to real-time notifications via WebSocket.
 */
export function useNotificationSocket(onNewNotification) {
  const { user } = useAuth()
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const onNewRef = useRef(onNewNotification)

  useEffect(() => {
    onNewRef.current = onNewNotification
  }, [onNewNotification])

  const stableOnNew = useCallback((notification) => {
    onNewRef.current?.(notification)
  }, [])

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
    socketRef.current = socket
    subscriberCount += 1
    setConnected(socket.connected)

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('notification:new', stableOnNew)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('notification:new', stableOnNew)
      
      subscriberCount -= 1
      socketRef.current = null
      
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
  }, [user, stableOnNew])

  return { connected }
}
