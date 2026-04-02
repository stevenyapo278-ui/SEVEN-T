import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { registerLocale } from 'react-datepicker'
import fr from 'date-fns/locale/fr'
registerLocale('fr', fr)
import api, { syncChats, getSyncStatus, getContacts } from '../services/api'
import { useConfirm } from '../contexts/ConfirmContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
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
  Check,
  Maximize2,
  Minimize2,
  Lock,
  Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useOnboardingTour } from '../components/Onboarding'
import ToolAssignmentModal from '../components/ToolAssignmentModal'
import { useWhatsAppSocket } from '../hooks/useWhatsAppSocket'


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

// Reorganized tabs - grouped by function
const TABS = (t) => [
  { id: 'overview', label: t('agents.detail.tabs.overview'), icon: Bot },
  { id: 'conversations', label: t('agents.detail.tabs.conversations'), icon: MessageSquare },
  { id: 'knowledge', label: t('agents.detail.tabs.knowledge'), icon: BookOpen },
  { id: 'settings', label: t('agents.detail.tabs.settings'), icon: Settings },
  { id: 'playground', label: t('agents.detail.tabs.playground'), icon: Play },
]


// Get the best display name for a contact
const getDisplayName = (conv, t) => {
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
  return conv.contact_number || t('agents.unknown')
}

