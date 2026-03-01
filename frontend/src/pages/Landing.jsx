import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import LandingChatbot from '../components/LandingChatbot'

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
    title: 'Agents IA intelligents',
    description: 'Créez des assistants IA personnalisés qui répondent automatiquement à vos clients sur WhatsApp, 24h/24 et 7j/7.',
  },
  {
    icon: TrendingUp,
    darkBg: 'bg-amber-500/10 border-amber-500/15',
    lightBg: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-500',
    title: 'Qualification de leads',
    description: 'Votre assistant qualifie vos prospects, prend des rendez-vous et suit chaque opportunité sans intervention humaine.',
  },
  {
    icon: ShoppingCart,
    darkBg: 'bg-emerald-500/10 border-emerald-500/15',
    lightBg: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-500',
    title: 'Commandes & catalogue',
    description: 'Gérez un catalogue produit complet. L\'IA détecte les intentions d\'achat et crée les commandes automatiquement.',
  },
  {
    icon: BarChart3,
    darkBg: 'bg-purple-500/10 border-purple-500/15',
    lightBg: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-500',
    title: 'Analytics & rapports',
    description: 'Suivez vos performances en temps réel. Conversations, leads, chiffre d\'affaires : tout dans un seul dashboard.',
  },
  {
    icon: Globe,
    darkBg: 'bg-cyan-500/10 border-cyan-500/15',
    lightBg: 'bg-cyan-50 border-cyan-200',
    iconColor: 'text-cyan-500',
    title: 'Multi-agents & canaux',
    description: 'Gérez plusieurs agents et numéros WhatsApp depuis une seule plateforme. Idéal pour les équipes.',
  },
  {
    icon: Shield,
    darkBg: 'bg-rose-500/10 border-rose-500/15',
    lightBg: 'bg-rose-50 border-rose-200',
    iconColor: 'text-rose-500',
    title: 'Sécurité & conformité',
    description: 'Vos données sont chiffrées et sécurisées. Conforme RGPD et aux politiques de Meta / WhatsApp Business.',
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

function PlanCard({ plan, isPopular, isDark }) {
  const limits = typeof plan.limits === 'string' ? JSON.parse(plan.limits) : (plan.limits || {})
  const feats = typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || {})

  const getFeaturesList = () => {
    const list = []
    if (limits?.agents) list.push(`${limits.agents === -1 ? 'Illimité' : limits.agents} agent${limits.agents > 1 ? 's' : ''} IA`)
    if (limits?.whatsappAccounts) list.push(`${limits.whatsappAccounts === -1 ? 'Illimités' : limits.whatsappAccounts} numéro${limits.whatsappAccounts > 1 ? 's' : ''} WhatsApp`)
    if (limits?.monthlyCredits) list.push(`${limits.monthlyCredits === -1 ? 'Crédits illimités' : `${limits.monthlyCredits.toLocaleString()} crédits/mois`}`)
    if (feats?.knowledgeBase) list.push('Base de connaissances IA')
    if (feats?.analytics) list.push('Analytics avancés')
    if (feats?.prioritySupport) list.push('Support prioritaire')
    if (feats?.customIntegrations) list.push('Intégrations personnalisées')
    if (feats?.whiteLabel) list.push('White label')
    return list
  }

  const formatPrice = (p) => p === 0 ? 'Gratuit' : new Intl.NumberFormat('fr-FR').format(p)

  return (
    <div className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 ${
      isPopular
        ? isDark
          ? 'border-amber-400/50 bg-gradient-to-b from-amber-400/8 to-transparent shadow-2xl shadow-amber-400/10'
          : 'border-amber-400 bg-gradient-to-b from-amber-50 to-white shadow-2xl shadow-amber-200'
        : isDark
          ? 'border-white/8 bg-white/3 hover:border-white/15'
          : 'border-gray-200 bg-white hover:border-gray-300 shadow-sm hover:shadow-md'
    }`}>
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-bold shadow-lg">
            <Sparkles className="w-3 h-3" />
            Le plus populaire
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{plan.display_name || plan.name}</h3>
        {plan.description && <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{plan.description}</p>}
      </div>

      <div className="mb-8">
        <span className={`text-5xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatPrice(plan.price)}</span>
        {plan.price > 0 && (
          <span className="text-gray-500 text-sm ml-2">
            {plan.price_currency || 'FCFA'} / {plan.billing_period === 'yearly' ? 'an' : 'mois'}
          </span>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {getFeaturesList().map((f, i) => (
          <li key={i} className={`flex items-center gap-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isPopular ? 'bg-amber-400/20' : isDark ? 'bg-white/8' : 'bg-gray-100'}`}>
              <Check className={`w-3 h-3 ${isPopular ? 'text-amber-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
            {f}
          </li>
        ))}
      </ul>

      <Link
        to="/register"
        className={`w-full block text-center py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
          isPopular
            ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:opacity-90 shadow-lg shadow-amber-400/20'
            : isDark
              ? 'bg-white/8 text-white hover:bg-white/12 border border-white/10'
              : 'bg-gray-900 text-white hover:bg-gray-800 border border-gray-900'
        }`}
      >
        {plan.price === 0 ? 'Commencer gratuitement' : 'S\'abonner'}
      </Link>
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

  const openDemo = () => window.dispatchEvent(new CustomEvent('open-landing-chat-demo'))

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
    <div className={`min-h-screen ${bg} antialiased overflow-x-hidden transition-colors duration-300`}>

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
                  <Link to="/login" className={`px-4 py-2 text-sm font-medium transition-colors ${textMuted} hover:${text}`}>
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
              <button onClick={() => { openDemo(); setMobileMenuOpen(false) }}
                className="w-full py-3 px-4 text-sm text-amber-500 border border-amber-400/30 rounded-xl transition font-medium hover:bg-amber-50">
                {t('landing.demo')}
              </button>
              <Link to="/register" className={`block w-full py-3 px-4 text-center text-sm rounded-xl font-semibold transition ${isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                Commencer gratuitement
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ──────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-20 px-5 overflow-hidden">
        {/* Background glows — adaptatifs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {isDark ? (
            <>
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />
              <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-amber-500/8 rounded-full blur-[100px]" />
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[100px]" />
              <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
            </>
          ) : (
            <>
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-amber-100 rounded-full blur-[140px] opacity-60" />
              <div className="absolute top-1/2 right-0 w-[500px] h-[400px] bg-blue-100 rounded-full blur-[120px] opacity-50" />
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.3) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
            </>
          )}
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-8 backdrop-blur-sm border ${
            isDark
              ? 'bg-amber-400/10 border-amber-400/20 text-amber-400'
              : 'bg-amber-50 border-amber-200 text-amber-600'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isDark ? 'bg-amber-400' : 'bg-amber-500'}`}></span>
            </span>
            Automatisation WhatsApp avec IA — Disponible maintenant
          </div>

          <h1 className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-8 ${text}`}>
            Répondez à vos clients
            <br />
            <span className="bg-gradient-to-r from-amber-500 via-orange-400 to-amber-400 bg-clip-text text-transparent">
              24h/24, sans effort.
            </span>
          </h1>

          <p className={`text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-12 ${textMuted}`}>
            SEVEN T automatise vos conversations WhatsApp avec une IA intelligente. Qualifiez vos leads, traitez vos commandes et fidélisez vos clients — même quand vous dormez.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/register"
              className={`group flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base transition-all shadow-2xl hover:scale-[1.02] ${
                isDark
                  ? 'bg-white text-black hover:bg-gray-100 shadow-white/10 hover:shadow-white/20'
                  : 'bg-gray-900 text-white hover:bg-gray-800 shadow-gray-900/20 hover:shadow-gray-900/30'
              }`}>
              Commencer gratuitement
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button onClick={openDemo}
              className={`group flex items-center gap-2 px-8 py-4 border rounded-2xl font-medium text-base transition-all ${
                isDark
                  ? 'border-white/15 text-white hover:bg-white/5 hover:border-white/25'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
              }`}>
              <Play className="w-4 h-4 text-amber-500 fill-amber-500 group-hover:scale-110 transition-transform" />
              {t('landing.demo')}
            </button>
          </div>

          {/* Trust bar */}
          <div className={`flex flex-wrap items-center justify-center gap-6 text-xs ${textFaint}`}>
            {['Sans carte bancaire', 'Configuration en 5 min', 'Support 7j/7', 'Conformité WhatsApp Business'].map((item, i) => (
              <span key={i} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <a href="#features" className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-colors animate-bounce ${textFaint} hover:${textMuted}`}>
          <ChevronDown className="w-6 h-6" />
        </a>
      </section>

      {/* ── STATS BAR ─────────────────────────── */}
      <section className={`border-y ${borderFaint} ${isDark ? 'bg-white/2' : 'bg-white'} py-10 transition-colors duration-300`}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '2B+', label: 'Utilisateurs WhatsApp', icon: Globe },
              { value: '< 10s', label: 'Temps de réponse', icon: Zap },
              { value: '24/7', label: 'Disponibilité agents', icon: Clock },
              { value: '99%', label: 'Taux de satisfaction', icon: Star },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center md:flex-row md:text-left md:items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-white/5' : 'bg-amber-50'}`}>
                  <s.icon className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className={`text-2xl md:text-3xl font-bold ${text}`}>{s.value}</p>
                  <p className={`text-xs ${textMuted}`}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────── */}
      <section id="features" className={`py-24 md:py-32 scroll-mt-20 ${bg} transition-colors duration-300`}>
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

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i}
                className={`group p-7 rounded-2xl border transition-all duration-300 hover:scale-[1.02] cursor-default ${isDark ? f.darkBg : f.lightBg}`}>
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-5 ${isDark ? f.darkBg : f.lightBg}`}>
                  <f.icon className={`w-6 h-6 ${f.iconColor}`} />
                </div>
                <h3 className={`font-semibold text-lg mb-3 ${text}`}>{f.title}</h3>
                <p className={`text-sm leading-relaxed ${textMuted}`}>{f.description}</p>
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
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 lg:px-10">
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
                <div key={plan.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
                  <PlanCard plan={plan} isPopular={plan.id === getPopularPlanId()} isDark={isDark} />
                </div>
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
            Prêt à automatiser votre WhatsApp ?
          </h2>
          <p className={`text-xl mb-12 leading-relaxed ${textMuted}`}>
            Rejoignez des centaines d'entrepreneurs qui font grandir leur activité avec SEVEN T.
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
          <div className={`pt-8 border-t ${borderFaint} flex flex-col md:flex-row justify-between items-center gap-4`}>
            <p className={`text-sm ${textFaint}`}>© {new Date().getFullYear()} SEVEN T. Tous droits réservés.</p>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link to="/login" className={`text-sm transition-colors ${textFaint} hover:${textMuted}`}>Connexion</Link>
              <Link to="/register" className={`text-sm transition-colors ${textFaint} hover:${textMuted}`}>Créer un compte</Link>
            </div>
          </div>
        </div>
      </footer>

      {!user && <LandingChatbot />}
    </div>
  )
}
