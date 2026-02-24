import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { useConfirm } from '../contexts/ConfirmContext'
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
  Copy
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Admin() {
  const { showConfirm } = useConfirm()
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
  // Anomalies state
  const [anomalies, setAnomalies] = useState([])
  const [anomalyStats, setAnomalyStats] = useState({ total: 0, bySeverity: {}, byType: {} })
  const [loadingAnomalies, setLoadingAnomalies] = useState(false)
  
  // AI Models state
  const [aiModels, setAiModels] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [aiStats, setAiStats] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [showModelModal, setShowModelModal] = useState(false)
  const [editingModel, setEditingModel] = useState(null)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [editingKey, setEditingKey] = useState(null)
  const [platformSettings, setPlatformSettings] = useState({ default_media_model: 'gemini-1.5-flash' })
  const [savingMediaModel, setSavingMediaModel] = useState(false)

  // Plans state
  const [plans, setPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [availableModels, setAvailableModels] = useState([])
  // Confirmation modal for dangerous actions
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null) // { type, data, message, keyword }

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadStats()
      loadAnomalyStats()
    } else if (activeTab === 'users') {
      loadUsers()
      loadPlans()
    } else if (activeTab === 'anomalies') {
      loadAnomalies()
    } else if (activeTab === 'ai-models') {
      loadAIData()
    } else if (activeTab === 'plans') {
      loadPlans()
    }
  }, [activeTab, pagination.offset, searchQuery, selectedPlan, selectedStatus])

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

  const loadPlans = async () => {
    setLoadingPlans(true)
    try {
      const [plansRes, modelsRes] = await Promise.all([
        api.get('/admin/plans'),
        api.get('/admin/available-models')
      ])
      setPlans(plansRes.data.plans || [])
      setAvailableModels(modelsRes.data.models || [])
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

  const loadAnomalies = async () => {
    setLoadingAnomalies(true)
    try {
      const response = await api.get('/admin/anomalies')
      setAnomalies(response.data.anomalies || [])
      await loadAnomalyStats()
    } catch (error) {
      toast.error('Erreur lors du chargement des anomalies')
    } finally {
      setLoadingAnomalies(false)
    }
  }

  const runHealthCheck = async () => {
    setLoadingAnomalies(true)
    try {
      const response = await api.post('/admin/anomalies/health-check')
      toast.success(response.data.message)
      await loadAnomalies()
    } catch (error) {
      toast.error('Erreur lors de la vérification')
    } finally {
      setLoadingAnomalies(false)
    }
  }

  const resolveAnomaly = async (anomalyId) => {
    try {
      await api.post(`/admin/anomalies/${anomalyId}/resolve`)
      toast.success('Anomalie résolue')
      loadAnomalies()
    } catch (error) {
      toast.error('Erreur lors de la résolution')
    }
  }

  const resolveByType = async (type) => {
    try {
      const response = await api.post(`/admin/anomalies/resolve-type/${type}`)
      toast.success(response.data.message)
      loadAnomalies()
    } catch (error) {
      toast.error('Erreur lors de la résolution')
    }
  }

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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-100">Administration</h1>
        <p className="text-gray-400">Gérez les utilisateurs et supervisez votre plateforme</p>
      </div>

      {/* Tabs - scroll horizontal on small screens so "Modèles IA" and "Plans" are visible */}
      <div className="mb-6 border-b border-space-700 overflow-x-auto overflow-y-hidden -mx-1 px-1 sm:mx-0 sm:px-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-1 sm:gap-4 min-w-max">
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
          <button
            onClick={() => setActiveTab('ai-models')}
            className={`flex-shrink-0 pb-3 px-3 sm:px-4 border-b-2 transition-colors touch-target flex items-center gap-2 ${
              activeTab === 'ai-models' 
                ? 'border-violet-400 text-violet-400' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Cpu className="w-5 h-5 flex-shrink-0" />
            <span className="whitespace-nowrap">Modèles IA</span>
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex-shrink-0 pb-3 px-3 sm:px-4 border-b-2 transition-colors touch-target flex items-center gap-2 ${
              activeTab === 'plans' 
                ? 'border-violet-400 text-violet-400' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <CreditCard className="w-5 h-5 flex-shrink-0" />
            <span className="whitespace-nowrap">Plans</span>
          </button>
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <DashboardContent stats={stats} loading={loading} anomalyStats={anomalyStats} />
      )}

      {/* Anomalies Tab */}
      {activeTab === 'anomalies' && (
        <AnomaliesContent 
          anomalies={anomalies}
          stats={anomalyStats}
          loading={loadingAnomalies}
          onResolve={resolveAnomaly}
          onResolveByType={resolveByType}
          onHealthCheck={runHealthCheck}
          onRefresh={loadAnomalies}
        />
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
          onSaveVoiceResponsesEnabled={saveVoiceResponsesEnabled}
          onToggleModel={handleToggleModel}
          onDeleteModel={handleDeleteModel}
          onEditModel={(model) => { setEditingModel(model); setShowModelModal(true); }}
          onCreateModel={() => { setEditingModel(null); setShowModelModal(true); }}
          onEditKey={(key) => { setEditingKey(key); setShowKeyModal(true); }}
          onTestKey={handleTestKey}
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

      {/* Users Tab */}
      {activeTab === 'users' && (
        <UsersContent 
          users={users}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
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
    </div>
  )
}

// Dashboard Content
function DashboardContent({ stats, loading, anomalyStats }) {
  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Anomaly Alert Banner */}
      {anomalyStats.total > 0 && (
        <div className={`p-4 rounded-xl flex items-center gap-4 ${
          anomalyStats.bySeverity?.critical > 0 
            ? 'bg-red-500/20 border border-red-500/30' 
            : anomalyStats.bySeverity?.high > 0
            ? 'bg-orange-500/20 border border-orange-500/30'
            : 'bg-amber-500/20 border border-amber-500/30'
        }`}>
          <AlertCircle className={`w-6 h-6 ${
            anomalyStats.bySeverity?.critical > 0 ? 'text-red-400' :
            anomalyStats.bySeverity?.high > 0 ? 'text-orange-400' : 'text-amber-400'
          }`} />
          <div className="flex-1">
            <p className="font-medium text-gray-100">
              {anomalyStats.total} anomalie{anomalyStats.total > 1 ? 's' : ''} détectée{anomalyStats.total > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-gray-400">
              {anomalyStats.bySeverity?.critical > 0 && `${anomalyStats.bySeverity.critical} critique(s) • `}
              {anomalyStats.bySeverity?.high > 0 && `${anomalyStats.bySeverity.high} haute(s) • `}
              {anomalyStats.bySeverity?.medium > 0 && `${anomalyStats.bySeverity.medium} moyenne(s)`}
            </p>
          </div>
          <a href="#" onClick={(e) => { e.preventDefault(); }} className="text-sm text-gold-400 hover:underline">
            Voir les anomalies →
          </a>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Users} 
          label="Utilisateurs" 
          value={stats.stats.users}
          subValue={`${stats.stats.activeUsers} actifs`}
          color="gold"
        />
        <StatCard 
          icon={Bot} 
          label="Agents IA" 
          value={stats.stats.agents}
          subValue={`${stats.stats.activeAgents} connectés`}
          color="violet"
        />
        <StatCard 
          icon={MessageSquare} 
          label="Conversations" 
          value={stats.stats.conversations}
          color="emerald"
        />
        <StatCard 
          icon={Activity} 
          label="Messages" 
          value={stats.stats.messages}
          color="blue"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Plan */}
        <div className="card p-6">
          <h3 className="text-lg font-display font-semibold text-gray-100 mb-4">Utilisateurs par plan</h3>
          <div className="space-y-3">
            {stats.usersByPlan.map((item) => (
              <div key={item.plan} className="flex items-center justify-between">
                <span className="text-gray-300 capitalize">{item.plan}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-space-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-gold-400 to-violet-500 rounded-full"
                      style={{ width: `${(item.count / stats.stats.users) * 100}%` }}
                    />
                  </div>
                  <span className="text-gold-400 font-medium w-8 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <h3 className="text-lg font-display font-semibold text-gray-100 mb-4">Activité récente</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-space-800 rounded-lg">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <span className="text-gray-300">Nouvelles inscriptions (7j)</span>
              </div>
              <span className="text-2xl font-bold text-emerald-400">{stats.recentSignups}</span>
            </div>
            {stats.messagesPerDay.slice(-5).map((day) => (
              <div key={day.date} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{day.date}</span>
                <span className="text-gray-300">{day.count} messages</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, subValue, color }) {
  const colors = {
    gold: 'from-gold-400/20 to-gold-400/5 border-gold-400/30 text-gold-400',
    violet: 'from-violet-400/20 to-violet-400/5 border-violet-400/30 text-violet-400',
    emerald: 'from-emerald-400/20 to-emerald-400/5 border-emerald-400/30 text-emerald-400',
    blue: 'from-blue-400/20 to-blue-400/5 border-blue-400/30 text-blue-400'
  }

  return (
    <div className={`p-6 rounded-xl border bg-gradient-to-br ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-6 h-6" />
        {subValue && <span className="text-xs opacity-70">{subValue}</span>}
      </div>
      <div className="text-3xl font-bold text-gray-100">{value.toLocaleString()}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  )
}

// Users Content
function UsersContent({ 
  users, loading, searchQuery, setSearchQuery, 
  selectedPlan, setSelectedPlan, selectedStatus, setSelectedStatus,
  pagination, setPagination, onDelete, onToggleAdmin, onToggleActive,
  onEdit, onCreate, onRefresh, onRestore, formatDate 
}) {
  const totalPages = Math.ceil(pagination.total / pagination.limit)
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div className="input-with-icon w-64">
            <div className="pl-3 flex items-center justify-center flex-shrink-0 text-gray-500">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPagination(p => ({...p, offset: 0})); }}
            />
          </div>
          <select
            value={selectedPlan}
            onChange={(e) => { setSelectedPlan(e.target.value); setPagination(p => ({...p, offset: 0})); }}
            className="input-dark"
          >
            <option value="">Tous les plans</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPagination(p => ({...p, offset: 0})); }}
            className="input-dark"
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="p-2 text-gray-400 hover:text-gray-100 transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={onCreate} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Nouvel utilisateur
          </button>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto table-responsive">
            <table className="w-full">
              <thead className="bg-space-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Utilisateur</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Plan</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Crédits</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Agents</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Messages</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Inscrit le</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Statut</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-space-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          user.is_admin ? 'bg-gold-400/20' : 'bg-space-700'
                        }`}>
                          {user.is_admin ? (
                            <Shield className="w-5 h-5 text-gold-400" />
                          ) : (
                            <Users className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-100">{user.name}</div>
                          {user.parent_name && (
                            <div className="text-xs text-gray-500">Sous-compte de {user.parent_name}</div>
                          )}
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.plan === 'pro' ? 'bg-violet-500/20 text-violet-400' :
                        user.plan === 'starter' ? 'bg-blue-500/20 text-blue-400' :
                        user.plan === 'enterprise' ? 'bg-gold-400/20 text-gold-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{user.credits}</td>
                    <td className="px-4 py-3 text-gray-300">{user.agents_count}</td>
                    <td className="px-4 py-3 text-gray-300">{user.messages_count}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {user.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onToggleAdmin(user)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.is_admin 
                              ? 'text-gold-400 hover:bg-gold-400/10' 
                              : 'text-gray-500 hover:bg-space-700'
                          }`}
                          title={user.is_admin ? 'Retirer admin' : 'Rendre admin'}
                        >
                          {user.is_admin ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => onEdit(user)}
                          className="p-1.5 text-gray-500 hover:text-gray-100 hover:bg-space-700 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {user.is_active === 0 && user.email?.includes('_deleted_') ? (
                          <button
                            onClick={() => onRestore(user.id)}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="Restaurer l'utilisateur"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onDelete(user.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-space-700">
            <span className="text-sm text-gray-500">
              {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} sur {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-400">
                Page {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, offset: p.offset + p.limit }))}
                disabled={currentPage >= totalPages}
                className="p-2 text-gray-400 hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Fallback default credits per plan when plans list is empty