export default function AgentDetail() {
  const { t } = useTranslation()
  const { startTour, completedTours } = useOnboardingTour()
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

  // Start tour automatically on first visit to agent detail
  useEffect(() => {
    if (!completedTours.includes('agentDetail')) {
      startTour('agentDetail')
    }
  }, [completedTours, startTour])

  // If user switches to knowledge tab, and hasn't done the knowledge tour, start it
  useEffect(() => {
    if (activeTab === 'knowledge' && !completedTours.includes('add_knowledge')) {
      startTour('add_knowledge')
    }
  }, [activeTab, completedTours, startTour])

  const loadAgent = async () => {
    try {
      const response = await api.get(`/agents/${id}`)
      setAgent(response.data.agent)
    } catch (error) {
      toast.error(t('agents.notFound'))
      navigate('/dashboard/agents')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async () => {
    if (isActive) {
      const ok = await showConfirm({
        title: t('agents.confirm.deactivateOneTitle'),
        message: t('agents.confirm.deactivateOneMessage', { name: agent?.name }),
        variant: 'warning',
        confirmLabel: t('agents.actions.deactivate')
      })
      if (!ok) return
    }
    setToggling(true)
    try {
      await api.put(`/agents/${id}`, { is_active: isActive ? 0 : 1 })
      toast.success(isActive ? t('agents.actions.deactivated') : t('agents.actions.activated'))
      loadAgent()
    } catch (error) {
      toast.error(t('agents.actions.updateError'))
    } finally {
      setToggling(false)
    }
  }

  const handleDeleteAgent = async () => {
    const ok = await showConfirm({
      title: t('agents.confirm.deleteOneTitle'),
      message: t('agents.confirm.deleteOneMessage'),
      variant: 'danger',
      confirmLabel: t('agents.actions.delete')
    })
    if (!ok) return
    try {
      await api.delete(`/agents/${id}`)
      toast.success(t('agents.actions.deleted'))
      navigate('/dashboard/agents')
    } catch (error) {
      toast.error(error.response?.data?.error || t('agents.actions.deletionError'))
    }
  }

  const pageTitle = agent?.name ? `${agent.name} – Agents` : 'Agent'
  usePageTitle(pageTitle)

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center min-h-64 py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 flex-shrink-0" aria-hidden />
      </div>
    )
  }

  return (
    <div className="min-w-0">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Agents', href: '/dashboard/agents' },
        { label: agent?.name || 'Agent' }
      ]} />
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <button
          onClick={() => navigate('/dashboard/agents')}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-100 mb-3 sm:mb-4 transition-colors touch-target min-h-[44px] -ml-2 pl-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm sm:text-base">{t('agents.backToList')}</span>
        </button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
              !isActive ? 'bg-gray-500/20' :
              agent.whatsapp_connected ? 'bg-emerald-500/20' : 'bg-space-800'
            }`}>
              <Bot className={`w-7 h-7 ${
                !isActive ? 'text-gray-500' :
                agent.whatsapp_connected ? 'text-emerald-400' : 'text-gray-500'
              }`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-lg sm:text-2xl font-display font-bold text-gray-100 truncate">{agent.name}</h1>
                {!isActive && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-400 flex-shrink-0">
                    {t('agents.inactive')}
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm sm:text-base truncate">
                {!isActive 
                  ? <span className="text-gray-500">{t('dashboard.agents.inactive')}</span>
                  : agent.whatsapp_connected 
                    ? <span className="text-emerald-400">{t('common.connected')} - {agent.whatsapp_number}</span>
                    : t('agents.notConnected')
                }
              </p>
            </div>
          </div>
          
          {/* Toggle Active + Supprimer */}
          <div className="flex flex-row flex-wrap gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={handleToggleActive}
              disabled={toggling}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl font-medium transition-all min-h-[44px] touch-target ${
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
              {isActive ? t('common.active') : t('common.inactive')}
            </button>
            <button
              onClick={handleDeleteAgent}
              className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl font-medium transition-all border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 min-h-[44px] touch-target"
            >
              <Trash2 className="w-5 h-5" />
              {t('agents.deleteAgent')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs — scroll on small screens */}
      <div className="border-b border-space-700 mb-6 overflow-x-auto overflow-y-hidden -mx-1 px-1 sm:mx-0 sm:px-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-4 sm:gap-6 min-w-max">
          {TABS(t).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-tour={`tab-${tab.id}`}
              className={`flex items-center gap-2 pb-3 pt-1 px-2 sm:px-0 border-b-2 transition-colors whitespace-nowrap flex-shrink-0 min-h-[44px] touch-target text-sm sm:text-base ${
                activeTab === tab.id
                  ? 'border-gold-400 text-gold-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
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
  const { t } = useTranslation()
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
  const [showToolModal, setShowToolModal] = useState(false)
  const intervalRef = useRef(null)
  const countdownRef = useRef(null)
  const statsIntervalRef = useRef(null) // For polling stats
  const isUserConnecting = useRef(false) // Track if user initiated connection

  // Subscribe to real-time WhatsApp updates
  const { connected: socketConnected } = useWhatsAppSocket({
    onStatus: (payload) => {
        if (payload.toolId === agent.tool_id || payload.toolId === agent.id) {
            console.log('[WhatsApp Socket] Status update:', payload);
            setStatus(payload);
            
            if (payload.status === 'connected' && isUserConnecting.current) {
                toast.success(t('agents.connection.success'));
                isUserConnecting.current = false;
                setLoading(false);
                setConnecting(false);
                onUpdate();
            }
        }
    },
    onQR: (payload) => {
        if (payload.toolId === agent.tool_id || payload.toolId === agent.id) {
            console.log('[WhatsApp Socket] New QR received');
            setQrCode(payload.qr);
            setLoading(false);
            setConnecting(false);
        }
    }
  });

  const QR_REFRESH_INTERVAL = 20 // seconds before QR code refreshes

  useEffect(() => {
    if (!agent.tool_id) {
      setStatus({ status: 'disconnected', message: t('agents.disconnected') })
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
    
    toast.success(t('agents.connection.cancelled'))
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
      const statsRes = await api.get(`/stats/agent/${agent.id}`)
      const statsData = statsRes.data.stats
      
      // Load actual recent conversations separately for the list
      const convRes = await api.get(`/conversations/agent/${agent.id}?limit=3`)
      const conversations = convRes.data.conversations || []

      const aiMessages = statsData.messages.by_role?.find(r => r.role === 'assistant')?.count || 0

      setStats({
        totalConversations: statsData.conversations.total,
        todayConversations: statsData.conversations.today,
        totalMessages: statsData.messages.total,
        aiMessages: aiMessages,
        recentConversations: conversations
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
      toast.success(t('agents.connection.syncSuccess'))
      await checkSyncStatus()
    } catch (error) {
      toast.error(error.response?.data?.error || t('agents.actions.syncError')) // Added syncError later
    } finally {
      setSyncing(false)
    }
  }

  const handleCleanup = async () => {
    try {
      const response = await api.post(`/whatsapp/cleanup/${agent.id}`)
      toast.success(response.data.message || t('common.success'))
      // Reload stats after cleanup
      loadStats()
    } catch (error) {
      toast.error(error.response?.data?.error || t('agents.actions.updateError'))
    }
  }

  const checkStatus = async () => {
    try {
      const response = await api.get(`/whatsapp/status/${agent.id}`)
      setStatus(response.data)
      
      if (response.data.status === 'qr') {
        const qrRes = await api.get(`/whatsapp/qr/${agent.id}`)
        if (qrRes.data.qr) {
          setConnecting(false)
          setLoading(false)
          setQrCode(qrRes.data.qr)
        } else {
          // Status is QR but code is not ready yet or was cleared
          setQrCode(null)
          if (!loading) setConnecting(true) // Show "Initialisation..."
        }
      } else if (response.data.status === 'connecting') {
        setConnecting(true)
        // Keep QR if it was already there for a split second
      } else if (response.data.status === 'connected') {
        // ... rest of connected logic ...
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        if (countdownRef.current) {
          clearInterval(countdownRef.current)
          countdownRef.current = null
        }
        
        if (isUserConnecting.current) {
          setConnecting(true)
          toast.success(t('agents.connection.success'))
          isUserConnecting.current = false
          
          setTimeout(() => {
            setQrCode(null)
            setConnecting(false)
            setLoading(false)
            onUpdate()
          }, 1500)
        } else {
          setStatus(response.data)
        }
      } else {
        // Disconnected, error, etc.
        setQrCode(null)
        setConnecting(false)
        if (loading && response.data.status === 'disconnected') {
           // Still waiting for the first connect event to trigger a QR the right way?
        } else {
           setLoading(false)
        }
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setStatus({ status: 'disconnected', message: t('agents.disconnected') })
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
        toast.success(t('agents.connection.sessionInitiated'))
      } else {
        await api.post(`/whatsapp/connect/${agent.id}`)
        toast.success(t('dashboard.alerts.reconnect'))
      }
      
      // Poll for QR code as fallback only (reduced frequency)
      if (!socketConnected) {
          intervalRef.current = setInterval(checkStatus, 5000)
      }
    } catch (error) {
      toast.error(error.response?.data?.error || t('agents.actions.loadError'))
      isUserConnecting.current = false
      setLoading(false)
    }
    // Note: Don't set loading to false here - keep it true until QR code arrives
  }

  const handleForceReconnect = async () => {
    const ok = await showConfirm({
      title: t('agents.connection.reconnectTitle'),
      message: t('agents.connection.reconnectWarning'),
      variant: 'warning',
      confirmLabel: t('common.confirm')
    })
    if (!ok) return
    await handleConnect(true)
  }

  const handleDisconnect = async () => {
    const ok = await showConfirm({
      title: t('agents.connection.disconnectTitle'),
      message: t('agents.connection.disconnectConfirm'),
      variant: 'warning',
      confirmLabel: t('agents.actions.deactivate')
    })
    if (!ok) return
    try {
      await api.post(`/whatsapp/disconnect/${agent.id}`)
      toast.success(t('dashboard.agents.disconnected'))
      setStatus({ status: 'disconnected' })
      setQrCode(null)
      onUpdate()
    } catch (error) {
      toast.error(t('agents.actions.deactivationError'))
    }
  }

  const handleClearConversations = async () => {
    let ok = false
    try {
      ok = await showConfirm({
        title: t('agents.connection.clearConvsTitle'),
        message: t('agents.connection.clearConvsWarning'),
        variant: 'danger',
        confirmLabel: t('common.delete')
      })
    } catch (_) {}
    if (!ok) return
    try {
      const response = await api.post(`/whatsapp/clear-conversations/${agent.id}`)
      toast.success(response.data.message || t('common.success'))
      loadStats()
    } catch (error) {
      toast.error(t('agents.actions.deletionError'))
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="card p-3 sm:p-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-gray-100 truncate">{stats?.totalConversations || 0}</p>
              <p className="text-xs text-gray-500">{t('agents.detail.stats.conversations')}</p>
            </div>
          </div>
        </div>
        <div className="card p-3 sm:p-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-gray-100 truncate">{stats?.todayConversations || 0}</p>
              <p className="text-xs text-gray-500">{t('agents.detail.stats.today')}</p>
            </div>
          </div>
        </div>
        <div className="card p-3 sm:p-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <Send className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-gray-100 truncate">{stats?.aiMessages || 0}</p>
              <p className="text-xs text-gray-500">{t('agents.detail.stats.aiSent', 'AI Sent')}</p>
            </div>
          </div>
        </div>
        <div className="card p-3 sm:p-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-gray-100 truncate">{stats?.totalMessages || 0}</p>
              <p className="text-xs text-gray-500">{t('agents.detail.stats.messages')}</p>
            </div>
          </div>
        </div>
        <div className="card p-3 sm:p-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gold-400/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gold-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-gray-100 truncate">{contacts.length || 0}</p>
              <p className="text-xs text-gray-500">{t('agents.detail.stats.contacts')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        {/* Tool Assignment Summary */}
        <div className="card p-4 sm:p-6 min-w-0">
          <h2 className="text-base sm:text-lg font-display font-semibold text-gray-100 mb-3 sm:mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-gold-400" />
            {t('agents.detail.tool.title', 'WhatsApp Tool')}
          </h2>
          {agent.tool_id ? (
            <div className="p-4 bg-space-800 rounded-xl border border-space-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-300">
                  Outil: {agent.tool_label || agent.tool_id}
                  {agent.tool_phone && (
                    <span className="text-gray-400 ml-1"> — {agent.tool_phone}</span>
                  )}
                </p>
                {status?.status === 'connected' ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                    <Wifi className="w-3 h-3" /> Connecté
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded-full">
                    <WifiOff className="w-3 h-3" /> Déconnecté
                  </span>
                )}
              </div>
              
              {status?.status && status.status !== 'connected' && status.status !== 'disconnected' && (
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw className="w-3 h-3 text-gold-400 animate-spin" />
                  <p className="text-xs text-gray-400">Statut: {status.message || status.status}</p>
                </div>
              )}

              {/* QR Code Display Section */}
              {qrCode && !agent.whatsapp_connected && (
                <div className="mt-4 p-4 bg-white rounded-xl flex flex-col items-center">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 sm:w-64 sm:h-64 mb-3" />
                  <div className="text-center">
                    <p className="text-xs text-gray-900 font-medium mb-1">Scannez avec WhatsApp</p>
                    <p className="text-[10px] text-gray-500">Expire dans {qrCountdown}s</p>
                  </div>
                  <button 
                    onClick={handleCancelQr}
                    className="mt-3 text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Annuler
                  </button>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {status?.status === 'connected' ? (
                  <button
                    onClick={handleDisconnect}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-medium"
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                    Déconnecter
                  </button>
                ) : (
                  <>
                    {!qrCode && (
                      <button
                        onClick={() => handleConnect(false)}
                        disabled={loading || !canConnectWhatsApp()}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors text-xs font-medium disabled:opacity-50"
                      >
                        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                        Connecter
                      </button>
                    )}
                    <button
                      onClick={handleForceReconnect}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-space-700 text-gray-300 hover:bg-space-600 transition-colors text-xs font-medium"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Réinitialiser la session
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed border-space-700 rounded-2xl text-center">
              <Bot className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400 mb-4">Aucun outil WhatsApp n'est assigné à cet agent.</p>
              <button
                onClick={() => setShowToolModal(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Assigner un outil
              </button>
            </div>
          )}

          {agent.tool_id && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => setShowToolModal(true)}
                className="text-xs text-gray-400 hover:text-gold-400 flex items-center gap-1 transition-colors"
              >
                <Wrench className="w-3.5 h-3.5" />
                {t('agents.detail.tool.change', 'Changer d\'outil')}
              </button>
              <Link
                to="/dashboard/tools"
                className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1 transition-colors"
              >
                {t('agents.detail.tool.manage', 'Gérer les outils')} →
              </Link>
            </div>
          )}
        </div>

        {showToolModal && (
          <ToolAssignmentModal
            agentId={agent.id}
            currentToolId={agent.tool_id}
            onClose={() => setShowToolModal(false)}
            onAssigned={() => {
              setShowToolModal(false)
              onUpdate()
            }}
          />
        )}

        {/* Recent Conversations */}
        <div className="card p-4 sm:p-6 min-w-0">
          <h2 className="text-base sm:text-lg font-display font-semibold text-gray-100 mb-3 sm:mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gold-400" />
            {t('agents.detail.summary.recentConversations', 'Recent Conversations')}
          </h2>
          
          {stats?.recentConversations?.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {stats.recentConversations.map((conv, idx) => (
                <Link
                  key={conv.id || conv.contact_jid || idx}
                  to={`/dashboard/conversations/${conv.id}`}
                  className="flex items-center gap-3 p-3 bg-space-800/50 rounded-xl hover:bg-space-800 transition-colors min-h-[52px] touch-target"
                >
                  <ProfileAvatar 
                    agentId={agent.id}
                    contactJid={conv.contact_jid}
                    name={getDisplayName(conv, t)}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-100 truncate">
                      {getDisplayName(conv, t)}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{conv.last_message || t('agents.detail.summary.noMessage', 'No message')}</p>
                  </div>
                  <span className="text-xs text-gray-600 flex-shrink-0">{conv.message_count} {t('agents.detail.stats.messagesCount', 'msg')}</span>
                </Link>
              ))}
              <Link
                to={`/dashboard/conversations`}
                className="block text-center text-sm text-gold-400 hover:text-gold-300 pt-2 py-3 touch-target"
              >
                {t('agents.detail.summary.viewAll', 'View all conversations')} →
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{t('agents.detail.summary.noConversations', 'No conversations')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-4 sm:p-6 min-w-0">
        <h2 className="text-base sm:text-lg font-display font-semibold text-gray-100 mb-3 sm:mb-4">{t('agents.detail.summary.quickActions', 'Quick Actions')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Link
            to={`/dashboard/agents/${agent.id}?tab=settings`}
            className="flex flex-col items-center justify-center gap-2 p-4 bg-space-800/50 rounded-xl hover:bg-space-800 transition-colors min-h-[88px] sm:min-h-0 touch-target"
          >
            <Settings className="w-6 h-6 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-300 text-center">{t('agents.detail.summary.settings', 'Settings')}</span>
          </Link>
          <Link
            to={`/dashboard/agents/${agent.id}?tab=knowledge`}
            className="flex flex-col items-center justify-center gap-2 p-4 bg-space-800/50 rounded-xl hover:bg-space-800 transition-colors min-h-[88px] sm:min-h-0 touch-target"
          >
            <BookOpen className="w-6 h-6 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-300 text-center">{t('agents.detail.summary.knowledge', 'Knowledge')}</span>
          </Link>
          <Link
            to={`/dashboard/agents/${agent.id}?tab=playground`}
            className="flex flex-col items-center justify-center gap-2 p-4 bg-space-800/50 rounded-xl hover:bg-space-800 transition-colors min-h-[88px] sm:min-h-0 touch-target"
          >
            <Play className="w-6 h-6 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-300 text-center">{t('agents.detail.summary.test', 'Test')}</span>
          </Link>
          <button
            onClick={loadStats}
            className="flex flex-col items-center justify-center gap-2 p-4 bg-space-800/50 rounded-xl hover:bg-space-800 transition-colors min-h-[88px] sm:min-h-0 touch-target"
          >
            <RefreshCw className="w-6 h-6 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-300 text-center">{t('agents.detail.summary.refresh', 'Refresh')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Conversations Tab
function ConversationsTab({ agent }) {
  const { t, i18n } = useTranslation()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const pollIntervalRef = useRef(null)

  useEffect(() => {
    loadConversations()
    
    // Start polling for new conversations every 15 seconds
    pollIntervalRef.current = setInterval(() => {
      loadConversations(true) // silent refresh
    }, 15000)
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [agent.id])

  const loadConversations = async (silent = false) => {
    try {
      const response = await api.get(`/conversations/agent/${agent.id}`)
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
    
    if (diff < 60000) return t('agents.detail.summary.updateAt', 'Just now')
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return date.toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')
  }

  if (loading) {
    return <div className="animate-pulse bg-space-800 h-64 rounded-xl"></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-400">{conversations.length} {t('agents.detail.stats.conversations', 'conversations')}</p>
        <button onClick={loadConversations} className="text-gold-400 hover:text-gold-300 text-sm">
          <RefreshCw className="w-4 h-4 inline mr-1" />
          {t('agents.detail.summary.refresh', 'Refresh')}
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">{t('agents.detail.summary.noConversations', 'No conversations')}</p>
          <p className="text-sm text-gray-500 mt-2">
            {t('agents.detail.summary.noConversationsDesc', 'Conversations will appear here when users send messages.')}
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-space-700">
          {conversations.map((conv, idx) => (
            <Link
              key={conv.id || conv.contact_jid || idx}
              to={`/dashboard/conversations/${conv.id}`}
              className="flex items-center gap-4 p-4 hover:bg-space-800 transition-colors"
            >
              <ProfileAvatar 
                agentId={agent.id}
                contactJid={conv.contact_jid}
                name={getDisplayName(conv, t)}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-100 truncate">{getDisplayName(conv, t)}</h3>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(conv.last_message_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-400 truncate">{conv.last_message || 'Aucun message'}</p>
                <span className="text-xs text-gray-500">{conv.message_count || 0} {t('agents.detail.stats.messages', 'messages')}</span>
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
  const { t } = useTranslation()
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
        <p className="text-gray-400">{t('dashboard.agents.disconnected', 'Disconnected')}</p>
        <p className="text-sm text-gray-500 mt-2">
          {t('agents.detail.blacklist.modal.numberHint', 'Connect WhatsApp to see your contacts.')}
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
        <p className="text-gray-400">{contacts.length} {t('agents.detail.stats.contacts', 'contacts')}</p>
        <button onClick={loadContacts} className="text-gold-400 hover:text-gold-300 text-sm">
          <RefreshCw className="w-4 h-4 inline mr-1" />
          {t('agents.detail.summary.refresh', 'Refresh')}
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">{t('agents.detail.knowledge.noGlobalAvailable', 'No contact found')}</p>
          <p className="text-sm text-gray-500 mt-2">
            {t('agents.detail.knowledge.assignedGlobalDesc', 'Synchronize your contacts from the Connection tab.')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact, index) => (
            <div key={contact.jid || index} className="card p-4 animate-fadeIn" style={{ animationDelay: `${index * 50}ms` }}>
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
  const { t } = useTranslation()
  const { user } = useAuth()
  const { showConfirm } = useConfirm()
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
    calendar_tool_id: agent.calendar_tool_id || '',
    outlook_tool_id: agent.outlook_tool_id || '',
    // Availability settings
    availability_enabled: agent.availability_enabled === 1,
    availability_start: agent.availability_start || '09:00',
    availability_end: agent.availability_end || '18:00',
    availability_days: agent.availability_days || '1,2,3,4,5',
    availability_timezone: agent.availability_timezone || 'Europe/Paris',
    absence_message: agent.absence_message || t('agents.detail.settings.absenceMessagePlaceholder', 'Thank you for your message! We are currently unavailable. We will get back to you as soon as possible.'),
    // Human transfer settings
    human_transfer_enabled: agent.human_transfer_enabled === 1,
    human_transfer_keywords: agent.human_transfer_keywords || t('agents.detail.settings.keywordsHint', 'human,agent,support,speak to someone'),
    human_transfer_message: agent.human_transfer_message || t('agents.detail.settings.transferMessageHint', 'I am transferring you to an advisor. Please wait.'),
    // Rate limiting
    max_messages_per_day: agent.max_messages_per_day || 0
  })
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('general')
  const [templateOptions, setTemplateOptions] = useState([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [tools, setTools] = useState([])
  const [toolsLoading, setToolsLoading] = useState(false)
  const [availableModels, setAvailableModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [systemPromptFocusOpen, setSystemPromptFocusOpen] = useState(false)
  useLockBodyScroll(systemPromptFocusOpen)

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

  const handleTemplateChange = async (value) => {
    const nextTemplate = value || null
    const currentTemplate = formData.template || ''
    if (nextTemplate !== currentTemplate) {
      const ok = await showConfirm({
        title: t('agents.detail.settings.type', 'Change Agent Type'),
        message: t('agents.detail.settings.typeHint', 'Changing the agent type can modify the system prompt and agent behavior. Continue?'),
        variant: 'warning',
        confirmLabel: t('agents.detail.settings.type', 'Change Type')
      })
      if (!ok) return
    }
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

  useEffect(() => {
    let isMounted = true
    setLoadingModels(true)
    api.get('/agents/available-models')
      .then((res) => {
        if (!isMounted) return
        setAvailableModels(res.data?.models || [])
      })
      .catch(() => {
        if (!isMounted) return
        setAvailableModels([])
      })
      .finally(() => {
        if (!isMounted) return
        setLoadingModels(false)
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
        human_transfer_enabled: formData.human_transfer_enabled ? 1 : 0,
        calendar_tool_id: formData.calendar_tool_id || null,
        outlook_tool_id: formData.outlook_tool_id || null
      })
      toast.success(t('agents.detail.settings.success', 'Settings saved'))
      onUpdate()
    } catch (error) {
      toast.error(t('agents.detail.settings.error', 'Error during saving'))
    } finally {
      setSaving(false)
    }
  }

  const SECTIONS = [
    { id: 'general', label: t('agents.detail.settings.general', 'General') },
    { id: 'ai', label: t('agents.detail.settings.ai', 'AI Configuration') },
    { id: 'auto_reply', label: t('agents.detail.settings.autoReply', 'Auto Reply') },
    { id: 'availability', label: t('agents.detail.settings.availability', 'Availability') },
    { id: 'transfer', label: t('agents.detail.settings.transfer', 'Human Transfer') },
    { id: 'limits', label: t('agents.detail.settings.limits', 'Limits') }
  ]

  const scrollToSection = (id) => {
    setActiveSection(id)
    document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSaveFromModal = async () => {
    setSaving(true)
    try {
      await api.put(`/agents/${agent.id}`, {
        ...formData,
        template: formData.template || null,
        tool_id: formData.tool_id || null,
        auto_reply: formData.auto_reply ? 1 : 0,
        availability_enabled: formData.availability_enabled ? 1 : 0,
        human_transfer_enabled: formData.human_transfer_enabled ? 1 : 0,
        calendar_tool_id: formData.calendar_tool_id || null,
        outlook_tool_id: formData.outlook_tool_id || null
      })
      toast.success('Paramètres sauvegardés')
      onUpdate()
      setSystemPromptFocusOpen(false)
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id?.replace('settings-', '')
            if (id && SECTIONS.some((s) => s.id === id)) setActiveSection(id)
            break
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(`settings-${s.id}`)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex flex-col md:flex-row gap-6 min-w-0">
      {/* Navigation: masquée sur mobile, sidebar sur desktop */}
      <div className="hidden md:block md:w-52 flex-shrink-0">
        <nav
          className="settings-section-nav flex md:flex-col gap-2 md:gap-1 overflow-x-auto pb-2 md:pb-0 md:overflow-visible md:sticky md:top-4 px-1 -mx-1 md:mx-0 scrollbar-none"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={`settings-section-nav-btn flex-shrink-0 md:w-full text-left px-4 py-2.5 md:px-3 md:py-2 rounded-xl md:rounded-lg text-sm font-medium transition-colors whitespace-nowrap touch-target border border-transparent ${
                activeSection === section.id
                  ? 'settings-section-nav-btn--active bg-gold-400/20 text-gold-400 border-gold-400/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-space-800'
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Form content: toutes les sections visibles, scroll unique */}
      <form onSubmit={handleSubmit} className="flex-1 min-w-0 max-w-2xl space-y-6">
        {/* General Section */}
        <div id="settings-general" className="card p-6 scroll-mt-4">
            <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">{t('agents.detail.settings.info', 'General Information')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t('agents.detail.settings.name', 'Name')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t('agents.detail.settings.type', 'Agent Type')}</label>
                <select
                  value={formData.template || ''}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="input-dark w-full"
                  disabled={isLoadingTemplates}
                >
                  <option value="">{t('agents.detail.settings.generic', 'Generic (support, FAQ, appointments...)')}</option>
                  {templateOptions.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t('agents.detail.settings.typeHint', 'E-commerce: injection of catalog and detection/creation of orders. Other types remain assistants without order logic.')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t('agents.detail.settings.tool', 'Assigned Tool')}</label>
                <select
                  value={formData.tool_id || ''}
                  onChange={(e) => setFormData({ ...formData, tool_id: e.target.value })}
                  className="input-dark w-full"
                  disabled={toolsLoading}
                >
                  <option value="">{t('agents.detail.settings.noTool', 'No tool')}</option>
                  {tools.map((tool) => (
                    <option key={tool.id} value={tool.id}>
                      {[tool.label || tool.type, tool.type, tool.type === 'whatsapp' && tool.meta?.phone ? tool.meta.phone : null].filter(Boolean).join(' — ')}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t('agents.detail.settings.toolHint', 'The main tool (WhatsApp) used by this agent.')}
                </p>
              </div>

              {/* Calendrier Tool */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t('agents.detail.settings.calendarTool', 'Calendar Tool (Booking)')}</label>
                <select
                  value={formData.calendar_tool_id || ''}
                  onChange={(e) => setFormData({ ...formData, calendar_tool_id: e.target.value })}
                  className="input-dark w-full"
                  disabled={toolsLoading}
                >
                  <option value="">{t('agents.detail.settings.noTool', 'No tool (Use default)')}</option>
                  {tools.filter(t => t.type === 'google_calendar').map((tool) => (
                    <option key={tool.id} value={tool.id}>
                      {tool.label || 'Google Calendar'} — {tool.status}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t('agents.detail.settings.calendarToolHint', 'Specific Google Calendar for appointments. If empty, it will use the default one.')}{' '}
                  <Link to="/dashboard/tools" className="text-gold-400 hover:text-gold-300">{t('common.tabs.tools', 'Manage tools')}</Link>.
                </p>
              </div>

              {/* Outlook Tool */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t('agents.detail.settings.outlookTool', 'Outlook Tool (Booking)')}</label>
                <select
                  value={formData.outlook_tool_id || ''}
                  onChange={(e) => setFormData({ ...formData, outlook_tool_id: e.target.value })}
                  className="input-dark w-full"
                  disabled={toolsLoading}
                >
                  <option value="">{t('agents.detail.settings.noTool', 'No tool')}</option>
                  {tools.filter(t => t.type === 'outlook').map((tool) => (
                    <option key={tool.id} value={tool.id}>
                      {tool.label || 'Outlook'} — {tool.status}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t('agents.detail.settings.outlookToolHint', 'Specific Outlook Calendar for appointments.')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t('agents.detail.settings.description', 'Description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="input-dark w-full"
                />
              </div>
            </div>
        </div>

        {/* AI Configuration Section */}
        <div id="settings-ai" className="card p-6 scroll-mt-4">
            <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">{t('agents.detail.settings.ai', 'AI Configuration')}</h2>
            <div className="space-y-4">
              {/* Zone dédiée pour les instructions système (System Prompt) */}
              <div className="rounded-xl border border-space-600 bg-space-800/50 p-4 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label htmlFor="agent-system-prompt" className="text-sm font-medium text-gray-300">
                    {t('agents.detail.settings.systemPrompt', 'System Prompt')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setSystemPromptFocusOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30 transition-colors"
                    title={t('agents.detail.settings.expand', 'Expand')}
                  >
                    <Maximize2 className="w-4 h-4" />
                    {t('agents.detail.settings.expand', 'Expand')}
                  </button>
                </div>
                <textarea
                  id="agent-system-prompt"
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  rows={12}
                  placeholder={t('agents.detail.knowledge.modal.contentPlaceholder', 'Describe your assistant\'s behavior...')}
                  className="w-full rounded-lg border border-space-600 bg-space-900 px-4 py-3 font-mono text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[200px] resize-y"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {t('agents.detail.settings.systemPromptHint', 'These instructions define the personality and behavior of your assistant.')}
                </p>
              </div>

              {/* Modal focus pour éditer le system prompt en grand */}
              {systemPromptFocusOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex flex-col bg-space-950/95 backdrop-blur-sm overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
                  <div className="flex items-center justify-between mb-3 px-4 pt-2">
                    <h3 className="text-lg font-semibold text-gray-100">{t('agents.detail.settings.systemPrompt', 'System Prompt')}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveFromModal}
                        disabled={saving}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white bg-gold-500 hover:bg-gold-400 border border-gold-400/30 transition-all disabled:opacity-50 min-h-[44px]"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? t('agents.detail.actions.saving', 'Saving...') : t('agents.detail.actions.save', 'Save')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSystemPromptFocusOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white bg-space-800 hover:bg-space-700 border border-space-600 transition-all min-h-[44px]"
                      >
                        <Minimize2 className="w-4 h-4" />
                        {t('agents.detail.settings.minimize', 'Minimize')}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 mx-4 mb-4 rounded-xl border border-space-600 bg-space-900 overflow-hidden flex flex-col">
                    <textarea
                      value={formData.system_prompt}
                      onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                      placeholder={t('agents.detail.knowledge.modal.contentPlaceholder', 'Describe your assistant\'s behavior...')}
                      className="flex-1 w-full min-h-0 p-4 font-mono text-sm text-gray-100 placeholder-gray-500 bg-transparent border-0 focus:outline-none focus:ring-0 resize-none"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{t('agents.detail.settings.systemPromptHint', 'Changes are saved temporarily. Save agent to apply.')}</p>
                </div>,
                document.body
              )}
              {user?.is_admin && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">{t('agents.detail.settings.aiModel', 'AI Model')}</label>
                  <select
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="input-dark w-full"
                    disabled={loadingModels}
                  >
                    {availableModels.length > 0 ? (
                      <>
                        {/* Group by provider */}
                        {[...new Set(availableModels.map(m => m.provider))].map(provider => (
                          <optgroup key={provider} label={
                            provider === 'gemini' ? '⚡ Google Gemini' :
                            provider === 'openai' ? '🤖 OpenAI' :
                            provider === 'openrouter' ? '🆓 OpenRouter' : provider.toUpperCase()
                          }>
                            {availableModels
                              .filter(m => m.provider === provider)
                              .map(model => (
                                <option key={model.id} value={model.model_id}>
                                  {model.name} {model.is_free ? '- Gratuit' : ''}
                                </option>
                              ))
                            }
                          </optgroup>
                        ))}
                      </>
                    ) : (
                      <>
                        <optgroup label="⚡ Google Gemini">
                          <option value="gemini-2.0-flash">Gemini 2.0 Flash - Dernier modèle ⭐</option>
                          <option value="gemini-1.5-flash">Gemini 1.5 Flash - Très rapide</option>
                          <option value="gemini-1.5-pro">Gemini 1.5 Pro - Intelligent</option>
                        </optgroup>
                        <optgroup label="🤖 OpenAI">
                          <option value="gpt-4o-mini">GPT-4o Mini - Rapide</option>
                          <option value="gpt-4o">GPT-4o - Très intelligent</option>
                        </optgroup>
                      </>
                    )}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('agents.detail.settings.aiModelHint', 'Sélectionnez le modèle qui animera votre agent.')}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('agents.detail.settings.temperature', 'Temperature')}: <span className="text-gold-400">{formData.temperature}</span>
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
                  {t('agents.detail.settings.temperatureHint', 'Lower = more predictable responses, higher = more creative')}
                </p>
              </div>
            </div>
        </div>

        {/* Auto Reply Section */}
        <div id="settings-auto_reply" className="card p-6 scroll-mt-4">
            <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">{t('agents.detail.settings.autoReply', 'Auto Reply')}</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-300">{t('agents.detail.settings.enableAutoReply', 'Enable auto-replies')}</label>
                  <p className="text-xs text-gray-500">{t('agents.detail.settings.autoReplyHint', 'The agent responds automatically to incoming messages')}</p>
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
                    {t('agents.detail.settings.responseDelay', 'Response delay')}: <span className="text-gold-400">{Number(formData.response_delay)} {t(`agents.detail.settings.seconds${Number(formData.response_delay) !== 1 ? '_plural' : ''}`, 'seconds')}</span>
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
                    {t('agents.detail.settings.responseDelayHint', 'Delay before the agent responds. Simulates natural typing and allows for manual intervention.')}
                  </p>
                </div>
              )}
            </div>
        </div>

        {/* Availability Section */}
        <div id="settings-availability" className="card p-6 scroll-mt-4">
            <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">{t('agents.detail.settings.availability', 'Availability')}</h2>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-medium text-gray-300">{t('agents.detail.settings.enableAvailability', 'Enable schedules')}</label>
                    {!(user?.plan_features?.availability_hours || user?.availability_hours_enabled === 1 || user?.is_admin === 1) && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-[10px] font-bold text-amber-500 border border-amber-500/20 uppercase tracking-wider">Module 1</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{t('agents.detail.settings.availabilityHint', 'The agent only responds during defined hours')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!(user?.plan_features?.availability_hours || user?.availability_hours_enabled === 1 || user?.is_admin === 1)) {
                      toast.error("Ce module n'est pas inclus dans votre plan actuel.");
                      return;
                    }
                    setFormData({ ...formData, availability_enabled: !formData.availability_enabled })
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.availability_enabled ? 'bg-gold-400' : 'bg-space-700'
                  } ${!(user?.plan_features?.availability_hours || user?.availability_hours_enabled === 1 || user?.is_admin === 1) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.availability_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {!(user?.plan_features?.availability_hours || user?.availability_hours_enabled === 1 || user?.is_admin === 1) && (
                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                  <p className="text-xs text-amber-500/80 flex items-center gap-2 font-medium">
                    <Lock className="w-3 h-3" />
                    Le Module 1 (Disponibilité) est réservé aux plans supérieurs.
                  </p>
                </div>
              )}

              {formData.availability_enabled && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">{t('agents.detail.settings.startTime', 'Start time')}</label>
                      <DatePicker
                        selected={formData.availability_start ? new Date(`2000-01-01T${formData.availability_start}`) : null}
                        onChange={(date) => setFormData({ ...formData, availability_start: date ? date.toTimeString().slice(0, 5) : '' })}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Début"
                        dateFormat="HH:mm"
                        locale="fr"
                        className="input-dark w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">{t('agents.detail.settings.endTime', 'End time')}</label>
                      <DatePicker
                        selected={formData.availability_end ? new Date(`2000-01-01T${formData.availability_end}`) : null}
                        onChange={(date) => setFormData({ ...formData, availability_end: date ? date.toTimeString().slice(0, 5) : '' })}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Fin"
                        dateFormat="HH:mm"
                        locale="fr"
                        className="input-dark w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('agents.detail.settings.days', 'Availability days')}</label>
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
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t('agents.detail.settings.timezone', 'Timezone')}</label>
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
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t('agents.detail.settings.absenceMessage', 'Absence message')}</label>
                    <textarea
                      value={formData.absence_message}
                      onChange={(e) => setFormData({ ...formData, absence_message: e.target.value })}
                      rows={3}
                      placeholder={t('agents.detail.settings.absenceMessagePlaceholder', 'Message sent outside of availability hours...')}
                      className="input-dark w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('agents.detail.settings.absenceMessageHint', 'This message is sent once per conversation outside of hours.')}
                    </p>
                  </div>
                </>
              )}
            </div>
        </div>

        {/* Human Transfer Section */}
        <div id="settings-transfer" className="card p-6 scroll-mt-4">
            <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">{t('agents.detail.settings.transfer', 'Human Transfer')}</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-medium text-gray-300">{t('agents.detail.settings.enableTransfer', 'Enable transfer')}</label>
                    {!(user?.plan_features?.human_handoff_alerts || user?.is_admin) && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-[10px] font-bold text-amber-500 border border-amber-500/20 uppercase tracking-wider">Module 4</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{t('agents.detail.settings.transferHint', 'Allows customers to ask to speak to a human')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!(user?.plan_features?.human_handoff_alerts || user?.is_admin)) {
                      toast.error("Ce module n'est pas inclus dans votre plan actuel.");
                      return;
                    }
                    setFormData({ ...formData, human_transfer_enabled: !formData.human_transfer_enabled })
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.human_transfer_enabled ? 'bg-gold-400' : 'bg-space-700'
                  } ${!(user?.plan_features?.human_handoff_alerts || user?.is_admin) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.human_transfer_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {!(user?.plan_features?.human_handoff_alerts || user?.is_admin) && (
                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                  <p className="text-xs text-amber-500/80 flex items-center gap-2 font-medium">
                    <Lock className="w-3 h-3" />
                    Le Module 4 (Transfert Humain) est réservé aux plans supérieurs.
                  </p>
                </div>
              )}

              {formData.human_transfer_enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t('agents.detail.settings.keywords', 'Trigger keywords')}</label>
                    <input
                      type="text"
                      value={formData.human_transfer_keywords}
                      onChange={(e) => setFormData({ ...formData, human_transfer_keywords: e.target.value })}
                      placeholder={t('agents.detail.settings.keywordsHint', 'human, agent, speak to someone')}
                      className="input-dark w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('agents.detail.settings.keywordsHint', 'Separate keywords with commas. Transfer is triggered if one of these words is detected.')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t('agents.detail.settings.transferMessage', 'Transfer message')}</label>
                    <textarea
                      value={formData.human_transfer_message}
                      onChange={(e) => setFormData({ ...formData, human_transfer_message: e.target.value })}
                      rows={2}
                      placeholder={t('agents.detail.settings.transferMessageHint', 'I am transferring you to an advisor...')}
                      className="input-dark w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('agents.detail.settings.transferMessageHint', 'Message sent to the customer during transfer. The agent then stops responding automatically.')}
                    </p>
                  </div>

                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-amber-400">
                      {t('agents.detail.settings.transferNote', 'When a conversation is transferred, the agent stops responding automatically. You can take back control in the Conversations page.')}
                    </p>
                  </div>
                </>
              )}
            </div>
        </div>

        {/* Limits Section */}
        <div id="settings-limits" className="card p-6 scroll-mt-4">
            <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">{t('agents.detail.settings.limits', 'Limits')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('agents.detail.settings.maxMessages', 'Max messages per day per contact')}: <span className="text-gold-400">{formData.max_messages_per_day || t('agents.detail.settings.unlimited', 'Unlimited')}</span>
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

        <div className="sticky bottom-0 pt-4 pb-2 bg-space-950/95 backdrop-blur-sm -mx-1 px-1">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? t('agents.detail.actions.saving', 'Saving...') : t('agents.detail.actions.save', 'Save')}
          </button>
        </div>
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
        <svg className={`${className} text-blue-400`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.27 19.385H1.73A1.73 1.73 0 010 17.655V6.345a1.73 1.73 0 011.73-1.73h20.54A1.73 1.73 0 0124 6.345v11.308a1.73 1.73 0 01-1.73 1.731zM5.769 15.923v-4.5l2.308 2.885 2.307-2.885v4.5h2.308V8.078h-2.308l-2.307 2.885-2.308-2.885H3.46v7.847zM21.232 12h-2.309V8.077h-2.307V12h-2.308l3.461 4.039z"/>
        </svg>
      )
    default:
      return <FileText className={`${className} text-gray-400`} />
  }
}

function KnowledgeTab({ agentId }) {
  const { t } = useTranslation()
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
  useLockBodyScroll(showGlobalSelector || showAddModal)

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
      toast.success(t('agents.detail.knowledge.successSave', 'Assignments saved'))
      setShowGlobalSelector(false)
    } catch (error) {
      toast.error(t('agents.detail.settings.error', 'Error during saving'))
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
      title: t('agents.detail.knowledge.delete', 'Delete item'),
      message: t('agents.detail.knowledge.deleteConfirm', 'Permanently delete this element from the knowledge base?'),
      variant: 'danger',
      confirmLabel: t('agents.detail.actions.delete', 'Delete')
    })
    if (!ok) return
    try {
      await api.delete(`/knowledge/${itemId}`)
      toast.success(t('agents.detail.knowledge.successDelete', 'Deleted'))
      loadKnowledge()
    } catch (error) {
      toast.error(t('agents.detail.settings.error', 'Error'))
    }
  }

  const getTypeLabel = (type) => {
    const labels = {
      'text': t('agents.detail.knowledge.types.text', 'Text'),
      'pdf': 'PDF',
      'youtube': 'YouTube',
      'website': t('agents.detail.knowledge.types.website', 'Website'),
      'markdown': 'Markdown'
    }
    return labels[type] || type
  }

  if (loading) {
    return <div className="animate-pulse bg-space-800 h-64 rounded-xl"></div>
  }

  return (
    <div className="min-w-0 px-1 sm:px-0">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <span className="text-gray-400">
              {stats.total_items || 0} {t('agents.detail.knowledge.items', 'items')}
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400">
              {(stats.total_characters || 0).toLocaleString()} {t('agents.detail.knowledge.characters', 'characters')}
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
          data-tour="add-knowledge-button"
          className="btn-primary inline-flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto touch-target"
        >
          <Plus className="w-5 h-5" />
          {t('agents.detail.actions.add', 'Add')}
        </button>
      </div>

      {/* Global Knowledge Section */}
      <div className="card p-4 sm:p-6 mb-4 sm:mb-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 bg-blue-500/20 rounded-xl flex-shrink-0">
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-gray-100 mb-1 uppercase tracking-tight text-sm">
                {t('agents.detail.knowledge.global', 'Global Knowledge Base')}
              </h4>
              <p className="text-xs text-gray-400">
                {assignedGlobalIds.length === 0 ? (
                  t('agents.detail.knowledge.noGlobal', 'No global knowledge assigned')
                ) : (
                  t('agents.detail.knowledge.globalAssigned', { count: assignedGlobalIds.length })
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowGlobalSelector(true)}
            className="btn-secondary inline-flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto flex-shrink-0 touch-target"
          >
            <Settings className="w-4 h-4" />
            {t('agents.detail.knowledge.manage', 'Manage')}
          </button>
        </div>

        {/* Assigned Items List */}
        {assignedGlobalIds.length > 0 && (
          <div className="mt-6 space-y-2 border-t border-blue-500/10 pt-4">
            <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest mb-3">
              {t('agents.detail.knowledge.assignedItems', 'Assigned Knowledge Bases')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {globalKnowledge
                .filter(kb => assignedGlobalIds.includes(kb.id))
                .map(kb => (
                  <div key={kb.id} className="flex items-center gap-3 p-3 bg-space-950/40 rounded-xl border border-space-700/50 group hover:border-blue-500/30 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-space-800 flex items-center justify-center flex-shrink-0">
                      <KnowledgeTypeIcon type={kb.type} className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-semibold text-gray-100 truncate uppercase tracking-tight">{kb.title}</h5>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                        <span>{getTypeLabel(kb.type)}</span>
                        <span className="opacity-30">•</span>
                        <span>{(kb.content?.length || 0).toLocaleString()} car.</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="mb-4 px-1">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            {t('agents.detail.knowledge.specific', 'Agent-Specific Knowledge')}
          </h4>
        </div>
      )}

      {items.length === 0 && assignedGlobalIds.length === 0 ? (
        <div className="card p-6 sm:p-12 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-space-700 to-space-800 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-gray-500" />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-100 mb-2">{t('agents.detail.knowledge.empty', 'Knowledge base empty')}</h3>
          <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-6 max-w-md mx-auto">
            {t('agents.detail.knowledge.emptyDesc', 'Add information so your assistant can accurately answer your customers\' questions')}
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 bg-space-800 hover:bg-space-700 text-gray-300 rounded-xl transition-colors touch-target"
            >
              <FileText className="w-4 h-4" />
              {t('agents.detail.knowledge.types.text', 'Text')}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 bg-space-800 hover:bg-space-700 text-gray-300 rounded-xl transition-colors touch-target"
            >
              <FileText className="w-4 h-4 text-red-400" />
              PDF
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 bg-space-800 hover:bg-space-700 text-gray-300 rounded-xl transition-colors touch-target"
            >
              <KnowledgeTypeIcon type="youtube" className="w-4 h-4" />
              YouTube
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 bg-space-800 hover:bg-space-700 text-gray-300 rounded-xl transition-colors touch-target"
            >
              <KnowledgeTypeIcon type="website" className="w-4 h-4" />
              {t('agents.detail.knowledge.types.website', 'Website')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div 
              key={item.id || idx} 
              className="card p-3 sm:p-4 hover:border-space-600 transition-colors cursor-pointer min-w-0"
              onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2 bg-space-800 rounded-xl flex-shrink-0">
                  <KnowledgeTypeIcon type={item.type} className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-100 truncate">{item.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-space-800 text-gray-400 rounded-full">
                          {getTypeLabel(item.type)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {item.content?.length?.toLocaleString()} {t('agents.detail.knowledge.characters', 'characters')}
                        </span>
                        {item.metadata?.sourceUrl && (
                          <a 
                            href={item.metadata.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-blue-400 hover:underline truncate max-w-[120px] sm:max-w-[200px]"
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
                      className="text-gray-500 hover:text-red-400 transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 touch-target sm:min-w-0 sm:min-h-0 sm:p-1"
                      title={t('agents.detail.actions.delete', 'Delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className={`text-sm text-gray-400 mt-2 ${expandedItem === item.id ? '' : 'line-clamp-2'}`}>
                    {item.content}
                  </p>
                  {item.content?.length > 200 && (
                    <button className="text-xs text-gold-400 mt-2 min-h-[32px] touch-target">
                      {expandedItem === item.id ? t('agents.detail.settings.minimize', 'Minimize') : t('agents.detail.buttons.seeMore', 'See more...')}
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
      {showGlobalSelector && createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
          <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={() => setShowGlobalSelector(false)} aria-hidden />
          <div className="relative z-10 w-full max-w-3xl bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] sm:max-h-[80vh] flex flex-col animate-fadeIn max-sm:rounded-b-none">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-space-700 flex-shrink-0" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-100 min-w-0">
                  {t('agents.detail.knowledge.assignedGlobal', 'Assign Global Knowledge')}
                </h2>
                <button 
                  onClick={() => setShowGlobalSelector(false)}
                  className="p-2 -m-2 text-gray-500 hover:text-gray-300 touch-target flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={t('agents.detail.actions.cancel', 'Close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-400">
                {t('agents.detail.knowledge.assignedGlobalDesc', 'Select the elements from the global knowledge base that this agent should use')}
              </p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 overscroll-contain" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
              {globalKnowledge.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <Globe className="w-10 h-10 sm:w-12 sm:h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-sm sm:text-base">{t('agents.detail.knowledge.noGlobalAvailable', 'No global knowledge available')}</p>
                  <Link 
                    to="/dashboard/knowledge"
                    className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
                  >
                    {t('agents.detail.knowledge.addGlobalLink', 'Add global knowledge')} →
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
                        className={`card p-3 sm:p-4 cursor-pointer transition-all touch-target min-w-0 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-500/10' 
                            : 'hover:border-space-600'
                        }`}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          {/* Checkbox */}
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isSelected 
                              ? 'bg-blue-500 border-blue-500' 
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
                            <h3 className="font-medium text-gray-100 mb-1 truncate">{item.title}</h3>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs px-2 py-0.5 bg-space-800 text-gray-400 rounded-full">
                                {getTypeLabel(item.type)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {item.content?.length?.toLocaleString()} {t('agents.detail.knowledge.characters', 'characters')}
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
            <div className="p-4 sm:p-6 border-t border-space-700 flex-shrink-0 bg-space-900">
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowGlobalSelector(false)}
                    className="btn-secondary flex-1 sm:flex-none min-h-[44px] touch-target"
                  >
                    {t('agents.detail.actions.cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={handleSaveGlobalAssignments}
                    disabled={savingGlobal}
                    className="btn-primary flex-1 sm:flex-none min-h-[44px] touch-target disabled:opacity-50"
                  >
                    {savingGlobal ? t('agents.detail.actions.saving', 'Saving...') : t('agents.detail.actions.save', 'Save')}
                  </button>
                </div>
                <p className="text-sm text-gray-400 text-center sm:text-left">
                  {t('agents.detail.knowledge.selected', { count: assignedGlobalIds.length })}
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function AddKnowledgeModal({ agentId, onClose, onAdded }) {
  const { t } = useTranslation()
  useLockBodyScroll(true)
  const [activeType, setActiveType] = useState('text') // text, pdf, youtube, website
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [extractedPreview, setExtractedPreview] = useState(null)
  const fileInputRef = useRef(null)

  const typeOptions = [
    { id: 'text', label: t('agents.detail.knowledge.types.text', 'Text'), icon: FileText, color: 'blue' },
    { id: 'pdf', label: 'PDF', icon: FileText, color: 'red' },
    { id: 'youtube', label: 'YouTube', icon: Video, color: 'red' },
    { id: 'website', label: t('agents.detail.knowledge.types.website', 'Website'), icon: Globe, color: 'blue' },
  ]

  const handleTextSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      toast.error(t('agents.detail.knowledge.modal.required', 'Title and content required'))
      return
    }
    setLoading(true)
    try {
      await api.post(`/knowledge/agent/${agentId}`, { title, content, type: 'text' })
      toast.success(t('agents.detail.knowledge.successAdd', 'Added to knowledge base'))
      onAdded()
    } catch (error) {
      toast.error(error.response?.data?.error || t('agents.detail.settings.error', 'Error'))
    } finally {
      setLoading(false)
    }
  }

  const handleUrlSubmit = async (e) => {
    e.preventDefault()
    if (!url.trim()) {
      toast.error(t('agents.detail.knowledge.modal.urlRequired', 'URL required'))
      return
    }
    setLoading(true)
    try {
      const response = await api.post(`/knowledge/agent/${agentId}/extract-url`, { url, title: title || undefined })
      // Check if we got metadata fallback instead of full transcript
      if (response.data?.metadata?.fallback) {
        toast.success(t('agents.detail.knowledge.modal.videoMetadataAdded', 'Video metadata added (transcript not available)'), { duration: 5000 })
      } else {
        toast.success(t('agents.detail.knowledge.modal.contentExtracted', 'Content extracted and added'))
      }
      onAdded()
    } catch (error) {
      toast.error(error.response?.data?.error || t('agents.detail.knowledge.modal.extractError', 'Error during extraction'))
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
      toast.success(t('agents.detail.knowledge.modal.fileAdded', 'File added to knowledge base'))
      onAdded()
    } catch (error) {
      toast.error(error.response?.data?.error || t('agents.detail.knowledge.modal.uploadError', 'Error during upload'))
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-2xl bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] sm:max-h-[80vh] flex flex-col animate-fadeIn max-sm:rounded-b-none" role="dialog" aria-modal="true">
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-space-700" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-display font-semibold text-gray-100">
              {t('agents.detail.knowledge.modal.title', 'Add to knowledge base')}
            </h2>
            <button onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-300 touch-target min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label={t('agents.detail.actions.cancel', 'Close')}>
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Type selector */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {typeOptions.map((option) => {
              const Icon = option.icon
              const isActive = activeType === option.id
              const colorClasses = {
                blue: isActive ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : '',
                red: isActive ? 'bg-red-500/20 text-red-400 border-red-500/30' : '',
              }
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActiveType(option.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all min-h-[64px] ${
                    isActive ? colorClasses[option.color] : 'bg-space-950/50 border-transparent hover:border-space-700'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? (option.color === 'blue' ? 'text-blue-400' : 'text-red-400') : 'text-gray-500'}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-gray-100' : 'text-gray-500'}`}>{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar overscroll-contain" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          {activeType === 'text' ? (
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('agents.detail.knowledge.modal.titleLabel', 'Title')}</label>
                <input
                  type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Politique de livraison" className="input-dark w-full min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('agents.detail.knowledge.modal.contentLabel', 'Content')}</label>
                <textarea
                  required value={content} onChange={(e) => setContent(e.target.value)}
                  placeholder="Décrivez votre savoir ici..." rows={10} className="input-dark w-full resize-none min-h-[150px]"
                />
                <p className="text-xs text-gray-500 mt-1">{content.length.toLocaleString()} {t('agents.detail.knowledge.characters', 'characters')}</p>
              </div>
              <button disabled={loading || !title.trim() || !content.trim()} className="btn-primary w-full py-4 text-base shadow-xl active:scale-[0.98] min-h-[56px] mt-2">
                {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : t('agents.detail.knowledge.modal.submit', 'Add knowledge')}
              </button>
            </form>
          ) : activeType === 'pdf' ? (
            <div className="space-y-6">
               <button onClick={() => fileInputRef.current?.click()} className="w-full py-12 sm:py-20 border-2 border-dashed border-space-700 rounded-3xl bg-space-950/50 hover:bg-space-800 transition-all flex flex-col items-center justify-center gap-4">
                  <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                  <Upload className="w-12 h-12 text-gold-400" />
                  <div className="text-center p-4">
                    <p className="text-lg font-bold text-gray-100">{t('agents.detail.knowledge.modal.importPdf', 'Import PDF')}</p>
                    <p className="text-xs text-gray-500">Maximum 10 Mo</p>
                  </div>
               </button>
            </div>
          ) : (
            <form onSubmit={handleUrlSubmit} className="space-y-6">
               <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                 <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">{t('agents.detail.knowledge.modal.extractionTitle', 'Intelligent Extraction')}</p>
                 <p className="text-sm text-gray-400">{t('agents.detail.knowledge.modal.extractionDesc', 'We will analyze this source to extract relevant knowledge.')}</p>
               </div>
               <input
                 type="url" required value={url} onChange={(e) => setUrl(e.target.value)}
                 placeholder={activeType === 'youtube' ? "Lien de la vidéo YouTube" : "Lien de la page web"} 
                 className="input-dark w-full min-h-[44px]"
               />
               <button disabled={loading || !url.trim()} className="btn-primary w-full py-4 text-base min-h-[56px]">
                 {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : t('agents.detail.knowledge.modal.extract', 'Extract content')}
               </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function PlaygroundTab({ agent }) {
  const { t } = useTranslation()
  const { user } = useAuth()
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
      // Call the real AI test endpoint (send conversation history so the AI has context, e.g. for order flow)
      const response = await api.post(`/agents/${agent.id}/test`, {
        message: userMessage,
        conversation: messages.map(m => ({ role: m.role, content: m.content }))
      })
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.response,
        model: response.data.model,
        provider: response.data.provider,
        credit_warning: response.data.credit_warning
      }])
    } catch (error) {
      console.error('Playground error:', error)
      toast.error(error.response?.data?.error || t('agents.detail.playground.generateError', 'Error during generation'))
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
              <h2 className="font-display font-semibold text-gray-100">{t('agents.detail.playground.title', 'Test your assistant')}</h2>
              <p className="text-sm text-gray-400">{t('agents.detail.playground.subtitle', 'Test AI responses in real-time')}</p>
            </div>
            {user?.is_admin && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Modèle (Settings)</span>
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30">
                  {agent.model || 'gemini-1.5-flash'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="h-96 overflow-y-auto p-4 space-y-4 bg-space-800">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t('agents.detail.playground.empty', 'Send a message to test your assistant')}</p>
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
                  {msg.role === 'assistant' && msg.model && user?.is_admin && (
                    <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-4">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${msg.model === agent.model ? 'bg-white/10 text-gray-400' : 'bg-amber-500/20 text-amber-400 font-bold'}`}>
                        {msg.model === agent.model ? msg.model : `⚠️ Fallback: ${msg.model}`}
                      </span>
                      {msg.credit_warning && (
                        <span className="text-[9px] text-amber-500 italic uppercase">
                          {msg.credit_warning}
                        </span>
                      )}
                    </div>
                  )}
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
            placeholder={t('agents.detail.playground.placeholder', 'Type a message...')}
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
  const { t } = useTranslation()
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
      toast.error(t('agents.detail.templates.loadError', 'Error loading templates'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (templateId) => {
    const ok = await showConfirm({
      title: t('agents.detail.templates.delete', 'Delete template'),
      message: t('agents.detail.templates.deleteConfirm', 'Permanently delete this template? This action is irreversible.'),
      variant: 'danger',
      confirmLabel: t('agents.detail.actions.delete', 'Delete')
    })
    if (!ok) return
    try {
      await api.delete(`/agents/${agentId}/templates/${templateId}`)
      toast.success(t('agents.detail.templates.successDelete', 'Template deleted'))
      loadTemplates()
    } catch (error) {
      toast.error(t('agents.detail.settings.error', 'Error during deletion'))
    }
  }

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content)
    toast.success(t('agents.detail.templates.copied', 'Copied to clipboard'))
  }

  const CATEGORIES = {
    general: { label: t('agents.detail.templates.categories.general', 'General'), color: 'bg-gray-500' },
    greeting: { label: t('agents.detail.templates.categories.greeting', 'Greeting'), color: 'bg-emerald-500' },
    product: { label: t('agents.detail.templates.categories.product', 'Product'), color: 'bg-purple-500' },
    support: { label: t('agents.detail.templates.categories.support', 'Support'), color: 'bg-blue-500' },
    sales: { label: t('agents.detail.templates.categories.sales', 'Sales'), color: 'bg-red-500' },
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
          {t('agents.detail.templates.create', 'Create template')}
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">
            {t('agents.detail.templates.emptyDesc', 'Create quick response templates to save time')}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {t('agents.detail.templates.create', 'Create template')}
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
                    title={t('common.actions.copy', 'Copy')}
                  >
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => { setEditingTemplate(template); setShowModal(true) }}
                    className="p-1.5 hover:bg-space-700 rounded-lg transition-colors"
                    title={t('agents.detail.actions.edit', 'Edit')}
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                    title={t('agents.detail.actions.delete', 'Delete')}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
              {template.shortcut && (
                <p className="text-xs text-gold-400 mb-2 font-mono">/{template.shortcut}</p>
              )}
              <p className="text-sm text-gray-400 line-clamp-3">{template.content}</p>
              <p className="text-xs text-gray-600 mt-2">{t('agents.detail.templates.usedCount', { count: template.usage_count })}</p>
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
  const { t } = useTranslation()
  useLockBodyScroll(true)
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
      toast.error(t('agents.detail.templates.modal.required', 'Name and content required'))
      return
    }

    setSaving(true)
    try {
      if (template) {
        await api.put(`/agents/${agentId}/templates/${template.id}`, formData)
        toast.success(t('agents.detail.templates.successUpdate', 'Template updated'))
      } else {
        await api.post(`/agents/${agentId}/templates`, formData)
        toast.success(t('agents.detail.templates.successCreate', 'Template created'))
      }
      onSaved()
    } catch (error) {
      toast.error(t('agents.detail.settings.error', 'Error during saving'))
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-lg bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col animate-fadeIn max-sm:rounded-b-none overflow-hidden">
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-space-700" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-display font-semibold text-gray-100">
              {template ? t('agents.detail.templates.modal.edit', 'Edit template') : t('agents.detail.templates.modal.new', 'New template')}
            </h2>
            <button type="button" onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-300 min-w-[44px] min-h-[44px] flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t('agents.detail.settings.name', 'Name')}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('agents.detail.templates.modal.namePlaceholder', 'Ex: Client greeting')}
              className="input-dark w-full min-h-[44px]"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">{t('agents.detail.templates.modal.shortcut', 'Shortcut')}</label>
              <div className="input-with-icon">
                <div className="pl-3 flex items-center justify-center flex-shrink-0 text-gray-500">/</div>
                <input
                  type="text"
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.replace(/[^a-z0-9]/gi, '') })}
                  placeholder="bonjour"
                  className="min-h-[44px]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">{t('agents.detail.settings.type', 'Category')}</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-dark w-full min-h-[44px]"
              >
                <option value="general">{t('agents.detail.templates.categories.general', 'General')}</option>
                <option value="greeting">{t('agents.detail.templates.categories.greeting', 'Greeting')}</option>
                <option value="product">{t('agents.detail.templates.categories.product', 'Product')}</option>
                <option value="support">{t('agents.detail.templates.categories.support', 'Support')}</option>
                <option value="sales">{t('agents.detail.templates.categories.sales', 'Sales')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t('agents.detail.knowledge.modal.contentLabel', 'Content')}</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder={t('agents.detail.templates.modal.contentPlaceholder', 'Type the content here...')}
              rows={6}
              className="input-dark w-full resize-none min-h-[120px]"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 min-h-[48px]">
              {t('agents.detail.actions.cancel', 'Cancel')}
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 min-h-[48px] disabled:opacity-50">
              {saving ? t('agents.detail.actions.saving', 'Saving...') : t('agents.detail.actions.save', 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ==================== BLACKLIST TAB ====================
function BlacklistTab({ agentId }) {
  const { t, i18n } = useTranslation()
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
      title: t('agents.detail.blacklist.remove', 'Remove from blacklist'),
      message: t('agents.detail.blacklist.removeConfirm', 'Remove this contact from the blacklist? They will be able to send messages again.'),
      variant: 'warning',
      confirmLabel: t('agents.detail.actions.remove', 'Remove')
    })
    if (!ok) return
    try {
      await api.delete(`/agents/${agentId}/blacklist/${entryId}`)
      toast.success(t('agents.detail.blacklist.successRemove', 'Contact removed from blacklist'))
      loadBlacklist()
    } catch (error) {
      toast.error(t('agents.detail.settings.error', 'Error during deletion'))
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
          {t('agents.detail.blacklist.add', 'Block a contact')}
        </button>
      </div>

      {blacklist.length === 0 ? (
        <div className="card p-12 text-center">
          <Ban className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">{t('agents.detail.blacklist.empty', 'No blocked contacts')}</p>
          <p className="text-sm text-gray-500">
            {t('agents.detail.blacklist.emptyDesc', 'Contacts in the blacklist will no longer receive automatic responses')}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-space-700 text-left">
                <th className="p-4 text-sm font-medium text-gray-400">{t('contacts.list.name', 'Contact')}</th>
                <th className="p-4 text-sm font-medium text-gray-400">{t('contacts.list.number', 'Number')}</th>
                <th className="p-4 text-sm font-medium text-gray-400">{t('agents.detail.blacklist.reason', 'Reason')}</th>
                <th className="p-4 text-sm font-medium text-gray-400">{t('common.date', 'Date')}</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {blacklist.map((entry, idx) => (
                <tr key={entry.id || idx} className="border-b border-space-700/50 last:border-0">
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
                    {new Date(entry.created_at).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleRemove(entry.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                      title={t('agents.detail.blacklist.remove', 'Remove from blacklist')}
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
            <p className="text-sm text-amber-400 font-medium">{t('agents.detail.blacklist.howItWorks', 'How it works')}</p>
            <p className="text-sm text-gray-400 mt-1">
              {t('agents.detail.blacklist.howItWorksDesc', 'Contacts in the blacklist can still send you messages, but the agent will not respond automatically. Their messages will still be recorded in the conversations.')}
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
  const { t } = useTranslation()
  useLockBodyScroll(true)
  const [contactNumber, setContactNumber] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!contactNumber) {
      toast.error(t('agents.detail.blacklist.modal.numberRequired', 'Phone number required'))
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
      toast.success(t('agents.detail.blacklist.successAdd', 'Contact added to blacklist'))
      onAdded()
    } catch (error) {
      toast.error(error.response?.data?.error || t('agents.detail.settings.error', 'Error during addition'))
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-md bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col animate-fadeIn max-sm:rounded-b-none overflow-hidden">
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-space-700" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-display font-semibold text-gray-100">{t('agents.detail.blacklist.add', 'Block a contact')}</h2>
            <button type="button" onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-300 min-w-[44px] min-h-[44px] flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t('contacts.list.number', 'Phone number')}
            </label>
            <input
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="Ex: 33612345678"
              className="input-dark w-full min-h-[44px]"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('agents.detail.blacklist.modal.numberHint', 'Enter the number with the country code, without + or spaces')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t('agents.detail.blacklist.reason', 'Reason')} {t('agents.detail.knowledge.modal.optional', '(optional)')}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Spam, Harcèlement..."
              className="input-dark w-full min-h-[44px]"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 min-h-[48px]">
              {t('agents.detail.actions.cancel', 'Cancel')}
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 min-h-[48px] disabled:opacity-50">
              {saving ? t('agents.detail.actions.adding', 'Adding...') : t('agents.detail.actions.add', 'Block')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

