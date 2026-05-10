import { io } from 'socket.io-client'
import { useState, useEffect } from 'react'

let socket = null

export const getSocket = () => {
  if (!socket) {
    const baseUrl = window.location.origin
    socket = io(baseUrl, {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false // Connect manually when user is authenticated
    })
    
    socket.on('connect', () => console.log('[Socket] Connected'))
    socket.on('disconnect', () => console.log('[Socket] Disconnected'))
    socket.on('connect_error', (err) => console.error('[Socket] Connection error:', err))

    // Debug: Log all incoming events to console
    socket.onAny((eventName, ...args) => {
      console.log(`[Socket EVENT] ${eventName}:`, args)
    })
  }
  return socket
}

export const connectSocket = (token) => {
  const s = getSocket()
  if (token) {
    s.auth = { token }
  }
  if (!s.connected) {
    s.connect()
  }
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const useSocketStatus = () => {
  const [connected, setConnected] = useState(socket ? socket.connected : false)

  useEffect(() => {
    const s = getSocket()
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)

    setConnected(s.connected)

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
    }
  }, [])

  return connected
}
