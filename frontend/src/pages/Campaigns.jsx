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
  Check
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
      await new Promise(r => setTimeout(r, 1000))
      setForm(prev => ({ ...prev, message: prev.message + " (Amélioré par l'IA ✨)" }))
    } finally { setRewritingMessage(false) }
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

  const filteredCampaigns = campaigns.filter(c => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()))

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gold-400" /></div>

  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 pb-12">
      <div className={`relative rounded-3xl border p-8 ${isDark ? 'bg-gradient-to-br from-space-800 to-space-900 border-space-700/50' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-xl"><Send className="w-6 h-6 text-blue-400" /></div>
              <h1 className="text-3xl font-display font-bold text-gray-100">Campagnes</h1>
            </div>
            <p className="text-gray-400">Diffusion de messages en masse</p>
          </div>
          <button onClick={() => { setForm({ name: '', message: '', agent_id: '', scheduled_at: '', recurrence_type: 'none', recurrence_interval: 1, recurrence_days: '', recipients: [] }); setSelectedCampaign(null); setShowModal(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-5 h-5" />Nouvelle campagne</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
           <div className="card p-4 bg-space-800/50 border-white/5"><p className="text-2xl font-bold">{stats?.total || 0}</p><p className="text-xs text-gray-500">Total</p></div>
           <div className="card p-4 bg-emerald-500/5 border-emerald-500/10"><p className="text-2xl font-bold text-emerald-400">{stats?.sent || 0}</p><p className="text-xs text-gray-500">Envoyées</p></div>
           <div className="card p-4 bg-blue-500/5 border-blue-500/10"><p className="text-2xl font-bold text-blue-400">{stats?.totalMessages ?? 0}</p><p className="text-xs text-gray-500">Messages</p></div>
           <div className="card p-4 bg-gold-400/5 border-gold-400/10"><p className="text-2xl font-bold text-gold-400">{stats?.totalRecipients > 0 ? Math.round((stats.totalSent / stats.totalRecipients) * 100) : 0}%</p><p className="text-xs text-gray-500">Succès</p></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-300 flex-1 max-w-md ${
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
          <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none focus:ring-0 w-full text-sm" />
        </div>
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
              <button
                onClick={handleDeleteSelected}
                disabled={bulkLoading}
                className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/20 text-xs sm:text-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden xs:inline">Supprimer</span>
              </button>
            </div>
          </div>
        )}
        {filteredCampaigns.map(c => {
          const isSelected = selectedIds.has(c.id)
          return (
            <div key={c.id} className={`card p-6 transition-all ${isSelected ? (isDark ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/30' : 'bg-blue-50 border-blue-300 ring-1 ring-blue-200 shadow-sm') : 'hover:border-white/10'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelect(c.id); }}
                    className={`mt-1 w-6 h-6 flex-shrink-0 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : isDark ? 'border-space-600 bg-space-900/50 hover:border-space-500' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-gray-100">{c.name}</h3>
                      {getStatusBadge(c.status)}
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-1 mb-3">{c.message}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c.recipients_count ?? 0}</span>
                      {c.scheduled_at && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(c.scheduled_at).toLocaleDateString()}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                      {c.status !== 'sent' && (
                        <>
                          <button onClick={() => openRecipientsModal(c)} className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-white px-3 py-1.5 rounded-lg bg-blue-400/10 hover:bg-blue-400 transition-all border border-blue-400/20">Destinataires</button>
                          <button onClick={() => openEditModal(c)} className="text-[10px] font-bold uppercase tracking-widest text-gold-400 hover:text-black px-3 py-1.5 rounded-lg bg-gold-400/10 hover:bg-gold-400 transition-all border border-gold-400/20">Modifier</button>
                          <button onClick={() => handleSendCampaign(c)} className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-white px-3 py-1.5 rounded-lg bg-emerald-400/10 hover:bg-emerald-400 transition-all border border-emerald-400/20">Envoyer</button>
                        </>
                      )}
                      {(c.status === 'sent' || c.status === 'failed') && <button onClick={() => handleRelaunch(c.id)} className="text-[10px] font-bold uppercase tracking-widest text-orange-400 hover:text-white px-3 py-1.5 rounded-lg bg-orange-400/10 hover:bg-orange-400 transition-all border border-orange-400/20">Relancer</button>}
                      <button onClick={() => openHistoryModal(c)} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/10">Historique</button>
                    </div>
                  </div>
                </div>
                <button onClick={() => handleDelete(c.id)} className="p-2 text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-5 h-5" /></button>
              </div>
            </div>
          )
        })}
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="relative z-10 w-full max-w-lg flex flex-col bg-[#0B0F1A] border border-white/10 rounded-3xl animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6">{selectedCampaign ? 'Modifier' : 'Nouveau'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Nom" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-dark w-full" required />
                <select value={form.agent_id} onChange={e => setForm({...form, agent_id: e.target.value})} className="input-dark w-full" required>
                  <option value="">Agent</option>
                  {agents.filter(a => a.whatsapp_connected).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <textarea placeholder="Message" value={form.message} onChange={e => setForm({...form, message: e.target.value})} className="input-dark w-full min-h-[120px]" required />
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl bg-white/5 font-bold">Annuler</button>
                  <button type="submit" className="flex-1 py-3 rounded-xl bg-white text-black font-bold">Suivant</button>
                </div>
              </form>
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
                  <h3 className="text-xs font-bold uppercase text-gray-500 mb-4">Ajouter des leads</h3>
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

      <CampaignPreviewModal isOpen={showPreviewModal} onClose={() => { setShowPreviewModal(false); setCampaignToPreview(null); }} onConfirm={handleConfirmSend} campaign={campaignToPreview} isSending={!!sendingCampaignId} />
    </div>
  )
}
