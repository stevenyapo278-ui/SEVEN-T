import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  MessageSquare,
  Clock,
  Users,
  ArrowRight,
  Check,
  Zap,
  TrendingUp,
  Globe,
  Star,
  Loader2,
  ShoppingCart,
  Sun,
  Moon,
  Play,
  Shield,
  BarChart3,
  Bot,
  Sparkles,
  ChevronDown,
  Menu,
  X,
  Phone,
  User,
  Megaphone,
  Crown,
  Building2,
  CheckCircle,
} from 'lucide-react'
import api from '../services/api'
import PricingDetailsModal from '../components/PricingDetailsModal'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import LandingChatbot from '../components/LandingChatbot'
import HeroScene3D from '../components/HeroScene3D'
import toast from 'react-hot-toast'
import AnimatedBackground from '../components/AnimatedBackground'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectCoverflow, Pagination, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-coverflow'
import 'swiper/css/pagination'

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

/* ─── Data ────────────────────────────────────────────────── */

const defaultPlans = [
  {
    id: 'free', name: 'free', display_name: 'Gratuit', description: 'Pour découvrir',
    price: 0, price_currency: 'FCFA',
    limits: { agents: 1, whatsappAccounts: 1, monthlyCredits: 100 },
    features: { knowledgeBase: true }
  },
  {
    id: 'pro', name: 'pro', display_name: 'Pro', description: 'Pour scaler',
    price: 29000, price_currency: 'FCFA',
    limits: { agents: 5, whatsappAccounts: 3, monthlyCredits: 5000 },
    features: { knowledgeBase: true, analytics: true, prioritySupport: true }
  }
]

const features = [
  {
    icon: Bot,
    darkBg: 'bg-blue-500/10 border-blue-500/15',
    lightBg: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-500',
    title: 'Agents IA Autonomes',
    description: 'Vos assistantes IA ne se contentent pas de répondre, elles agissent : qualification, rendez-vous et vente directe.',
  },
  {
    icon: TrendingUp,
    darkBg: 'bg-amber-500/10 border-amber-500/15',
    lightBg: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-500',
    title: 'Intelligence Commerciale',
    description: 'Détection automatique des intentions d\'achat et segmentation intelligente de vos prospects WhatsApp.',
  },
  {
    icon: ShoppingCart,
    darkBg: 'bg-emerald-500/10 border-emerald-500/15',
    lightBg: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-500',
    title: 'Vente & Stock Temps Réel',
    description: 'Vendez directement dans le chat. L\'IA gère les stocks, les paniers et génère les bons de commande.',
  },
  {
    icon: Sparkles,
    darkBg: 'bg-purple-500/10 border-purple-500/15',
    lightBg: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-500',
    title: 'Assistance 360°',
    description: 'Un assistant global qui vous aide à piloter toute votre activité d\'une simple phrase naturelle.',
  },
  {
    icon: Globe,
    darkBg: 'bg-cyan-500/10 border-cyan-500/15',
    lightBg: 'bg-cyan-50 border-cyan-200',
    iconColor: 'text-cyan-500',
    title: 'Local & WhatsApp First',
    description: 'Optimisé pour le marché africain : faible consommation de données et intégration WhatsApp transparente.',
  },
  {
    icon: Shield,
    darkBg: 'bg-rose-500/10 border-rose-500/15',
    lightBg: 'bg-rose-50 border-rose-200',
    iconColor: 'text-rose-500',
    title: 'Multi-numéros Sécurisé',
    description: 'Gérez plusieurs lignes WhatsApp pour vos équipes avec une isolation totale des données clients.',
  },
  {
    icon: Megaphone,
    darkBg: 'bg-indigo-500/10 border-indigo-500/15',
    lightBg: 'bg-indigo-50 border-indigo-200',
    iconColor: 'text-indigo-500',
    title: 'Statuts WhatsApp ROI',
    description: 'Automatisez votre visibilité. Programmez et répétez vos offres en Story WhatsApp pour toucher vos clients là où ils regardent.',
  },
]

const testimonials = [
  {
    quote: 'Depuis qu\'on utilise SEVEN T, nos clients reçoivent une réponse en moins de 10 secondes, même à 2h du matin. Notre taux de conversion a augmenté de 40%.',
    name: 'Amadou K.',
    role: 'Entrepreneur, Dakar',
    initials: 'AK',
    gradient: 'from-blue-500 to-blue-700',
  },
  {
    quote: 'J\'ai configuré mon agent en 20 minutes. Il qualifie mes leads WhatsApp et remplit mon CRM automatiquement. Je ne peux plus m\'en passer.',
    name: 'Fatou D.',
    role: 'Responsable Marketing, Abidjan',
    initials: 'FD',
    gradient: 'from-amber-500 to-amber-700',
  },
  {
    quote: 'L\'intégration de la boutique WhatsApp avec le suivi de stock est parfaite. Mes clients commandent directement dans le chat et je reçois les alertes en temps réel.',
    name: 'Ibrahim S.',
    role: 'E-commerce, Lagos',
    initials: 'IS',
    gradient: 'from-emerald-500 to-emerald-700',
  },
]

/* ─── Sub-components ──────────────────────────────────────── */

