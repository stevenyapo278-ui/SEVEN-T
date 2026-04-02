import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { useTheme } from '../contexts/ThemeContext'
import api, { getConversationUpdates } from '../services/api'
import { useOnboardingTour } from '../components/Onboarding'
import { useConversationSocket } from '../hooks/useConversationSocket'
import { MessageSquare, Search, Clock, Bot, RefreshCw, Bell, Phone, ChevronRight, MessageCircle, Sparkles, Filter, X, CheckSquare, Square, User, Zap, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import EmptyState from '../components/EmptyState'

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
  
  const gradients = [
    'bg-gradient-to-br from-blue-500 to-blue-600',
    'bg-gradient-to-br from-emerald-500 to-teal-600',
    'bg-gradient-to-br from-blue-500 to-indigo-600',
    'bg-gradient-to-br from-amber-500 to-orange-600',
    'bg-gradient-to-br from-pink-500 to-rose-600',
    'bg-gradient-to-br from-cyan-500 to-blue-600'
  ]
  const gradientIndex = name ? name.charCodeAt(0) % gradients.length : 0
  
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
        <div className={`${sizeClasses[size]} ${gradients[gradientIndex]} rounded-2xl flex items-center justify-center text-white font-semibold shadow-lg ${className}`}>
          {initials}
        </div>
      )}
      {showOnline && (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-space-900"></div>
      )}
    </div>
  )
}

const formatPhoneNumber = (number) => {
  if (!number) return ''
  const digits = String(number).replace(/\D/g, '')
  if (!digits) return number
  if (digits.length >= 10 && digits.length <= 15) {
    const cc = digits.length > 10 ? digits.slice(0, -9) : ''
    const rest = digits.slice(-9)
    return cc ? `+${cc} ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5, 8)} ${rest.slice(8)}` : `+${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5, 8)} ${rest.slice(8)}`
  }
  return number
}

const getDisplayName = (conv) => {
  if (conv.saved_contact_name && conv.saved_contact_name !== conv.contact_number) return conv.saved_contact_name
  if (conv.contact_name && conv.contact_name !== conv.contact_number) return conv.contact_name
  if (conv.push_name) return conv.push_name
  return formatPhoneNumber(conv.contact_number)
}

