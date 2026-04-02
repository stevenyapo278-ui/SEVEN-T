import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { useConfirm } from '../contexts/ConfirmContext'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { useTheme } from '../contexts/ThemeContext'
import { 
  UserPlus, 
  Plus, 
  Search, 
  Filter, 
  Phone,
  Mail,
  MessageSquare,
  Edit,
  Trash2,
  X,
  User,
  Calendar,
  Tag,
  MoreVertical,
  Check,
  Clock,
  Star,
  StarOff,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  TrendingUp,
  UserCheck,
  Users,
  ShoppingCart,
  Sparkles,
  Bot,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'

const LEAD_STATUSES = [
  { id: 'new', label: 'Nouveau', color: 'blue', icon: UserPlus },
  { id: 'contacted', label: 'Contacté', color: 'amber', icon: MessageSquare },
  { id: 'qualified', label: 'Qualifié', color: 'blue', icon: UserCheck },
  { id: 'negotiation', label: 'Négociation', color: 'orange', icon: TrendingUp },
  { id: 'customer', label: 'Client', color: 'green', icon: ShoppingCart },
  { id: 'lost', label: 'Perdu', color: 'red', icon: X },
]

const LEAD_SOURCES = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'website', label: 'Site web' },
  { id: 'referral', label: 'Recommandation' },
  { id: 'social', label: 'Réseaux sociaux' },
  { id: 'other', label: 'Autre' },
]

