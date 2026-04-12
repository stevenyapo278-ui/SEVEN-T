import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { Link, useNavigate } from 'react-router-dom'
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
  Search,
  MoreHorizontal,
  MessageSquare,
  Target,
  Calendar,
  BarChart2,
  UserPlus,
  UserCheck,
  History,
  RefreshCw,
  Wand2,
  Layout,
  Check,
  Bot,
  ArrowRight,
  AlertCircle,
  ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import ImportedContactsPicker from '../components/ImportedContactsPicker'
import { registerLocale } from 'react-datepicker'
import fr from 'date-fns/locale/fr'
import CampaignPreviewModal from '../components/CampaignPreviewModal'
import { useModuleAvailability } from '../hooks/useModuleAvailability'

registerLocale('fr', fr)

export default function Campaigns() {
  const { isDark } = useTheme()
  const { showConfirm } = useConfirm()
  const navigate = useNavigate()
  const { campaigns: campaignsModuleEnabled, isAdmin } = useModuleAvailability()

  useEffect(() => {
    if (campaignsModuleEnabled === false && !isAdmin) {
      navigate('/dashboard', { replace: true })
    }
  }, [campaignsModuleEnabled, isAdmin, navigate])

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [stats, setStats] = useState(null)
  const [agents, setAgents] = useState([])
  const [syncingContacts, setSyncingContacts] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(null)
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
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [leadSearchInModal, setLeadSearchInModal] = useState('')
  const [importedPickerOpen, setImportedPickerOpen] = useState(false)
  const [historyData, setHistoryData] = useState({ campaign: null, recipients: [] })

  const [form, setForm] = useState({
    name: '',
    message: '',
    agent_id: '',
    scheduled_at: '',
    recurrence_type: 'none',
    recurrence_interval: 1,
    recurrence_days: '',
    recipients: []
  })

  useLockBodyScroll(showModal || showRecipientsModal || showHistoryModal)

  const CAMPAIGN_TEMPLATES = [
    { name: 'Relance Inactifs', message: 'Bonjour {{nom}}, cela fait un moment ! Nous avons des nouveautés qui pourraient vous intéresser. À bientôt !' },
    { name: 'Offre Flash', message: 'Salut {{nom}} ! Profitez de -20% sur tout le store aujourd\'hui seulement avec le code FLASH20. 🚀' },
    { name: 'Bienvenue', message: 'Bienvenue chez nous {{nom}} ! Ravi de vous compter parmi nos membres. N\'hésitez pas si vous avez des questions.' },
  ]

  const RECURRENCE_OPTIONS = [
    { value: 'none', label: 'Pas de répétition' },
    { value: 'daily', label: 'Quotidienne' },
    { value: 'weekly', label: 'Hebdomadaire' },
    { value: 'monthly', label: 'Mensuelle' }
  ]

  const loadData = useCallback(async () => {
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
      setLoadError(error.message || 'Erreur de chargement')
      toast.error('Erreur lors du chargement des campagnes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCampaigns.length && filteredCampaigns.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredCampaigns.map(c => c.id)))
    }
  }

  const handleDeleteSelected = async () => {
    const count = selectedIds.size
    if (count === 0) return
    const ok = await showConfirm({
      title: `Supprimer ${count} campagne(s) ?`,
      message: `Êtes-vous sûr de vouloir supprimer ces ${count} campagnes ? L'action est irréversible.`,
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    setBulkLoading(true)
    try {
      await api.delete('/campaigns/bulk/delete', { data: { ids: Array.from(selectedIds) } })
      toast.success(`${count} campagne(s) supprimée(s)`)
      setSelectedIds(new Set())
      loadData()
    } catch { toast.error('Erreur lors de la suppression') }
    finally { setBulkLoading(false) }
  }

  const handleSyncWhatsappContacts = async () => {
    const connectedAgents = (agents || []).filter(a => a.whatsapp_connected)
    if (connectedAgents.length === 0) {
      toast.error('Aucun agent WhatsApp connecté')
      return
    }
    setSyncingContacts(true)
    try {
      await Promise.allSettled(connectedAgents.map(agent => api.post(`/whatsapp/sync/${agent.id}`)))
      toast.success('Synchronisation lancée')
      loadData()
    } catch { toast.error('Erreur de synchronisation') }
    finally { setSyncingContacts(false) }
  }

  const openRecipientsModal = async (campaign) => {
    if (campaign.status === 'sent' || campaign.status === 'sending') return
    setLoadingRecipients(true)
    setShowRecipientsModal(true)
    try {
      const [campRes, leadsRes] = await Promise.all([
        api.get(`/campaigns/${campaign.id}`),
        api.get('/leads')
      ])
      setRecipientsCampaign({ campaign: campRes.data.campaign, id: campaign.id })
      setRecipientsList(campRes.data.recipients || [])
      setLeadsList(leadsRes.data?.leads || [])
    } catch { toast.error('Erreur de chargement') }
    finally { setLoadingRecipients(false) }
  }

  const closeRecipientsModal = () => {
    setShowRecipientsModal(false)
    setRecipientsCampaign(null)
    loadData()
  }

  const handleRemoveRecipient = async (recipientId) => {
    if (!recipientsCampaign?.id) return
    try {
      await api.delete(`/campaigns/${recipientsCampaign.id}/recipients/${recipientId}`)
      setRecipientsList(prev => prev.filter(r => r.id !== recipientId))
      toast.success('Retiré')
      loadData()
    } catch { toast.error('Erreur') }
  }

  const handleAddFromLeads = async () => {
    if (!recipientsCampaign?.id || selectedLeadIds.size === 0) return
    try {
      await api.post(`/campaigns/${recipientsCampaign.id}/recipients/from-leads`, { lead_ids: Array.from(selectedLeadIds) })
      toast.success('Leads ajoutés')
      setSelectedLeadIds(new Set())
      const campRes = await api.get(`/campaigns/${recipientsCampaign.id}`)
      setRecipientsList(campRes.data.recipients || [])
      loadData()
    } catch { toast.error('Erreur') }
  }

  const handleAddImportedContacts = async (contacts) => {
    if (!recipientsCampaign?.id || contacts.length === 0) return
    try {
      const payload = contacts.map(c => ({ number: c.jid || c.number, name: c.name || '' }))
      await api.post(`/campaigns/${recipientsCampaign.id}/recipients`, { recipients: payload })
      toast.success('Contacts ajoutés')
      const campRes = await api.get(`/campaigns/${recipientsCampaign.id}`)
      setRecipientsList(campRes.data.recipients || [])
      loadData()
    } catch { toast.error('Erreur') }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.message.trim() || !form.agent_id) return
    try {
      if (selectedCampaign) await api.put(`/campaigns/${selectedCampaign.id}`, form)
      else await api.post('/campaigns', form)
      setShowModal(false)
      loadData()
    } catch { toast.error('Erreur de sauvegarde') }
  }

  const handleRelaunch = async (campaignId) => {
    try {
      const res = await api.post(`/campaigns/${campaignId}/relaunch`)
      openEditModal(res.data.campaign)
    } catch { toast.error('Erreur de relance') }
  }

  const handleSendCampaign = (campaign) => {
    setCampaignToPreview(campaign)
    setShowPreviewModal(true)
  }

  const handleConfirmSend = async (campaignId) => {
    setShowPreviewModal(false)
    setSendingCampaignId(campaignId)
    try {
      await api.post(`/campaigns/${campaignId}/send`)
      toast.success('Campagne envoyée')
      loadData()
    } catch { toast.error("Erreur d'envoi") }
    finally { setSendingCampaignId(null) }
  }

  const handleDelete = async (campaignId) => {
    const ok = await showConfirm({
      title: 'Supprimer',
      message: 'Supprimer cette campagne ?',
      variant: 'danger'
    })
    if (ok) {
      try {
        await api.delete(`/campaigns/${campaignId}`)
        toast.success('Supprimée')
        loadData()
      } catch { toast.error('Erreur') }
    }
  }

  const openEditModal = (campaign) => {
    setSelectedCampaign(campaign)
    setForm({
      name: campaign.name || '',
      message: campaign.message || '',
      agent_id: campaign.agent_id || '',
      scheduled_at: campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : '',
      recurrence_type: campaign.recurrence_type || 'none',
      recurrence_interval: campaign.recurrence_interval || 1,
      recurrence_days: campaign.recurrence_days || '',
      recipients: campaign.recipients || []
    })
    setShowModal(true)
  }

  const handleAiRewrite = async () => {
    if (!form.message.trim()) return
    setRewritingMessage(true)
    try {
      const res = await api.post('/agents/ai-rewrite', { 
        message: form.message,
        context: 'marketing campagne WhatsApp'
      })
      if (res.data?.improved) {
        setForm(prev => ({ ...prev, message: res.data.improved }))
        toast.success('Message optimisé ✨')
      }
    } catch (error) {
      console.error('AI Rewrite Error:', error)
      const details = error.response?.data?.details || error.message
      toast.error(`Échec : ${details}`)
    } finally {
      setRewritingMessage(false)
    }
  }

  const applyTemplate = (tpl) => setForm(prev => ({ ...prev, message: tpl.message }))

  const openHistoryModal = async (campaign) => {
    setShowHistoryModal(true)
    setLoadingHistory(true)
    try {
      const res = await api.get(`/campaigns/${campaign.id}`)
      setHistoryData({ campaign: res.data.campaign, recipients: res.data.recipients || [] })
    } catch { toast.error('Erreur historique') }
    finally { setLoadingHistory(false) }
  }

  const getStatusBadge = (status) => {
    const styles = {
      draft: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Brouillon' },
      scheduled: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Programmée' },
      sending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Envoi...' },
      sent: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Envoyée' },
      failed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Échec' }
    }
    const s = styles[status] || styles.draft
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.bg} ${s.text}`}>{s.label}</span>
  }

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  })

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gold-400" /></div>

  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 pb-12">
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
              <p className={`text-base sm:text-lg break-words ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Diffusez des messages personnalisés en masse via WhatsApp</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0 relative z-20">
              <button 
                type="button"
                onClick={() => { 
                  setForm({ name: '', message: '', agent_id: '', scheduled_at: '', recurrence_type: 'none', recurrence_interval: 1, recurrence_days: '', recipients: [] }); 
                  setSelectedCampaign(null); 
                  setShowModal(true); 
                }} 
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 min-h-[44px]"
              >
                <Plus className="w-5 h-5" aria-hidden />
                <span>Nouvelle campagne</span>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 min-w-0">
            <StatCard icon={Target} value={stats?.total || 0} label="Total" isDark={isDark} color="blue" />
            <StatCard icon={CheckCircle2} value={stats?.sent || 0} label="Envoyées" isDark={isDark} color="emerald" />
            <StatCard icon={Calendar} value={stats?.scheduled || 0} label="Programmées" isDark={isDark} color="gold" />
            <StatCard icon={BarChart2} value={stats?.totalRecipients > 0 ? `${Math.round((stats.totalSent / stats.totalRecipients) * 100)}%` : '0%'} label="Succès" isDark={isDark} color="indigo" />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 min-w-0 mb-6">
        <div className={`flex-1 flex items-center gap-3 px-4 py-3 sm:py-3.5 rounded-2xl border transition-all duration-300 ${
          isDark ? 'bg-space-800/50 border-space-700/50 focus-within:border-space-600' : 'bg-white border-gray-200 focus-within:border-gray-300 shadow-sm'
        }`}>
          <button 
            onClick={toggleSelectAll} 
            className={`p-1.5 rounded-lg border transition-all flex items-center justify-center flex-shrink-0 ${
              selectedIds.size === filteredCampaigns.length && filteredCampaigns.length > 0
                ? 'bg-blue-500 border-blue-500 text-white'
                : isDark ? 'border-space-600 bg-space-800/50' : 'border-gray-200 bg-gray-50'
            }`}
            title="Tout sélectionner"
          >
            <Check className={`w-4 h-4 ${selectedIds.size === filteredCampaigns.length && filteredCampaigns.length > 0 ? 'opacity-100' : 'opacity-0'}`} />
          </button>
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input 
            type="text" 
            placeholder="Rechercher..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="bg-transparent border-none p-0 focus:ring-0 w-full text-base sm:text-lg placeholder:text-gray-500" 
          />
        </div>

        <select
          value={statusFilter || 'all'}
          onChange={(e) => setStatusFilter(e.target.value === 'all' ? null : e.target.value)}
          className={`px-4 py-3 sm:py-3.5 rounded-2xl border min-w-[160px] transition-all duration-300 [color-scheme:dark] ${
            isDark ? 'bg-space-800 focus:bg-space-700 border-space-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
          }`}
        >
          <option value="all">Tous les statuts</option>
          <option value="draft">Brouillons</option>
          <option value="scheduled">Programmées</option>
          <option value="sending">En cours</option>
          <option value="sent">Envoyées</option>
          <option value="paused">En pause</option>
          <option value="failed">Échecs</option>
        </select>
      </div>

      <div className="space-y-4">
        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className={`sticky top-4 z-40 flex items-center justify-between p-3 sm:p-4 mb-6 rounded-2xl shadow-2xl animate-slideUp border ${
            isDark ? 'bg-space-800 border-blue-500/50 text-white' : 'bg-white border-blue-200 text-gray-900'
          }`}>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500 text-white font-bold text-sm sm:text-base">
                {selectedIds.size}
              </div>
              <div className="hidden sm:block">
                <p className="font-bold text-sm">Campagnes sélectionnées</p>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Actions groupées</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                  isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                Désélectionner
              </button>
            </div>
          </div>
        )}

        {filteredCampaigns.length === 0 ? (
          <div className={`p-20 text-center rounded-[2rem] border-2 border-dashed ${isDark ? 'bg-space-800/20 border-space-700/50' : 'bg-gray-50 border-gray-200'}`}>
            <Send className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-20" />
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Aucune campagne trouvée</h3>
            <p className="text-gray-500">Commencez par créer votre première campagne de diffusion.</p>
          </div>
        ) : filteredCampaigns.map((c, index) => {
          const isSelected = selectedIds.has(c.id)
          return (
            <div 
              key={c.id} 
              className={`card p-3 sm:p-5 transition-all cursor-pointer group animate-fadeIn border-l-4 ${
                isSelected 
                  ? 'border-l-blue-500 bg-blue-500/5 border-blue-500/30' 
                  : 'hover:border-blue-500/10 hover:bg-space-800/80 border-l-transparent'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Selection Checkbox */}
                <div 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelect(c.id); }}
                  className="flex-shrink-0"
                >
                  <div className={`w-6 h-6 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : isDark ? 'border-space-600 bg-space-900/50 hover:border-space-500' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}>
                    {isSelected && <Check className="w-4 h-4" />}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-100 truncate group-hover:text-gold-400 transition-colors">
                        {c.name}
                      </h3>
                      {getStatusBadge(c.status)}
                    </div>
                  </div>
                  <p className={`text-xs sm:text-sm line-clamp-1 mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{c.message}</p>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] sm:text-xs text-gray-400 font-bold">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>{c.recipients_count ?? 0}</span>
                    </div>
                    {c.scheduled_at && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gold-400" />
                        <span>
                          {new Date(c.scheduled_at).toLocaleString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="truncate max-w-[120px]">{c.agent_name || 'Aucun agent'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                  {(c.status === 'sent' || c.status === 'failed') && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRelaunch(c.id); }} 
                      className="p-2 text-orange-400 hover:bg-orange-500/10 rounded-xl transition-all"
                      title="Relancer"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  {c.status !== 'sent' && c.status !== 'sending' && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); openRecipientsModal(c); }} 
                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                        title="Destinataires"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); openEditModal(c); }} 
                        className="p-2 text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all"
                        title="Modifier"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleSendCampaign(c); }} 
                        className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
                        title="Lancer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {c.status === 'sending' && (
                    <div className="p-2 text-indigo-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); openHistoryModal(c); }} 
                    className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    title="Historique"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} 
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 sm:hidden" />
              </div>
            </div>
          )
        })}
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setShowModal(false)}>
          <div className={`relative z-10 w-full max-w-2xl flex flex-col rounded-[2.5rem] shadow-2xl border transition-all duration-300 animate-in zoom-in-95 ${
            isDark ? 'bg-space-900 border-space-700' : 'bg-white border-gray-200'
          }`} onClick={e => e.stopPropagation()}>
            
            <div className={`p-8 border-b ${isDark ? 'border-space-800' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-2xl">
                    <Edit3 className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-display font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedCampaign ? 'Modifier la campagne' : 'Nouvelle campagne'}</h2>
                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Étape 1 : Configuration générale</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-space-800 text-gray-500 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-900'}`}>
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <form onSubmit={handleSubmit} id="campaign-form" className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Nom de la campagne</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Soldes d'Automne" 
                      value={form.name} 
                      onChange={e => setForm({...form, name: e.target.value})} 
                      className="input-premium w-full" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Agent WhatsApp</label>
                    <select 
                      value={form.agent_id} 
                      onChange={e => setForm({...form, agent_id: e.target.value})} 
                      className={`input-premium w-full appearance-none cursor-pointer ${isDark ? 'bg-space-800 text-white border-space-700' : 'bg-white text-gray-900 border-gray-200'}`} 
                      required
                    >
                      <option value="" className={isDark ? 'bg-space-900 text-gray-100' : ''}>Sélectionner un agent</option>
                      {agents.filter(a => a.whatsapp_connected).map(a => (
                        <option key={a.id} value={a.id} className={isDark ? 'bg-space-900 text-gray-100' : ''}>{a.name} ({a.phone})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Contenu du message</label>
                    <button type="button" onClick={handleAiRewrite} disabled={rewritingMessage || !form.message.trim()} className="flex items-center gap-1.5 text-xs font-bold text-gold-400 hover:text-gold-300 transition-colors disabled:opacity-30">
                      {rewritingMessage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                      Améliorer avec l'IA
                    </button>
                  </div>
                  <textarea 
                    placeholder="Votre message ici..." 
                    value={form.message} 
                    onChange={e => setForm({...form, message: e.target.value})} 
                    className="input-premium w-full min-h-[160px] resize-none" 
                    required 
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CAMPAIGN_TEMPLATES.map(tpl => (
                      <button key={tpl.name} type="button" onClick={() => applyTemplate(tpl)} className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase transition-all ${isDark ? 'bg-space-950 border-space-700 hover:border-blue-500 text-gray-500 hover:text-blue-400' : 'bg-gray-50 border-gray-200 hover:border-blue-500 text-gray-600 hover:text-blue-600'}`}>
                        {tpl.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-space-950/50 border-space-700/50' : 'bg-gray-50 border-gray-100'}`}>
                  <h3 className={`text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Calendar className="w-3.5 h-3.5" />
                    Programmation (Optionnel)
                  </h3>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Date & Heure d'envoi</label>
                      <DatePicker
                        selected={form.scheduled_at ? new Date(form.scheduled_at) : null}
                        onChange={(date) => setForm({ ...form, scheduled_at: date ? date.toISOString() : '' })}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        dateFormat="dd/MM/yyyy HH:mm"
                        locale="fr"
                        placeholderText="Maintenant (Immédiat)"
                        className="input-premium w-full"
                        isClearable
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Répétition</label>
                      <select 
                        value={form.recurrence_type} 
                        onChange={e => setForm({...form, recurrence_type: e.target.value})} 
                        className={`input-premium w-full appearance-none cursor-pointer ${isDark ? 'bg-space-800 text-white border-space-700' : 'bg-white text-gray-900 border-gray-200'}`}
                      >
                        {RECURRENCE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value} className={isDark ? 'bg-space-900 text-gray-100' : ''}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {form.scheduled_at && (
                    <p className="mt-4 text-[10px] font-bold text-amber-500 flex items-center gap-1.5 animate-pulse">
                      <AlertCircle className="w-3 h-3" />
                      La campagne sera automatiquement lancée à la date prévue.
                    </p>
                  )}
                </div>
              </form>
            </div>

            <div className={`p-8 border-t flex gap-4 ${isDark ? 'border-space-800' : 'border-gray-100'}`}>
              <button 
                type="button" 
                onClick={() => setShowModal(false)} 
                className="flex-1 py-4 px-6 rounded-2xl font-bold bg-gray-500/10 hover:bg-gray-500/20 text-gray-500 hover:text-white transition-all"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                form="campaign-form"
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-100 transition-all flex items-center justify-center gap-3"
              >
                {selectedCampaign ? 'Mettre à jour' : 'Étape suivante'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {showRecipientsModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={closeRecipientsModal}>
          <div className="relative z-10 w-full max-w-2xl bg-[#0B0F1A] border border-white/10 rounded-3xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="p-8 flex-1 overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">Destinataires</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {recipientsList.map(r => (
                     <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                       <div className="truncate"><p className="font-bold text-sm truncate">{r.contact_name || r.contact_number}</p></div>
                       <button onClick={() => handleRemoveRecipient(r.id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                     </div>
                   ))}
                </div>
                <div className="pt-6 border-t border-white/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h3 className="text-xs font-bold uppercase text-gray-500">Ajouter des contacts ou leads</h3>
                    <button 
                      onClick={() => setImportedPickerOpen(true)} 
                      className="px-3 py-1.5 bg-space-800 border border-space-700 hover:border-blue-500 hover:bg-space-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
                    >
                      <UserCheck className="w-4 h-4 text-blue-400" />
                      Carnet WhatsApp
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {leadsList.filter(l => l.phone).map(l => (
                      <label key={l.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedLeadIds.has(l.id) ? 'bg-gold-400/10 border-gold-400/30' : 'bg-white/5 border-white/10'}`}>
                        <input type="checkbox" checked={selectedLeadIds.has(l.id)} onChange={() => { const next = new Set(selectedLeadIds); if (next.has(l.id)) next.delete(l.id); else next.add(l.id); setSelectedLeadIds(next); }} className="w-4 h-4 rounded bg-black/40 border-white/10 text-gold-400 focus:ring-gold-400/20" />
                        <span className="text-sm truncate">{l.name || l.phone}</span>
                      </label>
                    ))}
                  </div>
                  <button onClick={handleAddFromLeads} disabled={selectedLeadIds.size === 0} className="w-full mt-4 py-3 bg-white text-black font-bold rounded-xl disabled:opacity-50">Ajouter la sélection</button>
                </div>
              </div>
            </div>
            <div className="p-6 bg-black/20 border-t border-white/5"><button onClick={closeRecipientsModal} className="w-full py-3 bg-white/5 font-bold rounded-xl">Terminer</button></div>
          </div>
        </div>, document.body
      )}

      {showHistoryModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)}>
          <div className="relative z-10 w-full max-w-3xl bg-[#0B0F1A] border border-white/10 rounded-3xl" onClick={e => e.stopPropagation()}>
            <div className="p-8"><h2 className="text-2xl font-bold mb-6">Historique</h2>
              <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                <table className="w-full text-sm text-left"><tbody className="divide-y divide-white/5">
                  {historyData.recipients.map(r => (
                    <tr key={r.id}><td className="py-4 font-bold">{r.contact_name || r.contact_number}</td><td className="py-4 font-mono text-gray-500">{r.contact_number}</td><td className="py-4 text-right"><span className={r.status === 'sent' ? 'text-emerald-400' : 'text-red-400'}>{r.status}</span></td></tr>
                  ))}
                </tbody></table>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="w-full mt-8 py-3 bg-white/5 font-bold rounded-xl">Fermer</button>
            </div>
          </div>
        </div>, document.body
      )}

      <CampaignPreviewModal 
        isOpen={showPreviewModal} 
        onClose={() => { setShowPreviewModal(false); setCampaignToPreview(null); }} 
        onConfirm={handleConfirmSend} 
        campaign={campaignToPreview} 
        isSending={!!sendingCampaignId} 
      />
      <ImportedContactsPicker
        open={importedPickerOpen}
        onClose={() => setImportedPickerOpen(false)}
        agentId={recipientsCampaign?.campaign?.agent_id || ''}
        mode="multi"
        onSelect={(users) => {
          setImportedPickerOpen(false)
          handleAddImportedContacts(users)
        }}
      />
    </div>
  )
}

function StatCard({ icon: Icon, value, label, isDark, color }) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    gold: 'bg-gold-400/10 text-gold-400',
    indigo: 'bg-indigo-500/10 text-indigo-400'
  }
  
  return (
    <div className={`rounded-xl p-4 border transition-all duration-300 ${
      isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800 hover:scale-[1.02]' : 'bg-white border-gray-100 hover:shadow-md shadow-sm hover:scale-[1.02]'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`p-2 rounded-xl flex-shrink-0 ${colorClasses[color] || colorClasses.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-lg sm:text-xl font-bold break-words leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          <p className={`text-[10px] sm:text-xs truncate font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-0.5`}>{label}</p>
        </div>
      </div>
    </div>
  )
}
