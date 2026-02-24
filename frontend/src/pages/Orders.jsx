import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
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
  ExternalLink,
  Download,
  Plus
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
  pending: { nameKey: 'orders.statusPending', color: 'amber', icon: Clock },
  validated: { nameKey: 'orders.statusValidated', color: 'green', icon: CheckCircle },
  delivered: { nameKey: 'orders.statusDelivered', color: 'emerald', icon: CheckCircle },
  rejected: { nameKey: 'orders.statusRejected', color: 'red', icon: XCircle },
  completed: { nameKey: 'orders.statusCompleted', color: 'blue', icon: Check },
  cancelled: { nameKey: 'orders.statusCancelled', color: 'gray', icon: X }
}

const PAYMENT_METHODS = {
  on_delivery: { nameKey: 'orders.paymentOnDelivery', shortKey: 'orders.paymentOnDelivery' },
  online: { nameKey: 'orders.paymentOnline', shortKey: 'orders.paymentOnline' }
}

const ORDERS_TABS = [
  { id: 'analytics', nameKey: 'orders.tabAnalytics', icon: BarChart },
  { id: 'orders', nameKey: 'orders.tabOrders', icon: ShoppingCart },
  { id: 'logs', nameKey: 'orders.tabLogs', icon: History },
]

export default function Orders() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { showConfirm } = useConfirm()
  const paymentModuleEnabled = !!(user?.payment_module_enabled === 1 || user?.payment_module_enabled === true)
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const activeTab = ORDERS_TABS.some((t) => t.id === tabFromUrl) ? tabFromUrl : 'orders'

  const setActiveTab = (tab) => {
    if (tab === 'orders') setSearchParams({})
    else setSearchParams({ tab })
  }

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ pending: 0, validated: 0, delivered: 0, rejected: 0, totalRevenue: 0 })
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
  const [paymetrustConfigured, setPaymetrustConfigured] = useState(false)
  const [sendingInConversation, setSendingInConversation] = useState(null)
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const [products, setProducts] = useState([])
  const [newOrderLoading, setNewOrderLoading] = useState(false)
  const [newOrderForm, setNewOrderForm] = useState({
    customerName: '',
    customerPhone: '',
    items: [{ productId: null, productName: '', productSku: null, quantity: 1, unitPrice: 0 }],
    notes: '',
    currency: 'XOF',
    paymentMethod: 'on_delivery'
  })

  useEffect(() => {
    loadOrders()
    loadStats()
  }, [])

  useEffect(() => {
    if (!paymentModuleEnabled) return
    const loadPaymentProviders = async () => {
      try {
        const res = await api.get('/payments/providers')
        setPaymetrustConfigured(!!(res.data?.configured?.paymetrust ?? res.data?.paymetrustConfigured))
      } catch {
        // ignore
      }
    }
    loadPaymentProviders()
  }, [paymentModuleEnabled])

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

  // Charger l'historique des mouvements de stock quand on ouvre l'onglet Historique
  useEffect(() => {
    if (activeTab === 'logs') loadLogs()
  }, [activeTab])

  const loadOrders = async () => {
    try {
      const response = await api.get('/orders')
      setOrders(response.data.orders || [])
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error(t('messages.errorLoad'))
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
      const provider = paymetrustConfigured ? 'paymetrust' : 'manual'
      const response = await api.post(`/orders/${order.id}/payment-link`, { provider })
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
      toast.error(error.response?.data?.error || 'Impossible de charger l\'historique des mouvements de stock')
      setLogs([])
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

  const handleMarkDelivered = async (orderId) => {
    try {
      const response = await api.post(`/orders/${orderId}/mark-delivered`)
      if (response.data.success) {
        toast.success('Commande marquée comme livrée (paiement reçu).')
        loadOrders()
        loadStats()
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
    }
  }

  const handlePaymentMethodChange = async (orderId, paymentMethod) => {
    try {
      const response = await api.patch(`/orders/${orderId}/payment-method`, { payment_method: paymentMethod })
      if (response.data.success) {
        toast.success('Mode de paiement mis à jour.')
        loadOrders()
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
    }
  }

  const handleSendPaymentLinkInConversation = async (order) => {
    if (!order.conversation_id) {
      toast.error('Cette commande n\'est pas liée à une conversation WhatsApp')
      return
    }
    setSendingInConversation(order.id)
    try {
      await api.post(`/orders/${order.id}/send-payment-link-in-conversation`)
      toast.success('Lien de paiement envoyé dans la conversation WhatsApp.')
      setPaymentLinkModal(prev => ({ ...prev, open: false }))
      loadOrders()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
    } finally {
      setSendingInConversation(null)
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

  const getStatusBadgeClasses = (status) => {
    const c = getStatusInfo(status).color
    if (c === 'emerald') return 'bg-emerald-500/20 text-emerald-400'
    return `bg-${c}-500/20 text-${c}-400`
  }
  const getStatusIconBgClasses = (status) => {
    const c = getStatusInfo(status).color
    if (c === 'emerald') return 'bg-emerald-500/20'
    return `bg-${c}-500/20`
  }
  const getStatusIconClasses = (status) => {
    const c = getStatusInfo(status).color
    if (c === 'emerald') return 'text-emerald-400'
    return `text-${c}-400`
  }

  const handleExportCsv = async () => {
    try {
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : ''
      const res = await api.get(`/orders/export?limit=5000${statusParam}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.setAttribute('download', `commandes_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Export téléchargé')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur export')
    }
  }

  const openNewOrderModal = async () => {
    setShowNewOrderModal(true)
    setNewOrderForm({
      customerName: '',
      customerPhone: '',
      items: [{ productId: null, productName: '', productSku: null, quantity: 1, unitPrice: 0 }],
      notes: '',
      currency: 'XOF',
      paymentMethod: 'on_delivery'
    })
    try {
      const res = await api.get('/products')
      setProducts(res.data?.products || res.data || [])
    } catch {
      setProducts([])
    }
  }

  const addNewOrderLine = () => {
    setNewOrderForm(prev => ({
      ...prev,
      items: [...prev.items, { productId: null, productName: '', productSku: null, quantity: 1, unitPrice: 0 }]
    }))
  }

  const updateNewOrderLine = (index, field, value) => {
    setNewOrderForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }))
  }

  const selectProductForLine = (index, product) => {
    if (!product) {
      updateNewOrderLine(index, 'productId', null)
      updateNewOrderLine(index, 'productName', '')
      updateNewOrderLine(index, 'productSku', null)
      updateNewOrderLine(index, 'unitPrice', 0)
      return
    }
    updateNewOrderLine(index, 'productId', product.id)
    updateNewOrderLine(index, 'productName', product.name || '')
    updateNewOrderLine(index, 'productSku', product.sku || null)
    updateNewOrderLine(index, 'unitPrice', Number(product.price) || 0)
  }

  const removeNewOrderLine = (index) => {
    setNewOrderForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index).length ? prev.items.filter((_, i) => i !== index) : [{ productId: null, productName: '', productSku: null, quantity: 1, unitPrice: 0 }]
    }))
  }

  const handleCreateOrderSubmit = async (e) => {
    e.preventDefault()
    if (!newOrderForm.customerName?.trim()) {
      toast.error('Nom du client requis')
      return
    }
    const items = newOrderForm.items
      .map(it => ({
        productId: it.productId || undefined,
        productName: (it.productName || '').trim(),
        productSku: it.productSku || undefined,
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitPrice: Math.max(0, Number(it.unitPrice) || 0)
      }))
      .filter(it => it.productName)
    if (items.length === 0) {
      toast.error('Ajoutez au moins un article (nom + quantité + prix)')
      return
    }
    setNewOrderLoading(true)
    try {
      await api.post('/orders', {
        customerName: newOrderForm.customerName.trim(),
        customerPhone: (newOrderForm.customerPhone || '').trim() || undefined,
        items,
        notes: (newOrderForm.notes || '').trim() || undefined,
        currency: newOrderForm.currency,
        paymentMethod: newOrderForm.paymentMethod
      })
      toast.success('Commande créée')
      setShowNewOrderModal(false)
      loadOrders()
      loadStats()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la création')
    } finally {
      setNewOrderLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-space-700 p-4 sm:p-8" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="relative z-10 space-y-6">
          {/* Titre et sous-titre : bloc dédié, jamais sous les boutons */}
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-gray-100 flex flex-wrap items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-gold-400 rounded-2xl flex-shrink-0">
                <ShoppingCart className="w-8 h-8 text-space-950" />
              </div>
              <span className="break-words">{t('orders.title')}</span>
            </h1>
            <p className="text-gray-400 mt-2 break-words">
              {t('orders.subtitle')}
            </p>
          </div>

          {/* Boutons : rangée dédiée, wrap propre sans recouvrir le texte */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openNewOrderModal}
              className="px-4 py-2 min-h-[44px] rounded-xl flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-600 text-white transition-colors touch-target whitespace-nowrap"
            >
              <Plus className="w-5 h-5 flex-shrink-0" />
              <span>Nouvelle commande</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-4 py-2 min-h-[44px] rounded-xl flex items-center justify-center gap-2 bg-space-800 text-gray-300 hover:bg-space-700 transition-colors touch-target whitespace-nowrap"
            >
              <Download className="w-5 h-5 flex-shrink-0" />
              <span>{t('orders.exportCsv')}</span>
            </button>
            <button
              onClick={() => { setActiveTab('logs'); loadLogs(); }}
              className={`px-4 py-2 min-h-[44px] rounded-xl flex items-center justify-center gap-2 transition-colors touch-target whitespace-nowrap ${
                activeTab === 'logs'
                  ? 'bg-violet-500 text-white'
                  : 'bg-space-800 text-gray-300 hover:bg-space-700'
              }`}
            >
              <History className="w-5 h-5 flex-shrink-0" />
              <span>Historique</span>
            </button>

            {/* Cleanup Menu */}
            <div className="relative cleanup-menu-container">
                <button
                  onClick={() => setShowCleanupMenu(!showCleanupMenu)}
                  className="px-4 py-2 min-h-[44px] rounded-xl flex items-center justify-center gap-2 bg-space-800 text-gray-300 hover:bg-space-700 transition-colors touch-target whitespace-nowrap"
                >
                  <Sparkles className="w-5 h-5 flex-shrink-0" />
                  <span>Nettoyer</span>
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${showCleanupMenu ? 'rotate-180' : ''}`} />
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

          {/* Stats - always visible in header */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-8 min-w-0">
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-amber-500/20 rounded-xl flex-shrink-0">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-amber-400 truncate" title={stats.pending}>{stats.pending}</p>
                  <p className="text-xs text-gray-500 truncate">En attente</p>
                </div>
              </div>
            </div>
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-green-500/20 rounded-xl flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-gray-100 truncate" title={stats.validated}>{stats.validated}</p>
                  <p className="text-xs text-gray-500 truncate">Validées</p>
                </div>
              </div>
            </div>
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-emerald-500/20 rounded-xl flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-emerald-400 truncate" title={stats.delivered ?? 0}>{stats.delivered ?? 0}</p>
                  <p className="text-xs text-gray-500 truncate">Livrées</p>
                </div>
              </div>
            </div>
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-red-500/20 rounded-xl flex-shrink-0">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-gray-100 truncate" title={stats.rejected}>{stats.rejected}</p>
                  <p className="text-xs text-gray-500 truncate">Rejetées</p>
                </div>
              </div>
            </div>
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700 min-w-0 col-span-2 sm:col-span-3 lg:col-span-1">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-gold-400/20 rounded-xl flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-gold-400" />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-2xl font-bold text-gold-400 truncate" title={formatCurrency(stats.totalRevenue)}>{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-xs text-gray-500 truncate">Chiffre d'affaires</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-space-700 mb-6 overflow-x-auto overflow-y-hidden -mx-1 px-1 sm:mx-0 sm:px-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-1 min-w-max">
          {ORDERS_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 px-3 sm:px-4 border-b-2 transition-colors whitespace-nowrap flex-shrink-0 touch-target ${
                  isActive
                    ? 'border-gold-400 text-gold-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(tab.nameKey)}
              </button>
            )
          })}
        </div>
      </div>

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
                <div className="card p-6 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-500 truncate">Taux de conversion</p>
                      <p className="text-3xl font-bold text-violet-400 mt-2 truncate">
                        {analytics.conversionRate}%
                      </p>
                    </div>
                    <div className="p-3 bg-violet-500/20 rounded-xl flex-shrink-0">
                      <TrendingUp className="w-6 h-6 text-violet-400" />
                    </div>
                  </div>
                </div>

                {/* Daily Revenue */}
                <div className="card p-6 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-500 truncate">Revenus du jour</p>
                      <p className="text-3xl font-bold text-gold-400 mt-2 truncate" title={formatCurrency(analytics.dailyRevenue)}>
                        {formatCurrency(analytics.dailyRevenue)}
                      </p>
                    </div>
                    <div className="p-3 bg-gold-400/20 rounded-xl flex-shrink-0">
                      <DollarSign className="w-6 h-6 text-gold-400" />
                    </div>
                  </div>
                </div>

                {/* Monthly Revenue */}
                <div className="card p-6 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-500 truncate">Revenus du mois</p>
                      <p className="text-3xl font-bold text-green-400 mt-2 truncate" title={formatCurrency(analytics.monthlyRevenue)}>
                        {formatCurrency(analytics.monthlyRevenue)}
                      </p>
                    </div>
                    <div className="p-3 bg-green-500/20 rounded-xl flex-shrink-0">
                      <Calendar className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Period Comparison */}
              <div className="card p-6 min-w-0 overflow-hidden">
                <h3 className="text-lg font-semibold text-gray-100 mb-4">
                  Comparaison mensuelle
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 mb-2">Revenus</p>
                    <div className="flex flex-wrap items-baseline gap-2 min-w-0">
                      <p className="text-2xl font-bold text-gray-100 truncate">
                        {formatCurrency(analytics.periodComparison.thisMonth.revenue)}
                      </p>
                      <span className={`flex items-center gap-1 text-sm flex-shrink-0 ${
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
                    <p className="text-xs text-gray-500 mt-1 break-words">
                      vs {formatCurrency(analytics.periodComparison.lastMonth.revenue)} mois dernier
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 mb-2">Commandes</p>
                    <div className="flex flex-wrap items-baseline gap-2 min-w-0">
                      <p className="text-2xl font-bold text-gray-100">
                        {analytics.periodComparison.thisMonth.orders}
                      </p>
                      <span className={`flex items-center gap-1 text-sm flex-shrink-0 ${
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
                    <p className="text-xs text-gray-500 mt-1 break-words">
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
                <div className="w-full" style={{ width: '100%', minWidth: 200, height: 300, minHeight: 200 }}>
                <ResponsiveContainer width="100%" height={300} minWidth={200} minHeight={200}>
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
              </div>

              {/* Row 4: Top Products & Customers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Products */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-violet-400" />
                    Top 5 Produits
                  </h3>
                  <div className="space-y-3 min-w-0">
                    {analytics.topProducts.map((product, idx) => (
                      <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-space-800 rounded-xl min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-100 truncate">{product.product_name}</p>
                          <p className="text-xs text-gray-500">{product.order_count} commandes</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-gold-400 truncate" title={formatCurrency(product.total_revenue)}>
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
                  <div className="space-y-3 min-w-0">
                    {analytics.topCustomers.map((customer, idx) => (
                      <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-space-800 rounded-xl min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-100 truncate">{customer.customer_name}</p>
                          <p className="text-xs text-gray-500 truncate">{customer.customer_phone}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-green-400 truncate" title={formatCurrency(customer.total_spent)}>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2 min-w-0 truncate">
              <History className="w-5 h-5 text-violet-400 flex-shrink-0" />
              Historique des mouvements de stock
            </h3>
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <button
                onClick={() => loadLogs()}
                disabled={logsLoading}
                className="text-xs px-3 py-2 min-h-[44px] bg-space-700 text-gray-300 hover:bg-space-600 rounded-lg transition-colors touch-target flex items-center justify-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 flex-shrink-0 ${logsLoading ? 'animate-spin' : ''}`} />
                Réactualiser
              </button>
              <button
                onClick={() => handleClearLogs(30)}
                disabled={actionLoading}
                className="text-xs px-3 py-2 min-h-[44px] bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg transition-colors touch-target"
              >
                {">"} 30 jours
              </button>
              <button
                onClick={() => handleClearLogs()}
                disabled={actionLoading}
                className="text-xs px-3 py-2 min-h-[44px] bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors touch-target flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3 flex-shrink-0" />
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
        <div className="space-y-6 overflow-x-auto min-w-0">
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
            <option key={key} value={key}>{t(value.nameKey)}</option>
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
                  order.status === 'pending' ? 'border-l-4 border-l-amber-500' : order.status === 'delivered' ? 'border-l-4 border-l-emerald-500' : ''
                }`}
              >
                {/* Order Header */}
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`p-3 rounded-xl flex-shrink-0 ${getStatusIconBgClasses(order.status)}`}>
                        <StatusIcon className={`w-6 h-6 ${getStatusIconClasses(order.status)}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-100 truncate">{order.customer_name}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${getStatusBadgeClasses(order.status)}`}>
                            {t(statusInfo.nameKey)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-sm text-gray-400">
                          {order.customer_phone && (
                            <span className="flex items-center gap-1 truncate min-w-0">
                              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{order.customer_phone}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(order.created_at)}
                          </span>
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <Package className="w-3.5 h-3.5" />
                            {order.items?.length || 0} article(s)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 min-w-0">
                      <p className="text-xl font-bold text-gold-400 truncate" title={formatCurrency(order.total_amount, order.currency)}>
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
                          <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-space-900 rounded-xl min-w-0">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-100 truncate">{item.product_name}</p>
                              {item.product_sku && (
                                <p className="text-xs text-gray-500 truncate">SKU: {item.product_sku}</p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0 min-w-0">
                              <p className="text-sm text-gray-300 truncate">
                                {item.quantity} x {formatCurrency(item.unit_price, order.currency)}
                              </p>
                              <p className="text-sm font-medium text-gold-400 truncate" title={formatCurrency(item.total_price, order.currency)}>
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

                    {/* Payment method: only when admin has enabled payment module */}
                    {paymentModuleEnabled && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">Mode de paiement</p>
                        {(order.status === 'pending' || order.status === 'validated') ? (
                          <select
                            value={order.payment_method || 'on_delivery'}
                            onChange={(e) => { e.stopPropagation(); handlePaymentMethodChange(order.id, e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            className="input-dark w-full max-w-xs"
                          >
                            <option value="on_delivery">{t(PAYMENT_METHODS.on_delivery.nameKey)}</option>
                            <option value="online">{t(PAYMENT_METHODS.online.nameKey)}</option>
                          </select>
                        ) : (
                          <p className="text-sm text-gray-300">
                            {t(PAYMENT_METHODS[order.payment_method]?.nameKey || PAYMENT_METHODS.on_delivery.nameKey)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions: send payment link - only when payment module enabled */}
                    {paymentModuleEnabled && ['pending', 'validated', 'delivered'].includes(order.status) && (
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCreatePaymentLink(order); }}
                          className="flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-gold-400/20 hover:bg-gold-400/30 text-gold-400 rounded-xl transition-colors touch-target"
                        >
                          <Link2 className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Envoyer lien de paiement au client</span>
                        </button>
                        {order.conversation_id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSendPaymentLinkInConversation(order); }}
                            disabled={sendingInConversation === order.id}
                            className="flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl transition-colors disabled:opacity-50 touch-target"
                          >
                            {sendingInConversation === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <MessageSquare className="w-4 h-4" />
                            )}
                            <span className="truncate">Envoyer le lien dans la conversation WhatsApp</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Actions for pending orders */}
                    {order.status === 'pending' && (
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                          {order.conversation_id && (
                            <Link
                              to={`/dashboard/conversations/${order.conversation_id}`}
                              className="flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-space-700 hover:bg-space-600 text-gray-300 rounded-xl transition-colors touch-target"
                            >
                              <MessageSquare className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">Voir la conversation</span>
                            </Link>
                          )}
                          <button
                            onClick={() => handleValidate(order.id)}
                            className="flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl transition-colors touch-target"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Valider
                          </button>
                          <button
                            onClick={() => handleReject(order.id)}
                            className="flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors touch-target"
                          >
                            <XCircle className="w-4 h-4" />
                            Rejeter
                          </button>
                        </div>
                        
                        {/* Delete Button for pending */}
                        {showDeleteConfirm === order.id ? (
                          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
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
                            className="flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors touch-target"
                            title="Supprimer cette commande"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Validated: show "Marquer comme livré" + validation info */}
                    {order.status === 'validated' && (
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                          {order.validated_at && (
                            <div className="flex items-center gap-2 text-sm text-green-400">
                              <CheckCircle className="w-4 h-4" />
                              Validée le {formatDate(order.validated_at)}
                              {order.validated_by && ` par ${order.validated_by}`}
                            </div>
                          )}
                          <button
                            onClick={() => handleMarkDelivered(order.id)}
                            className="flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition-colors touch-target"
                          >
                            <Package className="w-4 h-4" />
                            Marquer comme livré
                          </button>
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

                    {/* Delivered info */}
                    {order.status === 'delivered' && order.delivered_at && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                        <div className="flex items-center gap-2 text-sm text-emerald-400 min-w-0">
                          <CheckCircle className="w-4 h-4" />
                          Livrée le {formatDate(order.delivered_at)}
                        </div>
                        {showDeleteConfirm === order.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">Confirmer ?</span>
                            <button onClick={() => handleDelete(order.id)} className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600">Oui</button>
                            <button onClick={() => setShowDeleteConfirm(null)} className="px-3 py-1.5 bg-space-700 text-gray-300 text-sm rounded-lg">Non</button>
                          </div>
                        ) : (
                          <button onClick={() => setShowDeleteConfirm(order.id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Rejection info */}
                    {order.status === 'rejected' && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                        <div className="flex items-center gap-2 text-sm text-red-400 min-w-0 break-words">
                          <XCircle className="w-4 h-4 flex-shrink-0" />
                          <span>Rejetée le {formatDate(order.rejected_at)}
                          {order.rejection_reason && ` - ${order.rejection_reason}`}</span>
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

      {/* Modal Nouvelle commande manuelle */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => !newOrderLoading && setShowNewOrderModal(false)}>
          <div className="bg-space-800 border border-space-700 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-space-700">
              <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-violet-400" />
                Nouvelle commande (manuelle)
              </h2>
              <p className="text-sm text-gray-400 mt-1">Créez une commande en attente de validation.</p>
            </div>
            <form onSubmit={handleCreateOrderSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nom du client *</label>
                <input
                  type="text"
                  value={newOrderForm.customerName}
                  onChange={e => setNewOrderForm(prev => ({ ...prev, customerName: e.target.value }))}
                  className="input-dark w-full"
                  placeholder="Ex. Jean Dupont"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Téléphone</label>
                <input
                  type="text"
                  value={newOrderForm.customerPhone}
                  onChange={e => setNewOrderForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                  className="input-dark w-full"
                  placeholder="Ex. +225 07 00 00 00 00"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">Articles *</label>
                  <button type="button" onClick={addNewOrderLine} className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    Ajouter une ligne
                  </button>
                </div>
                <div className="space-y-3">
                  {newOrderForm.items.map((item, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2 p-3 bg-space-900 rounded-xl border border-space-700">
                      <select
                        value={item.productId || ''}
                        onChange={e => {
                          const p = products.find(pr => pr.id === e.target.value)
                          selectProductForLine(index, p || null)
                        }}
                        className="input-dark flex-1 min-w-[140px]"
                      >
                        <option value="">— Saisie manuelle —</option>
                        {products.filter(p => p.is_active !== 0).map(p => (
                          <option key={p.id} value={p.id}>{p.name} – {Number(p.price || 0).toLocaleString()} FCFA</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={item.productName}
                        onChange={e => updateNewOrderLine(index, 'productName', e.target.value)}
                        className="input-dark w-36"
                        placeholder="Nom produit"
                      />
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => updateNewOrderLine(index, 'quantity', e.target.value)}
                        className="input-dark w-20"
                        placeholder="Qté"
                      />
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={item.unitPrice || ''}
                        onChange={e => updateNewOrderLine(index, 'unitPrice', e.target.value)}
                        className="input-dark w-28"
                        placeholder="Prix unit."
                      />
                      <span className="text-gray-500 text-sm w-16">
                        {((item.quantity || 1) * (Number(item.unitPrice) || 0)).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeNewOrderLine(index)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                        title="Supprimer la ligne"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                <textarea
                  value={newOrderForm.notes}
                  onChange={e => setNewOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-dark w-full min-h-[80px]"
                  placeholder="Optionnel"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Devise</label>
                  <select
                    value={newOrderForm.currency}
                    onChange={e => setNewOrderForm(prev => ({ ...prev, currency: e.target.value }))}
                    className="input-dark"
                  >
                    <option value="XOF">XOF (FCFA)</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                {paymentModuleEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Paiement</label>
                    <select
                      value={newOrderForm.paymentMethod}
                      onChange={e => setNewOrderForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      className="input-dark"
                    >
                      <option value="on_delivery">À la livraison</option>
                      <option value="online">En ligne</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4 border-t border-space-700">
                <button
                  type="button"
                  onClick={() => !newOrderLoading && setShowNewOrderModal(false)}
                  className="flex-1 px-4 py-3 bg-space-700 hover:bg-space-600 text-gray-200 rounded-xl transition-colors"
                  disabled={newOrderLoading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={newOrderLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  {newOrderLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Créer la commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
