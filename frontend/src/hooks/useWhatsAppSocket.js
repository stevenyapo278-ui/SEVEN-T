import { getSocket } from '../services/socket'

/**
 * Subscribe to real-time WhatsApp connection updates via WebSocket.
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

    const socket = getSocket()
    if (!socket.connected) socket.connect()

    setConnected(socket.connected)

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    
    // Handlers
    const statusHandler = (payload) => onStatusRef.current?.(payload)
    const qrHandler = (payload) => onQRRef.current?.(payload)

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('whatsapp:status', statusHandler)
    socket.on('whatsapp:qr', qrHandler)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('whatsapp:status', statusHandler)
      socket.off('whatsapp:qr', qrHandler)
    }
  }, [user])

  return { connected }
}
