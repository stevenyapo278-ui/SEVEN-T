import { useEffect, useRef, useCallback, useState } from 'react'
import { io } from 'socket.io-client'

// Shared socket so React Strict Mode's unmount/remount doesn't disconnect before connection is established
let sharedSocket = null
let subscriberCount = 0
let pendingDisconnectId = null

const DISCONNECT_DELAY_MS = 100

/**
 * Subscribe to real-time conversation updates via WebSocket.
 * When the backend emits conversation:update (e.g. new message), onUpdate(conversationId) is called.
 * Polling can be reduced or kept as fallback when socket is disconnected.
 */
export function useConversationSocket(onUpdate) {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  const stableOnUpdate = useCallback((payload) => {
    if (payload?.conversationId) onUpdateRef.current?.(payload.conversationId)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    if (pendingDisconnectId) {
      clearTimeout(pendingDisconnectId)
      pendingDisconnectId = null
    }

    if (!sharedSocket) {
      const baseUrl = window.location.origin
      sharedSocket = io(baseUrl, {
        path: '/socket.io',
        auth: { token },
        transports: ['websocket', 'polling']
      })
      sharedSocket.on('connect_error', () => {})
    }

    const socket = sharedSocket
    socketRef.current = socket
    subscriberCount += 1
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
  }, [stableOnUpdate])

  return { connected }
}
