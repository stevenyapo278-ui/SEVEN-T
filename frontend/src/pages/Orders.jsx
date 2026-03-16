import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { useTheme } from '../contexts/ThemeContext'
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
  Plus,
  Square,
  CheckSquare,
  ArrowLeft
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

import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { registerLocale } from 'react-datepicker'
import fr from 'date-fns/locale/fr'
registerLocale('fr', fr)

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
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { user } = useAuth()
  const { showConfirm } = useConfirm()
  const paymentModuleEnabled = !!(user?.plan_features?.payment_module || user?.payment_module_enabled === 1 || user?.payment_module_enabled === true)
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const statusFromUrl = searchParams.get('status')
  const activeTab = ORDERS_TABS.some((t) => t.id === tabFromUrl) ? tabFromUrl : 'orders'

  const setActiveTab = (tab) => {
    if (tab === 'orders') setSearchParams({})
    else setSearchParams({ tab })
  }

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ pending: 0, validated: 0, delivered: 0, rejected: 0, totalRevenue: 0 })
  const [statusFilter, setStatusFilter] = useState(() => {
    const s = statusFromUrl || 'all'
    return ['all', 'pending', 'validated', 'delivered', 'rejected', 'completed', 'cancelled'].includes(s) ? s : 'all'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrderView, setSelectedOrderView] = useState(null)
  const [focusStat, setFocusStat] = useState(null)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [showCleanupMenu, setShowCleanupMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30d')
  const [paymentLinkModal, setPaymentLinkModal] = useState({ open: false, order: null, message: '', url: '', loading: false })
  const [geniuspayConfigured, setGeniuspayConfigured] = useState(false)
  const [sendingInConversation, setSendingInConversation] = useState(null)
  const [selectedOrderIds, setSelectedOrderIds] = useState([])
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
  useLockBodyScroll(showNewOrderModal || paymentLinkModal.open)

  useEffect(() => {
    if (statusFromUrl && ['pending', 'validated', 'delivered', 'rejected', 'completed', 'cancelled'].includes(statusFromUrl)) {
      setStatusFilter(statusFromUrl)
    }
  }, [statusFromUrl])

  useEffect(() => {
    loadOrders()
    loadStats()
  }, [])

  useEffect(() => {
    if (!paymentModuleEnabled) return
    const loadPaymentProviders = async () => {
      try {
        const res = await api.get('/payments/providers')
        setGeniuspayConfigured(!!res.data?.configured?.geniuspay)
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
      setSelectedOrderIds([]) // Reset selection on reload
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
      const provider = geniuspayConfigured ? 'geniuspay' : 'manual'
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
        if (selectedOrderView?.id === orderId) {
          setSelectedOrderView(response.data.order)
        }
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
        if (selectedOrderView?.id === orderId) {
          setSelectedOrderView(response.data.order)
        }
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
        if (selectedOrderView?.id === orderId) {
          setSelectedOrderView(response.data.order)
        }
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

  const handleUnmarkDelivered = async (orderId) => {
    try {
      const response = await api.post(`/orders/${orderId}/unmark-delivered`)
      if (response.data.success) {
        toast.success('Livraison annulée (retour au statut validé)')
        if (selectedOrderView?.id === orderId) {
          setSelectedOrderView(response.data.order)
        }
        loadOrders()
        loadStats()
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
    }
  }

  const handleRevertToPending = async (orderId) => {
    const ok = await showConfirm({
      title: 'Remettre en attente ?',
      message: 'Cette action remettra les produits en stock et repassera la commande au statut "En attente".',
      variant: 'warning',
      confirmLabel: 'Confirmer'
    })
    if (!ok) return
    try {
      const response = await api.post(`/orders/${orderId}/revert-to-pending`)
      if (response.data.success) {
        toast.success('Commande remise en attente et stock restauré')
        if (selectedOrderView?.id === orderId) {
          setSelectedOrderView(response.data.order)
        }
        loadOrders()
        loadStats()
        loadLogs()
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
    }
  }

  const toggleOrderSelection = (id, e) => {
    e?.stopPropagation()
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleBulkValidate = async () => {
    if (selectedOrderIds.length === 0) return
    setActionLoading(true)
    try {
      const res = await api.post('/orders/bulk-validate', { orderIds: selectedOrderIds })
      const count = res.data.success.length
      const failed = res.data.failed.length
      if (count > 0) toast.success(`${count} commande(s) validée(s)`)
      if (failed > 0) toast.error(`${failed} erreur(s) (problème de stock ?)`)
      loadOrders()
      loadStats()
    } catch (error) {
      toast.error('Erreur lors de l\'action par lot')
    } finally {
      setActionLoading(false)
    }
  }

  const handleBulkMarkDelivered = async () => {
    if (selectedOrderIds.length === 0) return
    setActionLoading(true)
    try {
      const res = await api.post('/orders/bulk-mark-delivered', { orderIds: selectedOrderIds })
      const count = res.data.success.length
      if (count > 0) toast.success(`${count} commande(s) marquée(s) comme livrée(s)`)
      loadOrders()
      loadStats()
    } catch (error) {
      toast.error('Erreur lors de l\'action par lot')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (orderId) => {
    const reason = prompt('Raison du rejet (optionnel):')
    try {
      const response = await api.post(`/orders/${orderId}/reject`, { reason })
      toast.success('Commande rejetée')
      if (selectedOrderView && selectedOrderView.id === orderId) {
        setSelectedOrderView(response.data.order)
      }
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
    
    // Date filtering
    let matchesDate = true
    if (dateRange.start || dateRange.end) {
      const orderDate = new Date(order.created_at)
      orderDate.setHours(0, 0, 0, 0)
      
      if (dateRange.start) {
        const start = new Date(dateRange.start)
        start.setHours(0, 0, 0, 0)
        if (orderDate < start) matchesDate = false
      }
      
      if (dateRange.end) {
        const end = new Date(dateRange.end)
        end.setHours(23, 59, 59, 999)
        if (orderDate > end) matchesDate = false
      }
    }

    return matchesStatus && matchesSearch && matchesDate
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
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0">
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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2 min-w-0">
              <div className="p-2 bg-blue-500/10 rounded-xl flex-shrink-0">
                <ShoppingCart className="w-6 h-6 text-blue-400" />
              </div>
              <h1 className={`text-2xl sm:text-3xl font-display font-bold break-words ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('orders.title')}</h1>
            </div>
            <p className={`text-base sm:text-lg break-words ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
              {t('orders.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 relative z-20">
            <button
              onClick={openNewOrderModal}
              className="btn-primary flex items-center gap-2 min-h-[44px]"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Nouveau</span>
            </button>
            <button
              onClick={handleExportCsv}
              className={`flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl transition-all duration-200 ${
                isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700 hover:text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Export</span>
            </button>
            <button
              onClick={() => { setActiveTab('logs'); loadLogs(); }}
              className={`flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl transition-all duration-200 ${
                activeTab === 'logs'
                  ? 'bg-blue-500 text-white'
                  : isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Logs</span>
            </button>

              {/* Cleanup Menu */}
              <div className="relative cleanup-menu-container">
                  <button
                    onClick={() => setShowCleanupMenu(!showCleanupMenu)}
                    className="px-4 py-2 min-h-[44px] rounded-xl flex items-center justify-center gap-2 bg-space-800 text-gray-300 hover:bg-space-700 transition-colors touch-target whitespace-nowrap text-sm sm:text-base"
                  >
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 transition-transform ${showCleanupMenu ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showCleanupMenu && (
                    <>
                      {/* Mobile Backdrop */}
                      <div 
                        className="fixed inset-0 z-[60] bg-space-950/40 backdrop-blur-sm lg:hidden animate-fadeIn" 
                        onClick={() => setShowCleanupMenu(false)}
                      />
                      
                      {/* Menu Container: Mobile Bottom Sheet / Desktop Dropdown */}
                      <div className="fixed lg:absolute bottom-0 lg:bottom-auto left-0 lg:left-auto right-0 lg:right-0 lg:top-full z-[70] p-4 lg:p-0 lg:mt-2 transition-all">
                        <div className="bg-space-800 border border-space-700 rounded-3xl lg:rounded-xl shadow-2xl overflow-hidden w-full lg:w-64 animate-slideUp lg:animate-fadeIn origin-bottom lg:origin-top-right">
                          <div className="p-3 lg:p-2 border-b border-space-700">
                            <p className="text-xs text-gray-500 px-2 uppercase tracking-wider font-bold">Supprimer par statut</p>
                          </div>
                          <div className="p-2 lg:p-1 space-y-1">
                            <button
                              onClick={() => handleBulkDelete('rejected')}
                              disabled={actionLoading}
                              className="w-full flex items-center gap-3 px-4 py-3 lg:px-3 lg:py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl lg:rounded-lg transition-colors touch-target"
                            >
                              <XCircle className="w-5 h-5 lg:w-4 lg:h-4" />
                              <span className="flex-1 text-left">Supprimer les rejetées ({stats.rejected})</span>
                            </button>
                            <button
                              onClick={() => handleBulkDelete('cancelled')}
                              disabled={actionLoading}
                              className="w-full flex items-center gap-3 px-4 py-3 lg:px-3 lg:py-2 text-sm text-gray-400 hover:bg-space-700 rounded-xl lg:rounded-lg transition-colors touch-target"
                            >
                              <X className="w-5 h-5 lg:w-4 lg:h-4" />
                              <span className="flex-1 text-left">Supprimer les annulées</span>
                            </button>
                          </div>
                          <div className="p-3 lg:p-2 border-t border-space-700">
                            <p className="text-xs text-gray-500 px-2 uppercase tracking-wider font-bold">Nettoyage automatique</p>
                          </div>
                          <div className="p-2 lg:p-1 space-y-1">
                            <button
                              onClick={() => handleCleanup(7)}
                              disabled={actionLoading}
                              className="w-full flex items-center gap-3 px-4 py-3 lg:px-3 lg:py-2 text-sm text-amber-400 hover:bg-amber-500/10 rounded-xl lg:rounded-lg transition-colors touch-target"
                            >
                              <RefreshCw className="w-5 h-5 lg:w-4 lg:h-4" />
                              <span className="flex-1 text-left">Nettoyer {">"} 7 jours</span>
                            </button>
                            <button
                              onClick={() => handleCleanup(30)}
                              disabled={actionLoading}
                              className="w-full flex items-center gap-3 px-4 py-3 lg:px-3 lg:py-2 text-sm text-amber-400 hover:bg-amber-500/10 rounded-xl lg:rounded-lg transition-colors touch-target"
                            >
                              <RefreshCw className="w-5 h-5 lg:w-4 lg:h-4" />
                              <span className="flex-1 text-left">Nettoyer {">"} 30 jours</span>
                            </button>
                          </div>
                          {actionLoading && (
                            <div className="p-4 flex items-center justify-center bg-space-900/50">
                              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                            </div>
                          )}
                          
                          {/* Mobile close button for better UX */}
                          <button 
                            onClick={() => setShowCleanupMenu(false)}
                            className="w-full py-4 lg:hidden text-sm text-gray-500 font-medium border-t border-space-700 bg-space-900/20"
                          >
                            Fermer
                          </button>
                        </div>
                      </div>
                    </>
                  )}
              </div>
            </div>
          </div>

          {/* Stats - always visible in header */}
          {/* Stats - always visible in header */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-8 min-w-0">
            <div 
              onClick={() => setFocusStat({ label: 'En attente', value: stats.pending, icon: Clock, color: 'amber' })}
              className={`rounded-xl p-4 border transition-all duration-300 cursor-pointer ${
                isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800 hover:scale-[1.02]' : 'bg-white border-gray-100 hover:shadow-md hover:scale-[1.02]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-amber-500/10 rounded-xl flex-shrink-0">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div className="min-w-0 overflow-hidden flex-1">
                  <p className={`text-2xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.pending}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>En attente</p>
                </div>
              </div>
            </div>
            
            <div 
              onClick={() => setFocusStat({ label: 'Validées', value: stats.validated, icon: CheckCircle, color: 'green' })}
              className={`rounded-xl p-4 border transition-all duration-300 cursor-pointer ${
                isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800 hover:scale-[1.02]' : 'bg-white border-gray-100 hover:shadow-md hover:scale-[1.02]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-green-500/10 rounded-xl flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="min-w-0 overflow-hidden flex-1">
                  <p className={`text-2xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.validated}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Validées</p>
                </div>
              </div>
            </div>

            <div 
              onClick={() => setFocusStat({ label: 'Livrées', value: stats.delivered ?? 0, icon: CheckCircle, color: 'emerald' })}
              className={`rounded-xl p-4 border transition-all duration-300 cursor-pointer ${
                isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800 hover:scale-[1.02]' : 'bg-white border-gray-100 hover:shadow-md hover:scale-[1.02]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-emerald-500/10 rounded-xl flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="min-w-0 overflow-hidden flex-1">
                  <p className={`text-2xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.delivered ?? 0}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Livrées</p>
                </div>
              </div>
            </div>

            <div 
              onClick={() => setFocusStat({ label: 'Rejetées', value: stats.rejected, icon: XCircle, color: 'red' })}
              className={`rounded-xl p-4 border transition-all duration-300 cursor-pointer ${
                isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800 hover:scale-[1.02]' : 'bg-white border-gray-100 hover:shadow-md hover:scale-[1.02]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-red-500/10 rounded-xl flex-shrink-0">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div className="min-w-0 overflow-hidden flex-1">
                  <p className={`text-2xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.rejected}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Rejetées</p>
                </div>
              </div>
            </div>

            <div 
              onClick={() => setFocusStat({ label: 'Revenus', value: formatCurrency(stats.totalRevenue), icon: TrendingUp, color: 'gold' })}
              className={`rounded-xl p-4 border transition-all duration-300 col-span-2 sm:col-span-3 lg:col-span-1 cursor-pointer ${
                isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800 hover:scale-[1.02]' : 'bg-white border-gray-100 hover:shadow-md hover:scale-[1.02]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-gold-400/10 rounded-xl flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-gold-400" />
                </div>
                <div className="min-w-0 overflow-hidden flex-1">
                  <p className={`text-2xl font-bold truncate text-gold-400`}>{formatCurrency(stats.totalRevenue)}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Revenus</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className={`border-b mb-6 overflow-x-auto overflow-y-hidden -mx-1 px-1 sm:mx-0 sm:px-0 ${isDark ? 'border-space-700' : 'border-gray-200'}`} style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-1 min-w-max">
          {ORDERS_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 px-3 sm:px-4 border-b-2 transition-all duration-200 whitespace-nowrap flex-shrink-0 touch-target ${
                  isActive
                    ? 'border-gold-400 text-gold-400'
                    : `border-transparent ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{t(tab.nameKey)}</span>
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
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
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
                      <p className="text-3xl font-bold text-blue-400 mt-2 truncate">
                        {analytics.conversionRate}%
                      </p>
                    </div>
                    <div className="p-3 bg-blue-500/20 rounded-xl flex-shrink-0">
                      <TrendingUp className="w-6 h-6 text-blue-400" />
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
                    <Package className="w-5 h-5 text-blue-400" />
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
              <History className="w-5 h-5 text-blue-400 flex-shrink-0" />
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
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
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
      {/* Filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className={`flex-1 flex items-center gap-3 px-4 py-3 sm:py-3.5 rounded-2xl border transition-all duration-300 ${
            isDark ? 'bg-space-800/50 border-space-700/50 focus-within:border-space-600' : 'bg-white border-gray-200 focus-within:border-gray-300'
          }`}>
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Nom, téléphone ou n° commande..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none p-0 focus:ring-0 w-full text-base sm:text-lg placeholder:text-gray-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-4 py-3 sm:py-3.5 rounded-2xl border min-w-[200px] transition-all duration-300 ${
              isDark ? 'bg-space-800 focus:bg-space-700 border-space-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
            }`}
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(ORDER_STATUSES).map(([key, value]) => (
              <option key={key} value={key}>{t(value.nameKey)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Période :</span>
          </div>
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <DatePicker
              selected={dateRange.start ? new Date(dateRange.start) : null}
              onChange={(date) => setDateRange(prev => ({ ...prev, start: date ? date.toISOString().slice(0, 10) : '' }))}
              dateFormat="dd/MM/yyyy"
              placeholderText="Début"
              locale="fr"
              className={`flex-1 sm:flex-none px-3 py-2 rounded-xl border text-sm w-full sm:w-32 ${
                isDark ? 'bg-space-800 border-space-700 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
              }`}
            />
            <span className="text-gray-500">à</span>
            <DatePicker
              selected={dateRange.end ? new Date(dateRange.end) : null}
              onChange={(date) => setDateRange(prev => ({ ...prev, end: date ? date.toISOString().slice(0, 10) : '' }))}
              dateFormat="dd/MM/yyyy"
              placeholderText="Fin"
              locale="fr"
              className={`flex-1 sm:flex-none px-3 py-2 rounded-xl border text-sm w-full sm:w-32 ${
                isDark ? 'bg-space-800 border-space-700 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
              }`}
            />
          </div>
          {(dateRange.start || dateRange.end) && (
            <button
              onClick={() => setDateRange({ start: '', end: '' })}
              className="text-xs text-red-400 hover:text-red-300 font-bold px-2 py-1"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${isDark ? 'bg-space-800' : 'bg-gray-100'}`}>
            <ShoppingCart className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {orders.length === 0 ? 'Aucune commande' : 'Aucun résultat'}
          </h3>
          <p className={`${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            Les commandes détectées par l'IA apparaîtront ici
          </p>
        </div>
      ) : (
        <div className="space-y-2 relative pb-20 sm:pb-0">
          {/* Intelligent Bulk Actions Bar */}
          {selectedOrderIds.length > 0 && (() => {
            const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
            const canValidateCount = selectedOrders.filter(o => o.status === 'pending').length;
            const canDeliverCount = selectedOrders.filter(o => o.status === 'validated').length;
            
            return (
              <div className={`fixed sm:sticky bottom-4 sm:bottom-auto sm:top-0 left-4 right-4 sm:left-0 sm:right-0 z-40 sm:z-30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 sm:p-4 mb-4 rounded-2xl sm:rounded-3xl border animate-slideUp sm:animate-slideDown shadow-2xl backdrop-blur-xl ${
                isDark 
                  ? 'bg-space-900/90 border-blue-500/30 ring-1 ring-blue-500/20' 
                  : 'bg-white/95 border-blue-200 ring-1 ring-blue-100'
              }`}>
                <div className="flex items-center justify-between sm:justify-start gap-4 mb-3 sm:mb-0 px-2 sm:px-0">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setSelectedOrderIds([])}
                      className="p-2 hover:bg-red-500/10 rounded-xl text-red-500 transition-colors"
                      title="Annuler la sélection"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col">
                      <span className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        {selectedOrderIds.length} sélectionnée(s)
                      </span>
                      <button 
                        onClick={() => {
                          const allIds = filteredOrders.map(o => o.id);
                          const allSelected = allIds.every(id => selectedOrderIds.includes(id));
                          if (allSelected) {
                            setSelectedOrderIds(prev => prev.filter(id => !allIds.includes(id)));
                          } else {
                            setSelectedOrderIds(prev => Array.from(new Set([...prev, ...allIds])));
                          }
                        }}
                        className="text-[10px] text-gray-500 hover:text-blue-500 font-bold uppercase text-left transition-colors"
                      >
                        {filteredOrders.every(o => selectedOrderIds.includes(o.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canValidateCount > 0 && (
                    <button
                      onClick={handleBulkValidate}
                      disabled={actionLoading}
                      className="flex-1 sm:flex-none btn-primary py-2.5 sm:py-2 px-4 shadow-lg shadow-blue-500/20 text-xs sm:text-sm flex items-center justify-center gap-2 group transition-all active:scale-95"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 group-hover:rotate-12 transition-transform" />}
                      <span className="whitespace-nowrap">Valider ({canValidateCount})</span>
                    </button>
                  )}
                  
                  {canDeliverCount > 0 && (
                    <button
                      onClick={handleBulkMarkDelivered}
                      disabled={actionLoading}
                      className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 sm:py-2 px-4 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 group"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />}
                      <span className="whitespace-nowrap">Livrer ({canDeliverCount})</span>
                    </button>
                  )}

                  {canValidateCount === 0 && canDeliverCount === 0 && (
                    <div className="flex-1 text-center sm:text-right px-4">
                      <span className="text-[10px] sm:text-xs text-gray-500 font-medium italic">
                        Aucune action disponible pour ces statuts
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {filteredOrders.map((order, index) => {
            const statusInfo = getStatusInfo(order.status)
            const StatusIcon = statusInfo.icon
            const isSelected = selectedOrderIds.includes(order.id)
            return (
              <div 
                key={order.id}
                onClick={() => setSelectedOrderView(order)}
                className={`group block p-3 rounded-xl border transition-all duration-300 animate-fadeIn cursor-pointer relative ${
                  isSelected ? (isDark ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/30' : 'bg-blue-50 border-blue-300 ring-1 ring-blue-200') 
                  : isDark ? 'bg-space-800/50 hover:bg-space-800 border-space-700/50' : 'bg-white border-gray-200 hover:border-gray-300'
                } ${
                  order.status === 'pending' ? 'border-l-2 border-l-amber-500' : 
                  order.status === 'delivered' ? 'border-l-2 border-l-emerald-500' : 
                  order.status === 'rejected' ? 'border-l-2 border-l-red-500' : ''
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div 
                      onClick={(e) => toggleOrderSelection(order.id, e)}
                      className={`p-1 rounded-lg transition-colors ${
                        isSelected ? 'text-blue-500' : 'text-gray-600 hover:text-gray-400'
                      }`}
                    >
                      {isSelected ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                    </div>
                    <div className={`p-2 rounded-xl flex-shrink-0 ${isDark ? 'bg-space-800' : 'bg-gray-100'} group-hover:scale-110 transition-transform duration-300`}>
                      <StatusIcon className={`w-6 h-6 ${getStatusIconClasses(order.status)}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className={`font-semibold text-sm sm:text-base truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{order.customer_name}</h3>
                        <div 
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            ['validated', 'delivered'].includes(order.status) ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]' :
                            order.status === 'pending' || order.status === 'completed' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' :
                            'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                          }`}
                          title={t(statusInfo.nameKey)}
                        />
                      </div>
                      <div className={`flex items-center gap-2 text-[10px] sm:text-xs font-medium ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                        <span className="truncate">{formatDate(order.created_at)}</span>
                        <span>•</span>
                        <span className="truncate">{order.items?.length || 0} articles</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-base sm:text-lg font-display font-bold text-gold-400 whitespace-nowrap">
                      {formatCurrency(order.total_amount, order.currency)}
                    </p>
                    <p className={`text-[10px] font-mono ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>#{order.id.substring(0, 8)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
        </div>
      )}

      {/* Order Detail Zoom View */}
      {selectedOrderView && (
        <DetailOverlay onClose={() => setSelectedOrderView(null)}>
          <div className="flex flex-col">
            <div className="flex items-center gap-4 mb-8">
              <div className={`p-4 rounded-3xl ${getStatusIconBgClasses(selectedOrderView.status)} shadow-lg shadow-black/20`}>
                <div className={getStatusIconClasses(selectedOrderView.status)}>
                  {(() => {
                    const Icon = getStatusInfo(selectedOrderView.status).icon
                    return <Icon className="w-8 h-8" />
                  })()}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-2xl font-display font-bold text-gray-100 truncate">{selectedOrderView.customer_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClasses(selectedOrderView.status)}`}>
                    {t(getStatusInfo(selectedOrderView.status).nameKey)}
                  </span>
                  <p className="text-xs text-gray-500">#{selectedOrderView.id.substring(0, 8)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Customer Info & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedOrderView.customer_phone && (
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Téléphone</p>
                    <p className="text-gray-100 font-medium truncate font-mono">{selectedOrderView.customer_phone}</p>
                  </div>
                )}
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Date de création</p>
                  <p className="text-gray-100 font-medium">{formatDate(selectedOrderView.created_at)}</p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h4 className="text-[10px] text-gray-500 uppercase font-black px-1 tracking-widest">Articles</h4>
                <div className="space-y-2">
                  {selectedOrderView.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-100 truncate">{item.product_name}</p>
                        <p className="text-xs text-gray-500">{item.quantity} x {formatCurrency(item.unit_price, selectedOrderView.currency)}</p>
                      </div>
                      <p className="text-sm font-bold text-gold-400 ml-4 whitespace-nowrap font-mono">
                        {formatCurrency(item.total_price, selectedOrderView.currency)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between p-5 bg-gold-400/5 rounded-2xl border border-gold-400/20 mt-6 group transition-all hover:bg-gold-400/10">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total commande</p>
                  <p className="text-2xl font-display font-bold text-gold-400 font-mono tracking-tight group-hover:scale-105 transition-transform">{formatCurrency(selectedOrderView.total_amount, selectedOrderView.currency)}</p>
                </div>
              </div>

              {/* Notes */}
              {selectedOrderView.notes && (
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                  <p className="text-[10px] text-gray-500 uppercase font-black mb-2 tracking-widest">Notes</p>
                  <p className="text-sm text-gray-300 leading-relaxed italic">{selectedOrderView.notes}</p>
                </div>
              )}

              {/* Payment Method Integration */}
              {paymentModuleEnabled && (selectedOrderView.status === 'pending' || selectedOrderView.status === 'validated') && (
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase font-black mb-3 tracking-widest">Mode de paiement souhaité</p>
                  <select
                    value={selectedOrderView.payment_method || 'on_delivery'}
                    onChange={(e) => handlePaymentMethodChange(selectedOrderView.id, e.target.value)}
                    className="input-dark w-full py-3 px-4 rounded-xl"
                  >
                    <option value="on_delivery">{t(PAYMENT_METHODS.on_delivery.nameKey)}</option>
                    <option value="online">{t(PAYMENT_METHODS.online.nameKey)}</option>
                  </select>
                </div>
              )}

              {/* Payment Link Actions */}
              {paymentModuleEnabled && ['pending', 'validated', 'delivered'].includes(selectedOrderView.status) && (
                <div className="space-y-3">
                  <h4 className="text-[10px] text-gray-500 uppercase font-black px-1 tracking-widest">Paiement & WhatsApp</h4>
                  <div className="grid grid-cols-1 gap-3 text-center">
                    <button
                      onClick={() => handleCreatePaymentLink(selectedOrderView)}
                      className="flex items-center justify-center gap-2 px-6 py-4 bg-white text-black rounded-2xl transition-all font-bold text-sm hover:bg-gold-400 active:scale-95"
                    >
                      <Link2 className="w-4 h-4" />
                      Générer un lien de paiement
                    </button>
                    {selectedOrderView.conversation_id && (
                      <button
                        onClick={() => handleSendPaymentLinkInConversation(selectedOrderView)}
                        disabled={sendingInConversation === selectedOrderView.id}
                        className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-2xl transition-all font-bold text-sm disabled:opacity-50 border border-emerald-500/20"
                      >
                        {sendingInConversation === selectedOrderView.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                        Envoyer sur WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Status Specific Timeline */}
              {(selectedOrderView.status === 'validated' || selectedOrderView.status === 'delivered' || selectedOrderView.status === 'rejected') && (
                <div className={`p-4 rounded-3xl border-2 flex items-start gap-4 ${
                  selectedOrderView.status === 'validated' ? 'bg-emerald-500/5 border-emerald-500/10' :
                  selectedOrderView.status === 'delivered' ? 'bg-emerald-500/5 border-emerald-500/10' :
                  'bg-red-500/5 border-red-500/10'
                }`}>
                  <div className={`p-3 rounded-2xl flex-shrink-0 ${
                    selectedOrderView.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {selectedOrderView.status === 'rejected' ? <XCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-black uppercase tracking-widest ${selectedOrderView.status === 'rejected' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {selectedOrderView.status === 'validated' ? 'Commande Validée' : 
                       selectedOrderView.status === 'delivered' ? 'Commande Livrée' : 'Commande Rejetée'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {formatDate(selectedOrderView.validated_at || selectedOrderView.delivered_at || selectedOrderView.rejected_at)}
                      {selectedOrderView.validated_by && <span className="text-gray-500 block">par {selectedOrderView.validated_by}</span>}
                    </p>
                    {selectedOrderView.rejection_reason && (
                      <p className="text-sm text-red-400/80 mt-2 italic px-3 py-2 bg-red-500/10 rounded-xl">Raison: {selectedOrderView.rejection_reason}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Action Footer inside Zoom */}
              <div className="pt-8 border-t border-white/5 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  {selectedOrderView.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleValidate(selectedOrderView.id)}
                        className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-display font-black italic hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] text-lg uppercase tracking-tighter"
                      >
                        Valider
                      </button>
                      <button
                        onClick={() => handleReject(selectedOrderView.id)}
                        className="flex-1 py-4 bg-white/5 text-red-400 border border-red-500/20 rounded-2xl font-bold hover:bg-red-500/10 transition-all active:scale-[0.98] text-lg"
                      >
                        Rejeter
                      </button>
                    </>
                  )}
                  {selectedOrderView.status === 'validated' && (
                    <>
                      <button
                        onClick={() => handleMarkDelivered(selectedOrderView.id)}
                        className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-display font-black italic hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] text-lg uppercase tracking-tighter"
                      >
                        Marquer Livrée
                      </button>
                      <button
                        onClick={() => handleRevertToPending(selectedOrderView.id)}
                        className="flex-1 py-4 bg-white/5 text-gray-400 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                        title="Annuler la validation et remettre en stock"
                      >
                        <ArrowLeft className="w-5 h-5" />
                        Attente
                      </button>
                    </>
                  )}
                  {selectedOrderView.status === 'delivered' && (
                    <button
                      onClick={() => handleUnmarkDelivered(selectedOrderView.id)}
                      className="w-full py-4 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl font-bold hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      Annuler livraison (Retour à Validé)
                    </button>
                  )}
                  {selectedOrderView.status === 'rejected' && (
                    <button
                      onClick={() => handleRevertToPending(selectedOrderView.id)}
                      className="w-full py-4 bg-white/5 text-gray-400 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      Ré-ouvrir (Remettre en attente)
                    </button>
                  )}
                </div>
                
                {selectedOrderView.conversation_id && (
                  <Link
                    to={`/dashboard/conversations/${selectedOrderView.conversation_id}`}
                    onClick={() => setSelectedOrderView(null)}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl transition-all font-bold text-sm border border-white/5"
                  >
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                    Voir sur WhatsApp
                  </Link>
                )}
              </div>
            </div>
          </div>
        </DetailOverlay>
      )}

      {paymentLinkModal.open && createPortal(
        <div 
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => !paymentLinkModal.loading && setPaymentLinkModal(prev => ({ ...prev, open: false }))}
          style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
        >
          <div 
            className="relative z-10 w-full max-w-lg bg-[#0B0F1A] border border-white/10 rounded-t-[2rem] sm:rounded-2xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden animate-slideUp sm:animate-zoomIn"
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile Handle */}
            <div className="flex-shrink-0 w-full flex justify-center pt-2 pb-1 sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-white/10" />
            </div>

            <div className="flex-shrink-0 p-6 sm:p-8" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-display font-bold text-gray-100">Lien de paiement</h3>
                <button 
                  onClick={() => setPaymentLinkModal(prev => ({ ...prev, open: false }))} 
                  className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/5"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 space-y-6 custom-scrollbar overscroll-contain" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
              {paymentLinkModal.loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-12 h-12 border-4 border-gold-400/20 border-t-gold-400 rounded-full animate-spin" />
                  <p className="text-gray-500 font-medium font-mono text-xs uppercase tracking-widest">Génération du lien...</p>
                </div>
              ) : (
                <>
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-3">Message pour le client</p>
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                      {paymentLinkModal.message}
                    </pre>
                  </div>

                  {paymentLinkModal.url && (
                    <div className="flex items-center gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                      <ExternalLink className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <a href={paymentLinkModal.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline truncate text-sm font-mono flex-1">
                        {paymentLinkModal.url}
                      </a>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                    <button
                      onClick={copyPaymentMessage}
                      className="flex items-center justify-center gap-2 px-6 py-4 bg-white text-black rounded-2xl transition-all font-bold hover:bg-gray-200 active:scale-95 shadow-xl"
                    >
                      <Copy className="w-5 h-5" />
                      Copier
                    </button>
                    <button
                      onClick={openWhatsAppWithPayment}
                      className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-white rounded-2xl transition-all font-bold hover:bg-emerald-400 active:scale-95 shadow-xl shadow-emerald-500/20"
                    >
                      <MessageSquare className="w-5 h-5" />
                      WhatsApp
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Nouvelle commande manuelle */}
      {showNewOrderModal && createPortal(
        <div 
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 lg:p-4 bg-black/80 backdrop-blur-md" 
          onClick={() => !newOrderLoading && setShowNewOrderModal(false)}
          style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
        >
          <div 
            className="relative z-10 bg-[#0B0F1A] border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] max-w-2xl w-full max-h-[92dvh] sm:max-h-[85vh] flex flex-col animate-slideUp sm:animate-zoomIn overflow-hidden" 
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
                    Nouvelle commande
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 truncate">Créez manuellement une commande client</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/5"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 space-y-8 custom-scrollbar overscroll-contain">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Client *</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={newOrderForm.customerName}
                        onChange={e => setNewOrderForm(prev => ({ ...prev, customerName: e.target.value }))}
                        className="input-dark w-full pl-12 py-4 px-5 text-base rounded-2xl"
                        placeholder="Nom complet"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={newOrderForm.customerPhone}
                        onChange={e => setNewOrderForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                        className="input-dark w-full pl-12 py-4 px-5 text-base rounded-2xl"
                        placeholder="+225 ..."
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Articles & Produits</label>
                    <button type="button" onClick={addNewOrderLine} className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors">
                      <Plus className="w-4 h-4" />
                      Ajouter une ligne
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {newOrderForm.items.map((item, index) => (
                      <div key={index} className="group relative flex flex-col gap-3 p-5 bg-white/[0.02] rounded-3xl border border-white/5 hover:bg-white/[0.04] transition-all">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex-1 min-w-[200px]">
                            <select
                              value={item.productId || ''}
                              onChange={e => {
                                const p = products.find(pr => pr.id === e.target.value)
                                selectProductForLine(index, p || null)
                              }}
                              className="input-dark w-full py-3 px-4 rounded-xl text-sm"
                            >
                              <option value="">— Saisie libre —</option>
                              {products.filter(p => p.is_active !== 0).map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({Number(p.price || 0).toLocaleString()})</option>
                              ))}
                            </select>
                          </div>
                          {!item.productId && (
                            <input
                              type="text"
                              value={item.productName}
                              onChange={e => updateNewOrderLine(index, 'productName', e.target.value)}
                              className="input-dark flex-[2] min-w-[150px] py-3 px-4 rounded-xl text-sm"
                              placeholder="Nom de l'article"
                              required
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeNewOrderLine(index)}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all self-start lg:self-center"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-600 uppercase ml-1">Quantité</label>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={e => updateNewOrderLine(index, 'quantity', e.target.value)}
                              className="input-dark w-full py-2.5 px-4 rounded-xl text-sm font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-600 uppercase ml-1">Prix Unitaire</label>
                            <input
                              type="number"
                              min={0}
                              value={item.unitPrice || ''}
                              onChange={e => updateNewOrderLine(index, 'unitPrice', e.target.value)}
                              className="input-dark w-full py-2.5 px-4 rounded-xl text-sm font-mono"
                            />
                          </div>
                          <div className="lg:col-span-2 space-y-1 flex flex-col justify-end">
                            <div className="bg-black/20 rounded-xl p-2.5 text-right border border-white/5">
                              <span className="text-[10px] text-gray-500 uppercase font-bold mr-2">Sous-total</span>
                              <span className="text-sm font-mono font-bold text-gold-400">
                                {((item.quantity || 1) * (Number(item.unitPrice) || 0)).toLocaleString()} {newOrderForm.currency}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Notes internes</label>
                    <textarea
                      value={newOrderForm.notes}
                      onChange={e => setNewOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="input-dark w-full min-h-[100px] py-4 px-5 rounded-2xl resize-none"
                      placeholder="Adresse de livraison, instructions, etc."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Devise</label>
                      <select
                        value={newOrderForm.currency}
                        onChange={e => setNewOrderForm(prev => ({ ...prev, currency: e.target.value }))}
                        className="input-dark w-full py-4 px-5 rounded-2xl"
                      >
                        <option value="XOF">FCFA (XOF)</option>
                        <option value="EUR">Euro (€)</option>
                        <option value="USD">Dollar ($)</option>
                      </select>
                    </div>
                    {paymentModuleEnabled && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Mode de Paiement</label>
                        <select
                          value={newOrderForm.paymentMethod}
                          onChange={e => setNewOrderForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                          className="input-dark w-full py-4 px-5 rounded-2xl"
                        >
                          <option value="on_delivery">À la livraison (Cash)</option>
                          <option value="online">Paiement en ligne (Mobile Money/Carte)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 p-6 sm:p-8 pt-4 border-t border-white/5 bg-black/20 flex flex-col-reverse sm:flex-row gap-3" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
                <button
                  type="button"
                  onClick={() => !newOrderLoading && setShowNewOrderModal(false)}
                  className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all text-center"
                  disabled={newOrderLoading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={newOrderLoading}
                  className="flex-1 py-4 px-6 rounded-2xl font-syne font-black italic bg-white text-black hover:bg-gold-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl inline-flex items-center justify-center gap-2 uppercase tracking-tight"
                >
                  {newOrderLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
                  Finaliser la commande
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      {focusStat && createPortal(
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setFocusStat(null)}
          style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
        >
          <div 
            className="relative z-10 w-full max-w-sm bg-[#0B0F1A] border border-white/10 rounded-[2.5rem] shadow-2xl p-10 animate-zoomIn text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setFocusStat(null)}
              className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl ${
              focusStat.color === 'amber' ? 'bg-amber-500/10 text-amber-500' :
              focusStat.color === 'green' ? 'bg-green-500/10 text-green-500' :
              focusStat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' :
              focusStat.color === 'red' ? 'bg-red-500/10 text-red-500' :
              focusStat.color === 'gold' ? 'bg-gold-400/10 text-gold-400' : ''
            }`}>
              {(() => {
                const Icon = focusStat.icon
                return <Icon className="w-12 h-12" />
              })()}
            </div>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mb-3">{focusStat.label}</p>
            <h3 className="text-4xl font-display font-black text-white font-mono">{focusStat.value}</h3>
            
            <button 
              onClick={() => setFocusStat(null)} 
              className="w-full mt-10 py-4 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl font-bold transition-all border border-white/5"
            >
              Fermer
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function DetailOverlay({ children, onClose }) {
  return createPortal(
    <div 
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 lg:p-4 bg-black/80 backdrop-blur-md animate-fade-in" 
      onClick={onClose}
      style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
    >
      <div 
        className="relative z-10 w-full max-w-2xl bg-[#0B0F1A] border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden animate-slideUp sm:animate-zoomIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Handle */}
        <div className="flex-shrink-0 w-full flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-white/10" />
        </div>

        <div className="flex-shrink-0 p-6 sm:p-10 flex justify-end" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/5"
          >
            <XCircle className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain px-6 sm:px-10 pb-10" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
