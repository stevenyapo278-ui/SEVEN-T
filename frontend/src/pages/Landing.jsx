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
  ChevronRight,
  Loader2,
  CreditCard,
  ShoppingCart
} from 'lucide-react'
import api from '../services/api'

/* Style DigitaWeb : Nos métiers / solutions */
const metiers = [
  {
    icon: MessageSquare,
    title: 'Conversations',
    description: 'Vous ne voulez plus laisser vos clients sans réponse ? Nous mettons en place des réponses automatiques 24h/24 sur WhatsApp, pour qualifier vos leads et ne manquer aucune opportunité.',
    href: '/register',
    label: 'Plus d\'infos'
  },
  {
    icon: Users,
    title: 'Leads & qualification',
    description: 'Automatisez la prise de rendez-vous et la qualification de vos prospects directement dans la conversation. Un assistant dédié guide vos contacts jusqu’à la prise de RDV.',
    href: '/register',
    label: 'Plus d\'infos'
  },
  {
    icon: ShoppingCart,
    title: 'Commandes & ventes',
    description: 'Catalogue produits, détection des commandes et suivi du stock. Idéal pour les boutiques et les entrepreneurs qui vendent via WhatsApp.',
    href: '/register',
    label: 'Plus d\'infos'
  },
  {
    icon: Zap,
    title: 'Support & fidélisation',
    description: 'Répondez à vos clients en quelques secondes, gérez des milliers de conversations sans perdre en qualité. Améliorez la satisfaction et la fidélisation.',
    href: '/register',
    label: 'Plus d\'infos'
  }
]

const stats = [
  { value: '2B+', label: 'Utilisateurs WhatsApp', icon: Globe },
  { value: '10s', label: 'Temps de réponse', icon: Zap },
  { value: '24/7', label: 'Disponibilité', icon: Clock },
  { value: '99%', label: 'Satisfaction', icon: Star }
]

const defaultPlans = [
  { id: 'free', name: 'free', display_name: 'Gratuit', description: 'Pour démarrer', price: 0, price_currency: 'FCFA', limits: { agents: 1, whatsappAccounts: 1, monthlyCredits: 100 }, features: { knowledgeBase: true } },
  { id: 'pro', name: 'pro', display_name: 'Pro', description: 'Pour les entrepreneurs', price: 29000, price_currency: 'FCFA', limits: { agents: 5, whatsappAccounts: 3, monthlyCredits: 5000 }, features: { knowledgeBase: true, analytics: true, prioritySupport: true } }
]

// Logo du SaaS (fichier déposé dans public/)
const Logo = ({ size = 'default', centered = false, className = '' }) => {
  const heightClass = size === 'large' ? 'h-20 sm:h-24 md:h-28' : 'h-8 sm:h-9'
  return (
    <img
      src="/logo.svg"
      alt="SEVEN T"
      className={`${heightClass} w-auto object-contain ${centered ? 'mx-auto block' : 'object-left'} ${className}`}
    />
  )
}