const getTimeAgo = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (minutes < 1) return 'À l\'instant'
  if (minutes < 60) return `${minutes} min`
  if (hours < 24) return `${hours}h`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function Conversations() {
  const { showConfirm } = useConfirm()
  const { theme } = useTheme()
  const { startTour, completedTours } = useOnboardingTour()
  const { user: authUser, refreshUser } = useAuth()
  const isDark = theme === 'dark'
  const hasConversionScore = authUser?.is_admin === 1 || authUser?.plan_features?.conversion_score === true || authUser?.conversion_score_enabled === 1
  
  const [searchParams, setSearchParams] = useSearchParams()
  const [conversations, setConversations] = useState([])
  const [totalMessagesCount, setTotalMessagesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '')
  const [scoreBand, setScoreBand] = useState(() => searchParams.get('score') || '')
  const [lastPollTime, setLastPollTime] = useState(null)
  const [newMessageCount, setNewMessageCount] = useState(0)
  const [filterAgent, setFilterAgent] = useState(() => searchParams.get('agent') || '')
  const [filterMode, setFilterMode] = useState(() => searchParams.get('mode') || '') // 'human' | 'ai' | ''

  useEffect(() => {
    const q = searchParams.get('q')
    const score = searchParams.get('score')
    const agent = searchParams.get('agent')
    const mode = searchParams.get('mode')
    if (q !== null) setSearchQuery(q)
    if (score !== null) setScoreBand(score || '')
    if (agent !== null) setFilterAgent(agent || '')
    if (mode !== null) setFilterMode(mode || '')
  }, [searchParams])

  const syncFiltersToUrl = useCallback((updates) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(updates).forEach(([k, v]) => {
        if (v) next.set(k, v)
        else next.delete(k)
      })
      return next
    }, { replace: true })
  }, [setSearchParams])
  const [showFilters, setShowFilters] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedConversations, setSelectedConversations] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [deletingConvId, setDeletingConvId] = useState(null)
  
  const pollIntervalRef = useRef(null)
  const loadConversationsRef = useRef(null)

  useEffect(() => { refreshUser() }, [refreshUser])
  useEffect(() => {
    if (!completedTours.includes('conversations')) startTour('conversations')
  }, [completedTours, startTour])

  const lastFetchTimeRef = useRef(0)
  const throttledLoadConversations = useCallback(() => {
    const now = Date.now()
    // Throttle to avoid freezing on message flood
    if (now - lastFetchTimeRef.current > 800) {
      lastFetchTimeRef.current = now
      loadConversationsRef.current?.()
    }
  }, [])

  useConversationSocket((convId, message) => {
    if (!convId) return

    // Fast path: update list instantly when we have a message payload
    if (message) {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === convId)
        if (idx === -1) {
          // Conversation might not be in the current 100 results → fallback refetch
          throttledLoadConversations()
          return prev
        }
        const next = [...prev]
        const current = next[idx]
        const content = message.content || (message.message_type === 'image' ? '📷 Image' : message.message_type === 'audio' ? '🎤 Audio' : '')
        const createdAt = message.created_at || new Date().toISOString()
        const isIncomingUser = message.role === 'user'
        const updated = {
          ...current,
          last_message: content || current.last_message,
          last_message_at: createdAt,
          // If it's an incoming user message, consider the conversation unread until mark-read is called
          status: isIncomingUser ? 'unread' : current.status,
          unread_messages_count: isIncomingUser ? Number(current.unread_messages_count || 0) + 1 : current.unread_messages_count
        }
        next[idx] = updated
        // Move updated conversation to the top by last_message_at
        next.sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0))
        return next
      })
      return
    }

    // Slow path: no payload → refetch (debounced)
    throttledLoadConversations()
  })

  // When a conversation is marked read elsewhere (ConversationDetail), update this list immediately
  useEffect(() => {
    const onMarkedRead = (e) => {
      const convId = e?.detail?.conversationId
      if (!convId) return
      setConversations(prev =>
        prev.map(c => (c.id === convId ? { ...c, status: 'read', unread_messages_count: 0 } : c))
      )
    }
    window.addEventListener('seven-t:conversation-mark-read', onMarkedRead)
    return () => window.removeEventListener('seven-t:conversation-mark-read', onMarkedRead)
  }, [])

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
      setLoadError(error.message)
    } finally {
      setLoading(false)
    }
  }, [hasConversionScore, scoreBand])

  loadConversationsRef.current = loadConversations

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const toggleConversationSelection = (convId) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(convId)) newSet.delete(convId)
      else newSet.add(convId)
      return newSet
    })
  }

  const clearSelection = () => {
    setSelectedConversations(new Set())
    setBulkMode(false)
  }

  const handleBulkTakeover = async (enableHumanMode) => {
    setBulkLoading(true)
    try {
      await api.put('/conversations/bulk/takeover', {
        conversation_ids: Array.from(selectedConversations),
        human_takeover: enableHumanMode
      })
      loadConversations()
      toast.success('Mise à jour réussie')
      clearSelection()
    } catch (error) { toast.error('Erreur') } finally { setBulkLoading(false) }
  }

  const agentsList = [...new Set(conversations.map(c => c.agent_name))].filter(Boolean)
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = getDisplayName(conv).toLowerCase().includes(searchQuery.toLowerCase()) || conv.contact_number?.includes(searchQuery)
    const matchesAgent = !filterAgent || conv.agent_name === filterAgent
    const isHuman = conv.human_takeover === 1 || conv.human_takeover === true
    const matchesMode = !filterMode || (filterMode === 'human' ? isHuman : !isHuman)
    return matchesSearch && matchesAgent && matchesMode
  })

  const handleToggleTakeover = async (convId, enabled) => {
    try {
      await api.post(`/conversations/${convId}/human-takeover`, { enabled })
      setConversations(prev =>
        prev.map(c => (c.id === convId ? { ...c, human_takeover: enabled ? 1 : 0 } : c))
      )
      toast.success(enabled ? 'Mode humain activé' : 'Mode IA activé')
    } catch (e) {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const patternDark = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+"
  const patternLight = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2NDc0OGIiIGZpbGwtb3BhY2l0eT0iMC4wNiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+"

  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0">
      {/* Hero Header */}
      <div className={`relative rounded-2xl sm:rounded-3xl border p-4 sm:p-8 mb-4 sm:mb-8 ${
        isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200'
      }`}>
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: `url(${isDark ? patternDark : patternLight})` }} />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gold-400/10 rounded-xl"><MessageSquare className="w-6 h-6 text-gold-400" /></div>
              <h1 className={`text-2xl sm:text-3xl font-display font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>Conversations</h1>
            </div>
            <p className={`text-base sm:text-lg ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Gérez toutes les conversations de vos agents WhatsApp</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={loadConversations} disabled={loading} className={`p-2 rounded-xl border transition-all ${isDark ? 'bg-space-800 border-space-700 text-gray-400 hover:text-white' : 'bg-white border-gray-200 text-gray-500'}`}>
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => bulkMode ? clearSelection() : setBulkMode(true)} className={`px-4 py-2 rounded-xl font-medium transition-all ${bulkMode ? 'bg-gold-400 text-black' : 'bg-space-700 text-gray-300'}`}>
              {bulkMode ? 'Annuler' : 'Sélection'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-6">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className={`h-20 rounded-xl border animate-pulse ${isDark ? 'bg-space-800/50 border-space-700' : 'bg-gray-100 border-gray-200'}`} />)
          ) : (
            <>
              <StatItem icon={MessageCircle} color="emerald" value={conversations.length} label="Convs" isDark={isDark} />
              <StatItem icon={Sparkles} color="blue" value={totalMessagesCount.toLocaleString()} label="Msgs" isDark={isDark} />
              <StatItem icon={Bot} color="amber" value={agentsList.length} label="Agents" isDark={isDark} />
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400" />
          <p className="mt-4 text-gray-500">Chargement...</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" value={searchQuery} onChange={(e) => { const v = e.target.value; setSearchQuery(v); syncFiltersToUrl({ q: v || undefined }); }}
                placeholder="Rechercher..."
                className={`w-full pl-10 pr-4 py-2 rounded-xl border focus:outline-none focus:border-gold-400/50 ${isDark ? 'bg-space-800 border-space-700 text-white' : 'bg-white border-gray-200'}`}
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${showFilters ? 'bg-gold-400/10 border-gold-400/30 text-gold-400' : 'text-gray-400 border-space-700'}`}>
              <Filter className="w-4 h-4" /> Filtres
            </button>
          </div>

          {showFilters && (
            <div className={`p-4 rounded-2xl border mb-6 ${isDark ? 'bg-space-800/40 border-space-700/50' : 'bg-white border-gray-200'}`}>
              <div className="flex flex-col md:flex-row gap-3 md:items-end">
                <div className="flex-1">
                  <label className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Agent</label>
                  <select
                    value={filterAgent}
                    onChange={(e) => {
                      const v = e.target.value
                      setFilterAgent(v)
                      syncFiltersToUrl({ agent: v || undefined })
                    }}
                    className={`mt-1 w-full px-3 py-2 rounded-xl border ${isDark ? 'bg-space-900 border-space-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                  >
                    <option value="">Tous</option>
                    {agentsList.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Mode</label>
                  <select
                    value={filterMode}
                    onChange={(e) => {
                      const v = e.target.value
                      setFilterMode(v)
                      syncFiltersToUrl({ mode: v || undefined })
                    }}
                    className={`mt-1 w-full px-3 py-2 rounded-xl border ${isDark ? 'bg-space-900 border-space-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                  >
                    <option value="">Tous</option>
                    <option value="ai">Mode IA</option>
                    <option value="human">Mode humain</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setSearchQuery('')
                    setFilterAgent('')
                    setFilterMode('')
                    setScoreBand('')
                    syncFiltersToUrl({ q: undefined, agent: undefined, mode: undefined, score: undefined })
                  }}
                  className={`px-4 py-2 rounded-xl border font-medium flex items-center gap-2 ${isDark ? 'bg-space-900 border-space-700 text-gray-300 hover:text-white' : 'bg-white border-gray-200 text-gray-700'}`}
                >
                  <X className="w-4 h-4" /> Réinitialiser
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {filteredConversations.map(conv => (
              <ConversationRow
                key={conv.id}
                conv={conv}
                isDark={isDark}
                bulkMode={bulkMode}
                isSelected={selectedConversations.has(conv.id)}
                onToggle={() => toggleConversationSelection(conv.id)}
                onToggleTakeover={handleToggleTakeover}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function StatItem({ icon: Icon, color, value, label, isDark }) {
  const colors = { 
    emerald: 'text-emerald-400 bg-emerald-400/10', 
    blue: 'text-blue-400 bg-blue-400/10', 
    amber: 'text-amber-400 bg-amber-400/10' 
  }
  return (
    <div className={`p-2.5 sm:p-4 rounded-xl border flex flex-col items-center sm:items-start text-center sm:text-left transition-all ${
      isDark ? 'bg-space-800/50 border-space-700/50 shadow-inner' : 'bg-white border-gray-100 shadow-sm'
    }`}>
      <div className={`p-1.5 sm:p-2 rounded-lg mb-2 sm:mb-3 ${colors[color]}`}>
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </div>
      <div className="w-full min-w-0">
        <p className={`text-base sm:text-xl font-bold truncate leading-none mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
        <p className="text-[8px] sm:text-[10px] text-gray-500 uppercase font-black tracking-tighter sm:tracking-normal truncate">{label}</p>
      </div>
    </div>
  )
}

function ConversationRow({ conv, isDark, bulkMode, isSelected, onToggle, onToggleTakeover }) {
  const Wrapper = bulkMode ? 'div' : Link
  const isHuman = conv.human_takeover === 1 || conv.human_takeover === true
  const unreadCount = Number(conv.unread_messages_count || 0)
  return (
    <Wrapper 
      to={bulkMode ? undefined : `/dashboard/conversations/${conv.id}`}
      onClick={bulkMode ? onToggle : undefined}
      className={`flex items-center gap-4 p-3 border rounded-xl transition-all cursor-pointer ${isSelected ? 'bg-gold-400/10 border-gold-400/50' : 'bg-space-800/50 hover:bg-space-800 border-space-700/50'}`}
    >
      {bulkMode && (isSelected ? <CheckSquare className="w-5 h-5 text-gold-400" /> : <Square className="w-5 h-5 text-gray-600" />)}
      <ProfileAvatar agentId={conv.agent_id} contactJid={conv.contact_jid} name={getDisplayName(conv)} profilePictureUrl={conv.profile_picture} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="font-bold text-gray-100 truncate">{getDisplayName(conv)}</h3>
          <span className="text-[10px] text-gray-500">{getTimeAgo(conv.last_message_at)}</span>
        </div>
        <p className="text-sm text-gray-400 truncate">{conv.last_message || 'Aucun message'}</p>
      </div>
      {!bulkMode && unreadCount > 0 && (
        <span className="min-w-[28px] h-6 px-2 rounded-full bg-blue-500/15 border border-blue-400/20 text-blue-200 text-xs font-bold flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      {!bulkMode && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleTakeover?.(conv.id, !isHuman)
          }}
          className={`p-2 rounded-xl border transition-all ${
            isHuman ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-300' : 'bg-gold-400/10 border-gold-400/30 text-gold-300'
          }`}
          title={isHuman ? 'Désactiver le mode humain (réactiver IA)' : 'Activer le mode humain'}
        >
          {isHuman ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </button>
      )}
      {!bulkMode && <ChevronRight className="w-4 h-4 text-gray-700" />}
    </Wrapper>
  )
}
