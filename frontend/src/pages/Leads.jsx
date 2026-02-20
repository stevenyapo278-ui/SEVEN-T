import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../services/api'
import { useConfirm } from '../contexts/ConfirmContext'
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
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

const LEAD_STATUSES = [
  { id: 'new', label: 'Nouveau', color: 'blue', icon: UserPlus },
  { id: 'contacted', label: 'Contacté', color: 'amber', icon: MessageSquare },
  { id: 'qualified', label: 'Qualifié', color: 'violet', icon: UserCheck },
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
  const [searchParams, setSearchParams] = useSearchParams()
  const { showConfirm } = useConfirm()
  const [leads, setLeads] = useState([])
  const [suggestedLeads, setSuggestedLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [showSuggested, setShowSuggested] = useState(true)

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
    <div className="space-y-6">
      {/* Header Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-space-800 via-space-900 to-space-950 border border-space-700 p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-5"></div>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-display font-bold text-gray-100 mb-2">
                Gestion des Leads
              </h1>
              <p className="text-gray-400">
                Suivez et convertissez vos prospects en clients
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter un lead
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-8">
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/20 rounded-xl">
                  <Users className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-100">{stats.total}</p>
                  <p className="text-xs text-gray-500">Total leads</p>
                </div>
              </div>
            </div>
            {stats.suggested > 0 && (
              <div className="bg-gradient-to-br from-violet-500/20 to-gold-400/20 backdrop-blur-sm rounded-2xl p-4 border border-violet-500/30 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-500/30 rounded-xl">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-violet-400">{stats.suggested}</p>
                    <p className="text-xs text-gray-400">À valider</p>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-xl">
                  <UserPlus className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-100">{stats.new}</p>
                  <p className="text-xs text-gray-500">Nouveaux</p>
                </div>
              </div>
            </div>
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/20 rounded-xl">
                  <UserCheck className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-100">{stats.qualified}</p>
                  <p className="text-xs text-gray-500">Qualifiés</p>
                </div>
              </div>
            </div>
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-xl">
                  <ShoppingCart className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-100">{stats.customers}</p>
                  <p className="text-xs text-gray-500">Clients</p>
                </div>
              </div>
            </div>
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold-400/20 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-100">{stats.conversionRate}%</p>
                  <p className="text-xs text-gray-500">Conversion</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher un lead (nom, téléphone, email, entreprise)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark w-full pl-12"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-dark min-w-[150px]"
        >
          <option value="all">Tous statuts</option>
          {LEAD_STATUSES.map(status => (
            <option key={status.id} value={status.id}>{status.label}</option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="input-dark min-w-[150px]"
        >
          <option value="all">Toutes sources</option>
          {LEAD_SOURCES.map(source => (
            <option key={source.id} value={source.id}>{source.label}</option>
          ))}
        </select>
      </div>

      {/* Suggested Leads Section */}
      {suggestedLeads.length > 0 && (
        <div className="mb-6">
          <div 
            className="flex items-center justify-between p-4 bg-gradient-to-r from-violet-500/20 to-gold-400/20 border border-violet-500/30 rounded-2xl cursor-pointer"
            onClick={() => setShowSuggested(!showSuggested)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/30 rounded-xl">
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-100 flex items-center gap-2">
                  Leads suggérés par l'IA
                  <span className="px-2 py-0.5 bg-violet-500/30 text-violet-400 text-xs font-medium rounded-full">
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
                  className="card p-4 border-l-4 border-l-violet-500"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar with AI badge */}
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-gold-400 rounded-xl flex items-center justify-center">
                        <span className="text-space-950 font-bold">
                          {lead.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    </div>

                    {/* Lead Info */}
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

                        {/* Confidence badge */}
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

                      {/* AI Reason */}
                      <div className="mt-2 p-2 bg-space-800 rounded-lg">
                        <p className="text-xs text-gray-400">
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          {lead.ai_reason || 'Intérêt potentiel détecté'}
                        </p>
                      </div>

                      {/* Actions */}
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
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
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
            const StatusIcon = statusInfo.icon
            return (
              <div 
                key={lead.id}
                className="card p-4 md:p-6 hover:border-space-600 transition-all"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-gold-400 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-space-950 font-bold text-lg">
                        {lead.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    {lead.is_favorite && (
                      <Star className="absolute -top-1 -right-1 w-4 h-4 text-gold-400 fill-gold-400" />
                    )}
                  </div>

                  {/* Lead Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-100 flex items-center gap-2">
                          {lead.name}
                          {lead.company && (
                            <span className="text-sm font-normal text-gray-500">• {lead.company}</span>
                          )}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {lead.phone}
                            </span>
                          )}
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />
                              {lead.email}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                          ${statusInfo.color === 'blue' ? 'bg-blue-500/20 text-blue-400' : ''}
                          ${statusInfo.color === 'amber' ? 'bg-amber-500/20 text-amber-400' : ''}
                          ${statusInfo.color === 'violet' ? 'bg-violet-500/20 text-violet-400' : ''}
                          ${statusInfo.color === 'orange' ? 'bg-orange-500/20 text-orange-400' : ''}
                          ${statusInfo.color === 'green' ? 'bg-green-500/20 text-green-400' : ''}
                          ${statusInfo.color === 'red' ? 'bg-red-500/20 text-red-400' : ''}
                        `}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusInfo.label}
                        </div>
                      </div>
                    </div>

                    {/* Tags & Meta */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {lead.source && (
                        <span className="text-xs px-2 py-0.5 bg-space-800 text-gray-400 rounded-full">
                          {LEAD_SOURCES.find(s => s.id === lead.source)?.label || lead.source}
                        </span>
                      )}
                      {lead.tags?.split(',').filter(Boolean).map((tag, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded-full">
                          {tag.trim()}
                        </span>
                      ))}
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    {/* Notes preview */}
                    {lead.notes && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-1">
                        {lead.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleFavorite(lead)}
                      className={`p-2 rounded-lg transition-colors ${
                        lead.is_favorite 
                          ? 'text-gold-400 hover:bg-gold-400/10' 
                          : 'text-gray-500 hover:text-gray-300 hover:bg-space-700'
                      }`}
                      title={lead.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      {lead.is_favorite ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditingLead(lead)}
                      className="p-2 text-gray-400 hover:text-violet-400 hover:bg-space-700 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(lead.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick status change */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-space-700">
                  {LEAD_STATUSES.map(status => (
                    <button
                      key={status.id}
                      onClick={() => handleStatusChange(lead, status.id)}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                        lead.status === status.id
                          ? status.color === 'blue' ? 'bg-blue-500/30 text-blue-400 border border-blue-500/30' :
                            status.color === 'amber' ? 'bg-amber-500/30 text-amber-400 border border-amber-500/30' :
                            status.color === 'violet' ? 'bg-violet-500/30 text-violet-400 border border-violet-500/30' :
                            status.color === 'orange' ? 'bg-orange-500/30 text-orange-400 border border-orange-500/30' :
                            status.color === 'green' ? 'bg-green-500/30 text-green-400 border border-green-500/30' :
                            'bg-red-500/30 text-red-400 border border-red-500/30'
                          : 'bg-space-800 text-gray-500 hover:text-gray-300 border border-transparent hover:border-space-600'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Add/Edit Lead Modal */}
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
    </div>
  )
}

function LeadModal({ lead, onClose, onSaved }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-space-900 border border-space-700 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-space-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold text-gray-100">
              {lead ? 'Modifier le lead' : 'Ajouter un lead'}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Nom *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Prénom Nom"
                className="input-dark w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Téléphone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+33 6 12 34 56 78"
                className="input-dark w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                className="input-dark w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Entreprise</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Nom de l'entreprise"
                className="input-dark w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="input-dark w-full"
              >
                {LEAD_SOURCES.map(source => (
                  <option key={source.id} value={source.id}>{source.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Statut</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input-dark w-full"
              >
                {LEAD_STATUSES.map(status => (
                  <option key={status.id} value={status.id}>{status.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Tags (séparés par des virgules)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="VIP, Urgent, Relancer..."
                className="input-dark w-full"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes sur ce lead..."
                rows={3}
                className="input-dark w-full resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Enregistrement...' : (lead ? 'Mettre à jour' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