// Plan Card Component
const PlanCard = ({ plan, isPopular = false }) => {
  const limits = typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits
  const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features
  
  const formatPrice = (price) => {
    if (price === 0) return 'Gratuit'
    return new Intl.NumberFormat('fr-FR').format(price)
  }

  const getFeaturesList = () => {
    const list = []
    if (limits?.agents) list.push(`${limits.agents === -1 ? 'Illimité' : limits.agents} agent${limits.agents > 1 ? 's' : ''}`)
    if (limits?.whatsappAccounts) list.push(`${limits.whatsappAccounts === -1 ? 'Illimité' : limits.whatsappAccounts} compte${limits.whatsappAccounts > 1 ? 's' : ''} WhatsApp`)
    if (limits?.monthlyCredits) list.push(`${limits.monthlyCredits === -1 ? 'Illimités' : limits.monthlyCredits.toLocaleString()} crédits/mois`)
    if (features?.knowledgeBase) list.push('Base de connaissances')
    if (features?.analytics) list.push('Analytics avancés')
    if (features?.prioritySupport) list.push('Support prioritaire')
    if (features?.customIntegrations) list.push('Intégrations personnalisées')
    if (features?.whiteLabel) list.push('White label')
    return list
  }

  return (
    <div className={`relative rounded-2xl border-2 p-6 transition-all duration-300 hover:scale-[1.02] ${
      isPopular 
        ? 'border-gold-400 bg-gradient-to-b from-gold-400/10 to-transparent shadow-xl shadow-gold-400/10' 
        : 'border-space-700 bg-space-900 hover:border-violet-500/50'
    }`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-gold-400 to-amber-500 text-space-950 text-xs font-bold shadow-lg">
            <Star className="w-3 h-3" />
            Populaire
          </span>
        </div>
      )}
      
      <div className="text-center mb-6">
        <h3 className="text-xl font-display font-bold text-gray-100 mb-1">
          {plan.display_name || plan.name}
        </h3>
        {plan.description && (
          <p className="text-sm text-gray-400">{plan.description}</p>
        )}
        <div className="mt-4">
          <span className="text-4xl font-display font-bold text-gradient">
            {formatPrice(plan.price)}
          </span>
          {plan.price > 0 && (
            <span className="text-gray-400 text-sm ml-1">
              {plan.price_currency || plan.priceCurrency || 'FCFA'}/{plan.billing_period === 'yearly' ? 'an' : 'mois'}
            </span>
          )}
        </div>
      </div>

      <ul className="space-y-3 mb-6">
        {getFeaturesList().map((feature, index) => (
          <li key={index} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              isPopular ? 'bg-gold-400/20' : 'bg-violet-500/20'
            }`}>
              <Check className={`w-3 h-3 ${isPopular ? 'text-gold-400' : 'text-violet-400'}`} />
            </div>
            <span className="text-gray-300 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        to="/register"
        className={`w-full block text-center py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
          isPopular
            ? 'bg-gradient-to-r from-gold-400 to-amber-500 text-space-950 hover:shadow-lg hover:shadow-gold-400/25'
            : 'bg-space-800 text-gray-100 hover:bg-space-700 border border-space-700'
        }`}
      >
        {plan.price === 0 ? 'Commencer gratuitement' : 'Choisir ce plan'}
      </Link>
    </div>
  )
}

export default function Landing() {
  const { t } = useTranslation()
  const [plans, setPlans] = useState(defaultPlans)
  const [loadingPlans, setLoadingPlans] = useState(true)

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await api.get('/plans')
        const raw = response.data?.plans || []
        // L'API renvoie déjà uniquement les plans actifs ; pas de filtre is_active
        const sorted = [...raw]
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .slice(0, 4)
          .map(p => ({
            ...p,
            display_name: p.display_name ?? p.name,
            price_currency: p.price_currency ?? p.priceCurrency ?? 'FCFA'
          }))
        setPlans(sorted.length > 0 ? sorted : defaultPlans)
      } catch (error) {
        console.error('Error loading plans:', error)
        setPlans(defaultPlans)
      } finally {
        setLoadingPlans(false)
      }
    }
    loadPlans()
  }, [])

  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Déterminer le plan populaire (celui avec is_default ou le 2ème)
  const getPopularPlanId = () => {
    const defaultPlan = plans.find(p => p.is_default)
    if (defaultPlan) return defaultPlan.id
    if (plans.length >= 2) return plans[1].id
    return plans[0]?.id
  }

  return (
    <div className="min-h-screen bg-space-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-space-700/40 bg-space-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-18">
            <Link to="/" className="flex items-center focus:outline-none focus:ring-2 focus:ring-violet-500/50 rounded-lg">
              <Logo />
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#pourquoi" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Pourquoi nous</a>
              <a href="#metiers" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Solutions</a>
              <a href="#pricing" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Tarifs</a>
            </nav>
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-gray-400 hover:text-white transition-colors text-sm font-medium hidden sm:inline">Connexion</Link>
              <Link to="/register" className="btn-primary text-sm px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-gold-400/20 hover:shadow-gold-400/30 hover:scale-[1.02] transition-all">
                {t('landing.cta')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero — impact + vagues parallax */}
      <section className="landing-hero relative overflow-hidden bg-space-950 min-h-[90vh] flex flex-col justify-center pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="absolute inset-0 overflow-hidden pointer-events-none landing-hero-bg" aria-hidden="true">
          <div
            className="absolute inset-0 landing-hero-wave landing-hero-wave-1 will-change-transform"
            style={{ transform: `translate3d(0, ${scrollY * 0.12}px, 0)` }}
          >
            <svg className="absolute bottom-0 right-0 w-[140%] h-[90%] min-w-[900px]" viewBox="0 0 900 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMaxYMax meet">
              <path className="landing-wave-fill-1" d="M0 400 Q200 320 400 360 T800 340 T1200 380 L1200 600 L0 600 Z" fill="currentColor" />
            </svg>
          </div>
          <div
            className="absolute inset-0 landing-hero-wave landing-hero-wave-2 will-change-transform"
            style={{ transform: `translate3d(0, ${scrollY * 0.2}px, 0)` }}
          >
            <svg className="absolute bottom-0 right-0 w-[130%] h-[85%] min-w-[800px]" viewBox="0 0 900 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMaxYMax meet">
              <path className="landing-wave-fill-2" d="M0 420 Q250 300 500 380 T900 320 T1300 400 L1300 600 L0 600 Z" fill="currentColor" />
            </svg>
          </div>
          <div
            className="absolute inset-0 landing-hero-wave landing-hero-wave-3 will-change-transform"
            style={{ transform: `translate3d(0, ${scrollY * 0.28}px, 0)` }}
          >
            <svg className="absolute bottom-0 right-0 w-[120%] h-[80%] min-w-[700px]" viewBox="0 0 900 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMaxYMax meet">
              <path className="landing-wave-fill-3" d="M0 380 Q300 280 600 360 T1000 300 L1000 600 L0 600 Z" fill="currentColor" />
            </svg>
          </div>
          <div className="absolute inset-0 landing-hero-grid opacity-[0.03] dark:opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(var(--wave-grid-color, rgba(139,92,246,0.15)) 1px, transparent 1px), linear-gradient(90deg, var(--wave-grid-color, rgba(139,92,246,0.15)) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full animate-fadeIn">
          <div className="max-w-2xl">
            <p className="text-violet-400 font-medium text-sm uppercase tracking-wider mb-4">Partenaire de votre croissance</p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-white leading-[1.1] tracking-tight mb-6">
              Répondez à vos clients{' '}
              <span className="text-gradient block sm:inline">24h/24</span>
              {' '}sans rester collé à votre téléphone
            </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-xl leading-relaxed mb-8">
            Automatisation WhatsApp, qualification de leads, commandes et support. Une seule plateforme pour faire grandir votre activité.
          </p>
          <div className="flex flex-wrap gap-4">
              <Link to="/register" className="btn-primary inline-flex items-center justify-center gap-2 text-base px-8 py-4 rounded-xl font-semibold shadow-xl shadow-gold-400/25 hover:scale-[1.02] transition-all">
                Commencer gratuitement
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#metiers" className="inline-flex items-center justify-center gap-2 text-base px-8 py-4 rounded-xl font-semibold border border-space-600 text-gray-300 hover:border-violet-500/50 hover:text-white hover:bg-violet-500/10 transition-all">
                Voir les solutions
              </a>
            </div>
            <p className="mt-6 text-sm text-gray-500">Sans carte bancaire · Configuration en 5 min</p>
          </div>
        </div>
      </section>

      {/* Bandeau stats */}
      <section className="relative z-10 py-8 md:py-10 bg-space-900/90 border-y border-space-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat, index) => (
              <div key={index} className="flex items-center gap-4 md:flex-col md:text-center">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center shrink-0">
                  <stat.icon className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <span className="text-2xl md:text-3xl font-display font-bold text-white block">{stat.value}</span>
                  <span className="text-sm text-gray-500">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pourquoi SEVEN T */}
      <section id="pourquoi" className="py-20 md:py-28 bg-space-950 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
              Pourquoi choisir <span className="text-gradient">SEVEN T</span> ?
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Une plateforme pensée pour les entrepreneurs qui veulent scaler sans perdre le contact humain.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { icon: Zap, title: 'Réponses en secondes', desc: 'Vos clients reçoivent une réponse instantanée, même la nuit ou le week-end.' },
              { icon: TrendingUp, title: 'Plus de ventes', desc: 'Qualification des leads et suivi des commandes automatisés pour ne rien manquer.' },
              { icon: MessageSquare, title: 'Une seule interface', desc: 'Conversations, catalogue, stock et analytics au même endroit.' }
            ].map((item, i) => (
              <div key={i} className="group p-8 rounded-3xl bg-space-900 border border-space-700 hover:border-violet-500/40 hover:bg-space-800/50 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-6 group-hover:bg-violet-500/30 transition-colors">
                  <item.icon className="w-7 h-7 text-violet-400" />
                </div>
                <h3 className="font-display font-semibold text-xl text-white mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nos solutions / métiers */}
      <section id="metiers" className="py-20 md:py-28 bg-space-900 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-violet-400 font-medium text-sm uppercase tracking-wider mb-2">Nos solutions</p>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
              Tout pour automatiser et faire grandir votre activité
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              De la première conversation à la commande, nous vous accompagnons.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {metiers.map((m, index) => (
              <div
                key={index}
                className="group p-8 rounded-3xl bg-space-950 border border-space-700 hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-500/5 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <m.icon className="w-7 h-7 text-violet-400" />
                </div>
                <h3 className="font-display font-semibold text-xl text-white mb-3">{m.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">{m.description}</p>
                <Link to={m.href} className="text-violet-400 hover:text-violet-300 font-medium inline-flex items-center gap-1.5 text-sm">
                  {m.label}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28 bg-space-950 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-violet-400 font-medium text-sm uppercase tracking-wider mb-2">Tarification</p>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
              Des plans adaptés à <span className="text-gradient">vos besoins</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Sans engagement. Commencez gratuitement et passez à la vitesse supérieure quand vous le souhaitez.
            </p>
          </div>
          
          {loadingPlans ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
          ) : (
            <div className={`grid gap-6 ${
              plans.length === 1 ? 'max-w-md mx-auto' :
              plans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' :
              plans.length === 3 ? 'md:grid-cols-3 max-w-5xl mx-auto' :
              'md:grid-cols-2 lg:grid-cols-4'
            }`}>
              {plans.map((plan, index) => (
                <div key={plan.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.08}s` }}>
                  <PlanCard
                    plan={plan}
                    isPopular={plan.id === getPopularPlanId()}
                  />
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-gray-500 text-sm mt-8">
            Tous les plans incluent : Sans engagement · Annulation à tout moment · Support par email
          </p>
        </div>
      </section>

      {/* Témoignage */}
      <section className="py-20 md:py-28 bg-space-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-violet-400 font-medium text-sm uppercase tracking-wider mb-6">Témoignage</p>
          <blockquote className="text-xl md:text-2xl lg:text-3xl font-display font-medium text-white mb-10 text-center leading-relaxed">
            « Nos prospects reçoivent une réponse instantanée. Notre taux de conversion a augmenté. Un accompagnement sur mesure de grande qualité. »
          </blockquote>
          <div className="flex items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-lg">
              A
            </div>
            <div className="text-left">
              <p className="text-white font-semibold">Amadou K.</p>
              <p className="text-gray-500 text-sm">Entrepreneur, Dakar</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="landing-cta py-20 md:py-28 bg-space-800 border-y border-space-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
            Prêt à répondre à vos clients 24h/24 ?
          </h2>
          <p className="text-gray-400 mb-10 text-lg">
            Rejoignez les entrepreneurs qui font grandir leur activité avec SEVEN T.
          </p>
          <Link
            to="/register"
            className="btn-primary inline-flex items-center justify-center gap-2 text-lg px-10 py-4 rounded-xl font-semibold shadow-xl shadow-gold-400/25 hover:scale-[1.02] transition-all"
          >
            Commencer gratuitement
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-space-900 border-t border-space-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <Logo />
              <p className="mt-4 text-gray-500 text-sm max-w-md">
                La plateforme pour automatiser vos conversations WhatsApp et répondre à vos clients 24h/24.
              </p>
            </div>
            <div>
              <h4 className="text-gray-100 font-semibold mb-4">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#pourquoi" className="text-gray-500 hover:text-gray-300 transition-colors">Pourquoi nous</a></li>
                <li><a href="#metiers" className="text-gray-500 hover:text-gray-300 transition-colors">Solutions</a></li>
                <li><a href="#pricing" className="text-gray-500 hover:text-gray-300 transition-colors">Tarifs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-100 font-semibold mb-4">Légal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/legal?tab=terms" className="text-gray-500 hover:text-gray-300 transition-colors">Conditions d'utilisation</Link></li>
                <li><Link to="/legal?tab=privacy" className="text-gray-500 hover:text-gray-300 transition-colors">Politique de confidentialité</Link></li>
                <li><Link to="/legal?tab=dpa" className="text-gray-500 hover:text-gray-300 transition-colors">Accord de traitement des données (DPA)</Link></li>
                <li><Link to="/legal?tab=rgpd" className="text-gray-500 hover:text-gray-300 transition-colors">Conformité RGPD</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-space-700 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} SEVEN T. Tous droits réservés.
            </p>
            <div className="flex items-center gap-2">
              <Logo className="h-6 opacity-90" />
              <span className="text-gray-500 text-sm">SEVEN T</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