export default function Leads() {
  const { user } = useAuth()
  const { t } = useTranslation()

  const isModuleEnabled = (() => {
    const feat = user?.plan_features?.leads_management
    const override = user?.leads_management_enabled
    const isOverrideTrue = override === 1 || override === '1' || override === true
    const isOverrideFalse = override === 0 || override === '0'
    if (!user?.parent_user_id || user?.role === 'owner') {
      if (isOverrideFalse) return false
      return !!feat || isOverrideTrue
    }
    return isOverrideTrue
  })()

  if (!isModuleEnabled) {
    return <Navigate to="/dashboard" replace />
  }
  const [searchParams, setSearchParams] = useSearchParams()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { showConfirm } = useConfirm()
  const [leads, setLeads] = useState([])
  const [suggestedLeads, setSuggestedLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all')
  const [sourceFilter, setSourceFilter] = useState(() => searchParams.get('source') || 'all')

  // Sync filters from URL
  useEffect(() => {
    const q = searchParams.get('q')
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    if (q !== null) setSearchQuery(q)
    if (status !== null) setStatusFilter(status || 'all')
    if (source !== null) setSourceFilter(source || 'all')
  }, [searchParams])

  // Sync filters to URL when they change
  const syncFiltersToUrl = useCallback((updates) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(updates).forEach(([k, v]) => {
        if (v && v !== 'all') next.set(k, v)
        else next.delete(k)
      })
      return next
    }, { replace: true })
  }, [setSearchParams])

  const handleSearchChange = useCallback((v) => {
    setSearchQuery(v)
    syncFiltersToUrl({ q: v || undefined })
  }, [syncFiltersToUrl])

  const handleStatusFilterChange = useCallback((v) => {
    setStatusFilter(v)
    syncFiltersToUrl({ status: v === 'all' ? undefined : v })
  }, [syncFiltersToUrl])

  const handleSourceFilterChange = useCallback((v) => {
    setSourceFilter(v)
    syncFiltersToUrl({ source: v === 'all' ? undefined : v })
  }, [syncFiltersToUrl])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [showSuggested, setShowSuggested] = useState(true)
  const [selectedLeadView, setSelectedLeadView] = useState(null)

  // Open create modal from URL param
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowAddModal(true)
      // Remove the param from URL
      searchParams.delete('create')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    loadLeads()
    loadSuggestedLeads()
  }, [])

  const loadLeads = async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const response = await api.get('/leads')
      setLeads(response.data.leads || [])
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Erreur de chargement'
      setLoadError(message)
      console.error('Error loading leads:', error)
      toast.error('Erreur lors du chargement des leads')
    } finally {
      setLoading(false)
    }
  }

  const loadSuggestedLeads = async () => {
    try {
      const response = await api.get('/leads/suggested')
      setSuggestedLeads(response.data.leads || [])
    } catch (error) {
      console.error('Error loading suggested leads:', error)
    }
  }

  const handleValidateLead = async (leadId) => {
    try {
      await api.post(`/leads/${leadId}/validate`)
      toast.success('Lead validé et ajouté à votre liste')
      loadLeads()
      loadSuggestedLeads()
    } catch (error) {
      toast.error('Erreur lors de la validation')
    }
  }

  const handleRejectLead = async (leadId) => {
    try {
      await api.post(`/leads/${leadId}/reject`)
      toast.success('Lead rejeté')
      loadSuggestedLeads()
    } catch (error) {
      toast.error('Erreur lors du rejet')
    }
  }

  const handleDelete = async (id) => {
    const ok = await showConfirm({
      title: 'Supprimer le lead',
      message: 'Supprimer définitivement ce lead ? Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/leads/${id}`)
      toast.success('Lead supprimé')
      loadLeads()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleToggleFavorite = async (lead) => {
    try {
      await api.put(`/leads/${lead.id}`, { is_favorite: !lead.is_favorite })
      loadLeads()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handleStatusChange = async (lead, newStatus) => {
    if (lead.status === newStatus) return
    const newStatusInfo = LEAD_STATUSES.find(s => s.id === newStatus)
    const ok = await showConfirm({
      title: 'Changer le statut du lead',
      message: `Passer « ${lead.name} » en statut « ${newStatusInfo?.label ?? newStatus} » ?`,
      confirmLabel: 'Confirmer'
    })
    if (!ok) return
    try {
      await api.put(`/leads/${lead.id}`, { status: newStatus })
      toast.success('Statut mis à jour')
      loadLeads()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const getStatusInfo = (statusId) => {
    return LEAD_STATUSES.find(s => s.id === statusId) || LEAD_STATUSES[0]
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.company?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter
    return matchesSearch && matchesStatus && matchesSource
  })

  // Sort: favorites first, then by created_at
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (a.is_favorite && !b.is_favorite) return -1
    if (!a.is_favorite && b.is_favorite) return 1
    return new Date(b.created_at) - new Date(a.created_at)
  })

  // Stats
  const stats = {
    total: leads.length,
    suggested: suggestedLeads.length,
    new: leads.filter(l => l.status === 'new').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
    customers: leads.filter(l => l.status === 'customer').length,
    conversionRate: leads.length > 0 
      ? Math.round((leads.filter(l => l.status === 'customer').length / leads.length) * 100) 
      : 0
  }

  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0">
      {/* Header Hero */}
      <div className={`relative rounded-2xl sm:rounded-3xl border p-4 sm:p-8 mb-4 sm:mb-8 ${
        isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200'
      }`}>
        <div
          className="absolute inset-0 opacity-50"
          style={{ backgroundImage: `url(${isDark ? "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+" : "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2NDc0OGIiIGZpbGwtb3BhY2l0eT0iMC4wNiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+"})` }}
          aria-hidden
        />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-2 min-w-0">
                <div className="p-2 bg-blue-500/10 rounded-xl flex-shrink-0">
                  <UserPlus className="w-6 h-6 text-blue-400" />
                </div>
                <h1 className={`text-2xl sm:text-3xl font-display font-bold break-words ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('leads.title') || 'Gestion des Leads'}</h1>
              </div>
              <p className={`text-base sm:text-lg break-words ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                {t('leads.subtitle') || 'Suivez et convertissez vos prospects en clients'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0 relative z-20">
              <button
                type="button"
                onClick={() => loadLeads()}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 min-h-[44px] ${
                  isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualiser</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary flex items-center gap-2 min-h-[44px]"
              >
                <Plus className="w-5 h-5" />
                <span>Ajouter un lead</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mt-8">
            <div className={`rounded-xl p-4 border transition-all duration-300 ${isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
                  <p className={`text-[10px] uppercase font-bold tracking-wider truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Total leads</p>
                </div>
              </div>
            </div>
            {stats.suggested > 0 && (
              <div className={`rounded-xl p-4 border transition-all duration-300 relative overflow-hidden group ${
                isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200 shadow-sm'
              }`}>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent animate-pulse" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-2 bg-blue-500/20 rounded-xl">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xl font-bold truncate ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{stats.suggested}</p>
                    <p className={`text-[10px] uppercase font-bold tracking-wider truncate ${isDark ? 'text-blue-500/70' : 'text-blue-400'}`}>À valider</p>
                  </div>
                </div>
              </div>
            )}
            <div className={`rounded-xl p-4 border transition-all duration-300 ${isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl flex-shrink-0">
                  <UserPlus className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.new}</p>
                  <p className={`text-[10px] uppercase font-bold tracking-wider truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Nouveaux</p>
                </div>
              </div>
            </div>
            <div className={`rounded-xl p-4 border transition-all duration-300 ${isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl flex-shrink-0">
                  <UserCheck className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.qualified}</p>
                  <p className={`text-[10px] uppercase font-bold tracking-wider truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Qualifiés</p>
                </div>
              </div>
            </div>
            <div className={`rounded-xl p-4 border transition-all duration-300 ${isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl flex-shrink-0">
                  <ShoppingCart className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.customers}</p>
                  <p className={`text-[10px] uppercase font-bold tracking-wider truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Clients</p>
                </div>
              </div>
            </div>
            <div className={`rounded-xl p-4 border transition-all duration-300 ${isDark ? 'bg-gold-400/10 rounded-xl flex-shrink-0' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold-400/10 rounded-xl flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-gold-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.conversionRate}%</p>
                  <p className={`text-[10px] uppercase font-bold tracking-wider truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Conversion</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 min-w-0">
        <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-300 ${
          isDark ? 'bg-space-800/50 border-space-700/50 focus-within:border-space-600' : 'bg-white border-gray-200 focus-within:border-gray-300 shadow-sm'
        }`}>
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un lead (nom, téléphone, email)..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="bg-transparent border-none p-0 focus:ring-0 w-full text-base sm:text-lg placeholder:text-gray-500"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="input min-w-[160px] rounded-2xl px-4 py-3 text-sm"
          >
            <option value="all">Tous statuts</option>
            {LEAD_STATUSES.map(status => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => handleSourceFilterChange(e.target.value)}
            className="input min-w-[160px] rounded-2xl px-4 py-3 text-sm"
          >
            <option value="all">Toutes sources</option>
            {LEAD_SOURCES.map(source => (
              <option key={source.id} value={source.id}>{source.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Suggested Leads Section */}
      {suggestedLeads.length > 0 && (
        <div className="mb-6">
          <div 
            className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/20 to-gold-400/20 border border-blue-500/30 rounded-2xl cursor-pointer"
            onClick={() => setShowSuggested(!showSuggested)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/30 rounded-xl">
                <Sparkles className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-100 flex items-center gap-2">
                  Leads suggérés par l'IA
                  <span className="px-2 py-0.5 bg-blue-500/30 text-blue-400 text-xs font-medium rounded-full">
                    {suggestedLeads.length}
                  </span>
                </h3>
                <p className="text-sm text-gray-400">Détectés automatiquement dans vos conversations</p>
              </div>
            </div>
            {showSuggested ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>

          {showSuggested && (
            <div className="mt-4 space-y-3">
              {suggestedLeads.map((lead) => (
                <div 
                  key={lead.id}
                  className="card p-4 border-l-4 border-l-blue-500"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-gold-400 rounded-xl flex items-center justify-center">
                        <span className="text-space-950 font-bold">
                          {lead.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-semibold text-gray-100">{lead.name}</h4>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" />
                                {lead.phone}
                              </span>
                            )}
                            {lead.agent_name && (
                              <span className="flex items-center gap-1">
                                <Bot className="w-3.5 h-3.5" />
                                {lead.agent_name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          lead.ai_confidence >= 0.7 
                            ? 'bg-green-500/20 text-green-400' 
                            : lead.ai_confidence >= 0.5 
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {Math.round(lead.ai_confidence * 100)}% confiance
                        </div>
                      </div>

                      <div className="mt-2 p-2 bg-space-800 rounded-lg">
                        <p className="text-xs text-gray-400">
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          {lead.ai_reason || 'Intérêt potentiel détecté'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        {lead.conversation_id && (
                          <Link
                            to={`/dashboard/conversations/${lead.conversation_id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-space-800 hover:bg-space-700 text-gray-300 text-sm rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            Voir la conversation
                          </Link>
                        )}
                        <button
                          onClick={() => handleValidateLead(lead.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm rounded-lg transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Valider
                        </button>
                        <button
                          onClick={() => handleRejectLead(lead.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Rejeter
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Load error + Retry */}
      {loadError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center mb-6">
          <p className="text-red-300 mb-3">{loadError}</p>
          <button
            type="button"
            onClick={() => loadLeads()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      )}

      {/* Leads List */}
      {!loadError && loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : !loadError && sortedLeads.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-space-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <UserPlus className="w-10 h-10 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            {leads.length === 0 ? 'Aucun lead' : 'Aucun résultat'}
          </h3>
          <p className="text-gray-500 mb-6">
            {leads.length === 0 
              ? 'Commencez à ajouter des leads pour suivre vos prospects'
              : 'Essayez de modifier vos filtres de recherche'}
          </p>
          {leads.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter un lead
            </button>
          )}
        </div>
      ) : !loadError ? (
        <div className="grid gap-4">
          {sortedLeads.map((lead, index) => {
            const statusInfo = getStatusInfo(lead.status)
            return (
              <div 
                key={lead.id}
                onClick={() => setSelectedLeadView(lead)}
                className="card p-3 sm:p-5 hover:border-blue-500/50 hover:bg-space-800/80 transition-all cursor-pointer group animate-fadeIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-gold-400 rounded-xl flex items-center justify-center">
                      <span className="text-space-950 font-bold text-sm sm:text-lg">
                        {lead.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-100 truncate group-hover:text-gold-400 transition-colors">
                        {lead.name}
                      </h3>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest
                        ${statusInfo.color === 'blue' ? 'bg-blue-500/20 text-blue-400' : ''}
                        ${statusInfo.color === 'amber' ? 'bg-amber-500/20 text-amber-400' : ''}
                        ${statusInfo.color === 'orange' ? 'bg-orange-500/20 text-orange-400' : ''}
                        ${statusInfo.color === 'green' ? 'bg-green-500/20 text-green-400' : ''}
                        ${statusInfo.color === 'red' ? 'bg-red-500/20 text-red-400' : ''}
                      `}>
                        {statusInfo.label}
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-400">
                      {lead.phone && (
                        <span className="flex items-center gap-1 truncate">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{lead.phone}</span>
                        </span>
                      )}
                      {lead.company && (
                        <span className="truncate flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {lead.company}
                        </span>
                      )}
                    </div>
                    <div className="sm:hidden text-xs text-gray-500 mt-0.5 truncate">
                      {lead.phone || lead.company || 'Détails...'}
                    </div>
                  </div>

                  <ChevronDown className="w-4 h-4 text-gray-600 sm:hidden" />
                  <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleFavorite(lead); }}
                      className={`p-2 rounded-lg transition-colors ${
                        lead.is_favorite ? 'text-gold-400 bg-gold-400/10' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${lead.is_favorite ? 'fill-current' : ''}`} />
                    </button>
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {(showAddModal || editingLead) && (
        <LeadModal
          lead={editingLead}
          onClose={() => {
            setShowAddModal(false)
            setEditingLead(null)
          }}
          onSaved={() => {
            setShowAddModal(false)
            setEditingLead(null)
            loadLeads()
          }}
        />
      )}

      {selectedLeadView && (
        <DetailOverlay onClose={() => setSelectedLeadView(null)}>
          <div className="flex flex-col">
            <div className="flex items-center gap-6 mb-10">
              <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center flex-shrink-0 shadow-2xl ring-1 ring-white/10 text-gold-400">
                <span className="text-4xl font-syne font-black italic">
                  {selectedLeadView.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-3xl font-display font-bold text-gray-100 mb-3 truncate leading-tight">{selectedLeadView.name}</h3>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    getStatusInfo(selectedLeadView.status).color === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    getStatusInfo(selectedLeadView.status).color === 'amber' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    getStatusInfo(selectedLeadView.status).color === 'orange' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                    getStatusInfo(selectedLeadView.status).color === 'green' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {getStatusInfo(selectedLeadView.status).label}
                  </span>
                  {selectedLeadView.is_favorite && (
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                      Favori
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Contact</p>
                  <div className="space-y-2">
                    <p className="text-gray-100 font-bold flex items-center gap-2 truncate text-sm">
                      <Phone className="w-3.5 h-3.5 text-gray-600" />
                      {selectedLeadView.phone || 'Non renseigné'}
                    </p>
                    <p className="text-gray-100 font-bold flex items-center gap-2 truncate text-sm">
                      <Mail className="w-3.5 h-3.5 text-gray-600" />
                      {selectedLeadView.email || 'Non renseigné'}
                    </p>
                  </div>
                </div>
                <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Informations</p>
                  <div className="space-y-2">
                    <p className="text-gray-100 font-bold flex items-center gap-2 truncate text-sm">
                      <Users className="w-3.5 h-3.5 text-gray-600" />
                      {selectedLeadView.company || 'Particulier'}
                    </p>
                    <p className="text-gray-100 font-bold flex items-center gap-2 truncate text-sm">
                      <Tag className="w-3.5 h-3.5 text-gray-600" />
                      {selectedLeadView.source || 'Direct'}
                    </p>
                  </div>
                </div>
              </div>

              {selectedLeadView.notes && (
                <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                  <p className="text-[10px] text-gray-500 uppercase font-black mb-3 tracking-widest">Notes privées</p>
                  <p className="text-gray-300 leading-relaxed italic text-sm">{selectedLeadView.notes}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <button 
                  onClick={() => {
                    setSelectedLeadView(null)
                    setEditingLead(selectedLeadView)
                  }}
                  className="w-full sm:flex-1 py-4 px-8 bg-white text-black rounded-2xl font-syne font-black italic uppercase tracking-tight hover:bg-gold-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl flex items-center justify-center gap-2"
                >
                  <Edit className="w-5 h-5" />
                  Modifier le lead
                </button>
                <button 
                  onClick={() => setSelectedLeadView(null)} 
                  className="w-full sm:w-auto py-4 px-8 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl font-bold transition-colors border border-white/5"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </DetailOverlay>
      )}
    </div>
  )
}

function LeadModal({ lead, onClose, onSaved }) {
  useLockBodyScroll(true)
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    phone: lead?.phone || '',
    email: lead?.email || '',
    company: lead?.company || '',
    source: lead?.source || 'whatsapp',
    status: lead?.status || 'new',
    tags: lead?.tags || '',
    notes: lead?.notes || '',
    is_favorite: lead?.is_favorite || false
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Le nom est requis')
      return
    }
    setLoading(true)
    try {
      if (lead) {
        await api.put(`/leads/${lead.id}`, formData)
        toast.success('Lead mis à jour')
      } else {
        await api.post('/leads', formData)
        toast.success('Lead ajouté')
      }
      onSaved()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div 
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 lg:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
    >
      <div 
        className="relative z-10 w-full max-w-xl bg-[#0B0F1A] border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden animate-slideUp sm:animate-zoomIn"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Handle */}
        <div className="flex-shrink-0 w-full flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-white/10" />
        </div>

        <div className="flex-shrink-0 p-6 sm:p-8" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-display font-bold text-gray-100 truncate">
                {lead ? 'Modifier le lead' : 'Nouveau prospect'}
              </h2>
              <p className="text-sm text-gray-500 mt-1 truncate">Gérez les informations de votre contact</p>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/5" 
              aria-label="Fermer"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 space-y-8 custom-scrollbar overscroll-contain">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nom complet *</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Jean Dupont"
                    className="input-dark w-full pl-12 py-4 pr-5 text-base rounded-2xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Téléphone</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+33 6 12 34 56 78"
                    className="input-dark w-full pl-12 py-4 pr-5 text-base rounded-2xl font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jean.dupont@exemple.com"
                    className="input-dark w-full pl-12 py-4 pr-5 text-base rounded-2xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Entreprise / Organisation</label>
                <div className="relative group">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Nom de l'entreprise"
                    className="input-dark w-full pl-12 py-4 pr-5 text-base rounded-2xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Source d'acquisition</label>
                  <div className="relative group">
                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="input-dark w-full py-4 pl-12 pr-12 text-base rounded-2xl appearance-none bg-transparent"
                    >
                    {LEAD_SOURCES.map(source => (
                      <option key={source.id} value={source.id}>{source.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="sm:col-span-2 space-y-4">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Statut du prospect</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LEAD_STATUSES.map(status => (
                    <button
                      key={status.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, status: status.id })}
                      className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        formData.status === status.id
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                          : 'bg-white/[0.02] border-white/5 text-gray-500 hover:border-white/20'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Notes et observations</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes supplémentaires sur ce prospect..."
                  className="input-dark w-full py-4 px-5 text-base rounded-3xl resize-none min-h-[120px] custom-scrollbar"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_favorite: !formData.is_favorite })}
                  className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all w-full sm:w-auto ${
                    formData.is_favorite
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                      : 'bg-white/[0.02] border-white/5 text-gray-500 hover:border-white/10'
                  }`}
                >
                  <Star className={`w-5 h-5 ${formData.is_favorite ? 'fill-current' : ''}`} />
                  <span className="font-bold text-sm uppercase tracking-widest">Prospect favori</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 p-6 sm:p-8 pt-4 border-t border-white/5 bg-black/20 flex flex-col-reverse sm:flex-row gap-3" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all text-sm uppercase tracking-widest"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-1 py-4 px-8 bg-white text-black rounded-2xl font-syne font-black italic uppercase tracking-tight hover:bg-gold-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Chargement...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>{lead ? 'Mettre à jour' : 'Enregistrer le lead'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

function DetailOverlay({ children, onClose }) {
  return createPortal(
    <div 
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 lg:p-4 bg-black/80 backdrop-blur-md animate-fade-in" 
      onClick={onClose}
      style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
    >
      <div 
        className="relative z-10 w-full max-w-2xl bg-[#0B0F1A] border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden animate-slideUp sm:animate-zoomIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Handle */}
        <div className="flex-shrink-0 w-full flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-white/10" />
        </div>

        <div className="flex-shrink-0 p-6 sm:p-10 flex justify-end" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/5"
          >
            <XCircle className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain px-6 sm:px-10 pb-10" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
