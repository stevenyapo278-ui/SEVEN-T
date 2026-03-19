import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import api from '../services/api'
import { useConfirm } from '../contexts/ConfirmContext'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { useAuth } from '../contexts/AuthContext'
import { 
  Users, 
  Bot, 
  MessageSquare, 
  CreditCard, 
  Search, 
  Plus,
  Edit,
  Trash2,
  Shield,
  ShieldOff,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
  UserPlus,
  Key,
  X,
  AlertTriangle,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Package,
  WifiOff,
  ShoppingCart,
  Cpu,
  Settings,
  TestTube,
  BarChart3,
  Eye,
  EyeOff,
  Copy,
  Ticket,
  Info,
  Database
} from 'lucide-react'
import toast from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { registerLocale } from 'react-datepicker'
import fr from 'date-fns/locale/fr'
registerLocale('fr', fr)
import { DashboardContent, UsersContent, AnomaliesTab, PlansContent, CouponsContent, AuditLogsContent, getCreditsForPlan } from './Admin/index.js'

/** Tous les modules des plans, activables par utilisateur (formKey → label) */
const PLAN_MODULES = [
  { key: 'availability_hours_enabled', label: 'Heures de disponibilité' },
  { key: 'voice_responses_enabled', label: 'Réponses vocales' },
  { key: 'payment_module_enabled', label: 'Moyens de paiement' },
  { key: 'analytics_module_enabled', label: 'Statistiques & Analytics' },
  { key: 'reports_module_enabled', label: 'Rapports' },
  { key: 'next_best_action_enabled', label: 'Next Best Action' },
  { key: 'conversion_score_enabled', label: 'Score de conversion' },
  { key: 'daily_briefing_enabled', label: 'Briefing quotidien' },
  { key: 'sentiment_routing_enabled', label: 'Routage sentiment' },
  { key: 'catalog_import_enabled', label: 'Import catalogue' },
  { key: 'human_handoff_alerts_enabled', label: 'Alertes transfert humain' }
]

