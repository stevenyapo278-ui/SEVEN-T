import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useConfirm } from '../contexts/ConfirmContext'
import api, { sendToConversation, getNewConversationMessages, syncMessages, getMessagesWithPagination, deleteMessages } from '../services/api'
import { usePageTitle } from '../hooks/usePageTitle'
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
  
  const colors = ['bg-violet-500', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500']
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
  const { showConfirm } = useConfirm()
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
      // Start polling interval
      pollIntervalRef.current = setInterval(async () => {
        if (!lastPollTimeRef.current) return
        
        try {
          // #region agent log
          console.log(`[ConvPolling] Fetching new messages since ${lastPollTimeRef.current}`)
          // #endregion
          const data = await getNewConversationMessages(id, lastPollTimeRef.current)
          if (data.messages && data.messages.length > 0) {
            // #region agent log
            console.log(`[ConvPolling] Got ${data.messages.length} new messages`)
            // #endregion
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
          console.error('Polling error:', error)
        }
      }, 3000)
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Conversations', href: '/dashboard/conversations' },
        { label: displayName }
      ]} />
      {/* Header */}
      <div className="card mb-6">
        <div className="p-4 border-b border-space-700">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => navigate('/dashboard/conversations')}
                className="flex items-center justify-center gap-2 text-gray-400 hover:text-gray-100 transition-colors touch-target"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour aux conversations
              </button>
              <button
                onClick={handleDeleteConversation}
                disabled={deletingConversation}
                className="flex items-center justify-center gap-2 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 touch-target"
                title="Supprimer la conversation"
              >
                {deletingConversation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer la conversation
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Human Takeover Toggle */}
              <button
                onClick={toggleHumanTakeover}
                disabled={togglingTakeover}
                className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all touch-target ${
                  humanTakeover
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                }`}
                title={humanTakeover ? 'Cliquez pour réactiver l\'IA' : 'Cliquez pour prendre en charge manuellement'}
              >
                {togglingTakeover ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : humanTakeover ? (
                  <UserCheck className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span className="text-sm">
                  {humanTakeover ? 'Mode Humain' : 'Mode IA'}
                </span>
              </button>
              
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center justify-center gap-2 text-gold-400 hover:text-gold-300 transition-colors disabled:opacity-50 touch-target"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sync...' : 'Sync'}
              </button>
              <button
                onClick={handleExportPdf}
                disabled={exportingPdf}
                className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 touch-target"
                title="Exporter la conversation en PDF"
              >
                <FileDown className={`w-4 h-4 ${exportingPdf ? 'animate-pulse' : ''}`} />
                {exportingPdf ? 'Export...' : 'Export PDF'}
              </button>
              {messages.length > 0 && (
                <>
                  {!selectionMode ? (
                    <button
                      onClick={() => setSelectionMode(true)}
                      className="flex items-center justify-center gap-2 text-amber-400 hover:text-amber-300 transition-colors touch-target"
                      title="Sélectionner des messages à supprimer"
                    >
                      <Square className="w-4 h-4" />
                      Sélectionner
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => { setSelectionMode(false); setSelectedMessageIds(new Set()) }}
                        className="flex items-center justify-center gap-2 text-gray-400 hover:text-gray-200 transition-colors touch-target"
                      >
                        <X className="w-4 h-4" />
                        Annuler
                      </button>
                      <button
                        onClick={handleDeleteSelection}
                        disabled={selectedMessageIds.size === 0 || deletingMessages}
                        className="flex items-center justify-center gap-2 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 touch-target"
                        title="Supprimer la sélection"
                      >
                        {deletingMessages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Supprimer ({selectedMessageIds.size})
                      </button>
                      <button
                        onClick={handleDeleteAllMessages}
                        disabled={deletingMessages}
                        className="flex items-center justify-center gap-2 text-red-500 hover:text-red-400 transition-colors disabled:opacity-50 touch-target"
                        title="Supprimer tous les messages"
                      >
                        <Trash2 className="w-4 h-4" />
                        Tout supprimer
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ProfileAvatar 
              agentId={conversation.agent_id}
              contactJid={conversation.contact_jid}
              name={getDisplayName(conversation)}
              profilePictureUrl={conversation.profile_picture}
              size="xl"
            />
            <div className="flex-1">
              {editingName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveContactName()
                      if (e.key === 'Escape') cancelEditingName()
                    }}
                    placeholder="Nom du contact..."
                    className="input-dark py-1 px-3 text-lg font-display font-bold w-64"
                    disabled={savingName}
                  />
                  <button
                    onClick={saveContactName}
                    disabled={savingName}
                    className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                  >
                    {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={cancelEditingName}
                    disabled={savingName}
                    className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1 min-w-0">
                  <h1 className="text-xl font-display font-bold text-gray-100 truncate">
                    {isNameJustNumber(conversation.contact_name, conversation.contact_number)
                      ? formatPhoneNumber(conversation.contact_number)
                      : conversation.contact_name
                    }
                  </h1>
                  <button
                    onClick={startEditingName}
                    className="p-1.5 text-gray-500 hover:text-gold-400 hover:bg-space-700 rounded-lg transition-colors"
                    title="Modifier le nom du contact"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {isNameJustNumber(conversation.contact_name, conversation.contact_number) && (
                    <span className="text-xs text-gray-500 italic">Cliquez pour ajouter un nom</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {formatPhoneNumber(conversation.contact_number)}
                </span>
                <span className="flex items-center gap-1">
                  <Bot className="w-4 h-4" />
                  {conversation.agent_name}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(conversation.created_at)}
                </span>
                {conversation.is_transferred === 1 && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                    Transféré à un humain
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="h-[500px] overflow-y-auto bg-space-800 p-4">
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
                  <span className="bg-space-700 px-3 py-1 rounded-full text-xs text-gray-400">
                    {formatDate(date)}
                  </span>
                </div>
                {msgs.map((message) => {
                  const isHumanSender = message.sender_type === 'human' || message.message_type === 'manual'
                  const isSelected = selectedMessageIds.has(message.id)
                  return (
                    <div
                      key={message.id}
                      className={`flex items-start gap-2 mb-2 ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
                    >
                      {selectionMode && (
                        <button
                          type="button"
                          onClick={() => toggleMessageSelection(message.id)}
                          className="flex-shrink-0 mt-2 p-1 rounded text-gray-400 hover:text-gold-400 focus:outline-none"
                          aria-label={isSelected ? 'Désélectionner' : 'Sélectionner'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-gold-400" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      )}
                      <div
                        className={`max-w-[70%] px-4 py-2 rounded-lg shadow-sm ${
                          message.role === 'user'
                            ? 'chat-bubble-user'
                            : isHumanSender
                            ? 'bg-emerald-600 text-white'
                            : 'chat-bubble-bot'
                        } ${message.sending ? 'opacity-70' : ''}`}
                      >
                        {/* Sender type badge for assistant messages */}
                        {message.role === 'assistant' && (
                          <div className={`flex items-center gap-1 mb-1 text-xs font-medium ${
                            isHumanSender ? 'text-emerald-200' : 'text-violet-300'
                          }`}>
                            {isHumanSender ? (
                              <>
                                <UserCheck className="w-3 h-3" />
                                <span>Humain</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3" />
                                <span>IA</span>
                              </>
                            )}
                          </div>
                        )}
                        {message.media_url && message.role === 'user' ? (
                          message.message_type === 'audio' ? (
                            <MessageAudio conversationId={id} messageId={message.id} />
                          ) : message.message_type === 'image' ? (
                            <MessageImage conversationId={id} messageId={message.id} />
                          ) : null
                        ) : null}
                        {(message.content && message.content !== '[Image]' && message.content !== '[Audio]') || (!message.media_url && message.content) ? (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        ) : null}
                        <p className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-gray-600' : isHumanSender ? 'text-emerald-200' : 'text-gray-500'
                        }`}>
                          {formatTime(message.created_at)}
                          {message.role === 'assistant' && !message.sending && ' ✓✓'}
                          {message.sending && ' ⏳'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-space-700 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tapez un message manuel..."
            className="input-dark flex-1 rounded-full"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="w-10 h-10 bg-gradient-to-br from-gold-400 to-gold-500 text-space-950 rounded-full flex items-center justify-center hover:shadow-lg hover:shadow-gold-400/20 disabled:opacity-50 transition-all"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
