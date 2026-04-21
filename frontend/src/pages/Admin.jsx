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
  Database,
  Smartphone
} from 'lucide-react'
import toast from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { registerLocale } from 'react-datepicker'
import fr from 'date-fns/locale/fr'
registerLocale('fr', fr)
import { 
  DashboardContent, 
  UsersContent, 
  AnomaliesTab, 
  PlansContent, 
  CouponsContent, 
  AuditLogsContent, 
  getCreditsForPlan,
  PLAN_MODULES,
  UserModal,
  DeleteUserModal,
  AIModelsContent,
  AIModelModal,
  APIKeyModal,
  AIModelTestModal,
  PlanModal,
  ConfirmActionModal,
  SystemWhatsApp
} from './Admin/index.js'

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
    if (adminCaps.canManagePlans || adminCaps.isFullAdmin) tabs.push('plans', 'coupons', 'system-whatsapp')
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
      const urlParams = new URLSearchParams(window.location.search);
      const parentId = urlParams.get('parent_id');

      const params = new URLSearchParams({
        limit: pagination.limit,
        offset: pagination.offset,
        ...(searchQuery && { search: searchQuery }),
        ...(selectedPlan && { plan: selectedPlan }),
        ...(selectedStatus && { status: selectedStatus }),
        ...(parentId && { parent_id: parentId }),
        ...(!parentId && !searchQuery && { only_owners: 'true' })
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
      const ok = await showConfirm({
        title: 'Annuler cette action ?',
        message: 'Êtes-vous sûr de vouloir annuler cette action ? Cela restaurera les valeurs précédentes.',
        variant: 'warning',
        confirmLabel: 'Annuler l\'action'
      })
      if (!ok) return;
      
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
          {(adminCaps.canManagePlans || adminCaps.isFullAdmin) && (
            <button
              onClick={() => setActiveTab('system-whatsapp')}
              className={`flex-shrink-0 pb-3 px-3 sm:px-4 border-b-2 transition-colors touch-target flex items-center gap-2 ${
                activeTab === 'system-whatsapp' 
                  ? 'border-gold-400 text-gold-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Smartphone className="w-5 h-5 flex-shrink-0" />
              <span className="whitespace-nowrap">WhatsApp Système</span>
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

      {/* System WhatsApp Tab */}
      {activeTab === 'system-whatsapp' && (
        <SystemWhatsApp />
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

      {/* User Management Modals */}
      {(showUserModal || showCreateModal) && (
        <UserModal 
          user={showUserModal ? selectedUser : null}
          plans={plans}
          rolesList={rolesList}
          onClose={() => { setShowUserModal(false); setShowCreateModal(false); setSelectedUser(null); }}
          onSave={() => { setShowUserModal(false); setShowCreateModal(false); setSelectedUser(null); loadUsers(); }}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