const Logo = ({ className = '' }) => (
  <img src="/logo.svg" alt="SEVEN T" className={`h-8 sm:h-9 w-auto object-contain ${className}`} />
)

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      onClick={toggleTheme}
      className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
        isDark
          ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-400'
          : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-600'
      }`}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
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
  
  if (items.length === 0) {
    if (parsed.knowledgeBase) items.push('Base de connaissances IA')
    if (parsed.prioritySupport) items.push('Support prioritaire')
  }

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

function PlanCard({ plan, isPopular, delayIndex, onShowDetails }) {
  const price = plan.price
  const billing = plan.billing_period || 'monthly'
  const Icon = PLAN_ICONS[plan.id] || Star
  const gradient = PLAN_GRADIENTS[plan.id] || PLAN_GRADIENTS.starter
  const accent = PLAN_ACCENT[plan.id] || 'border-space-600'
  const btnStyle = PLAN_BTN[plan.id] || PLAN_BTN.starter

  const isPro = isPopular
  const isCurrent = false

  return (
    <div 
      className={`animate-slide-up relative rounded-3xl border-2 bg-gradient-to-b ${gradient} p-6 flex flex-col transition-all duration-300 bg-space-950 ${accent} ${isPro ? 'shadow-xl shadow-amber-500/10 scale-[1.02]' : ''}`}
      style={{ animationDelay: delayIndex !== undefined ? `${delayIndex * 0.08}s` : undefined }}
    >
      {isPro && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-black px-4 py-1 rounded-full uppercase tracking-widest">
          Populaire
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient} border ${accent}`}>
          <Icon size={18} className="text-white" />
        </div>
        <div>
          <h2 className="font-bold text-white text-base">{plan.display_name || plan.name}</h2>
          {plan.description && <p className="text-xs text-gray-500">{plan.description}</p>}
        </div>
      </div>

      {/* Price */}
      <div className="mb-2">
        {price <= 0 ? (
          <span className="text-2xl font-black text-white">Gratuit</span>
        ) : plan.id === 'enterprise' ? (
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
        const messages = limits.messages_per_month !== undefined ? limits.messages_per_month : limits.monthlyCredits
        return (
          <div className="text-xs text-gray-500 space-y-1 mb-2 border-t border-space-700/50 pt-3">
            {limits.agents > 0 && <div>{limits.agents === -1 ? 'Agents illimités' : `${limits.agents} agent(s)`}</div>}
            {messages !== undefined && <div>{messages === -1 ? 'Messages illimités' : `${messages.toLocaleString('fr-FR')} messages/mois`}</div>}
          </div>
        )
      })()}

      <PlanFeatureList features={plan.features} />

      <button 
        onClick={() => onShowDetails(plan)}
        className="w-full mt-2 mb-2 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white border border-transparent hover:border-white/10 hover:bg-white/5 rounded-xl transition-all"
      >
        Voir les détails
      </button>

      <div className="mt-auto pt-5 border-t border-space-700/50">
        <Link
          to={`/register?plan=${plan.id}`}
          className={`w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${btnStyle}`}
        >
          {plan.price === 0 ? 'Commencer gratuitement' : plan.id === 'enterprise' ? 'Nous contacter' : `Choisir ${plan.display_name || plan.name}`} <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}