export default function Admin() {
  const { showConfirm } = useConfirm()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 })
  const [selectedUser, setSelectedUser] = useState(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [deletePreview, setDeletePreview] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [promoteAdminModal, setPromoteAdminModal] = useState({ open: false, user: null })
  const [promoteAdminConfirmInput, setPromoteAdminConfirmInput] = useState('')
  // Anomalies are handled inside AnomaliesTab now
  const [anomalyStats, setAnomalyStats] = useState({ total: 0, bySeverity: {}, byType: {} })
  
  // AI Models state
  const [aiModels, setAiModels] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [aiStats, setAiStats] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [showModelModal, setShowModelModal] = useState(false)
  const [editingModel, setEditingModel] = useState(null)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [editingKey, setEditingKey] = useState(null)
  const [platformSettings, setPlatformSettings] = useState({ 
    default_media_model: 'gemini-1.5-flash', 
    default_trial_days: '7',
    embedding_model: 'gemini-embedding-001'
  })
  const [savingMediaModel, setSavingMediaModel] = useState(false)
  const [savingEmbeddingModel, setSavingEmbeddingModel] = useState(false)
  const [reindexingAll, setReindexingAll] = useState(false)
  const [savingTrialDays, setSavingTrialDays] = useState(false)
  const [testingModel, setTestingModel] = useState(null)

  // Plans state
  const [plans, setPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [availableModels, setAvailableModels] = useState([])
  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([])
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false)
  const [auditPagination, setAuditPagination] = useState({ total: 0, limit: 50, offset: 0 })
  const [auditFilters, setAuditFilters] = useState({ action: '', actionExact: '', userId: '', entityType: '', dateFrom: '', dateTo: '', ip: '', onlyErrors: false })
  const [rolesList, setRolesList] = useState([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)

  // Bruteforce security settings
  const [bruteforceSettings, setBruteforceSettings] = useState({
    enabled: false,
    threshold: 5,
    windowMinutes: 10,
    blockMinutes: 30
  })
  const [loadingBruteforce, setLoadingBruteforce] = useState(false)
  const [savingBruteforce, setSavingBruteforce] = useState(false)

  const anyAdminModalOpen = showUserModal || showCreateModal || showDeleteModal || promoteAdminModal.open || showModelModal || showKeyModal || showPlanModal || showConfirmModal || testingModel !== null

  useLockBodyScroll(anyAdminModalOpen)

  const adminCaps = useMemo(() => {
    const can = (v) => Boolean(v === 1 || v === true)
    return {
      // keep naming explicit and stable for UI logic
      isFullAdmin: can(user?.is_admin),
      canManageUsers: can(user?.can_manage_users),
      canManagePlans: can(user?.can_manage_plans),
      canViewStats: can(user?.can_view_stats),
      canManageAI: can(user?.can_manage_ai),
      canManageTickets: can(user?.can_manage_tickets),
    }
  }, [user])

  const allowedAdminTabs = useMemo(() => {
    const tabs = []
    if (adminCaps.canViewStats || adminCaps.isFullAdmin) {
      tabs.push('dashboard', 'activity', 'anomalies')
    }
    if (adminCaps.canManageUsers || adminCaps.isFullAdmin) tabs.push('users')
    if (adminCaps.canManageAI || adminCaps.isFullAdmin) tabs.push('ai-models')
    if (adminCaps.canManagePlans || adminCaps.isFullAdmin) tabs.push('plans', 'coupons')
    if (adminCaps.canManageTickets || adminCaps.isFullAdmin) tabs.push('tickets')
    return tabs
  }, [adminCaps])

  // If current tab becomes forbidden (or on first mount), move to first allowed tab.
  useEffect(() => {
    if (!allowedAdminTabs.length) return
    if (!allowedAdminTabs.includes(activeTab)) {
      setActiveTab(allowedAdminTabs[0])
    }
  }, [allowedAdminTabs, activeTab])

  useEffect(() => {
    // Reset all modals when changing tab to avoid stuck scroll locks
    setShowUserModal(false)
    setShowCreateModal(false)
    setShowDeleteModal(false)
    setPromoteAdminModal({ open: false, user: null })
    setShowModelModal(false)
    setShowKeyModal(false)
    setShowPlanModal(false)
    setShowConfirmModal(false)
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'dashboard') {
      if (adminCaps.canViewStats || adminCaps.isFullAdmin) {
        loadStats()
        loadAnomalyStats()
        loadBruteforceSettings()
      }
    } else if (activeTab === 'users') {
      if (adminCaps.canManageUsers || adminCaps.isFullAdmin) {
        loadUsers()
      }
      if (adminCaps.canManagePlans || adminCaps.isFullAdmin) {
        loadPlans()
      }
    } else if (activeTab === 'anomalies') {
      if (adminCaps.canViewStats || adminCaps.isFullAdmin) {
        loadAnomalyStats()
      }
    } else if (activeTab === 'ai-models') {
      if (adminCaps.canManageAI || adminCaps.isFullAdmin) {
        loadAIData()
      }
    } else if (activeTab === 'plans') {
      if (adminCaps.canManagePlans || adminCaps.isFullAdmin) {
        loadPlans()
      }
    } else if (activeTab === 'activity') {
      if (adminCaps.canViewStats || adminCaps.isFullAdmin) {
        loadAuditLogs()
      }
    }
    
    // Always load roles if not already loaded and we are in users tab
    if (activeTab === 'users' && rolesList.length === 0 && !loadingRoles) {
      loadRoles()
    }
  }, [activeTab, pagination.offset, searchQuery, selectedPlan, selectedStatus])

  // (Anomalies fetching is inside AnomaliesTab)


  // Reload audit logs when filters/pagination change
  useEffect(() => {
    if (activeTab !== 'activity') return
    loadAuditLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    auditPagination.offset,
    auditPagination.limit,
    auditFilters.action,
    auditFilters.actionExact,
    auditFilters.userId,
    auditFilters.entityType,
    auditFilters.dateFrom,
    auditFilters.dateTo,
    auditFilters.ip,
    auditFilters.onlyErrors
  ])

  const loadRoles = async () => {
    setLoadingRoles(true)
    try {
      const res = await api.get('/admin/roles')
      setRolesList(res.data.roles || [])
    } catch (error) {
      console.error('Error loading roles:', error)
    } finally {
      setLoadingRoles(false)
    }
  }

  const loadBruteforceSettings = async () => {
    setLoadingBruteforce(true)
    try {
      const res = await api.get('/admin/security/bruteforce')
      const data = res.data || {}
      setBruteforceSettings({
        enabled: Boolean(data.enabled),
        threshold: Number.isFinite(Number(data.threshold)) ? Number(data.threshold) : 5,
        windowMinutes: Number.isFinite(Number(data.windowMinutes)) ? Number(data.windowMinutes) : 10,
        blockMinutes: Number.isFinite(Number(data.blockMinutes)) ? Number(data.blockMinutes) : 30
      })
    } catch (error) {
      console.error('Error loading bruteforce settings:', error)
      toast.error('Impossible de charger la protection brute force')
    } finally {
      setLoadingBruteforce(false)
    }
  }

  const saveBruteforceSettings = async (partial) => {
    const next = {
      ...bruteforceSettings,
      ...partial
    }
    setBruteforceSettings(next)
    setSavingBruteforce(true)
    try {
      const res = await api.put('/admin/security/bruteforce', next)
      const data = res.data || {}
      setBruteforceSettings({
        enabled: Boolean(data.enabled),
        threshold: Number.isFinite(Number(data.threshold)) ? Number(data.threshold) : next.threshold,
        windowMinutes: Number.isFinite(Number(data.windowMinutes)) ? Number(data.windowMinutes) : next.windowMinutes,
        blockMinutes: Number.isFinite(Number(data.blockMinutes)) ? Number(data.blockMinutes) : next.blockMinutes
      })
      toast.success('Protection brute force mise à jour')
    } catch (error) {
      console.error('Error saving bruteforce settings:', error)
      toast.error('Erreur lors de la mise à jour de la protection brute force')
      // Try to reload last known values from server
      try {
        await loadBruteforceSettings()
      } catch {
        // ignore
      }
    } finally {
      setSavingBruteforce(false)
    }
  }

  const loadAIData = async () => {

    setLoadingAI(true)
    try {
      const [modelsRes, keysRes, statsRes, settingsRes] = await Promise.all([
        api.get('/admin/ai/models'),
        api.get('/admin/ai/api-keys'),
        api.get('/admin/ai/stats'),
        api.get('/admin/ai/settings').catch(() => ({ data: { settings: {} } }))
      ])
      setAiModels(modelsRes.data.models || [])
      setApiKeys(keysRes.data.keys || [])
      setAiStats(statsRes.data)
      setPlatformSettings(settingsRes.data?.settings || { default_media_model: 'gemini-1.5-flash' })
    } catch (error) {
      console.error('Error loading AI data:', error)
      toast.error('Erreur lors du chargement des données IA')
    } finally {
      setLoadingAI(false)
    }
  }

  const saveDefaultMediaModel = async (value) => {
    setSavingMediaModel(true)
    try {
      const res = await api.put('/admin/ai/settings', { default_media_model: value })
      setPlatformSettings(res.data.settings || { default_media_model: value })
      toast.success('Modèle pour images et notes vocales enregistré')
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSavingMediaModel(false)
    }
  }

  const saveVoiceResponsesEnabled = async (enabled) => {
    try {
      const res = await api.put('/admin/ai/settings', { voice_responses_enabled: enabled })
      setPlatformSettings(prev => ({ ...prev, ...res.data.settings }))
      toast.success(enabled ? 'Réponses vocales activées pour la plateforme' : 'Réponses vocales désactivées pour la plateforme')
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement')
    }
  }
  
  const saveEmbeddingModel = async (value) => {
    setSavingEmbeddingModel(true)
    try {
      const res = await api.put('/admin/ai/settings', { embedding_model: value })
      setPlatformSettings(prev => ({ ...prev, ...res.data.settings }))
      toast.success('Modèle d\'embeddings mis à jour')
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSavingEmbeddingModel(false)
    }
  }

  const saveTrialDays = async (days) => {
    const parsed = parseInt(days, 10)
    if (isNaN(parsed) || parsed < 1 || parsed > 365) {
      toast.error('Le nombre de jours doit être compris entre 1 et 365')
      return
    }
    setSavingTrialDays(true)
    try {
      const res = await api.put('/admin/ai/settings', { default_trial_days: String(parsed) })
      setPlatformSettings(prev => ({ ...prev, ...res.data.settings }))
      toast.success(`Durée d'essai mise à jour : ${parsed} jours`)
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSavingTrialDays(false)
    }
  }

  const handleReindexAll = async () => {
    const ok = await showConfirm({
      title: 'Ré-indexer toute la base',
      message: 'Cette opération va régénérer tous les vecteurs avec le modèle actuel. Cela peut prendre du temps et consommer des crédits API.',
      variant: 'warning',
      confirmLabel: 'Lancer la ré-indexation'
    })
    if (!ok) return

    setReindexingAll(true)
    const toastId = toast.loading('Ré-indexation en cours...')
    try {
      const response = await api.post('/admin/ai/reindex')
      toast.success(response.data.message, { id: toastId, duration: 5000 })
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la ré-indexation', { id: toastId })
    } finally {
      setReindexingAll(false)
    }
  }

  const loadPlans = async () => {
    setLoadingPlans(true)
    try {
      const [plansRes, modelsRes] = await Promise.all([
        api.get('/admin/plans'),
        api.get('/admin/available-models')
      ])
      setPlans(Array.isArray(plansRes.data?.plans) ? plansRes.data.plans : [])
      const models = modelsRes.data?.models ?? modelsRes.data
      setAvailableModels(Array.isArray(models) ? models : [])
    } catch (error) {
      console.error('Error loading plans:', error)
      toast.error('Erreur lors du chargement des plans')
    } finally {
      setLoadingPlans(false)
    }
  }

  // Request confirmation before plan action
  const requestPlanConfirmation = (type, data, message, keyword) => {
    setConfirmAction({ type, data, message, keyword })
    setShowConfirmModal(true)
  }

  // Execute confirmed action
  const executeConfirmedAction = async () => {
    if (!confirmAction) return
    
    const { type, data } = confirmAction
    
    try {
      switch (type) {
        case 'save_plan':
          if (editingPlan?.id) {
            await api.put(`/admin/plans/${editingPlan.id}`, data)
            toast.success('Plan mis à jour')
          } else {
            await api.post('/admin/plans', data)
            toast.success('Plan créé')
          }
          setShowPlanModal(false)
          setEditingPlan(null)
          break
        case 'delete_plan':
          await api.delete(`/admin/plans/${data.id}`)
          toast.success('Plan supprimé')
          break
        case 'toggle_plan':
          await api.put(`/admin/plans/${data.id}`, { is_active: !data.is_active })
          toast.success(data.is_active ? 'Plan désactivé' : 'Plan activé')
          break
        case 'set_default':
          await api.post(`/admin/plans/${data.id}/set-default`)
          toast.success(`${data.display_name} est maintenant le plan par défaut`)
          break
        case 'restore_default_plans':
          await api.post('/admin/plans/restore-defaults')
          toast.success('Plans par défaut restaurés')
          break
        default:
          break
      }
      loadPlans()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'action')
    } finally {
      setShowConfirmModal(false)
      setConfirmAction(null)
    }
  }

  const handleSavePlan = async (planData) => {
    const action = editingPlan?.id ? 'modifier' : 'créer'
    const keyword = editingPlan?.id ? 'MODIFIER' : 'CREER'
    requestPlanConfirmation(
      'save_plan',
      planData,
      `Vous êtes sur le point de ${action} le plan "${planData.display_name}". Cette action affectera tous les utilisateurs de ce plan.`,
      keyword
    )
  }

  const handleDeletePlan = (plan) => {
    requestPlanConfirmation(
      'delete_plan',
      plan,
      `Vous êtes sur le point de SUPPRIMER le plan "${plan.display_name}". Cette action est irréversible.`,
      'SUPPRIMER'
    )
  }

  const handleTogglePlan = (plan) => {
    const action = plan.is_active ? 'DESACTIVER' : 'ACTIVER'
    requestPlanConfirmation(
      'toggle_plan',
      plan,
      `Vous êtes sur le point de ${action.toLowerCase()} le plan "${plan.display_name}". ${plan.is_active ? 'Les nouveaux utilisateurs ne pourront plus choisir ce plan.' : 'Ce plan sera à nouveau disponible.'}`,
      action
    )
  }

  const handleDuplicatePlan = async (plan) => {
    // Duplication is less dangerous, no confirmation needed
    try {
      await api.post(`/admin/plans/${plan.id}/duplicate`)
      toast.success('Plan dupliqué')
      loadPlans()
    } catch (error) {
      toast.error('Erreur lors de la duplication')
    }
  }

  const handleSetDefaultPlan = (plan) => {
    requestPlanConfirmation(
      'set_default',
      plan,
      `Vous êtes sur le point de définir "${plan.display_name}" comme plan par défaut. Tous les nouveaux utilisateurs seront automatiquement sur ce plan.`,
      'DEFAUT'
    )
  }

  const handleRestoreDefaultPlans = () => {
    requestPlanConfirmation(
      'restore_default_plans',
      {},
      'Tous les plans actuels seront supprimés et remplacés par les 5 plans par défaut (Gratuit, Starter, Pro, Business, Enterprise). Continuer ?',
      'RESTAURER'
    )
  }

  const handleToggleModel = async (model) => {
    try {
      await api.put(`/admin/ai/models/${model.id}`, { is_active: !model.is_active })
      toast.success(model.is_active ? 'Modèle désactivé' : 'Modèle activé')
      loadAIData()
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDeleteModel = async (modelId) => {
    const ok = await showConfirm({
      title: 'Supprimer ce modèle',
      message: 'Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/admin/ai/models/${modelId}`)
      toast.success('Modèle supprimé')
      loadAIData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression')
    }
  }

  const handleTestKey = async (provider) => {
    try {
      const response = await api.post(`/admin/ai/api-keys/${provider}/test`)
      if (response.data.success) {
        toast.success(`${provider}: ${response.data.message}`)
      } else {
        toast.error(`${provider}: ${response.data.message || response.data.error}`)
      }
      loadAIData()
    } catch (error) {
      toast.error(`Erreur: ${error.response?.data?.error || error.message}`)
    }
  }

  const loadStats = async () => {
    try {
      const response = await api.get('/admin/stats')
      setStats(response.data)
    } catch (error) {
      toast.error('Erreur lors du chargement des statistiques')
    } finally {
      setLoading(false)
    }
  }

  const loadAnomalyStats = async () => {
    try {
      const response = await api.get('/admin/anomalies/stats')
      setAnomalyStats(response.data)
    } catch (error) {
      console.error('Error loading anomaly stats:', error)
    }
  }

  // (Anomalies handlers moved to AnomaliesTab)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: pagination.limit,
        offset: pagination.offset,
        ...(searchQuery && { search: searchQuery }),
        ...(selectedPlan && { plan: selectedPlan }),
        ...(selectedStatus && { status: selectedStatus })
      })
      const response = await api.get(`/admin/users?${params}`)
      setUsers(response.data.users)
      setPagination(prev => ({ ...prev, total: response.data.total }))
    } catch (error) {
      toast.error('Erreur lors du chargement des utilisateurs')
    } finally {
      setLoading(false)
    }
  }

  const loadAuditLogs = async () => {
    setLoadingAuditLogs(true)
    try {
      const params = new URLSearchParams({
        limit: auditPagination.limit,
        offset: auditPagination.offset,
        ...(auditFilters.action && { action: auditFilters.action }),
        ...(auditFilters.actionExact && { actionExact: auditFilters.actionExact }),
        ...(auditFilters.userId && { userId: auditFilters.userId }),
        ...(auditFilters.entityType && { entityType: auditFilters.entityType }),
        ...(auditFilters.dateFrom && { dateFrom: auditFilters.dateFrom }),
        ...(auditFilters.dateTo && { dateTo: auditFilters.dateTo + 'T23:59:59' }),
        ...(auditFilters.ip && { ip: auditFilters.ip }),
        ...(auditFilters.onlyErrors && { onlyErrors: 'true' })
      })
      const response = await api.get(`/admin/audit-logs?${params}`)
      setAuditLogs(response.data.logs)
      setAuditPagination(prev => ({ ...prev, total: response.data.total }))
    } catch (error) {
      toast.error('Erreur lors du chargement des logs')
    } finally {
      setLoadingAuditLogs(false)
    }
  }

  const handleRollback = async (logId) => {
    try {
      if (!window.confirm('Êtes-vous sûr de vouloir annuler cette action ? Cela restaurera les valeurs précédentes.')) {
        return;
      }
      
      const response = await api.post(`/admin/audit-logs/${logId}/rollback`)
      toast.success(response.data.message || 'Action annulée')
      loadAuditLogs()
      
      // Also reload associated data depending on where we are
      if (activeTab === 'users') loadUsers()
      if (activeTab === 'plans') loadPlans()
      if (activeTab === 'ai-models') loadAIData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'annulation')
    }
  }

  const handleViewUserLogs = (user) => {
    setAuditFilters({ action: '', actionExact: '', userId: user.id, entityType: '', dateFrom: '', dateTo: '', ip: '', onlyErrors: false })
    setActiveTab('activity')
  }

  const handleDeleteUser = async (userId) => {
    // Open preview modal instead of immediate delete
    setUserToDelete(userId)
    setLoadingPreview(true)
    setShowDeleteModal(true)
    
    try {
      const response = await api.get(`/admin/users/${userId}/deletion-preview`)
      setDeletePreview(response.data)
    } catch (error) {
      toast.error('Erreur lors du chargement des données')
      setShowDeleteModal(false)
    } finally {
      setLoadingPreview(false)
    }
  }

  const confirmDeleteUser = async (softDelete = false) => {
    if (!userToDelete) return
    
    try {
      const url = softDelete 
        ? `/admin/users/${userToDelete}?soft_delete=true`
        : `/admin/users/${userToDelete}`
      await api.delete(url)
      toast.success(softDelete ? 'Utilisateur désactivé' : 'Utilisateur supprimé définitivement')
      setShowDeleteModal(false)
      setUserToDelete(null)
      setDeletePreview(null)
      loadUsers()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression')
    }
  }

  const handleRestoreUser = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/restore`)
      toast.success('Utilisateur restauré')
      loadUsers()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la restauration')
    }
  }

  const handleToggleAdmin = async (user) => {
    if (user.is_admin) {
      try {
        await api.put(`/admin/users/${user.id}`, { is_admin: 0 })
        toast.success('Droits admin retirés')
        loadUsers()
      } catch (error) {
        toast.error('Erreur lors de la mise à jour')
      }
      return
    }
    setPromoteAdminModal({ open: true, user })
    setPromoteAdminConfirmInput('')
  }

  const confirmPromoteToAdmin = async () => {
    if (!promoteAdminModal.user || promoteAdminConfirmInput.trim() !== 'CONFIRMER') return
    try {
      await api.put(`/admin/users/${promoteAdminModal.user.id}`, { is_admin: 1 })
      toast.success('Droits admin accordés')
      setPromoteAdminModal({ open: false, user: null })
      setPromoteAdminConfirmInput('')
      loadUsers()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour')
    }
  }

  const handleToggleActive = async (user) => {
    try {
      await api.put(`/admin/users/${user.id}`, { is_active: user.is_active ? 0 : 1 })
      toast.success(user.is_active ? 'Compte désactivé' : 'Compte activé')
      loadUsers()
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0 pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-100">Administration</h1>
        <p className="text-gray-400">Gérez les utilisateurs et supervisez votre plateforme</p>
      </div>

      {/* Tabs - scroll horizontal on small screens so "Modèles IA" and "Plans" are visible */}
      <div className="mb-6 border-b border-space-700 overflow-x-auto overflow-y-hidden -mx-1 px-1 sm:mx-0 sm:px-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-1 sm:gap-4 min-w-max">
          {(adminCaps.canViewStats || adminCaps.isFullAdmin) && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-shrink-0 pb-3 px-3 sm:px-4 border-b-2 transition-colors touch-target flex items-center gap-2 ${
                activeTab === 'dashboard' 
                  ? 'border-gold-400 text-gold-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <TrendingUp className="w-5 h-5 flex-shrink-0" />
              <span className="whitespace-nowrap">Dashboard</span>
            </button>
          )}
          {(adminCaps.canViewStats || adminCaps.isFullAdmin) && (
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-shrink-0 pb-3 px-3 sm:px-4 border-b-2 transition-colors touch-target flex items-center gap-2 ${
                activeTab === 'activity' 
                  ? 'border-gold-400 text-gold-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Activity className="w-5 h-5 flex-shrink-0" />
              <span className="whitespace-nowrap">Journal d'activité</span>
            </button>
          )}
          {(adminCaps.canManageUsers || adminCaps.isFullAdmin) && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-shrink-0 pb-3 px-3 sm:px-4 border-b-2 transition-colors touch-target flex items-center gap-2 ${
                activeTab === 'users' 
                  ? 'border-gold-400 text-gold-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Users className="w-5 h-5 flex-shrink-0" />
              <span className="whitespace-nowrap">Utilisateurs</span>
            </button>
          )}
          {(adminCaps.canViewStats || adminCaps.isFullAdmin) && (
            <button
              onClick={() => setActiveTab('anomalies')}
              className={`flex-shrink-0 pb-3 px-3 sm:px-4 border-b-2 transition-colors relative touch-target flex items-center gap-2 ${
                activeTab === 'anomalies' 
                  ? 'border-red-400 text-red-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="whitespace-nowrap">Anomalies</span>
              {anomalyStats.total > 0 && (
                <span className="absolute -top-1 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {anomalyStats.total > 99 ? '99+' : anomalyStats.total}
                </span>
              )}
            </button>
          )}
          {(adminCaps.canManageAI || adminCaps.isFullAdmin) && (
            <button
              onClick={() => setActiveTab('ai-models')}
              className={`flex-shrink-0 pb-3 px-3 sm:px-4 border-b-2 transition-colors touch-target flex items-center gap-2 ${
                activeTab === 'ai-models' 
                  ? 'border-blue-400 text-blue-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Cpu className="w-5 h-5 flex-shrink-0" />
              <span className="whitespace-nowrap">Modèles IA</span>
            </button>
          )}
          {(adminCaps.canManagePlans || adminCaps.isFullAdmin) && (
            <button
              onClick={() => setActiveTab('plans')}
              className={`flex-shrink-0 pb-3 px-3 sm:px-4 border-b-2 transition-colors touch-target flex items-center gap-2 ${
                activeTab === 'plans' 
                  ? 'border-blue-400 text-blue-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <CreditCard className="w-5 h-5 flex-shrink-0" />
              <span className="whitespace-nowrap">Plans</span>
            </button>
          )}
          {(adminCaps.canManagePlans || adminCaps.isFullAdmin) && (
            <button
              onClick={() => setActiveTab('coupons')}
              className={`flex-shrink-0 pb-3 px-3 sm:px-4 border-b-2 transition-colors touch-target flex items-center gap-2 ${
                activeTab === 'coupons' 
                  ? 'border-gold-400 text-gold-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Ticket className="w-5 h-5 flex-shrink-0" />
              <span className="whitespace-nowrap">Coupons</span>
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <DashboardContent 
          stats={stats} 
          loading={loading} 
          anomalyStats={anomalyStats} 
          onTabChange={setActiveTab}
          bruteforceSettings={bruteforceSettings}
          loadingBruteforce={loadingBruteforce}
          savingBruteforce={savingBruteforce}
          onChangeBruteforce={saveBruteforceSettings}
        />
      )}

      {/* Anomalies Tab */}
      {activeTab === 'anomalies' && (
        <AnomaliesTab />
      )}

      {/* AI Models Tab */}
      {activeTab === 'ai-models' && (
        <AIModelsContent
          models={aiModels}
          apiKeys={apiKeys}
          stats={aiStats}
          loading={loadingAI}
          platformSettings={platformSettings}
          savingMediaModel={savingMediaModel}
          onSaveMediaModel={saveDefaultMediaModel}
          savingEmbeddingModel={savingEmbeddingModel}
          onSaveEmbeddingModel={saveEmbeddingModel}
          reindexingAll={reindexingAll}
          onReindexAll={handleReindexAll}
          onSaveVoiceResponsesEnabled={saveVoiceResponsesEnabled}
          onSaveTrialDays={saveTrialDays}
          savingTrialDays={savingTrialDays}
          onToggleModel={handleToggleModel}
          onDeleteModel={handleDeleteModel}
          onEditModel={(model) => { setEditingModel(model); setShowModelModal(true); }}
          onCreateModel={() => { setEditingModel(null); setShowModelModal(true); }}
          onEditKey={(key) => { setEditingKey(key); setShowKeyModal(true); }}
          onTestKey={handleTestKey}
          onTestModel={(model) => setTestingModel(model)}
          onRefresh={loadAIData}
        />
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <PlansContent
          plans={plans}
          availableModels={availableModels}
          loading={loadingPlans}
          onEditPlan={(plan) => { setEditingPlan(plan); setShowPlanModal(true); }}
          onCreatePlan={() => { setEditingPlan(null); setShowPlanModal(true); }}
          onDeletePlan={handleDeletePlan}
          onTogglePlan={handleTogglePlan}
          onDuplicatePlan={handleDuplicatePlan}
          onSetDefault={handleSetDefaultPlan}
          onRestoreDefaults={handleRestoreDefaultPlans}
          onRefresh={loadPlans}
        />
      )}

      {/* Coupons Tab */}
      {activeTab === 'coupons' && (
        <CouponsContent users={users} />
      )}

      {activeTab === 'activity' && (
        <AuditLogsContent
          logs={auditLogs}
          loading={loadingAuditLogs}
          pagination={auditPagination}
          filters={auditFilters}
          onFilterChange={(next) => {
            setAuditFilters(next)
            setAuditPagination(prev => ({ ...prev, offset: 0 }))
          }}
          onPageChange={(offset) => setAuditPagination(prev => ({ ...prev, offset }))}
          onRefresh={loadAuditLogs}
          onRollback={handleRollback}
          filterUserName={auditFilters.userId ? (users.find(u => u.id === auditFilters.userId)?.name || null) : null}
        />
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <UsersContent 
          users={users}
          plans={plans}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          pagination={pagination}
          setPagination={setPagination}
          onDelete={handleDeleteUser}
          onToggleAdmin={handleToggleAdmin}
          onToggleActive={handleToggleActive}
          onRestore={handleRestoreUser}
          onEdit={(user) => { setSelectedUser(user); setShowUserModal(true); }}
          onCreate={() => setShowCreateModal(true)}
          onRefresh={loadUsers}
          onViewLogs={handleViewUserLogs}
          formatDate={formatDate}
        />
      )}

      {/* Edit User Modal */}
      {showUserModal && selectedUser && (
        <EditUserModal 
          user={selectedUser}
          plans={plans}
          allUsers={users}
          onClose={() => { setShowUserModal(false); setSelectedUser(null); }}
          onSave={() => { setShowUserModal(false); setSelectedUser(null); loadUsers(); }}
        />
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal 
          plans={plans}
          allUsers={users}
          onClose={() => { setShowCreateModal(false); }}
          onSave={() => { setShowCreateModal(false); loadUsers(); }}
        />
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteModal && (
        <DeleteUserModal
          loading={loadingPreview}
          preview={deletePreview}
          onClose={() => { setShowDeleteModal(false); setUserToDelete(null); setDeletePreview(null); }}
          onSoftDelete={() => confirmDeleteUser(true)}
          onHardDelete={() => confirmDeleteUser(false)}
        />
      )}

      {/* Promote to Admin - validation écrite */}
      {promoteAdminModal.open && promoteAdminModal.user && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="relative z-10 card w-full max-w-md p-6 rounded-t-2xl sm:rounded-2xl shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gold-400/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <h3 className="text-lg font-display font-semibold text-gray-100">Accorder les droits administrateur</h3>
                <p className="text-sm text-gray-400">
                  {promoteAdminModal.user.email}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-4">
              Cette action donnera à cet utilisateur un accès complet à l&apos;administration (plans, utilisateurs, paramètres). Pour confirmer, tapez <strong className="text-gold-400">CONFIRMER</strong> ci-dessous.
            </p>
            <input
              type="text"
              value={promoteAdminConfirmInput}
              onChange={(e) => setPromoteAdminConfirmInput(e.target.value)}
              placeholder="CONFIRMER"
              className="input-dark w-full mb-4 font-mono uppercase"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setPromoteAdminModal({ open: false, user: null }); setPromoteAdminConfirmInput(''); }}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmPromoteToAdmin}
                disabled={promoteAdminConfirmInput.trim() !== 'CONFIRMER'}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Model Modal */}
      {showModelModal && (
        <AIModelModal
          model={editingModel}
          onClose={() => { setShowModelModal(false); setEditingModel(null); }}
          onSave={() => { setShowModelModal(false); setEditingModel(null); loadAIData(); }}
        />
      )}

      {/* API Key Modal */}
      {showKeyModal && (
        <APIKeyModal
          keyData={editingKey}
          onClose={() => { setShowKeyModal(false); setEditingKey(null); }}
          onSave={() => { setShowKeyModal(false); setEditingKey(null); loadAIData(); }}
        />
      )}

      {/* Plan Modal */}
      {showPlanModal && (
        <PlanModal
          plan={editingPlan}
          availableModels={availableModels}
          onClose={() => { setShowPlanModal(false); setEditingPlan(null); }}
          onSave={handleSavePlan}
        />
      )}

      {/* Confirmation Modal for dangerous actions */}
      {showConfirmModal && confirmAction && (
        <ConfirmActionModal
          message={confirmAction.message}
          keyword={confirmAction.keyword}
          onConfirm={executeConfirmedAction}
          onCancel={() => { setShowConfirmModal(false); setConfirmAction(null); }}
        />
      )}

      {/* Model Test Modal */}
      {testingModel && (
        <AIModelTestModal 
          model={testingModel} 
          onClose={() => setTestingModel(null)} 
        />
      )}
    </div>
  )
}

// ─── Contextual User Audit History (used inside EditUserModal) ───────────────
function UserAuditHistory({ userId }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    api.get(`/admin/audit-logs?userId=${userId}&limit=30`)
      .then(res => setLogs(res.data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [userId])

  const ACTION_LABELS = {
    login: 'Connexion', register: 'Inscription', login_failed: 'Échec connexion',
    create_user: 'Création compte', update_user: 'Profil modifié', soft_delete_user: 'Désactivé',
    hard_delete_user: 'Suppression définitive', restore_user: 'Restauration',
    reset_password: 'Réinit. MDP', add_credits: 'Crédits ajoutés', create_agent: 'Agent créé',
    update_agent: 'Agent modifié', delete_agent: 'Agent supprimé', rollback_action: 'Rollback',
    update_plan: 'Plan mis à jour', update_ai_model: 'Modèle IA modifié',
    add_knowledge: 'Connaissance ajoutée', upload_knowledge: 'Fichier uploadé',
  }

  const getColor = (action) => {
    if (action?.includes('delete') || action === 'login_failed') return 'text-red-400 bg-red-400/10'
    if (action?.includes('create')) return 'text-emerald-400 bg-emerald-400/10'
    if (action?.includes('login')) return 'text-blue-400 bg-blue-400/10'
    if (action?.includes('rollback')) return 'text-amber-400 bg-amber-400/10'
    return 'text-gray-400 bg-gray-400/10'
  }

  const formatRelTime = (d) => {
    const diff = (Date.now() - new Date(d)) / 1000
    if (diff < 60) return 'À l\'instant'
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}m`
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`
    return new Date(d).toLocaleDateString('fr-FR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 text-sm">
        <Activity className="w-10 h-10 mb-3 opacity-30" />
        Aucune activité enregistrée
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-space-800/50" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      {logs.map(log => {
        const details = typeof log.details === 'string' ? JSON.parse(log.details || '{}') : (log.details || {})
        const colorClass = getColor(log.action)
        return (
          <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
            <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs ${colorClass}`}>
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-200">
                {ACTION_LABELS[log.action] || log.action}
              </p>
              {details.geo && (
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <span title={`${details.geo.city}, ${details.geo.country}`}>{details.geo.emoji}</span>
                  {log.ip_address}
                </p>
              )}
              {!details.geo && log.ip_address && (
                <p className="text-[10px] text-gray-500 font-mono">{log.ip_address}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-gray-500 whitespace-nowrap flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelTime(log.created_at)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RbacRoleSelector({ selectedRoles = [], availableRoles = [], onChange }) {
  const toggleRole = (roleKey) => {
    if (selectedRoles.includes(roleKey)) {
      onChange(selectedRoles.filter(r => r !== roleKey))
    } else {
      onChange([...selectedRoles, roleKey])
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {availableRoles.map((role) => {
        const isSelected = selectedRoles.includes(role.key)
        return (
          <button
            key={role.key}
            type="button"
            onClick={() => toggleRole(role.key)}
            className={`flex flex-col items-start p-3 rounded-xl border transition-all text-left group ${
              isSelected 
                ? 'bg-gold-400/10 border-gold-400/50 ring-1 ring-gold-400/20' 
                : 'bg-space-800/50 border-space-700 hover:border-space-500'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-gold-400' : 'text-gray-400'}`}>
                {role.name}
              </span>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                isSelected ? 'bg-gold-400 border-gold-400' : 'border-space-500'
              }`}>
                {isSelected && <Zap className="w-2.5 h-2.5 text-space-950 fill-current" />}
              </div>
            </div>
            <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed group-hover:text-gray-400 transition-colors">
              {role.description}
            </p>
          </button>
        )
      })}
    </div>
  )
}

// Edit User Modal
function EditUserModal({ user, onClose, onSave, plans = [], rolesList = [] }) {
  const [activeTab, setActiveTab] = useState('edit')
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    company: user.company || '',
    plan: user.plan,
    credits: user.credits,
    is_admin: user.is_admin,
    can_manage_users: user.can_manage_users || 0,
    can_manage_plans: user.can_manage_plans || 0,
    can_view_stats: user.can_view_stats || 0,
    can_manage_ai: user.can_manage_ai || 0,
    can_manage_tickets: user.can_manage_tickets || 0,
    is_active: user.is_active,
    ...Object.fromEntries(PLAN_MODULES.map(m => [m.key, !!user[m.key]])),
    roles: user.roles || [],
    subscription_end_date: user.subscription_end_date ? new Date(user.subscription_end_date).toISOString().slice(0, 10) : ''
  })

  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmAdminInput, setConfirmAdminInput] = useState('')
  const isPromotingToAdmin = formData.is_admin === 1 && user.is_admin !== 1
  const canSubmit = !isPromotingToAdmin || confirmAdminInput.trim() === 'CONFIRMER'

  // Plans actifs uniquement pour l’assignation
  const activePlans = (plans || []).filter(p => p.is_active !== false && p.is_active !== 0)
  // Si le plan actuel de l’utilisateur est désactivé, basculer sur le plan par défaut ou le premier actif
  useEffect(() => {
    if (activePlans.length === 0) return
    const currentIsActive = activePlans.some(p => (p.name || p.id) === formData.plan)
    if (!currentIsActive) {
      const defaultPlan = activePlans.find(p => p.is_default) || activePlans[0]
      const fallback = defaultPlan?.name || defaultPlan?.id || 'free'
      setFormData(prev => ({ ...prev, plan: fallback, credits: getCreditsForPlan(plans, fallback) }))
    }
  }, [activePlans.length])

  const handlePlanChange = (planId) => {
    const defaultCredits = getCreditsForPlan(plans, planId)
    setFormData(prev => ({ ...prev, plan: planId, credits: defaultCredits }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put(`/admin/users/${user.id}`, {
        ...formData
      })
      
      if (newPassword) {
        await api.post(`/admin/users/${user.id}/reset-password`, { new_password: newPassword })
      }
      
      toast.success('Utilisateur mis à jour')
      onSave()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-md bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-fadeIn flex flex-col max-h-[90dvh] sm:max-h-[85vh] max-sm:rounded-b-none overflow-hidden">
        <div className="flex-shrink-0 border-b border-space-700">
          <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-0" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
            <div>
              <h3 className="text-lg font-display font-semibold text-gray-100">{user.name}</h3>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <button onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex px-4 sm:px-5 mt-3">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'edit' ? 'border-gold-400 text-gold-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              Modifier
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'history' ? 'border-blue-400 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <Activity className="w-3.5 h-3.5" />
              Historique
            </button>
          </div>
        </div>

        {activeTab === 'history' ? (
          <UserAuditHistory userId={user.id} />
        ) : (
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nom</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-dark w-full min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-dark w-full min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Entreprise</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="input-dark w-full min-h-[44px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Plan</label>
              <select
                value={activePlans.some(p => (p.name || p.id) === formData.plan) ? formData.plan : (activePlans.find(p => p.is_default)?.name || activePlans[0]?.name || 'free')}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="input-dark w-full min-h-[44px]"
              >
                {activePlans.length > 0
                  ? activePlans.map(p => (
                      <option key={p.id ?? p.name} value={p.name ?? p.id}>
                        {p.display_name ?? p.name}
                      </option>
                    ))
                  : (
                    <>
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </>
                  )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Crédits</label>
              <input
                type="number"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: e.target.value === '' ? 0 : parseInt(e.target.value, 10) })}
                className="input-dark w-full min-h-[44px]"
                placeholder="-1 = illimité"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 py-2">
            <label className="flex items-center gap-2 cursor-pointer bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 hover:bg-blue-500/10 transition-colors">
              <input
                type="checkbox"
                checked={formData.generate_coupon}
                onChange={(e) => setFormData({ ...formData, generate_coupon: e.target.checked })}
                className="w-5 h-5 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gold-400">Créer un coupon d'influenceur</span>
                <span className="text-[10px] text-gray-500">Génère automatiquement un code promo et assigne le rôle Influenceur</span>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer py-2">
              <input
                type="checkbox"
                checked={formData.is_admin}
                onChange={(e) => {
                  const val = e.target.checked ? 1 : 0;
                  setFormData({ 
                    ...formData, 
                    is_admin: val,
                    can_manage_users: val,
                    can_manage_plans: val,
                    can_view_stats: val,
                    can_manage_ai: val,
                    can_manage_tickets: val
                  });
                  if (!e.target.checked) setConfirmAdminInput('');
                }}
                className="w-5 h-5 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
              />
              <span className="text-sm text-gray-300">Administrateur</span>
            </label>
            <div className="ml-7 space-y-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={formData.can_manage_users}
                  onChange={(e) => {
                    const newVal = e.target.checked ? 1 : 0;
                    const nextData = { ...formData, can_manage_users: newVal };
                    const allChecked = newVal && nextData.can_manage_plans && nextData.can_view_stats && nextData.can_manage_ai && nextData.can_manage_tickets;
                    setFormData({ ...nextData, is_admin: allChecked ? 1 : 0 });
                  }}
                  className="w-4 h-4 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
                />
                <span className="text-xs text-gray-400">Gérer les utilisateurs</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={formData.can_manage_plans}
                  onChange={(e) => {
                    const newVal = e.target.checked ? 1 : 0;
                    const nextData = { ...formData, can_manage_plans: newVal };
                    const allChecked = nextData.can_manage_users && newVal && nextData.can_view_stats && nextData.can_manage_ai && nextData.can_manage_tickets;
                    setFormData({ ...nextData, is_admin: allChecked ? 1 : 0 });
                  }}
                  className="w-4 h-4 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
                />
                <span className="text-xs text-gray-400">Gérer les plans</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={formData.can_view_stats}
                  onChange={(e) => {
                    const newVal = e.target.checked ? 1 : 0;
                    const nextData = { ...formData, can_view_stats: newVal };
                    const allChecked = nextData.can_manage_users && nextData.can_manage_plans && newVal && nextData.can_manage_ai && nextData.can_manage_tickets;
                    setFormData({ ...nextData, is_admin: allChecked ? 1 : 0 });
                  }}
                  className="w-4 h-4 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
                />
                <span className="text-xs text-gray-400">Voir les statistiques</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={formData.can_manage_ai}
                  onChange={(e) => {
                    const newVal = e.target.checked ? 1 : 0;
                    const nextData = { ...formData, can_manage_ai: newVal };
                    const allChecked = nextData.can_manage_users && nextData.can_manage_plans && nextData.can_view_stats && newVal && nextData.can_manage_tickets;
                    setFormData({ ...nextData, is_admin: allChecked ? 1 : 0 });
                  }}
                  className="w-4 h-4 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
                />
                <span className="text-xs text-gray-400">Gérer l'IA</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={formData.can_manage_tickets}
                  onChange={(e) => {
                    const newVal = e.target.checked ? 1 : 0;
                    const nextData = { ...formData, can_manage_tickets: newVal };
                    const allChecked = nextData.can_manage_users && nextData.can_manage_plans && nextData.can_view_stats && nextData.can_manage_ai && newVal;
                    setFormData({ ...nextData, is_admin: allChecked ? 1 : 0 });
                  }}
                  className="w-4 h-4 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
                />
                <span className="text-xs text-gray-400">Gestion tickets</span>
              </label>
            </div>
            <label className="flex items-center gap-2 cursor-pointer py-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                className="w-5 h-5 rounded border-space-700 bg-space-800 text-emerald-400 focus:ring-emerald-400"
              />
              <span className="text-sm text-gray-300">Compte actif</span>
            </label>

            <div className="pt-3 border-t border-space-700">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Modules activables</h4>
              <p className="text-xs text-gray-500 mb-3">Activez ces modules pour cet utilisateur (en plus de ceux inclus dans son plan) :</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PLAN_MODULES.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-space-700 hover:border-space-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={!!formData[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                      className="w-4 h-4 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
                    />
                    <span className="text-sm text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {formData.is_admin === 1 && (
            <div className="pt-2 border-t border-space-700">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Rôles Administrateur</h4>
              <RbacRoleSelector 
                selectedRoles={formData.roles}
                availableRoles={rolesList}
                onChange={(roles) => setFormData({ ...formData, roles })}
              />
            </div>
          )}


          {isPromotingToAdmin && (
            <div className="p-4 rounded-xl bg-gold-400/10 border border-gold-400/30">
              <p className="text-sm text-gray-300 mb-2">
                Pour confirmer, tapez <strong className="text-gold-400">CONFIRMER</strong>
              </p>
              <input
                type="text"
                value={confirmAdminInput}
                onChange={(e) => setConfirmAdminInput(e.target.value)}
                placeholder="CONFIRMER"
                className="input-dark w-full font-mono uppercase text-sm min-h-[44px]"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date fin d'abonnement
            </label>
            <div className="flex flex-col gap-2">
              <DatePicker
                selected={formData.subscription_end_date ? new Date(formData.subscription_end_date) : null}
                onChange={(date) => setFormData({ ...formData, subscription_end_date: date ? date.toISOString().slice(0, 10) : '' })}
                dateFormat="dd/MM/yyyy"
                locale="fr"
                className="input-dark w-full min-h-[44px]"
                placeholderText="Choisir une date"
              />
              <div className="flex gap-2">
                {[7, 14, 30].map(days => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + days);
                      setFormData({ ...formData, subscription_end_date: d.toISOString().slice(0, 10) });
                    }}
                    className="flex-1 text-xs py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors"
                  >
                    +{days}j
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="input-dark w-full min-h-[44px]"
              autoComplete="new-password"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary min-h-[48px]">
              Annuler
            </button>
            <button type="submit" disabled={saving || !canSubmit} className="flex-1 btn-primary min-h-[48px] disabled:opacity-50">
              {saving ? '...' : 'Enregistrer'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>,
    document.body
  )
}

// Create User Modal
function CreateUserModal({ onClose, onSave, plans = [], rolesList = [] }) {
  const activePlans = (plans || []).filter(p => p.is_active !== false && p.is_active !== 0)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    company: '',
    plan: 'free',
    credits: 500,
    is_admin: 0,
    can_manage_users: 0,
    can_manage_plans: 0,
    can_view_stats: 0,
    can_manage_ai: 0,
    can_manage_tickets: 0,
    ...Object.fromEntries(PLAN_MODULES.map(m => [m.key, false])),
    generate_coupon: false,
    roles: []
  })

  const [saving, setSaving] = useState(false)
  const initialCreditsSyncedRef = useRef(false)

  // Initialiser plan et crédits selon un plan actif quand la liste des plans est disponible (une seule fois)
  useEffect(() => {
    if (activePlans.length > 0 && !initialCreditsSyncedRef.current) {
      initialCreditsSyncedRef.current = true
      const defaultPlan = activePlans.find(p => p.is_default) || activePlans.find(p => p.name === 'free') || activePlans[0]
      const planName = defaultPlan?.name ?? defaultPlan?.id ?? 'free'
      setFormData(prev => ({ ...prev, plan: planName, credits: getCreditsForPlan(plans, planName) }))
    }
  }, [plans])

  const handlePlanChange = (planId) => {
    const defaultCredits = getCreditsForPlan(plans, planId)
    setFormData(prev => ({ ...prev, plan: planId, credits: defaultCredits }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/admin/users', { ...formData })
      toast.success('Utilisateur créé')
      onSave()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la création')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-md bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-fadeIn flex flex-col max-h-[90dvh] sm:max-h-[85vh] max-sm:rounded-b-none overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-space-700" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <h3 className="text-lg font-display font-semibold text-gray-100">Nouvel utilisateur</h3>
          <button onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nom *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-dark w-full min-h-[44px]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-dark w-full min-h-[44px]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Mot de passe *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input-dark w-full min-h-[44px]"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Entreprise</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="input-dark w-full min-h-[44px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Plan</label>
              <select
                value={activePlans.some(p => (p.name || p.id) === formData.plan) ? formData.plan : (activePlans.find(p => p.is_default)?.name || activePlans[0]?.name || 'free')}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="input-dark w-full min-h-[44px]"
              >
                {activePlans.length > 0
                  ? activePlans.map(p => (
                      <option key={p.id ?? p.name} value={p.name ?? p.id}>
                        {p.display_name ?? p.name}
                      </option>
                    ))
                  : (
                    <>
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </>
                  )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Crédits</label>
              <input
                type="number"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: e.target.value === '' ? 0 : parseInt(e.target.value, 10) })}
                className="input-dark w-full min-h-[44px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={formData.is_admin}
                onChange={(e) => {
                  const val = e.target.checked ? 1 : 0;
                  setFormData({ 
                    ...formData, 
                    is_admin: val,
                    can_manage_users: val,
                    can_manage_plans: val,
                    can_view_stats: val,
                    can_manage_ai: val,
                    can_manage_tickets: val
                  });
                }}
                className="w-5 h-5 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
              />
              <span className="text-sm text-gray-300">Administrateur</span>
            </label>
            <div className="ml-7 space-y-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={formData.can_manage_users}
                  onChange={(e) => {
                    const newVal = e.target.checked ? 1 : 0;
                    const nextData = { ...formData, can_manage_users: newVal };
                    const allChecked = newVal && nextData.can_manage_plans && nextData.can_view_stats && nextData.can_manage_ai && nextData.can_manage_tickets;
                    setFormData({ ...nextData, is_admin: allChecked ? 1 : 0 });
                  }}
                  className="w-4 h-4 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
                />
                <span className="text-xs text-gray-400">Gérer les utilisateurs</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={formData.can_manage_plans}
                  onChange={(e) => {
                    const newVal = e.target.checked ? 1 : 0;
                    const nextData = { ...formData, can_manage_plans: newVal };
                    const allChecked = nextData.can_manage_users && newVal && nextData.can_view_stats && nextData.can_manage_ai && nextData.can_manage_tickets;
                    setFormData({ ...nextData, is_admin: allChecked ? 1 : 0 });
                  }}
                  className="w-4 h-4 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
                />
                <span className="text-xs text-gray-400">Gérer les plans</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={formData.can_view_stats}
                  onChange={(e) => {
                    const newVal = e.target.checked ? 1 : 0;
                    const nextData = { ...formData, can_view_stats: newVal };
                    const allChecked = nextData.can_manage_users && nextData.can_manage_plans && newVal && nextData.can_manage_ai && nextData.can_manage_tickets;
                    setFormData({ ...nextData, is_admin: allChecked ? 1 : 0 });
                  }}
                  className="w-4 h-4 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
                />
                <span className="text-xs text-gray-400">Voir les statistiques</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={formData.can_manage_ai}
                  onChange={(e) => {
                    const newVal = e.target.checked ? 1 : 0;
                    const nextData = { ...formData, can_manage_ai: newVal };
                    const allChecked = nextData.can_manage_users && nextData.can_manage_plans && nextData.can_view_stats && newVal && nextData.can_manage_tickets;
                    setFormData({ ...nextData, is_admin: allChecked ? 1 : 0 });
                  }}
                  className="w-4 h-4 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
                />
                <span className="text-xs text-gray-400">Gérer l'IA</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={formData.can_manage_tickets}
                  onChange={(e) => {
                    const newVal = e.target.checked ? 1 : 0;
                    const nextData = { ...formData, can_manage_tickets: newVal };
                    const allChecked = nextData.can_manage_users && nextData.can_manage_plans && nextData.can_view_stats && nextData.can_manage_ai && newVal;
                    setFormData({ ...nextData, is_admin: allChecked ? 1 : 0 });
                  }}
                  className="w-4 h-4 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
                />
                <span className="text-xs text-gray-400">Gestion tickets</span>
              </label>
            </div>
            <div className="pt-3 border-t border-space-700">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Modules activables</h4>
              <p className="text-xs text-gray-500 mb-3">Activez ces modules pour cet utilisateur (en plus de ceux inclus dans son plan) :</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PLAN_MODULES.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-space-700 hover:border-space-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={!!formData[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                      className="w-4 h-4 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
                    />
                    <span className="text-sm text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {formData.is_admin === 1 && (
            <div className="pt-2 border-t border-space-700">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Rôles Administrateur</h4>
              <RbacRoleSelector 
                selectedRoles={formData.roles}
                availableRoles={rolesList}
                onChange={(roles) => setFormData({ ...formData, roles })}
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary min-h-[48px]">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary min-h-[48px]">
              {saving ? '...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// Delete User Modal with Preview
function DeleteUserModal({ loading, preview, onClose, onSoftDelete, onHardDelete }) {
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleHardDelete = async () => {
    setDeleting(true)
    await onHardDelete()
    setDeleting(false)
  }

  const handleSoftDelete = async () => {
    setDeleting(true)
    await onSoftDelete()
    setDeleting(false)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-lg bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-fadeIn flex flex-col max-h-[90dvh] sm:max-h-[85vh] max-sm:rounded-b-none overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-space-700 flex-shrink-0" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-display font-semibold text-gray-100 truncate">Supprimer l'utilisateur</h2>
              <p className="text-sm text-gray-400">Cette action est irréversible</p>
            </div>
            <button onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
            </div>
          ) : preview ? (
            <div className="space-y-6">
              <div className="bg-space-800/50 border border-space-700 rounded-2xl p-4">
                <p className="text-gray-100 font-medium">{preview.user.name}</p>
                <p className="text-sm text-gray-400">{preview.user.email}</p>
              </div>

              {preview.warning && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-400">{preview.warning}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Données impactées</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-space-950/50 border border-space-700/50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-gray-100">{preview.stats.agents}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Agents</p>
                  </div>
                  <div className="bg-space-950/50 border border-space-700/50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-gray-100">{preview.stats.conversations}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Conv.</p>
                  </div>
                  <div className="bg-space-950/50 border border-space-700/50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-gray-100">{preview.stats.messages}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Messages</p>
                  </div>
                  <div className="bg-space-950/50 border border-space-700/50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-gray-100">{preview.stats.knowledgeItems}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Savoirs</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Pour confirmer, tapez SUPPRIMER</h3>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Tapez SUPPRIMER"
                  className="input-dark w-full text-center font-mono uppercase min-h-[44px]"
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="p-4 sm:p-6 border-t border-space-700 bg-space-900/50 flex flex-col gap-3" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
          <div className="flex gap-3">
            <button
              onClick={handleSoftDelete}
              disabled={deleting || loading}
              className="flex-1 px-4 py-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl hover:bg-amber-500/30 transition-all font-medium min-h-[48px]"
            >
              {deleting ? '...' : 'Désactiver'}
            </button>
            <button
              onClick={handleHardDelete}
              disabled={deleting || loading || confirmText !== 'SUPPRIMER'}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium disabled:opacity-50 min-h-[48px]"
            >
              {deleting ? '...' : 'Supprimer'}
            </button>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="w-full btn-secondary min-h-[44px] text-sm"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function AIModelsContent({ 
  models, apiKeys, stats, loading, 
  platformSettings = {}, savingMediaModel, onSaveMediaModel, 
  savingEmbeddingModel, onSaveEmbeddingModel,
  reindexingAll, onReindexAll,
  onSaveVoiceResponsesEnabled,
  onSaveTrialDays, savingTrialDays,
  onToggleModel, onDeleteModel, onEditModel, onCreateModel,
  onEditKey, onTestKey, onTestModel, onRefresh 
}) {
  const [showKeys, setShowKeys] = useState({})
  const [trialDaysInput, setTrialDaysInput] = useState(platformSettings.default_trial_days || '7')
  const mediaModelValue = platformSettings.default_media_model || 'gemini-1.5-flash'
  const embeddingModelValue = platformSettings.embedding_model || 'gemini-embedding-001'
  const voiceResponsesEnabled = platformSettings.voice_responses_enabled === '1'

  // Sync input if platformSettings changes externally
  useEffect(() => {
    setTrialDaysInput(platformSettings.default_trial_days || '7')
  }, [platformSettings.default_trial_days])
  const MEDIA_MODEL_OPTIONS = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash - Ultrapide ⚡' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash - Dernier modèle ⭐' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash - Très rapide' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro - Plus précis' }
  ]
  const EMBEDDING_MODEL_OPTIONS = [
    { value: 'gemini-embedding-001', label: 'Gemini Embedding 001 (Standard)' },
    { value: 'text-embedding-004', label: 'Text Embedding 004 (Performance)' }
  ]

  const getProviderColor = (provider) => {
    switch (provider) {
      case 'gemini': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'openai': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'openrouter': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'fast': return '⚡'
      case 'smart': return '🧠'
      case 'free': return '🆓'
      default: return '🤖'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold text-gray-100">Modèles IA</h2>
          <p className="text-gray-400 text-sm">Gérez les modèles et clés API disponibles</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="p-2 text-gray-400 hover:text-gray-100 transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={onCreateModel} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Nouveau modèle
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card p-4">
            <p className="text-2xl font-bold text-gray-100">{stats.activeModels}</p>
            <p className="text-xs text-gray-500">Modèles actifs</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-blue-400">{stats.overall?.total_requests?.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-500">Requêtes totales</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-gold-400">{stats.overall?.total_credits?.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-500">Crédits utilisés</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-emerald-400">{stats.overall?.avg_response_time || 0}ms</p>
            <p className="text-xs text-gray-500">Temps moyen</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-red-400">{stats.overall?.error_rate || 0}%</p>
            <p className="text-xs text-gray-500">Taux d'erreur</p>
          </div>
        </div>
      )}

      {/* Default model for images & voice */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-2">Modèle pour images et notes vocales</h3>
        <p className="text-gray-400 text-sm mb-4">
          Modèle IA utilisé par défaut pour l&apos;analyse des photos et des notes vocales envoyées par les clients.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={MEDIA_MODEL_OPTIONS.some(o => o.value === mediaModelValue) ? mediaModelValue : 'gemini-1.5-flash'}
            onChange={(e) => onSaveMediaModel(e.target.value)}
            disabled={savingMediaModel}
            className="input-dark max-w-md"
          >
            {MEDIA_MODEL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {savingMediaModel && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
        </div>
      </div>

      {/* Embedding model for RAG */}
      <div className="card p-6 border-blue-500/20 bg-blue-500/5">
        <h3 className="text-lg font-semibold text-gray-100 mb-2 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-400" />
          Modèle d&apos;Embeddings (RAG)
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Modèle utilisé pour vectoriser la base de connaissance. <span className="text-amber-400">Attention :</span> changer ce modèle nécessitera de ré-indexer toutes les connaissances existantes pour rester compatible.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={embeddingModelValue}
            onChange={(e) => onSaveEmbeddingModel(e.target.value)}
            disabled={savingEmbeddingModel}
            className="input-dark max-w-md border-blue-500/30"
          >
            {EMBEDDING_MODEL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {savingEmbeddingModel && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
          
          <button
            onClick={onReindexAll}
            disabled={reindexingAll}
            className="btn-secondary ml-auto flex items-center gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
          >
            {reindexingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Ré-indexer toute la base
          </button>
        </div>
      </div>

      {/* Voice responses (TTS) - platform-wide */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-2">Réponses vocales (TTS)</h3>
        <p className="text-gray-400 text-sm mb-4">
          Si activé, les utilisateurs autorisés peuvent recevoir une réponse en message vocal lorsque le client envoie une note vocale. Désactivé par défaut.
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={voiceResponsesEnabled}
            onChange={(e) => onSaveVoiceResponsesEnabled?.(e.target.checked)}
            className="w-4 h-4 rounded border-space-700 bg-space-800 text-blue-400 focus:ring-blue-400"
          />
          <span className="text-sm text-gray-300">Réponses vocales activées pour la plateforme</span>
        </label>
      </div>

      {/* Trial Duration Setting */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          Durée d&apos;essai gratuit
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Nombre de jours accordés aux nouveaux inscrits pour tester la plateforme gratuitement. Cette valeur s&apos;applique aux nouvelles inscriptions uniquement.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            min={1}
            max={365}
            value={trialDaysInput}
            onChange={(e) => setTrialDaysInput(e.target.value)}
            className="input-dark w-32 text-center text-lg font-bold"
          />
          <span className="text-gray-400 text-sm">jours</span>
          <button
            onClick={() => onSaveTrialDays?.(trialDaysInput)}
            disabled={savingTrialDays}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {savingTrialDays ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          ⚡ Valeur actuelle : <span className="text-amber-400 font-semibold">{platformSettings.default_trial_days || 7} jours</span>
        </p>
      </div>

      {/* API Keys Section */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-gold-400" />
          Clés API
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['gemini', 'openai', 'openrouter'].map(provider => {
            const keyData = apiKeys.find(k => k.provider === provider)
            const hasKey = keyData?.has_key
            const isActive = keyData?.is_active

            return (
              <div key={provider} className={`p-4 rounded-xl border ${getProviderColor(provider)}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium capitalize">{provider}</span>
                  <div className="flex items-center gap-2">
                    {hasKey && (
                      <span className={`text-xs px-2 py-0.5 rounded ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  {hasKey ? (
                    <>
                      <code className="text-xs bg-space-900 px-2 py-1 rounded flex-1">
                        {showKeys[provider] ? keyData.api_key : '••••••••••••••••'}
                      </code>
                      <button 
                        onClick={() => setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }))}
                        className="p-1 text-gray-500 hover:text-gray-300"
                      >
                        {showKeys[provider] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">Non configurée</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onEditKey({ provider, ...keyData })}
                    className="flex-1 text-xs px-3 py-1.5 bg-space-800 hover:bg-space-700 rounded-lg transition-colors"
                  >
                    <Settings className="w-3 h-3 inline mr-1" />
                    {hasKey ? 'Modifier' : 'Configurer'}
                  </button>
                  {hasKey && (
                    <button
                      onClick={() => onTestKey(provider)}
                      className="text-xs px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                    >
                      <TestTube className="w-3 h-3 inline mr-1" />
                      Tester
                    </button>
                  )}
                </div>

                {keyData?.last_used_at && (
                  <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Dernier test : {new Date(keyData.last_used_at).toLocaleString()}
                  </p>
                )}

                {keyData?.error_count > 0 && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400">
                    <div className="font-semibold flex items-center gap-1 mb-1">
                      <AlertCircle className="w-3 h-3" />
                      {keyData.error_count} erreur(s) détectée(s)
                    </div>
                    {keyData.last_error && (
                      <p className="italic opacity-80 break-words line-clamp-2" title={keyData.last_error}>
                        {keyData.last_error}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Models List */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-space-700">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            Catalogue des modèles ({models.length})
          </h3>
        </div>
        <div className="divide-y divide-space-700">
          {models.map(model => (
            <div key={model.id} className={`p-4 hover:bg-space-800/50 transition-colors ${!model.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getCategoryIcon(model.category)}</span>
                    <h4 className="font-medium text-gray-100">{model.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded border ${getProviderColor(model.provider)}`}>
                      {model.provider}
                    </span>
                    {model.api_key && (
                      <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded flex items-center gap-1">
                        <Key className="w-3 h-3" />
                        Clé spécifique
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{model.description}</p>
                  <code className="text-xs text-gray-500 bg-space-900 px-2 py-1 rounded">{model.model_id}</code>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{model.stats?.total_requests || 0} requêtes</span>
                    <span>{model.stats?.unique_users || 0} utilisateurs</span>
                    <span>{model.stats?.avg_response_time || 0}ms moy.</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleModel(model)}
                    className={`p-2 rounded-lg transition-colors ${
                      model.is_active 
                        ? 'text-emerald-400 hover:bg-emerald-500/10' 
                        : 'text-gray-500 hover:bg-space-700'
                    }`}
                    title={model.is_active ? 'Désactiver' : 'Activer'}
                  >
                    {model.is_active ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => onEditModel(model)}
                    className="p-2 text-gray-500 hover:text-gray-100 hover:bg-space-700 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onTestModel(model)}
                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Tester ce modèle"
                  >
                    <TestTube className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDeleteModel(model.id)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Users by Model Usage */}
      {stats?.topUsers?.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gold-400" />
            Top utilisateurs IA
          </h3>
          <div className="space-y-2">
            {stats.topUsers.slice(0, 10).map((user, idx) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-space-800/50 hover:bg-space-800 border border-space-700/50 rounded-xl transition-all">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-gold-400/10 text-gold-400 rounded-lg flex items-center justify-center text-xs font-bold border border-gold-400/20">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-100">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-100">{(user.total_tokens || 0).toLocaleString()} tokens</p>
                  <div className="flex items-center justify-end gap-2 text-[10px] sm:text-xs">
                    {user.avg_response_time > 0 && <span className="text-emerald-400">{user.avg_response_time}ms</span>}
                    {user.success_rate !== null && <span className={user.success_rate < 90 ? 'text-amber-400' : 'text-emerald-400'}>{user.success_rate}% success</span>}
                    <span className="text-gold-400">{(user.credits_used || 0).toLocaleString()} crédits</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== AI MODEL MODAL ====================
function AIModelModal({ model, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: model?.name || '',
    provider: model?.provider || 'gemini',
    model_id: model?.model_id || '',
    description: model?.description || '',
    is_active: model?.is_active !== false,
    category: model?.category || 'general',
    sort_order: model?.sort_order || 0,
    api_key: model?.api_key || ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (model) {
        await api.put(`/admin/ai/models/${model.id}`, formData)
      } else {
        await api.post('/admin/ai/models', formData)
      }
      toast.success(model ? 'Modèle mis à jour' : 'Modèle créé')
      onSave()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-lg bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-fadeIn flex flex-col max-h-[90dvh] sm:max-h-[85vh] max-sm:rounded-b-none overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-space-700" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <h3 className="text-lg font-display font-semibold text-gray-100">
            {model ? 'Modifier le modèle' : 'Nouveau modèle'}
          </h3>
          <button onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nom *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-dark w-full min-h-[44px]"
              placeholder="Gemini 2.0 Flash"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Provider *</label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="input-dark w-full min-h-[44px]"
                disabled={!!model}
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Catégorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-dark w-full min-h-[44px]"
              >
                <option value="fast">⚡ Rapide</option>
                <option value="smart">🧠 Intelligent</option>
                <option value="free">🆓 Gratuit</option>
                <option value="general">🤖 Général</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Model ID *</label>
            <input
              type="text"
              value={formData.model_id}
              onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
              className="input-dark w-full font-mono text-sm min-h-[44px]"
              placeholder="models/gemini-2.0-flash"
              required
              disabled={!!model}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-dark w-full min-h-[44px]"
              placeholder="Description courte"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Ordre d'affichage</label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              className="input-dark w-full min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Clé API spécifique (Optionnel)
            </label>
            <input
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              className="input-dark w-full min-h-[44px]"
              placeholder={model?.api_key ? '••••••••••••••••' : 'Utiliser la clé globale'}
            />
          </div>

          <div className="flex items-center gap-4 py-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 rounded border-space-700 bg-space-800 text-emerald-400"
              />
              <span className="text-sm text-gray-300">Actif</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary min-h-[48px]">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary min-h-[48px]">
              {saving ? '...' : model ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ==================== API KEY MODAL ====================
function APIKeyModal({ keyData, onClose, onSave }) {
  const [apiKey, setApiKey] = useState('')
  const [isActive, setIsActive] = useState(keyData?.is_active !== false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put(`/admin/ai/api-keys/${keyData.provider}`, {
        api_key: apiKey || undefined,
        is_active: isActive
      })
      toast.success('Clé API mise à jour')
      onSave()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const getProviderName = (provider) => {
    switch (provider) {
      case 'gemini': return 'Google Gemini'
      case 'openai': return 'OpenAI'
      case 'openrouter': return 'OpenRouter'
      default: return provider
    }
  }

  const getProviderLink = (provider) => {
    switch (provider) {
      case 'gemini': return 'https://aistudio.google.com/app/apikey'
      case 'openai': return 'https://platform.openai.com/api-keys'
      case 'openrouter': return 'https://openrouter.ai/keys'
      default: return null
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-md bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-fadeIn flex flex-col max-h-[90dvh] sm:max-h-[85vh] max-sm:rounded-b-none overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-space-700" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <h3 className="text-lg font-display font-semibold text-gray-100">
            Clé API {getProviderName(keyData?.provider)}
          </h3>
          <button onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Clé API {keyData?.has_key ? '(laisser vide pour conserver)' : '*'}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input-dark w-full font-mono text-sm min-h-[44px]"
              placeholder={keyData?.has_key ? '••••••••••••••••' : 'sk-...'}
              required={!keyData?.has_key}
            />
            {getProviderLink(keyData?.provider) && (
              <a 
                href={getProviderLink(keyData?.provider)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline mt-2 inline-block min-h-[44px] flex items-center"
              >
                Obtenir une clé API →
              </a>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer py-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 rounded border-space-700 bg-space-800 text-emerald-400"
            />
            <span className="text-sm text-gray-300">Clé active</span>
          </label>

          {keyData?.last_error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-xs text-red-400">Dernière erreur: {keyData.last_error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary min-h-[48px]">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary min-h-[48px]">
              {saving ? '...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ==================== PLAN MODAL ====================
function PlanModal({ plan, availableModels, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    display_name: plan?.display_name || '',
    description: plan?.description || '',
    price: plan?.price || 0,
    price_currency: plan?.price_currency || 'FCFA',
    is_active: plan?.is_active !== false,
    sort_order: plan?.sort_order || 99,
    limits: plan?.limits || {
      agents: 1,
      whatsapp_accounts: 1,
      outlook_accounts: 0,
      google_calendar_accounts: 0,
      conversations_per_month: 100,
      messages_per_month: 500,
      credits_per_month: 500,
      knowledge_items: 10,
      templates: 5
    },
    features: {
      models: ['gemini-1.5-flash'],
      availability_hours: false,
      voice_responses: false,
      payment_module: false,
      next_best_action: false,
      conversion_score: false,
      daily_briefing: false,
      sentiment_routing: false,
      catalog_import: false,
      human_handoff_alerts: false,
      analytics: false,
      ...(plan?.features || {})
    }
  })
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('general')

  const handleLimitChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      limits: { ...prev.limits, [key]: value === '' ? 0 : parseInt(value) || 0 }
    }))
  }

  const handleFeatureToggle = (key) => {
    setFormData(prev => ({
      ...prev,
      features: { ...prev.features, [key]: !prev.features[key] }
    }))
  }

  const handleModelToggle = (modelId) => {
    setFormData(prev => {
      const models = prev.features.models || []
      const newModels = models.includes(modelId)
        ? models.filter(m => m !== modelId)
        : [...models, modelId]
      return {
        ...prev,
        features: { ...prev.features, models: newModels }
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...formData,
      limits: {
        ...formData.limits,
        messages_per_month: formData.limits.credits_per_month
      }
    }
    await onSave(payload)
    setSaving(false)
  }

  const limitFields = [
    { key: 'agents', label: 'Agents', desc: '-1 = illimité' },
    { key: 'whatsapp_accounts', label: 'Comptes WhatsApp', desc: '-1 = illimité' },
    { key: 'outlook_accounts', label: 'Comptes Outlook', desc: '-1 = illimité' },
    { key: 'google_calendar_accounts', label: 'Comptes Google Calendar', desc: '-1 = illimité' },
    { key: 'conversations_per_month', label: 'Conversations/mois', desc: '-1 = illimité' },
    { key: 'credits_per_month', label: 'Messages IA / mois', desc: 'Nombre max de réponses IA par mois (1 message IA = 1 crédit). -1 = illimité.' },
    { key: 'knowledge_items', label: 'Items base de connaissance', desc: '-1 = illimité' },
    { key: 'templates', label: 'Templates', desc: '-1 = illimité' }
  ]

  const featureFields = [
    { key: 'availability_hours', label: 'Module 1 : Heures de disponibilité', desc: 'Permet de définir les horaires où l\'agent répond automatiquement.' },
    { key: 'voice_responses', label: 'Module 2 : Réponses vocales', desc: 'L\'IA peut envoyer des notes vocales au lieu de texte.' },
    { key: 'payment_module', label: 'Module 3 : Paiement & Encaissement', desc: 'Intégration des passerelles de paiement pour vendre via l\'IA.' },
    { key: 'next_best_action', label: 'Module 4 : Next Best Action', desc: 'Relances automatiques intelligentes des prospects inactifs.' },
    { key: 'conversion_score', label: 'Module 5 : Score de conversion', desc: 'Analyse la probabilité d\'achat de chaque prospect.' },
    { key: 'daily_briefing', label: 'Module 6 : Daily Briefing', desc: 'Résumé quotidien des activités envoyé sur WhatsApp.' },
    { key: 'sentiment_routing', label: 'Module 7 : Sentiment routing', desc: 'Transfère à un humain si le client semble frustré.' },
    { key: 'catalog_import', label: 'Module 8 : Import catalogue', desc: 'L\'IA connaît vos produits via URL ou fichiers.' },
    { key: 'human_handoff_alerts', label: 'Module 9 : Alertes Transfert Humain', desc: 'Notifications immédiates quand un agent demande de l\'aide.' },
    { key: 'analytics', label: 'Module 10 : Analytics & Statistiques', desc: 'Accès aux tableaux de bord et rapports détaillés sur les performances.' }
  ]

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-2xl bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-fadeIn flex flex-col max-h-[90dvh] sm:max-h-[85vh] max-sm:rounded-b-none overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-space-700" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <h3 className="text-lg font-display font-semibold text-gray-100">
            {plan ? 'Modifier le plan' : 'Nouveau plan'}
          </h3>
          <button onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-space-700 overflow-x-auto no-scrollbar">
          {['general', 'limits', 'features', 'models'].map(section => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap min-h-[48px] ${
                activeSection === section 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {section === 'general' && 'Général'}
              {section === 'limits' && 'Limites'}
              {section === 'features' && 'Fonctions'}
              {section === 'models' && 'Modèles'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 overscroll-contain">
            {/* General Section */}
            {activeSection === 'general' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">ID *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                      className="input-dark w-full min-h-[44px]"
                      placeholder="ex: starter"
                      required
                      disabled={!!plan}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Nom *</label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="input-dark w-full min-h-[44px]"
                      placeholder="ex: Starter"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-dark w-full resize-none"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Prix</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                      className="input-dark w-full min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Devise</label>
                    <select
                      value={formData.price_currency}
                      onChange={(e) => setFormData({ ...formData, price_currency: e.target.value })}
                      className="input-dark w-full min-h-[44px]"
                    >
                      <option value="FCFA">FCFA</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Limits Section */}
            {activeSection === 'limits' && (
              <div className="grid grid-cols-2 gap-4">
                {limitFields.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{field.label}</label>
                    <input
                      type="number"
                      value={formData.limits[field.key] ?? 0}
                      onChange={(e) => handleLimitChange(field.key, e.target.value)}
                      className="input-dark w-full min-h-[44px]"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Features Section */}
            {activeSection === 'features' && (
              <div className="grid grid-cols-1 gap-2">
                {featureFields.map((field) => (
                  <label key={field.key} className="flex items-center gap-3 p-3 bg-space-800 rounded-xl cursor-pointer hover:bg-space-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.features[field.key] || false}
                      onChange={() => handleFeatureToggle(field.key)}
                      className="w-5 h-5 rounded border-space-700 bg-space-800 text-emerald-400"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200">{field.label}</p>
                      <p className="text-[10px] text-gray-500 truncate">{field.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Models Section */}
            {activeSection === 'models' && (
              <div className="grid grid-cols-1 gap-2">
                {availableModels.map(model => (
                  <label key={model.id} className="flex items-center gap-3 p-3 bg-space-800 rounded-xl cursor-pointer hover:bg-space-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.features.models?.includes(model.id) || formData.features.models?.includes(model.name) || false}
                      onChange={() => handleModelToggle(model.id)}
                      className="w-5 h-5 rounded border-space-700 bg-space-800 text-blue-400"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200">{model.name}</p>
                      <p className="text-[10px] text-gray-500">{model.provider}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 border-t border-space-700 bg-space-900/50 flex gap-3" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
            <button type="button" onClick={onClose} className="flex-1 btn-secondary min-h-[48px]">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary min-h-[48px]">
              {saving ? '...' : plan ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ==================== CONFIRM ACTION MODAL ====================
function ConfirmActionModal({ message, keyword, onConfirm, onCancel }) {
  const [inputValue, setInputValue] = useState('')
  const [confirming, setConfirming] = useState(false)
  
  const isValid = inputValue.toUpperCase() === keyword.toUpperCase()

  const handleConfirm = async () => {
    if (!isValid) return
    setConfirming(true)
    await onConfirm()
    setConfirming(false)
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-md bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-fadeIn flex flex-col overflow-hidden">
        <div className="p-6 sm:p-8" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-yellow-400" />
            </div>
          </div>
          
          <h3 className="text-2xl font-display font-bold text-gray-100 text-center mb-2">
            Confirmation
          </h3>
          
          <p className="text-gray-400 text-center mb-8">
            {message}
          </p>
          
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-3 text-center">
              Tapez <span className="font-bold text-yellow-400 uppercase">{keyword}</span> pour confirmer
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="input-dark w-full text-center text-xl font-mono uppercase min-h-[56px] tracking-widest"
              autoFocus
            />
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={onCancel}
              className="flex-1 btn-secondary min-h-[56px]"
              disabled={confirming}
            >
              Annuler
            </button>
            <button 
              onClick={handleConfirm}
              disabled={!isValid || confirming}
              className={`flex-1 rounded-xl font-bold min-h-[56px] transition-all ${
                isValid 
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20' 
                  : 'bg-space-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              {confirming ? '...' : 'Confirmer'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ==================== AI MODEL TEST MODAL ====================
function AIModelTestModal({ model, onClose }) {
  const [message, setMessage] = useState('Bonjour, ceci est un test.')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleTest = async (e) => {
    e?.preventDefault()
    if (!message.trim() || loading) return

    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await api.post(`/admin/ai/models/${model.id}/test`, { message })
      setResponse(res.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-2xl bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-fadeIn flex flex-col max-h-[90dvh] sm:max-h-[85vh] max-sm:rounded-b-none overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-space-700 flex items-center justify-between bg-space-800" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <TestTube className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-gray-100">Tester : {model.name}</h3>
              <p className="text-xs text-gray-500">{model.provider} • {model.model_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 overscroll-contain">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Message de test</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Entrez un message..."
              className="input-dark w-full min-h-[100px] py-3 resize-none"
            />
          </div>

          <button
            onClick={handleTest}
            disabled={loading || !message.trim()}
            className="w-full btn-primary flex items-center justify-center gap-2 py-4 font-bold shadow-lg shadow-blue-500/20 min-h-[48px]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            {loading ? 'Génération...' : 'Lancer le test'}
          </button>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-400 overflow-hidden">
                <p className="font-bold mb-1">Erreur</p>
                <p className="break-words opacity-90">{error}</p>
              </div>
            </div>
          )}

          {response && (
            <div className="space-y-4 animate-slideUp">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                Réponse reçue
              </div>
              <div className="bg-space-950/50 p-4 border border-emerald-500/20 rounded-2xl">
                <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
                  {typeof response.response?.response === 'string' 
                    ? response.response.response 
                    : typeof response.response === 'string'
                      ? response.response
                      : JSON.stringify(response.response, null, 2)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-space-700 bg-space-800/50 flex-shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <p className="text-[10px] text-gray-500 text-center">
            {model.provider === 'openrouter' ? 'Vérifiez votre clé API OpenRouter.' : 'Test simulant un agent standard.'}
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}
