import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getSocket } from '../services/socket'

/**
 * Subscribe to real-time notifications via WebSocket.
 */
export function useNotificationSocket(onNewNotification) {
  const { user } = useAuth()
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

    const socket = getSocket()
    if (!socket.connected) socket.connect()

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
    }
  }, [user, stableOnNew])

  return { connected }
}
