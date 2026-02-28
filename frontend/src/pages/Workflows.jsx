import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useConfirm } from '../contexts/ConfirmContext'
import {
  Plus,
  Zap,
  Play,
  Pause,
  Trash2,
  Edit,
  Clock,
  MessageSquare,
  GitBranch,
  Bell,
  Users,
  UserPlus,
  Phone,
  Bot,
  Tag,
  Search,
  MoreVertical,
  ChevronRight,
  Target,
  History,
  CheckCircle,
  RotateCw,
  XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

const TRIGGER_ICONS = {
  new_message: MessageSquare,
  no_response: Clock,
  keyword: Tag,
  new_conversation: Users,
  order_created: Target,
  order_validated: CheckCircle,
  lead_detected: Users,
  scheduled: Clock
}

const ACTION_ICONS = {
  send_message: MessageSquare,
  add_tag: Tag,
  assign_human: Users,
  create_lead: Target,
  send_notification: Bell,
  wait: Clock
}

export default function Workflows() {
  const { showConfirm } = useConfirm()
  const [loading, setLoading] = useState(true)
  const [workflows, setWorkflows] = useState([])
  const [stats, setStats] = useState(null)
  const [types, setTypes] = useState({ triggerTypes: {}, actionTypes: {}, contactRoles: {} })
  const [agents, setAgents] = useState([])
  const [contacts, setContacts] = useState([])
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [retryingLogId, setRetryingLogId] = useState(null)
  const [deletingLogs, setDeletingLogs] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState(null)
  const [selectedContact, setSelectedContact] = useState(null)
  const [selectedContactView, setSelectedContactView] = useState(null)
  const [selectedLogView, setSelectedLogView] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [contactForm, setContactForm] = useState({ name: '', phone_number: '', role: 'livreur', notes: '' })
  const [focusedContactId, setFocusedContactId] = useState(null)

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    trigger_type: '',
    trigger_config: {},
    actions: [],
    agent_id: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [workflowsRes, statsRes, typesRes, agentsRes, contactsRes, logsRes] = await Promise.all([
        api.get('/workflows'),
        api.get('/workflows/stats/overview'),
        api.get('/workflows/types'),
        api.get('/agents'),
        api.get('/workflows/contacts'),
        api.get('/workflows/logs?limit=100')
      ])
      setWorkflows(workflowsRes.data.workflows || [])
      setStats(statsRes.data.stats)
      setTypes(typesRes.data)
      setAgents(agentsRes.data.agents || [])
      setContacts(contactsRes.data.contacts || [])
      setLogs(logsRes.data.logs || [])
    } catch (error) {
      console.error('Error loading workflows:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshLogs = async () => {
    try {
      setLogsLoading(true)
      const res = await api.get('/workflows/logs?limit=100')
      setLogs(res.data.logs || [])
    } catch (error) {
      console.error('Error loading workflow logs:', error)
      toast.error('Erreur lors du chargement de l’historique')
    } finally {
      setLogsLoading(false)
    }
  }

  const handleRetryExecution = async (logId) => {
    try {
      setRetryingLogId(logId)
      await api.post(`/workflows/logs/${logId}/retry`)
      toast.success('Workflow relancé avec succès')
      refreshLogs()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la relance')
    } finally {
      setRetryingLogId(null)
    }
  }

  const handleDeleteAllLogs = async () => {
    const ok = await showConfirm({
      title: 'Supprimer l\'historique',
      message: 'Supprimer définitivement tout l\'historique d\'exécution des workflows ? Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Supprimer tout'
    })
    if (!ok) return
    try {
      setDeletingLogs(true)
      await api.delete('/workflows/logs')
      toast.success('Historique supprimé')
      refreshLogs()
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression')
    } finally {
      setDeletingLogs(false)
    }
  }

  const formatRelativeTime = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString('fr-FR')
  }

  const getExecutionSummary = (log) => {
    const results = Array.isArray(log.result) ? log.result : []
    if (results.length === 0) return 'Aucune action'
    const ok = results.filter(r => r.success).length
    const fail = results.length - ok
    let summary = `${ok}/${results.length} actions OK${fail > 0 ? ` • ${fail} échec(s)` : ''}`
    const sendMsg = results.find(r => r.action === 'send_message' && r.success && r.result?.recipient)
    if (sendMsg) {
      const recipient = sendMsg.result.recipient === 'conversation_contact'
        ? (log.trigger_data?.contactName || log.trigger_data?.contactNumber || 'contact de la conversation')
        : sendMsg.result.recipient
      summary += ` • Envoyé à: ${recipient}`
    }
    return summary
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.name.trim() || !form.trigger_type || form.actions.length === 0) {
      toast.error('Veuillez remplir tous les champs requis')
      return
    }

    try {
      if (selectedWorkflow) {
        await api.put(`/workflows/${selectedWorkflow.id}`, form)
        toast.success('Workflow mis à jour')
      } else {
        await api.post('/workflows', form)
        toast.success('Workflow créé')
      }
      setShowModal(false)
      resetForm()
      loadData()
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleToggle = async (workflowId) => {
    try {
      const result = await api.post(`/workflows/${workflowId}/toggle`)
      toast.success(result.data.message)
      loadData()
    } catch (error) {
      toast.error('Erreur lors du changement de statut')
    }
  }

  const handleDelete = async (workflowId) => {
    const ok = await showConfirm({
      title: 'Supprimer le workflow',
      message: 'Supprimer définitivement ce workflow ? Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/workflows/${workflowId}`)
      toast.success('Workflow supprimé')
      loadData()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const openEditModal = (workflow) => {
    setSelectedWorkflow(workflow)
    setForm({
      name: workflow.name,
      description: workflow.description || '',
      trigger_type: workflow.trigger_type,
      trigger_config: workflow.trigger_config || {},
      actions: workflow.actions || [],
      agent_id: workflow.agent_id || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      trigger_type: '',
      trigger_config: {},
      actions: [],
      agent_id: ''
    })
    setSelectedWorkflow(null)
  }

  const addAction = (type) => {
    setForm({
      ...form,
      actions: [...form.actions, { type, config: {} }]
    })
  }

  const removeAction = (index) => {
    setForm({
      ...form,
      actions: form.actions.filter((_, i) => i !== index)
    })
  }

  const updateActionConfig = (index, config) => {
    const newActions = [...form.actions]
    newActions[index] = { ...newActions[index], config: { ...newActions[index].config, ...config } }
    setForm({ ...form, actions: newActions })
  }

  // Contact CRUD
  const openContactModal = (contact = null) => {
    setSelectedContact(contact)
    setContactForm(contact
      ? { name: contact.name, phone_number: contact.phone_number, role: contact.role, notes: contact.notes || '' }
      : { name: '', phone_number: '', role: 'livreur', notes: '' })
    setShowContactModal(true)
  }
  const saveContact = async (e) => {
    e?.preventDefault()
    if (!contactForm.name.trim() || !contactForm.phone_number.trim()) {
      toast.error('Nom et numéro requis')
      return
    }
    try {
      if (selectedContact) {
        await api.put(`/workflows/contacts/${selectedContact.id}`, contactForm)
        toast.success('Contact mis à jour')
      } else {
        await api.post('/workflows/contacts', contactForm)
        toast.success('Contact ajouté')
      }
      setShowContactModal(false)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur')
    }
  }
  const deleteContact = async (contact) => {
    const ok = await showConfirm({
      title: 'Supprimer le contact',
      message: `Supprimer ${contact.name} ?`,
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/workflows/contacts/${contact.id}`)
      toast.success('Contact supprimé')
      loadData()
    } catch (err) {
      toast.error('Erreur lors de la suppression')
    }
  }
  const contactRoleLabel = (roleKey) => types.contactRoles?.[roleKey] || roleKey

  const filteredWorkflows = workflows.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold text-gray-100">Automatisations</h1>
          <p className="text-gray-400 text-sm sm:text-base">Créez des workflows automatiques pour vos agents</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="btn-primary flex items-center justify-center gap-2 flex-shrink-0 touch-target"
        >
          <Plus className="w-5 h-5" />
          Nouveau workflow
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gold-400/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-gold-400" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-2xl font-bold text-gray-100">{stats?.total || 0}</p>
            <p className="text-[10px] sm:text-sm text-gray-400 uppercase tracking-wider truncate">Workflows</p>
          </div>
        </div>
        <div className="card p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-emerald-400/20 flex items-center justify-center flex-shrink-0">
            <Play className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-2xl font-bold text-gray-100">{stats?.active || 0}</p>
            <p className="text-[10px] sm:text-sm text-gray-400 uppercase tracking-wider truncate">Actifs</p>
          </div>
        </div>
        <div className="card p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-400/20 flex items-center justify-center flex-shrink-0">
            <History className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-2xl font-bold text-gray-100">{stats?.totalExecutions || 0}</p>
            <p className="text-[10px] sm:text-sm text-gray-400 uppercase tracking-wider truncate">Totaux</p>
          </div>
        </div>
        <div className="card p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-400/20 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-2xl font-bold text-gray-100">{stats?.recentExecutions || 0}</p>
            <p className="text-[10px] sm:text-sm text-gray-400 uppercase tracking-wider truncate">Semaine</p>
          </div>
        </div>
      </div>

      {/* Contacts pour les actions (livreur, gérant, etc.) */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2 truncate">
              <UserPlus className="w-5 h-5 text-gold-400 flex-shrink-0" />
              Contacts enregistrés
            </h2>
            <p className="text-sm text-gray-400 mt-1">Utilisez ces contacts dans l’action « Envoyer un message »</p>
          </div>
          <button
            type="button"
            onClick={() => openContactModal()}
            className="btn-secondary flex items-center justify-center gap-2 flex-shrink-0 touch-target"
          >
            <Plus className="w-4 h-4" />
            Ajouter un contact
          </button>
        </div>
        {contacts.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">Aucun contact. Ajoutez-en pour les utiliser dans vos workflows.</p>
        ) : (
          <div className="space-y-3">
            {/* Contacts Table - Desktop only */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-space-700">
                    <th className="pb-3 pr-4">Nom</th>
                    <th className="pb-3 pr-4">Numéro</th>
                    <th className="pb-3 pr-4">Rôle</th>
                    <th className="pb-3 pr-4">Notes</th>
                    <th className="pb-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => setSelectedContactView(c)}
                      className="border-b border-space-700/50 cursor-pointer hover:bg-space-800/50 transition-colors group"
                    >
                      <td className="py-3 pr-4 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-100 group-hover:text-gold-400 transition-colors">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-300">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {c.phone_number}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 rounded-full bg-gold-400/20 text-gold-400 text-xs font-semibold">
                          {contactRoleLabel(c.role)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-500 max-w-[200px] truncate">{c.notes || '—'}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); openContactModal(c); }}
                            className="p-2 text-gray-400 hover:text-gold-400 hover:bg-gold-400/10 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteContact(c); }}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Contacts Cards - Mobile only */}
            <div className="md:hidden grid grid-cols-1 gap-3">
              {contacts.map((c) => (
                <div 
                  key={c.id}
                  onClick={() => setSelectedContactView(c)}
                  className="p-4 rounded-2xl bg-space-800/50 border border-space-700 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-gray-100">{c.name}</h4>
                    <span className="px-2 py-0.5 rounded-full bg-gold-400/20 text-gold-400 text-[10px] font-bold uppercase">
                      {contactRoleLabel(c.role)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Phone className="w-3.5 h-3.5" />
                    {c.phone_number}
                  </div>
                </div>
              ))}
            </div>
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
          placeholder="Rechercher un workflow..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Workflows List */}
      {filteredWorkflows.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gold-400/20 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-gold-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-100 mb-2">Aucun workflow</h3>
          <p className="text-gray-400 mb-4">Créez votre premier workflow pour automatiser des actions</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            Créer un workflow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredWorkflows.map((workflow, index) => {
            const TriggerIcon = TRIGGER_ICONS[workflow.trigger_type] || Zap
            return (
              <div key={workflow.id} className="card p-6 animate-fadeIn" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      workflow.is_active ? 'bg-emerald-400/20' : 'bg-gray-500/20'
                    }`}>
                      <TriggerIcon className={`w-6 h-6 ${workflow.is_active ? 'text-emerald-400' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-100">{workflow.name}</h3>
                      <p className="text-sm text-gray-400">
                        {types.triggerTypes[workflow.trigger_type]?.name || workflow.trigger_type}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(workflow.id)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      workflow.is_active ? 'bg-emerald-500' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      workflow.is_active ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                {workflow.description && (
                  <p className="text-sm text-gray-400 mb-4">{workflow.description}</p>
                )}

                {/* Actions preview */}
                <div className="flex items-center gap-2 mb-4">
                  {workflow.actions?.slice(0, 3).map((action, idx) => {
                    const ActionIcon = ACTION_ICONS[action.type] || Zap
                    return (
                      <div key={idx} className="flex items-center gap-1">
                        {idx > 0 && <ChevronRight className="w-3 h-3 text-gray-500" />}
                        <div className="w-8 h-8 rounded-lg bg-space-700 flex items-center justify-center" title={types.actionTypes[action.type]?.name}>
                          <ActionIcon className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    )
                  })}
                  {workflow.actions?.length > 3 && (
                    <span className="text-xs text-gray-500">+{workflow.actions.length - 3}</span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-space-700">
                  <span className="text-xs text-gray-500">
                    {workflow.agent_name ? `Agent: ${workflow.agent_name}` : 'Tous les agents'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(workflow)}
                      className="p-2 text-gray-400 hover:text-gold-400 hover:bg-gold-400/10 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(workflow.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Workflow execution history */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2 truncate">
              <History className="w-5 h-5 text-blue-400 flex-shrink-0" />
              Historique d’exécution
            </h2>
            <p className="text-sm text-gray-400 mt-1">Les 100 dernières exécutions de workflows</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={refreshLogs}
              className="btn-secondary flex items-center justify-center gap-2 touch-target"
            >
              <History className="w-4 h-4" />
              Rafraîchir
            </button>
            <button
              type="button"
              onClick={handleDeleteAllLogs}
              disabled={deletingLogs || logs.length === 0}
              className="flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none touch-target whitespace-nowrap"
              title="Supprimer tout l'historique"
            >
              {deletingLogs ? (
                <RotateCw className="w-4 h-4 animate-spin flex-shrink-0" />
              ) : (
                <Trash2 className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate max-w-[180px] sm:max-w-none">Supprimer l'historique</span>
            </button>
          </div>
        </div>

        {logsLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-400"></div>
          </div>
        ) : logs.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">Aucune exécution pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {/* History Table - Desktop only */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-space-700">
                    <th className="pb-3 pr-4">Workflow</th>
                    <th className="pb-3 pr-4">Statut</th>
                    <th className="pb-3 pr-4 text-right">Exécuté</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const status = log.status || (log.success ? 'success' : 'failed')
                    const isSuccess = status === 'success'
                    return (
                      <tr 
                        key={log.id} 
                        onClick={() => setSelectedLogView(log)}
                        className="border-b border-space-700/50 hover:bg-space-800/50 cursor-pointer group transition-colors"
                      >
                        <td className="py-4 pr-4">
                          <div className="font-semibold text-gray-100 group-hover:text-blue-400 transition-colors">{log.workflow_name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            {types.triggerTypes[log.trigger_type]?.name || log.trigger_type}
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            isSuccess ? 'bg-emerald-400/20 text-emerald-400' : 'bg-red-400/20 text-red-400'
                          }`}>
                            {isSuccess ? 'Succès' : 'Échec'}
                          </span>
                        </td>
                        <td className="py-4 text-right text-gray-500 text-xs">
                          {formatRelativeTime(log.executed_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* History Cards - Mobile only */}
            <div className="lg:hidden grid grid-cols-1 gap-3">
              {logs.map((log) => {
                const status = log.status || (log.success ? 'success' : 'failed')
                const isSuccess = status === 'success'
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLogView(log)}
                    className="p-4 rounded-2xl bg-space-800/50 border border-space-700 hover:border-blue-500/30 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <h4 className="font-bold text-gray-100 text-sm">{log.workflow_name}</h4>
                      </div>
                      <span className="text-[10px] text-gray-500">{formatRelativeTime(log.executed_at)}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{getExecutionSummary(log)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="relative z-10 card p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-y-auto animate-fadeIn">
            <h2 className="text-xl font-display font-bold text-gray-100 mb-6">
              {selectedWorkflow ? 'Modifier le workflow' : 'Nouveau workflow'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nom *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input"
                    placeholder="Ex: Suivi automatique"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Agent (optionnel)</label>
                  <select
                    value={form.agent_id}
                    onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
                    className="input"
                  >
                    <option value="">Tous les agents</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder="Description du workflow..."
                />
              </div>

              {/* Trigger */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Déclencheur *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(types.triggerTypes).map(([key, trigger]) => {
                    const TriggerIcon = TRIGGER_ICONS[key] || Zap
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm({ ...form, trigger_type: key, trigger_config: {} })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          form.trigger_type === key
                            ? 'border-gold-400 bg-gold-400/10'
                            : 'border-space-600 hover:border-space-500'
                        }`}
                      >
                        <TriggerIcon className={`w-5 h-5 mb-2 ${form.trigger_type === key ? 'text-gold-400' : 'text-gray-400'}`} />
                        <p className="text-sm font-medium text-gray-100">{trigger.name}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Trigger config based on type */}
              {form.trigger_type === 'keyword' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Mots-clés (séparés par virgule)</label>
                  <input
                    type="text"
                    value={form.trigger_config.keywords || ''}
                    onChange={(e) => setForm({ ...form, trigger_config: { ...form.trigger_config, keywords: e.target.value } })}
                    className="input"
                    placeholder="commande, achat, prix"
                  />
                </div>
              )}

              {form.trigger_type === 'no_response' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Délai (en minutes)</label>
                  <input
                    type="number"
                    value={form.trigger_config.delay_minutes || 30}
                    onChange={(e) => setForm({ ...form, trigger_config: { ...form.trigger_config, delay_minutes: parseInt(e.target.value) } })}
                    className="input"
                    min={1}
                  />
                </div>
              )}

              {/* Actions */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Actions *</label>
                {form.actions.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {form.actions.map((action, idx) => {
                      const ActionIcon = ACTION_ICONS[action.type] || Zap
                      return (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-space-800 rounded-xl">
                          <div className="w-8 h-8 rounded-lg bg-space-700 flex items-center justify-center">
                            <ActionIcon className="w-4 h-4 text-gold-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-100">
                              {types.actionTypes[action.type]?.name}
                            </p>
                            {action.type === 'send_message' && (
                              <div className="mt-2 space-y-2">
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Destinataire</label>
                                  <select
                                    value={action.config.send_to === 'contact' ? 'contact' : 'conversation'}
                                    onChange={(e) => updateActionConfig(idx, {
                                      send_to: e.target.value === 'contact' ? 'contact' : 'conversation',
                                      contact_id: e.target.value === 'contact' ? (action.config.contact_id || '') : null
                                    })}
                                    className="input text-sm"
                                  >
                                    <option value="conversation">Contact de la conversation</option>
                                    <option value="contact">Contact enregistré</option>
                                  </select>
                                </div>
                                {action.config.send_to === 'contact' && (
                                  <select
                                    value={action.config.contact_id || ''}
                                    onChange={(e) => updateActionConfig(idx, { contact_id: e.target.value })}
                                    className="input text-sm w-full"
                                  >
                                    <option value="">Choisir un contact...</option>
                                    {contacts.map((c) => (
                                      <option key={c.id} value={c.id}>{c.name} ({contactRoleLabel(c.role)}) – {c.phone_number}</option>
                                    ))}
                                  </select>
                                )}
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Message (ou laisser vide si récap uniquement)</label>
                                  <textarea
                                    value={action.config.message || ''}
                                    onChange={(e) => updateActionConfig(idx, { message: e.target.value })}
                                    className="input min-h-[80px]"
                                    placeholder="Ex: Nouvelle livraison pour {customer_name}..."
                                    rows={3}
                                  />
                                </div>
                                {['order_validated', 'order_created'].includes(form.trigger_type) && (
                                  <>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={!!action.config.include_order_summary}
                                        onChange={(e) => updateActionConfig(idx, { include_order_summary: e.target.checked })}
                                        className="rounded border-space-500"
                                      />
                                      <span className="text-xs text-gray-400">
                                        Inclure le récapitulatif de la commande (client, produits, total)
                                      </span>
                                    </label>
                                    <p className="text-xs text-gray-500">
                                      Variables : {'{customer_name}'} {'{customer_phone}'} {'{lieu_livraison}'} {'{delivery_phone}'} {'{order_items}'} {'{order_total}'} {'{currency}'} {'{order_id}'} {'{order_notes}'}
                                    </p>
                                  </>
                                )}
                              </div>
                            )}
                            {action.type === 'wait' && (
                              <input
                                type="number"
                                value={action.config.minutes || 5}
                                onChange={(e) => updateActionConfig(idx, { minutes: parseInt(e.target.value) })}
                                className="input mt-2 w-32"
                                placeholder="Minutes"
                                min={1}
                              />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAction(idx)}
                            className="p-2 text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(types.actionTypes).map(([key, action]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => addAction(key)}
                      className="px-3 py-1.5 text-sm border border-space-600 rounded-lg text-gray-400 hover:text-gray-100 hover:border-space-500 transition-colors"
                    >
                      + {action.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  {selectedWorkflow ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajouter/Modifier contact */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="relative z-10 card p-4 sm:p-6 w-full max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
            <h2 className="text-xl font-display font-bold text-gray-100 mb-4">
              {selectedContact ? 'Modifier le contact' : 'Ajouter un contact'}
            </h2>
            <form onSubmit={saveContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nom *</label>
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="input"
                  placeholder="Ex: Jean Dupont"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Numéro *</label>
                <input
                  type="text"
                  value={contactForm.phone_number}
                  onChange={(e) => setContactForm({ ...contactForm, phone_number: e.target.value })}
                  className="input"
                  placeholder="Ex: +225 07 00 00 00 00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Rôle / Type *</label>
                <select
                  value={contactForm.role}
                  onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                  className="input"
                >
                  {Object.entries(types.contactRoles || {}).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Ex: Livreur, Gérant magasin — pour cibler ce contact dans l’action « Envoyer un message »</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                <textarea
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder="Optionnel"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  {selectedContact ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Contact Detail Zoom View */}
      {selectedContactView && (
        <DetailOverlay onClose={() => setSelectedContactView(null)}>
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mb-6 shadow-xl ring-4 ring-gold-400/20">
              <span className="text-4xl font-bold text-space-950">
                {selectedContactView.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <h3 className="text-3xl font-display font-bold text-gray-100 mb-2">{selectedContactView.name}</h3>
            <span className="px-4 py-1.5 rounded-full bg-gold-400/20 text-gold-400 text-sm font-semibold mb-6">
              {contactRoleLabel(selectedContactView.role)}
            </span>
            
            <div className="w-full space-y-4 max-w-sm mx-auto">
              <div className="flex items-center gap-4 p-4 bg-space-800/50 rounded-2xl border border-space-700 text-left">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Numéro de téléphone</p>
                  <p className="text-gray-100 font-semibold">{selectedContactView.phone_number}</p>
                </div>
              </div>

              {selectedContactView.notes && (
                <div className="flex items-start gap-4 p-4 bg-space-800/50 rounded-2xl border border-space-700 text-left">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Notes & Informations</p>
                    <p className="text-gray-300 text-sm italic">{selectedContactView.notes}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-8">
              <button 
                onClick={() => {
                  setSelectedContactView(null)
                  openContactModal(selectedContactView)
                }}
                className="btn-primary"
              >
                Modifier
              </button>
              <button 
                onClick={() => setSelectedContactView(null)}
                className="btn-secondary"
              >
                Fermer
              </button>
            </div>
          </div>
        </DetailOverlay>
      )}

      {/* Log Detail Zoom View */}
      {selectedLogView && (
        <DetailOverlay onClose={() => setSelectedLogView(null)}>
          <div className="flex flex-col p-2">
            <div className="flex items-center gap-4 mb-8">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                selectedLogView.success ? 'bg-emerald-400/20' : 'bg-red-400/20'
              }`}>
                {selectedLogView.success ? <CheckCircle className="w-8 h-8 text-emerald-400" /> : <XCircle className="w-8 h-8 text-red-400" />}
              </div>
              <div className="min-w-0">
                <h3 className="text-2xl font-display font-bold text-gray-100 truncate">{selectedLogView.workflow_name}</h3>
                <p className="text-gray-400">{formatRelativeTime(selectedLogView.executed_at)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-space-800/50 rounded-2xl border border-space-700">
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Déclencheur</p>
                <p className="text-gray-100 font-semibold">{types.triggerTypes[selectedLogView.trigger_type]?.name || selectedLogView.trigger_type}</p>
              </div>
              <div className="p-4 bg-space-800/50 rounded-2xl border border-space-700">
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Agent Responsable</p>
                <p className="text-gray-100 font-semibold">{selectedLogView.agent_name || 'Tous les agents'}</p>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-gold-400" />
                Actions exécutées ({Array.isArray(selectedLogView.result) ? selectedLogView.result.length : 0})
              </p>
              <div className="space-y-3">
                {Array.isArray(selectedLogView.result) && selectedLogView.result.map((res, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-space-800 border border-space-700 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${res.success ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                        {res.success ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                      </div>
                      <span className="text-sm font-medium text-gray-100">{res.action || 'Action'}</span>
                    </div>
                    {!res.success && res.error && (
                      <span className="text-xs text-red-400 max-w-[200px] truncate">{res.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setSelectedLogView(null)} className="btn-secondary w-full">Fermer</button>
            </div>
          </div>
        </DetailOverlay>
      )}
    </div>
  )
}

function DetailOverlay({ children, onClose }) {
  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-space-950/90 backdrop-blur-md animate-fade-in" />
      <div 
        className="relative z-10 w-full max-w-lg bg-space-900/50 border border-white/10 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"
        >
          <XCircle className="w-6 h-6" />
        </button>
        {children}
      </div>
    </div>
  )
}
