import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import toast from 'react-hot-toast'
import {
  Plus,
  Search,
  CreditCard,
  Trash2,
  Copy,
  Check,
  X,
  Loader2,
  ExternalLink,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Share2,
  Send,
  Download
} from 'lucide-react'

const STATUS_COLORS = {
  pending: 'bg-amber-500/20 text-amber-400',
  paid: 'bg-emerald-500/20 text-emerald-400',
  cancelled: 'bg-red-500/20 text-red-400',
  expired: 'bg-gray-500/20 text-gray-400'
}

const STATUS_KEYS = {
  all: 'payments.statusAll',
  pending: 'payments.statusPending',
  paid: 'payments.statusPaid',
  cancelled: 'payments.statusCancelled',
  expired: 'payments.statusExpired'
}

const PROVIDER_LABELS = {
  manual: 'Manuel',
  paymetrust: 'PaymeTrust',
  wave: 'Wave',
  orange_money: 'Orange Money',
  mtn_momo: 'MTN MoMo',
  stripe: 'Stripe'
}

export default function Payments() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { isDark } = useTheme()
  const { showConfirm } = useConfirm()
  const paymentModuleEnabled = !!(user?.payment_module_enabled === 1 || user?.payment_module_enabled === true)
  const [links, setLinks] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymetrustConfigured, setPaymetrustConfigured] = useState(false)

  useEffect(() => {
    if (!paymentModuleEnabled) {
      setLoading(false)
      return
    }
    loadData()
  }, [paymentModuleEnabled])

  const loadData = async () => {
    try {
      const [paymentsRes, statsRes, providersRes] = await Promise.all([
        api.get('/payments'),
        api.get('/payments/stats/overview').catch(() => ({ data: { stats: null } })),
        api.get('/payments/providers').catch(() => ({ data: {} }))
      ])
      setLinks(paymentsRes.data.payments || [])
      setStats(statsRes.data.stats || { total: 0, pending: 0, paid: 0, totalAmount: 0 })
      setPaymetrustConfigured(!!(providersRes.data?.configured?.paymetrust ?? providersRes.data?.paymetrustConfigured))
    } catch (error) {
      console.error('Error loading payments:', error)
      setLinks([])
      setStats({ total: 0, pending: 0, paid: 0, totalAmount: 0 })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (id) => {
    const ok = await showConfirm({
      title: 'Confirmer le paiement',
      message: 'Confirmer ce paiement comme reçu ?',
      variant: 'info',
      confirmLabel: 'Confirmer le paiement'
    })
    if (!ok) return
    try {
      await api.post(`/payments/${id}/confirm`)
      toast.success('Paiement confirmé')
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
    }
  }

  const handleCancel = async (id) => {
    const ok = await showConfirm({
      title: 'Annuler le lien',
      message: 'Annuler ce lien de paiement ? Cette action est réversible selon la configuration.',
      variant: 'warning',
      confirmLabel: 'Annuler le lien'
    })
    if (!ok) return
    try {
      await api.post(`/payments/${id}/cancel`)
      toast.success('Lien annulé')
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
    }
  }

  const handleDelete = async (id) => {
    const ok = await showConfirm({
      title: 'Supprimer le lien',
      message: 'Supprimer définitivement ce lien de paiement ? Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/payments/${id}`)
      toast.success('Lien supprimé')
      loadData()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleShare = async (id) => {
    try {
      const res = await api.get(`/payments/${id}/message`)
      const text = [res.data.message, res.data.url].filter(Boolean).join('\n\n')
      navigator.clipboard.writeText(text)
      toast.success('Message copié dans le presse-papiers')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const filteredLinks = links.filter(link => {
    const matchesSearch = (link.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          link.amount.toString().includes(searchQuery)
    const matchesStatus = statusFilter === 'all' || link.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleExportCsv = async () => {
    try {
      const statusParam = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const res = await api.get(`/payments/export${statusParam}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.setAttribute('download', `paiements_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Export téléchargé')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur export')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    )
  }

  if (!paymentModuleEnabled) {
    return (
      <div className="space-y-6">
        <div className={`p-8 rounded-2xl border text-center ${isDark ? 'bg-space-800 border-space-700' : 'bg-white border-gray-200'}`}>
          <CreditCard className="w-16 h-16 mx-auto mb-4 text-icon" />
          <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            Module paiement désactivé
          </h2>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            L&apos;administrateur n&apos;a pas activé la fonctionnalité de paiement pour votre compte. Contactez-le pour y accéder.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6 px-3 sm:px-4 min-w-0 pb-12">
      {/* Header Hero */}
      <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border p-4 sm:p-8 mb-4 sm:mb-8 ${
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
                  <CreditCard className="w-6 h-6 text-blue-400" />
                </div>
                <h1 className={`text-2xl sm:text-3xl font-display font-bold break-words ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('payments.title')}</h1>
              </div>
              <p className={`text-base sm:text-lg break-words ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                {t('payments.subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0 relative z-20">
              <button
                type="button"
                onClick={() => handleExportCsv()}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 min-h-[44px] ${
                  isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{t('payments.exportCsv')}</span>
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary flex items-center gap-2 min-h-[44px]"
              >
                <Plus className="w-5 h-5" />
                <span>{t('payments.newLink')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-2xl border transition-all duration-300 ${isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
            <p className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{stats.total}</p>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total liens</p>
          </div>
          <div className={`p-4 rounded-2xl border transition-all duration-300 ${isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
            <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('payments.statusPending')}</p>
          </div>
          <div className={`p-4 rounded-2xl border transition-all duration-300 ${isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
            <p className="text-2xl font-bold text-emerald-500">{stats.paid}</p>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('payments.statusPaid')}</p>
          </div>
          <div className={`p-4 rounded-2xl border transition-all duration-300 ${isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
            <p className="text-2xl font-bold text-emerald-500">{(stats.totalAmount || 0).toLocaleString()} FCFA</p>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Montant reçu</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 min-w-0 mb-6">
        <div className={`flex-1 flex items-center gap-3 px-4 py-3 sm:py-3.5 rounded-2xl border transition-all duration-300 ${
          isDark ? 'bg-space-800/50 border-space-700/50 focus-within:border-space-600' : 'bg-white border-gray-200 focus-within:border-gray-300 shadow-sm'
        }`}>
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none p-0 focus:ring-0 w-full text-base sm:text-lg placeholder:text-gray-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'paid', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                statusFilter === status
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : isDark
                    ? 'bg-space-800 text-gray-400 hover:bg-space-700 hover:text-gray-200 border border-space-700'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {status === 'all' ? t(STATUS_KEYS.all) : t(STATUS_KEYS[status])}
            </button>
          ))}
        </div>
      </div>

      {/* Payments List */}
      <div className="space-y-4 overflow-x-auto min-w-0">
        {filteredLinks.length === 0 ? (
          <div className={`text-center py-12 rounded-xl border ${
            isDark ? 'bg-space-800 border-space-700' : 'bg-white border-gray-200'
          }`}>
            <CreditCard className="w-12 h-12 mx-auto mb-4 text-icon" />
            <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Aucun lien de paiement
            </h3>
            <p className={isDark ? 'text-gray-500' : 'text-gray-600'}>
              Créez votre premier lien pour recevoir des paiements
            </p>
          </div>
        ) : (
          filteredLinks.map((link, index) => (
            <div
              key={link.id}
              className={`p-6 rounded-2xl border transition-all duration-300 animate-fadeIn ${
                isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    link.status === 'paid'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : link.status === 'pending'
                      ? 'bg-amber-500/20 text-amber-400'
                      : isDark ? 'bg-space-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                        {link.amount.toLocaleString()} {link.currency}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[link.status]}`}>
                        {t(STATUS_KEYS[link.status])}
                      </span>
                    </div>
                    {link.description && (
                      <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {link.description}
                      </p>
                    )}
                    <div className={`flex items-center gap-4 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      <span>{PROVIDER_LABELS[link.provider] || link.provider}</span>
                      <span>Créé le {new Date(link.created_at).toLocaleDateString('fr-FR')}</span>
                      {link.expires_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Expire le {new Date(link.expires_at).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {link.paid_at && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle className="w-3 h-3" />
                          Payé le {new Date(link.paid_at).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {link.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleConfirm(link.id)}
                        className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                        title="Confirmer le paiement"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleShare(link.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          isDark ? 'hover:bg-space-700 text-icon' : 'hover:bg-gray-100 text-gray-600'
                        }`}
                        title="Partager"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCancel(link.id)}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        title="Annuler"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <PaymentModal
          onClose={() => setShowModal(false)}
          onSave={loadData}
          isDark={isDark}
          paymetrustConfigured={paymetrustConfigured}
        />
      )}
    </div>
  )
}

function PaymentModal({ onClose, onSave, isDark, paymetrustConfigured }) {
  useLockBodyScroll(true)
  const [form, setForm] = useState({
    amount: '',
    currency: 'XOF',
    description: '',
    provider: paymetrustConfigured ? 'paymetrust' : 'manual',
    expires_in_hours: ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/payments', {
        ...form,
        amount: parseFloat(form.amount)
      })
      toast.success('Lien de paiement créé')
      onSave()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl border shadow-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col animate-fadeIn ${
        isDark ? 'bg-space-900 border-space-700' : 'bg-white border-gray-200'
      }`}>
        <div className={`flex-shrink-0 p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'border-space-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-display font-bold min-w-0 truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            Nouveau lien de paiement
          </h2>
          <button onClick={onClose} className={`flex-shrink-0 p-2 -m-2 touch-target text-icon ${isDark ? 'hover:text-gray-200' : 'hover:text-gray-800'}`} aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Montant
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={`flex-1 px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-space-800 border-space-700 text-gray-100' : 'bg-white border-gray-200'
                }`}
                placeholder="10000"
                required
                min="1"
              />
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className={`px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-space-800 border-space-700 text-gray-100' : 'bg-white border-gray-200'
                }`}
              >
                <option value="XOF">XOF (FCFA)</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Description (optionnel)
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDark ? 'bg-space-800 border-space-700 text-gray-100' : 'bg-white border-gray-200'
              }`}
              placeholder="Achat iPhone 15"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Mode de paiement
            </label>
            <select
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDark ? 'bg-space-800 border-space-700 text-gray-100' : 'bg-white border-gray-200'
              }`}
            >
              <option value="manual">Manuel (lien interne)</option>
              {paymetrustConfigured && <option value="paymetrust">PaymeTrust (carte / paiement en ligne)</option>}
              <option value="wave">Wave</option>
              <option value="orange_money">Orange Money</option>
              <option value="mtn_momo">MTN MoMo</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Expiration (optionnel)
            </label>
            <select
              value={form.expires_in_hours}
              onChange={(e) => setForm({ ...form, expires_in_hours: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDark ? 'bg-space-800 border-space-700 text-gray-100' : 'bg-white border-gray-200'
              }`}
            >
              <option value="">Pas d'expiration</option>
              <option value="1">1 heure</option>
              <option value="24">24 heures</option>
              <option value="72">3 jours</option>
              <option value="168">7 jours</option>
            </select>
          </div>

          </div>
          <div className="flex-shrink-0 p-4 border-t flex flex-col-reverse sm:flex-row gap-3 sm:justify-end bg-inherit">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 sm:flex-none min-h-[44px] touch-target">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 sm:flex-none min-h-[44px] touch-target flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
