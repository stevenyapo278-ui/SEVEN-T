import { useState, useEffect } from 'react'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { Link } from 'react-router-dom'
import {
  Send,
  Plus,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Eye,
  Edit3,
  Play,
  Pause,
  Search,
  MoreHorizontal,
  MessageSquare,
  Target,
  Calendar,
  BarChart2,
  UserPlus,
  UserCheck,
  History,
  X,
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Campaigns() {
  const { isDark } = useTheme()
  const { showConfirm } = useConfirm()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [stats, setStats] = useState(null)
  const [agents, setAgents] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showRecipientsModal, setShowRecipientsModal] = useState(false)
  const [recipientsCampaign, setRecipientsCampaign] = useState(null)
  const [recipientsList, setRecipientsList] = useState([])
  const [leadsList, setLeadsList] = useState([])
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set())
  const [leadsForSection, setLeadsForSection] = useState([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  useLockBodyScroll(showModal || showRecipientsModal || showHistoryModal)
  const [historyData, setHistoryData] = useState({ campaign: null, recipients: [] })
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [sendingCampaignId, setSendingCampaignId] = useState(null)

  // Form state
  const [form, setForm] = useState({
    name: '',
    message: '',
    agent_id: '',
    scheduled_at: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const [campaignsRes, statsRes, agentsRes, leadsRes] = await Promise.all([
        api.get('/campaigns'),
        api.get('/campaigns/stats/overview'),
        api.get('/agents'),
        api.get('/leads').catch(() => ({ data: { leads: [] } }))
      ])
      setCampaigns(campaignsRes.data.campaigns || [])
      setStats(statsRes.data?.stats || null)
      setAgents(agentsRes.data?.agents || [])
      setLeadsForSection(leadsRes.data?.leads || [])
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Erreur de chargement'
      setLoadError(message)
      console.error('Error loading campaigns:', error)
      toast.error('Erreur lors du chargement des campagnes')
    } finally {
      setLoading(false)
    }
  }

  const openRecipientsModal = async (campaign) => {
    if (campaign.status === 'sent' || campaign.status === 'sending') return
    setLoadingRecipients(true)
    setShowRecipientsModal(true)
    setRecipientsCampaign(null)
    setRecipientsList([])
    setLeadsList([])
    setSelectedLeadIds(new Set())
    try {
      const [campRes, leadsRes] = await Promise.all([
        api.get(`/campaigns/${campaign.id}`),
        api.get('/leads')
      ])
      setRecipientsCampaign({ campaign: campRes.data.campaign, id: campaign.id })
      setRecipientsList(campRes.data.recipients || [])
      setLeadsList(leadsRes.data?.leads || [])
    } catch (error) {
      console.error('Error loading recipients/leads:', error)
      toast.error('Erreur lors du chargement')
      setShowRecipientsModal(false)
    } finally {
      setLoadingRecipients(false)
    }
  }

  const closeRecipientsModal = () => {
    setShowRecipientsModal(false)
    setRecipientsCampaign(null)
    setRecipientsList([])
    setLeadsList([])
    setSelectedLeadIds(new Set())
    loadData()
  }

  const handleRemoveRecipient = async (recipientId) => {
    if (!recipientsCampaign?.id) return
    try {
      await api.delete(`/campaigns/${recipientsCampaign.id}/recipients/${recipientId}`)
      setRecipientsList(prev => prev.filter(r => r.id !== recipientId))
      toast.success('Destinataire retiré')
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
    }
  }

  const handleAddFromLeads = async () => {
    if (!recipientsCampaign?.id || selectedLeadIds.size === 0) {
      toast.error('Sélectionnez au moins un lead')
      return
    }
    try {
      const result = await api.post(`/campaigns/${recipientsCampaign.id}/recipients/from-leads`, {
        lead_ids: Array.from(selectedLeadIds)
      })
      const added = result.data?.added ?? result.data?.imported ?? 0
      toast.success(added > 0 ? `${added} lead(s) ajouté(s)` : 'Aucun nouveau contact ajouté (déjà présents)')
      setSelectedLeadIds(new Set())
      const campRes = await api.get(`/campaigns/${recipientsCampaign.id}`)
      setRecipientsList(campRes.data.recipients || [])
      setRecipientsCampaign(prev => prev ? { ...prev, campaign: campRes.data.campaign } : null)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'ajout')
    }
  }

  const toggleLeadSelection = (leadId) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev)
      if (next.has(leadId)) next.delete(leadId)
      else next.add(leadId)
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!form.name.trim() || !form.message.trim() || !form.agent_id) {
      toast.error('Veuillez remplir tous les champs requis')
      return
    }

    try {
      if (selectedCampaign) {
        await api.put(`/campaigns/${selectedCampaign.id}`, form)
        toast.success('Campagne mise à jour')
      } else {
        await api.post('/campaigns', form)
        toast.success('Campagne créée')
      }
      setShowModal(false)
      setForm({ name: '', message: '', agent_id: '', scheduled_at: '' })
      setSelectedCampaign(null)
      loadData()
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleImportContacts = async (campaignId) => {
    try {
      const result = await api.post(`/campaigns/${campaignId}/import-conversations`)
      const count = result.data?.imported ?? result.data?.total ?? 0
      toast.success(`${count} contact(s) importé(s)`)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'import')
    }
  }

  const handleSendCampaign = async (campaignId) => {
    const ok = await showConfirm({
      title: 'Envoyer la campagne',
      message: 'Êtes-vous sûr de vouloir envoyer cette campagne ? Cette action est irréversible.',
      variant: 'warning',
      confirmLabel: 'Envoyer'
    })
    if (!ok) return
    setSendingCampaignId(campaignId)
    const loadingToastId = toast.loading('Envoi en cours…')
    try {
      const result = await api.post(`/campaigns/${campaignId}/send`)
      toast.dismiss(loadingToastId)
      const sent = result.data?.sent ?? 0
      const failed = result.data?.failed ?? 0
      if (failed > 0) {
        toast.success(`${sent} envoyé(s), ${failed} échec(s)`)
      } else {
        toast.success(`Campagne envoyée : ${sent} message(s)`)
      }
      loadData()
    } catch (error) {
      toast.dismiss(loadingToastId)
      toast.error(error.response?.data?.error || 'Erreur lors de l\'envoi')
    } finally {
      setSendingCampaignId(null)
    }
  }

  const handleDelete = async (campaignId) => {
    const ok = await showConfirm({
      title: 'Supprimer la campagne',
      message: 'Supprimer définitivement cette campagne ? Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/campaigns/${campaignId}`)
      toast.success('Campagne supprimée')
      loadData()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const openEditModal = (campaign) => {
    setSelectedCampaign(campaign)
    setForm({
      name: campaign.name,
      message: campaign.message,
      agent_id: campaign.agent_id,
      scheduled_at: campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : ''
    })
    setShowModal(true)
  }

  const openHistoryModal = async (campaign) => {
    setShowHistoryModal(true)
    setHistoryData({ campaign: null, recipients: [] })
    setLoadingHistory(true)
    try {
      const res = await api.get(`/campaigns/${campaign.id}`)
      setHistoryData({ campaign: res.data.campaign, recipients: res.data.recipients || [] })
    } catch (error) {
      toast.error('Erreur lors du chargement de l\'historique')
      setShowHistoryModal(false)
    } finally {
      setLoadingHistory(false)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      draft: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Brouillon' },
      scheduled: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Programmée' },
      sending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Envoi en cours' },
      sent: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Envoyée' },
      failed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Échec' }
    }
    const style = styles[status] || styles.draft
    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    )
  }

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold text-gray-100">Campagnes</h1>
          <p className="text-gray-400 text-sm sm:text-base">Envoyez des messages en masse à vos contacts</p>
        </div>
        <button
          onClick={() => {
            setSelectedCampaign(null)
            setForm({ name: '', message: '', agent_id: '', scheduled_at: '' })
            setShowModal(true)
          }}
          className="btn-primary flex items-center justify-center gap-2 flex-shrink-0 touch-target"
        >
          <Plus className="w-5 h-5" />
          Nouvelle campagne
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold-400/20 flex items-center justify-center">
            <Target className="w-6 h-6 text-gold-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-100">{stats?.total || 0}</p>
            <p className="text-sm text-gray-400">Campagnes</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-400/20 flex items-center justify-center">
            <Send className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-100">{stats?.sent || 0}</p>
            <p className="text-sm text-gray-400">Envoyées</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-400/20 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-100">{stats?.totalMessages ?? stats?.totalSent ?? 0}</p>
            <p className="text-sm text-gray-400">Messages envoyés</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-400/20 flex items-center justify-center">
            <BarChart2 className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-100">
              {stats?.totalRecipients > 0 && (stats?.totalMessages ?? stats?.totalSent ?? 0) >= 0
                ? Math.round(((stats.totalMessages ?? stats.totalSent ?? 0) / stats.totalRecipients) * 100)
                : 0}%
            </p>
            <p className="text-sm text-gray-400">Taux de succès</p>
          </div>
        </div>
      </div>

      {/* Vos leads */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-gray-100 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-gold-400" />
            Vos leads
          </h2>
          <Link
            to="/dashboard/leads"
            className="text-sm text-gold-400 hover:text-gold-300 font-medium"
          >
            Voir tout
          </Link>
        </div>
        {leadsForSection.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun lead. Ajoutez des leads depuis la page Leads pour les inclure dans vos campagnes.</p>
        ) : (
          <div className="overflow-x-auto table-responsive">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700/50">
                  <th className="pb-2 pr-4">Nom</th>
                  <th className="pb-2 pr-4">Téléphone</th>
                  <th className="pb-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {leadsForSection.slice(0, 10).map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-700/30 last:border-0">
                    <td className="py-2 pr-4 text-gray-200">{lead.name || '—'}</td>
                    <td className="py-2 pr-4 text-gray-300">{lead.phone || '—'}</td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">
                        {lead.status === 'new' && 'Nouveau'}
                        {lead.status === 'qualified' && 'Qualifié'}
                        {lead.status === 'customer' && 'Client'}
                        {lead.status === 'contacted' && 'Contacté'}
                        {lead.status === 'negotiation' && 'Négociation'}
                        {lead.status === 'lost' && 'Perdu'}
                        {!['new','qualified','customer','contacted','negotiation','lost'].includes(lead.status) && (lead.status || '—')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leadsForSection.length > 10 && (
              <p className="text-gray-500 text-xs mt-2">{leadsForSection.length - 10} autre(s) lead(s) — <Link to="/dashboard/leads" className="text-gold-400 hover:underline">Voir tout</Link></p>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="input-with-icon max-w-md">
        <div className="pl-3 flex items-center justify-center flex-shrink-0 text-gray-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          placeholder="Rechercher une campagne..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Load error + Retry */}
      {loadError && (
        <div className="card p-6 text-center border-red-500/30 bg-red-500/10">
          <p className="text-red-300 mb-3">{loadError}</p>
          <button
            type="button"
            onClick={() => loadData()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      )}

      {/* Campaigns List */}
      {!loadError && filteredCampaigns.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gold-400/20 flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-gold-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-100 mb-2">Aucune campagne</h3>
          <p className="text-gray-400 mb-4">Créez votre première campagne pour envoyer des messages en masse</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            Créer une campagne
          </button>
        </div>
      ) : !loadError ? (
        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => {
            const canEdit = campaign.status !== 'sent' && campaign.status !== 'sending'
            const contactCount = campaign.recipients_count ?? campaign.total_recipients ?? 0
            return (
              <div key={campaign.id} className="card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-100">{campaign.name}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">{campaign.message}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {contactCount} contact{contactCount !== 1 ? 's' : ''}
                      </span>
                      {campaign.scheduled_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(campaign.scheduled_at).toLocaleString('fr-FR')}
                        </span>
                      )}
                      {campaign.sent_at && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          Envoyée le {new Date(campaign.sent_at).toLocaleString('fr-FR')}
                        </span>
                      )}
                    </div>
                    {/* Actions: modifier (brouillon/programmée), historique (toujours si destinataires) */}
                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-700/50">
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => openRecipientsModal(campaign)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-sm font-medium transition-colors"
                          >
                            <UserCheck className="w-4 h-4" />
                            Gérer les destinataires
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(campaign)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gold-500/20 text-gold-300 hover:bg-gold-500/30 text-sm font-medium transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleImportContacts(campaign.id)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-600/30 text-gray-300 hover:bg-gray-600/50 text-sm font-medium transition-colors"
                          >
                            <Users className="w-4 h-4" />
                            Importer contacts
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendCampaign(campaign.id)}
                            disabled={sendingCampaignId === campaign.id}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {sendingCampaignId === campaign.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            {sendingCampaignId === campaign.id ? 'Envoi en cours…' : 'Envoyer'}
                          </button>
                        </>
                      )}
                      {(contactCount > 0 || campaign.status === 'sent' || campaign.status === 'sending') && (
                        <button
                          type="button"
                          onClick={() => openHistoryModal(campaign)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-sm font-medium transition-colors"
                        >
                          <History className="w-4 h-4" />
                          Historique d'exécution
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors flex-shrink-0"
                    title="Supprimer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="relative z-10 card w-full max-w-lg max-h-[90vh] sm:max-h-[80vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
            <div className="flex-shrink-0 p-4 sm:p-6 border-b border-space-700">
              <h2 className="text-lg sm:text-xl font-display font-bold text-gray-100">
                {selectedCampaign ? 'Modifier la campagne' : 'Nouvelle campagne'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nom de la campagne *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="Ex: Promotion du mois"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Agent *
                </label>
                <select
                  value={form.agent_id}
                  onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Sélectionner un agent</option>
                  {(agents || []).filter(a => a.whatsapp_connected).map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
                {(agents || []).filter(a => a.whatsapp_connected).length === 0 && (
                  <p className="text-xs text-amber-400 mt-1">Aucun agent connecté à WhatsApp. Connectez un agent depuis la page Agents.</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Seuls les agents connectés à WhatsApp sont disponibles</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message *
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="input min-h-[150px]"
                  placeholder="Votre message ici... Utilisez {{nom}} pour le nom du contact."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Variables disponibles: {'{{nom}}'}, {'{{telephone}}'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Programmer l'envoi (optionnel)
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  className="input"
                />
              </div>
              </div>
              <div className="flex-shrink-0 p-4 sm:p-6 border-t border-space-700 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setSelectedCampaign(null)
                  }}
                  className="btn-secondary flex-1 sm:flex-none min-h-[44px] touch-target"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary flex-1 sm:flex-none min-h-[44px] touch-target">
                  {selectedCampaign ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gérer les destinataires (modal) */}
      {showRecipientsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="relative z-10 card w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl animate-fadeIn">
            <div className="flex-shrink-0 p-4 sm:p-6 border-b border-space-700">
              <h2 className="text-lg sm:text-xl font-display font-bold text-gray-100">
                Gérer les destinataires
              </h2>
              {recipientsCampaign && (
                <p className="text-sm text-gray-400 mt-1">{recipientsCampaign.campaign?.name}</p>
              )}
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
            {loadingRecipients ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gold-400" />
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-6 min-h-0">
                  {/* Destinataires actuels */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Destinataires ({recipientsList.length})
                    </h3>
                    <div className="space-y-1 max-h-32 overflow-y-auto rounded-lg border border-gray-700/50 p-2">
                      {recipientsList.length === 0 ? (
                        <p className="text-gray-500 text-sm py-2">Aucun destinataire. Ajoutez des leads ou importez depuis les conversations.</p>
                      ) : (
                        recipientsList.map((r) => (
                          <div key={r.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-800/50">
                            <span className="text-gray-200 text-sm truncate">{r.contact_name || r.contact_number || '—'}</span>
                            <span className="text-gray-500 text-xs ml-2 truncate max-w-[120px]">{r.contact_number}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveRecipient(r.id)}
                              className="p-1 text-gray-400 hover:text-red-400 rounded"
                              title="Retirer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!recipientsCampaign?.id) return
                        try {
                          await handleImportContacts(recipientsCampaign.id)
                          const campRes = await api.get(`/campaigns/${recipientsCampaign.id}`)
                          setRecipientsList(campRes.data.recipients || [])
                          setRecipientsCampaign(prev => prev ? { ...prev, campaign: campRes.data.campaign } : null)
                        } catch (_) {}
                      }}
                      className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                    >
                      + Importer depuis les conversations
                    </button>
                  </div>

                  {/* Sélectionner des leads */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Ajouter depuis les leads
                    </h3>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-700/50 p-2 space-y-1">
                      {leadsList.filter(l => l.phone).length === 0 ? (
                        <p className="text-gray-500 text-sm py-2">Aucun lead avec téléphone. Ajoutez des leads depuis la page Leads.</p>
                      ) : (
                        leadsList.filter(l => l.phone).map((lead) => (
                          <label key={lead.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-800/50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.has(lead.id)}
                              onChange={() => toggleLeadSelection(lead.id)}
                              className="rounded border-gray-600 text-gold-500 focus:ring-gold-500/50"
                            />
                            <span className="text-gray-200 text-sm truncate flex-1">{lead.name || lead.phone || '—'}</span>
                            <span className="text-gray-500 text-xs truncate max-w-[100px]">{lead.phone}</span>
                          </label>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddFromLeads}
                      disabled={selectedLeadIds.size === 0}
                      className="mt-2 btn-primary text-sm py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Ajouter la sélection ({selectedLeadIds.size})
                    </button>
                  </div>
                </div>
                <div className="flex-shrink-0 pt-4 border-t border-gray-700/50 flex flex-col-reverse sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeRecipientsModal}
                    className="btn-secondary flex-1 sm:flex-none min-h-[44px] touch-target mt-3 sm:mt-0"
                  >
                    Fermer
                  </button>
                </div>
              </>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Historique d'exécution */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative z-10 bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-fadeIn">
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                Historique d'exécution
                {historyData.campaign && (
                  <span className="text-gray-400 font-normal">— {historyData.campaign.name}</span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1 min-h-0">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                </div>
              ) : historyData.recipients.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Aucun destinataire pour cette campagne.</p>
              ) : (
                <div className="overflow-x-auto table-responsive">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-700">
                        <th className="pb-2 pr-4">Destinataire</th>
                        <th className="pb-2 pr-4">Téléphone</th>
                        <th className="pb-2 pr-4">Statut</th>
                        <th className="pb-2 pr-4">Envoyé le</th>
                        <th className="pb-2">Erreur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.recipients.map((r) => (
                        <tr key={r.id} className="border-b border-gray-700/50">
                          <td className="py-2 pr-4 text-white">{r.contact_name || '—'}</td>
                          <td className="py-2 pr-4 text-gray-300">{r.contact_number || '—'}</td>
                          <td className="py-2 pr-4">
                            {r.status === 'sent' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Envoyé
                              </span>
                            )}
                            {r.status === 'failed' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs">
                                <XCircle className="w-3.5 h-3.5" /> Échec
                              </span>
                            )}
                            {r.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs">
                                <Clock className="w-3.5 h-3.5" /> En attente
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-gray-400">
                            {r.sent_at ? new Date(r.sent_at).toLocaleString('fr-FR') : '—'}
                          </td>
                          <td className="py-2 text-gray-400 text-xs max-w-[200px] truncate" title={r.error_message}>
                            {r.status === 'failed' && r.error_message ? r.error_message : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 p-4 border-t border-gray-700 flex flex-col-reverse sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="btn-secondary flex-1 sm:flex-none min-h-[44px] touch-target"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
