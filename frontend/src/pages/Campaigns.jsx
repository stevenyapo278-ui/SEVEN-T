import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  RefreshCw,
  Wand2,
  Sparkles,
  Layout
} from 'lucide-react'
import toast from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import ImportedContactsPicker from '../components/ImportedContactsPicker'
import { registerLocale } from 'react-datepicker'
import fr from 'date-fns/locale/fr'
import CampaignPreviewModal from '../components/CampaignPreviewModal'
registerLocale('fr', fr)

export default function Campaigns() {
  const { isDark } = useTheme()
  const { showConfirm } = useConfirm()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [stats, setStats] = useState(null)
  const [agents, setAgents] = useState([])
  const [syncingContacts, setSyncingContacts] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showRecipientsModal, setShowRecipientsModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [recipientsCampaign, setRecipientsCampaign] = useState(null)
  const [recipientsList, setRecipientsList] = useState([])
  const [leadsList, setLeadsList] = useState([])
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set())
  const [leadsForSection, setLeadsForSection] = useState([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [sendingCampaignId, setSendingCampaignId] = useState(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [campaignToPreview, setCampaignToPreview] = useState(null)
  const [rewritingMessage, setRewritingMessage] = useState(false)

  const CAMPAIGN_TEMPLATES = [
    { name: 'Relance Inactifs', message: 'Bonjour {{nom}}, cela fait un moment ! Nous avons des nouveautés qui pourraient vous intéresser. À bientôt !' },
    { name: 'Offre Flash', message: 'Salut {{nom}} ! Profitez de -20% sur tout le store aujourd\'hui seulement avec le code FLASH20. 🚀' },
    { name: 'Bienvenue', message: 'Bienvenue chez nous {{nom}} ! Ravi de vous compter parmi nos membres. N\'hésitez pas si vous avez des questions.' },
  ]
  useLockBodyScroll(showModal || showRecipientsModal || showHistoryModal)
  const [importedPickerOpen, setImportedPickerOpen] = useState(false)
  const [historyData, setHistoryData] = useState({ campaign: null, recipients: [] })
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

  const handleSyncWhatsappContacts = async () => {
    const connectedAgents = (agents || []).filter(a => a.whatsapp_connected)
    if (connectedAgents.length === 0) {
      toast.error('Aucun agent WhatsApp connecté')
      return
    }

    setSyncingContacts(true)
    const loadingToastId = toast.loading('Synchronisation des contacts WhatsApp…')
    try {
      const results = await Promise.allSettled(
        connectedAgents.map(agent => api.post(`/whatsapp/sync/${agent.id}`))
      )
      const okCount = results.filter(r => r.status === 'fulfilled').length
      const pendingCount = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value?.data)
        .filter(d => d?.pending).length

      toast.dismiss(loadingToastId)
      if (pendingCount > 0) {
        toast.success(`Sync lancée (${okCount}/${connectedAgents.length}) • Certaines connexions sont encore en cours`)
      } else {
        toast.success(`Contacts WhatsApp mis à jour (${okCount}/${connectedAgents.length})`)
      }
      loadData()
    } catch (error) {
      toast.dismiss(loadingToastId)
      toast.error(error.response?.data?.error || 'Erreur lors de la synchronisation')
    } finally {
      setSyncingContacts(false)
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

  const handleAddImportedContacts = async (contacts) => {
    if (!recipientsCampaign?.id) return
    const list = Array.isArray(contacts) ? contacts : []
    if (list.length === 0) {
      toast.error('Sélectionnez au moins un contact importé')
      return
    }
    try {
      const existingNorm = new Set((recipientsList || []).map(r => String(r.contact_number || '').replace(/\D/g, '')))
      const payload = list
        .filter(c => c?.contact_number)
        .map(c => ({ number: c.contact_number, name: c.contact_name || null }))
        .filter(p => {
          const norm = String(p.number || '').replace(/\D/g, '')
          if (!norm) return false
          if (existingNorm.has(norm)) return false
          existingNorm.add(norm)
          return true
        })
      if (payload.length === 0) {
        toast.success('Aucun nouveau contact ajouté (déjà présents)')
        return
      }
      await api.post(`/campaigns/${recipientsCampaign.id}/recipients`, { recipients: payload })
      toast.success(`${payload.length} contact(s) ajouté(s)`)
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

  const handleSendCampaign = (campaign) => {
    setCampaignToPreview(campaign)
    setShowPreviewModal(true)
  }

  const handleConfirmSend = async (campaignId) => {
    setShowPreviewModal(false)
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
      toast.error(error.response?.data?.error || "Erreur lors de l'envoi")
    } finally {
      setSendingCampaignId(null)
      setCampaignToPreview(null)
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

  const handleAiRewrite = async () => {
    if (!form.message.trim()) return
    setRewritingMessage(true)
    try {
      // Simulate AI rewrite for UI demonstration
      // In a real app, this would call an API like /ai/rewrite
      await new Promise(resolve => setTimeout(resolve, 1500))
      const improved = form.message + "\n\n(Optimisé par l'IA pour plus d'impact ! ✨)"
      setForm(prev => ({ ...prev, message: improved }))
      toast.success('Message amélioré !')
    } catch (e) {
      toast.error('Erreur lors de l\'amélioration')
    } finally {
      setRewritingMessage(false)
    }
  }

  const applyTemplate = (tpl) => {
    setForm(prev => ({ ...prev, message: tpl.message }))
    toast.success('Modèle appliqué')
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
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0 pb-12">
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
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2 min-w-0">
                <div className="p-2 bg-blue-500/10 rounded-xl flex-shrink-0">
                  <Send className="w-6 h-6 text-blue-400" />
                </div>
                <h1 className={`text-2xl sm:text-3xl font-display font-bold break-words ${isDark ? 'text-white' : 'text-gray-900'}`}>Campagnes</h1>
              </div>
              <p className={`text-base sm:text-lg break-words ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                Envoyez des messages en masse à vos contacts
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0 relative z-20">
              <button
                type="button"
                onClick={() => loadData()}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 min-h-[44px] ${
                  isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualiser</span>
              </button>
              <button
                type="button"
                onClick={handleSyncWhatsappContacts}
                disabled={syncingContacts}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed ${
                  isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="Récupérer et mettre à jour la liste des contacts WhatsApp"
              >
                <Users className="w-4 h-4" />
                <RefreshCw className={`w-4 h-4 ${syncingContacts ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{syncingContacts ? 'Sync…' : 'Mettre à jour contacts'}</span>
              </button>
              <button
                onClick={() => {
                  setSelectedCampaign(null)
                  setForm({ name: '', message: '', agent_id: '', scheduled_at: '' })
                  setShowModal(true)
                }}
                className="btn-primary flex items-center gap-2 min-h-[44px]"
              >
                <Plus className="w-5 h-5" />
                <span>Nouvelle campagne</span>
              </button>
            </div>
          </div>

          {/* Stats grid within hero */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            <div className={`rounded-xl p-4 border transition-all duration-300 ${isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold-400/10 rounded-xl flex-shrink-0">
                  <Target className="w-5 h-5 text-gold-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats?.total || 0}</p>
                  <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Campagnes</p>
                </div>
              </div>
            </div>
            <div className={`rounded-xl p-4 border transition-all duration-300 ${isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl flex-shrink-0">
                  <Send className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats?.sent || 0}</p>
                  <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Envoyées</p>
                </div>
              </div>
            </div>
            <div className={`rounded-xl p-4 border transition-all duration-300 ${isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats?.totalMessages ?? stats?.totalSent ?? 0}</p>
                  <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Messages</p>
                </div>
              </div>
            </div>
            <div className={`rounded-xl p-4 border transition-all duration-300 ${isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl flex-shrink-0">
                  <BarChart2 className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {stats?.totalRecipients > 0 && (stats?.totalMessages ?? stats?.totalSent ?? 0) >= 0
                      ? Math.round(((stats.totalMessages ?? stats.totalSent ?? 0) / stats.totalRecipients) * 100)
                      : 0}%
                  </p>
                  <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Taux de succès</p>
                </div>
              </div>
            </div>
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
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-300 max-w-md ${
        isDark ? 'bg-space-800/50 border-space-700/50 focus-within:border-space-600' : 'bg-white border-gray-200 focus-within:border-gray-300 shadow-sm'
      }`}>
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher une campagne..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none p-0 focus:ring-0 w-full text-base sm:text-lg placeholder:text-gray-500"
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
                            onClick={() => handleSendCampaign(campaign)}
                            disabled={sendingCampaignId === campaign.id}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {sendingCampaignId === campaign.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Eye className="w-4 h-4" />
                                <span>Aperçu & Envoyer</span>
                              </>
                            )}
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
      {showModal && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => { setShowModal(false); setSelectedCampaign(null); }}
          style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
        >
          <div 
            className="relative z-10 w-full max-w-lg max-h-[92dvh] sm:max-h-[85vh] flex flex-col bg-[#0B0F1A] border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] animate-fadeIn overflow-hidden" 
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
                <div>
                  <h2 className="text-2xl font-display font-bold text-gray-100">
                    {selectedCampaign ? 'Modifier la campagne' : 'Nouvelle campagne'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Diffusez votre message à grande échelle</p>
                </div>
                <button 
                  type="button"
                  onClick={() => { setShowModal(false); setSelectedCampaign(null); }}
                  className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/5"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 space-y-6 overscroll-contain custom-scrollbar">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    Nom de la campagne *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-dark w-full py-4 px-5 text-base rounded-2xl"
                    placeholder="Ex: Promotion du mois"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    Agent expéditeur *
                  </label>
                  <div className="relative">
                    <select
                      value={form.agent_id}
                      onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
                      className="input-dark w-full py-4 px-5 text-base rounded-2xl appearance-none"
                      required
                    >
                      <option value="">Sélectionner un agent</option>
                      {(agents || []).filter(a => a.whatsapp_connected).map((agent) => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                    <MoreHorizontal className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                  </div>
                  {(agents || []).filter(a => a.whatsapp_connected).length === 0 && (
                    <p className="text-xs text-amber-400 mt-2 bg-amber-400/10 p-3 rounded-xl border border-amber-400/20">Aucun agent connecté à WhatsApp. Connectez un agent depuis la page Agents.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    Message à diffuser *
                  </label>
                  
                  {/* Templates Quick Select */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {CAMPAIGN_TEMPLATES.map(tpl => (
                      <button
                        key={tpl.name}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
                      >
                        <Layout className="w-3 h-3" />
                        {tpl.name}
                      </button>
                    ))}
                  </div>

                  <div className="relative group">
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="input-dark w-full min-h-[160px] py-4 px-5 text-base rounded-2xl resize-none pr-12"
                      placeholder="Votre message ici... Utilisez {{nom}} pour personnaliser."
                      required
                    />
                    <button
                      type="button"
                      onClick={handleAiRewrite}
                      disabled={rewritingMessage || !form.message.trim()}
                      className={`absolute top-4 right-4 p-2 rounded-xl border transition-all ${
                        rewritingMessage 
                          ? 'animate-pulse bg-gold-400/20 border-gold-400/40 text-gold-400' 
                          : 'bg-white/5 border-white/10 text-gold-400 hover:bg-gold-400 hover:text-black hover:border-gold-400'
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                      title="Améliorer avec l'IA (Baguette Magique)"
                    >
                      {rewritingMessage ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    </button>
                    <div className="absolute bottom-3 right-3 flex gap-2">
                      <span className="text-[10px] bg-black/40 border border-white/10 px-2 py-1 rounded-lg text-blue-400 font-mono">{'{{nom}}'}</span>
                      <span className="text-[10px] bg-black/40 border border-white/10 px-2 py-1 rounded-lg text-blue-400 font-mono">{'{{telephone}}'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    Programmer l'envoi (optionnel)
                  </label>
                  <DatePicker
                    selected={form.scheduled_at ? new Date(form.scheduled_at) : null}
                    onChange={(date) => setForm({ ...form, scheduled_at: date ? date.toISOString() : '' })}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    timeCaption="Heure"
                    dateFormat="dd/MM/yyyy HH:mm"
                    locale="fr"
                    placeholderText="Choisir une date et heure"
                    className="input-dark w-full py-4 px-5 text-base rounded-2xl"
                  />
                </div>
              </div>

              <div className="flex-shrink-0 p-6 sm:p-8 pt-4 border-t border-white/5 bg-black/20 flex flex-col-reverse sm:flex-row gap-3" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setSelectedCampaign(null)
                  }}
                  className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all min-h-[48px]"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-4 px-6 rounded-2xl font-syne font-black italic bg-white text-black hover:bg-gold-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl min-h-[48px]"
                >
                  {selectedCampaign ? 'Enregistrer les modifications' : 'Créer la campagne'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Gérer les destinataires (modal) */}
      {showRecipientsModal && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={closeRecipientsModal}
          style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
        >
          <div 
            className="relative z-10 w-full max-w-2xl max-h-[92dvh] sm:max-h-[85vh] flex flex-col bg-[#0B0F1A] border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] animate-fadeIn overflow-hidden" 
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
                    Gérer les destinataires
                  </h2>
                  {recipientsCampaign && (
                    <p className="text-sm text-gray-500 mt-1 truncate">{recipientsCampaign.campaign?.name}</p>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={closeRecipientsModal}
                  className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/5"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {loadingRecipients ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12">
                  <Loader2 className="w-10 h-10 animate-spin text-gold-400 mb-4" />
                  <p className="text-gray-400 animate-pulse font-bold tracking-widest uppercase text-xs">Chargement en cours...</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 space-y-8 custom-scrollbar overscroll-contain">
                  {/* Destinataires actuels */}
                  <section>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2 ml-1">
                      <Users className="w-4 h-4" />
                      Destinataires actuels ({recipientsList.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[25vh] overflow-y-auto rounded-3xl border border-white/5 p-4 bg-black/40 shadow-inner custom-scrollbar">
                      {recipientsList.length === 0 ? (
                        <div className="col-span-full text-center py-8">
                          <p className="text-gray-500 text-sm font-medium">Aucun destinataire pour le moment.</p>
                          <p className="text-[10px] font-black text-gray-700 mt-2 uppercase tracking-widest">Utilisez les leads ou importez des contacts</p>
                        </div>
                      ) : (
                        recipientsList.map((r) => (
                          <div key={r.id} className="flex items-center justify-between py-3 px-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-gold-400/30 transition-all hover:bg-white/[0.04]">
                            <div className="min-w-0 flex-1">
                              <p className="text-gray-200 text-sm font-bold truncate">{r.contact_name || r.contact_number || '—'}</p>
                              <p className="text-gray-500 text-[10px] font-black font-mono truncate">{r.contact_number}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveRecipient(r.id)}
                              className="p-2 text-gray-500 hover:text-red-500 rounded-xl hover:bg-red-500/10 transition-all ml-2"
                              aria-label="Retirer"
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
                      className="mt-4 w-full sm:w-auto h-12 px-6 rounded-xl text-xs font-black uppercase tracking-widest text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500 transition-all border border-blue-500/20 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Importer des conversations récentes
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportedPickerOpen(true)}
                      className="mt-3 w-full sm:w-auto h-12 px-6 rounded-xl text-xs font-black uppercase tracking-widest text-gold-300 hover:text-black bg-gold-400/10 hover:bg-gold-400 transition-all border border-gold-400/20 flex items-center justify-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      Ajouter des contacts importés (sélection)
                    </button>
                  </section>

                  {/* Sélectionner des leads */}
                  <section>
                    <div className="flex items-center justify-between mb-4 ml-1">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Ajouter depuis mes leads
                      </h3>
                      {selectedLeadIds.size > 0 && (
                        <button 
                          onClick={() => setSelectedLeadIds(new Set())}
                          className="text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest"
                        >
                          Désélectionner tout
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[35vh] overflow-y-auto rounded-3xl border border-white/5 p-4 bg-black/40 shadow-inner custom-scrollbar overscroll-contain">
                      {leadsList.filter(l => l.phone).length === 0 ? (
                        <div className="col-span-full text-center py-10">
                          <p className="text-gray-500 text-sm font-medium">Aucun lead avec numéro de téléphone.</p>
                        </div>
                      ) : (
                        leadsList.filter(l => l.phone).map((lead) => (
                          <label key={lead.id} className={`flex items-center gap-4 py-3 px-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                            selectedLeadIds.has(lead.id) 
                              ? 'bg-gold-400 text-black border-gold-400' 
                              : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                          }`}>
                            <div className="relative flex items-center justify-center z-10">
                              <input
                                type="checkbox"
                                checked={selectedLeadIds.has(lead.id)}
                                onChange={() => toggleLeadSelection(lead.id)}
                                className={`w-5 h-5 rounded-lg border-2 transition-colors ${
                                  selectedLeadIds.has(lead.id) 
                                    ? 'bg-black border-black text-gold-400' 
                                    : 'bg-transparent border-white/20'
                                }`}
                              />
                            </div>
                            <div className="min-w-0 flex-1 z-10">
                              <p className={`text-sm font-bold truncate ${selectedLeadIds.has(lead.id) ? 'text-black' : 'text-gray-100'}`}>{lead.name || 'Inconnu'}</p>
                              <p className={`text-[10px] font-black font-mono truncate ${selectedLeadIds.has(lead.id) ? 'text-black/60' : 'text-gray-500'}`}>{lead.phone}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider z-10 ${
                              selectedLeadIds.has(lead.id) 
                                ? 'bg-black/10 text-black/80' 
                                : lead.status === 'qualified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-gray-400'
                            }`}>
                              {lead.status || 'new'}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={handleAddFromLeads}
                        disabled={selectedLeadIds.size === 0}
                        className="w-full h-14 rounded-2xl font-syne font-black italic shadow-xl bg-white text-black hover:bg-gold-400 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                      >
                        <UserCheck className="w-5 h-5" />
                        <span>Ajouter {selectedLeadIds.size > 0 ? `${selectedLeadIds.size} contact(s)` : 'les contacts'}</span>
                      </button>
                    </div>
                  </section>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 p-6 sm:p-8 pt-4 border-t border-white/5 bg-black/20" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
              <button
                type="button"
                onClick={closeRecipientsModal}
                className="w-full h-14 rounded-2xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all text-sm uppercase tracking-widest border border-white/5"
              >
                Terminer la gestion
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ImportedContactsPicker
        open={importedPickerOpen}
        onClose={() => setImportedPickerOpen(false)}
        agentId={recipientsCampaign?.campaign?.agent_id || recipientsCampaign?.campaign?.agentId || ''}
        title="Contacts importés"
        mode="multi"
        onSelect={(contacts) => {
          setImportedPickerOpen(false)
          handleAddImportedContacts(contacts)
        }}
      />

      {/* Modal Historique d'exécution */}
      {showHistoryModal && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowHistoryModal(false)}
          style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
        >
          <div 
            className="relative z-10 w-full max-w-4xl max-h-[92dvh] sm:max-h-[85vh] flex flex-col bg-[#0B0F1A] border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] animate-fadeIn overflow-hidden" 
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
                  <h3 className="text-2xl font-display font-bold text-gray-100 flex items-center gap-3 truncate">
                    <History className="w-7 h-7 text-blue-400" />
                    Rapport d'exécution
                  </h3>
                  {historyData.campaign && (
                    <p className="text-sm text-gray-500 truncate mt-1">{historyData.campaign.name}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/5"
                  aria-label="Fermer"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 min-h-0 custom-scrollbar overscroll-contain">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-400 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 animate-pulse">Chargement du rapport...</p>
                </div>
              ) : historyData.recipients.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.02] rounded-[2rem] border-2 border-dashed border-white/5">
                  <History className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Aucun destinataire historisé.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[2rem] border border-white/5 bg-black/40 shadow-inner">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="text-gray-500 bg-white/[0.02] border-b border-white/5">
                        <th className="p-5 font-black uppercase tracking-widest text-[10px]">Destinataire</th>
                        <th className="p-5 font-black uppercase tracking-widest text-[10px]">Téléphone</th>
                        <th className="p-5 font-black uppercase tracking-widest text-[10px]">Statut</th>
                        <th className="p-5 font-black uppercase tracking-widest text-[10px]">Envoyé</th>
                        <th className="p-5 font-black uppercase tracking-widest text-[10px]">Erreur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {historyData.recipients.map((r) => (
                        <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="p-5 font-bold text-gray-200">{r.contact_name || '—'}</td>
                          <td className="p-5 text-gray-500 font-mono text-[10px] font-black">{r.contact_number || '—'}</td>
                          <td className="p-5">
                            {r.status === 'sent' && (
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Succès
                              </span>
                            )}
                            {r.status === 'failed' && (
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                                <XCircle className="w-3.5 h-3.5" /> Échec
                              </span>
                            )}
                            {r.status === 'pending' && (
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                                <Clock className="w-3.5 h-3.5" /> Attente
                              </span>
                            )}
                          </td>
                          <td className="p-5 text-gray-400 text-[10px] font-bold">
                            {r.sent_at ? new Date(r.sent_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'}
                          </td>
                          <td className="p-5 text-gray-500 text-[10px] font-medium max-w-[180px]">
                            {r.status === 'failed' && r.error_message ? (
                              <span className="text-red-400/80 leading-relaxed italic">{r.error_message}</span>
                            ) : (
                              <span className="opacity-20 italic">Aucune</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 p-6 sm:p-8 pt-4 border-t border-white/5 bg-black/20" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-full h-14 rounded-2xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all text-sm uppercase tracking-widest border border-white/5"
              >
                Fermer le rapport
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <CampaignPreviewModal
        isOpen={showPreviewModal}
        onClose={() => { setShowPreviewModal(false); setCampaignToPreview(null); }}
        onConfirm={handleConfirmSend}
        campaign={campaignToPreview}
        isSending={!!sendingCampaignId}
      />
    </div>
  )
}
