import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { useTheme } from '../contexts/ThemeContext'
import api, { getConversationUpdates } from '../services/api'
import { useConversationSocket } from '../hooks/useConversationSocket'
import { MessageSquare, Search, Clock, Bot, RefreshCw, Bell, Phone, ChevronRight, MessageCircle, Sparkles, Filter, X, CheckSquare, Square, User, Zap, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

// Cache for profile pictures (shared across all ProfileAvatar instances)
const profilePicCache = new Map()

// Profile Avatar component with profile picture support and online indicator
function ProfileAvatar({ agentId, contactJid, name, size = 'md', className = '', showOnline = false, profilePictureUrl }) {
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
    sm: 'w-10 h-10 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-16 h-16 text-xl'
  }
  
  const initials = name 
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'
  
  // Gradient backgrounds based on name
  const gradients = [
    'bg-gradient-to-br from-blue-500 to-blue-600',
    'bg-gradient-to-br from-emerald-500 to-teal-600',
    'bg-gradient-to-br from-blue-500 to-indigo-600',
    'bg-gradient-to-br from-amber-500 to-orange-600',
    'bg-gradient-to-br from-pink-500 to-rose-600',
    'bg-gradient-to-br from-cyan-500 to-blue-600'
  ]
  const gradientIndex = name ? name.charCodeAt(0) % gradients.length : 0
  const bgGradient = gradients[gradientIndex]
  
  return (
    <div className="relative flex-shrink-0">
      {imageUrl && !imageError ? (
        <img 
          src={imageUrl} 
          alt={name || 'Contact'}
          className={`${sizeClasses[size]} rounded-2xl object-cover ring-2 ring-space-700/50 ${className}`}
          onError={() => setImageError(true)}
        />
      ) : (
        <div className={`${sizeClasses[size]} ${bgGradient} rounded-2xl flex items-center justify-center text-white font-semibold shadow-lg ${className}`}>
          {initials}
        </div>
      )}
      {showOnline && (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-space-900"></div>
      )}
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

// Check if contact_name is just the phone number
const isNameJustNumber = (name, number) => {
  if (!name || !number) return true
  const cleanName = name.replace(/\D/g, '')
  const cleanNumber = number.replace(/\D/g, '')
  return cleanName === cleanNumber || name === number
}

// Get the best display name for a contact
const getDisplayName = (conv) => {
  if (conv.saved_contact_name && !isNameJustNumber(conv.saved_contact_name, conv.contact_number)) {
    return conv.saved_contact_name
  }
  if (conv.contact_name && !isNameJustNumber(conv.contact_name, conv.contact_number)) {
    return conv.contact_name
  }
  if (conv.push_name) return conv.push_name
  if (conv.notify_name) return conv.notify_name
  if (conv.verified_biz_name) return conv.verified_biz_name
  return formatPhoneNumber(conv.contact_number)
}

// Check if we're using the saved contact name (from WhatsApp contacts)
const isFromSavedContacts = (conv) => {
  return conv.saved_contact_name && !isNameJustNumber(conv.saved_contact_name, conv.contact_number)
}

// Get time ago in a more readable format
const getTimeAgo = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'À l\'instant'
  if (minutes < 60) return `${minutes} min`
  if (hours < 24) return `${hours}h`
  if (days === 1) return 'Hier'
  if (days < 7) return `${days}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function Conversations() {
  const { showConfirm } = useConfirm()
  const { theme } = useTheme()
  const { user: authUser, refreshUser } = useAuth()
  const isDark = theme === 'dark'
  const hasConversionScore = authUser?.plan_features?.conversion_score === true
  const [conversations, setConversations] = useState([])
  const [totalMessagesCount, setTotalMessagesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [scoreBand, setScoreBand] = useState('') // '' | 'high_potential' | 'at_risk'
  const [lastPollTime, setLastPollTime] = useState(null)
  const [newMessageCount, setNewMessageCount] = useState(0)
  const [filterAgent, setFilterAgent] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedConversations, setSelectedConversations] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [deletingConvId, setDeletingConvId] = useState(null)
  const pollIntervalRef = useRef(null)
  const loadConversationsRef = useRef(null)

  // Rafraîchir plan_features à l’affichage de la page (après désactivation d’un module en admin)
  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  // Real-time: refetch list when a conversation is updated (new message)
  useConversationSocket(() => loadConversationsRef.current?.())

  // Bulk selection handlers
  const toggleConversationSelection = (convId) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(convId)) {
        newSet.delete(convId)
      } else {
        newSet.add(convId)
      }
      return newSet
    })
  }

  const selectAllVisible = () => {
    setSelectedConversations(new Set(filteredConversations.map(c => c.id)))
  }

  const clearSelection = () => {
    setSelectedConversations(new Set())
    setBulkMode(false)
  }

  const handleBulkTakeover = async (enableHumanMode) => {
    if (selectedConversations.size === 0) {
      toast.error('Sélectionnez au moins une conversation')
      return
    }

    setBulkLoading(true)
    try {
      await api.put('/conversations/bulk/takeover', {
        conversation_ids: Array.from(selectedConversations),
        human_takeover: enableHumanMode
      })
      
      // Update local state
      setConversations(prev => prev.map(conv => 
        selectedConversations.has(conv.id) 
          ? { ...conv, human_takeover: enableHumanMode ? 1 : 0 }
          : conv
      ))
      
      toast.success(
        enableHumanMode 
          ? `${selectedConversations.size} conversation(s) passée(s) en mode humain`
          : `${selectedConversations.size} conversation(s) passée(s) en mode IA`
      )
      clearSelection()
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setBulkLoading(false)
    }
  }

  const loadConversations = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const params = {}
      if (hasConversionScore && scoreBand) params.score_band = scoreBand
      const response = await api.get('/conversations', { params })
      setConversations(response.data.conversations || [])
      setTotalMessagesCount(response.data.totalMessages ?? (response.data.conversations || []).reduce((s, c) => s + (c.message_count || 0), 0))
      setLastPollTime(new Date().toISOString())
      setNewMessageCount(0)
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Erreur de chargement'
      setLoadError(message)
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }, [hasConversionScore, scoreBand])
  loadConversationsRef.current = loadConversations

  useEffect(() => {
    loadConversations()
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [loadConversations])

  useEffect(() => {
    if (!loading && lastPollTime) {
      startPolling()
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [loading, lastPollTime])

  const handleDeleteConversation = async (convId, e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const ok = await showConfirm({
      title: 'Supprimer la conversation',
      message: 'Supprimer cette conversation et tous ses messages ? Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    setDeletingConvId(convId)
    try {
      await api.delete(`/conversations/${convId}`)
      toast.success('Conversation supprimée')
      setConversations(prev => prev.filter(c => c.id !== convId))
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression')
    } finally {
      setDeletingConvId(null)
    }
  }

  const startPolling = useCallback(() => {
    pollIntervalRef.current = setInterval(async () => {
      if (!lastPollTime) return
      
      try {
        const data = await getConversationUpdates(lastPollTime)
        
        if (data.updates && data.updates.length > 0) {
          setConversations(prev => {
            const updatedMap = new Map(prev.map(c => [c.id, c]))
            
            data.updates.forEach(update => {
              if (updatedMap.has(update.id)) {
                updatedMap.set(update.id, { ...updatedMap.get(update.id), ...update })
              } else {
                updatedMap.set(update.id, update)
              }
            })
            
            return Array.from(updatedMap.values())
              .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
          })
        }
        
        if (data.totalNewMessages > 0) {
          setNewMessageCount(prev => prev + data.totalNewMessages)
        }
        
        setLastPollTime(data.timestamp)
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 2000) // Polling rapide toutes les 2 secondes
  }, [lastPollTime])

  // Get unique agents for filter
  const agents = [...new Set(conversations.map(c => c.agent_name))].filter(Boolean)

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.contact_number?.includes(searchQuery) ||
      conv.push_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesAgent = !filterAgent || conv.agent_name === filterAgent
    return matchesSearch && matchesAgent
  })

  // Stats (totalMessagesCount vient de l'API pour être exact même avec > 100 conversations)
  const transferredCount = conversations.filter(c => c.is_transferred === 1).length

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center min-h-[50vh] sm:min-h-[60vh]">
        <div className="text-center flex flex-col items-center flex-shrink-0">
          <div className="relative w-16 h-16 flex-shrink-0">
            <div className="w-16 h-16 border-4 border-space-700 rounded-full absolute inset-0" />
            <div className="w-16 h-16 border-4 border-gold-400 border-t-transparent rounded-full animate-spin absolute inset-0" />
          </div>
          <p className="mt-4 text-gray-400">Chargement des conversations...</p>
        </div>
      </div>
    )
  }

  // Motif décoratif : points blancs en dark, points gris en light (pour ne pas rester "toujours pareil")
  const patternDark = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+"
  const patternLight = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2NDc0OGIiIGZpbGwtb3BhY2l0eT0iMC4wNiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+"

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 min-w-0">
      {/* Hero Header - theme-aware */}
      <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border p-4 sm:p-8 mb-4 sm:mb-8 ${
        isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200'
      }`}>
        <div
          className="absolute inset-0 opacity-50"
          style={{ backgroundImage: `url(${isDark ? patternDark : patternLight})` }}
          aria-hidden
        />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2 min-w-0">
              <div className="p-2 bg-gold-400/10 rounded-xl flex-shrink-0">
                <MessageSquare className="w-6 h-6 text-gold-400" />
              </div>
              <h1 className={`text-2xl sm:text-3xl font-display font-bold break-words ${isDark ? 'text-white' : 'text-gray-900'}`}>Conversations</h1>
            </div>
            <p className={`text-base sm:text-lg break-words ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Gérez toutes les conversations de vos agents WhatsApp</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            {newMessageCount > 0 && (
              <button
                onClick={loadConversations}
                className="flex items-center gap-2 px-4 py-2.5 bg-gold-400/20 hover:bg-gold-400/30 text-gold-400 rounded-xl transition-all duration-200 animate-pulse"
              >
                <Bell className="w-4 h-4" />
                <span className="font-medium">{newMessageCount} nouveau{newMessageCount > 1 ? 'x' : ''}</span>
              </button>
            )}
            <button
              onClick={loadConversations}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                isDark ? 'bg-space-700/50 hover:bg-space-700 text-gray-300 hover:text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 hover:text-gray-900'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <button
              onClick={() => {
                if (bulkMode) {
                  clearSelection()
                } else {
                  setBulkMode(true)
                }
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                bulkMode 
                  ? 'bg-gold-400 text-space-900 hover:bg-gold-300' 
                  : 'bg-space-700/50 hover:bg-space-700 text-gray-300 hover:text-white'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden sm:inline">{bulkMode ? 'Annuler' : 'Sélection'}</span>
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {bulkMode && (
          <div className="relative mt-6 p-4 bg-space-700/50 backdrop-blur-sm rounded-2xl border border-space-600/50">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-300 font-medium">
                  {selectedConversations.size} sélectionné{selectedConversations.size > 1 ? 's' : ''}
                </span>
                <button
                  onClick={selectAllVisible}
                  className="text-sm text-gold-400 hover:text-gold-300 underline"
                >
                  Tout sélectionner
                </button>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkTakeover(false)}
                  disabled={bulkLoading || selectedConversations.size === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Bot className="w-4 h-4" />
                  Activer IA
                </button>
                <button
                  onClick={() => handleBulkTakeover(true)}
                  disabled={bulkLoading || selectedConversations.size === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <User className="w-4 h-4" />
                  Mode Humain
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row - theme-aware */}
        <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8 min-w-0">
          <div className={`backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border min-w-0 ${isDark ? 'bg-space-800/50 border-space-700/50' : 'bg-white/80 border-gray-200'}`}>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-1.5 sm:p-2 bg-emerald-500/10 rounded-lg flex-shrink-0">
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className={`text-base sm:text-lg md:text-2xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`} title={String(conversations.length)}>{conversations.length}</p>
                <p className={`text-xs sm:text-sm truncate ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Conversations</p>
              </div>
            </div>
          </div>
          <div className={`backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border min-w-0 ${isDark ? 'bg-space-800/50 border-space-700/50' : 'bg-white/80 border-gray-200'}`}>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg flex-shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className={`text-base sm:text-lg md:text-2xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`} title={totalMessagesCount.toLocaleString()}>{totalMessagesCount.toLocaleString()}</p>
                <p className={`text-xs sm:text-sm truncate ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Messages</p>
              </div>
            </div>
          </div>
          <div className={`backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border min-w-0 col-span-2 sm:col-span-1 ${isDark ? 'bg-space-800/50 border-space-700/50' : 'bg-white/80 border-gray-200'}`}>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-lg flex-shrink-0">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className={`text-base sm:text-lg md:text-2xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`} title={String(agents.length)}>{agents.length}</p>
                <p className={`text-xs sm:text-sm truncate ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Agents actifs</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-10 sm:pr-4 py-3 sm:py-3.5 bg-space-800 border border-space-700 rounded-xl sm:rounded-2xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gold-400/50 focus:ring-2 focus:ring-gold-400/20 transition-all duration-200 text-base"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center justify-center gap-2 min-h-[48px] px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border transition-all duration-200 touch-target ${
            showFilters || filterAgent 
              ? 'bg-gold-400/10 border-gold-400/30 text-gold-400' 
              : 'bg-space-800 border-space-700 text-gray-400 hover:text-gray-300'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Filtres</span>
          {(filterAgent || scoreBand) && <span className="w-2 h-2 bg-gold-400 rounded-full"></span>}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-space-800 border border-space-700 rounded-2xl p-4 mb-6 animate-fadeIn">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterAgent('')}
              className={`px-4 py-2 rounded-xl text-sm transition-all duration-200 ${
                !filterAgent 
                  ? 'bg-gold-400 text-space-900 font-medium' 
                  : 'bg-space-700 text-gray-400 hover:text-gray-300'
              }`}
            >
              Tous les agents
            </button>
            {agents.map(agent => (
              <button
                key={agent}
                onClick={() => setFilterAgent(agent)}
                className={`px-4 py-2 rounded-xl text-sm transition-all duration-200 ${
                  filterAgent === agent 
                    ? 'bg-gold-400 text-space-900 font-medium' 
                    : 'bg-space-700 text-gray-400 hover:text-gray-300'
                }`}
              >
                {agent}
              </button>
            ))}
            {hasConversionScore && (
              <>
                <button
                  onClick={() => setScoreBand(scoreBand === 'high_potential' ? '' : 'high_potential')}
                  className={`px-4 py-2 rounded-xl text-sm transition-all duration-200 ${
                    scoreBand === 'high_potential'
                      ? 'bg-gold-400 text-space-900 font-medium'
                      : 'bg-space-700 text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Fort potentiel
                </button>
                <button
                  onClick={() => setScoreBand(scoreBand === 'at_risk' ? '' : 'at_risk')}
                  className={`px-4 py-2 rounded-xl text-sm transition-all duration-200 ${
                    scoreBand === 'at_risk'
                      ? 'bg-gold-400 text-space-900 font-medium'
                      : 'bg-space-700 text-gray-400 hover:text-gray-300'
                  }`}
                >
                  À risque
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Load error + Retry */}
      {loadError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center mb-6">
          <p className="text-red-300 mb-3">{loadError}</p>
          <button
            type="button"
            onClick={() => loadConversations()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      )}

      {/* Conversations List */}
      {!loadError && filteredConversations.length === 0 ? (
        <div className="bg-space-800/50 border border-space-700/50 rounded-3xl p-16 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-space-700 to-space-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <MessageSquare className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-100 mb-3">
            {searchQuery || filterAgent ? 'Aucune conversation trouvée' : 'Aucune conversation'}
          </h3>
          <p className="text-gray-400 max-w-md mx-auto">
            {searchQuery || filterAgent
              ? 'Essayez de modifier vos critères de recherche ou de supprimer les filtres'
              : 'Les conversations avec vos clients apparaîtront ici dès qu\'un message sera reçu'
            }
          </p>
          {(searchQuery || filterAgent) && (
            <button
              onClick={() => { setSearchQuery(''); setFilterAgent(''); }}
              className="mt-6 px-6 py-2.5 bg-space-700 hover:bg-space-600 text-gray-300 rounded-xl transition-colors"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : !loadError ? (
        <div className="space-y-3">
          {filteredConversations.map((conv, index) => {
            const isSelected = selectedConversations.has(conv.id)
            const CardWrapper = bulkMode ? 'div' : Link
            const cardProps = bulkMode 
              ? { 
                  onClick: () => toggleConversationSelection(conv.id),
                  className: `group block cursor-pointer ${isSelected ? 'bg-gold-400/10 border-gold-400/50' : 'bg-space-800/50 hover:bg-space-800 border-space-700/50 hover:border-space-600'} border rounded-2xl p-5 transition-all duration-300`
                }
              : {
                  to: `/dashboard/conversations/${conv.id}`,
                  className: "group block bg-space-800/50 hover:bg-space-800 border border-space-700/50 hover:border-space-600 rounded-xl sm:rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:shadow-xl hover:shadow-space-900/50"
                }
            
            return (
              <CardWrapper
                key={conv.id}
                {...cardProps}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  {/* Checkbox in bulk mode */}
                  {bulkMode && (
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-6 h-6 text-gold-400" />
                      ) : (
                        <Square className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                  )}
                  
                  <ProfileAvatar 
                    agentId={conv.agent_id}
                    contactJid={conv.contact_jid}
                    name={getDisplayName(conv)}
                    size="lg"
                    showOnline={new Date() - new Date(conv.last_message_at) < 300000}
                    profilePictureUrl={conv.profile_picture}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 mb-1.5">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <h3 className={`font-semibold truncate text-lg transition-colors ${isDark ? 'text-gray-100 group-hover:text-white' : 'text-gray-800 group-hover:text-gray-900'}`} title={getDisplayName(conv)}>
                          {getDisplayName(conv)}
                        </h3>
                        {/* Mode IA/Humain indicator */}
                        {conv.human_takeover === 1 ? (
                          <span className="flex-shrink-0 flex items-center gap-1 text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full font-medium">
                            <User className="w-3 h-3" />
                            Humain
                          </span>
                        ) : (
                          <span className="flex-shrink-0 flex items-center gap-1 text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                            <Zap className="w-3 h-3" />
                            IA
                          </span>
                        )}
                        {hasConversionScore && conv.conversion_score != null && (
                          <span className="badge-conversion-score flex-shrink-0 text-xs bg-space-600 text-gray-300 px-2 py-0.5 rounded-full font-medium" title="Score de conversion">
                            Score {conv.conversion_score}
                          </span>
                        )}
                        {hasConversionScore && conv.suggested_action && (
                          <span className="flex-shrink-0 text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-medium" title="Action suggérée">
                            {conv.suggested_action === 'send_offer' && 'Offre'}
                            {conv.suggested_action === 'transfer_human' && '→ Humain'}
                            {conv.suggested_action === 'relance_2h' && 'Relance'}
                          </span>
                        )}
                        {isFromSavedContacts(conv) && (
                          <span className="flex-shrink-0 text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full font-medium">
                            Contact
                          </span>
                        )}
                        {conv.verified_biz_name && (
                          <span className="flex-shrink-0 text-xs bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-full font-medium">
                            Business
                          </span>
                        )}
                        {conv.is_transferred === 1 && (
                          <span className="flex-shrink-0 text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-medium">
                            Transféré
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm text-gray-500">
                          {getTimeAgo(conv.last_message_at)}
                        </span>
                        {!bulkMode && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteConversation(conv.id, e)}
                              disabled={deletingConvId === conv.id}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                              title="Supprimer la conversation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gold-400 group-hover:translate-x-1 transition-all duration-200" />
                          </>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-400 truncate mb-2 text-[15px] min-w-0">
                      {conv.last_message || 'Aucun message'}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-gray-500 min-w-0">
                        <Bot className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs truncate break-words" title={conv.agent_name}>{conv.agent_name}</span>
                      </div>
                      <div className="w-1 h-1 bg-gray-600 rounded-full flex-shrink-0"></div>
                      <div className="flex items-center gap-1.5 text-gray-500 flex-shrink-0">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="text-xs">{conv.message_count} messages</span>
                      </div>
                      {getDisplayName(conv) !== formatPhoneNumber(conv.contact_number) && (
                        <>
                          <div className="w-1 h-1 bg-gray-600 rounded-full flex-shrink-0"></div>
                          <div className="flex items-center gap-1.5 text-gray-500 min-w-0 max-w-full">
                            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-xs truncate break-all" title={formatPhoneNumber(conv.contact_number)}>{formatPhoneNumber(conv.contact_number)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardWrapper>
            )
          })}
        </div>
      ) : null}

      {/* Results count */}
      {!loadError && filteredConversations.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-500">
          {filteredConversations.length === conversations.length 
            ? `${conversations.length} conversation${conversations.length > 1 ? 's' : ''}`
            : `${filteredConversations.length} sur ${conversations.length} conversations`
          }
        </div>
      )}
    </div>
  )
}