const DEFAULT_CREDITS_BY_PLAN = { free: 100, starter: 1500, pro: 5000, enterprise: -1 }

function getCreditsForPlan(plans, planId) {
  const plan = plans.find(p => p.name === planId || p.id === planId)
  if (plan?.limits?.credits_per_month != null) return plan.limits.credits_per_month
  return DEFAULT_CREDITS_BY_PLAN[planId] ?? 100
}

// Edit User Modal
function EditUserModal({ user, onClose, onSave, plans = [], allUsers = [] }) {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    company: user.company || '',
    plan: user.plan,
    credits: user.credits,
    is_admin: user.is_admin,
    is_active: user.is_active,
    voice_responses_enabled: !!user.voice_responses_enabled,
    payment_module_enabled: !!user.payment_module_enabled,
    parent_user_id: user.parent_user_id || ''
  })
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmAdminInput, setConfirmAdminInput] = useState('')
  const isPromotingToAdmin = formData.is_admin === 1 && user.is_admin !== 1
  const canSubmit = !isPromotingToAdmin || confirmAdminInput.trim() === 'CONFIRMER'

  const handlePlanChange = (planId) => {
    const defaultCredits = getCreditsForPlan(plans, planId)
    setFormData(prev => ({ ...prev, plan: planId, credits: defaultCredits }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put(`/admin/users/${user.id}`, {
        ...formData,
        parent_user_id: formData.parent_user_id || null
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-space-700">
          <h3 className="text-lg font-display font-semibold text-gray-100">Modifier l'utilisateur</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nom</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-dark w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-dark w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Entreprise</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="input-dark w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Plan</label>
              <select
                value={formData.plan}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="input-dark w-full"
              >
                {plans.length > 0
                  ? plans.map(p => (
                      <option key={p.id ?? p.name} value={p.name}>
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
                className="input-dark w-full"
                placeholder="-1 = illimité"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_admin}
                onChange={(e) => {
                  setFormData({ ...formData, is_admin: e.target.checked ? 1 : 0 })
                  if (!e.target.checked) setConfirmAdminInput('')
                }}
                className="w-4 h-4 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
              />
              <span className="text-sm text-gray-300">Administrateur</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                className="w-4 h-4 rounded border-space-700 bg-space-800 text-emerald-400 focus:ring-emerald-400"
              />
              <span className="text-sm text-gray-300">Compte actif</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.voice_responses_enabled}
                onChange={(e) => setFormData({ ...formData, voice_responses_enabled: e.target.checked })}
                className="w-4 h-4 rounded border-space-700 bg-space-800 text-violet-400 focus:ring-violet-400"
              />
              <span className="text-sm text-gray-300">Réponses vocales activées pour cet utilisateur</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.payment_module_enabled}
              onChange={(e) => setFormData({ ...formData, payment_module_enabled: e.target.checked })}
              className="w-4 h-4 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
            />
            <span className="text-sm text-gray-300">Module Moyens de paiement activé (config PaymeTrust, etc.)</span>
          </div>
          {allUsers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Compte agence (parent)</label>
              <select
                value={formData.parent_user_id || ''}
                onChange={(e) => setFormData({ ...formData, parent_user_id: e.target.value || '' })}
                className="input-dark w-full"
              >
                <option value="">Aucun (compte indépendant)</option>
                {allUsers.filter(u => u.id !== user.id).map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Sous-compte d&apos;un compte agence</p>
            </div>
          )}
          {isPromotingToAdmin && (
            <div className="p-3 rounded-xl bg-gold-400/10 border border-gold-400/30">
              <p className="text-sm text-gray-300 mb-2">
                Pour accorder les droits administrateur, tapez <strong className="text-gold-400">CONFIRMER</strong> ci-dessous.
              </p>
              <input
                type="text"
                value={confirmAdminInput}
                onChange={(e) => setConfirmAdminInput(e.target.value)}
                placeholder="CONFIRMER"
                className="input-dark w-full font-mono uppercase text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nouveau mot de passe <span className="text-gray-500">(laisser vide pour conserver)</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="input-dark w-full"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving || !canSubmit} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Create User Modal
function CreateUserModal({ onClose, onSave, plans = [], allUsers = [] }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    company: '',
    plan: 'free',
    credits: 100,
    is_admin: 0,
    parent_user_id: ''
  })
  const [saving, setSaving] = useState(false)
  const initialCreditsSyncedRef = useRef(false)

  // Initialiser les crédits selon le plan quand la liste des plans est disponible (une seule fois)
  useEffect(() => {
    if (plans.length > 0 && !initialCreditsSyncedRef.current) {
      initialCreditsSyncedRef.current = true
      setFormData(prev => ({ ...prev, credits: getCreditsForPlan(plans, prev.plan) }))
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
      await api.post('/admin/users', { ...formData, parent_user_id: formData.parent_user_id || null })
      toast.success('Utilisateur créé')
      onSave()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la création')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-space-700">
          <h3 className="text-lg font-display font-semibold text-gray-100">Nouvel utilisateur</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nom *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-dark w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-dark w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Mot de passe *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input-dark w-full"
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
              className="input-dark w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Plan</label>
              <select
                value={formData.plan}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="input-dark w-full"
              >
                {plans.length > 0
                  ? plans.map(p => (
                      <option key={p.id ?? p.name} value={p.name}>
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
                className="input-dark w-full"
                placeholder="-1 = illimité"
              />
            </div>
          </div>
          {allUsers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Compte agence (parent)</label>
              <select
                value={formData.parent_user_id || ''}
                onChange={(e) => setFormData({ ...formData, parent_user_id: e.target.value || '' })}
                className="input-dark w-full"
              >
                <option value="">Aucun (compte indépendant)</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Créer comme sous-compte d&apos;un compte agence</p>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_admin}
              onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked ? 1 : 0 })}
              className="w-4 h-4 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
            />
            <span className="text-sm text-gray-300">Administrateur</span>
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="card w-full max-w-lg relative z-10 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-space-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold text-gray-100">Supprimer l'utilisateur</h2>
              <p className="text-sm text-gray-400">Cette action est irréversible</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
            </div>
          ) : preview ? (
            <div className="space-y-6">
              {/* User Info */}
              <div className="bg-space-800 rounded-xl p-4">
                <p className="text-gray-100 font-medium">{preview.user.name}</p>
                <p className="text-sm text-gray-400">{preview.user.email}</p>
              </div>

              {/* Warning */}
              {preview.warning && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-400">{preview.warning}</p>
                </div>
              )}

              {/* Data to be deleted */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Données qui seront supprimées :</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-space-800 rounded-lg p-3">
                    <p className="text-2xl font-bold text-gray-100">{preview.stats.agents}</p>
                    <p className="text-xs text-gray-500">Agents</p>
                  </div>
                  <div className="bg-space-800 rounded-lg p-3">
                    <p className="text-2xl font-bold text-gray-100">{preview.stats.conversations}</p>
                    <p className="text-xs text-gray-500">Conversations</p>
                  </div>
                  <div className="bg-space-800 rounded-lg p-3">
                    <p className="text-2xl font-bold text-gray-100">{preview.stats.messages}</p>
                    <p className="text-xs text-gray-500">Messages</p>
                  </div>
                  <div className="bg-space-800 rounded-lg p-3">
                    <p className="text-2xl font-bold text-gray-100">{preview.stats.knowledgeItems}</p>
                    <p className="text-xs text-gray-500">Éléments de connaissance</p>
                  </div>
                  <div className="bg-space-800 rounded-lg p-3">
                    <p className="text-2xl font-bold text-gray-100">{preview.stats.templates}</p>
                    <p className="text-xs text-gray-500">Templates</p>
                  </div>
                  <div className="bg-space-800 rounded-lg p-3">
                    <p className="text-2xl font-bold text-gray-100">{preview.stats.blacklistEntries}</p>
                    <p className="text-xs text-gray-500">Contacts bloqués</p>
                  </div>
                </div>
              </div>

              {/* Agents list */}
              {preview.agents.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Agents concernés :</h3>
                  <div className="space-y-1">
                    {preview.agents.map(agent => (
                      <div key={agent.id} className="flex items-center justify-between bg-space-800 rounded-lg px-3 py-2">
                        <span className="text-sm text-gray-100">{agent.name}</span>
                        {agent.connected && (
                          <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">Connecté</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirmation input for hard delete */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tapez <span className="text-red-400 font-mono">SUPPRIMER</span> pour confirmer la suppression définitive :
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="input-dark w-full"
                  placeholder="SUPPRIMER"
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="p-6 border-t border-space-700 space-y-3">
          <div className="flex gap-3">
            <button
              onClick={handleSoftDelete}
              disabled={deleting || loading}
              className="flex-1 px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl hover:bg-amber-500/30 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Désactiver seulement'}
            </button>
            <button
              onClick={handleHardDelete}
              disabled={deleting || loading || confirmText !== 'SUPPRIMER'}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Supprimer définitivement'}
            </button>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="w-full btn-secondary"
          >
            Annuler
          </button>
          <p className="text-xs text-gray-500 text-center">
            "Désactiver" conserve les données mais empêche l'accès. "Supprimer" efface tout définitivement.
          </p>
        </div>
      </div>
    </div>
  )
}

// Anomalies Content
function AnomaliesContent({ anomalies, stats, loading, onResolve, onResolveByType, onHealthCheck, onRefresh }) {
  const getTypeInfo = (type) => {
    const types = {
      credits_zero: { label: 'Crédits épuisés', icon: CreditCard, color: 'amber' },
      credits_negative: { label: 'Crédits négatifs', icon: CreditCard, color: 'red' },
      ai_error: { label: 'Erreur IA', icon: Zap, color: 'red' },
      whatsapp_disconnect: { label: 'WhatsApp déconnecté', icon: WifiOff, color: 'orange' },
      rate_limit: { label: 'Rate limit', icon: Clock, color: 'amber' },
      plan_limit_exceeded: { label: 'Limite de plan', icon: AlertTriangle, color: 'amber' },
      system_error: { label: 'Erreur système', icon: AlertCircle, color: 'red' },
      low_stock: { label: 'Stock bas', icon: Package, color: 'orange' },
      order_stuck: { label: 'Commande en attente', icon: ShoppingCart, color: 'amber' },
    }
    return types[type] || { label: type, icon: AlertCircle, color: 'gray' }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString('fr-FR')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold text-gray-100">Anomalies système</h2>
          <p className="text-gray-400 text-sm">Surveillez les problèmes et erreurs de la plateforme</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onRefresh} 
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-100 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={onHealthCheck}
            disabled={loading}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Vérification système
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-gray-100">{stats.total}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="card p-4 text-center border-red-500/30">
          <p className="text-3xl font-bold text-red-400">{stats.bySeverity?.critical || 0}</p>
          <p className="text-sm text-gray-500">Critiques</p>
        </div>
        <div className="card p-4 text-center border-orange-500/30">
          <p className="text-3xl font-bold text-orange-400">{stats.bySeverity?.high || 0}</p>
          <p className="text-sm text-gray-500">Hautes</p>
        </div>
        <div className="card p-4 text-center border-amber-500/30">
          <p className="text-3xl font-bold text-amber-400">{stats.bySeverity?.medium || 0}</p>
          <p className="text-sm text-gray-500">Moyennes</p>
        </div>
      </div>

      {/* By Type Quick Actions */}
      {Object.keys(stats.byType || {}).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byType).map(([type, count]) => {
            const info = getTypeInfo(type)
            return (
              <button
                key={type}
                onClick={() => onResolveByType(type)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border ${getSeverityColor('medium')} hover:opacity-80 transition-opacity`}
              >
                <info.icon className="w-4 h-4" />
                {info.label} ({count})
                <CheckCircle className="w-4 h-4 opacity-50" />
              </button>
            )
          })}
        </div>
      )}

      {/* Anomalies List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
        </div>
      ) : anomalies.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-100 mb-2">Tout va bien !</h3>
          <p className="text-gray-400">Aucune anomalie détectée sur la plateforme.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {anomalies.map((anomaly) => {
            const typeInfo = getTypeInfo(anomaly.type)
            const TypeIcon = typeInfo.icon
            const hasAccount = anomaly.user_id || anomaly.user_email || anomaly.user_name
            const hasAgent = anomaly.agent_id || anomaly.agent_name
            const hasMetadata = anomaly.metadata && Object.keys(anomaly.metadata).length > 0
            return (
              <div 
                key={anomaly.id} 
                className={`card p-4 border ${getSeverityColor(anomaly.severity)}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getSeverityColor(anomaly.severity)}`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-medium text-gray-100">{anomaly.title}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs ${getSeverityColor(anomaly.severity)}`}>
                        {anomaly.severity}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30">
                        {typeInfo.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{anomaly.message}</p>

                    {/* Compte concerné */}
                    {hasAccount && (
                      <div className="mb-3 p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          Compte concerné
                        </p>
                        <div className="text-sm text-gray-300 space-y-0.5">
                          {anomaly.user_name && <p><span className="text-gray-500">Nom :</span> {anomaly.user_name}</p>}
                          {anomaly.user_email && <p><span className="text-gray-500">Email :</span> {anomaly.user_email}</p>}
                          {anomaly.user_id && <p className="text-xs text-gray-500 font-mono">ID : {anomaly.user_id}</p>}
                        </div>
                      </div>
                    )}

                    {/* Agent concerné */}
                    {hasAgent && (
                      <div className="mb-3 p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5" />
                          Agent concerné
                        </p>
                        <div className="text-sm text-gray-300 space-y-0.5">
                          {anomaly.agent_name && <p><span className="text-gray-500">Nom :</span> {anomaly.agent_name}</p>}
                          {anomaly.agent_id && <p className="text-xs text-gray-500 font-mono">ID : {anomaly.agent_id}</p>}
                        </div>
                      </div>
                    )}

                    {/* Métadonnées / Détails techniques */}
                    {hasMetadata && (
                      <div className="mb-3 p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Détails techniques</p>
                        <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap font-sans">
                          {JSON.stringify(anomaly.metadata, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      <span title={new Date(anomaly.created_at).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'medium' })}>
                        {formatDate(anomaly.created_at)}
                      </span>
                      <span className="font-mono text-gray-600" title={`ID anomalie: ${anomaly.id}`}>#{anomaly.id?.slice(0, 8)}…</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onResolve(anomaly.id)}
                    className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors shrink-0"
                    title="Marquer comme résolu"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ==================== AI MODELS CONTENT ====================
function AIModelsContent({ 
  models, apiKeys, stats, loading, 
  platformSettings = {}, savingMediaModel, onSaveMediaModel, onSaveVoiceResponsesEnabled,
  onToggleModel, onDeleteModel, onEditModel, onCreateModel,
  onEditKey, onTestKey, onRefresh 
}) {
  const [showKeys, setShowKeys] = useState({})
  const mediaModelValue = platformSettings.default_media_model || 'gemini-1.5-flash'
  const voiceResponsesEnabled = platformSettings.voice_responses_enabled === '1'
  const MEDIA_MODEL_OPTIONS = [
    { value: 'models/gemini-2.5-flash', label: 'Gemini 2.5 Flash - Dernier modèle ⭐' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash - Très rapide' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro - Plus précis' }
  ]

  const getProviderColor = (provider) => {
    switch (provider) {
      case 'gemini': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'openai': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'openrouter': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
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
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
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
            <p className="text-2xl font-bold text-violet-400">{stats.overall?.total_requests?.toLocaleString() || 0}</p>
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
          {savingMediaModel && <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />}
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
            className="w-4 h-4 rounded border-space-700 bg-space-800 text-violet-400 focus:ring-violet-400"
          />
          <span className="text-sm text-gray-300">Réponses vocales activées pour la plateforme</span>
        </label>
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
                      className="text-xs px-3 py-1.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded-lg transition-colors"
                    >
                      <TestTube className="w-3 h-3 inline mr-1" />
                      Tester
                    </button>
                  )}
                </div>

                {keyData?.error_count > 0 && (
                  <p className="text-xs text-red-400 mt-2">{keyData.error_count} erreur(s)</p>
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
            <Cpu className="w-5 h-5 text-violet-400" />
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
                    {model.is_free ? (
                      <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">Gratuit</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-gold-400/20 text-gold-400 rounded">{model.credits_per_use} crédit(s)</span>
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
            {stats.topUsers.slice(0, 5).map((user, idx) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-space-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-gold-400/20 text-gold-400 rounded-full flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-100">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-100">{user.requests?.toLocaleString()} requêtes</p>
                  <p className="text-xs text-gold-400">{user.credits_used?.toLocaleString()} crédits</p>
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
    provider: model?.provider || 'openrouter',
    model_id: model?.model_id || '',
    description: model?.description || '',
    credits_per_use: model?.credits_per_use || 1,
    is_free: model?.is_free || false,
    is_active: model?.is_active !== false,
    max_tokens: model?.max_tokens || 4096,
    category: model?.category || 'general',
    sort_order: model?.sort_order || 0
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-space-700">
          <h3 className="text-lg font-display font-semibold text-gray-100">
            {model ? 'Modifier le modèle' : 'Nouveau modèle'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nom *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-dark w-full"
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
                className="input-dark w-full"
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
                className="input-dark w-full"
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
              className="input-dark w-full font-mono text-sm"
              placeholder="models/gemini-2.0-flash ou openai/gpt-4o:free"
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
              className="input-dark w-full"
              placeholder="Description courte du modèle"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Crédits</label>
              <input
                type="number"
                value={formData.credits_per_use}
                onChange={(e) => setFormData({ ...formData, credits_per_use: parseInt(e.target.value) || 0 })}
                className="input-dark w-full"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Max tokens</label>
              <input
                type="number"
                value={formData.max_tokens}
                onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) || 4096 })}
                className="input-dark w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Ordre</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                className="input-dark w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_free}
                onChange={(e) => setFormData({ ...formData, is_free: e.target.checked, credits_per_use: e.target.checked ? 0 : formData.credits_per_use })}
                className="w-4 h-4 rounded border-space-700 bg-space-800 text-emerald-400"
              />
              <span className="text-sm text-gray-300">Gratuit</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-space-700 bg-space-800 text-emerald-400"
              />
              <span className="text-sm text-gray-300">Actif</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : model ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-space-700">
          <h3 className="text-lg font-display font-semibold text-gray-100">
            Clé API {getProviderName(keyData?.provider)}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Clé API {keyData?.has_key ? '(laisser vide pour conserver)' : '*'}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input-dark w-full font-mono text-sm"
              placeholder={keyData?.has_key ? '••••••••••••••••' : 'sk-...'}
              required={!keyData?.has_key}
            />
            {getProviderLink(keyData?.provider) && (
              <a 
                href={getProviderLink(keyData?.provider)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-violet-400 hover:underline mt-1 inline-block"
              >
                Obtenir une clé API →
              </a>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-space-700 bg-space-800 text-emerald-400"
            />
            <span className="text-sm text-gray-300">Clé active</span>
          </label>

          {keyData?.last_error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-xs text-red-400">Dernière erreur: {keyData.last_error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ==================== PLANS CONTENT ====================
function PlansContent({ 
  plans, availableModels, loading,
  onEditPlan, onCreatePlan, onDeletePlan, onTogglePlan, onDuplicatePlan, onSetDefault, onRestoreDefaults, onRefresh
}) {
  const formatPrice = (price) => {
    if (price === -1) return 'Sur devis'
    if (price === 0) return 'Gratuit'
    return `${price.toLocaleString()} FCFA`
  }

  const formatLimit = (value) => {
    if (value === -1) return '∞'
    if (value === undefined || value === null || value === 0) return '–'
    return value.toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header - stacked on small screens so "Nouveau plan" is always visible */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold text-gray-100">Plans d'abonnement</h2>
          <p className="text-sm text-gray-500 mt-1">Gérez les plans et leurs limites</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onCreatePlan} className="btn-primary order-first sm:order-last">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau plan
          </button>
          <button onClick={onRefresh} className="btn-secondary touch-target flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </button>
          {onRestoreDefaults && (
            <button onClick={onRestoreDefaults} className="btn-secondary border-amber-500/50 text-amber-400 hover:bg-amber-500/10 text-sm whitespace-nowrap">
              Restaurer les plans par défaut
            </button>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map(plan => (
          <div 
            key={plan.id} 
            className={`card p-4 relative ${!plan.is_active ? 'opacity-60' : ''} ${plan.is_default ? 'ring-2 ring-violet-500' : ''}`}
          >
            {/* Status badges */}
            <div className="absolute top-3 right-3 flex gap-1">
              {plan.is_default && (
                <span className="px-2 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-400 rounded-full">
                  Défaut
                </span>
              )}
              {!plan.is_active && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">
                  Inactif
                </span>
              )}
            </div>

            {/* Header */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-100">{plan.display_name}</h3>
              <p className="text-2xl font-bold text-violet-400 mt-1">{formatPrice(plan.price)}</p>
              {plan.description && (
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
              )}
            </div>

            {/* Limits */}
            <div className="space-y-2 mb-4">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Limites</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Agents</span>
                  <span className="text-gray-300">{formatLimit(plan.limits?.agents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">WhatsApp</span>
                  <span className="text-gray-300">{formatLimit(plan.limits?.whatsapp_accounts)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Outlook</span>
                  <span className="text-gray-300">{formatLimit(plan.limits?.outlook_accounts)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Messages IA / mois</span>
                  <span className="text-gray-300">{formatLimit(plan.limits?.credits_per_month)}</span>
                </div>
              </div>
            </div>

            {/* Features summary */}
            <div className="space-y-2 mb-4">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Fonctionnalités</h4>
              <div className="flex flex-wrap gap-1">
                {plan.features?.analytics && (
                  <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">Analytics</span>
                )}
                {plan.features?.human_transfer && (
                  <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">Transfert humain</span>
                )}
                {plan.features?.api_access && (
                  <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">API</span>
                )}
                {plan.features?.priority_support && (
                  <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">Support prioritaire</span>
                )}
                {plan.features?.models?.length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded">
                    {plan.features.models.length} modèle(s) IA
                  </span>
                )}
              </div>
            </div>

            {/* User count */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Users className="w-4 h-4" />
              <span>{plan.user_count || 0} utilisateur(s)</span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-space-700">
              <button
                onClick={() => onEditPlan(plan)}
                className="text-xs px-2 py-1 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded transition-colors"
              >
                <Edit className="w-3 h-3 inline mr-1" />
                Modifier
              </button>
              <button
                onClick={() => onTogglePlan(plan)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  plan.is_active 
                    ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400' 
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                }`}
              >
                {plan.is_active ? 'Désactiver' : 'Activer'}
              </button>
              <button
                onClick={() => onDuplicatePlan(plan)}
                className="text-xs px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors"
              >
                <Copy className="w-3 h-3 inline mr-1" />
                Dupliquer
              </button>
              {!plan.is_default && (
                <button
                  onClick={() => onSetDefault(plan)}
                  className="text-xs px-2 py-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded transition-colors"
                >
                  Définir par défaut
                </button>
              )}
              {!plan.is_default && plan.user_count === 0 && (
                <button
                  onClick={() => onDeletePlan(plan)}
                  className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3 inline mr-1" />
                  Supprimer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
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
      conversations_per_month: 100,
      messages_per_month: 500,
      credits_per_month: 500,
      knowledge_items: 10,
      templates: 5
    },
    features: plan?.features || {
      models: ['gemini-1.5-flash'],
      auto_reply: true,
      availability_hours: false,
      human_transfer: false,
      blacklist: false,
      analytics: false,
      priority_support: false,
      api_access: false,
      custom_branding: false
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
    { key: 'conversations_per_month', label: 'Conversations/mois', desc: '-1 = illimité' },
    { key: 'credits_per_month', label: 'Messages IA / mois', desc: 'Nombre max de réponses IA par mois (1 message IA = 1 crédit). -1 = illimité.' },
    { key: 'knowledge_items', label: 'Items base de connaissance', desc: '-1 = illimité' },
    { key: 'templates', label: 'Templates', desc: '-1 = illimité' }
  ]

  const featureFields = [
    { key: 'auto_reply', label: 'Réponse automatique' },
    { key: 'availability_hours', label: 'Heures de disponibilité' },
    { key: 'human_transfer', label: 'Transfert humain' },
    { key: 'blacklist', label: 'Liste noire' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'priority_support', label: 'Support prioritaire' },
    { key: 'api_access', label: 'Accès API' },
    { key: 'custom_branding', label: 'Personnalisation marque' }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-space-700">
          <h3 className="text-lg font-display font-semibold text-gray-100">
            {plan ? 'Modifier le plan' : 'Nouveau plan'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-space-700">
          {['general', 'limits', 'features', 'models'].map(section => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeSection === section 
                  ? 'text-violet-400 border-b-2 border-violet-400' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {section === 'general' && 'Général'}
              {section === 'limits' && 'Limites'}
              {section === 'features' && 'Fonctionnalités'}
              {section === 'models' && 'Modèles IA'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* General Section */}
            {activeSection === 'general' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Identifiant (unique) *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                      className="input-dark w-full"
                      placeholder="ex: starter"
                      required
                      disabled={!!plan}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Nom affiché *
                    </label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="input-dark w-full"
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
                    className="input-dark w-full"
                    rows={2}
                    placeholder="Description du plan..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Prix</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                      className="input-dark w-full"
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">-1 = sur devis, 0 = gratuit</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Devise</label>
                    <select
                      value={formData.price_currency}
                      onChange={(e) => setFormData({ ...formData, price_currency: e.target.value })}
                      className="input-dark w-full"
                    >
                      <option value="FCFA">FCFA</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Ordre</label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                      className="input-dark w-full"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-space-700 bg-space-800 text-emerald-400"
                  />
                  <span className="text-sm text-gray-300">Plan actif</span>
                </label>
              </>
            )}

            {/* Limits Section */}
            {activeSection === 'limits' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Définissez les limites pour ce plan. Utilisez -1 pour illimité. Les crédits = nombre de réponses IA par mois.</p>
                <div className="grid grid-cols-2 gap-4">
                  {limitFields.map(field => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-300 mb-1">{field.label}</label>
                      <input
                        type="number"
                        value={formData.limits[field.key] ?? 0}
                        onChange={(e) => handleLimitChange(field.key, e.target.value)}
                        className="input-dark w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">{field.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Features Section */}
            {activeSection === 'features' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Activez les fonctionnalités disponibles pour ce plan.</p>
                <div className="grid grid-cols-2 gap-3">
                  {featureFields.map(field => (
                    <label key={field.key} className="flex items-center gap-3 p-3 bg-space-800 rounded-lg cursor-pointer hover:bg-space-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.features[field.key] || false}
                        onChange={() => handleFeatureToggle(field.key)}
                        className="w-4 h-4 rounded border-space-700 bg-space-800 text-emerald-400"
                      />
                      <span className="text-sm text-gray-300">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Models Section */}
            {activeSection === 'models' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Sélectionnez les modèles IA disponibles pour ce plan.</p>
                <div className="grid grid-cols-1 gap-2">
                  {availableModels.map(model => (
                    <label 
                      key={model.id} 
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        formData.features.models?.includes(model.id) || formData.features.models?.includes(model.name)
                          ? 'bg-violet-500/20 border border-violet-500/30'
                          : 'bg-space-800 hover:bg-space-700 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.features.models?.includes(model.id) || formData.features.models?.includes(model.name) || false}
                        onChange={() => handleModelToggle(model.id)}
                        className="w-4 h-4 rounded border-space-700 bg-space-800 text-violet-400"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-200">{model.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            model.provider === 'gemini' ? 'bg-blue-500/20 text-blue-400' :
                            model.provider === 'openai' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-purple-500/20 text-purple-400'
                          }`}>
                            {model.provider}
                          </span>
                          {model.is_free === 1 && (
                            <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">Gratuit</span>
                          )}
                        </div>
                        {model.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{model.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 p-4 border-t border-space-700">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : plan ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="card w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          {/* Warning Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-display font-bold text-gray-100 text-center mb-2">
            Confirmation requise
          </h3>
          
          {/* Message */}
          <p className="text-gray-400 text-center mb-6">
            {message}
          </p>
          
          {/* Keyword Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2 text-center">
              Pour confirmer, tapez <span className="font-bold text-yellow-400">{keyword}</span>
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Tapez "${keyword}" pour confirmer`}
              className={`input-dark w-full text-center text-lg font-mono ${
                inputValue.length > 0 
                  ? isValid 
                    ? 'border-emerald-500 bg-emerald-500/10' 
                    : 'border-red-500 bg-red-500/10'
                  : ''
              }`}
              autoFocus
            />
            {inputValue.length > 0 && !isValid && (
              <p className="text-xs text-red-400 mt-1 text-center">
                Le mot-clé ne correspond pas
              </p>
            )}
          </div>
          
          {/* Buttons */}
          <div className="flex gap-3">
            <button 
              onClick={onCancel}
              className="flex-1 btn-secondary"
              disabled={confirming}
            >
              Annuler
            </button>
            <button 
              onClick={handleConfirm}
              disabled={!isValid || confirming}
              className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-all ${
                isValid 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {confirming ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirmation...
                </span>
              ) : (
                'Confirmer'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
