import { io } from 'socket.io-client'

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
