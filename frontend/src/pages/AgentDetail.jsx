import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import api, { syncChats, getSyncStatus, getContacts } from '../services/api'
import { useConfirm } from '../contexts/ConfirmContext'
import { usePageTitle } from '../hooks/usePageTitle'
import Breadcrumbs from '../components/Breadcrumbs'
import { 
  Bot, 
  Settings, 
  BookOpen, 
  MessageSquare, 
  Play,
  QrCode,
  Wifi,
  WifiOff,
  Plus,
  Trash2,
  Save,
  Send,
  RefreshCw,
  ArrowLeft,
  Users,
  Phone,
  Clock,
  Loader2,
  Power,
  PowerOff,
  Ban,
  FileText,
  Copy,
  Edit,
  AlertTriangle,
  X,
  Video,
  Globe,
  Wrench,
  Check
} from 'lucide-react'
import toast from 'react-hot-toast'

/** Decode HTML entities so system prompt displays with normal quotes and apostrophes */
function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return str
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

// Cache for profile pictures (shared across all ProfileAvatar instances)
const profilePicCache = new Map()

// Profile Avatar component with profile picture support
function ProfileAvatar({ agentId, contactJid, name, size = 'md', className = '' }) {
  const [imageUrl, setImageUrl] = useState(null)
  const [imageError, setImageError] = useState(false)
  
  useEffect(() => {
    if (agentId && contactJid) {
      const cacheKey = `${agentId}:${contactJid}`
      
      // Check cache first
      if (profilePicCache.has(cacheKey)) {
        const cached = profilePicCache.get(cacheKey)
        if (cached.url) {
          setImageUrl(cached.url)
        }
        return // Don't refetch if cached (even if null)
      }
      
      // Try to load profile picture
      api.get(`/whatsapp/profile-picture/${agentId}/${encodeURIComponent(contactJid)}`)
        .then(res => {
          profilePicCache.set(cacheKey, { url: res.data.url, timestamp: Date.now() })
          if (res.data.url) {
            setImageUrl(res.data.url)
          }
        })
        .catch(() => {
          // Cache the failure too to avoid retrying
          profilePicCache.set(cacheKey, { url: null, timestamp: Date.now() })
        })
    }
  }, [agentId, contactJid])
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  }
  
  const initials = name 
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'
  
  // Generate a consistent color based on name
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

// Reorganized tabs - grouped by function
const TABS = [
  { id: 'overview', label: 'Aperçu', icon: Bot },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'knowledge', label: 'Connaissances', icon: BookOpen },
  { id: 'settings', label: 'Paramètres', icon: Settings },
  { id: 'playground', label: 'Tester', icon: Play },
]

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

