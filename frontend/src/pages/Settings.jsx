import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency, CURRENCIES } from '../contexts/CurrencyContext'
import { useFont, FONT_PRESETS } from '../contexts/FontContext'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import api from '../services/api'
import { User, Building, Save, Sparkles, Crown, Check, Coins, Loader2, Image, Mic, RefreshCw, Download, CreditCard, Lock, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, updateUser, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const { currency, setCurrency } = useCurrency()
  const { fontPreset, setFontPreset } = useFont()
  const [formData, setFormData] = useState({
    name: user?.name || '',
    company: user?.company || '',
    media_model: user?.media_model || ''
  })
  const [saving, setSaving] = useState(false)
  const [exportingData, setExportingData] = useState(false)
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  // Sync form when user is loaded/updated
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name ?? prev.name,
        company: user.company ?? prev.company,
        media_model: user.media_model ?? prev.media_model ?? ''
      }))
    }
  }, [user?.id, user?.name, user?.company, user?.media_model])
  const [plans, setPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [checkoutLoadingPlanId, setCheckoutLoadingPlanId] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const [paymentProvidersData, setPaymentProvidersData] = useState({ providers: {}, configured: {} })
  const [paymentProvidersLoading, setPaymentProvidersLoading] = useState(true)
  const [paymentProviderModal, setPaymentProviderModal] = useState(null)
  const [paymentProviderForm, setPaymentProviderForm] = useState({ account_id: '', api_key: '' })
  const [paymentProviderSaving, setPaymentProviderSaving] = useState(false)
  useLockBodyScroll(showDeleteAccountModal || !!paymentProviderModal?.provider)

  const [quotas, setQuotas] = useState(null)

  // Handle redirect after Stripe Checkout (success or cancel)
  useEffect(() => {
    const sub = searchParams.get('subscription')
    if (sub === 'success') {
      toast.success('Abonnement activé')
      refreshUser()
      setSearchParams({}, { replace: true })
    } else if (sub === 'cancelled') {
      toast('Paiement annulé', { icon: 'ℹ️' })
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, refreshUser])

  // Refresh user (plan, credits) when entering Settings and when tab gets focus
  useEffect(() => {
    refreshUser()
    const handleFocus = () => refreshUser()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refreshUser])

  const loadQuotas = async () => {
    try {
      const res = await api.get('/agents/quotas').catch(() => ({ data: null }))
      setQuotas(res.data || null)
    } catch {
      setQuotas(null)
    }
  }

  useEffect(() => {
    if (!user?.id) return
    loadQuotas()
  }, [user?.id])

  // Load plans from API
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await api.get('/plans')
        setPlans(response.data.plans || [])
      } catch (error) {
        console.error('Error loading plans:', error)
        setPlans([])
      } finally {
        setLoadingPlans(false)
      }
    }
    loadPlans()
  }, [])

  const loadPaymentProviders = async () => {
    setPaymentProvidersLoading(true)
    try {
      const res = await api.get('/payments/providers').catch(() => ({ data: { providers: {}, configured: {} } }))
      setPaymentProvidersData({ providers: res.data?.providers || {}, configured: res.data?.configured || {} })
    } catch (e) {
      setPaymentProvidersData({ providers: {}, configured: {} })
    } finally {
      setPaymentProvidersLoading(false)
    }
  }
  useEffect(() => { loadPaymentProviders() }, [])

  const handleSavePaymentProvider = async (e) => {
    e.preventDefault()
    if (!paymentProviderModal?.provider) return
    setPaymentProviderSaving(true)
    try {
      await api.put(`/payments/providers/${paymentProviderModal.provider}`, paymentProviderForm)
      toast.success('Configuration enregistrée')
      setPaymentProviderModal(null)
      setPaymentProviderForm({ account_id: '', api_key: '' })
      loadPaymentProviders()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur')
    } finally {
      setPaymentProviderSaving(false)
    }
  }
  const handleDeletePaymentProvider = async (provider) => {
    try {
      await api.delete(`/payments/providers/${provider}`)
      toast.success('Configuration supprimée')
      loadPaymentProviders()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const response = await api.put('/auth/me', formData)
      updateUser(response.data.user)
      toast.success('Profil mis à jour')
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
    if (exportingData) return
    setExportingData(true)
    try {
      const response = await api.get('/users/me/export', { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const date = new Date().toISOString().slice(0, 10)
      const link = document.createElement('a')
      link.href = url
      link.download = `seven-t-data-export-${date}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Export des données prêt')
    } catch (error) {
      toast.error('Erreur lors de l’export des données')
    } finally {
      setExportingData(false)
    }
  }

  // Helper functions to format plan data
  const formatPrice = (plan) => {
    if (plan.price === -1) return 'Sur devis'
    if (plan.price === 0) return 'Gratuit'
    return `${plan.price.toLocaleString()} ${plan.priceCurrency || 'FCFA'}`
  }

  const formatLimit = (value) => {
    if (value === -1) return 'Illimité'
    return value.toLocaleString()
  }

  const getPlanFeatures = (plan) => {
    const features = []
    if (plan.limits) {
      features.push(`${formatLimit(plan.limits.agents)} agent(s) IA`)
      features.push(`${formatLimit(plan.limits.whatsapp_accounts)} compte(s) WhatsApp`)
      features.push(`${formatLimit(plan.limits.credits_per_month)} messages IA / mois`)
    }
    if (plan.features) {
      if (plan.features.availability_hours) features.push('Heures de disponibilité')
      if (plan.features.voice_responses) features.push('Réponses vocales')
      if (plan.features.payment_module) features.push('Module paiement')
    }
    return features
  }

  const currentPlan = plans.find(p => p.id === user?.plan) || plans[0] || {
    name: 'Gratuit',
    limits: { credits_per_month: 100 }
  }

  const handleChoosePlan = async (plan) => {
    if (plan.id === 'free' || plan.price === 0) return
    if (!plan.stripePriceId) {
      toast('Contactez-nous pour ce plan', { icon: '📧' })
      return
    }
    setCheckoutLoadingPlanId(plan.id)
    try {
      const { data } = await api.post('/subscription/create-checkout-session', { planId: plan.id })
      if (data?.url) window.location.href = data.url
      else toast.error('Lien de paiement indisponible')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du paiement')
    } finally {
      setCheckoutLoadingPlanId(null)
    }
  }

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const { data } = await api.post('/subscription/create-portal-session')
      if (data?.url) window.location.href = data.url
      else toast.error('Portail indisponible')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur')
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-gray-100">Paramètres</h1>
        <p className="text-gray-400">Gérez votre compte et votre abonnement</p>
      </div>

      {/* Profile */}
      <form onSubmit={handleSubmit} className="card p-6 mb-6">
        <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">Profil</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <div className="px-3 py-2 bg-space-800 border border-space-700 rounded-xl text-gray-500">
              {user?.email}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nom complet
              </label>
              <div className="input-with-icon">
                <div className="pl-3 flex items-center justify-center flex-shrink-0 text-gray-500">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Entreprise
              </label>
              <div className="input-with-icon">
                <div className="pl-3 flex items-center justify-center flex-shrink-0 text-gray-500">
                  <Building className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Modèle IA pour images et notes vocales
            </label>
            <select
              value={['models/gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'].includes(formData.media_model) ? formData.media_model : 'gemini-1.5-flash'}
              onChange={(e) => setFormData({ ...formData, media_model: e.target.value })}
              className="input-dark w-full max-w-md"
            >
              <option value="models/gemini-2.5-flash">Gemini 2.5 Flash - Dernier modèle ⭐</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash - Très rapide</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro - Plus précis</option>
            </select>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Image className="w-3.5 h-3.5" /><Mic className="w-3.5 h-3.5" />
              Valeur par défaut pour l&apos;analyse des photos et des notes vocales. Chaque agent peut avoir le sien.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </form>

      {/* Abonnement et usage */}
      <div className="card p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-display font-semibold text-gray-100 flex items-center gap-2 min-w-0 truncate">
            <Crown className="w-5 h-5 text-gold-400 flex-shrink-0" />
            Abonnement et usage
          </h2>
          <button
            type="button"
            onClick={() => { refreshUser(); loadQuotas() }}
            className="text-sm text-gray-400 hover:text-gray-200 inline-flex items-center justify-center gap-1.5 transition-colors touch-target flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Plan actuel</p>
            <p className="text-xl font-display font-semibold text-gray-100">{currentPlan.name}</p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            {!!user?.stripe_customer_id && (
              <button
                type="button"
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                {portalLoading ? 'Chargement...' : 'Gérer mon abonnement'}
              </button>
            )}
            <div className="text-left sm:text-right">
              <p className="text-sm text-gray-500">Messages IA restants</p>
              <p className="text-2xl font-display font-bold text-blue-400 flex items-center gap-2">
                <Sparkles className="w-5 h-5 flex-shrink-0" />
                <span className="tabular-nums">
                  {quotas?.limits?.credits_per_month === -1 ? 'Illimité' : String(user?.credits ?? 0)}
                </span>
              </p>
            </div>
          </div>
        </div>
        {(() => {
          const limit = quotas?.limits?.credits_per_month ?? currentPlan.limits?.credits_per_month ?? 0
          const used = quotas?.usage?.credits_used_this_month ?? (limit > 0 ? Math.max(0, limit - (user?.credits ?? 0)) : 0)
          if (limit === -1) {
            return (
              <div className="mb-3">
                <p className="text-sm text-gray-400">Utilisation ce mois : illimitée</p>
              </div>
            )
          }
          if (limit > 0) {
            const percentUsed = Math.min(100, (used / limit) * 100)
            return (
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Utilisation ce mois</span>
                  <span className="text-gray-300 tabular-nums">
                    {used === 0 ? 'Aucun utilisé' : `${used} utilisés`} / {limit} inclus
                  </span>
                </div>
                <div className="w-full bg-space-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${percentUsed}%` }}
                  />
                </div>
              </div>
            )
          }
          return null
        })()}
        <p className="text-xs text-gray-500">
          1 crédit = 1 réponse IA. Les limites de votre plan peuvent être mises à jour par l&apos;administrateur.
        </p>
      </div>

      {/* Préférences */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-display font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-gold-400" />
          Préférences
        </h2>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Police de l&apos;interface</p>
            <p className="text-gray-400 text-sm mb-3">
              Choisissez la police utilisée pour les textes et titres de l&apos;application
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(FONT_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFontPreset(key)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    fontPreset === key
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-space-700 bg-space-800/50 hover:border-space-600'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-100 mb-0.5" style={{ fontFamily: preset.fontUi }}>{preset.label}</div>
                  <div className="text-xs text-gray-500">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Devise</p>
            <p className="text-gray-400 text-sm mb-3">
              Choisissez la devise pour l&apos;affichage des prix de vos produits
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.values(CURRENCIES).map((curr) => (
                <button
                  key={curr.code}
                  type="button"
                  onClick={() => setCurrency(curr.code)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    currency === curr.code
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-space-700 bg-space-800/50 hover:border-space-600'
                  }`}
                >
                  <div className="text-2xl font-bold text-gold-400 mb-1">{curr.symbol}</div>
                  <div className="text-sm font-medium text-gray-100">{curr.code}</div>
                  <div className="text-xs text-gray-500 truncate">{curr.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Moyens de paiement — affiché uniquement si l'admin a activé le module pour cet utilisateur */}
      {!!user?.payment_module_enabled && (
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-display font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-gold-400" />
          Moyens de paiement
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Configurez les moyens de paiement avec lesquels vous recevez l&apos;argent de vos clients (liens de paiement, commandes).
        </p>
        {paymentProvidersLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement...
          </div>
        ) : (
          <div className="space-y-3">
            {Object.keys(paymentProvidersData.providers)
              .filter((k) => k !== 'manual' && Object.prototype.hasOwnProperty.call(paymentProvidersData.configured, k))
              .map((providerId) => {
                const p = paymentProvidersData.providers[providerId]
                const configured = !!paymentProvidersData.configured[providerId]
                return (
                  <div
                    key={providerId}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-space-700 bg-space-800/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl flex-shrink-0">{p?.icon || '💳'}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-100 truncate">{p?.name || providerId}</p>
                        <p className="text-xs text-gray-500">
                          {configured ? 'Configuré' : 'Non configuré'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {providerId === 'paymetrust' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentProviderModal({ provider: 'paymetrust' })
                              setPaymentProviderForm({ account_id: '', api_key: '' })
                            }}
                            className="text-sm px-3 py-1.5 rounded-lg bg-gold-400/20 text-gold-400 hover:bg-gold-400/30"
                          >
                            {configured ? 'Modifier' : 'Configurer'}
                          </button>
                          {configured && (
                            <button
                              type="button"
                              onClick={() => handleDeletePaymentProvider('paymetrust')}
                              className="text-sm px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>
      )}

      {/* Modal config PaymeTrust */}
      {!!user?.payment_module_enabled && paymentProviderModal?.provider === 'paymetrust' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !paymentProviderSaving && setPaymentProviderModal(null)} />
          <div className="relative z-10 w-full max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-space-700 bg-space-900 shadow-2xl animate-fadeIn overflow-hidden">
            <div className="flex-shrink-0 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-display font-semibold text-gray-100 min-w-0 truncate">Configurer PaymeTrust</h3>
              <button type="button" onClick={() => !paymentProviderSaving && setPaymentProviderModal(null)} className="flex-shrink-0 touch-target text-gray-400 hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Saisissez les identifiants de votre compte PaymeTrust. Ils ne sont jamais affichés en clair après enregistrement.
            </p>
            </div>
            <form onSubmit={handleSavePaymentProvider} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Account ID</label>
                <input
                  type="text"
                  value={paymentProviderForm.account_id}
                  onChange={(e) => setPaymentProviderForm((prev) => ({ ...prev, account_id: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-space-700 bg-space-800 text-gray-100"
                  placeholder="Votre Account ID"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
                <input
                  type="password"
                  value={paymentProviderForm.api_key}
                  onChange={(e) => setPaymentProviderForm((prev) => ({ ...prev, api_key: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-space-700 bg-space-800 text-gray-100"
                  placeholder="••••••••"
                  required
                />
              </div>
              </div>
              <div className="flex-shrink-0 p-4 sm:p-6 border-t border-space-700 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                <button type="button" onClick={() => setPaymentProviderModal(null)} className="min-h-[44px] touch-target px-4 py-2 rounded-lg text-gray-400 hover:bg-space-800 flex-1 sm:flex-none">
                  Annuler
                </button>
                <button type="submit" disabled={paymentProviderSaving} className="btn-primary inline-flex items-center justify-center gap-2 min-h-[44px] touch-target flex-1 sm:flex-none disabled:opacity-50">
                  {paymentProviderSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Données et confidentialité */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-display font-semibold text-gray-100 mb-2 flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-400" />
          Données et confidentialité
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Téléchargez une copie complète de vos données (agents, conversations, messages, produits, commandes, etc.).
        </p>
        <button
          type="button"
          onClick={handleExportData}
          disabled={exportingData}
          className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {exportingData ? 'Export en cours...' : 'Exporter mes données'}
        </button>
      </div>

      {/* Supprimer mon compte (droit à l'effacement RGPD) */}
      <div className="card p-6 mb-6 border-red-500/30">
        <h2 className="text-lg font-display font-semibold text-gray-100 mb-2 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-400" />
          Supprimer mon compte
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Cette action est irréversible. Toutes vos données (compte, agents, conversations, messages, produits, commandes) seront définitivement supprimées. Vous pouvez d&apos;abord exporter vos données ci-dessus.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteAccountModal(true)}
          disabled={deletingAccount}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 disabled:opacity-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Supprimer définitivement mon compte
        </button>
      </div>

      {/* Modal confirmation suppression compte */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => !deletingAccount && setShowDeleteAccountModal(false)}>
          <div className="relative z-10 bg-space-900 border border-space-600 rounded-t-2xl sm:rounded-2xl shadow-xl max-w-md w-full p-6 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-display font-semibold text-gray-100 mb-2">Supprimer définitivement mon compte ?</h3>
            <p className="text-sm text-gray-400 mb-6">
              Toutes vos données seront effacées. Cette action est irréversible.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(false)}
                disabled={deletingAccount}
                className="min-h-[44px] touch-target flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium bg-space-700 text-gray-300 hover:bg-space-600 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={async () => {
                  setDeletingAccount(true)
                  try {
                    await api.delete('/auth/me')
                    toast.success('Compte supprimé')
                    logout()
                    navigate('/login')
                  } catch (e) {
                    toast.error(e.response?.data?.error || 'Erreur lors de la suppression')
                    setDeletingAccount(false)
                  }
                }}
                disabled={deletingAccount}
                className="min-h-[44px] touch-target flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Changer de plan */}
      <div className="mb-6">
        <h2 className="text-lg font-display font-semibold text-gray-100 mb-2">Changer de plan</h2>
        <p className="text-sm text-gray-500 mb-4">
          Choisissez un plan payant pour débloquer plus d&apos;agents, de crédits et de fonctionnalités. Paiement sécurisé par Stripe.
        </p>
        {loadingPlans ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            <span className="ml-2 text-gray-400">Chargement des plans...</span>
          </div>
        ) : plans.length === 0 ? (
          <p className="text-gray-500 text-center py-10">Aucun plan disponible</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan, index) => {
              const isCurrentPlan = plan.id === user?.plan || (plan.id === 'free' && !user?.plan)
              const isPopular = index === 1 // Second plan is usually popular
              const planFeatures = getPlanFeatures(plan)
              
              return (
                <div 
                  key={plan.id}
                  className={`card p-5 relative animate-fadeIn ${
                    isCurrentPlan
                      ? 'border-gold-400' 
                      : isPopular 
                        ? 'border-blue-500' 
                        : ''
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {isPopular && !isCurrentPlan && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-3 py-1 rounded-full">
                      Populaire
                    </span>
                  )}
                  {isCurrentPlan && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold-400 text-space-950 text-xs px-3 py-1 rounded-full font-medium">
                      Actuel
                    </span>
                  )}
                  <h3 className="font-display font-semibold text-lg text-gray-100">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
                  )}
                  <div className="mt-2 mb-4">
                    <span className="text-2xl font-display font-bold text-gradient">{formatPrice(plan)}</span>
                    <span className="text-gray-500 text-sm">/mois</span>
                  </div>
                  <ul className="space-y-2 mb-4">
                    {planFeatures.slice(0, 6).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-4 h-4 rounded-full bg-gold-400/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-2.5 h-2.5 text-gold-400" />
                        </div>
                        <span className="text-gray-400">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={isCurrentPlan || (plan.id === 'free' || plan.price === 0)}
                    onClick={() => handleChoosePlan(plan)}
                    className={`w-full py-2 rounded-xl text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 ${
                      isCurrentPlan
                        ? 'bg-space-800 text-gray-500 cursor-not-allowed'
                        : plan.id === 'free' || plan.price === 0
                          ? 'bg-space-800 text-gray-500 cursor-not-allowed'
                          : checkoutLoadingPlanId === plan.id
                            ? 'bg-space-700 text-gray-400'
                            : isPopular
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-space-800 text-gray-300 hover:bg-space-700'
                    }`}
                  >
                    {checkoutLoadingPlanId === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Redirection...
                      </>
                    ) : isCurrentPlan ? (
                      'Plan actuel'
                    ) : plan.id === 'free' || plan.price === 0 ? (
                      'Gratuit'
                    ) : (
                      'Choisir'
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
