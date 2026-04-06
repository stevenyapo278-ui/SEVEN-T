import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CheckCircle, Zap, Star, Building2, ArrowRight, Tag, Loader2, AlertTriangle, Crown } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const PLAN_ICONS = { free: Zap, starter: Star, pro: Crown, business: Building2 }
const PLAN_GRADIENTS = {
  free: 'from-gray-500/20 to-gray-600/10',
  starter: 'from-blue-500/20 to-blue-600/10',
  pro: 'from-amber-500/20 to-amber-600/10',
  business: 'from-purple-500/20 to-purple-600/10',
  enterprise: 'from-rose-500/20 to-rose-600/10',
}
const PLAN_ACCENT = {
  free: 'border-gray-500',
  starter: 'border-blue-500',
  pro: 'border-amber-400',
  business: 'border-purple-500',
  enterprise: 'border-rose-500',
}
const PLAN_BTN = {
  free: 'bg-gray-700 hover:bg-gray-600 text-white',
  starter: 'bg-blue-600 hover:bg-blue-500 text-white',
  pro: 'bg-amber-500 hover:bg-amber-400 text-black',
  business: 'bg-purple-600 hover:bg-purple-500 text-white',
  enterprise: 'bg-rose-600 hover:bg-rose-500 text-white',
}

