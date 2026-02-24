import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { useConfirm } from '../contexts/ConfirmContext'
import { useTheme } from '../contexts/ThemeContext'
import { AgentCreationWizard } from '../components/Onboarding'
import { 
  Bot, 
  Plus, 
  Search,
  MoreVertical,
  Trash2,
  Settings,
  MessageSquare,
  Power,
  PowerOff,
  Copy,
  TrendingUp,
  Calendar,
  Zap,
  Crown,
  AlertCircle,
  LayoutGrid,
  List,
  Play,
  Download,
  Tag,
  Star,
  StarOff,
  CheckSquare,
  Square,
  X,
  ArrowUpDown,
  Clock,
  Activity,
  Bell,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Globe
} from 'lucide-react'
import toast from 'react-hot-toast'

// Available tags for agents
const AVAILABLE_TAGS = [
  { id: 'commerce', label: 'Commerce', color: 'emerald' },
  { id: 'support', label: 'Support', color: 'blue' },
  { id: 'marketing', label: 'Marketing', color: 'pink' },
  { id: 'rh', label: 'RH', color: 'blue' },
  { id: 'technique', label: 'Technique', color: 'orange' },
  { id: 'general', label: 'Général', color: 'gray' }
]

export default function Agents() {
  const { showConfirm } = useConfirm()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [searchParams, setSearchParams] = useSearchParams()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreationWizard, setShowCreationWizard] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [quotas, setQuotas] = useState(null)
  const [filter, setFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('last_activity') // last_activity, messages, created, name
  const [selectedAgents, setSelectedAgents] = useState([])
  const [bulkMode, setBulkMode] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('seven-t-favorite-agents')
    return saved ? JSON.parse(saved) : []
  })

  // Open create wizard from URL param
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      // Use wizard for better UX
      setShowCreationWizard(true)
      // Remove the param from URL
      searchParams.delete('create')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Decide which creation mode to show (wizard for new users, modal for experienced)
  const handleCreateAgent = () => {
    const hasCreatedAgent = localStorage.getItem('has_created_agent')
    if (!hasCreatedAgent || agents.length === 0) {
      setShowCreationWizard(true)
    } else {
      setShowCreateModal(true)
    }
  }

  const handleWizardSuccess = (agent) => {
    localStorage.setItem('has_created_agent', 'true')
    loadAgents()
  }

  useEffect(() => {
    loadAgents()
    loadQuotas()
  }, [])

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('seven-t-favorite-agents', JSON.stringify(favorites))
  }, [favorites])

  const loadQuotas = async () => {
    try {
      const response = await api.get('/agents/quotas')
      setQuotas(response.data)
    } catch (error) {
      console.error('Error loading quotas:', error)
    }
  }

  const loadAgents = async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const response = await api.get('/agents')
      setAgents(response.data.agents)
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Erreur de chargement'
      setLoadError(message)
      toast.error('Erreur lors du chargement des agents')
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = (agentId) => {
    setFavorites(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    )
  }

  const toggleSelectAgent = (agentId) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    )
  }

  const selectAllAgents = () => {
    if (selectedAgents.length === filteredAgents.length) {
      setSelectedAgents([])
    } else {
      setSelectedAgents(filteredAgents.map(a => a.id))
    }
  }

  // Bulk actions
  const handleBulkActivate = async () => {
    try {
      await Promise.all(selectedAgents.map(id => 
        api.put(`/agents/${id}`, { is_active: 1 })
      ))
      toast.success(`${selectedAgents.length} agent(s) activé(s)`)
      setSelectedAgents([])
      setBulkMode(false)
      loadAgents()
    } catch (error) {
      toast.error('Erreur lors de l\'activation')
    }
  }

  const handleBulkDeactivate = async () => {
    try {
      await Promise.all(selectedAgents.map(id => 
        api.put(`/agents/${id}`, { is_active: 0 })
      ))
      toast.success(`${selectedAgents.length} agent(s) désactivé(s)`)
      setSelectedAgents([])
      setBulkMode(false)
      loadAgents()
    } catch (error) {
      toast.error('Erreur lors de la désactivation')
    }
  }

  const handleBulkDelete = async () => {
    const ok = await showConfirm({
      title: 'Supprimer les agents',
      message: `Êtes-vous sûr de vouloir supprimer ${selectedAgents.length} agent(s) ? Cette action est irréversible.`,
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await Promise.all(selectedAgents.map(id => 
        api.delete(`/agents/${id}`)
      ))
      toast.success(`${selectedAgents.length} agent(s) supprimé(s)`)
      setSelectedAgents([])
      setBulkMode(false)
      loadAgents()
      loadQuotas()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  // Filter and sort
  const filteredAgents = agents
    .filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = filter === 'all' 
        || (filter === 'active' && agent.is_active !== 0)
        || (filter === 'inactive' && agent.is_active === 0)
        || (filter === 'connected' && agent.whatsapp_connected)
        || (filter === 'favorites' && favorites.includes(agent.id))
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      // Favorites first
      const aFav = favorites.includes(a.id) ? 1 : 0
      const bFav = favorites.includes(b.id) ? 1 : 0
      if (aFav !== bFav) return bFav - aFav
      
      // Then sort by selected criteria
      switch (sortBy) {
        case 'last_activity':
          return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
        case 'messages':
          return (b.total_messages || 0) - (a.total_messages || 0)
        case 'created':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0)
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

  const canCreateAgent = quotas && (quotas.remaining.agents === -1 || quotas.remaining.agents > 0)

  // Stats calculations
  const totalMessages = agents.reduce((sum, a) => sum + (a.total_messages || 0), 0)
  const totalConversations = agents.reduce((sum, a) => sum + (a.total_conversations || 0), 0)
  const activeAgents = agents.filter(a => a.is_active !== 0).length
  const connectedAgents = agents.filter(a => a.whatsapp_connected).length
  
  // Alerts
  const disconnectedActiveAgents = agents.filter(a => a.is_active !== 0 && !a.whatsapp_connected)
  const inactiveWithMessages = agents.filter(a => a.is_active === 0 && a.total_messages > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-space-700 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-gold-400 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
          </div>
          <p className="mt-4 text-gray-400">Chargement des agents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto w-full min-w-0">
      {/* Hero Header - theme-aware */}
      <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 ${
        isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200'
      }`}>
        <div
          className="absolute inset-0 opacity-50"
          style={{ backgroundImage: `url(${isDark ? "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+" : "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2NDc0OGIiIGZpbGwtb3BhY2l0eT0iMC4wNiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+"})` }}
          aria-hidden
        />
        
        <div className="relative flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <div className="p-2 sm:p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg flex-shrink-0">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6 icon-on-gradient" />
              </div>
              <h1 className={`text-2xl sm:text-3xl font-display font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>Mes Agents</h1>
              {quotas && (
                <span className={`px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 ${
                  quotas.plan.name === 'free' 
                    ? isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-200 text-gray-600'
                    : 'bg-gold-400/20 text-gold-400'
                }`}>
                  <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline mr-1" />
                  {quotas.plan.displayName}
                </span>
              )}
            </div>
            <p className={`text-sm sm:text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Gérez vos assistants IA WhatsApp intelligents</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => loadAgents()}
              className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl transition-all duration-200 min-h-[44px] ${
                isDark ? 'bg-space-700/50 hover:bg-space-700 text-gray-300 hover:text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 hover:text-gray-900'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleCreateAgent}
              disabled={!canCreateAgent}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 min-h-[44px] ${
                canCreateAgent
                  ? 'bg-gradient-to-r from-gold-400 to-amber-500 text-space-900 hover:shadow-lg hover:shadow-gold-400/25'
                  : 'bg-space-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span className="whitespace-nowrap">Créer un agent</span>
            </button>
          </div>
        </div>

        {/* Stats Row - theme-aware */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mt-4 sm:mt-6 lg:mt-8">
          <div className={`backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border min-w-0 ${isDark ? 'bg-space-800/50 border-space-700/50' : 'bg-white/80 border-gray-200'}`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg flex-shrink-0">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className={`text-lg sm:text-2xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{agents.length}</p>
                <p className={`text-xs sm:text-sm truncate ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Agents ({activeAgents} actifs)</p>
              </div>
            </div>
          </div>
          <div className={`backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border min-w-0 ${isDark ? 'bg-space-800/50 border-space-700/50' : 'bg-white/80 border-gray-200'}`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-emerald-500/10 rounded-lg flex-shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className={`text-lg sm:text-2xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{connectedAgents}</p>
                <p className={`text-xs sm:text-sm truncate ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Connectés</p>
              </div>
            </div>
          </div>
          <div className={`backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border min-w-0 ${isDark ? 'bg-space-800/50 border-space-700/50' : 'bg-white/80 border-gray-200'}`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg flex-shrink-0">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className={`text-lg sm:text-2xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalMessages.toLocaleString()}</p>
                <p className={`text-xs sm:text-sm truncate ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Messages</p>
              </div>
            </div>
          </div>
          <div className={`backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border min-w-0 ${isDark ? 'bg-space-800/50 border-space-700/50' : 'bg-white/80 border-gray-200'}`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gold-400/10 rounded-lg flex-shrink-0">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-gold-400" />
              </div>
              <div className="min-w-0">
                <p className={`text-lg sm:text-2xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{quotas?.credits || 0}</p>
                <p className={`text-xs sm:text-sm truncate ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Crédits</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {(disconnectedActiveAgents.length > 0 || inactiveWithMessages.length > 0 || (quotas?.remaining.agents === 0)) && (
        <div className="space-y-3 mb-4 sm:mb-6">
          {quotas?.remaining.agents === 0 && (
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-amber-400 font-medium">Limite d'agents atteinte</p>
                <p className="text-sm text-gray-400">
                  <Link to="/dashboard/settings" className="text-gold-400 hover:underline">
                    Passez à un plan supérieur
                  </Link> pour créer plus d'agents.
                </p>
              </div>
            </div>
          )}
          
          {disconnectedActiveAgents.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl animate-fadeIn">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-orange-400 font-medium">
                    {disconnectedActiveAgents.length} agent(s) actif(s) non connecté(s)
                  </p>
                  <p className="text-sm text-gray-400 truncate sm:whitespace-normal" title={disconnectedActiveAgents.map(a => a.name).join(', ')}>
                    {disconnectedActiveAgents.map(a => a.name).join(', ')} - Connectez WhatsApp pour recevoir des messages.
                  </p>
                </div>
              </div>
              <Link 
                to={`/dashboard/agents/${disconnectedActiveAgents[0]?.id}`}
                className="text-orange-400 hover:text-orange-300 text-sm font-medium whitespace-nowrap flex-shrink-0"
              >
                Connecter →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Bulk Actions Bar */}
      {bulkMode && (
        <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4 bg-space-800 border border-space-700 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 animate-fadeIn">
          <button
            onClick={selectAllAgents}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors min-h-[44px]"
          >
            {selectedAgents.length === filteredAgents.length ? (
              <CheckSquare className="w-5 h-5 text-gold-400 flex-shrink-0" />
            ) : (
              <Square className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm whitespace-nowrap">{selectedAgents.length} sélectionné(s)</span>
          </button>
          <div className="flex-1 min-w-2" />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBulkActivate}
              disabled={selectedAgents.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-colors disabled:opacity-50 min-h-[44px] text-sm"
            >
              <Power className="w-4 h-4" />
              Activer
            </button>
            <button
              onClick={handleBulkDeactivate}
              disabled={selectedAgents.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-lg transition-colors disabled:opacity-50 min-h-[44px] text-sm"
            >
              <PowerOff className="w-4 h-4" />
              Désactiver
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={selectedAgents.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors disabled:opacity-50 min-h-[44px] text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          </div>
          <button
            onClick={() => { setBulkMode(false); setSelectedAgents([]) }}
            className="p-2 text-gray-500 hover:text-white rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Search, Filters & Sort */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4 sm:mb-6">
        {/* Search - full width on mobile */}
        <div className="relative w-full sm:flex-1 sm:min-w-[180px] sm:max-w-md">
          <Search className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 pointer-events-none ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <input
            type="text"
            placeholder="Rechercher un agent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 sm:pl-12 pr-10 sm:pr-4 py-2.5 sm:py-3 border rounded-xl focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm sm:text-base min-h-[44px] ${
              isDark ? 'bg-space-800 border-space-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
              aria-label="Effacer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills - theme-aware: always visible text in light mode */}
        <div className={`flex items-center gap-1 rounded-xl p-1 overflow-x-auto overflow-y-hidden scrollbar-none w-full sm:w-auto min-w-0 -mx-1 px-1 sm:mx-0 sm:px-0 ${isDark ? 'bg-space-800' : 'bg-gray-100'}`}>
          {[
            { id: 'all', label: 'Tous', icon: null },
            { id: 'favorites', label: 'Favoris', icon: Star },
            { id: 'active', label: 'Actifs', icon: null },
            { id: 'connected', label: 'Connectés', icon: null },
            { id: 'inactive', label: 'Inactifs', icon: null }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 min-h-[40px] ${
                filter === f.id 
                  ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/15 text-blue-700')
                  : isDark 
                    ? 'text-gray-400 hover:text-gray-200' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              {f.icon && <f.icon className="w-3.5 h-3.5 flex-shrink-0" />}
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:ml-auto flex-shrink-0">
          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 border rounded-xl transition-colors min-h-[44px] text-sm ${
                isDark ? 'bg-space-800 border-space-700 text-gray-400 hover:text-white' : 'bg-white border-gray-300 text-gray-700 hover:text-gray-900'
              }`}
            >
              <ArrowUpDown className="w-4 h-4 flex-shrink-0" />
              <span>Trier</span>
            </button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-space-800 rounded-xl shadow-xl border border-space-700 z-20 overflow-hidden">
                  {[
                    { id: 'last_activity', label: 'Dernière activité', icon: Clock },
                    { id: 'messages', label: 'Nombre de messages', icon: MessageSquare },
                    { id: 'created', label: 'Date de création', icon: Calendar },
                    { id: 'name', label: 'Nom (A-Z)', icon: ArrowUpDown }
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSortBy(s.id); setShowSortMenu(false) }}
                      className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm transition-colors ${
                        sortBy === s.id 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'text-gray-400 hover:bg-space-700 hover:text-white'
                      }`}
                    >
                      <s.icon className="w-4 h-4" />
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Bulk Mode Toggle */}
          <button
            onClick={() => { setBulkMode(!bulkMode); setSelectedAgents([]) }}
            className={`p-2.5 rounded-xl border transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
              bulkMode 
                ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' 
                : isDark ? 'bg-space-800 border-space-700 text-gray-400 hover:text-white' : 'bg-white border-gray-300 text-gray-600 hover:text-gray-900'
            }`}
            title="Mode sélection multiple"
            aria-label="Mode sélection multiple"
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          {/* View Mode Toggle */}
          <div className={`flex items-center rounded-xl p-1 border ${isDark ? 'bg-space-800 border-space-700' : 'bg-gray-100 border-gray-300'}`}>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                viewMode === 'grid' ? (isDark ? 'bg-space-700 text-white' : 'bg-white text-gray-900 shadow-sm') : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900')
              }`}
              aria-label="Vue grille"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                viewMode === 'list' ? (isDark ? 'bg-space-700 text-white' : 'bg-white text-gray-900 shadow-sm') : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900')
              }`}
              aria-label="Vue liste"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Load error + Retry */}
      {loadError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
          <p className="text-red-300 mb-3">{loadError}</p>
          <button
            type="button"
            onClick={() => loadAgents()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      )}

      {/* Agents Grid/List */}
      {!loadError && (
        <>
      {filteredAgents.length === 0 ? (
        <div className="bg-space-800/50 border border-space-700/50 rounded-3xl p-16 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Bot className="w-10 h-10 icon-on-gradient" />
          </div>
          <h3 className="text-xl font-semibold text-gray-100 mb-3">
            {searchQuery || filter !== 'all' ? 'Aucun agent trouvé' : 'Aucun agent créé'}
          </h3>
          <p className="text-gray-400 max-w-md mx-auto mb-6">
            {searchQuery || filter !== 'all'
              ? 'Essayez de modifier vos critères de recherche ou de supprimer les filtres'
              : 'Créez votre premier assistant IA pour automatiser vos conversations WhatsApp'
            }
          </p>
          {!searchQuery && filter === 'all' && canCreateAgent && (
            <button
              onClick={handleCreateAgent}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-400 to-amber-500 text-space-900 font-semibold rounded-xl hover:shadow-lg hover:shadow-gold-400/25 transition-all"
            >
              <Plus className="w-5 h-5" />
              Créer un agent
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-3 sm:gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
          {filteredAgents.map((agent, index) => (
            <AgentCard 
              key={agent.id} 
              agent={agent} 
              onUpdate={() => { loadAgents(); loadQuotas(); }}
              isFavorite={favorites.includes(agent.id)}
              onToggleFavorite={() => toggleFavorite(agent.id)}
              isSelected={selectedAgents.includes(agent.id)}
              onToggleSelect={() => toggleSelectAgent(agent.id)}
              bulkMode={bulkMode}
              index={index}
              isDark={isDark}
            />
          ))}
        </div>
      ) : (
        <div className={`rounded-xl sm:rounded-2xl overflow-hidden min-w-0 border ${isDark ? 'bg-space-800/50 border-space-700/50' : 'bg-white border-gray-200'}`}>
          {filteredAgents.map((agent, index) => (
            <AgentListItem 
              key={agent.id} 
              agent={agent} 
              onUpdate={() => { loadAgents(); loadQuotas(); }}
              isFavorite={favorites.includes(agent.id)}
              onToggleFavorite={() => toggleFavorite(agent.id)}
              isSelected={selectedAgents.includes(agent.id)}
              onToggleSelect={() => toggleSelectAgent(agent.id)}
              bulkMode={bulkMode}
              isLast={index === filteredAgents.length - 1}
              isDark={isDark}
            />
          ))}
        </div>
      )}
        </>
      )}

      {/* Results count */}
      {!loadError && filteredAgents.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-500">
          {filteredAgents.length === agents.length 
            ? `${agents.length} agent${agents.length > 1 ? 's' : ''}`
            : `${filteredAgents.length} sur ${agents.length} agents`
          }
        </div>
      )}

      {/* Create Modal */}
      {/* Creation Wizard (guided experience) */}
      <AgentCreationWizard
        isOpen={showCreationWizard}
        onClose={() => setShowCreationWizard(false)}
        onSuccess={handleWizardSuccess}
      />

      {/* Quick Create Modal (for experienced users) */}
      {showCreateModal && (
        <CreateAgentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false)
            localStorage.setItem('has_created_agent', 'true')
            loadAgents()
            loadQuotas()
          }}
        />
      )}
    </div>
  )
}

function AgentCard({ agent, onUpdate, isFavorite, onToggleFavorite, isSelected, onToggleSelect, bulkMode, index, isDark = true }) {
  const navigate = useNavigate()
  const { showConfirm } = useConfirm()
  const [showMenu, setShowMenu] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

  const handleCardClick = (e) => {
    // Don't navigate if clicking on interactive elements
    if (e.target.closest('button') || e.target.closest('a')) return
    navigate(`/dashboard/agents/${agent.id}`)
  }

  const handleDelete = async () => {
    const ok = await showConfirm({
      title: 'Supprimer cet agent',
      message: 'Êtes-vous sûr de vouloir supprimer cet agent ? Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/agents/${agent.id}`)
      toast.success('Agent supprimé')
      onUpdate()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleToggleActive = async () => {
    setToggling(true)
    try {
      await api.put(`/agents/${agent.id}`, { is_active: agent.is_active ? 0 : 1 })
      toast.success(agent.is_active ? 'Agent désactivé' : 'Agent activé')
      onUpdate()
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setToggling(false)
    }
  }

  const handleDuplicate = async () => {
    setDuplicating(true)
    setShowMenu(false)
    try {
      const response = await api.post(`/agents/${agent.id}/duplicate`)
      toast.success(`Agent dupliqué !`)
      onUpdate()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la duplication')
    } finally {
      setDuplicating(false)
    }
  }

  const isActive = agent.is_active !== 0
  const isNew = agent.created_at && (Date.now() - new Date(agent.created_at).getTime()) < 24 * 60 * 60 * 1000
  const daysSinceLastMessage = agent.last_message_at 
    ? Math.floor((Date.now() - new Date(agent.last_message_at).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div 
      onClick={handleCardClick}
      className={`group relative bg-space-800/50 border rounded-xl sm:rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-space-900/50 animate-fadeIn cursor-pointer min-w-0 overflow-hidden ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-space-700/50 hover:border-space-600'
      } ${!isActive ? 'opacity-70' : ''}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Selection checkbox */}
      {bulkMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 p-1.5 rounded-lg bg-space-800/80 backdrop-blur-sm min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={isSelected ? 'Désélectionner' : 'Sélectionner'}
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-blue-400" />
          ) : (
            <Square className="w-5 h-5 text-gray-500" />
          )}
        </button>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 ${
              !isActive ? 'bg-gray-500/20' :
              agent.whatsapp_connected ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-space-700'
            }`}>
              <Bot className={`w-6 h-6 ${
                !isActive ? 'text-gray-500' :
                agent.whatsapp_connected ? 'icon-on-gradient' : 'text-gray-400'
              }`} />
              {agent.whatsapp_connected && isActive && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-space-800 flex items-center justify-center">
                  <CheckCircle className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base sm:text-lg text-gray-100 truncate">{agent.name}</h3>
                {isNew && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gold-400/20 text-gold-400 rounded flex-shrink-0">
                    NEW
                  </span>
                )}
              </div>
              <span className={`text-xs font-medium ${
                !isActive
                  ? 'text-gray-500'
                  : agent.whatsapp_connected
                    ? 'text-emerald-400'
                    : 'text-orange-400'
              }`}>
                {!isActive ? 'Inactif' : agent.whatsapp_connected ? '● Connecté' : '○ Déconnecté'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Favorite Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              className={`p-2 rounded-lg transition-all ${
                isFavorite 
                  ? 'text-gold-400 hover:bg-gold-400/20' 
                  : 'text-gray-600 hover:text-gray-400 hover:bg-space-700'
              }`}
            >
              {isFavorite ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
            </button>
            
            {/* Menu Button */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="p-2 hover:bg-space-700 rounded-lg transition-colors text-gray-500 hover:text-white"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-52 bg-space-800 rounded-xl shadow-xl border border-space-700 z-20 overflow-hidden">
                    <Link
                      to={`/dashboard/agents/${agent.id}`}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-space-700"
                    >
                      <Settings className="w-4 h-4" />
                      Paramètres
                    </Link>
                    <Link
                      to={`/dashboard/agents/${agent.id}?tab=playground`}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-space-700"
                    >
                      <Play className="w-4 h-4" />
                      Tester l'agent
                    </Link>
                    <Link
                      to={`/dashboard/agents/${agent.id}?tab=knowledge`}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-space-700"
                      onClick={() => setShowMenu(false)}
                    >
                      <Globe className="w-4 h-4" />
                      Base de connaissance globale
                    </Link>
                    <button
                      onClick={handleDuplicate}
                      disabled={duplicating}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-space-700 w-full"
                    >
                      <Copy className="w-4 h-4" />
                      {duplicating ? 'Duplication...' : 'Dupliquer'}
                    </button>
                    <div className="border-t border-space-700" />
                    <button
                      onClick={handleToggleActive}
                      className={`flex items-center gap-3 px-4 py-3 text-sm w-full ${
                        isActive 
                          ? 'text-orange-400 hover:bg-orange-500/10' 
                          : 'text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                    >
                      {isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      {isActive ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 w-full"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <p className={`text-sm mb-4 line-clamp-2 min-h-[40px] ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
          {agent.description || 'Aucune description'}
        </p>

        {/* Stats Grid - theme-aware labels */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={isDark ? 'bg-space-700/30 rounded-xl p-3' : 'bg-gray-100 rounded-xl p-3'}>
            <div className={`flex items-center gap-2 text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              <MessageSquare className="w-3.5 h-3.5" />
              Conversations
            </div>
            <p className={`font-bold text-lg ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{agent.total_conversations || 0}</p>
          </div>
          <div className={isDark ? 'bg-space-700/30 rounded-xl p-3' : 'bg-gray-100 rounded-xl p-3'}>
            <div className={`flex items-center gap-2 text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              <TrendingUp className="w-3.5 h-3.5" />
              Messages
            </div>
            <p className={`font-bold text-lg ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{agent.total_messages || 0}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-space-700/50">
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleActive(); }}
            disabled={toggling}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive 
                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'
            }`}
          >
            {toggling ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isActive ? (
              <Power className="w-4 h-4" />
            ) : (
              <PowerOff className="w-4 h-4" />
            )}
            {isActive ? 'Actif' : 'Inactif'}
          </button>
          
          <Link
            to={`/dashboard/agents/${agent.id}?tab=playground`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg text-sm font-medium transition-all"
          >
            <Play className="w-4 h-4" />
            Tester
          </Link>
        </div>
      </div>

      {/* Footer with last activity */}
      {daysSinceLastMessage !== null && (
        <div className="px-5 py-2.5 bg-space-700/20 border-t border-space-700/30 flex items-center justify-between">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Dernière activité: {daysSinceLastMessage === 0 ? "Aujourd'hui" : daysSinceLastMessage === 1 ? 'Hier' : `Il y a ${daysSinceLastMessage}j`}
          </span>
          <span className="text-xs text-gray-600">{agent.model || 'gemini-1.5-flash'}</span>
        </div>
      )}
    </div>
  )
}

function AgentListItem({ agent, onUpdate, isFavorite, onToggleFavorite, isSelected, onToggleSelect, bulkMode, isLast, isDark = true }) {
  const navigate = useNavigate()
  const { showConfirm } = useConfirm()
  const [toggling, setToggling] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

  const handleRowClick = (e) => {
    if (e.target.closest('button') || e.target.closest('a')) return
    navigate(`/dashboard/agents/${agent.id}`)
  }

  const handleDelete = async () => {
    const ok = await showConfirm({
      title: 'Supprimer cet agent',
      message: 'Êtes-vous sûr de vouloir supprimer cet agent ? Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/agents/${agent.id}`)
      toast.success('Agent supprimé')
      onUpdate()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleDuplicate = async () => {
    setDuplicating(true)
    setShowMenu(false)
    try {
      await api.post(`/agents/${agent.id}/duplicate`)
      toast.success('Agent dupliqué !')
      onUpdate()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la duplication')
    } finally {
      setDuplicating(false)
    }
  }

  const handleToggleActive = async () => {
    setToggling(true)
    try {
      await api.put(`/agents/${agent.id}`, { is_active: agent.is_active ? 0 : 1 })
      toast.success(agent.is_active ? 'Agent désactivé' : 'Agent activé')
      onUpdate()
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setToggling(false)
    }
  }

  const isActive = agent.is_active !== 0
  const isNew = agent.created_at && (Date.now() - new Date(agent.created_at).getTime()) < 24 * 60 * 60 * 1000

  return (
    <div 
      onClick={handleRowClick}
      className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 hover:bg-space-800/70 transition-colors cursor-pointer min-w-0 ${!isLast ? 'border-b border-space-700/50' : ''} ${!isActive ? 'opacity-70' : ''} ${isSelected ? 'bg-blue-500/10' : ''}`}
    >
      {bulkMode && (
        <button onClick={(e) => { e.stopPropagation(); onToggleSelect(); }} className="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center p-2">
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-blue-400" />
          ) : (
            <Square className="w-5 h-5 text-gray-500" />
          )}
        </button>
      )}
      
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className={`flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center p-2 ${isFavorite ? 'text-gold-400' : 'text-gray-600 hover:text-gray-400'}`}
      >
        {isFavorite ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
      </button>

      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        !isActive ? 'bg-gray-500/20' :
        agent.whatsapp_connected ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-space-700'
      }`}>
        <Bot className={`w-5 h-5 ${
          !isActive ? 'text-gray-500' :
          agent.whatsapp_connected ? 'icon-on-gradient' : 'text-gray-400'
        }`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-100 truncate">{agent.name}</h3>
          {isNew && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gold-400/20 text-gold-400 rounded">NEW</span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            !isActive
              ? 'bg-gray-500/20 text-gray-500'
              : agent.whatsapp_connected
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-orange-500/20 text-orange-400'
          }`}>
            {!isActive ? 'Inactif' : agent.whatsapp_connected ? 'Connecté' : 'Déconnecté'}
          </span>
        </div>
        <p className="text-sm text-gray-500 truncate">{agent.description || 'Aucune description'}</p>
      </div>

      <div className={`hidden md:flex items-center gap-8 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        <div className="text-center min-w-[80px]">
          <p className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{agent.total_conversations || 0}</p>
          <p className="text-xs">Conversations</p>
        </div>
        <div className="text-center min-w-[80px]">
          <p className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{agent.total_messages || 0}</p>
          <p className="text-xs">Messages</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleActive(); }}
          disabled={toggling}
          className={`p-2 rounded-lg transition-all ${
            isActive 
              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
              : 'bg-gray-500/20 text-gray-500 hover:bg-gray-500/30'
          }`}
        >
          {toggling ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isActive ? (
            <Power className="w-4 h-4" />
          ) : (
            <PowerOff className="w-4 h-4" />
          )}
        </button>
        <Link
          to={`/dashboard/agents/${agent.id}?tab=playground`}
          onClick={(e) => e.stopPropagation()}
          className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
        >
          <Play className="w-4 h-4" />
        </Link>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-2 hover:bg-space-700 rounded-lg transition-colors text-gray-500 hover:text-white"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-space-800 rounded-xl shadow-xl border border-space-700 z-20 overflow-hidden">
                <Link
                  to={`/dashboard/agents/${agent.id}`}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-space-700"
                  onClick={() => setShowMenu(false)}
                >
                  <Settings className="w-4 h-4" />
                  Paramètres
                </Link>
                <Link
                  to={`/dashboard/agents/${agent.id}?tab=playground`}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-space-700"
                  onClick={() => setShowMenu(false)}
                >
                  <Play className="w-4 h-4" />
                  Tester l'agent
                </Link>
                <Link
                  to={`/dashboard/agents/${agent.id}?tab=knowledge`}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-space-700"
                  onClick={() => setShowMenu(false)}
                >
                  <Globe className="w-4 h-4" />
                  Base de connaissance globale
                </Link>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}
                  disabled={duplicating}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-space-700 w-full"
                >
                  <Copy className="w-4 h-4" />
                  {duplicating ? 'Duplication...' : 'Dupliquer'}
                </button>
                <div className="border-t border-space-700" />
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleActive(); }}
                  className={`flex items-center gap-3 px-4 py-3 text-sm w-full ${
                    isActive 
                      ? 'text-orange-400 hover:bg-orange-500/10' 
                      : 'text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  {isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                  {isActive ? 'Désactiver' : 'Activer'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 w-full"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
      </div>
    </div>
  )
}

function CreateAgentModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [template, setTemplate] = useState('default')
  const [loading, setLoading] = useState(false)

  const TEMPLATES = [
    {
      id: 'default',
      name: 'Assistant Général',
      description: 'Un assistant polyvalent qui répond à toutes les questions',
      icon: '🤖',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'ecommerce',
      name: 'E-commerce',
      description: 'Vente en ligne, catalogue, commandes et livraison',
      icon: '🛒',
      color: 'from-gold-500 to-amber-600'
    },
    {
      id: 'commercial',
      name: 'Commercial',
      description: 'Qualifie les prospects, présente les produits et guide vers la vente',
      icon: '💼',
      color: 'from-emerald-500 to-green-600'
    },
    {
      id: 'support',
      name: 'Support Client',
      description: 'Résout les problèmes et guide les utilisateurs pas à pas',
      icon: '🛠️',
      color: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'faq',
      name: 'FAQ',
      description: 'Répond aux questions fréquentes de manière concise',
      icon: '❓',
      color: 'from-amber-500 to-orange-600'
    },
    {
      id: 'appointment',
      name: 'Prise de RDV',
      description: 'Collecte les informations et planifie des rendez-vous',
      icon: '📅',
      color: 'from-pink-500 to-rose-600'
    }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.post('/agents', { name, description, template })
      toast.success('Agent créé avec succès!')
      if (response.data.model_adjusted) {
        toast(response.data.model_adjusted, { icon: 'ℹ️' })
      }
      onCreated()
    } catch (error) {
      if (error.response?.data?.upgrade_required) {
        toast.error(error.response.data.error)
      } else {
        toast.error(error.response?.data?.error || 'Erreur lors de la création')
      }
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
            <div>
              <h2 className="text-xl font-display font-semibold text-gray-100">Créer un agent</h2>
              <p className="text-sm text-gray-400 mt-1">
                Étape {step}/2 - {step === 1 ? 'Choisir un type' : 'Personnaliser'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-gold-400' : 'bg-space-700'}`} />
              <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-gold-400' : 'bg-space-700'}`} />
              <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-gold-400' : 'bg-space-700'}`} />
            </div>
          </div>
        </div>

        {step === 1 ? (
          <div className="p-6">
            <p className="text-gray-400 mb-6">
              Choisissez un type d'agent pour démarrer avec une configuration optimisée :
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    template === t.id
                      ? 'border-gold-400 bg-gold-400/10'
                      : 'border-space-700 hover:border-space-600 bg-space-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center text-2xl shadow-lg`}>
                      {t.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-100">{t.name}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</p>
                    </div>
                  </div>
                  {template === t.id && (
                    <div className="mt-3 flex items-center gap-1.5 text-gold-400 text-xs">
                      <CheckCircle className="w-4 h-4" />
                      Sélectionné
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-6 py-3 bg-space-800 hover:bg-space-700 text-gray-300 font-medium rounded-xl transition-colors">
                Annuler
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-gold-400 to-amber-500 text-space-900 font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                Continuer →
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="p-4 bg-space-800 rounded-xl flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${TEMPLATES.find(t => t.id === template)?.color} flex items-center justify-center text-xl`}>
                {TEMPLATES.find(t => t.id === template)?.icon}
              </div>
              <div>
                <p className="text-sm text-gray-400">Type sélectionné</p>
                <p className="font-medium text-gray-100">{TEMPLATES.find(t => t.id === template)?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="ml-auto text-xs text-gold-400 hover:underline"
              >
                Changer
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nom de l'agent *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Assistant Commercial SEVEN T"
                className="w-full px-4 py-3 bg-space-800 border border-space-700 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Ce nom sera utilisé dans les conversations et l'interface
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (optionnel)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez le rôle de cet agent pour vous y retrouver..."
                rows={3}
                className="w-full px-4 py-3 bg-space-800 border border-space-700 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              />
            </div>

            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <p className="text-sm text-emerald-400 flex items-start gap-2">
                <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                L'agent sera pré-configuré avec un prompt optimisé pour son type. Vous pourrez le personnaliser ensuite.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 px-6 py-3 bg-space-800 hover:bg-space-700 text-gray-300 font-medium rounded-xl transition-colors"
              >
                ← Retour
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-gold-400 to-amber-500 text-space-900 font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Création...' : 'Créer l\'agent'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
