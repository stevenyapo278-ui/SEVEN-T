import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { useConfirm } from '../contexts/ConfirmContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { AgentCreationWizard, useOnboardingTour } from '../components/Onboarding'
import { 
  Bot, 
  Plus, 
  Search,
  Trash2,
  MessageSquare,
  Power,
  PowerOff,
  TrendingUp,
  Calendar,
  Zap,
  Crown,
  AlertCircle,
  LayoutGrid,
  List,
  CheckSquare,
  Square,
  X,
  ArrowUpDown,
  Clock,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Copy,
  Edit
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import ToolAssignmentModal from '../components/ToolAssignmentModal'

export default function Agents() {
  const { t } = useTranslation()
  const { startTour, endTour, completedTours, activeTour } = useOnboardingTour()
  const { showConfirm } = useConfirm()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [searchParams, setSearchParams] = useSearchParams()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreationWizard, setShowCreationWizard] = useState(false)
  const [selectedAgentForTool, setSelectedAgentForTool] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [quotas, setQuotas] = useState(null)
  const [filter, setFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('last_activity')
  const [selectedAgents, setSelectedAgents] = useState([])
  const [bulkMode, setBulkMode] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)
  
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('seven-t-favorite-agents')
    return saved ? JSON.parse(saved) : []
  })

  useLockBodyScroll(showCreateModal || showCreationWizard)

  const refreshData = async (isInitial = false) => {
    await Promise.all([
      loadAgents(isInitial),
      loadQuotas()
    ])
  }

  useEffect(() => {
    refreshData(true)
  }, [])

  const loadAgents = async (isInitial = false) => {
    setLoadError(null)
    if (isInitial) setLoading(true)
    try {
      const response = await api.get('/agents')
      setAgents(response.data.agents)
    } catch (error) {
      setLoadError(error.message)
    } finally {
      if (isInitial) setLoading(false)
    }
  }

  const loadQuotas = async () => {
    try {
      const response = await api.get('/agents/quotas')
      setQuotas(response.data)
    } catch (error) { console.error(error) }
  }

  const handleCreateAgent = () => {
    if (!canCreateAgent) {
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-bold">{t('agents.alerts.limitTitle')}</span>
          <span className="text-xs opacity-90">{t('agents.alerts.limitUpgrade')} {t('agents.alerts.limitSuffix')}</span>
        </div>,
        { duration: 4000 }
      )
      return
    }
    const hasAgents = agents.length > 0
    if (!hasAgents) setShowCreationWizard(true)
    else setShowCreateModal(true)
  }

  const filteredAgents = agents
    .filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = filter === 'all' 
        || (filter === 'active' && agent.is_active !== 0)
        || (filter === 'inactive' && agent.is_active === 0)
        || (filter === 'connected' && agent.whatsapp_connected)
        || (filter === 'favorites' && favorites.includes(agent.id))
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      const aFav = favorites.includes(a.id) ? 1 : 0
      const bFav = favorites.includes(b.id) ? 1 : 0
      if (aFav !== bFav) return bFav - aFav
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return 0
    })

  const canCreateAgent = quotas && (quotas.remaining.agents === -1 || quotas.remaining.agents > 0)
  const activeAgents = agents.filter(a => a.is_active !== 0).length
  const connectedAgents = agents.filter(a => a.whatsapp_connected).length
  const totalMessages = agents.reduce((sum, a) => sum + Number(a.total_messages || 0), 0)
  const disconnectedActiveAgents = agents.filter(a => a.is_active !== 0 && !a.whatsapp_connected)

  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0">
      {/* Hero Header - Always visible for smooth transition */}
      <div className={`relative rounded-2xl sm:rounded-3xl border p-4 sm:p-8 mb-4 sm:mb-8 ${
        isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200'
      }`}>
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: `url(${isDark ? "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+" : "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2NDc0OGIiIGZpbGwtb3BhY2l0eT0iMC4wNiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+"})` }} />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-xl"><Bot className="w-6 h-6 text-blue-400" /></div>
                <h1 className={`text-2xl sm:text-3xl font-display font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('agents.title')}</h1>
                {quotas ? (
                  <span className="px-3 py-1 bg-gold-400/20 text-gold-400 text-xs font-bold rounded-full">{quotas.plan.displayName}</span>
                ) : (
                  <div className="w-24 h-6 bg-gray-700/50 animate-pulse rounded-full" />
                )}
              </div>
              <p className={`text-base sm:text-lg ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{t('agents.subtitle')}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => refreshData()} disabled={loading} className={`p-2 rounded-xl border transition-all ${isDark ? 'bg-space-800 border-space-700 text-gray-400 hover:text-white' : 'bg-white border-gray-200 text-gray-500'}`}>
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={handleCreateAgent} className={`btn-primary flex items-center gap-2 px-6 py-2 ${!canCreateAgent ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Plus className="w-5 h-5" /> <span>{t('agents.create')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            {loading ? (
              [1, 2, 3, 4].map(i => <SkeletonStat key={i} isDark={isDark} />)
            ) : (
              <>
                <AgentStatCard icon={Bot} color="blue" value={agents.length} label={t('agents.stats.total')} isDark={isDark} />
                <AgentStatCard icon={Activity} color="emerald" value={connectedAgents} label={t('agents.stats.connected')} isDark={isDark} />
                <AgentStatCard icon={MessageSquare} color="blue" value={totalMessages.toLocaleString()} label={t('agents.stats.messages')} isDark={isDark} />
                <AgentStatCard icon={Zap} color="gold" value={quotas?.credits || 0} label={t('agents.stats.credits')} isDark={isDark} />
              </>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400" />
          <p className="mt-4 text-gray-500">{t('common.loading')}</p>
        </div>
      ) : (
        <>
          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('agents.filters.search')}
                className={`w-full pl-10 pr-4 py-2 rounded-xl border focus:outline-none focus:border-blue-500/50 ${isDark ? 'bg-space-800 border-space-700 text-white' : 'bg-white border-gray-200'}`}
              />
            </div>
            {/* ... other filters ... */}
          </div>

          {filteredAgents.length === 0 ? (
            <div className="p-20 text-center card">
              <Bot className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-lg text-gray-400">{t('dashboard.agents.none')}</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAgents.map(agent => (
                <AgentCard key={agent.id} agent={agent} isDark={isDark} canCreateAgent={canCreateAgent} onUpdate={() => refreshData()} />
              ))}
            </div>
          )}
        </>
      )}

      {showCreationWizard && <AgentCreationWizard isOpen={showCreationWizard} onClose={() => setShowCreationWizard(false)} onSuccess={() => refreshData()} />}
      {selectedAgentForTool && <ToolAssignmentModal agentId={selectedAgentForTool.id} currentToolId={selectedAgentForTool.tool_id} onClose={() => setSelectedAgentForTool(null)} onAssigned={() => refreshData()} />}
    </div>
  )
}

function AgentStatCard({ icon: Icon, color, value, label, isDark }) {
  const colors = { blue: 'text-blue-400 bg-blue-400/10', emerald: 'text-emerald-400 bg-emerald-400/10', gold: 'text-gold-400 bg-gold-400/10' }
  return (
    <div className={`rounded-xl p-4 border transition-all ${isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800' : 'bg-white border-gray-100 shadow-sm'}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl flex-shrink-0 ${colors[color] || colors.blue}`}><Icon className="w-5 h-5" /></div>
        <div className="min-w-0">
          <p className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          <p className={`text-[10px] uppercase font-bold tracking-wider truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
        </div>
      </div>
    </div>
  )
}

function SkeletonStat({ isDark }) {
  return (
    <div className={`rounded-xl p-4 border ${isDark ? 'bg-space-800/50 border-space-700/50' : 'bg-white border-gray-100'}`}>
      <div className="animate-pulse flex items-center space-x-3">
        <div className="rounded-lg bg-gray-700/50 h-9 w-9"></div>
        <div className="h-4 bg-gray-700/50 rounded w-1/2"></div>
      </div>
    </div>
  )
}

function AgentCard({ agent, isDark, canCreateAgent, onUpdate }) {
  const navigate = useNavigate()
  const { showConfirm } = useConfirm()
  const { t } = useTranslation()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDelete = async (e) => {
    e.stopPropagation()
    setShowMenu(false)
    const ok = await showConfirm({
      title: t('agents.confirm.deleteOneTitle'),
      message: t('agents.confirm.deleteOneMessage'),
      variant: 'danger',
      confirmLabel: t('agents.actions.delete')
    })
    if (!ok) return
    try {
      await api.delete(`/agents/${agent.id}`)
      toast.success(t('agents.actions.deleted'))
      onUpdate()
    } catch (error) {
      toast.error(error.response?.data?.error || t('agents.actions.deletionError'))
    }
  }

  const handleDuplicate = async (e) => {
    e.stopPropagation()
    setShowMenu(false)

    if (!canCreateAgent) {
      toast.error(
        <div className="flex flex-col gap-1 text-left">
          <span className="font-bold">{t('agents.alerts.limitTitle')}</span>
          <span className="text-[10px] opacity-90">{t('agents.alerts.limitUpgrade')} {t('agents.alerts.limitSuffix')}</span>
        </div>,
        { duration: 4000 }
      )
      return
    }

    try {
      await api.post(`/agents/${agent.id}/duplicate`)
      toast.success(t('agents.actions.duplicated') || 'Agent dupliqué')
      onUpdate()
    } catch (error) {
      toast.error(t('agents.actions.duplicateError') || 'Erreur lors de la duplication')
    }
  }

  return (
    <div 
      onClick={() => navigate(`/dashboard/agents/${agent.id}`)} 
      className={`card p-5 cursor-pointer hover:border-gold-400/50 transition-all group relative`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${agent.whatsapp_connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-400/10 text-orange-400'}`}>
            <Bot className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-100 group-hover:text-gold-400 transition-colors truncate">{agent.name}</h3>
            <p className="text-xs text-gray-500 truncate">{agent.description || 'Aucune description'}</p>
          </div>
        </div>
        
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-2 hover:bg-space-800 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <div className={`absolute right-0 mt-2 w-48 rounded-xl border shadow-xl z-50 overflow-hidden ${isDark ? 'bg-space-900 border-space-700' : 'bg-white border-gray-200'}`}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/dashboard/agents/${agent.id}`)
                }}
                className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-left transition-colors ${isDark ? 'hover:bg-space-800 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <Edit className="w-4 h-4" /> {t('common.edit') || 'Modifier'}
              </button>
              <button
                onClick={handleDuplicate}
                className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-left transition-colors ${isDark ? 'hover:bg-space-800 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <Copy className="w-4 h-4" /> {t('common.duplicate') || 'Dupliquer'}
              </button>
              <div className={`h-px ${isDark ? 'bg-space-700' : 'bg-gray-100'}`} />
              <button
                onClick={handleDelete}
                className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-left text-red-500 transition-colors ${isDark ? 'hover:bg-space-800' : 'hover:bg-red-50'}`}
              >
                <Trash2 className="w-4 h-4" /> {t('common.delete') || 'Supprimer'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-space-700/50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${agent.whatsapp_connected ? 'bg-emerald-400' : 'bg-orange-400'}`} />
          <span className="text-[10px] text-gray-400">{agent.whatsapp_connected ? 'Connecté' : 'Hors-ligne'}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> {agent.total_messages || 0}
          </div>
        </div>
      </div>
    </div>
  )
}
