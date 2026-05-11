import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { getDeals, getDealStats, createDeal, updateDeal, deleteDeal } from '../services/api'
import api from '../services/api'
import { useConfirm } from '../contexts/ConfirmContext'
import { useTheme } from '../contexts/ThemeContext'
import { 
  Briefcase,
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  X, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  ChevronDown, 
  RefreshCw, 
  Loader2,
  Calendar,
  AlertCircle,
  Link2,
  Phone,
  User,
  MoreVertical,
  Check
} from 'lucide-react'
import toast from 'react-hot-toast'

const DEAL_STAGES = [
  { id: 'qualification', label: 'Qualification', color: 'blue', icon: Search },
  { id: 'proposal', label: 'Proposition', color: 'amber', icon: Clock },
  { id: 'negotiation', label: 'Négociation', color: 'orange', icon: TrendingUp },
  { id: 'closed_won', label: 'Gagné', color: 'green', icon: CheckCircle2 },
  { id: 'closed_lost', label: 'Perdu', color: 'red', icon: XCircle },
]

export default function Deals() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { showConfirm } = useConfirm()
  const [searchParams, setSearchParams] = useSearchParams()

  const [deals, setDeals] = useState([])
  const [stats, setStats] = useState({ total: 0, won_amount: 0, pipeline_amount: 0, won_count: 0, lost_count: 0, active_count: 0 })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '')
  const [stageFilter, setStageFilter] = useState(() => searchParams.get('stage') || 'all')
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingDeal, setEditingDeal] = useState(null)
  const [leads, setLeads] = useState([]) // For selection dropdown

  const inputClass = `w-full rounded-2xl px-5 py-3 outline-none transition-all focus:ring-2 focus:ring-blue-500/50 ${
    isDark ? 'bg-space-800 border-space-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
  } border`;

  const isModuleEnabled = (() => {
    // Admin bypass
    if (user?.is_admin === 1) return true
    
    const feat = user?.plan_features?.deals_management
    if (feat === true) return true
    
    // User level override
    const override = user?.deals_management_enabled
    const isOverrideTrue = override === 1 || override === '1' || override === true
    const isOverrideFalse = override === 0 || override === '0'
    
    if (!user?.parent_user_id || user?.role === 'owner') {
      if (isOverrideFalse) return false
      return !!feat || isOverrideTrue
    }
    return isOverrideTrue
  })()

  useEffect(() => {
    if (isModuleEnabled) {
      loadData()
      fetchLeads()
    }
  }, [isModuleEnabled])

  const loadData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [dealsRes, statsRes] = await Promise.all([
        getDeals(),
        getDealStats()
      ])
      setDeals(dealsRes.deals || [])
      setStats(statsRes.stats || { total: 0, won_amount: 0, pipeline_amount: 0, won_count: 0, lost_count: 0, active_count: 0 })
    } catch (error) {
      console.error('Error loading deals:', error)
      setLoadError('Erreur lors du chargement des données')
      toast.error('Erreur lors du chargement des deals')
    } finally {
      setLoading(false)
    }
  }

  const fetchLeads = async () => {
    try {
      const res = await api.get('/leads')
      setLeads(res.data.leads || [])
    } catch (err) {
      console.error('Error fetching leads:', err)
    }
  }

  const handleDeleteDeal = async (id) => {
    const ok = await showConfirm({
      title: 'Supprimer le deal',
      message: 'Êtes-vous sûr de vouloir supprimer cette opportunité ? Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return

    try {
      await deleteDeal(id)
      toast.success('Deal supprimé')
      loadData()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = {
      name: formData.get('name'),
      contact_name: formData.get('contact_name'),
      contact_phone: formData.get('contact_phone'),
      lead_id: formData.get('lead_id') || null,
      amount: parseFloat(formData.get('amount')) || 0,
      currency: formData.get('currency') || 'XOF',
      stage: formData.get('stage'),
      probability: parseInt(formData.get('probability')) || 0,
      expected_close_date: formData.get('expected_close_date') || null,
      notes: formData.get('notes')
    }

    try {
      if (editingDeal) {
        await updateDeal(editingDeal.id, data)
        toast.success('Deal mis à jour')
      } else {
        await createDeal(data)
        toast.success('Deal créé avec succès')
      }
      setShowAddModal(false)
      setEditingDeal(null)
      loadData()
    } catch (error) {
      toast.error('Erreur lors de l’enregistrement')
    }
  }

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = deal.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         deal.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         deal.contact_phone?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStage = stageFilter === 'all' || deal.stage === stageFilter
    return matchesSearch && matchesStage
  })

  const getStageInfo = (stageId) => {
    return DEAL_STAGES.find(s => s.id === stageId) || DEAL_STAGES[0]
  }

  if (!isModuleEnabled) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0 pb-20">
      {/* Header Hero */}
      <div className={`relative rounded-3xl border p-6 sm:p-10 mb-8 overflow-hidden ${
        isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200 shadow-sm'
      }`}>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                  <Briefcase className="w-8 h-8 text-blue-400" />
                </div>
                <h1 className={`text-3xl sm:text-4xl font-display font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Pipeline de Deals</h1>
              </div>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Gérez vos opportunités commerciales et suivez votre chiffre d'affaires prévisionnel.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => loadData()}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 ${
                  isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700 hover:text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Actualiser</span>
              </button>
              <button
                onClick={() => { setEditingDeal(null); setShowAddModal(true); }}
                className="btn-primary flex items-center gap-2 px-6 py-3"
              >
                <Plus className="w-5 h-5" />
                <span>Nouveau deal</span>
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className={`rounded-2xl p-5 border ${isDark ? 'bg-space-800/40 border-space-700/30' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <DollarSign className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.pipeline_amount?.toLocaleString()} {stats.currency || 'XOF'}</p>
                  <p className="text-xs uppercase font-black tracking-widest text-gray-500">Pipeline actif</p>
                </div>
              </div>
            </div>
            <div className={`rounded-2xl p-5 border ${isDark ? 'bg-space-800/40 border-space-700/30' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.won_amount?.toLocaleString()} {stats.currency || 'XOF'}</p>
                  <p className="text-xs uppercase font-black tracking-widest text-gray-500">Chiffre d'affaires gagné</p>
                </div>
              </div>
            </div>
            <div className={`rounded-2xl p-5 border ${isDark ? 'bg-space-800/40 border-space-700/30' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-amber-500/10 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.active_count}</p>
                  <p className="text-xs uppercase font-black tracking-widest text-gray-500">Opportunités actives</p>
                </div>
              </div>
            </div>
            <div className={`rounded-2xl p-5 border ${isDark ? 'bg-space-800/40 border-space-700/30' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-green-500/10 rounded-xl">
                  <span className="text-xl font-bold text-green-400">
                    {stats.total > 0 ? Math.round((stats.won_count / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.won_count}</p>
                  <p className="text-xs uppercase font-black tracking-widest text-gray-500">Deals clôturés gagnés</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
        <div className={`flex-1 flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-300 w-full ${
          isDark ? 'bg-space-800/50 border-space-700/50 focus-within:border-space-600' : 'bg-white border-gray-200 focus-within:border-blue-400 shadow-sm'
        }`}>
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, contact ou téléphone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none p-0 focus:ring-0 w-full text-lg placeholder:text-gray-500"
          />
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className={`flex-1 sm:min-w-[200px] px-5 py-3 rounded-2xl border [color-scheme:dark] focus:ring-2 focus:ring-blue-500/20 outline-none transition-all ${
              isDark ? 'border-space-700 text-gray-200 bg-space-800' : 'border-gray-200 text-gray-700 bg-white shadow-sm'
            }`}
          >
            <option value="all">Toutes les étapes</option>
            {DEAL_STAGES.map(stage => (
              <option key={stage.id} value={stage.id} className={isDark ? 'bg-space-800 text-gray-200' : ''}>{stage.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500">Chargement de votre pipeline...</p>
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className={`text-center py-20 rounded-3xl border-2 border-dashed ${isDark ? 'border-space-700/50 bg-space-800/20' : 'border-gray-200 bg-gray-50/50'}`}>
          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-10 h-10 text-blue-400/50" />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
            {searchQuery || stageFilter !== 'all' ? 'Aucun résultat trouvé' : 'Aucun deal dans votre pipeline'}
          </h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-8">
            {searchQuery || stageFilter !== 'all' 
              ? 'Essayez de modifier vos filtres ou termes de recherche.'
              : 'Commencez à suivre vos opportunités commerciales dès aujourd\'hui.'}
          </p>
          {(searchQuery || stageFilter !== 'all') ? (
            <button 
              onClick={() => { setSearchQuery(''); setStageFilter('all'); }}
              className="text-blue-400 font-bold hover:underline"
            >
              Réinitialiser les filtres
            </button>
          ) : (
            <button
              onClick={() => { setEditingDeal(null); setShowAddModal(true); }}
              className="btn-primary"
            >
              Créer mon premier deal
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDeals.map((deal) => {
            const stage = getStageInfo(deal.stage)
            const StageIcon = stage.icon
            return (
              <div 
                key={deal.id}
                className={`group relative rounded-3xl border p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                  isDark ? 'bg-space-800/40 border-space-700/50 hover:bg-space-800 hover:border-blue-500/30' : 'bg-white border-gray-100 shadow-sm hover:border-blue-200'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                    stage.color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
                    stage.color === 'amber' ? 'bg-amber-500/10 text-amber-500' :
                    stage.color === 'orange' ? 'bg-orange-500/10 text-orange-400' :
                    stage.color === 'green' ? 'bg-emerald-500/10 text-emerald-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    <StageIcon className="w-3.5 h-3.5" />
                    {stage.label}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingDeal(deal); setShowAddModal(true); }}
                      className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-space-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500'}`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteDeal(deal.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className={`text-xl font-bold leading-tight line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {deal.name}
                  </h3>

                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-blue-400">
                      {deal.amount?.toLocaleString()}
                    </span>
                    <span className="text-sm font-bold text-gray-500">{deal.currency || 'XOF'}</span>
                <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-space-900' : 'bg-gray-100'}`}>
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        stage.color === 'green' ? 'bg-emerald-500' :
                        stage.color === 'red' ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${deal.probability}%` }}
                    />
                  </div>

                  <div className="pt-4 border-t border-space-700/50 space-y-2.5">
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{deal.contact_name || 'Sans nom'}</span>
                    </div>
                    {deal.contact_phone && (
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{deal.contact_phone}</span>
                      </div>
                    )}
                    {deal.expected_close_date && (
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>Clôture: {new Date(deal.expected_close_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {deal.lead_id && (
                      <div className="flex items-center gap-3 text-sm text-blue-400/70">
                        <Link2 className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">Lié au lead: {deal.lead_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className={`relative w-full max-w-2xl rounded-[2rem] sm:rounded-3xl border shadow-2xl animate-zoomIn max-h-[95vh] flex flex-col overflow-hidden ${
            isDark ? 'bg-space-900 border-space-700' : 'bg-white border-gray-200'
          }`}>
            <div className="px-8 py-6 border-b border-space-700/50 flex justify-between items-center">
              <div>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{editingDeal ? 'Modifier le deal' : 'Nouvelle opportunité'}</h2>
                <p className="text-sm text-gray-400">Saisissez les informations de votre vente</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-space-800' : 'hover:bg-gray-100'}`}>
                <X className={`w-6 h-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <form onSubmit={handleCreateOrUpdate} className="p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-gray-500">Nom du Deal</label>
                  <input
                    name="name"
                    required
                    defaultValue={editingDeal?.name}
                    placeholder="ex: Contrat de maintenance annuel"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-gray-500">Contact</label>
                  <input
                    name="contact_name"
                    defaultValue={editingDeal?.contact_name}
                    placeholder="Nom du client"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-gray-500">Téléphone</label>
                  <input
                    name="contact_phone"
                    defaultValue={editingDeal?.contact_phone}
                    placeholder="225..."
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-gray-500">Lier un Lead (Optionnel)</label>
                  <select
                    name="lead_id"
                    defaultValue={editingDeal?.lead_id || ''}
                    className={`${inputClass} ${isDark ? '[color-scheme:dark]' : '[color-scheme:light]'}`}
                  >
                    <option value="" className={isDark ? 'bg-space-800 text-white' : 'bg-white text-gray-900'}>-- Aucun --</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id} className={isDark ? 'bg-space-800 text-white' : 'bg-white text-gray-900'}>{l.name} {l.phone ? `(${l.phone})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-gray-500">Montant</label>
                  <div className="relative">
                    <input
                      name="amount"
                      type="number"
                      step="any"
                      defaultValue={editingDeal?.amount || 0}
                      className={`${inputClass} pr-16`}
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">XOF</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-gray-500">Étape</label>
                  <select
                    name="stage"
                    defaultValue={editingDeal?.stage || 'qualification'}
                    className={`${inputClass} ${isDark ? '[color-scheme:dark]' : '[color-scheme:light]'}`}
                  >
                    {DEAL_STAGES.map(s => (
                      <option key={s.id} value={s.id} className={isDark ? 'bg-space-800 text-white' : 'bg-white text-gray-900'}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-gray-500">Probabilité (%)</label>
                  <input
                    name="probability"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={editingDeal?.probability || 10}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-gray-500">Date de clôture prévue</label>
                  <input
                    name="expected_close_date"
                    type="date"
                    defaultValue={editingDeal?.expected_close_date ? new Date(editingDeal.expected_close_date).toISOString().split('T')[0] : ''}
                    className={`${inputClass} ${isDark ? '[color-scheme:dark]' : '[color-scheme:light]'}`}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-gray-500">Notes & Détails</label>
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={editingDeal?.notes}
                    placeholder="Détails sur l'opportunité, produits concernés, prochaines étapes..."
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className={`flex-1 px-6 py-4 rounded-2xl font-bold transition-all border ${
                      isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700 border-space-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'
                    }`}
                  >
                    Annuler
                  </button>
                <button
                  type="submit"
                  className="flex-[2] px-6 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
                >
                  {editingDeal ? 'Enregistrer les modifications' : 'Créer l\'opportunité'}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