function ContactModal({ isOpen, onClose, isDark }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: 'Demande de démo',
    message: ''
  })
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Simulation of sending
      await new Promise(resolve => setTimeout(resolve, 1500))
      toast.success('Votre demande de démo a été envoyée !')
      onClose()
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        subject: 'Demande de démo',
        message: ''
      })
    } catch (err) {
      toast.error("Erreur lors de l'envoi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-2xl rounded-[2rem] border p-6 sm:p-10 shadow-2xl animate-fadeIn my-auto ${isDark ? 'bg-[#0D1120] border-white/10' : 'bg-white border-gray-200'}`}>
        <button onClick={onClose} className={`absolute top-6 right-6 p-2 rounded-xl transition ${isDark ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}>
          <X className="w-5 h-5" />
        </button>
        
        <div className="mb-8">
          <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Demander une démo</h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Parlez-nous de votre projet et nous vous contacterons rapidement.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={`text-xs font-semibold uppercase tracking-wider opacity-70 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Prénom(s)</label>
              <input 
                type="text" 
                required
                className={`w-full px-4 py-3.5 rounded-2xl border transition-all outline-none ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-amber-400/50' : 'bg-blue-50/30 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                placeholder="Ex: Jean Paul"
                value={formData.firstName}
                onChange={e => setFormData({...formData, firstName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className={`text-xs font-semibold uppercase tracking-wider opacity-70 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Nom</label>
              <input 
                type="text" 
                required
                className={`w-full px-4 py-3.5 rounded-2xl border transition-all outline-none ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-amber-400/50' : 'bg-blue-50/30 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                placeholder="Ex: Kouassi"
                value={formData.lastName}
                onChange={e => setFormData({...formData, lastName: e.target.value})}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={`text-xs font-semibold uppercase tracking-wider opacity-70 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Email</label>
              <input 
                type="email" 
                required
                className={`w-full px-4 py-3.5 rounded-2xl border transition-all outline-none ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-amber-400/50' : 'bg-gray-50/30 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                placeholder="Ex: jean.paul@entreprise.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2 relative">
              <label className={`text-xs font-semibold uppercase tracking-wider opacity-70 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sujet</label>
              <div className="relative">
                <select 
                  className={`w-full px-4 py-3.5 rounded-2xl border transition-all outline-none appearance-none ${isDark ? 'bg-[#1a1f35] border-white/10 text-white focus:border-amber-400/50' : 'bg-gray-50/30 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                >
                  <option value="Demande de démo" className={isDark ? 'bg-[#1a1f35] text-white' : 'bg-white text-gray-900'}>Demande de démo</option>
                  <option value="Support technique" className={isDark ? 'bg-[#1a1f35] text-white' : 'bg-white text-gray-900'}>Support technique</option>
                  <option value="Partenariat" className={isDark ? 'bg-[#1a1f35] text-white' : 'bg-white text-gray-900'}>Partenariat</option>
                  <option value="Autre" className={isDark ? 'bg-[#1a1f35] text-white' : 'bg-white text-gray-900'}>Autre</option>
                </select>
                <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-50 ${isDark ? 'text-white' : 'text-gray-900'}`} />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className={`text-xs font-semibold uppercase tracking-wider opacity-70 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Votre message</label>
            <textarea 
              required
              rows={4}
              className={`w-full px-4 py-3.5 rounded-2xl border transition-all resize-none outline-none ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-amber-400/50' : 'bg-gray-50/30 border-gray-200 text-gray-900 focus:border-blue-500'}`}
              placeholder="Bonjour, j'aimerais..."
              value={formData.message}
              onChange={e => setFormData({...formData, message: e.target.value})}
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-4.5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${loading ? 'opacity-70 cursor-not-allowed' : 'bg-[#007AFF] text-white hover:bg-[#0066CC] shadow-xl shadow-blue-500/20 active:scale-[0.98]'}`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Envoyer message'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── Landing ─────────────────────────────────────────────── */

export default function Landing() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [plans, setPlans] = useState(defaultPlans)
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setActiveTestimonial(p => (p + 1) % testimonials.length), 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/plans')
        const raw = data?.plans || []
        const sorted = [...raw]
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .slice(0, 4)
          .map(p => ({ ...p, display_name: p.display_name ?? p.name, price_currency: p.price_currency ?? p.priceCurrency ?? 'FCFA' }))
        setPlans(sorted.length > 0 ? sorted : defaultPlans)
      } catch {
        setPlans(defaultPlans)
      } finally {
        setLoadingPlans(false)
      }
    }
    load()
  }, [])

  const getPopularPlanId = () => {
    const def = plans.find(p => p.is_default)
    if (def) return def.id
    return plans.length >= 2 ? plans[1].id : plans[0]?.id
  }

  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const openDemo = () => setIsContactModalOpen(true)

  // Bloquer le scroll quand le modal est ouvert
  useEffect(() => {
    if (isContactModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isContactModalOpen])

  /* ── Palette shortcuts ── */
  const bg = isDark ? 'bg-[#080B14]' : 'bg-gray-50'
  const bgAlt = isDark ? 'bg-[#0D1120]' : 'bg-white'
  const bgCard = isDark ? 'bg-white/3 border-white/8 hover:border-white/15 hover:bg-white/5' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
  const text = isDark ? 'text-white' : 'text-gray-900'
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600'
  const textFaint = isDark ? 'text-gray-600' : 'text-gray-400'
  const borderFaint = isDark ? 'border-white/6' : 'border-gray-200'
  const navBg = isDark ? 'bg-[#080B14]/90 border-white/6' : 'bg-white/90 border-gray-200'

  return (
    <div className={`min-h-screen ${bg} antialiased overflow-x-hidden transition-colors duration-300 font-body relative`}>
      <Helmet>
        <title>SEVEN T - Automatisation WhatsApp Intelligente</title>
        <meta name="description" content="Automatisez vos conversations WhatsApp avec l'intelligence artificielle. Assistante IA pour booster vos ventes et gérer vos clients 24/7." />
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "SEVEN T",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "AggregateOffer",
                "priceCurrency": "XOF",
                "lowPrice": "0",
                "highPrice": "99000",
                "offerCount": "4"
              },
              "description": "Automatisez vos conversations WhatsApp avec l'intelligence artificielle.",
              "url": "https://sevente.com/"
            }
          `}
        </script>
      </Helmet>
      {/* Texture Overlay */}
      <div className="noise-overlay" />

      {/* ── NAV ───────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? `${navBg} backdrop-blur-xl border-b shadow-lg ${isDark ? 'shadow-black/20' : 'shadow-gray-200/60'}` : ''}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between h-16 md:h-18">
            <Link to="/" className="flex items-center gap-3">
              <Logo />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { label: 'Fonctionnalités', href: '#features' },
                { label: 'Démo', href: '#demo' },
                { label: 'Tarifs', href: '#pricing' },
                { label: 'Témoignages', href: '#testimonials' },
              ].map(n => (
                <a key={n.href} href={n.href}
                  className={`px-4 py-2 text-sm rounded-lg transition-all font-medium ${textMuted} hover:${text} ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
                  {n.label}
                </a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-2">
              <ThemeToggle />
              {user ? (
                <Link to="/dashboard" className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-black rounded-xl font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-amber-400/20">
                  Mon espace →
                </Link>
              ) : (
                <>
                  <button onClick={openDemo} className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all text-amber-500 border-amber-400/30 ${isDark ? 'hover:bg-amber-400/10' : 'hover:bg-amber-50'}`}>
                    {t('landing.demo')}
                  </button>
                  <Link to="/login" className={`px-4 py-2 text-sm font-medium transition-colors ${textMuted} hover:${text} flex items-center`}>
                    Connexion
                  </Link>
                  <Link to="/register" className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg ${isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                    Commencer
                  </Link>
                </>
              )}
            </div>

            <button onClick={() => setMobileMenuOpen(v => !v)} className={`md:hidden p-2 rounded-lg transition ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
              {mobileMenuOpen ? <X className={`w-5 h-5 ${text}`} /> : <Menu className={`w-5 h-5 ${text}`} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden border-t px-5 py-4 space-y-1 animate-fadeIn ${isDark ? 'bg-[#0D1120] border-white/8' : 'bg-white border-gray-200'}`}>
            {[
              { label: 'Fonctionnalités', href: '#features' },
              { label: 'Démo', href: '#demo' },
              { label: 'Tarifs', href: '#pricing' },
              { label: 'Témoignages', href: '#testimonials' },
            ].map(n => (
              <a key={n.href} href={n.href} onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 text-sm rounded-lg transition ${textMuted} ${isDark ? 'hover:bg-white/5 hover:text-white' : 'hover:bg-gray-100 hover:text-gray-900'}`}>
                {n.label}
              </a>
            ))}
            <div className="pt-2 space-y-2">
              {user ? (
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}
                  className="block w-full py-4 px-4 text-center text-sm bg-gradient-to-r from-amber-400 to-orange-500 text-black rounded-xl font-bold shadow-lg shadow-amber-400/20 active:scale-[0.98] transition-all">
                  Mon espace →
                </Link>
              ) : (
                <>
                  <button onClick={() => { openDemo(); setMobileMenuOpen(false) }}
                    className={`w-full py-3 px-4 text-sm text-amber-500 border border-amber-400/30 rounded-xl transition font-medium ${isDark ? 'hover:bg-amber-400/10' : 'hover:bg-amber-50'}`}>
                    {t('landing.demo')}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                      className={`block w-full py-3 px-4 text-center text-sm rounded-xl font-medium transition ${textMuted} ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}>
                      Connexion
                    </Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)}
                      className={`block w-full py-3 px-4 text-center text-sm rounded-xl font-bold transition shadow-lg ${isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                      S'inscrire
                    </Link>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/5 mt-4">
                <span className={`text-xs font-medium ${textMuted}`}>Mode {isDark ? 'Sombre' : 'Clair'}</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ──────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-20 px-5 overflow-hidden">
        {/* Animation 3D WebGL en fond */}
        <HeroScene3D isDark={isDark} />

        {/* Arrière-plan supplémentaire : lumières ambiantes douces */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          {isDark ? (
            <>
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-blue-600/10 rounded-full blur-[140px]" />
              <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-500/8 rounded-full blur-[120px]" />
            </>
          ) : (
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-amber-100 rounded-full blur-[140px] opacity-40" />
          )}
          {/* Grid subtile */}
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto text-center px-4">
          <div className="flex flex-col items-center">
            {/* Badge — Rhyming with the orange accent */}
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-12 backdrop-blur-md border animate-fadeIn ${
              isDark
                ? 'bg-amber-400/5 border-amber-400/20 text-amber-400'
                : 'bg-amber-50 border-amber-200 text-amber-600'
            }`}>
              <Sparkles className="w-3 h-3" />
              Intelligence Artificielle de confiance
            </div>

            <h1 className={`hero-title mb-10 ${text}`}>
              Vendez plus sur <span className="text-emerald-500">WhatsApp</span>,
              <br />
              même quand vous <span className="text-amber-500 italic">dormez</span>.
            </h1>

            <p className={`hero-subtitle mb-14 text-lg md:text-xl font-medium px-4 ${isDark ? 'text-white/60' : 'text-gray-700'}`}>
              Ne soyez plus seul pour gérer vos messages. SEVEN T est l'assistant intelligent qui qualifie vos leads, gère vos stocks et publie vos statuts automatiquement. **Commencez votre essai gratuit aujourd'hui.**
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-20 w-full sm:w-auto">
              <Link to="/register"
                className={`group flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] active:scale-95 ${
                  isDark
                    ? 'bg-amber-500 text-black shadow-[0_20px_40px_-15px_rgba(245,158,11,0.4)]'
                    : 'bg-gray-900 text-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]'
                }`}>
                Essayer gratuitement
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button onClick={openDemo}
                className={`group flex items-center justify-center gap-3 px-10 py-5 glass rounded-2xl font-bold text-lg transition-all hover:bg-white/5 active:scale-95 border ${isDark ? 'border-white/10' : 'border-gray-200'} ${text}`}>
                <Play className="w-5 h-5 text-amber-500 fill-amber-500" />
                Voir la démo
              </button>
            </div>

            {/* Visual Rhyming: Floating Cards (Depth) */}
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl transition-all duration-700 ${isDark ? 'opacity-50 grayscale hover:grayscale-0' : 'opacity-90'}`}>
               {['Automatique', '24h/24', 'Précis', 'Local'].map((word, i) => (
                 <div key={word} className={`p-4 rounded-xl border ${borderFaint} glass text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                    {word}
                 </div>
               ))}
            </div>
          </div>
        </div>

        <a href="#features" className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-colors animate-bounce ${textFaint} hover:${textMuted}`}>
          <ChevronDown className="w-6 h-6" />
        </a>
      </section>

      {/* ── STATS BAR ─────────────────────────── */}
      <section className={`border-y ${borderFaint} ${isDark ? 'bg-white/[0.02]' : 'bg-white'} py-12 transition-colors duration-300 relative`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 group">
            {[
              { value: '2B+', label: 'Utilisateurs WhatsApp', icon: Globe },
              { value: '< 10s', label: 'Temps de réponse', icon: Zap },
              { value: '24/7', label: 'Disponibilité IA', icon: Clock },
              { value: '99%', label: 'Taux de satisfaction', icon: Star },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center group-hover:opacity-100 opacity-70 transition-opacity duration-500">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 glass group-hover:scale-110`}>
                  <s.icon className="w-6 h-6 text-amber-500" />
                </div>
                <p className={`text-3xl md:text-4xl font-bold tracking-tighter ${text}`}>{s.value}</p>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${textFaint}`}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ASSISTED SAAS SHOWCASE ────────────────── */}
      <section className={`py-24 md:py-32 scroll-mt-20 ${bgAlt} transition-colors duration-300 relative overflow-hidden`}>
         <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
            <div className="grid md:grid-cols-2 gap-16 items-center">
               <div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 ${isDark ? 'bg-amber-400/10 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                    Concept Exclusif
                  </div>
                  <h2 className={`text-4xl md:text-5xl font-bold mb-8 leading-tight ${text}`}>
                    L'expérience <span className="text-amber-500">Assisted SaaS</span>
                  </h2>
                  <p className={`text-lg mb-10 leading-relaxed ${textMuted}`}>
                    Marre des logiciels compliqués ? SEVEN T est conçu pour vous assister, pas pour vous donner plus de travail.
                  </p>
                  
                  <div className="space-y-8">
                     {[
                        { title: 'Intention, pas de clics', desc: 'Dites simplement "Crée une promo pour mes clients fidèles" et l\'IA s\'occupe du reste.' },
                        { title: 'Assistant de Mission', desc: 'Besoin d\'un compte-rendu ou d\'un rapport ? Votre assistant global le génère en une commande.' },
                        { title: 'Zéro Configuration', desc: 'Nos agents apprennent de vos documents et de votre site en quelques secondes.' },
                     ].map((item, i) => (
                        <div key={i} className="flex gap-5">
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                              <Check className="w-6 h-6 text-amber-500" />
                           </div>
                           <div>
                              <h4 className={`font-bold mb-1 ${text}`}>{item.title}</h4>
                              <p className={textMuted}>{item.desc}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
               
               <div className="relative">
                  <div className={`relative rounded-3xl border p-2 glass overflow-hidden ${isDark ? 'border-white/10 shadow-2xl shadow-black/50' : 'border-gray-200 shadow-xl shadow-gray-200'}`}>
                     <div className={`bg-space-950 p-6 rounded-2xl`}>
                        <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                           <div className="w-2 h-2 rounded-full bg-red-400" />
                           <div className="w-2 h-2 rounded-full bg-amber-400" />
                           <div className="w-2 h-2 rounded-full bg-emerald-400" />
                           <div className="ml-2 px-3 py-1 rounded-lg bg-white/5 text-[10px] text-white/40 font-mono">search_assistant_v2.ai</div>
                        </div>
                        <div className="space-y-4">
                           <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center">
                                 <Bot className="w-4 h-4 text-amber-400" />
                              </div>
                              <div className="px-4 py-3 rounded-2xl bg-white/5 text-sm text-white/80 max-w-[80%]">
                                 Bonjour ! Comment puis-je vous assister aujourd'hui ?
                              </div>
                           </div>
                           <div className="flex items-start gap-3 flex-row-reverse">
                              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                 <User className="w-4 h-4 text-blue-400" />
                              </div>
                              <div className="px-4 py-3 rounded-2xl bg-blue-500/10 text-sm text-white/90 border border-blue-500/20">
                                 Crée un nouveau produit "Café Touba" à 1500 FCFA
                              </div>
                           </div>
                           <div className="flex items-start gap-3">
                               <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center">
                                 <Bot className="w-4 h-4 text-amber-400" />
                              </div>
                              <div className="px-4 py-3 rounded-2xl bg-white/5 text-sm text-white/80 max-w-[80%] border border-emerald-500/20">
                                 <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                                    <Sparkles className="w-3 h-3" /> Action effectuée !
                                 </div>
                                 Le produit **Café Touba** a été ajouté à votre catalogue avec succès.
                              </div>
                           </div>
                        </div>
                        <div className="mt-8 flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                           <div className="w-5 h-5 text-gold-400"><Sparkles className="w-full h-full" /></div>
                           <div className="text-xs text-white/30 italic">Que voulez-vous faire ?</div>
                        </div>
                     </div>
                  </div>
                  {/* Floating elements */}
                  <div className="absolute -bottom-6 -right-6 p-4 rounded-2xl glass border border-amber-400/20 shadow-xl animate-bounce">
                     <p className="text-[10px] font-bold text-emerald-400">+12% Conversion</p>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* ── FEATURES ──────────────────────────── */}
      <section id="features" className={`pt-24 pb-10 md:pt-32 md:pb-12 scroll-mt-20 ${bg} transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <p className="text-amber-500 text-sm font-semibold uppercase tracking-widest mb-4">Fonctionnalités</p>
            <h2 className={`text-4xl md:text-5xl font-bold mb-5 ${text}`}>
              Tout ce qu'il vous faut pour automatiser
            </h2>
            <p className={`text-lg ${textMuted}`}>
              De la première conversation jusqu'à la commande — une plateforme unique, pensée pour les entrepreneurs africains.
            </p>
          </div>

          <Swiper
            effect={'coverflow'}
            grabCursor={true}
            centeredSlides={true}
            slidesPerView={'auto'}
            initialSlide={1}
            coverflowEffect={{
              rotate: 15,
              stretch: 0,
              depth: 250,
              modifier: 1,
              slideShadows: false,
            }}
            pagination={{ clickable: true, dynamicBullets: true }}
            autoplay={{ delay: 3500, disableOnInteraction: false }}
            modules={[EffectCoverflow, Pagination, Autoplay]}
            className="w-full !px-4 !pb-16"
          >
            {features.map((f, i) => (
              <SwiperSlide key={i} className="max-w-[320px] sm:max-w-[400px]">
                <div className="group h-full p-8 rounded-3xl border transition-all duration-500 glass cursor-grab active:cursor-grabbing relative overflow-hidden bg-white hover:bg-gray-50/50 dark:bg-white/3 dark:hover:bg-white/5 border-gray-200 hover:border-gray-300 dark:border-white/8 dark:hover:border-white/15">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-8 glass ${isDark ? f.darkBg : f.lightBg}`}>
                    <f.icon className={`w-7 h-7 ${f.iconColor}`} />
                  </div>
                  <h3 className={`font-bold text-xl mb-4 ${text} tracking-tight`}>{f.title}</h3>
                  <p className={`text-sm leading-relaxed ${textMuted}`}>{f.description}</p>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* ── BEFORE / AFTER ───────────────────── */}
      <section className={`pt-12 pb-24 md:pt-16 md:pb-32 scroll-mt-20 ${bg} transition-colors duration-300`}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
           <div className="text-center mb-16">
              <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${text}`}>L'impact sur votre business</h2>
              <p className={textMuted}>Comparez la gestion classique avec la puissance de SEVEN T.</p>
           </div>
           
           <div className="grid md:grid-cols-2 gap-8">
              {/* Before */}
              <div className={`p-8 rounded-3xl border ${isDark ? 'border-red-500/20 bg-red-500/5' : 'border-red-200 bg-red-50/50'}`}>
                 <h4 className="text-red-500 font-bold mb-6 flex items-center gap-2">
                    <X className="w-5 h-5" /> Sans SEVEN T
                 </h4>
                 <ul className="space-y-4">
                    {[
                       'Temps de réponse de plusieurs heures',
                       'Perte de 60% des leads le week-end',
                       'Gestion manuelle et erreurs de stock',
                       'Suivi client inexistant ou désordonné',
                    ].map((item, i) => (
                       <li key={i} className={`flex items-center gap-3 text-sm ${textMuted}`}>
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500/40" />
                          {item}
                       </li>
                    ))}
                 </ul>
              </div>
              
              {/* After */}
              <div className={`p-8 rounded-3xl border ${isDark ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50/50'} relative overflow-hidden group`}>
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap className="w-24 h-24 text-emerald-500" />
                 </div>
                 <h4 className="text-emerald-500 font-bold mb-6 flex items-center gap-2">
                    <Check className="w-5 h-5" /> Avec SEVEN T
                 </h4>
                 <ul className="space-y-4">
                    {[
                       'Réponse instantanée 24h/24',
                       'Taux de conversion boosté de 30%',
                       'Automatisation totale des commandes',
                       'CRM toujours à jour sans effort',
                    ].map((item, i) => (
                       <li key={i} className={`flex items-center gap-3 text-sm ${text}`}>
                          <Check className="w-4 h-4 text-emerald-500" />
                          {item}
                       </li>
                    ))}
                 </ul>
              </div>
           </div>
        </div>
      </section>

      {/* ── WHY SEVEN-T ──────────────────────── */}
      <section className={`py-24 md:py-32 scroll-mt-20 ${bgAlt} transition-colors duration-300`}>
         <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="grid md:grid-cols-3 gap-12">
               {[
                  {
                     title: 'Canal #1 en Afrique',
                     desc: 'WhatsApp est le cœur du business africain. Nous l\'avons rendu intelligent.',
                     icon: MessageSquare
                  },
                  {
                     title: 'Mobile-First Design',
                     desc: 'Gérez tout depuis votre téléphone. Simple, léger et accessible partout.',
                     icon: Phone
                  },
                  {
                     title: 'Modèle Hybrid Client',
                     desc: 'L\'IA s\'arrête là où l\'humain commence. Reprenez la main quand vous voulez.',
                     icon: Users
                  }
               ].map((item, i) => (
                  <div key={i} className="text-center">
                     <div className={`w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                        <item.icon className="w-8 h-8 text-amber-500" />
                     </div>
                     <h4 className={`text-xl font-bold mb-3 ${text}`}>{item.title}</h4>
                     <p className={`text-sm ${textMuted}`}>{item.desc}</p>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* ── DEMO VIDEO ────────────────────────── */}
      <section id="demo" className={`py-24 md:py-32 scroll-mt-20 ${bgAlt} transition-colors duration-300 relative overflow-hidden`}>
        {isDark && (
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/15 to-transparent pointer-events-none" />
        )}
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid md:grid-cols-2 gap-16 items-center mb-16">
            <div>
              <p className="text-amber-500 text-sm font-semibold uppercase tracking-widest mb-4">Voir en action</p>
              <h2 className={`text-4xl md:text-5xl font-bold mb-6 leading-tight ${text}`}>
                Découvrez la puissance de SEVEN T
              </h2>
              <p className={`text-lg mb-8 leading-relaxed ${textMuted}`}>
                En moins de 5 minutes, configurez votre premier agent IA et commencez à répondre à vos clients automatiquement sur WhatsApp.
              </p>
              <div className="space-y-4">
                {[
                  { step: '01', text: 'Créez votre agent en quelques clics' },
                  { step: '02', text: 'Connectez votre compte WhatsApp' },
                  { step: '03', text: 'Automatisez les réponses dès maintenant' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className={`text-2xl font-bold ${textFaint}`}>{s.step}</span>
                    <span className={textMuted}>{s.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              {/* ╔══════════════════════════════════════════╗
                  ║     ZONE VIDÉO — remplacez le placeholder ║
                  ╚══════════════════════════════════════════╝ */}
              <div className={`relative rounded-2xl overflow-hidden border shadow-2xl aspect-video ${isDark ? 'border-white/10 bg-[#0D1120] shadow-black/50' : 'border-gray-200 bg-gray-100 shadow-gray-200'}`}>
                <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 ${isDark ? 'bg-gradient-to-br from-[#0D1120] to-[#111827]' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
                  <div className={`w-20 h-20 rounded-full border flex items-center justify-center cursor-pointer hover:scale-110 transition-all ${isDark ? 'bg-amber-400/15 border-amber-400/30' : 'bg-amber-100 border-amber-300'}`}>
                    <Play className="w-8 h-8 text-amber-500 fill-amber-500 ml-1" />
                  </div>
                  <div className="text-center">
                    <p className={`font-semibold mb-1 ${text}`}>Vidéo de démo</p>
                    <p className={`text-sm ${textMuted}`}>Votre vidéo apparaîtra ici</p>
                  </div>
                  {/* Pour remplacer par une vraie vidéo MP4 :
                  <video className="absolute inset-0 w-full h-full object-cover" controls src="/demo.mp4" poster="/demo-thumbnail.jpg" />
                  */}
                  {/* Pour remplacer par YouTube :
                  <iframe className="absolute inset-0 w-full h-full" src="https://www.youtube.com/embed/VOTRE_ID" allowFullScreen />
                  */}
                </div>
              </div>
              <p className={`text-center text-xs mt-3 ${textFaint}`}>↑ Remplacez ce bloc par votre vidéo de démonstration</p>
            </div>
          </div>

          {/* Demo CTA */}
          <div className={`rounded-2xl border p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 ${
            isDark
              ? 'border-amber-400/20 bg-gradient-to-r from-amber-400/8 to-orange-400/5'
              : 'border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50'
          }`}>
            <div className="flex-1">
              <h3 className={`text-2xl font-bold mb-2 ${text}`}>Vous préférez une démo en direct ?</h3>
              <p className={textMuted}>Notre équipe vous présente SEVEN T selon votre activité, en 20 minutes chrono.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <button onClick={openDemo}
                className="px-7 py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 text-black rounded-xl font-bold transition-all hover:opacity-90 hover:scale-[1.02] shadow-lg shadow-amber-400/20 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {t('landing.demo')}
              </button>
              <Link to="/register"
                className={`px-7 py-3.5 rounded-xl font-medium transition-all text-center border ${
                  isDark
                    ? 'border-white/15 text-white hover:bg-white/5'
                    : 'border-gray-300 text-gray-700 hover:bg-white'
                }`}>
                Essayer gratuitement
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────── */}
      <section id="testimonials" className={`py-24 md:py-32 scroll-mt-20 ${bg} transition-colors duration-300`}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-16">
            <p className="text-amber-500 text-sm font-semibold uppercase tracking-widest mb-4">Témoignages</p>
            <h2 className={`text-4xl md:text-5xl font-bold ${text}`}>Ils nous font confiance</h2>
          </div>

          <div className="relative overflow-hidden">
            <div className="flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${activeTestimonial * 100}%)` }}>
              {testimonials.map((t, i) => (
                <div key={i} className="w-full flex-shrink-0 px-2">
                  <div className={`rounded-2xl border p-8 md:p-10 ${bgCard}`}>
                    <div className="flex gap-1 mb-6">
                      {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                    </div>
                    <p className={`text-xl leading-relaxed mb-8 italic ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                      « {t.quote} »
                    </p>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold`}>
                        {t.initials}
                      </div>
                      <div>
                        <p className={`font-semibold ${text}`}>{t.name}</p>
                        <p className={`text-sm ${textMuted}`}>{t.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => setActiveTestimonial(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === activeTestimonial ? 'w-8 bg-amber-500' : `w-1.5 ${isDark ? 'bg-white/20' : 'bg-gray-300'}`}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────── */}
      <section id="pricing" className={`py-24 md:py-32 scroll-mt-20 ${bgAlt} transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-amber-500 text-sm font-semibold uppercase tracking-widest mb-4">Tarification</p>
            <h2 className={`text-4xl md:text-5xl font-bold mb-5 ${text}`}>
              Des plans simples et transparents
            </h2>
            <p className={`text-lg ${textMuted}`}>
              Sans engagement. Commencez gratuitement et évoluez à votre rythme.
            </p>
          </div>

          {loadingPlans ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          ) : (
            <div className={`grid gap-5 ${
              plans.length === 1 ? 'max-w-md mx-auto' :
              plans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' :
              plans.length === 3 ? 'md:grid-cols-3' :
              'md:grid-cols-2 lg:grid-cols-4'
            }`}>
              {plans.map((plan, i) => (
                <PlanCard key={plan.id} plan={plan} isPopular={plan.id === getPopularPlanId()} delayIndex={i} onShowDetails={setSelectedPlanForDetails} />
              ))}
            </div>
          )}

          <p className={`text-center text-sm mt-10 ${textFaint}`}>
            Tous les plans · Sans engagement · Annulation à tout moment · Support par email
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────── */}
      <section className={`py-24 md:py-32 px-5 sm:px-8 relative overflow-hidden ${bg} transition-colors duration-300`}>
        {isDark ? (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-amber-400/8 rounded-full blur-[120px]" />
          </div>
        ) : (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-amber-100 rounded-full blur-[140px] opacity-60" />
          </div>
        )}
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className={`text-4xl md:text-6xl font-bold mb-6 leading-tight ${text}`}>
            Prêt à transformer votre <span className="text-amber-500">WhatsApp</span> ?
          </h2>
          <p className={`text-xl mb-12 leading-relaxed ${textMuted}`}>
            Rejoignez des centaines d'entrepreneurs qui automatisent leur croissance avec SEVEN T. 
            <br className="hidden md:block" /> **Essai gratuit — Sans carte bancaire.**
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register"
              className={`group flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-lg transition-all shadow-2xl hover:scale-[1.02] ${
                isDark
                  ? 'bg-white text-black hover:bg-gray-100 shadow-white/10'
                  : 'bg-gray-900 text-white hover:bg-gray-800 shadow-gray-900/20'
              }`}>
              Commencer gratuitement
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button onClick={openDemo}
              className={`flex items-center gap-2 px-8 py-4 border rounded-2xl font-medium text-lg transition-all ${
                isDark
                  ? 'border-white/15 text-white hover:bg-white/5'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}>
              <Play className="w-4 h-4 text-amber-500 fill-amber-500" />
              {t('landing.demo')}
            </button>
          </div>
          <p className={`mt-8 text-sm ${textFaint}`}>Sans carte bancaire · Gratuit pour commencer</p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────── */}
      <footer className={`border-t ${borderFaint} py-14 px-5 sm:px-8 ${bgAlt} transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <Logo className="mb-4" />
              <p className={`text-sm max-w-sm leading-relaxed ${textMuted}`}>
                La plateforme d'automatisation WhatsApp avec IA pour les entrepreneurs africains. Répondez à vos clients 24h/24.
              </p>
            </div>
            <div>
              <h4 className={`font-semibold mb-4 text-sm ${text}`}>Produit</h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  { label: 'Fonctionnalités', href: '#features' },
                  { label: 'Tarifs', href: '#pricing' },
                ].map(l => (
                  <li key={l.label}><a href={l.href} className={`transition-colors ${textFaint} hover:${textMuted}`}>{l.label}</a></li>
                ))}
                <li><button onClick={openDemo} className={`transition-colors ${textFaint} hover:${textMuted}`}>Demander une démo</button></li>
                <li><Link to="/register" className={`transition-colors ${textFaint} hover:${textMuted}`}>Créer un compte</Link></li>
              </ul>
            </div>
            <div>
              <h4 className={`font-semibold mb-4 text-sm ${text}`}>Légal</h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  { label: 'CGU', to: '/legal?tab=terms' },
                  { label: 'Confidentialité', to: '/legal?tab=privacy' },
                  { label: 'RGPD', to: '/legal?tab=rgpd' },
                  { label: 'DPA', to: '/legal?tab=dpa' },
                ].map(l => (
                  <li key={l.label}><Link to={l.to} className={`transition-colors ${textFaint} hover:${textMuted}`}>{l.label}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div className={`pt-8 border-t ${borderFaint} flex flex-col md:flex-row justify-between items-center gap-6`}>
            <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
              <p className={`text-sm ${textFaint}`}>© {new Date().getFullYear()} SEVEN T. Tous droits réservés.</p>
              <div className="hidden md:block w-px h-4 bg-gray-500/20" />
              <a 
                href="https://wa.me/22558519080" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`text-xs font-bold tracking-widest uppercase hover:text-amber-500 transition-colors ${textMuted}`}
              >
                CONÇU PAR STEVEN YAPO
              </a>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link to="/login" className={`text-sm transition-colors ${textFaint} hover:${textMuted}`}>Connexion</Link>
              <Link to="/register" className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'}`}>S'inscrire</Link>
            </div>
          </div>
        </div>
      </footer>

      {!user && <LandingChatbot />}
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} isDark={isDark} />
      
      <PricingDetailsModal 
        plan={selectedPlanForDetails} 
        isOpen={!!selectedPlanForDetails} 
        onClose={() => setSelectedPlanForDetails(null)} 
      />
    </div>
  )
}
