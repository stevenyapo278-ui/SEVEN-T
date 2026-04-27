import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useCurrency, CURRENCIES } from '../contexts/CurrencyContext'
import { useFont } from '../contexts/FontContext'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { User, Building, Save, Sparkles, Crown, Check, Coins, Loader2, Image, Mic, RefreshCw, Download, CreditCard, Lock, X, Trash2, Mail, MessageCircle, HelpCircle, GitBranch, Users, Database, BellRing } from 'lucide-react'
import toast from 'react-hot-toast'
import { useModuleAvailability } from '../hooks/useModuleAvailability'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, updateUser, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const { currency, setCurrency } = useCurrency()
  const { fontSize, setFontSize } = useFont()

  const [uiSidebarCollapsed, setUiSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('seven-t-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })

  const [uiReduceMotion, setUiReduceMotion] = useState(() => {
    try {
      const v = localStorage.getItem('seven-t-reduce-motion')
      if (v === null) return false
      return v === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try { localStorage.setItem('seven-t-sidebar-collapsed', String(uiSidebarCollapsed)) } catch {}
    window.dispatchEvent(new CustomEvent('seven-t:sidebar-collapsed', { detail: { collapsed: uiSidebarCollapsed } }))
  }, [uiSidebarCollapsed])

  useEffect(() => {
    try { localStorage.setItem('seven-t-reduce-motion', String(uiReduceMotion)) } catch {}
    window.dispatchEvent(new CustomEvent('seven-t:reduce-motion', { detail: { value: uiReduceMotion } }))
  }, [uiReduceMotion])

  const [formData, setFormData] = useState({
    name: user?.name || '',
    company: user?.company || '',
    media_model: user?.media_model || '',
    notification_number: user?.notification_number || '',
    analytics_module_enabled: user?.analytics_module_enabled === 0 ? false : (user?.analytics_module_enabled === 1 || !!user?.plan_features?.analytics),
    flows_module_enabled: user?.flows_module_enabled === 0 ? false : (user?.flows_module_enabled === 1 || !!user?.plan_features?.flows),
    next_best_action_enabled: user?.next_best_action_enabled === 0 ? false : (user?.next_best_action_enabled === 1 || !!user?.plan_features?.next_best_action),
    proactive_advisor_enabled: user?.proactive_advisor_enabled === 0 ? false : (user?.proactive_advisor_enabled === 1 || !!user?.plan_features?.proactive_advisor),
    proactive_requires_validation: user?.proactive_requires_validation === null || user?.proactive_requires_validation === undefined ? true : Boolean(user?.proactive_requires_validation)
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
        media_model: user.media_model ?? prev.media_model ?? '',
        notification_number: user.notification_number ?? prev.notification_number ?? '',
        analytics_module_enabled: user.analytics_module_enabled === 0 ? false : (user.analytics_module_enabled === 1 || !!user.plan_features?.analytics),
        flows_module_enabled: user.flows_module_enabled === 0 ? false : (user.flows_module_enabled === 1 || !!user.plan_features?.flows),
        next_best_action_enabled: user.next_best_action_enabled === 0 ? false : (user.next_best_action_enabled === 1 || !!user.plan_features?.next_best_action),
        proactive_advisor_enabled: user.proactive_advisor_enabled === 0 ? false : (user.proactive_advisor_enabled === 1 || !!user.plan_features?.proactive_advisor),
        proactive_requires_validation: user.proactive_requires_validation === null || user.proactive_requires_validation === undefined ? true : Boolean(user.proactive_requires_validation)
      }))
    }
  }, [user?.id, user?.name, user?.company, user?.media_model, user?.notification_number, user?.analytics_module_enabled, user?.flows_module_enabled, user?.plan_features])


  const [plans, setPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [validCoupon, setValidCoupon] = useState(null)
  const [couponLoading, setCouponLoading] = useState(false)

  const [paymentProvidersData, setPaymentProvidersData] = useState({ providers: {}, configured: {} })
  const [paymentProvidersLoading, setPaymentProvidersLoading] = useState(true)
  const [paymentProviderModal, setPaymentProviderModal] = useState(null)
  const [paymentProviderForm, setPaymentProviderForm] = useState({ account_id: '', api_key: '' })
  const [paymentProviderSaving, setPaymentProviderSaving] = useState(false)
  useLockBodyScroll(showDeleteAccountModal || !!paymentProviderModal?.provider)

  const [quotas, setQuotas] = useState(null)
  const [usageStats, setUsageStats] = useState(null)
  const [usageLoading, setUsageLoading] = useState(false)
  const [dailyBriefing, setDailyBriefing] = useState(null)
  const [dailyBriefingLoading, setDailyBriefingLoading] = useState(false)
  const [dailyBriefingSaving, setDailyBriefingSaving] = useState(false)
  const [dailyBriefingForm, setDailyBriefingForm] = useState({ enabled: false, preferred_hour: 8, channel: 'email', email: '', whatsapp_contact_jid: '' })

  // Handle redirect after GeniusPay Checkout
  useEffect(() => {
    const sub = searchParams.get('subscription')
    if (sub === 'success') {
      toast.success('Abonnement activé')
      refreshUser()
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

  const loadUsageStats = async () => {
    setUsageLoading(true)
    try {
      const res = await api.get('/users/usage')
      setUsageStats(res.data)
    } catch (err) {
      console.error("Error loading usage stats:", err)
    } finally {
      setUsageLoading(false)
    }
  }

  useEffect(() => {
    loadUsageStats()
  }, [])

  const loadDailyBriefing = async () => {
    if (!user?.plan_features?.daily_briefing) return
    setDailyBriefingLoading(true)
    try {
      const { data } = await api.get('/settings/daily-briefing')
      setDailyBriefing(data)
      setDailyBriefingForm({
        enabled: data.enabled === true,
        preferred_hour: data.preferred_hour ?? 8,
        channel: data.channel || 'email',
        email: data.email || '',
        whatsapp_contact_jid: data.whatsapp_contact_jid || ''
      })
    } catch {
      setDailyBriefing(null)
    } finally {
      setDailyBriefingLoading(false)
    }
  }
  useEffect(() => {
    loadDailyBriefing()
  }, [user?.plan_features?.daily_briefing, user?.id])

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
  useEffect(() => { 
    if (user?.id && (user?.plan_features?.payment_module || user?.payment_module_enabled)) loadPaymentProviders() 
    else if (user?.id) setPaymentProvidersLoading(false)
  }, [user?.id, user?.plan_features?.payment_module, user?.payment_module_enabled])

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

  const handleSaveAll = async (e) => {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      // Save Profile
      const profileResponse = await api.put('/auth/me', formData)
      updateUser(profileResponse.data.user)

      // Save Daily Briefing if enabled and data exists
      if (user?.plan_features?.daily_briefing && dailyBriefingForm) {
        setDailyBriefingSaving(true)
        const briefingResponse = await api.get('/settings/daily-briefing').catch(() => null)
        // Only update if requested
        await api.put('/settings/daily-briefing', dailyBriefingForm)
        if (briefingResponse) setDailyBriefing(briefingResponse.data)
      }

      toast.success('Tous les paramètres ont été mis à jour')
      refreshUser()
    } catch (error) {
      console.error('Save all settings error:', error)
      toast.error(error.response?.data?.error || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
      setDailyBriefingSaving(false)
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
    const price = billingPeriod === 'yearly' ? plan.priceYearly : plan.price
    return `${(price || 0).toLocaleString()} ${plan.priceCurrency || 'FCFA'}`
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

  const [checkoutLoadingPlanId, setCheckoutLoadingPlanId] = useState(null)
  const [billingPeriod, setBillingPeriod] = useState('monthly')
  const [couponCode, setCouponCode] = useState('')

  const handleChooseGeniusPayPlan = async (plan) => {
    if (plan.id === 'free' || plan.price === 0) return
    setCheckoutLoadingPlanId(`${plan.id}_gp`)
    try {
      const { data } = await api.post('/subscription/create-geniuspay-checkout', { 
        planId: plan.id,
        billingPeriod,
        couponCode: couponCode.trim() || undefined
      })
      if (data?.url) window.location.href = data.url
      else toast.error('Lien de paiement indisponible')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du paiement')
    } finally {
      setCheckoutLoadingPlanId(null)
    }
  }

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setValidCoupon(null)
      return
    }
    
    // Check against the first paid plan just to validate the code exists
    const testPlan = plans.find(p => p.id !== 'free' && p.price > 0)
    if (!testPlan) return toast.error('Aucun plan payant disponible pour tester le coupon')
    
    setCouponLoading(true)
    try {
      const { data } = await api.post('/subscription/validate-coupon', {
        planId: testPlan.id,
        billingPeriod,
        couponCode: couponCode.trim()
      })
      if (data.valid) {
        setValidCoupon(data)
        toast.success(`Coupon ${data.code} appliqué !`)
      }
    } catch (err) {
      setValidCoupon(null)
      toast.error(err.response?.data?.error || 'Coupon invalide')
    } finally {
      setCouponLoading(false)
    }
  }

  // Effect to re-validate when billing period changes if there's a valid coupon
  useEffect(() => {
    if (validCoupon) {
      validateCoupon()
    }
  }, [billingPeriod])

  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0 pb-24">
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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2 min-w-0">
                <div className="p-2 bg-blue-500/10 rounded-xl flex-shrink-0">
                  <User className="w-6 h-6 text-blue-400" />
                </div>
                <h1 className={`text-2xl sm:text-3xl font-display font-bold break-words ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('settings.title')}</h1>
              </div>
              <p className={`text-base sm:text-lg break-words ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                {t('settings.subtitle')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-8 right-8 z-[60] animate-fadeIn">
        <button
          onClick={handleSaveAll}
          disabled={saving || dailyBriefingSaving}
          className="group relative flex items-center justify-center gap-2 p-4 rounded-full bg-blue-500 text-white shadow-2xl shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
        >
          {saving || dailyBriefingSaving ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Save className="w-6 h-6" />
          )}
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 font-medium">
            {t('common.save')}
          </span>
        </button>
      </div>

      {/* ===== Subscription Status Card ===== */}
      {(() => {
        const isExpired = user?.plan === 'free_expired' || (user?.subscription_end_date && new Date(user.subscription_end_date) < new Date())
        const isFree = !user?.plan || user?.plan === 'free' || user?.plan === 'free_expired'
        const endDate = user?.subscription_end_date ? new Date(user.subscription_end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : null
        const statusLabel = user?.subscription_status === 'active' && !isExpired ? 'Actif' : isExpired ? 'Expiré' : 'Inactif'
        const statusColor = user?.subscription_status === 'active' && !isExpired ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'

        return (
          <div className={`rounded-2xl border mb-6 overflow-hidden ${
            isDark ? 'bg-space-800/20 border-space-700/50' : 'bg-white border-gray-200 shadow-sm'
          } ${isExpired ? 'border-red-500/50' : ''}`}>
            {isExpired && (
              <div className="bg-red-500/10 border-b border-red-500/30 px-5 py-3 flex items-center gap-3">
                <span className="text-red-400 text-sm font-semibold">⚠️ Votre abonnement est expiré — les fonctionnalités IA sont désactivées.</span>
                <button onClick={() => navigate('/dashboard/pricing')} className="ml-auto text-xs bg-red-500 hover:bg-red-400 text-white px-3 py-1 rounded-lg font-bold transition-all">
                  Renouveler
                </button>
              </div>
            )}
            <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-5 h-5 text-gold-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Plan {user?.plan_display_name || user?.plan || 'Gratuit'}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap mt-0.5">
                    {endDate && (
                      <span className="text-xs text-gray-500">
                        {isExpired ? `Expiré le ${endDate}` : `Valide jusqu'au ${endDate}`}
                      </span>
                    )}
                    {user?.credits !== undefined && (
                      <span className="text-xs text-gray-500">· {(user.credits || 0).toLocaleString('fr-FR')} crédits restants</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Profile */}
      <form onSubmit={handleSaveAll} className={`p-6 rounded-2xl border transition-all duration-300 mb-6 ${
        isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'
      }`}>
        <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">{t('settings.profileTitle')}</h2>
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
                {t('settings.fullName')}
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
                {t('settings.company')}
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

          {currentPlan?.features?.human_handoff_alerts && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-blue-400" />
                {t('settings.whatsappNotification')}
              </label>
              <input
                type="text"
                value={formData.notification_number}
                onChange={(e) => setFormData({ ...formData, notification_number: e.target.value })}
                className="input-dark w-full max-w-md"
                placeholder="ex: 2250102030405"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('settings.whatsappNotificationDesc')}
              </p>
            </div>
          )}
        </div>
      </form>

      {/* Abonnement et usage */}
      <div className={`p-6 rounded-2xl border transition-all duration-300 mb-6 ${
        isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-display font-semibold text-gray-100 flex items-center gap-2 min-w-0 truncate">
            <Crown className="w-5 h-5 text-gold-400 flex-shrink-0" />
            {t('settings.subscriptionTitle')}
          </h2>
          <button
            type="button"
            onClick={() => { refreshUser(); loadQuotas(); loadUsageStats(); }}
            className="text-sm text-gray-400 hover:text-gray-200 inline-flex items-center justify-center gap-1.5 transition-colors touch-target flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${usageLoading ? 'animate-spin text-blue-400' : ''}`} />
            Actualiser
          </button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Plan actuel</p>
            <p className="text-xl font-display font-semibold text-gray-100">{currentPlan.name}</p>
          </div>
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
        {(() => {
          const limit = quotas?.limits?.credits_per_month ?? currentPlan.limits?.credits_per_month ?? 0
          const used = usageStats?.messages_this_month ?? (limit > 0 ? Math.max(0, limit - (user?.credits ?? 0)) : 0)
          
          if (limit === -1) {
            return (
              <div className="mb-3">
                <p className="text-sm text-gray-400">{t('settings.usageThisMonth')}: {t('common.none')}</p>
              </div>
            )
          }
          if (limit > 0) {
            const percentUsed = Math.min(100, (used / limit) * 100)
            return (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-blue-400" /> Messages IA</span>
                  <span className="text-gray-300 tabular-nums">
                    {used} / {limit}
                  </span>
                </div>
                <div className="w-full bg-space-700/50 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${percentUsed > 90 ? 'bg-red-500' : percentUsed > 70 ? 'bg-orange-500' : 'bg-blue-500'}`}
                    style={{ width: `${percentUsed}%` }}
                  />
                </div>
              </div>
            )
          }
          return null
        })()}

        {/* Autres quotas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {/* Agents */}
            <div>
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 flex items-center gap-1.5"><Users className="w-3 h-3" /> Agents</span>
                    <span className="text-gray-400 font-medium">
                        {usageStats?.agents ?? 0} / {quotas?.limits?.agents ?? currentPlan.limits?.agents ?? 0}
                    </span>
                </div>
                <div className="w-full bg-space-700/30 rounded-full h-1">
                    <div 
                        className="bg-purple-500 h-full rounded-full" 
                        style={{ width: `${Math.min(100, ((usageStats?.agents ?? 0) / (quotas?.limits?.agents ?? currentPlan.limits?.agents ?? 1)) * 100)}%` }} 
                    />
                </div>
            </div>

            {/* Knowledge */}
            <div>
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 flex items-center gap-1.5"><Database className="w-3 h-3" /> Base de connaissance</span>
                    <span className="text-gray-400 font-medium">
                        {usageStats?.knowledge_items ?? 0} / {quotas?.limits?.knowledge_items ?? currentPlan.limits?.knowledge_items ?? 10}
                    </span>
                </div>
                <div className="w-full bg-space-700/30 rounded-full h-1">
                    <div 
                        className="bg-emerald-500 h-full rounded-full" 
                        style={{ width: `${Math.min(100, ((usageStats?.knowledge_items ?? 0) / (quotas?.limits?.knowledge_items ?? currentPlan.limits?.knowledge_items ?? 10)) * 100)}%` }} 
                    />
                </div>
            </div>
        </div>
        <p className="text-xs text-gray-500">
          {t('settings.creditsHint')}
        </p>
      </div>

      {/* Automatisation & Relances */}
      <div className={`p-6 rounded-2xl border transition-all duration-300 mb-6 ${
        isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'
      }`}>
        <h2 className="text-lg font-display font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <BellRing className="w-5 h-5 text-blue-400" />
          Automatisation & Relances
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Configurez comment l'IA relance vos prospects et clients inactifs.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Module 3: Assistant Proactif */}
          <div className={`md:col-span-2 relative p-4 rounded-2xl border transition-all ${
            isDark ? 'bg-space-900/40 border-space-700/50' : 'bg-gray-50 border-gray-200'
          } ${!user?.plan_features?.next_best_action && user?.is_admin !== 1 ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Assistant Proactif (Relances IA)</span>
              </div>
              <input
                type="checkbox"
                checked={formData.next_best_action_enabled}
                disabled={!user?.plan_features?.next_best_action && user?.is_admin !== 1}
                onChange={(e) => setFormData({ ...formData, next_best_action_enabled: e.target.checked, proactive_advisor_enabled: e.target.checked })}
                className="accent-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500">
              Relances automatiques pour les paniers abandonnés, les clients inactifs et les commandes reportées.
            </p>
            {!user?.plan_features?.next_best_action && user?.is_admin !== 1 && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-gold-500/80 uppercase">
                <Lock className="w-3 h-3" /> Module non inclus dans votre plan
              </div>
            )}
          </div>

          {/* Validation toggle */}
          <div className={`md:col-span-2 p-4 rounded-2xl border transition-all ${
            isDark ? 'bg-space-900/40 border-space-700/50' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Validation manuelle requise</span>
              </div>
              <input
                type="checkbox"
                checked={formData.proactive_requires_validation}
                onChange={(e) => setFormData({ ...formData, proactive_requires_validation: e.target.checked })}
                className="accent-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500">
              Si activé, l'IA génère les relances mais attend votre validation dans l'onglet "Relances" avant de les envoyer.
            </p>
          </div>
        </div>
      </div>
      <div className={`p-6 rounded-2xl border transition-all duration-300 mb-6 ${
        isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'
      }`}>
        <h2 className="text-lg font-display font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-gold-400" />
          {t('settings.preferencesTitle')}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Affichage */}
          <div className={`rounded-2xl border p-4 ${isDark ? 'border-space-700/60 bg-space-950/20' : 'border-gray-200 bg-gray-50'}`}>
            <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Affichage</p>
            <p className="text-xs text-gray-500 mb-4">Confort visuel, animations, sidebar.</p>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-200 mb-2">Taille de police</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'sm', label: 'Petite' },
                    { id: 'md', label: 'Normale' },
                    { id: 'lg', label: 'Grande' },
                    { id: 'xl', label: 'Très grande' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFontSize(opt.id)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                        fontSize === opt.id
                          ? 'border-blue-500 bg-blue-500/10 text-gray-100'
                          : 'border-space-700 bg-space-800/50 hover:border-space-600 text-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 cursor-pointer ${isDark ? 'border-space-700/60 bg-space-900/20' : 'border-gray-200 bg-white'}`}>
                <div className="min-w-0">
                  <div className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Réduire les animations</div>
                  <div className="text-xs text-gray-500 truncate">Transitions plus sobres (si tu trouves ça “trop animé”).</div>
                </div>
                <input
                  type="checkbox"
                  checked={uiReduceMotion}
                  onChange={(e) => setUiReduceMotion(e.target.checked)}
                  className="accent-blue-500"
                />
              </label>

              <label className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 cursor-pointer ${isDark ? 'border-space-700/60 bg-space-900/20' : 'border-gray-200 bg-white'}`}>
                <div className="min-w-0">
                  <div className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Sidebar compacte</div>
                  <div className="text-xs text-gray-500 truncate">Réduit la sidebar sur desktop (icônes).</div>
                </div>
                <input
                  type="checkbox"
                  checked={uiSidebarCollapsed}
                  onChange={(e) => setUiSidebarCollapsed(e.target.checked)}
                  className="accent-blue-500"
                />
              </label>

              <label className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 cursor-pointer ${isDark ? 'border-space-700/60 bg-space-900/20' : 'border-gray-200 bg-white'}`}>
                <div className="min-w-0">
                  <div className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Relances: Validation manuelle</div>
                  <div className="text-xs text-gray-500 truncate">Vérifier et confirmer les relances (panier, etc.) avant envoi.</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.proactive_requires_validation}
                  onChange={(e) => setFormData({ ...formData, proactive_requires_validation: e.target.checked })}
                  className="accent-blue-500"
                />
              </label>

              <div className={`rounded-2xl border p-4 ${isDark ? 'border-space-700/60 bg-space-950/30' : 'border-gray-200 bg-white'}`}>
                <p className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('settings.currency')}</p>
                <p className="text-xs text-gray-500 mt-1 mb-3">{t('settings.currencyDesc')}</p>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.values(CURRENCIES)
                    .filter(curr => ['EUR', 'USD', 'XOF'].includes(curr.code))
                    .map((curr) => (
                    <button
                      key={curr.code}
                      type="button"
                      onClick={() => setCurrency(curr.code)}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        currency === curr.code
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-space-700 bg-space-800/50 hover:border-space-600'
                      }`}
                    >
                      <div className="text-base font-bold text-gold-400 mb-0.5">{curr.symbol}</div>
                      <div className="text-xs font-medium text-gray-100">{curr.code}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Typographie a été désactivée par demande */}
        </div>
      </div>

      {/* Moyens de paiement */}
      {!!(user?.plan_features?.payment_module || user?.payment_module_enabled) && (
      <div className={`p-6 rounded-2xl border transition-all duration-300 mb-6 ${
        isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'
      }`}>
        <h2 className="text-lg font-display font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-gold-400" />
          {t('settings.paymentMethods')}
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          {t('settings.paymentMethodsDesc')}
        </p>
        {paymentProvidersLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('common.loading')}
          </div>
        ) : (
          <div className="space-y-3">
            {Object.keys(paymentProvidersData.providers)
              .filter((k) => k !== 'manual')
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
                      {providerId === 'geniuspay' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentProviderModal({ provider: 'geniuspay' })
                              setPaymentProviderForm({ api_key: '', api_secret: '' })
                            }}
                            className="text-sm px-3 py-1.5 rounded-lg bg-blue-400/20 text-blue-400 hover:bg-blue-400/30"
                          >
                            {configured ? 'Modifier' : 'Configurer'}
                          </button>
                          {configured && (
                            <button
                              type="button"
                              onClick={() => handleDeletePaymentProvider('geniuspay')}
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

      {!!(user?.plan_features?.payment_module || user?.payment_module_enabled) && paymentProviderModal?.provider && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !paymentProviderSaving && setPaymentProviderModal(null)} />
          <div className="relative z-10 w-full max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-space-700 bg-space-900 shadow-2xl animate-fadeIn overflow-hidden">
            <div className="flex-shrink-0 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-display font-semibold text-gray-100 min-w-0 truncate">
                Configurer GeniusPay
              </h3>
              <button type="button" onClick={() => !paymentProviderSaving && setPaymentProviderModal(null)} className="flex-shrink-0 touch-target text-gray-400 hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            </div>
            <form onSubmit={handleSavePaymentProvider} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-0 space-y-4 custom-scrollbar">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">API Key (pk_...)</label>
                  <input
                    type="text"
                    required
                    value={paymentProviderForm.api_key || ''}
                    onChange={(e) => setPaymentProviderForm((prev) => ({ ...prev, api_key: e.target.value }))}
                    className="input-dark w-full"
                    placeholder="pk_live_..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">API Secret</label>
                  <input
                    type="password"
                    required
                    value={paymentProviderForm.api_secret || ''}
                    onChange={(e) => setPaymentProviderForm((prev) => ({ ...prev, api_secret: e.target.value }))}
                    className="input-dark w-full"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Webhook Secret (Optionnel)</label>
                  <input
                    type="text"
                    value={paymentProviderForm.webhook_secret || ''}
                    onChange={(e) => setPaymentProviderForm((prev) => ({ ...prev, webhook_secret: e.target.value }))}
                    className="input-dark w-full"
                    placeholder="whsec_..."
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Nécessaire pour vérifier la validité des notifications de paiement.</p>
                </div>
              </div>
              <div className="flex-shrink-0 p-4 sm:p-6 border-t border-space-700 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end bg-inherit">
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
        </div>,
        document.body
      )}

      {/* Résumé quotidien */}
      {user?.plan_features?.daily_briefing && (
        <div className={`p-6 rounded-2xl border transition-all duration-300 mb-6 ${
          isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'
        }`}>
          <h2 className="text-lg font-display font-semibold text-gray-100 mb-2 flex items-center gap-2">
            <Mail className="w-5 h-5 text-gold-400" />
            {t('settings.dailyBriefing')}
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            {t('settings.dailyBriefingDesc')}
          </p>
          <div className="mb-4 p-3 rounded-lg bg-space-800/80 border border-space-600">
            <p className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-gold-400 shrink-0" />
              {i18n.language === 'en' ? 'How to use' : 'Comment utiliser'}
            </p>
            <ol className="text-sm text-gray-400 list-decimal list-inside space-y-1">
              <li>{i18n.language === 'en' ? 'Enable the "Daily briefing" option.' : 'Activez l\'option « Résumé quotidien ».'}</li>
              <li>{i18n.language === 'en' ? 'Choose the send time (0-23) and channel: Email or WhatsApp.' : 'Choisissez l\'heure d\'envoi (0–23) et le canal : Email ou WhatsApp.'}</li>
              <li>{i18n.language === 'en' ? 'Enter the receiving email or WhatsApp number.' : 'Renseignez l\'email ou le numéro WhatsApp qui recevra le résumé.'}</li>
              <li>{i18n.language === 'en' ? 'Click Save. A daily job will send the summary at the chosen hour.' : 'Cliquez sur Enregistrer. Un job quotidien enverra le résumé à l\'heure choisie.'}</li>
            </ol>
          </div>
          {dailyBriefingLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="daily-briefing-enabled"
                  checked={dailyBriefingForm.enabled}
                  onChange={(e) => setDailyBriefingForm((f) => ({ ...f, enabled: e.target.checked }))}
                  className="rounded border-space-600 bg-space-800 text-gold-400 focus:ring-gold-400/50"
                />
                <label htmlFor="daily-briefing-enabled" className="text-gray-300">Activer le résumé quotidien</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Heure d&apos;envoi (0-23)</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={dailyBriefingForm.preferred_hour}
                  onChange={(e) => setDailyBriefingForm((f) => ({ ...f, preferred_hour: parseInt(e.target.value, 10) || 8 }))}
                  className="w-24 px-3 py-2 rounded-lg border border-space-700 bg-space-800 text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Canal</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="briefing-channel"
                      checked={dailyBriefingForm.channel === 'email'}
                      onChange={() => setDailyBriefingForm((f) => ({ ...f, channel: 'email' }))}
                      className="text-gold-400 focus:ring-gold-400/50"
                    />
                    <Mail className="w-4 h-4 text-gray-400" />
                    Email
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="briefing-channel"
                      checked={dailyBriefingForm.channel === 'whatsapp'}
                      onChange={() => setDailyBriefingForm((f) => ({ ...f, channel: 'whatsapp' }))}
                      className="text-gold-400 focus:ring-gold-400/50"
                    />
                    <MessageCircle className="w-4 h-4 text-gray-400" />
                    WhatsApp
                  </label>
                </div>
              </div>
              {dailyBriefingForm.channel === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email de réception</label>
                  <input
                    type="email"
                    value={dailyBriefingForm.email}
                    onChange={(e) => setDailyBriefingForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder={user?.email || 'votre@email.com'}
                    className="w-full max-w-md px-3 py-2 rounded-lg border border-space-700 bg-space-800 text-gray-100"
                  />
                </div>
              )}
              {dailyBriefingForm.channel === 'whatsapp' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Numéro WhatsApp (ex: 2250712345678)</label>
                  <input
                    type="text"
                    value={dailyBriefingForm.whatsapp_contact_jid}
                    onChange={(e) => setDailyBriefingForm((f) => ({ ...f, whatsapp_contact_jid: e.target.value }))}
                    placeholder="2250712345678"
                    className="w-full max-w-md px-3 py-2 rounded-lg border border-space-700 bg-space-800 text-gray-100"
                  />
                </div>
              )}
              {dailyBriefing?.last_sent_at && (
                <p className="text-xs text-gray-500">{t('settings.lastSent')} : {new Date(dailyBriefing.last_sent_at).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Données et confidentialité */}
      <div className={`p-6 rounded-2xl border transition-all duration-300 mb-6 ${
        isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'
      }`}>
        <h2 className="text-lg font-display font-semibold text-gray-100 mb-2 flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-400" />
          {t('settings.dataPrivacy')}
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          {t('settings.dataPrivacyDesc')}
        </p>
        <button
          type="button"
          onClick={handleExportData}
          disabled={exportingData}
          className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {exportingData ? t('settings.exporting') : t('settings.exportData')}
        </button>
      </div>

      {/* Supprimer mon compte (droit à l'effacement RGPD) */}
      <div className="card p-6 mb-6 border-red-500/30">
        <h2 className="text-lg font-display font-semibold text-gray-100 mb-2 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-400" />
          {t('settings.deleteAccount')}
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          {t('settings.deleteAccountDesc')}
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteAccountModal(true)}
          disabled={deletingAccount}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 disabled:opacity-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          {t('settings.deleteAccountBtn')}
        </button>
      </div>

      {/* Modal confirmation suppression compte */}
      {showDeleteAccountModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-4 bg-black/60 backdrop-blur-sm">
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
        </div>,
        document.body
      )}

    </div>
  )
}
