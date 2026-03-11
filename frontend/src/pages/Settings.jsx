import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useCurrency, CURRENCIES } from '../contexts/CurrencyContext'
import { useFont, FONT_PRESETS } from '../contexts/FontContext'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { User, Building, Save, Sparkles, Crown, Check, Coins, Loader2, Image, Mic, RefreshCw, Download, CreditCard, Lock, X, Trash2, Mail, MessageCircle, HelpCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, updateUser, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const { currency, setCurrency } = useCurrency()
  const { fontPreset, setFontPreset, titleFontPreset, setTitleFontPreset } = useFont()

  const [formData, setFormData] = useState({
    name: user?.name || '',
    company: user?.company || '',
    media_model: user?.media_model || '',
    notification_number: user?.notification_number || ''
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
        notification_number: user.notification_number ?? prev.notification_number ?? ''
      }))
    }
  }, [user?.id, user?.name, user?.company, user?.media_model, user?.notification_number])
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
  }, [user?.plan_features?.daily_briefing])

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
    <div className="max-w-6xl mx-auto w-full space-y-6 px-3 sm:px-4 min-w-0 pb-24">
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
          const used = quotas?.usage?.credits_used_this_month ?? (limit > 0 ? Math.max(0, limit - (user?.credits ?? 0)) : 0)
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
          {t('settings.creditsHint')}
        </p>
      </div>

      {/* Préférences */}
      <div className={`p-6 rounded-2xl border transition-all duration-300 mb-6 ${
        isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'
      }`}>
        <h2 className="text-lg font-display font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-gold-400" />
          {t('settings.preferencesTitle')}
        </h2>
        <div className="space-y-6">
          {/* Body Font */}
          <div className="border-b border-space-800 pb-8">
            <p className="text-sm font-semibold text-gray-200 mb-2">{t('settings.fontBody')}</p>
            <p className="text-gray-400 text-xs mb-4">
              {t('settings.fontBodyDesc')}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(FONT_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFontPreset(key)}
                  className={`p-3 rounded-xl border-2 transition-all text-left group ${
                    fontPreset === key
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-space-700 bg-space-800/50 hover:border-space-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-gray-100 truncate" style={{ fontFamily: preset.fontUi }}>
                      {preset.label.split(' ')[0]}
                    </div>
                    {fontPreset === key && (
                      <Check className="w-3.5 h-3.5 text-blue-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Title Font */}
          <div>
            <p className="text-sm font-semibold text-gray-200 mb-2">Police des grands titres</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(FONT_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTitleFontPreset(key)}
                  className={`p-3 rounded-xl border-2 transition-all text-left group ${
                    titleFontPreset === key
                      ? 'border-gold-400 bg-gold-400/10'
                      : 'border-space-700 bg-space-800/50 hover:border-space-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-black text-gray-100 uppercase truncate" style={{ fontFamily: preset.fontUi }}>
                      {preset.label.split(' ')[0]}
                    </div>
                    {titleFontPreset === key && (
                      <Check className="w-3.5 h-3.5 text-gold-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">{t('settings.currency')}</p>
            <p className="text-gray-400 text-sm mb-3">
              {t('settings.currencyDesc')}
            </p>
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

      {/* Modal config PaymeTrust / GeniusPay */}
      {!!(user?.plan_features?.payment_module || user?.payment_module_enabled) && paymentProviderModal?.provider && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !paymentProviderSaving && setPaymentProviderModal(null)} />
          <div className="relative z-10 w-full max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-space-700 bg-space-900 shadow-2xl animate-fadeIn overflow-hidden">
            <div className="flex-shrink-0 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-display font-semibold text-gray-100 min-w-0 truncate">
                Configurer GeniusPay
              </h3>
              <button type="button" onClick={() => !paymentProviderSaving && setPaymentProviderModal(null)} className="flex-shrink-0 touch-target text-gray-400 hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Saisissez les identifiants de votre compte. Ils ne sont jamais affichés en clair après enregistrement.
            </p>
            </div>
            <form onSubmit={handleSavePaymentProvider} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
                    <input
                      type="text"
                      value={paymentProviderForm.api_key || ''}
                      onChange={(e) => setPaymentProviderForm((prev) => ({ ...prev, api_key: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-space-700 bg-space-800 text-gray-100"
                      placeholder="pk_live_..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">API Secret</label>
                    <input
                      type="password"
                      value={paymentProviderForm.api_secret || ''}
                      onChange={(e) => setPaymentProviderForm((prev) => ({ ...prev, api_secret: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-space-700 bg-space-800 text-gray-100"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Webhook Secret (Optionnel)</label>
                    <input
                      type="password"
                      value={paymentProviderForm.webhook_secret || ''}
                      onChange={(e) => setPaymentProviderForm((prev) => ({ ...prev, webhook_secret: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-space-700 bg-space-800 text-gray-100"
                      placeholder="whsec_..."
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Nécessaire pour vérifier la validité des notifications de paiement.</p>
                  </div>
                </>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex-1">
            <h2 className="text-lg font-display font-semibold text-gray-100 mb-1">{t('settings.changePlan')}</h2>
            <p className="text-sm text-gray-500">
              {t('settings.changePlanDesc')}
            </p>
          </div>
          <div className={`p-1 rounded-xl border flex items-center ${isDark ? 'bg-space-800 border-space-700' : 'bg-gray-100 border-gray-200'}`}>
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                billingPeriod === 'yearly'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Annuel
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-gold-400/20 text-gold-400 border border-gold-400/20`}>
                -20%
              </span>
            </button>
          </div>
        </div>
        
        <div className="mb-6 max-w-sm">
          <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
            Code promo (optionnel)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase())
                if (validCoupon) setValidCoupon(null)
              }}
              placeholder="Ex: PROMO20"
              className="w-full px-4 py-2 rounded-lg border border-space-700 bg-space-800 text-gray-100 placeholder:text-gray-500"
            />
            <button
              onClick={validateCoupon}
              disabled={couponLoading || !couponCode.trim()}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-colors"
            >
              {couponLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Appliquer'}
            </button>
          </div>
          {validCoupon && (
            <p className="text-sm text-emerald-400 mt-2 flex items-center gap-1">
              <Check className="w-4 h-4" />
            {validCoupon.name ? `Coupon "${validCoupon.name}" (${validCoupon.code}) appliqué ! Remise appliquée au paiement.` : `Coupon ${validCoupon.code} appliqué ! Remise appliquée au paiement.`}
            </p>
          )}
        </div>

        {loadingPlans ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            <span className="ml-2 text-gray-400">{t('common.loading')}</span>
          </div>
        ) : plans.length === 0 ? (
          <p className="text-gray-500 text-center py-10">{i18n.language === 'en' ? 'No plans available' : 'Aucun plan disponible'}</p>
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
                      {t('settings.popular')}
                    </span>
                  )}
                  {isCurrentPlan && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold-400 text-space-950 text-xs px-3 py-1 rounded-full font-medium">
                      {t('settings.current')}
                    </span>
                  )}
                  <h3 className="font-display font-semibold text-lg text-gray-100">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
                  )}
                  <div className="mt-2 mb-4">
                    <span className="text-2xl font-display font-bold text-gradient">{formatPrice(plan)}</span>
                    <span className="text-gray-500 text-sm">/{billingPeriod === 'yearly' ? 'an' : 'mois'}</span>
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
                  {!isCurrentPlan && plan.id !== 'free' && plan.price !== 0 && (
                    <button
                      type="button"
                      disabled={checkoutLoadingPlanId === `${plan.id}_gp`}
                      onClick={() => handleChooseGeniusPayPlan(plan)}
                      className="w-full py-3 rounded-xl text-sm font-bold bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-600 hover:scale-[1.02] transition-all active:scale-95 inline-flex items-center justify-center gap-2"
                    >
                      {checkoutLoadingPlanId === `${plan.id}_gp` ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('settings.redirection')}
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          S'abonner maintenant
                        </>
                      )}
                    </button>
                  )}

                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
