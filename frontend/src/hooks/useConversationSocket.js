import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getSocket } from '../services/socket'

/**
 * Subscribe to real-time conversation updates via WebSocket.
 */
export function useConversationSocket(onUpdate) {
  const { user } = useAuth()
  const [connected, setConnected] = useState(false)
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  const stableOnUpdate = useCallback((payload) => {
    if (payload?.conversationId) onUpdateRef.current?.(payload.conversationId, payload.message, payload.metadata)
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
    socket.on('conversation:update', stableOnUpdate)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('conversation:update', stableOnUpdate)
    }
  }, [user, stableOnUpdate])

  return { connected }
}