function formatPrice(amount, currency = 'XOF') {
  if (!amount || amount <= 0) return 'Gratuit'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

function PlanFeatureList({ features }) {
  if (!features) return null
  let parsed = features
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) } catch { return null }
  }
  const items = []
  if (parsed.models?.length) items.push(`${parsed.models.length} modèle(s) IA`)
  if (parsed.analytics) items.push('Statistiques avancées')
  if (parsed.payment_module) items.push('Module paiement')
  if (parsed.voice_responses) items.push('Réponses vocales (TTS)')
  if (parsed.flows) items.push('Flows & automatisations')
  if (parsed.next_best_action) items.push('Next Best Action')
  if (parsed.catalog_import) items.push('Import catalogue')
  if (parsed.human_handoff_alerts) items.push('Alertes intervention humaine')
  if (parsed.whatsapp_status) items.push('WhatsApp Status')
  if (parsed.daily_briefing) items.push('Briefing quotidien')
  if (parsed.leads_management) items.push('Gestion leads')
  return (
    <ul className="space-y-2 mt-4">
      {items.map(item => (
        <li key={item} className="flex items-center gap-2 text-sm text-gray-300">
          <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  )
}

export default function Pricing() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [billing, setBilling] = useState('monthly')
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load plans
  useEffect(() => {
    fetch(`${API_BASE}/api/plans`)
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : []
        // Exclude free/free_expired for the pricing page
        setPlans(arr.filter(p => p.name !== 'free_expired'))
        setLoading(false)
      })
      .catch(() => { setError('Impossible de charger les plans.'); setLoading(false) })
  }, [])

  const validateCoupon = useCallback(async () => {
    setCouponResult(null)
    if (!couponCode.trim()) return
    setCouponLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/subscription/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId: 'starter', billingPeriod: billing, couponCode })
      })
      const data = await res.json()
      if (!res.ok) setCouponResult({ error: data.error || 'Coupon invalide' })
      else setCouponResult({ valid: true, ...data })
    } catch {
      setCouponResult({ error: 'Erreur réseau' })
    } finally {
      setCouponLoading(false)
    }
  }, [couponCode, billing, token])

  const startCheckout = useCallback(async (planName) => {
    if (planName === 'free') return
    if (planName === 'enterprise') {
      window.location.href = 'mailto:contact@seven-t.ci?subject=Demande Enterprise'
      return
    }
    setCheckoutLoading(planName)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/subscription/create-geniuspay-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId: planName, billingPeriod: billing, couponCode: couponResult?.valid ? couponCode : undefined })
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Erreur lors de la création du paiement')
      window.location.href = data.url
    } catch (err) {
      setError(err.message)
    } finally {
      setCheckoutLoading(null)
    }
  }, [billing, couponCode, couponResult, token])

  const currentPlan = user?.plan

  return (
    <div className="min-h-screen bg-space-950 text-gray-100 px-4 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Choisissez votre plan
        </h1>
        <p className="text-gray-400 mt-2 text-sm max-w-xl mx-auto">
          Tous les plans incluent l'assistant IA WhatsApp. Choisissez selon votre volume et vos besoins.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-3 mt-6 bg-space-900 border border-space-700 rounded-2xl p-1">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${billing === 'monthly' ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white'}`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${billing === 'yearly' ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white'}`}
          >
            Annuel <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold">-20%</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-5xl mx-auto mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-3 flex items-center gap-3 text-red-400 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Plans grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold-400" size={32} /></div>
      ) : (
        <div className={`max-w-6xl mx-auto grid gap-6 ${plans.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'} grid-cols-1`}>
          {plans.map(plan => {
            const isCurrent = plan.name === currentPlan
            const price = billing === 'yearly' && plan.price_yearly ? plan.price_yearly : plan.price
            const Icon = PLAN_ICONS[plan.name] || Star
            const gradient = PLAN_GRADIENTS[plan.name] || PLAN_GRADIENTS.starter
            const accent = PLAN_ACCENT[plan.name] || 'border-space-600'
            const btnStyle = PLAN_BTN[plan.name] || PLAN_BTN.starter
            const isPro = plan.name === 'pro'

            return (
              <div
                key={plan.name}
                className={`relative rounded-3xl border-2 bg-gradient-to-b ${gradient} p-6 flex flex-col transition-all duration-300 ${isCurrent ? 'border-gold-400 ring-2 ring-gold-400/30 scale-[1.02]' : accent} ${isPro ? 'shadow-xl shadow-amber-500/10' : ''}`}
              >
                {isPro && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-black px-4 py-1 rounded-full uppercase tracking-widest">
                    Populaire
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold-500 text-black text-xs font-black px-4 py-1 rounded-full uppercase tracking-widest">
                    Plan actuel
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient} border ${accent}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-base">{plan.display_name}</h2>
                    <p className="text-xs text-gray-500">{plan.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-2">
                  {price <= 0 ? (
                    <span className="text-2xl font-black text-white">Gratuit</span>
                  ) : plan.name === 'enterprise' ? (
                    <span className="text-xl font-black text-white">Sur devis</span>
                  ) : (
                    <>
                      <span className="text-3xl font-black text-white">{formatPrice(price, plan.price_currency)}</span>
                      <span className="text-gray-500 text-sm ml-1">/ {billing === 'yearly' ? 'an' : 'mois'}</span>
                    </>
                  )}
                </div>

                {/* Limits */}
                {plan.limits && (() => {
                  let limits = plan.limits
                  if (typeof limits === 'string') { try { limits = JSON.parse(limits) } catch { return null } }
                  return (
                    <div className="text-xs text-gray-500 space-y-1 mb-2 border-t border-space-700/50 pt-3">
                      {limits.agents > 0 && <div>{limits.agents === -1 ? 'Agents illimités' : `${limits.agents} agent(s)`}</div>}
                      {limits.messages_per_month && <div>{limits.messages_per_month === -1 ? 'Messages illimités' : `${limits.messages_per_month.toLocaleString('fr-FR')} messages/mois`}</div>}
                    </div>
                  )
                })()}

                <PlanFeatureList features={plan.features} />

                <div className="mt-auto pt-5">
                  {isCurrent ? (
                    <button disabled className="w-full py-3 rounded-2xl text-sm font-semibold bg-gold-500/20 text-gold-400 border border-gold-500/30 cursor-default">
                      ✓ Plan actuel
                    </button>
                  ) : plan.name === 'free' ? (
                    <button disabled className="w-full py-3 rounded-2xl text-sm font-semibold bg-space-700 text-gray-500 cursor-default">
                      Plan d'essai
                    </button>
                  ) : (
                    <button
                      onClick={() => startCheckout(plan.name)}
                      disabled={!!checkoutLoading}
                      className={`w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${btnStyle} disabled:opacity-50`}
                    >
                      {checkoutLoading === plan.name ? (
                        <><Loader2 size={16} className="animate-spin" /> Redirection...</>
                      ) : plan.name === 'enterprise' ? (
                        <>Nous contacter <ArrowRight size={14} /></>
                      ) : (
                        <>Choisir {plan.display_name} <ArrowRight size={14} /></>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Coupon */}
      {!loading && plans.length > 0 && (
        <div className="max-w-md mx-auto mt-10">
          <div className="bg-space-900 border border-space-700 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3">
              <Tag size={14} /> Code promo
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Entrez votre code..."
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null) }}
                className="flex-1 bg-space-800 border border-space-600 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold-400"
              />
              <button
                onClick={validateCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-black rounded-xl text-sm font-bold disabled:opacity-50 transition-all flex items-center gap-1"
              >
                {couponLoading ? <Loader2 size={14} className="animate-spin" /> : 'Valider'}
              </button>
            </div>
            {couponResult && (
              <div className={`mt-3 text-sm px-3 py-2 rounded-xl ${couponResult.valid ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {couponResult.valid
                  ? `✓ ${couponResult.name} — Réduction de ${couponResult.discountAmount?.toLocaleString('fr-FR')} XOF`
                  : `✗ ${couponResult.error}`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="max-w-2xl mx-auto mt-14 text-center">
        <p className="text-gray-600 text-xs">
          Paiement sécurisé par GeniusPay · Annulable à tout moment · Support 7j/7
        </p>
        <button onClick={() => navigate('/dashboard/settings')} className="mt-4 text-xs text-gray-500 hover:text-gray-300 underline">
          Retour aux paramètres
        </button>
      </div>
    </div>
  )
}
