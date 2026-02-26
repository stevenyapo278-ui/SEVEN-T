import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

/**
 * Subscribe to real-time conversation updates via WebSocket.
 * When the backend emits conversation:update (e.g. new message), onUpdate(conversationId) is called.
 * Polling can be reduced or kept as fallback when socket is disconnected.
 */
export function useConversationSocket(onUpdate) {
  const socketRef = useRef(null)
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  const stableOnUpdate = useCallback((payload) => {
    if (payload?.conversationId) onUpdateRef.current?.(payload.conversationId)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const baseUrl = window.location.origin
    const socket = io(baseUrl, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling']
    })
    socketRef.current = socket

    socket.on('conversation:update', stableOnUpdate)
    socket.on('connect_error', () => {})

    return () => {
      socket.off('conversation:update', stableOnUpdate)
      socket.disconnect()
      socketRef.current = null
    }
  }, [stableOnUpdate])

  return { connected: !!socketRef.current?.connected }
}
