import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { useConfirm } from '../contexts/ConfirmContext'
import { 
  ShoppingCart, 
  Package, 
  Check, 
  X, 
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  User,
  Phone,
  Calendar,
  DollarSign,
  History,
  Trash2,
  RefreshCw,
  MoreVertical,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  BarChart,
  Link2,
  Copy,
  ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'

const ORDER_STATUSES = {
  pending: { label: 'En attente', color: 'amber', icon: Clock },
  validated: { label: 'Validée', color: 'green', icon: CheckCircle },
  rejected: { label: 'Rejetée', color: 'red', icon: XCircle },
  completed: { label: 'Terminée', color: 'blue', icon: Check },
  cancelled: { label: 'Annulée', color: 'gray', icon: X }
}

const ORDERS_TABS = [
  { id: 'overview', label: 'Aperçu', icon: TrendingUp },
  { id: 'analytics', label: 'Statistiques', icon: BarChart },
  { id: 'orders', label: 'Commandes', icon: ShoppingCart },
  { id: 'logs', label: 'Historique', icon: History },
]

export default function Orders() {
  const { showConfirm } = useConfirm()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const activeTab = ORDERS_TABS.some((t) => t.id === tabFromUrl) ? tabFromUrl : 'overview'

  const setActiveTab = (tab) => {
    if (tab === 'overview') setSearchParams({})
    else setSearchParams({ tab })
  }

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ pending: 0, validated: 0, rejected: 0, totalRevenue: 0 })
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [showCleanupMenu, setShowCleanupMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30d')
  const [paymentLinkModal, setPaymentLinkModal] = useState({ open: false, order: null, message: '', url: '', loading: false })

  useEffect(() => {
    loadOrders()
    loadStats()
  }, [])

  // Close cleanup menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showCleanupMenu && !e.target.closest('.cleanup-menu-container')) {
        setShowCleanupMenu(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showCleanupMenu])

  // Load analytics when period changes
  useEffect(() => {
    loadAnalytics()
  }, [analyticsPeriod])

  const loadOrders = async () => {
    try {
      const response = await api.get('/orders')
      setOrders(response.data.orders || [])
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await api.get('/orders/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadAnalytics = async () => {
    setAnalyticsLoading(true)
    try {
      const response = await api.get(`/orders/analytics?period=${analyticsPeriod}`)
      setAnalytics(response.data)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const handleCreatePaymentLink = async (order) => {
    setPaymentLinkModal(prev => ({ ...prev, open: true, order, message: '', url: '', loading: true }))
    try {
      const response = await api.post(`/orders/${order.id}/payment-link`, { provider: 'manual' })
      setPaymentLinkModal(prev => ({
        ...prev,
        message: response.data.message || '',
        url: response.data.url || response.data.payment?.payment_url || '',
        loading: false
      }))
    } catch (error) {
      console.error('Error creating payment link:', error)
      toast.error(error.response?.data?.error || 'Erreur lors de la création du lien')
      setPaymentLinkModal(prev => ({ ...prev, open: false, loading: false }))
    }
  }

  const copyPaymentMessage = () => {
    const text = paymentLinkModal.message + '\n\n' + paymentLinkModal.url
    navigator.clipboard.writeText(text).then(() => toast.success('Message copié'))
  }

  const openWhatsAppWithPayment = () => {
    const order = paymentLinkModal.order
    const phone = order?.customer_phone?.replace(/\D/g, '') || ''
    const text = encodeURIComponent(paymentLinkModal.message + '\n\n' + paymentLinkModal.url)
    const url = phone ? `https://wa.me/${phone}?text=${text}` : 'https://wa.me/'
    window.open(url, '_blank')
  }

  const loadLogs = async () => {
    setLogsLoading(true)
    try {
      const response = await api.get('/orders/logs/all?limit=50')
      setLogs(response.data.logs || [])
    } catch (error) {
      console.error('Error loading logs:', error)
    } finally {
      setLogsLoading(false)
    }
  }

  const handleValidate = async (orderId) => {
    try {
      const response = await api.post(`/orders/${orderId}/validate`)
      if (response.data.success) {
        toast.success('Commande validée ! Stock mis à jour.')
        loadOrders()
        loadStats()
        loadLogs()
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Erreur lors de la validation'
      const stockIssues = error.response?.data?.stockIssues
      
      if (stockIssues) {
        toast.error(`Stock insuffisant: ${stockIssues.map(s => `${s.product} (${s.available}/${s.requested})`).join(', ')}`)
      } else {
        toast.error(errorMsg)
      }
    }
  }

  const handleReject = async (orderId) => {
    const reason = prompt('Raison du rejet (optionnel):')
    try {
      await api.post(`/orders/${orderId}/reject`, { reason })
      toast.success('Commande rejetée')
      loadOrders()
      loadStats()
    } catch (error) {
      toast.error('Erreur lors du rejet')
    }
  }

  const handleDelete = async (orderId) => {
    try {
      await api.delete(`/orders/${orderId}`)
      toast.success('Commande supprimée')
      setShowDeleteConfirm(null)
      loadOrders()
      loadStats()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleBulkDelete = async (status) => {
    setActionLoading(true)
    try {
      const response = await api.delete(`/orders/bulk/${status}`)
      toast.success(response.data.message)
      setShowCleanupMenu(false)
      loadOrders()
      loadStats()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCleanup = async (daysOld = 30) => {
    setActionLoading(true)
    try {
      const response = await api.post('/orders/cleanup', { daysOld, statuses: ['rejected', 'cancelled'] })
      toast.success(response.data.message)
      setShowCleanupMenu(false)
      loadOrders()
      loadStats()
    } catch (error) {
      toast.error('Erreur lors du nettoyage')
    } finally {
      setActionLoading(false)
    }
  }

  const handleClearLogs = async (daysOld = null) => {
    const ok = await showConfirm({
      title: 'Supprimer les logs',
      message: daysOld
        ? `Supprimer les logs de plus de ${daysOld} jours ? Cette action est irréversible.`
        : 'Supprimer tous les logs ? Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    setActionLoading(true)
    try {
      const url = daysOld ? `/orders/logs/clear?daysOld=${daysOld}` : '/orders/logs/clear'
      const response = await api.delete(url)
      toast.success(response.data.message)
      loadLogs()
    } catch (error) {
      toast.error('Erreur lors de la suppression des logs')
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount, currency = 'XOF') => {
    return `${amount.toLocaleString()} ${currency}`
  }

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const matchesSearch = order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer_phone?.includes(searchQuery) ||
                         order.id.includes(searchQuery)
    return matchesStatus && matchesSearch
  })

  const getStatusInfo = (status) => ORDER_STATUSES[status] || ORDER_STATUSES.pending

  return (
    <div className="space-y-6">
      {/* Header Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-space-800 via-space-900 to-space-950 border border-space-700 p-8">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-violet-500 to-gold-400 rounded-2xl">
                  <ShoppingCart className="w-8 h-8 text-space-950" />
                </div>
                Commandes
              </h1>
              <p className="text-gray-400 mt-2">
                Validez les commandes détectées par l'IA
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setActiveTab('logs'); loadLogs(); }}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${
                  activeTab === 'logs'
                    ? 'bg-violet-500 text-white'
                    : 'bg-space-800 text-gray-300 hover:bg-space-700'
                }`}
              >
                <History className="w-5 h-5" />
                Historique
              </button>
              
              {/* Cleanup Menu */}
              <div className="relative cleanup-menu-container">
                <button
                  onClick={() => setShowCleanupMenu(!showCleanupMenu)}
                  className="px-4 py-2 rounded-xl flex items-center gap-2 bg-space-800 text-gray-300 hover:bg-space-700 transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                  Nettoyer
                  <ChevronDown className={`w-4 h-4 transition-transform ${showCleanupMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {showCleanupMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-space-800 border border-space-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-space-700">
                      <p className="text-xs text-gray-500 px-2">Supprimer par statut</p>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => handleBulkDelete('rejected')}
                        disabled={actionLoading}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Supprimer les rejetées ({stats.rejected})
                      </button>
                      <button
                        onClick={() => handleBulkDelete('cancelled')}
                        disabled={actionLoading}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-space-700 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Supprimer les annulées
                      </button>
                    </div>
                    <div className="p-2 border-t border-space-700">
                      <p className="text-xs text-gray-500 px-2">Nettoyage automatique</p>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => handleCleanup(7)}
                        disabled={actionLoading}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Nettoyer {">"} 7 jours
                      </button>
                      <button
                        onClick={() => handleCleanup(30)}
                        disabled={actionLoading}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Nettoyer {">"} 30 jours
                      </button>
                    </div>
                    {actionLoading && (
                      <div className="p-3 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats - always visible in header on Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-xl">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
                  <p className="text-xs text-gray-500">En attente</p>
                </div>
              </div>
            </div>
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-100">{stats.validated}</p>
                  <p className="text-xs text-gray-500">Validées</p>
                </div>
              </div>
            </div>
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-xl">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-100">{stats.rejected}</p>
                  <p className="text-xs text-gray-500">Rejetées</p>
                </div>
              </div>
            </div>
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold-400/20 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gold-400">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-xs text-gray-500">Chiffre d'affaires</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-space-700 mb-6">
        <div className="flex gap-1">
          {ORDERS_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-gold-400 text-gold-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="card p-6">
          <p className="text-gray-400 mb-4">
            Résumé des commandes détectées par l'IA. Les statistiques ci-dessus sont mises à jour en temps réel.
          </p>
          <button
            onClick={() => setActiveTab('orders')}
            className="px-4 py-2 bg-gold-400/20 text-gold-400 hover:bg-gold-400/30 rounded-xl transition-colors flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Voir la liste des commandes
          </button>
        </div>
      )}

      {/* Analytics tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Period Selector */}
          <div className="flex justify-end">
            <select
              value={analyticsPeriod}
              onChange={(e) => setAnalyticsPeriod(e.target.value)}
              className="input-dark"
            >
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="90d">90 derniers jours</option>
              <option value="all">Depuis le début</option>
            </select>
          </div>

          {analyticsLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
          ) : analytics ? (
            <>
              {/* Row 1: Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Conversion Rate */}
                <div className="card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Taux de conversion</p>
                      <p className="text-3xl font-bold text-violet-400 mt-2">
                        {analytics.conversionRate}%
                      </p>
                    </div>
                    <div className="p-3 bg-violet-500/20 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-violet-400" />
                    </div>
                  </div>
                </div>

                {/* Daily Revenue */}
                <div className="card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Revenus du jour</p>
                      <p className="text-3xl font-bold text-gold-400 mt-2">
                        {formatCurrency(analytics.dailyRevenue)}
                      </p>
                    </div>
                    <div className="p-3 bg-gold-400/20 rounded-xl">
                      <DollarSign className="w-6 h-6 text-gold-400" />
                    </div>
                  </div>
                </div>

                {/* Monthly Revenue */}
                <div className="card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Revenus du mois</p>
                      <p className="text-3xl font-bold text-green-400 mt-2">
                        {formatCurrency(analytics.monthlyRevenue)}
                      </p>
                    </div>
                    <div className="p-3 bg-green-500/20 rounded-xl">
                      <Calendar className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Period Comparison */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-100 mb-4">
                  Comparaison mensuelle
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Revenus</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-gray-100">
                        {formatCurrency(analytics.periodComparison.thisMonth.revenue)}
                      </p>
                      <span className={`flex items-center gap-1 text-sm ${
                        analytics.periodComparison.revenueGrowth >= 0 
                          ? 'text-green-400' 
                          : 'text-red-400'
                      }`}>
                        {analytics.periodComparison.revenueGrowth >= 0 ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        {Math.abs(analytics.periodComparison.revenueGrowth)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      vs {formatCurrency(analytics.periodComparison.lastMonth.revenue)} mois dernier
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Commandes</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-gray-100">
                        {analytics.periodComparison.thisMonth.orders}
                      </p>
                      <span className={`flex items-center gap-1 text-sm ${
                        analytics.periodComparison.ordersGrowth >= 0 
                          ? 'text-green-400' 
                          : 'text-red-400'
                      }`}>
                        {analytics.periodComparison.ordersGrowth >= 0 ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        {Math.abs(analytics.periodComparison.ordersGrowth)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      vs {analytics.periodComparison.lastMonth.orders} mois dernier
                    </p>
                  </div>
                </div>
              </div>

              {/* Row 3: Sales Chart */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-100 mb-4">
                  Évolution des ventes (30 derniers jours)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF' }}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '0.5rem'
                      }}
                      labelStyle={{ color: '#F3F4F6' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      name="Revenus (XOF)"
                      stroke="#F59E0B" 
                      strokeWidth={2}
                      dot={{ fill: '#F59E0B' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Row 4: Top Products & Customers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Products */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-violet-400" />
                    Top 5 Produits
                  </h3>
                  <div className="space-y-3">
                    {analytics.topProducts.map((product, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-space-800 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-gray-100">{product.product_name}</p>
                          <p className="text-xs text-gray-500">{product.order_count} commandes</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gold-400">
                            {formatCurrency(product.total_revenue)}
                          </p>
                          <p className="text-xs text-gray-500">{product.total_quantity} unités</p>
                        </div>
                      </div>
                    ))}
                    {analytics.topProducts.length === 0 && (
                      <p className="text-gray-500 text-center py-4">Aucune donnée</p>
                    )}
                  </div>
                </div>

                {/* Top Customers */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-green-400" />
                    Top 5 Clients
                  </h3>
                  <div className="space-y-3">
                    {analytics.topCustomers.map((customer, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-space-800 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-gray-100">{customer.customer_name}</p>
                          <p className="text-xs text-gray-500">{customer.customer_phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-400">
                            {formatCurrency(customer.total_spent)}
                          </p>
                          <p className="text-xs text-gray-500">{customer.order_count} commandes</p>
                        </div>
                      </div>
                    ))}
                    {analytics.topCustomers.length === 0 && (
                      <p className="text-gray-500 text-center py-4">Aucune donnée</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Stock Logs Panel - Logs tab */}
      {activeTab === 'logs' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <History className="w-5 h-5 text-violet-400" />
              Historique des mouvements de stock
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleClearLogs(30)}
                disabled={actionLoading}
                className="text-xs px-3 py-1.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg transition-colors"
              >
                {">"} 30 jours
              </button>
              <button
                onClick={() => handleClearLogs()}
                disabled={actionLoading}
                className="text-xs px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-3 h-3 inline mr-1" />
                Tout supprimer
              </button>
            </div>
          </div>
          {logsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucun mouvement de stock enregistré</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-space-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      log.quantity_change > 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {log.quantity_change > 0 ? (
                        <ChevronUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-100">{log.product_name}</p>
                      <p className="text-xs text-gray-500">{log.notes}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${log.quantity_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                    </p>
                    <p className="text-xs text-gray-500">
                      {log.stock_before} → {log.stock_after}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Orders tab: Filters + List */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="input-with-icon flex-1 min-w-[200px]">
          <div className="pl-3 flex items-center justify-center flex-shrink-0 text-gray-500">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Rechercher une commande..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-dark min-w-[150px]"
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(ORDER_STATUSES).map(([key, value]) => (
            <option key={key} value={key}>{value.label}</option>
          ))}
        </select>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-space-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-10 h-10 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            {orders.length === 0 ? 'Aucune commande' : 'Aucun résultat'}
          </h3>
          <p className="text-gray-500">
            Les commandes détectées par l'IA apparaîtront ici
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusInfo = getStatusInfo(order.status)
            const StatusIcon = statusInfo.icon
            const isExpanded = expandedOrder === order.id

            return (
              <div 
                key={order.id}
                className={`card overflow-hidden ${
                  order.status === 'pending' ? 'border-l-4 border-l-amber-500' : ''
                }`}
              >
                {/* Order Header */}
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl bg-${statusInfo.color}-500/20`}>
                        <StatusIcon className={`w-6 h-6 text-${statusInfo.color}-400`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-100">{order.customer_name}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full bg-${statusInfo.color}-500/20 text-${statusInfo.color}-400`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                          {order.customer_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {order.customer_phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(order.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="w-3.5 h-3.5" />
                            {order.items?.length || 0} article(s)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-bold text-gold-400">
                        {formatCurrency(order.total_amount, order.currency)}
                      </p>
                      <p className="text-xs text-gray-500">#{order.id.substring(0, 8)}</p>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-space-700 p-4 bg-space-800/50">
                    {/* Items */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Articles</h4>
                      <div className="space-y-2">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-space-900 rounded-xl">
                            <div>
                              <p className="text-sm font-medium text-gray-100">{item.product_name}</p>
                              {item.product_sku && (
                                <p className="text-xs text-gray-500">SKU: {item.product_sku}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-300">
                                {item.quantity} x {formatCurrency(item.unit_price, order.currency)}
                              </p>
                              <p className="text-sm font-medium text-gold-400">
                                {formatCurrency(item.total_price, order.currency)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="mb-4 p-3 bg-space-900 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Notes</p>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{order.notes}</p>
                      </div>
                    )}

                    {/* Actions: send payment link (pending or validated) */}
                    {(order.status === 'pending' || order.status === 'validated') && (
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCreatePaymentLink(order); }}
                          className="flex items-center gap-2 px-4 py-2 bg-gold-400/20 hover:bg-gold-400/30 text-gold-400 rounded-xl transition-colors"
                        >
                          <Link2 className="w-4 h-4" />
                          Envoyer lien de paiement au client
                        </button>
                      </div>
                    )}

                    {/* Actions for pending orders */}
                    {order.status === 'pending' && (
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-3">
                          {order.conversation_id && (
                            <Link
                              to={`/dashboard/conversations/${order.conversation_id}`}
                              className="flex items-center gap-2 px-4 py-2 bg-space-700 hover:bg-space-600 text-gray-300 rounded-xl transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Voir la conversation
                            </Link>
                          )}
                          <button
                            onClick={() => handleValidate(order.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Valider
                          </button>
                          <button
                            onClick={() => handleReject(order.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Rejeter
                          </button>
                        </div>
                        
                        {/* Delete Button for pending */}
                        {showDeleteConfirm === order.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">Confirmer ?</span>
                            <button
                              onClick={() => handleDelete(order.id)}
                              className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                            >
                              Oui
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="px-3 py-1.5 bg-space-700 text-gray-300 text-sm rounded-lg hover:bg-space-600 transition-colors"
                            >
                              Non
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowDeleteConfirm(order.id)}
                            className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                            title="Supprimer cette commande"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Validation info */}
                    {order.status === 'validated' && order.validated_at && (
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2 text-sm text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          Validée le {formatDate(order.validated_at)}
                          {order.validated_by && ` par ${order.validated_by}`}
                        </div>
                        {showDeleteConfirm === order.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">Confirmer ?</span>
                            <button
                              onClick={() => handleDelete(order.id)}
                              className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                            >
                              Oui
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="px-3 py-1.5 bg-space-700 text-gray-300 text-sm rounded-lg hover:bg-space-600 transition-colors"
                            >
                              Non
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowDeleteConfirm(order.id)}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Rejection info */}
                    {order.status === 'rejected' && (
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2 text-sm text-red-400">
                          <XCircle className="w-4 h-4" />
                          Rejetée le {formatDate(order.rejected_at)}
                          {order.rejection_reason && ` - ${order.rejection_reason}`}
                        </div>
                        {showDeleteConfirm === order.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">Confirmer ?</span>
                            <button
                              onClick={() => handleDelete(order.id)}
                              className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                            >
                              Oui
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="px-3 py-1.5 bg-space-700 text-gray-300 text-sm rounded-lg hover:bg-space-600 transition-colors"
                            >
                              Non
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowDeleteConfirm(order.id)}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
        </div>
      )}

      {/* Modal: message pour envoyer le lien de paiement au client */}
      {paymentLinkModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={() => !paymentLinkModal.loading && setPaymentLinkModal(prev => ({ ...prev, open: false }))} />
          <div className="relative z-10 w-full max-w-lg bg-space-900 border border-space-700 rounded-2xl shadow-2xl">
            <div className="p-4 border-b border-space-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-100">Lien de paiement à envoyer au client</h3>
              <button onClick={() => setPaymentLinkModal(prev => ({ ...prev, open: false }))} className="p-2 text-gray-500 hover:text-gray-300 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {paymentLinkModal.loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-400">Copiez le message ci-dessous et envoyez-le à votre client (par ex. WhatsApp) :</p>
                  <pre className="p-4 bg-space-800 rounded-xl text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
                    {paymentLinkModal.message}
                  </pre>
                  {paymentLinkModal.url && (
                    <div className="flex items-center gap-2 p-3 bg-space-800 rounded-xl">
                      <span className="text-xs text-gray-500 flex-shrink-0">Lien :</span>
                      <a href={paymentLinkModal.url} target="_blank" rel="noopener noreferrer" className="text-gold-400 hover:underline truncate text-sm">
                        {paymentLinkModal.url}
                      </a>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={copyPaymentMessage}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-space-700 hover:bg-space-600 text-gray-200 rounded-xl transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Copier le message
                    </button>
                    <button
                      onClick={openWhatsAppWithPayment}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Ouvrir WhatsApp
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
