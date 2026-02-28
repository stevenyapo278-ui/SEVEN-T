import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useConfirm } from '../contexts/ConfirmContext'
import api, { sendToConversation, getNewConversationMessages, syncMessages, getMessagesWithPagination, deleteMessages } from '../services/api'
import { usePageTitle } from '../hooks/usePageTitle'
import { useTheme } from '../contexts/ThemeContext'
import { useConversationSocket } from '../hooks/useConversationSocket'
import Breadcrumbs from '../components/Breadcrumbs'
import { ArrowLeft, User, Bot, Phone, Calendar, Send, RefreshCw, Loader2, Edit2, Check, X, UserCircle, UserCheck, Sparkles, FileDown, Trash2, Square, CheckSquare } from 'lucide-react'
import toast from 'react-hot-toast'

// Cache for profile pictures (shared across all ProfileAvatar instances)
const profilePicCache = new Map()

// Message image: fetch with auth and display (for user-sent images)
function MessageImage({ conversationId, messageId }) {
  const [src, setSrc] = useState(null)
  const [error, setError] = useState(false)
  const blobUrlRef = useRef(null)

  useEffect(() => {
    if (!conversationId || !messageId) return
    setError(false)
    setSrc(null)
    api.get(`/conversations/${conversationId}/messages/${messageId}/media`, { responseType: 'blob' })
      .then((res) => {
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        const url = URL.createObjectURL(res.data)
        blobUrlRef.current = url
        setSrc(url)
      })
      .catch(() => setError(true))
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [conversationId, messageId])

  if (error) return <span className="text-xs text-gray-500">[Image non disponible]</span>
  if (!src) return <span className="text-xs text-gray-500">Chargement…</span>
  return (
    <img
      src={src}
      alt="Image reçue"
      className="rounded-lg max-w-full max-h-64 object-contain my-1"
    />
  )
}

// Assistant product image: fetch by path (e.g. /api/products/image/xxx.png) with auth
function AssistantMessageImage({ mediaUrl }) {
  const [src, setSrc] = useState(null)
  const [error, setError] = useState(false)
  const blobUrlRef = useRef(null)
  const path = mediaUrl?.replace(/^\/api\/?/, '') // baseURL is /api
  useEffect(() => {
    if (!path) return
    setError(false)
    setSrc(null)
    api.get(path, { responseType: 'blob' })
      .then((res) => {
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        const url = URL.createObjectURL(res.data)
        blobUrlRef.current = url
        setSrc(url)
      })
      .catch(() => setError(true))
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [path])
  if (error) return <span className="text-xs text-gray-500">[Image non disponible]</span>
  if (!src) return <span className="text-xs text-gray-500">Chargement…</span>
  return (
    <img
      src={src}
      alt="Photo produit"
      className="rounded-lg max-w-full max-h-64 object-contain my-1"
    />
  )
}

// Message audio: fetch with auth and play
function MessageAudio({ conversationId, messageId }) {
  const [src, setSrc] = useState(null)
  const [error, setError] = useState(false)
  const blobUrlRef = useRef(null)

  useEffect(() => {
    if (!conversationId || !messageId) return
    setError(false)
    setSrc(null)
    api.get(`/conversations/${conversationId}/messages/${messageId}/media`, { responseType: 'blob' })
      .then((res) => {
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        const url = URL.createObjectURL(res.data)
        blobUrlRef.current = url
        setSrc(url)
      })
      .catch(() => setError(true))
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [conversationId, messageId])

  if (error) return <span className="text-xs text-gray-500">[Audio non disponible]</span>
  if (!src) return <span className="text-xs text-gray-500">Chargement…</span>
  return (
    <audio
      controls
      src={src}
      className="w-full max-w-sm my-1"
    />
  )
}

// Profile Avatar component with profile picture support
function ProfileAvatar({ agentId, contactJid, name, size = 'md', className = '', profilePictureUrl }) {
  const [imageUrl, setImageUrl] = useState(profilePictureUrl || null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (profilePictureUrl) {
      setImageUrl(profilePictureUrl)
      setImageError(false)
    }
  }, [profilePictureUrl])

  useEffect(() => {
    if (agentId && contactJid) {
      const cacheKey = `${agentId}:${contactJid}`

      if (profilePictureUrl) {
        profilePicCache.set(cacheKey, { url: profilePictureUrl, timestamp: Date.now() })
        return
      }

      if (profilePicCache.has(cacheKey)) {
        const cached = profilePicCache.get(cacheKey)
        if (cached.url) setImageUrl(cached.url)
        return
      }

      api.get(`/whatsapp/profile-picture/${agentId}/${encodeURIComponent(contactJid)}`)
        .then(res => {
          profilePicCache.set(cacheKey, { url: res.data.url, timestamp: Date.now() })
          if (res.data.url) setImageUrl(res.data.url)
        })
        .catch(() => profilePicCache.set(cacheKey, { url: null, timestamp: Date.now() }))
    }
  }, [agentId, contactJid, profilePictureUrl])
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-14 h-14 text-lg'
  }
  
  const initials = name 
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'
  
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500']
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0
  const bgColor = colors[colorIndex]
  
  if (imageUrl && !imageError) {
    return (
      <img 
        src={imageUrl} 
        alt={name || 'Contact'}
        className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0 ${className}`}
        onError={() => setImageError(true)}
      />
    )
  }
  
  return (
    <div className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center flex-shrink-0 text-white font-medium ${className}`}>
      {initials}
    </div>
  )
}

// Format phone number for display
const formatPhoneNumber = (number) => {
  if (!number) return ''
  const digits = String(number).replace(/\D/g, '')
  if (!digits) return number

  if (digits.length === 11 && digits.startsWith('33')) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`
  } else if (digits.length === 12 && digits.startsWith('225')) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)} ${digits.slice(11)}`
  } else if (digits.length === 12 && digits.startsWith('224')) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)} ${digits.slice(11)}`
  } else if (digits.length >= 13 && digits.length <= 15 && digits.startsWith('224')) {
    const rest = digits.slice(3)
    const pairs = rest.match(/.{1,2}/g) || []
    return `+224 ${pairs.join(' ')}`
  } else if (digits.length >= 10 && digits.length <= 15) {
    const cc = digits.length > 10 ? digits.slice(0, -9) : ''
    const rest = digits.slice(-9)
    return cc ? `+${cc} ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5, 8)} ${rest.slice(8)}` : `+${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5, 8)} ${rest.slice(8)}`
  }
  return number
}

// Get the best display name for a contact
const getDisplayName = (conv) => {
  // Priority: saved_contact_name (from WhatsApp contacts) > contact_name > push_name > notify_name > verified_biz_name > phone number
  const isJustNumber = (name) => !name || /^\d+$/.test(name.replace(/\D/g, ''))
  
  if (conv.saved_contact_name && !isJustNumber(conv.saved_contact_name)) {
    return conv.saved_contact_name
  }
  if (conv.contact_name && !isJustNumber(conv.contact_name)) {
    return conv.contact_name
  }
  if (conv.push_name) return conv.push_name
  if (conv.notify_name) return conv.notify_name
  if (conv.verified_biz_name) return conv.verified_biz_name
  return conv.contact_number || 'Inconnu'
}

// Check if contact_name is just the phone number
const isNameJustNumber = (name, number) => {
  if (!name || !number) return true
  const cleanName = name.replace(/\D/g, '')
  const cleanNumber = number.replace(/\D/g, '')
  return cleanName === cleanNumber || name === number
}

export default function ConversationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const { showConfirm } = useConfirm()
  const { isDark } = useTheme()
  
  const hasConversionScore = user?.plan_features?.conversion_score

  useEffect(() => {
    refreshUser()
  }, [refreshUser])
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [lastPollTime, setLastPollTime] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [newContactName, setNewContactName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [humanTakeover, setHumanTakeover] = useState(false)
  const [togglingTakeover, setTogglingTakeover] = useState(false)
  const [messagesHasMore, setMessagesHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedMessageIds, setSelectedMessageIds] = useState(new Set())
  const [deletingMessages, setDeletingMessages] = useState(false)
  const [deletingConversation, setDeletingConversation] = useState(false)
  const messagesEndRef = useRef(null)
  const pollIntervalRef = useRef(null)
  const nameInputRef = useRef(null)
  const lastPollTimeRef = useRef(null) // Use ref to avoid stale closure
  const loadConversationRef = useRef(null)

  // Real-time: refetch messages when this conversation is updated
  useConversationSocket((convId) => { if (convId === id) loadConversationRef.current?.() })

  useEffect(() => {
    loadConversation()
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Start polling for new messages
  useEffect(() => {
    if (conversation && !loading) {
      let pollStopped = false
      const tick = async () => {
        if (!lastPollTimeRef.current || pollStopped) return
        try {
          const data = await getNewConversationMessages(id, lastPollTimeRef.current)
          if (data.messages && data.messages.length > 0) {
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id))
              const newMsgs = data.messages.filter(m => !existingIds.has(m.id))
              const merged = [...prev, ...newMsgs]
              merged.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
              return merged
            })
          }
          lastPollTimeRef.current = data.timestamp
          setLastPollTime(data.timestamp)
        } catch (error) {
          const status = error.response?.status
          if (status === 404 || status === 500) {
            pollStopped = true
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            if (status === 500) console.error('Polling stopped after server error (500)')
            return
          }
          console.error('Polling error:', error)
        }
      }
      pollIntervalRef.current = setInterval(tick, 3000)
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [conversation, loading, id])

  const loadConversation = async () => {
    try {
      const response = await api.get(`/conversations/${id}`)
      setConversation(response.data.conversation)
      setMessages(response.data.messages)
      setMessagesHasMore(response.data.messagesHasMore === true)
      setHumanTakeover(response.data.conversation?.human_takeover === 1)
      const now = new Date().toISOString()
      setLastPollTime(now)
      lastPollTimeRef.current = now // Update ref too
    } catch (error) {
      toast.error('Conversation non trouvée')
      navigate('/dashboard/conversations')
    } finally {
      setLoading(false)
    }
  }
  loadConversationRef.current = loadConversation

  const handleLoadOlderMessages = async () => {
    if (loadingMore || !messages.length || !messagesHasMore) return
    const oldestCreatedAt = messages[0].created_at
    setLoadingMore(true)
    try {
      const data = await getMessagesWithPagination(id, { before: oldestCreatedAt, limit: 50 })
      if (data.messages && data.messages.length > 0) {
        setMessages(prev => [...data.messages, ...prev])
      }
      if (data.hasMore === false) setMessagesHasMore(false)
    } catch (error) {
      toast.error('Impossible de charger les messages précédents')
    } finally {
      setLoadingMore(false)
    }
  }

  const toggleHumanTakeover = async () => {
    setTogglingTakeover(true)
    try {
      const newValue = !humanTakeover
      await api.post(`/conversations/${id}/human-takeover`, { enabled: newValue })
      setHumanTakeover(newValue)
      setConversation(prev => ({ ...prev, human_takeover: newValue ? 1 : 0 }))
      toast.success(newValue 
        ? 'Mode humain activé - L\'IA ne répondra plus automatiquement' 
        : 'Mode IA activé - L\'IA répondra automatiquement'
      )
    } catch (error) {
      toast.error('Erreur lors du changement de mode')
    } finally {
      setTogglingTakeover(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || sending || !conversation) return

    const messageText = input.trim()
    setInput('')
    setSending(true)

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const tempMessage = {
      id: tempId,
      role: 'assistant',
      content: messageText,
      created_at: new Date().toISOString(),
      sending: true
    }
    setMessages(prev => [...prev, tempMessage])

    try {
      const result = await sendToConversation(conversation.agent_id, id, messageText)
      
      // Replace temp message with real one
      setMessages(prev => prev.map(m => 
        m.id === tempId 
          ? { ...m, id: result.messageId, sending: false }
          : m
      ))
      
      toast.success('Message envoyé')
    } catch (error) {
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempId))
      toast.error(error.response?.data?.error || 'Erreur lors de l\'envoi')
    } finally {
      setSending(false)
    }
  }

  const handleSync = async () => {
    if (syncing || !conversation) return
    setSyncing(true)

    try {
      const result = await syncMessages(conversation.agent_id, id, 100)
      toast.success(result.message || 'Synchronisation terminée')
      // Reload conversation to get new messages
      await loadConversation()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la synchronisation')
    } finally {
      setSyncing(false)
    }
  }

  const toggleMessageSelection = (messageId) => {
    setSelectedMessageIds(prev => {
      const next = new Set(prev)
      if (next.has(messageId)) next.delete(messageId)
      else next.add(messageId)
      return next
    })
  }

  const selectAllMessages = () => {
    setSelectedMessageIds(new Set(messages.map(m => m.id)))
  }

  const handleDeleteSelection = async () => {
    if (selectedMessageIds.size === 0 || deletingMessages) return
    const ok = await showConfirm({
      title: 'Supprimer les messages sélectionnés',
      message: `Êtes-vous sûr de vouloir supprimer ${selectedMessageIds.size} message(s) ? Cette action est irréversible.`,
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    setDeletingMessages(true)
    try {
      const result = await deleteMessages(id, { message_ids: Array.from(selectedMessageIds) })
      toast.success(result.message || 'Messages supprimés')
      setSelectionMode(false)
      setSelectedMessageIds(new Set())
      await loadConversation()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression')
    } finally {
      setDeletingMessages(false)
    }
  }

  const handleDeleteAllMessages = async () => {
    if (messages.length === 0 || deletingMessages) return
    const ok = await showConfirm({
      title: 'Supprimer tous les messages',
      message: 'Supprimer tous les messages de cette conversation ? Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Tout supprimer'
    })
    if (!ok) return
    setDeletingMessages(true)
    try {
      const result = await deleteMessages(id, { delete_all: true })
      toast.success(result.message || 'Messages supprimés')
      setSelectionMode(false)
      setSelectedMessageIds(new Set())
      await loadConversation()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression')
    } finally {
      setDeletingMessages(false)
    }
  }

  const handleDeleteConversation = async () => {
    if (deletingConversation) return
    const ok = await showConfirm({
      title: 'Supprimer la conversation',
      message: 'Supprimer toute la conversation et tous les messages ? Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    setDeletingConversation(true)
    try {
      await api.delete(`/conversations/${id}`)
      toast.success('Conversation supprimée')
      navigate('/dashboard/conversations')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression')
    } finally {
      setDeletingConversation(false)
    }
  }

  const handleExportPdf = async () => {
    if (exportingPdf) return
    setExportingPdf(true)
    try {
      const response = await api.get(`/conversations/${id}/export/pdf`, { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const safeName = (conversation?.contact_name || conversation?.contact_number || 'conversation')
        .toString()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\w\-]/g, '')
      const link = document.createElement('a')
      link.href = url
      link.download = `conversation-${safeName || id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error('Erreur lors de l’export PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  const startEditingName = () => {
    const currentName = isNameJustNumber(conversation.contact_name, conversation.contact_number)
      ? ''
      : conversation.contact_name
    setNewContactName(currentName)
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.focus(), 100)
  }

  const cancelEditingName = () => {
    setEditingName(false)
    setNewContactName('')
  }

  const saveContactName = async () => {
    if (!newContactName.trim()) {
      toast.error('Veuillez entrer un nom')
      return
    }
    
    setSavingName(true)
    try {
      await api.put(`/conversations/${id}/contact`, { contact_name: newContactName.trim() })
      setConversation(prev => ({ ...prev, contact_name: newContactName.trim() }))
      toast.success('Nom du contact mis à jour')
      setEditingName(false)
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setSavingName(false)
    }
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {})

  const displayName = conversation ? getDisplayName(conversation) : 'Conversation'
  usePageTitle(`${displayName} – Conversations`)

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center min-h-64 py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 flex-shrink-0" aria-hidden />
      </div>
    )
  }

  const chatPattern = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2NDc0OGIiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTAgMDBoMTh2MThIMHoiLz48cGF0aCBkPSJNMjAgMjBoMTh2MThIMjB6Ii8+PC9nPjwvZz48L3N2Zz4="

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 min-w-0 pb-10">
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Conversations', href: '/dashboard/conversations' },
        { label: displayName }
      ]} />
      {/* Header - Sticky & Premium */}
      <div className={`sticky top-0 z-30 mb-4 sm:mb-6 rounded-2xl border transition-all duration-300 ${
        isDark ? 'bg-space-900/90 border-space-700/50' : 'bg-white/95 border-gray-200 shadow-sm'
      } backdrop-blur-xl`}>
        <div className="p-3 sm:p-4">
          <div className="flex flex-col gap-4">
            {/* Top Bar: Back & Actions */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => navigate('/dashboard/conversations')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                  isDark ? 'text-gray-400 hover:text-white hover:bg-space-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Retour</span>
              </button>
              
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-space-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                  title="Synchroniser"
                >
                  <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleExportPdf}
                  disabled={exportingPdf}
                  className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-space-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                  title="Exporter PDF"
                >
                  <FileDown className={`w-5 h-5 ${exportingPdf ? 'animate-pulse' : ''}`} />
                </button>
                <div className={`w-px h-6 mx-1 ${isDark ? 'bg-space-700' : 'bg-gray-200'}`} />
                <button
                  onClick={handleDeleteConversation}
                  disabled={deletingConversation}
                  className={`p-2 rounded-xl transition-all text-red-400 hover:bg-red-500/10`}
                  title="Supprimer la conversation"
                >
                  {deletingConversation ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Profile Bar */}
            <div className="flex items-center gap-3 sm:gap-4">
              <ProfileAvatar 
                agentId={conversation.agent_id}
                contactJid={conversation.contact_jid}
                name={getDisplayName(conversation)}
                profilePictureUrl={conversation.profile_picture}
                size="lg"
                className="ring-4 ring-gold-400/10"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-display font-bold text-gray-100 truncate">
                    {editingName ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={newContactName}
                          onChange={(e) => setNewContactName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveContactName()
                            if (e.key === 'Escape') setEditingName(false)
                          }}
                          className="bg-transparent border-b border-gold-400 focus:outline-none w-40 sm:w-64"
                        />
                        <button onClick={saveContactName} className="text-emerald-400 p-1"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingName(false)} className="text-red-400 p-1"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 truncate">
                        <span className={isDark ? 'text-white' : 'text-gray-900'}>
                          {isNameJustNumber(conversation.contact_name, conversation.contact_number)
                            ? formatPhoneNumber(conversation.contact_number)
                            : conversation.contact_name
                          }
                        </span>
                        <button onClick={() => { setNewContactName(conversation.contact_name || ''); setEditingName(true); }} className="text-gray-500 hover:text-gold-400">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {formatPhoneNumber(conversation.contact_number)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Bot className="w-3.5 h-3.5" />
                    {conversation.agent_name}
                  </span>
                  {hasConversionScore && conversation.conversion_score != null && (
                    <span className="flex items-center gap-1 px-1.5 rounded-full bg-gold-400/10 text-gold-400 font-medium border border-gold-400/20">
                      Score: {conversation.conversion_score}
                    </span>
                  )}
                </div>
              </div>

              {/* IA/Humain Toggle Badge */}
              <button
                onClick={toggleHumanTakeover}
                disabled={togglingTakeover}
                className={`group relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300 overflow-hidden ${
                  humanTakeover
                    ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                    : 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(52,211,153,0.5)]'
                }`}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                {humanTakeover ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{humanTakeover ? 'Humain' : 'IA'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

        {/* Messages Container with Pattern Overlay */}
        <div className={`relative min-h-[400px] h-[60vh] sm:h-[600px] max-h-[80vh] flex flex-col overflow-hidden rounded-2xl border ${
          isDark ? 'bg-space-950 border-space-700/50' : 'bg-gray-50 border-gray-200'
        }`}>
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none" 
            style={{ backgroundImage: `url("${chatPattern}")` }} 
          />
          
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4">
          {selectionMode && messages.length > 0 && (
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-space-600">
              <button
                type="button"
                onClick={selectAllMessages}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-space-700 text-gray-300 hover:text-gold-400 text-sm"
              >
                <CheckSquare className="w-4 h-4" />
                Tout sélectionner
              </button>
              <span className="text-sm text-gray-500">
                {selectedMessageIds.size} message(s) sélectionné(s)
              </span>
            </div>
          )}
          {messagesHasMore && messages.length > 0 && (
            <div className="flex justify-center mb-4">
              <button
                type="button"
                onClick={handleLoadOlderMessages}
                disabled={loadingMore}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-space-700 text-gray-400 hover:text-gold-400 hover:bg-space-600 transition-colors disabled:opacity-50 text-sm"
              >
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Charger les messages précédents
              </button>
            </div>
          )}
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Bot className="w-12 h-12 mb-2 opacity-50" />
              <p>Aucun message dans cette conversation</p>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="mt-4 text-gold-400 hover:text-gold-300 text-sm"
              >
                Synchroniser l'historique
              </button>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <div className="flex justify-center mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-space-800 text-gray-500' : 'bg-gray-200 text-gray-500'}`}>
                    {formatDate(date)}
                  </span>
                </div>
                {msgs.map((message) => {
                  const isHumanSender = message.sender_type === 'human' || message.message_type === 'manual'
                  const isSelected = selectedMessageIds.has(message.id)
                  return (
                    <div
                      key={message.id}
                      className={`flex items-end gap-2 mb-2 animate-fadeIn ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
                    >
                      {message.role === 'user' && (
                        <ProfileAvatar 
                          agentId={null} 
                          contactJid={null} 
                          name={displayName} 
                          size="sm" 
                          className="mb-1 hidden sm:flex"
                        />
                      )}

                      <div className={`group relative max-w-[85%] sm:max-w-[70%] px-4 py-2.5 shadow-sm transition-all duration-200 ${
                        message.role === 'user'
                          ? `rounded-2xl rounded-bl-none ${isDark ? 'bg-space-800 text-gray-100' : 'bg-white text-gray-800 shadow-md border border-gray-100'}`
                          : isHumanSender
                          ? 'rounded-2xl rounded-br-none bg-emerald-600 text-white shadow-[0_4px_12px_rgba(5,150,105,0.2)]'
                          : `rounded-2xl rounded-br-none ${isDark ? 'bg-gold-500 text-space-950 font-medium shadow-[0_4px_12px_rgba(210,153,34,0.2)]' : 'bg-gold-400 text-white font-medium shadow-md'}`
                      } ${message.sending ? 'opacity-70 scale-[0.98]' : 'hover:scale-[1.01]'}`}>
                        
                        {/* Indicator for selection in bubble */}
                        {selectionMode && (
                          <div 
                            onClick={(e) => { e.stopPropagation(); toggleMessageSelection(message.id); }}
                            className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 cursor-pointer text-gray-500 hover:text-gold-400"
                          >
                            {isSelected ? <CheckSquare className="w-5 h-5 text-gold-400" /> : <Square className="w-5 h-5" />}
                          </div>
                        )}

                        {/* Sender Label for Bot/Human */}
                        {message.role === 'assistant' && (
                          <div className={`flex items-center gap-1 mb-1 text-[10px] uppercase tracking-widest font-bold opacity-80 ${
                            isHumanSender ? 'text-emerald-100' : 'text-space-900/60'
                          }`}>
                            {isHumanSender ? (
                              <><UserCheck className="w-3 h-3" /> Humain</>
                            ) : (
                              <><Sparkles className="w-3 h-3" /> Assistant IA</>
                            )}
                          </div>
                        )}

                        {message.media_url && message.role === 'user' ? (
                          <div className="mb-2">
                            {message.message_type === 'audio' ? (
                              <MessageAudio conversationId={id} messageId={message.id} />
                            ) : message.message_type === 'image' ? (
                              <MessageImage conversationId={id} messageId={message.id} />
                            ) : null}
                          </div>
                        ) : message.role === 'assistant' && message.message_type === 'image' && message.media_url ? (
                          <div className="mb-2">
                            <AssistantMessageImage mediaUrl={message.media_url} />
                          </div>
                        ) : null}

                        {(message.content && message.content !== '[Image]' && message.content !== '[Audio]') || (!message.media_url && message.content) ? (
                          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        ) : null}

                        <div className={`flex items-center justify-end gap-1.5 mt-1.5 text-[10px] ${
                          message.role === 'user' ? 'text-gray-500' : isHumanSender ? 'text-emerald-100/70' : 'text-space-900/40'
                        }`}>
                          <span>{formatTime(message.created_at)}</span>
                          {message.role === 'assistant' && !message.sending && <Check className="w-3 h-3" />}
                        </div>
                      </div>

                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-gold-400/20 flex items-center justify-center mb-1 hidden sm:flex">
                          {isHumanSender ? <User className="w-4 h-4 text-emerald-400" /> : <Bot className="w-4 h-4 text-gold-400" />}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input - Floating Style */}
        <div className={`p-3 sm:p-4 border-t ${isDark ? 'bg-space-900 border-space-700/50' : 'bg-white border-gray-100'}`}>
          <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-4 items-center max-w-4xl mx-auto">
            <div className={`flex-1 relative group`}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Votre message ici..."
                className={`w-full py-3 sm:py-4 px-6 rounded-2xl text-sm sm:text-base outline-none transition-all duration-300 shadow-sm ${
                  isDark 
                    ? 'bg-space-800 text-white placeholder-gray-500 focus:bg-space-700 border border-space-700/50 focus:border-gold-400/50' 
                    : 'bg-gray-100 text-gray-900 placeholder-gray-400 focus:bg-white border border-transparent focus:border-gold-400/30'
                }`}
                disabled={sending}
              />
            </div>
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className={`w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 bg-gold-400 hover:bg-gold-300 text-space-950 rounded-2xl flex items-center justify-center shadow-lg shadow-gold-400/20 disabled:opacity-50 disabled:grayscale transition-all duration-300 transform active:scale-95`}
            >
              {sending ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Send className="w-6 h-6 -rotate-12 group-hover:rotate-0 transition-transform" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