export default function AgentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showConfirm } = useConfirm()
  const [searchParams, setSearchParams] = useSearchParams()
  const [agent, setAgent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  
  // Get tab from URL or default to 'overview'
  const validTabs = ['overview', 'conversations', 'knowledge', 'settings', 'playground']
  const tabFromUrl = searchParams.get('tab')
  const activeTab = validTabs.includes(tabFromUrl) ? tabFromUrl : 'overview'
  
  const setActiveTab = (tab) => {
    if (tab === 'overview') {
      setSearchParams({})
    } else {
      setSearchParams({ tab })
    }
  }

  const isActive = agent?.is_active !== 0

  useEffect(() => {
    loadAgent()
  }, [id])

  const loadAgent = async () => {
    try {
      const response = await api.get(`/agents/${id}`)
      setAgent(response.data.agent)
    } catch (error) {
      toast.error('Agent non trouvé')
      navigate('/dashboard/agents')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async () => {
    setToggling(true)
    try {
      await api.put(`/agents/${id}`, { is_active: isActive ? 0 : 1 })
      toast.success(isActive ? 'Agent désactivé' : 'Agent activé')
      loadAgent()
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setToggling(false)
    }
  }

  const handleDeleteAgent = async () => {
    const ok = await showConfirm({
      title: 'Supprimer cet agent',
      message: 'Êtes-vous sûr de vouloir supprimer cet agent ? Cette action est irréversible (conversations, connaissances, paramètres).',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/agents/${id}`)
      toast.success('Agent supprimé')
      navigate('/dashboard/agents')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression')
    }
  }

  const pageTitle = agent?.name ? `${agent.name} – Agents` : 'Agent'
  usePageTitle(pageTitle)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Agents', href: '/dashboard/agents' },
        { label: agent?.name || 'Agent' }
      ]} />
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard/agents')}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-100 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux agents
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
              !isActive ? 'bg-gray-500/20' :
              agent.whatsapp_connected ? 'bg-emerald-500/20' : 'bg-space-800'
            }`}>
              <Bot className={`w-7 h-7 ${
                !isActive ? 'text-gray-500' :
                agent.whatsapp_connected ? 'text-emerald-400' : 'text-gray-500'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-display font-bold text-gray-100">{agent.name}</h1>
                {!isActive && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-400">
                    Inactif
                  </span>
                )}
              </div>
              <p className="text-gray-400">
                {!isActive 
                  ? <span className="text-gray-500">Agent désactivé</span>
                  : agent.whatsapp_connected 
                    ? <span className="text-emerald-400">Connecté - {agent.whatsapp_number}</span>
                    : 'Non connecté à WhatsApp'
                }
              </p>
            </div>
          </div>
          
          {/* Toggle Active + Supprimer */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleActive}
              disabled={toggling}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                isActive 
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30' 
                  : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 border border-gray-500/30'
              }`}
            >
              {toggling ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isActive ? (
                <Power className="w-5 h-5" />
              ) : (
                <PowerOff className="w-5 h-5" />
              )}
              {isActive ? 'Actif' : 'Inactif'}
            </button>
            <button
              onClick={handleDeleteAgent}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20"
            >
              <Trash2 className="w-5 h-5" />
              Supprimer l'agent
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-space-700 mb-6">
        <div className="flex gap-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-gold-400 text-gold-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab agent={agent} onUpdate={loadAgent} />}
      {activeTab === 'conversations' && <ConversationsTab agent={agent} />}
      {activeTab === 'knowledge' && <KnowledgeTab agentId={agent.id} />}
      {activeTab === 'settings' && <SettingsTab agent={agent} onUpdate={loadAgent} />}
      {activeTab === 'playground' && <PlaygroundTab agent={agent} />}
    </div>
  )
}

// Overview Tab - Dashboard view with connection, stats and quick actions
function OverviewTab({ agent, onUpdate }) {
  const { showConfirm } = useConfirm()
  const [status, setStatus] = useState(null)
  const [qrCode, setQrCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [stats, setStats] = useState(null)
  const [contacts, setContacts] = useState([])
  const [quotas, setQuotas] = useState(null)
  const [generatingQr, setGeneratingQr] = useState(false)
  const [qrCountdown, setQrCountdown] = useState(0)
  const [connecting, setConnecting] = useState(false) // New state for connection in progress
  const intervalRef = useRef(null)
  const countdownRef = useRef(null)
  const qrRefreshRef = useRef(null)
  const statsIntervalRef = useRef(null) // For polling stats
  const isUserConnecting = useRef(false) // Track if user initiated connection

  const QR_REFRESH_INTERVAL = 20 // seconds before QR code refreshes

  useEffect(() => {
    if (!agent.tool_id) {
      setStatus({ status: 'disconnected', message: 'Non connecté' })
    } else {
      checkStatus()
    }
    loadStats()
    loadQuotas()
    if (agent.whatsapp_connected) {
      checkSyncStatus()
      loadContacts()
    }
    // Ensure only one stats interval: clear any existing before creating (e.g. Strict Mode double-mount)
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current)
    const STATS_POLL_MS = 30000
    statsIntervalRef.current = setInterval(() => {
      loadStats(true)
    }, STATS_POLL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (qrRefreshRef.current) clearTimeout(qrRefreshRef.current)
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current)
    }
  }, [])

  // QR code countdown and auto-refresh
  useEffect(() => {
    // Only start countdown when we have a QR code and are actively trying to connect
    if (qrCode && !agent.whatsapp_connected && isUserConnecting.current) {
      // Clear any existing countdown first
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
      
      // Start countdown
      setQrCountdown(QR_REFRESH_INTERVAL)
      
      countdownRef.current = setInterval(() => {
        setQrCountdown(prev => {
          if (prev <= 1) {
            // Refresh QR code when countdown reaches 0
            refreshQrCode()
            return QR_REFRESH_INTERVAL
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
    }
  }, [qrCode, agent.whatsapp_connected])

  const refreshQrCode = async () => {
    // Prevent multiple simultaneous refreshes
    if (generatingQr) return
    
    setGeneratingQr(true)
    try {
      const qrRes = await api.get(`/whatsapp/qr/${agent.id}`)
      if (qrRes.data.qr) {
        // Only update if the QR code is different (prevents unnecessary re-renders)
        setQrCode(prev => prev !== qrRes.data.qr ? qrRes.data.qr : prev)
      }
    } catch (error) {
      console.error('Error refreshing QR:', error)
    } finally {
      setTimeout(() => setGeneratingQr(false), 500)
    }
  }

  const handleCancelQr = async () => {
    // Stop all intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    
    // Clear all states
    setQrCode(null)
    setQrCountdown(0)
    setLoading(false)
    setGeneratingQr(false)
    setConnecting(false)
    isUserConnecting.current = false
    
    // Disconnect the pending session on backend
    try {
      await api.post(`/whatsapp/disconnect/${agent.id}`)
    } catch (error) {
      // Ignore errors - session might not exist
    }
    
    toast.success('Connexion annulée')
  }

  const loadQuotas = async () => {
    try {
      const response = await api.get('/agents/quotas')
      setQuotas(response.data)
    } catch (error) {
      console.error('Error loading quotas:', error)
    }
  }

  const canConnectWhatsApp = () => {
    if (!quotas) return true // Allow if quotas not loaded yet
    if (agent.whatsapp_connected) return true // Already connected
    const remaining = quotas.remaining?.whatsapp_accounts
    return remaining === -1 || remaining > 0
  }

  const loadStats = async (silent = false) => {
    try {
      const convRes = await api.get(`/conversations/agent/${agent.id}`)
      const conversations = convRes.data.conversations
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const todayConvs = conversations.filter(c => new Date(c.last_message_at) >= today)
      const totalMessages = conversations.reduce((sum, c) => sum + (c.message_count || 0), 0)
      
      setStats({
        totalConversations: conversations.length,
        todayConversations: todayConvs.length,
        totalMessages,
        recentConversations: conversations.slice(0, 3)
      })
    } catch (error) {
      if (!silent) console.error('Error loading stats:', error)
    }
  }

  const loadContacts = async () => {
    try {
      const data = await getContacts(agent.id)
      const contactsList = data.contacts || []
      setContacts(contactsList.slice(0, 5))
    } catch (error) {
      console.error('Error loading contacts:', error)
    }
  }

  const checkSyncStatus = async () => {
    try {
      const status = await getSyncStatus(agent.id)
      setSyncStatus(status)
    } catch (error) {
      console.error('Error checking sync status:', error)
    }
  }

  const handleSync = async () => {
    // Prevent multiple simultaneous syncs
    if (syncing) return
    
    setSyncing(true)
    try {
      await syncChats(agent.id)
      toast.success('Synchronisation terminée')
      await checkSyncStatus()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la synchronisation')
    } finally {
      setSyncing(false)
    }
  }

  const handleCleanup = async () => {
    try {
      const response = await api.post(`/whatsapp/cleanup/${agent.id}`)
      toast.success(response.data.message)
      // Reload stats after cleanup
      loadStats()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors du nettoyage')
    }
  }

  const checkStatus = async () => {
    try {
      const response = await api.get(`/whatsapp/status/${agent.id}`)
      setStatus(response.data)
      
      if (response.data.status === 'qr') {
        setConnecting(false)
        setLoading(false) // QR received, stop showing loading animation
        const qrRes = await api.get(`/whatsapp/qr/${agent.id}`)
        if (qrRes.data.qr) {
          setQrCode(qrRes.data.qr)
        }
      } else if (response.data.status === 'connecting') {
        // WhatsApp is connecting after QR scan - show connecting animation
        setConnecting(true)
        // Keep QR code visible but dimmed - don't clear it yet
      } else if (response.data.status === 'connected') {
        // Stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        if (countdownRef.current) {
          clearInterval(countdownRef.current)
          countdownRef.current = null
        }
        
        // Only show success animation and toast if user initiated the connection
        if (isUserConnecting.current) {
          setConnecting(true)
          toast.success('WhatsApp connecté avec succès !')
          isUserConnecting.current = false
          
          setTimeout(() => {
            setQrCode(null)
            setConnecting(false)
            setLoading(false)
            onUpdate()
          }, 1500)
        } else {
          // Just update the status without animation
          setStatus(response.data)
        }
      } else {
        // Disconnected or other state
        if (!loading) {
          setQrCode(null)
          setConnecting(false)
        }
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setStatus({ status: 'disconnected', message: 'Non connecté' })
      }
    }
  }

  const handleConnect = async (forceNew = false) => {
    // Prevent multiple simultaneous connection attempts
    if (loading || isUserConnecting.current) {
      return
    }
    
    setLoading(true)
    isUserConnecting.current = true // Mark that user initiated connection
    
    // Clear any existing intervals first
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    try {
      if (forceNew) {
        await api.post(`/whatsapp/reconnect/${agent.id}`)
        toast.success('Nouvelle session initiée')
      } else {
        await api.post(`/whatsapp/connect/${agent.id}`)
        toast.success('Connexion initiée')
      }
      
      // Poll for QR code (reduced frequency to avoid spam)
      intervalRef.current = setInterval(checkStatus, 3000)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la connexion')
      isUserConnecting.current = false
      setLoading(false)
    }
    // Note: Don't set loading to false here - keep it true until QR code arrives
  }

  const handleForceReconnect = async () => {
    const ok = await showConfirm({
      title: 'Changer de compte WhatsApp',
      message: 'Cette action va déconnecter le compte actuel, supprimer toutes les conversations et messages, puis générer un nouveau QR code. Les conversations seront perdues. Voulez-vous continuer ?',
      variant: 'warning',
      confirmLabel: 'Continuer'
    })
    if (!ok) return
    await handleConnect(true)
  }

  const handleDisconnect = async () => {
    const ok = await showConfirm({
      title: 'Déconnecter WhatsApp',
      message: 'Êtes-vous sûr de vouloir déconnecter WhatsApp ?',
      variant: 'warning',
      confirmLabel: 'Déconnecter'
    })
    if (!ok) return
    try {
      await api.post(`/whatsapp/disconnect/${agent.id}`)
      toast.success('Déconnecté')
      setStatus({ status: 'disconnected' })
      setQrCode(null)
      onUpdate()
    } catch (error) {
      toast.error('Erreur lors de la déconnexion')
    }
  }

  const handleClearConversations = async () => {
    let ok = false
    try {
      ok = await showConfirm({
        title: 'Supprimer toutes les conversations',
        message: 'Cette action est irréversible et supprimera : toutes les conversations, tous les messages et toute la liste noire. Voulez-vous continuer ?',
        variant: 'danger',
        confirmLabel: 'Tout supprimer'
      })
    } catch (_) {}
    if (!ok) return
    try {
      const response = await api.post(`/whatsapp/clear-conversations/${agent.id}`)
      toast.success(response.data.message)
      loadStats()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{stats?.totalConversations || 0}</p>
              <p className="text-xs text-gray-500">Conversations</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{stats?.todayConversations || 0}</p>
              <p className="text-xs text-gray-500">Aujourd'hui</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Send className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{stats?.totalMessages || 0}</p>
              <p className="text-xs text-gray-500">Messages</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-400/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{contacts.length || 0}</p>
              <p className="text-xs text-gray-500">Contacts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tool Assignment Summary */}
        <div className="card p-6">
          <h2 className="text-lg font-display font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-gold-400" />
            Outil assigné
          </h2>
          {agent.tool_id ? (
            <div className="p-4 bg-space-800 rounded-xl border border-space-700">
              <p className="text-sm text-gray-300">
                Outil: {agent.tool_label || agent.tool_id}
                {agent.tool_phone && (
                  <span className="text-gray-400 ml-1"> — {agent.tool_phone}</span>
                )}
              </p>
              {status?.status && (
                <p className="text-xs text-gray-500 mt-1">Statut: {status.status}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Pour connecter ou déconnecter un outil, utilisez la page Outils.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Aucun outil assigné à cet agent.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to={`/dashboard/agents/${agent.id}?tab=settings`}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              {agent.tool_id ? 'Changer l’outil' : 'Assigner un outil'}
            </Link>
            <Link
              to="/dashboard/tools"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-space-700 hover:bg-space-600 text-gray-200 transition-colors"
            >
              Gérer dans Outils
            </Link>
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="card p-6">
          <h2 className="text-lg font-display font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gold-400" />
            Conversations récentes
          </h2>
          
          {stats?.recentConversations?.length > 0 ? (
            <div className="space-y-3">
              {stats.recentConversations.map(conv => (
                <Link
                  key={conv.id}
                  to={`/dashboard/conversations/${conv.id}`}
                  className="flex items-center gap-3 p-3 bg-space-800/50 rounded-xl hover:bg-space-800 transition-colors"
                >
                  <ProfileAvatar 
                    agentId={agent.id}
                    contactJid={conv.contact_jid}
                    name={getDisplayName(conv)}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-100 truncate">
                      {getDisplayName(conv)}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{conv.last_message || 'Aucun message'}</p>
                  </div>
                  <span className="text-xs text-gray-600">{conv.message_count}msg</span>
                </Link>
              ))}
              <Link
                to={`/dashboard/conversations`}
                className="block text-center text-sm text-gold-400 hover:text-gold-300 pt-2"
              >
                Voir toutes les conversations →
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aucune conversation</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to={`/dashboard/agents/${agent.id}?tab=settings`}
            className="flex flex-col items-center gap-2 p-4 bg-space-800/50 rounded-xl hover:bg-space-800 transition-colors"
          >
            <Settings className="w-6 h-6 text-gray-400" />
            <span className="text-sm text-gray-300">Paramètres</span>
          </Link>
          <Link
            to={`/dashboard/agents/${agent.id}?tab=knowledge`}
            className="flex flex-col items-center gap-2 p-4 bg-space-800/50 rounded-xl hover:bg-space-800 transition-colors"
          >
            <BookOpen className="w-6 h-6 text-gray-400" />
            <span className="text-sm text-gray-300">Connaissances</span>
          </Link>
          <Link
            to={`/dashboard/agents/${agent.id}?tab=playground`}
            className="flex flex-col items-center gap-2 p-4 bg-space-800/50 rounded-xl hover:bg-space-800 transition-colors"
          >
            <Play className="w-6 h-6 text-gray-400" />
            <span className="text-sm text-gray-300">Tester</span>
          </Link>
          <button
            onClick={loadStats}
            className="flex flex-col items-center gap-2 p-4 bg-space-800/50 rounded-xl hover:bg-space-800 transition-colors"
          >
            <RefreshCw className="w-6 h-6 text-gray-400" />
            <span className="text-sm text-gray-300">Actualiser</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Conversations Tab
function ConversationsTab({ agent }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const pollIntervalRef = useRef(null)

  useEffect(() => {
    loadConversations()
    
    // Start polling for new conversations every 5 seconds
    pollIntervalRef.current = setInterval(() => {
      loadConversations(true) // silent refresh
    }, 5000)
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [agent.id])

  const loadConversations = async (silent = false) => {
    try {
      // #region agent log
      console.log(`[Polling] Fetching conversations for agent ${agent.id}, silent=${silent}`)
      // #endregion
      const response = await api.get(`/conversations/agent/${agent.id}`)
      // #region agent log
      console.log(`[Polling] Got ${response.data.conversations?.length || 0} conversations`)
      // #endregion
      setConversations(response.data.conversations)
    } catch (error) {
      if (!silent) console.error('Error loading conversations:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'À l\'instant'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return date.toLocaleDateString('fr-FR')
  }

  if (loading) {
    return <div className="animate-pulse bg-space-800 h-64 rounded-xl"></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-400">{conversations.length} conversation(s)</p>
        <button onClick={loadConversations} className="text-gold-400 hover:text-gold-300 text-sm">
          <RefreshCw className="w-4 h-4 inline mr-1" />
          Actualiser
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">Aucune conversation pour cet agent</p>
          <p className="text-sm text-gray-500 mt-2">
            Les conversations apparaîtront ici lorsque des utilisateurs enverront des messages.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-space-700">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              to={`/dashboard/conversations/${conv.id}`}
              className="flex items-center gap-4 p-4 hover:bg-space-800 transition-colors"
            >
              <ProfileAvatar 
                agentId={agent.id}
                contactJid={conv.contact_jid}
                name={getDisplayName(conv)}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-100 truncate">{getDisplayName(conv)}</h3>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(conv.last_message_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-400 truncate">{conv.last_message || 'Aucun message'}</p>
                <span className="text-xs text-gray-500">{conv.message_count || 0} messages</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// Contacts Tab
function ContactsTab({ agent }) {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (agent.whatsapp_connected) {
      loadContacts()
    } else {
      setLoading(false)
    }
  }, [agent.id, agent.whatsapp_connected])

  const loadContacts = async () => {
    try {
      const data = await getContacts(agent.id)
      setContacts(data.contacts || [])
    } catch (error) {
      console.error('Error loading contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!agent.whatsapp_connected) {
    return (
      <div className="card p-12 text-center">
        <WifiOff className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">WhatsApp non connecté</p>
        <p className="text-sm text-gray-500 mt-2">
          Connectez WhatsApp pour voir vos contacts.
        </p>
      </div>
    )
  }

  if (loading) {
    return <div className="animate-pulse bg-space-800 h-64 rounded-xl"></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-400">{contacts.length} contact(s)</p>
        <button onClick={loadContacts} className="text-gold-400 hover:text-gold-300 text-sm">
          <RefreshCw className="w-4 h-4 inline mr-1" />
          Actualiser
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">Aucun contact trouvé</p>
          <p className="text-sm text-gray-500 mt-2">
            Synchronisez vos contacts depuis l'onglet Connexion.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact, index) => (
            <div key={contact.jid || index} className="card p-4">
              <div className="flex items-center gap-3">
                <ProfileAvatar 
                  agentId={agent.id}
                  contactJid={contact.jid}
                  name={contact.name}
                  size="md"
                />
                <div className="min-w-0">
                  <h3 className="font-medium text-gray-100 truncate">{contact.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {contact.number}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SettingsTab({ agent, onUpdate }) {
  const [formData, setFormData] = useState({
    name: agent.name,
    description: agent.description || '',
    template: agent.template || '',
    system_prompt: decodeHtmlEntities(agent.system_prompt || ''),
    model: agent.model || 'gemini-1.5-flash',
    temperature: agent.temperature || 0.7,
    max_tokens: agent.max_tokens || 500,
    language: agent.language || 'fr',
    response_delay: agent.response_delay || 0,
    auto_reply: agent.auto_reply !== 0 && agent.auto_reply !== false,
    tool_id: agent.tool_id || '',
    // Availability settings
    availability_enabled: agent.availability_enabled === 1,
    availability_start: agent.availability_start || '09:00',
    availability_end: agent.availability_end || '18:00',
    availability_days: agent.availability_days || '1,2,3,4,5',
    availability_timezone: agent.availability_timezone || 'Europe/Paris',
    absence_message: agent.absence_message || 'Merci pour votre message ! Nous sommes actuellement indisponibles. Nous vous répondrons dès que possible.',
    // Human transfer settings
    human_transfer_enabled: agent.human_transfer_enabled === 1,
    human_transfer_keywords: agent.human_transfer_keywords || 'humain,agent,parler à quelqu\'un,assistance',
    human_transfer_message: agent.human_transfer_message || 'Je vous transfère vers un conseiller. Veuillez patienter.',
    // Rate limiting
    max_messages_per_day: agent.max_messages_per_day || 0
  })
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('general')
  const [templateOptions, setTemplateOptions] = useState([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [tools, setTools] = useState([])
  const [toolsLoading, setToolsLoading] = useState(false)

  const DAYS_OF_WEEK = [
    { id: 0, label: 'Dim' },
    { id: 1, label: 'Lun' },
    { id: 2, label: 'Mar' },
    { id: 3, label: 'Mer' },
    { id: 4, label: 'Jeu' },
    { id: 5, label: 'Ven' },
    { id: 6, label: 'Sam' }
  ]

  const selectedDays = formData.availability_days.split(',').map(Number).filter(n => !isNaN(n))

  const toggleDay = (dayId) => {
    const newDays = selectedDays.includes(dayId)
      ? selectedDays.filter(d => d !== dayId)
      : [...selectedDays, dayId].sort()
    setFormData({ ...formData, availability_days: newDays.join(',') })
  }

  const handleTemplateChange = (value) => {
    const nextTemplate = value || null
    const matchedTemplate = templateOptions.find((template) => template.id === value)
    setFormData((prev) => ({
      ...prev,
      template: nextTemplate,
      system_prompt: matchedTemplate?.system_prompt || prev.system_prompt
    }))
  }

  useEffect(() => {
    let isMounted = true
    setIsLoadingTemplates(true)
    api.get('/agents/system-templates')
      .then((res) => {
        if (!isMounted) return
        setTemplateOptions(res.data?.templates || [])
      })
      .catch(() => {
        if (!isMounted) return
        setTemplateOptions([])
      })
      .finally(() => {
        if (!isMounted) return
        setIsLoadingTemplates(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    setToolsLoading(true)
    api.get('/tools')
      .then((res) => {
        if (!isMounted) return
        setTools(res.data?.tools || [])
      })
      .catch(() => {
        if (!isMounted) return
        setTools([])
      })
      .finally(() => {
        if (!isMounted) return
        setToolsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put(`/agents/${agent.id}`, {
        ...formData,
        template: formData.template || null,
        tool_id: formData.tool_id || null,
        auto_reply: formData.auto_reply ? 1 : 0,
        availability_enabled: formData.availability_enabled ? 1 : 0,
        human_transfer_enabled: formData.human_transfer_enabled ? 1 : 0
      })
      toast.success('Paramètres sauvegardés')
      onUpdate()
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const SECTIONS = [
    { id: 'general', label: 'Général' },
    { id: 'ai', label: 'Configuration IA' },
    { id: 'auto_reply', label: 'Réponse auto' },
    { id: 'availability', label: 'Disponibilité' },
    { id: 'transfer', label: 'Transfert humain' },
    { id: 'limits', label: 'Limites' }
  ]

  return (
    <div className="flex gap-6">
      {/* Sidebar navigation */}
      <div className="w-48 flex-shrink-0">
        <nav className="space-y-1 sticky top-4">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? 'bg-gold-400/20 text-gold-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-space-800'
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Form content */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-2xl space-y-6">
        {/* General Section */}
        {activeSection === 'general' && (
          <div className="card p-6">
            <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">Informations générales</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nom</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Type d'agent</label>
                <select
                  value={formData.template || ''}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="input-dark w-full"
                  disabled={isLoadingTemplates}
                >
                  <option value="">Générique (support, FAQ, RDV…)</option>
                  {templateOptions.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  E-commerce : injection du catalogue et détection/création de commandes. Les autres types restent des assistants sans logique commandes.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Outil assigné</label>
                <select
                  value={formData.tool_id || ''}
                  onChange={(e) => setFormData({ ...formData, tool_id: e.target.value })}
                  className="input-dark w-full"
                  disabled={toolsLoading}
                >
                  <option value="">Aucun outil</option>
                  {tools.map((tool) => (
                    <option key={tool.id} value={tool.id}>
                      {[tool.label || tool.type, tool.type, tool.type === 'whatsapp' && tool.meta?.phone ? tool.meta.phone : null].filter(Boolean).join(' — ')}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  La connexion des outils se gère dans la page{' '}
                  <Link to="/dashboard/tools" className="text-gold-400 hover:text-gold-300">Outils</Link>.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="input-dark w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* AI Configuration Section */}
        {activeSection === 'ai' && (
          <div className="card p-6">
            <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">Configuration IA</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Instructions système (System Prompt)
                </label>
                <textarea
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  rows={6}
                  placeholder="Décrivez le comportement de votre assistant..."
                  className="input-dark w-full font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ces instructions définissent la personnalité et le comportement de votre assistant.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Modèle IA</label>
                  <select
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="input-dark w-full"
                  >
                    <optgroup label="⚡ Google Gemini">
                      <option value="models/gemini-2.5-flash">Gemini 2.5 Flash - Dernier modèle ⭐ (1 crédit)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash - Très rapide (1 crédit)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro - Intelligent (2 crédits)</option>
                    </optgroup>
                    <optgroup label="🤖 OpenAI">
                      <option value="gpt-4o-mini">GPT-4o Mini - Rapide (2 crédits)</option>
                      <option value="gpt-4o">GPT-4o - Très intelligent (5 crédits)</option>
                    </optgroup>
                    <optgroup label="🆓 OpenRouter Gratuit">
                      <option value="qwen/qwen3-next-80b-a3b-instruct:free">Qwen 3 Next 80B - Gratuit ⭐ (puissant)</option>
                      <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B - Gratuit (recommandé)</option>
                      <option value="tngtech/deepseek-r1t-chimera:free">DeepSeek R1T Chimera - Gratuit</option>
                      <option value="meta-llama/llama-3.2-3b-instruct:free">Llama 3.2 3B - Gratuit</option>
                      <option value="google/gemma-2-9b-it:free">Gemma 2 9B - Gratuit</option>
                      <option value="qwen/qwen-2-7b-instruct:free">Qwen 2 7B - Gratuit</option>
                      <option value="microsoft/phi-3-mini-128k-instruct:free">Phi-3 Mini - Gratuit</option>
                    </optgroup>
                    <optgroup label="🦙 Meta Llama (via OpenRouter)">
                      <option value="meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B - Puissant (1 crédit)</option>
                      <option value="meta-llama/llama-3.1-405b-instruct">Llama 3.1 405B - Ultra (3 crédits)</option>
                    </optgroup>
                    <optgroup label="🌟 Mistral (via OpenRouter)">
                      <option value="mistralai/mistral-7b-instruct">Mistral 7B - Rapide (1 crédit)</option>
                      <option value="mistralai/mixtral-8x7b-instruct">Mixtral 8x7B - Équilibré (1 crédit)</option>
                      <option value="mistralai/mistral-large">Mistral Large - Puissant (2 crédits)</option>
                    </optgroup>
                    <optgroup label="🧠 Anthropic Claude (via OpenRouter)">
                      <option value="anthropic/claude-3-haiku">Claude 3 Haiku - Rapide (1 crédit)</option>
                      <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet - Intelligent (3 crédits)</option>
                      <option value="anthropic/claude-3-opus">Claude 3 Opus - Ultra (8 crédits)</option>
                    </optgroup>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Les modèles gratuits sont limités. Les crédits sont déduits selon le modèle choisi.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Langue</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="input-dark w-full"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Température: <span className="text-gold-400">{formData.temperature}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-gold-400"
                />
                <p className="text-xs text-gray-500">
                  Plus bas = réponses plus prévisibles, plus haut = plus créatives
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Auto Reply Section */}
        {activeSection === 'auto_reply' && (
          <div className="card p-6">
            <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">Réponse automatique</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Activer les réponses automatiques</label>
                  <p className="text-xs text-gray-500">L'agent répond automatiquement aux messages entrants</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, auto_reply: !formData.auto_reply })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.auto_reply ? 'bg-gold-400' : 'bg-space-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.auto_reply ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {formData.auto_reply && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Délai de réponse: <span className="text-gold-400">{Number(formData.response_delay)} seconde{Number(formData.response_delay) !== 1 ? 's' : ''}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={Number(formData.response_delay)}
                    onChange={(e) => setFormData({ ...formData, response_delay: parseInt(e.target.value, 10) })}
                    className="w-full accent-gold-400"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0 s</span>
                    <span>10 s</span>
                    <span>20 s</span>
                    <span>30 s</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Délai avant que l'agent réponde. Simule une frappe naturelle et permet d'intervenir manuellement.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Availability Section */}
        {activeSection === 'availability' && (
          <div className="card p-6">
            <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">Horaires de disponibilité</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Activer les horaires</label>
                  <p className="text-xs text-gray-500">L'agent ne répond que pendant les heures définies</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, availability_enabled: !formData.availability_enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.availability_enabled ? 'bg-gold-400' : 'bg-space-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.availability_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {formData.availability_enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Heure de début</label>
                      <input
                        type="time"
                        value={formData.availability_start}
                        onChange={(e) => setFormData({ ...formData, availability_start: e.target.value })}
                        className="input-dark w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Heure de fin</label>
                      <input
                        type="time"
                        value={formData.availability_end}
                        onChange={(e) => setFormData({ ...formData, availability_end: e.target.value })}
                        className="input-dark w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Jours de disponibilité</label>
                    <div className="flex gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleDay(day.id)}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                            selectedDays.includes(day.id)
                              ? 'bg-gold-400 text-space-950'
                              : 'bg-space-800 text-gray-400 hover:bg-space-700'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Fuseau horaire</label>
                    <select
                      value={formData.availability_timezone}
                      onChange={(e) => setFormData({ ...formData, availability_timezone: e.target.value })}
                      className="input-dark w-full"
                    >
                      <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                      <option value="America/New_York">America/New_York (EST/EDT)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                      <option value="Africa/Abidjan">Africa/Abidjan (GMT)</option>
                      <option value="Africa/Dakar">Africa/Dakar (GMT)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Message d'absence</label>
                    <textarea
                      value={formData.absence_message}
                      onChange={(e) => setFormData({ ...formData, absence_message: e.target.value })}
                      rows={3}
                      placeholder="Message envoyé en dehors des heures de disponibilité..."
                      className="input-dark w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ce message est envoyé une fois par conversation en dehors des horaires.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Human Transfer Section */}
        {activeSection === 'transfer' && (
          <div className="card p-6">
            <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">Transfert vers un humain</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Activer le transfert</label>
                  <p className="text-xs text-gray-500">Permet aux clients de demander à parler à un humain</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, human_transfer_enabled: !formData.human_transfer_enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.human_transfer_enabled ? 'bg-gold-400' : 'bg-space-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.human_transfer_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {formData.human_transfer_enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Mots-clés de déclenchement</label>
                    <input
                      type="text"
                      value={formData.human_transfer_keywords}
                      onChange={(e) => setFormData({ ...formData, human_transfer_keywords: e.target.value })}
                      placeholder="humain, agent, parler à quelqu'un"
                      className="input-dark w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Séparez les mots-clés par des virgules. Le transfert est déclenché si un de ces mots est détecté.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Message de transfert</label>
                    <textarea
                      value={formData.human_transfer_message}
                      onChange={(e) => setFormData({ ...formData, human_transfer_message: e.target.value })}
                      rows={2}
                      placeholder="Je vous transfère vers un conseiller..."
                      className="input-dark w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Message envoyé au client lors du transfert. L'agent arrête ensuite de répondre automatiquement.
                    </p>
                  </div>

                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-amber-400">
                      💡 Lorsqu'une conversation est transférée, l'agent arrête de répondre automatiquement.
                      Vous pouvez reprendre le contrôle dans la page Conversations.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Limits Section */}
        {activeSection === 'limits' && (
          <div className="card p-6">
            <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">Limites et restrictions</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Messages max par jour par contact: <span className="text-gold-400">{formData.max_messages_per_day || 'Illimité'}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.max_messages_per_day}
                  onChange={(e) => setFormData({ ...formData, max_messages_per_day: parseInt(e.target.value) })}
                  className="w-full accent-gold-400"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Illimité</span>
                  <span>25</span>
                  <span>50</span>
                  <span>100</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Limite le nombre de réponses automatiques par conversation et par jour. 0 = illimité.
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </form>
    </div>
  )
}

// Icon components for knowledge types
const KnowledgeTypeIcon = ({ type, className = "w-5 h-5" }) => {
  switch (type) {
    case 'pdf':
      return <FileText className={`${className} text-red-400`} />
    case 'youtube':
      return (
        <svg className={`${className} text-red-500`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    case 'website':
      return (
        <svg className={`${className} text-blue-400`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      )
    case 'markdown':
      return (
        <svg className={`${className} text-purple-400`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.27 19.385H1.73A1.73 1.73 0 010 17.655V6.345a1.73 1.73 0 011.73-1.73h20.54A1.73 1.73 0 0124 6.345v11.308a1.73 1.73 0 01-1.73 1.731zM5.769 15.923v-4.5l2.308 2.885 2.307-2.885v4.5h2.308V8.078h-2.308l-2.307 2.885-2.308-2.885H3.46v7.847zM21.232 12h-2.309V8.077h-2.307V12h-2.308l3.461 4.039z"/>
        </svg>
      )
    default:
      return <FileText className={`${className} text-gray-400`} />
  }
}

function KnowledgeTab({ agentId }) {
  const { showConfirm } = useConfirm()
  const [items, setItems] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedItem, setExpandedItem] = useState(null)
  
  // NEW: Global knowledge management
  const [globalKnowledge, setGlobalKnowledge] = useState([])
  const [assignedGlobalIds, setAssignedGlobalIds] = useState([])
  const [showGlobalSelector, setShowGlobalSelector] = useState(false)
  const [savingGlobal, setSavingGlobal] = useState(false)

  useEffect(() => {
    loadKnowledge()
    loadGlobalKnowledge()
  }, [agentId])

  const loadKnowledge = async () => {
    try {
      const response = await api.get(`/knowledge/agent/${agentId}`)
      setItems(response.data.items)
      setStats(response.data.stats)
    } catch (error) {
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const loadGlobalKnowledge = async () => {
    try {
      // Load all global knowledge items
      const globalResponse = await api.get('/knowledge/global')
      setGlobalKnowledge(globalResponse.data.items || [])
      
      // Load assigned IDs for this agent
      const assignedResponse = await api.get(`/agents/${agentId}/global-knowledge`)
      setAssignedGlobalIds(assignedResponse.data.assignedIds || [])
    } catch (error) {
      console.error('Error loading global knowledge:', error)
    }
  }

  const handleSaveGlobalAssignments = async () => {
    setSavingGlobal(true)
    try {
      await api.post(`/agents/${agentId}/global-knowledge`, {
        knowledgeIds: assignedGlobalIds
      })
      toast.success('Attributions sauvegardées')
      setShowGlobalSelector(false)
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSavingGlobal(false)
    }
  }

  const toggleGlobalKnowledge = (knowledgeId) => {
    setAssignedGlobalIds(prev => 
      prev.includes(knowledgeId)
        ? prev.filter(id => id !== knowledgeId)
        : [...prev, knowledgeId]
    )
  }

  const handleDelete = async (itemId) => {
    const ok = await showConfirm({
      title: 'Supprimer l\'élément',
      message: 'Supprimer définitivement cet élément de la base de connaissances ?',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/knowledge/${itemId}`)
      toast.success('Supprimé')
      loadKnowledge()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const getTypeLabel = (type) => {
    const labels = {
      'text': 'Texte',
      'pdf': 'PDF',
      'youtube': 'YouTube',
      'website': 'Site web',
      'markdown': 'Markdown'
    }
    return labels[type] || type
  }

  if (loading) {
    return <div className="animate-pulse bg-space-800 h-64 rounded-xl"></div>
  }

  return (
    <div>
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-gray-400">
              {stats.total_items || 0} éléments
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400">
              {(stats.total_characters || 0).toLocaleString()} caractères
            </span>
            {stats.by_type && Object.keys(stats.by_type).length > 0 && (
              <>
                <span className="text-gray-600">•</span>
                <div className="flex items-center gap-2">
                  {Object.entries(stats.by_type).map(([type, count]) => (
                    <span key={type} className="flex items-center gap-1 text-xs bg-space-800 px-2 py-1 rounded-full">
                      <KnowledgeTypeIcon type={type} className="w-3 h-3" />
                      {count}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Ajouter
        </button>
      </div>

      {/* Global Knowledge Section */}
      <div className="card p-6 mb-6 bg-gradient-to-br from-violet-500/10 to-blue-500/10 border-violet-500/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-violet-500/20 rounded-xl">
              <Globe className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h4 className="font-medium text-gray-100 mb-1">
                Base de connaissance globale
              </h4>
              <p className="text-sm text-gray-400">
                {assignedGlobalIds.length === 0 ? (
                  'Aucune connaissance globale attribuée'
                ) : (
                  `${assignedGlobalIds.length} élément(s) de la base globale attribué(s)`
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowGlobalSelector(true)}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Gérer
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-space-700 to-space-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-100 mb-2">Base de connaissances vide</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Ajoutez des informations pour que votre assistant puisse répondre précisément aux questions de vos clients
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-space-800 hover:bg-space-700 text-gray-300 rounded-xl transition-colors"
            >
              <FileText className="w-4 h-4" />
              Texte
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-space-800 hover:bg-space-700 text-gray-300 rounded-xl transition-colors"
            >
              <FileText className="w-4 h-4 text-red-400" />
              PDF
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-space-800 hover:bg-space-700 text-gray-300 rounded-xl transition-colors"
            >
              <KnowledgeTypeIcon type="youtube" className="w-4 h-4" />
              YouTube
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-space-800 hover:bg-space-700 text-gray-300 rounded-xl transition-colors"
            >
              <KnowledgeTypeIcon type="website" className="w-4 h-4" />
              Site web
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="card p-4 hover:border-space-600 transition-colors cursor-pointer"
              onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-space-800 rounded-xl flex-shrink-0">
                  <KnowledgeTypeIcon type={item.type} className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <h3 className="font-medium text-gray-100">{item.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-space-800 text-gray-400 rounded-full">
                          {getTypeLabel(item.type)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {item.content?.length?.toLocaleString()} caractères
                        </span>
                        {item.metadata?.sourceUrl && (
                          <a 
                            href={item.metadata.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-blue-400 hover:underline truncate max-w-[200px]"
                          >
                            {new URL(item.metadata.sourceUrl).hostname}
                          </a>
                        )}
                        {item.metadata?.pages && (
                          <span className="text-xs text-gray-500">{item.metadata.pages} pages</span>
                        )}
                        {item.metadata?.duration && (
                          <span className="text-xs text-gray-500">{item.metadata.duration}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className={`text-sm text-gray-400 mt-2 ${expandedItem === item.id ? '' : 'line-clamp-2'}`}>
                    {item.content}
                  </p>
                  {item.content?.length > 200 && (
                    <button className="text-xs text-gold-400 mt-2">
                      {expandedItem === item.id ? 'Réduire' : 'Voir plus...'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddKnowledgeModal
          agentId={agentId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false)
            loadKnowledge()
          }}
        />
      )}

      {/* Global Knowledge Selector Modal */}
      {showGlobalSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={() => setShowGlobalSelector(false)} />
          <div className="relative z-10 w-full max-w-3xl bg-space-900 border border-space-700 rounded-3xl shadow-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-space-700">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-gray-100">
                  Attribuer des connaissances globales
                </h2>
                <button 
                  onClick={() => setShowGlobalSelector(false)}
                  className="text-gray-500 hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-400">
                Sélectionnez les éléments de la base de connaissance globale que cet agent doit utiliser
              </p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6">
              {globalKnowledge.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Aucune connaissance globale disponible</p>
                  <Link 
                    to="/dashboard/knowledge"
                    className="text-violet-400 hover:text-violet-300 text-sm mt-2 inline-block"
                  >
                    Ajouter des connaissances globales →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {globalKnowledge.map((item) => {
                    const isSelected = assignedGlobalIds.includes(item.id)
                    const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata || '{}') : (item.metadata || {})
                    
                    return (
                      <div 
                        key={item.id}
                        onClick={() => toggleGlobalKnowledge(item.id)}
                        className={`card p-4 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-violet-500 bg-violet-500/10' 
                            : 'hover:border-space-600'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isSelected 
                              ? 'bg-violet-500 border-violet-500' 
                              : 'border-gray-600'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>

                          {/* Icon */}
                          <div className="p-2 bg-space-800 rounded-xl flex-shrink-0">
                            <KnowledgeTypeIcon type={item.type} className="w-5 h-5" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-100 mb-1">{item.title}</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 bg-space-800 text-gray-400 rounded-full">
                                {getTypeLabel(item.type)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {item.content?.length?.toLocaleString()} caractères
                              </span>
                            </div>
                            {item.content && (
                              <p className="text-sm text-gray-500 line-clamp-2 mt-2">
                                {item.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-space-700">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-gray-400">
                  {assignedGlobalIds.length} élément(s) sélectionné(s)
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowGlobalSelector(false)}
                    className="btn-secondary"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveGlobalAssignments}
                    disabled={savingGlobal}
                    className="btn-primary disabled:opacity-50"
                  >
                    {savingGlobal ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddKnowledgeModal({ agentId, onClose, onAdded }) {
  const [activeType, setActiveType] = useState('text') // text, pdf, youtube, website
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [extractedPreview, setExtractedPreview] = useState(null)
  const fileInputRef = useRef(null)

  const typeOptions = [
    { id: 'text', label: 'Texte', icon: FileText, color: 'violet' },
    { id: 'pdf', label: 'PDF', icon: FileText, color: 'red' },
    { id: 'youtube', label: 'YouTube', icon: Video, color: 'red' },
    { id: 'website', label: 'Site web', icon: Globe, color: 'blue' },
  ]

  const handleTextSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      toast.error('Titre et contenu requis')
      return
    }
    setLoading(true)
    try {
      await api.post(`/knowledge/agent/${agentId}`, { title, content, type: 'text' })
      toast.success('Ajouté à la base de connaissances')
      onAdded()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const handleUrlSubmit = async (e) => {
    e.preventDefault()
    if (!url.trim()) {
      toast.error('URL requise')
      return
    }
    setLoading(true)
    try {
      const response = await api.post(`/knowledge/agent/${agentId}/extract-url`, { url, title: title || undefined })
      // Check if we got metadata fallback instead of full transcript
      if (response.data?.metadata?.fallback) {
        toast.success('Métadonnées de la vidéo ajoutées (transcription non disponible)', { duration: 5000 })
      } else {
        toast.success('Contenu extrait et ajouté')
      }
      onAdded()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'extraction')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    if (title) formData.append('title', title)

    setLoading(true)
    try {
      await api.post(`/knowledge/agent/${agentId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Fichier ajouté à la base de connaissances')
      onAdded()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'upload')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-space-900 border border-space-700 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-space-900 p-6 border-b border-space-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold text-gray-100">
              Ajouter à la base de connaissances
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Type selector */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {typeOptions.map((option) => {
              const Icon = option.icon
              const isActive = activeType === option.id
              const colorClasses = {
                violet: isActive ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' : '',
                red: isActive ? 'bg-red-500/20 text-red-400 border-red-500/30' : '',
                blue: isActive ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : '',
              }
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActiveType(option.id)}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-sm font-medium transition-all border ${
                    isActive
                      ? colorClasses[option.color]
                      : 'bg-space-800 text-gray-400 hover:text-gray-300 border-transparent hover:border-space-600'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${
                    option.id === 'youtube' ? 'text-red-500' : 
                    option.id === 'pdf' ? 'text-red-400' : 
                    option.id === 'website' ? 'text-blue-400' : ''
                  }`} />
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-6">
          {/* Text input */}
          {activeType === 'text' && (
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl mb-4">
                <FileText className="w-6 h-6 text-violet-400" />
                <div>
                  <p className="text-sm font-medium text-violet-400">Texte personnalisé</p>
                  <p className="text-xs text-gray-400">Ajoutez des informations que votre agent doit connaître</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Titre *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Horaires d'ouverture"
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Contenu *</label>
                <textarea
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Informations que l'assistant doit connaître..."
                  rows={8}
                  className="input-dark w-full resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">{content.length.toLocaleString()} caractères</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={loading || !title.trim() || !content.trim()} 
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {loading ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </form>
          )}

          {/* YouTube input */}
          {activeType === 'youtube' && (
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                <Video className="w-6 h-6 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-400">Vidéo YouTube</p>
                  <p className="text-xs text-gray-400">La transcription de la vidéo sera automatiquement extraite</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">URL YouTube *</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... ou https://youtu.be/..."
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Titre (optionnel)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Sera extrait automatiquement si non fourni"
                  className="input-dark w-full"
                />
              </div>
              
              {/* Note about YouTube transcripts */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-xs text-amber-400">
                  <strong>Note :</strong> Seules les vidéos avec sous-titres (automatiques ou manuels) peuvent être extraites. 
                  Les vidéos sans sous-titres ou avec sous-titres désactivés ne sont pas supportées.
                </p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={loading || !url.trim()} 
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {loading ? 'Extraction...' : 'Extraire'}
                </button>
              </div>
            </form>
          )}

          {/* Website input */}
          {activeType === 'website' && (
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-4">
                <Globe className="w-6 h-6 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-blue-400">Page web</p>
                  <p className="text-xs text-gray-400">Le contenu textuel de la page sera automatiquement extrait</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">URL du site *</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/page-a-extraire"
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Titre (optionnel)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Sera extrait automatiquement si non fourni"
                  className="input-dark w-full"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={loading || !url.trim()} 
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {loading ? 'Extraction...' : 'Extraire'}
                </button>
              </div>
            </form>
          )}

          {/* PDF upload */}
          {activeType === 'pdf' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                <FileText className="w-6 h-6 text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-400">Document PDF</p>
                  <p className="text-xs text-gray-400">Le texte du PDF sera extrait automatiquement</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Titre (optionnel)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Sera extrait du nom de fichier si non fourni"
                  className="input-dark w-full"
                />
              </div>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-red-500/30 hover:border-red-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-red-500/5"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-gray-300 font-medium mb-2">
                  {loading ? 'Extraction en cours...' : 'Cliquez pour sélectionner un PDF'}
                </p>
                <p className="text-sm text-gray-500">
                  Format PDF • Maximum 10 MB
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PlaygroundTab({ agent }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      // Call the real AI test endpoint
      const response = await api.post(`/agents/${agent.id}/test`, { message: userMessage })
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.response,
        model: response.data.model
      }])
    } catch (error) {
      console.error('Playground error:', error)
      toast.error(error.response?.data?.error || 'Erreur lors de la génération')
      // Remove the user message if there was an error
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-space-700 bg-space-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-semibold text-gray-100">Testez votre assistant</h2>
              <p className="text-sm text-gray-400">Testez les réponses IA en temps réel</p>
            </div>
            <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-1 rounded-full">
              {agent.model || 'gemini-1.5-flash'}
            </span>
          </div>
        </div>

        <div className="h-96 overflow-y-auto p-4 space-y-4 bg-space-800">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Envoyez un message pour tester votre assistant</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'chat-bubble-user'
                      : 'chat-bubble-bot'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="chat-bubble-bot px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-space-700 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tapez un message..."
            className="input-dark flex-1 rounded-full"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-10 h-10 bg-gradient-to-br from-gold-400 to-gold-500 text-space-950 rounded-full flex items-center justify-center hover:shadow-lg hover:shadow-gold-400/20 disabled:opacity-50 transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}

// ==================== TEMPLATES TAB ====================
function TemplatesTab({ agentId }) {
  const { showConfirm } = useConfirm()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)

  useEffect(() => {
    loadTemplates()
  }, [agentId])

  const loadTemplates = async () => {
    try {
      const response = await api.get(`/agents/${agentId}/templates`)
      setTemplates(response.data.templates)
    } catch (error) {
      toast.error('Erreur lors du chargement des templates')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (templateId) => {
    const ok = await showConfirm({
      title: 'Supprimer le template',
      message: 'Supprimer définitivement ce template ? Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/agents/${agentId}/templates/${templateId}`)
      toast.success('Template supprimé')
      loadTemplates()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content)
    toast.success('Copié dans le presse-papier')
  }

  const CATEGORIES = {
    general: { label: 'Général', color: 'bg-gray-500' },
    greeting: { label: 'Salutation', color: 'bg-emerald-500' },
    closing: { label: 'Clôture', color: 'bg-blue-500' },
    faq: { label: 'FAQ', color: 'bg-violet-500' },
    promotion: { label: 'Promotion', color: 'bg-amber-500' }
  }

  if (loading) {
    return <div className="animate-pulse bg-space-800 h-64 rounded-xl"></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-400">{templates.length} templates</p>
        </div>
        <button
          onClick={() => { setEditingTemplate(null); setShowModal(true) }}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Créer un template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">
            Créez des templates de réponses rapides pour gagner du temps
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Créer un template
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <div key={template.id} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-100">{template.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs text-white ${CATEGORIES[template.category]?.color || 'bg-gray-500'}`}>
                    {CATEGORIES[template.category]?.label || template.category}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleCopy(template.content)}
                    className="p-1.5 hover:bg-space-700 rounded-lg transition-colors"
                    title="Copier"
                  >
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => { setEditingTemplate(template); setShowModal(true) }}
                    className="p-1.5 hover:bg-space-700 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
              {template.shortcut && (
                <p className="text-xs text-gold-400 mb-2 font-mono">/{template.shortcut}</p>
              )}
              <p className="text-sm text-gray-400 line-clamp-3">{template.content}</p>
              <p className="text-xs text-gray-600 mt-2">Utilisé {template.usage_count} fois</p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TemplateModal
          template={editingTemplate}
          agentId={agentId}
          onClose={() => { setShowModal(false); setEditingTemplate(null) }}
          onSaved={() => { setShowModal(false); setEditingTemplate(null); loadTemplates() }}
        />
      )}
    </div>
  )
}

function TemplateModal({ template, agentId, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    content: template?.content || '',
    shortcut: template?.shortcut || '',
    category: template?.category || 'general'
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.content) {
      toast.error('Nom et contenu requis')
      return
    }

    setSaving(true)
    try {
      if (template) {
        await api.put(`/agents/${agentId}/templates/${template.id}`, formData)
        toast.success('Template mis à jour')
      } else {
        await api.post(`/agents/${agentId}/templates`, formData)
        toast.success('Template créé')
      }
      onSaved()
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="card w-full max-w-lg relative z-10">
        <div className="p-6 border-b border-space-700">
          <h2 className="text-xl font-display font-semibold text-gray-100">
            {template ? 'Modifier le template' : 'Nouveau template'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nom</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Salutation client"
              className="input-dark w-full"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Raccourci</label>
              <div className="input-with-icon">
                <div className="pl-3 flex items-center justify-center flex-shrink-0 text-gray-500">/</div>
                <input
                  type="text"
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.replace(/[^a-z0-9]/gi, '') })}
                  placeholder="bonjour"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Catégorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-dark w-full"
              >
                <option value="general">Général</option>
                <option value="greeting">Salutation</option>
                <option value="closing">Clôture</option>
                <option value="faq">FAQ</option>
                <option value="promotion">Promotion</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Contenu</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={5}
              placeholder="Le texte du message..."
              className="input-dark w-full"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
              {saving ? 'Sauvegarde...' : template ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ==================== BLACKLIST TAB ====================
function BlacklistTab({ agentId }) {
  const { showConfirm } = useConfirm()
  const [blacklist, setBlacklist] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadBlacklist()
  }, [agentId])

  const loadBlacklist = async () => {
    try {
      const response = await api.get(`/agents/${agentId}/blacklist`)
      setBlacklist(response.data.blacklist)
    } catch (error) {
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (entryId) => {
    const ok = await showConfirm({
      title: 'Retirer de la liste noire',
      message: 'Retirer ce contact de la liste noire ? Il pourra à nouveau envoyer des messages.',
      variant: 'warning',
      confirmLabel: 'Retirer'
    })
    if (!ok) return
    try {
      await api.delete(`/agents/${agentId}/blacklist/${entryId}`)
      toast.success('Contact retiré de la liste noire')
      loadBlacklist()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  if (loading) {
    return <div className="animate-pulse bg-space-800 h-64 rounded-xl"></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-400">{blacklist.length} contacts bloqués</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Bloquer un contact
        </button>
      </div>

      {blacklist.length === 0 ? (
        <div className="card p-12 text-center">
          <Ban className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">Aucun contact bloqué</p>
          <p className="text-sm text-gray-500">
            Les contacts dans la liste noire ne recevront plus de réponses automatiques
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-space-700 text-left">
                <th className="p-4 text-sm font-medium text-gray-400">Contact</th>
                <th className="p-4 text-sm font-medium text-gray-400">Numéro</th>
                <th className="p-4 text-sm font-medium text-gray-400">Raison</th>
                <th className="p-4 text-sm font-medium text-gray-400">Date</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {blacklist.map((entry) => (
                <tr key={entry.id} className="border-b border-space-700/50 last:border-0">
                  <td className="p-4">
                    <span className="font-medium text-gray-100">
                      {entry.contact_name || 'Inconnu'}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 font-mono text-sm">
                    {entry.contact_jid?.split('@')[0]}
                  </td>
                  <td className="p-4 text-gray-400 text-sm">
                    {entry.reason || '-'}
                  </td>
                  <td className="p-4 text-gray-500 text-sm">
                    {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleRemove(entry.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Retirer de la liste noire"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-400 font-medium">Comment ça fonctionne</p>
            <p className="text-sm text-gray-400 mt-1">
              Les contacts dans la liste noire peuvent toujours vous envoyer des messages,
              mais l'agent ne répondra pas automatiquement. Leurs messages seront toujours
              enregistrés dans les conversations.
            </p>
          </div>
        </div>
      </div>

      {showModal && (
        <AddToBlacklistModal
          agentId={agentId}
          onClose={() => setShowModal(false)}
          onAdded={() => { setShowModal(false); loadBlacklist() }}
        />
      )}
    </div>
  )
}

function AddToBlacklistModal({ agentId, onClose, onAdded }) {
  const [contactNumber, setContactNumber] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!contactNumber) {
      toast.error('Numéro de téléphone requis')
      return
    }

    setSaving(true)
    try {
      // Format the JID
      const cleanNumber = contactNumber.replace(/[^0-9]/g, '')
      const contact_jid = `${cleanNumber}@s.whatsapp.net`
      
      await api.post(`/agents/${agentId}/blacklist`, {
        contact_jid,
        contact_name: contactNumber,
        reason
      })
      toast.success('Contact ajouté à la liste noire')
      onAdded()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'ajout')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="card w-full max-w-md relative z-10">
        <div className="p-6 border-b border-space-700">
          <h2 className="text-xl font-display font-semibold text-gray-100">Bloquer un contact</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Numéro de téléphone
            </label>
            <input
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="Ex: 33612345678"
              className="input-dark w-full"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Entrez le numéro avec l'indicatif pays, sans + ni espaces
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Raison (optionnel)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Spam, Harcèlement..."
              className="input-dark w-full"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
              {saving ? 'Ajout...' : 'Bloquer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
