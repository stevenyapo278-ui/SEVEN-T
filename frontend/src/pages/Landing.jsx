import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  MessageSquare, 
  Clock, 
  Users, 
  ArrowRight,
  Check,
  Sparkles,
  Zap,
  TrendingUp,
  Bot,
  BarChart3,
  Globe,
  Play,
  Star,
  ChevronRight,
  Loader2,
  CreditCard
} from 'lucide-react'
import api from '../services/api'

const features = [
  {
    icon: Clock,
    title: 'Réponse en 10 secondes',
    description: 'Ne laissez plus vos prospects en attente. Notre IA répond instantanément, 24h/24 et 7j/7.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Users,
    title: 'Qualifie vos leads',
    description: 'Automatisez la qualification de vos leads et la prise de rendez-vous directement via WhatsApp.',
    color: 'from-violet-500 to-purple-500'
  },
  {
    icon: MessageSquare,
    title: 'Milliers de conversations',
    description: 'Gérez plusieurs conversations simultanément sans jamais compromettre la qualité du service.',
    color: 'from-gold-400 to-amber-500'
  },
  {
    icon: TrendingUp,
    title: 'Augmente vos conversions',
    description: 'Transformez plus de prospects en clients grâce à des réponses instantanées et personnalisées.',
    color: 'from-emerald-500 to-green-500'
  }
]

const steps = [
  { 
    title: 'Créez votre chatbot', 
    description: 'Créez votre assistant en quelques clics avec notre interface intuitive.',
    icon: Bot
  },
  { 
    title: 'Personnalisez sa mission', 
    description: 'Définissez les objectifs : prise de RDV, qualification de leads, support...',
    icon: Sparkles
  },
  { 
    title: 'Testez votre assistant', 
    description: 'Essayez votre assistant dans notre playground et affinez ses réponses.',
    icon: Play
  },
  { 
    title: 'Connectez WhatsApp', 
    description: 'Scannez le QR code et votre assistant est prêt 24/7.',
    icon: Globe
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
    if (limits?.agents) list.push(`${limits.agents === -1 ? 'Illimité' : limits.agents} agent${limits.agents > 1 ? 's' : ''} IA`)
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
      <header className="border-b border-space-700/50 sticky top-0 z-50 bg-space-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center focus:outline-none focus:ring-2 focus:ring-violet-500/50 rounded-lg">
              <Logo />
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-400 hover:text-gray-100 transition-colors text-sm font-medium">
                Fonctionnalités
              </a>
              <a href="#how-it-works" className="text-gray-400 hover:text-gray-100 transition-colors text-sm font-medium">
                Comment ça marche
              </a>
              <a href="#pricing" className="text-gray-400 hover:text-gray-100 transition-colors text-sm font-medium">
                Tarifs
              </a>
            </nav>
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-gray-400 hover:text-gray-100 transition-colors text-sm font-medium">
                Connexion
              </Link>
              <Link
                to="/register"
                className="btn-primary text-sm px-4 py-2"
              >
                Commencer
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-16 sm:pt-24 pb-28 sm:pb-36 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-violet-500/20 via-violet-500/5 to-transparent rounded-full blur-3xl animate-glow-pulse"></div>
          <div className="absolute top-1/3 left-0 w-96 h-96 bg-gold-400/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NCAwLTE4IDguMDYtMTggMThzOC4wNiAxOCAxOCAxOCAxOC04LjA2IDE4LTE4LTguMDYtMTgtMTgtMTh6bTAgMmMtOC44NCAwLTE2IDcuMTYtMTYgMTZzNy4xNiAxNiAxNiAxNiAxNi03LjE2IDE2LTE2LTcuMTYtMTYtMTYtMTZ6IiBzdHJva2U9IiMyYTJhMzgiIHN0cm9rZS13aWR0aD0iMC41Ii8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Logo centré et bien visible */}
          <div className="flex justify-center w-full mb-8 sm:mb-10">
            <Link to="/" className="focus:outline-none focus:ring-2 focus:ring-violet-500/50 rounded-lg transition-transform hover:scale-105 duration-300 inline-block animate-slide-up">
              <Logo size="large" centered />
            </Link>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-6 sm:mb-8 backdrop-blur-sm animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <Sparkles className="w-4 h-4" />
            Propulsé par l'Intelligence Artificielle
            <ChevronRight className="w-4 h-4" />
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-gray-100 mb-5 sm:mb-6 leading-tight animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Automatisez vos conversations{' '}
            <br className="hidden md:block" />
            <span className="text-gradient">WhatsApp avec l'IA</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.3s' }}>
            Des assistants IA qui répondent à vos clients 24h/24, qualifient vos leads et transforment vos prospects en clients. Sans code, en quelques minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <Link
              to="/register"
              className="btn-primary inline-flex items-center justify-center gap-2 text-lg px-8 py-4 shadow-xl shadow-gold-400/20 hover:shadow-glow-gold transition-shadow duration-300"
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#how-it-works"
              className="btn-secondary inline-flex items-center justify-center gap-2 text-lg px-8 py-4"
            >
              <Play className="w-5 h-5" />
              Voir comment ça marche
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.5s' }}>
            {stats.map((stat, index) => (
              <div key={index} className="p-4 rounded-xl bg-space-900/50 border border-space-700/50 backdrop-blur-sm hover:border-violet-500/30 transition-colors duration-300">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <stat.icon className="w-4 h-4 text-gold-400" />
                  <span className="text-2xl font-display font-bold text-gray-100">{stat.value}</span>
                </div>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 relative scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              Fonctionnalités
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-gray-100 mb-4">
              Tout ce qu'il vous faut pour{' '}
              <span className="text-gradient">réussir</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Une plateforme complète pour automatiser vos conversations, fidéliser vos clients et faire grandir votre activité.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative p-6 rounded-2xl bg-space-900 border border-space-700 hover:border-transparent transition-all duration-300 overflow-hidden hover:shadow-xl hover:shadow-violet-500/5"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display font-semibold text-lg text-gray-100 mb-2 relative z-10">{feature.title}</h3>
                <p className="text-gray-400 text-sm relative z-10">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-gradient-to-b from-space-900 to-space-950 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-sm font-medium mb-4">
              <BarChart3 className="w-4 h-4" />
              Comment ça marche
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-gray-100 mb-4">
              4 étapes pour{' '}
              <span className="text-gradient">automatiser</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Créez et déployez votre assistant IA en moins de 5 minutes, sans compétence technique.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connection line */}
            <div className="hidden lg:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-gold-400/50 via-violet-500/50 to-gold-400/50"></div>

            {steps.map((step, index) => (
              <div key={index} className="relative group">
                <div className="p-6 rounded-2xl bg-space-800/50 border border-space-700 h-full hover:border-violet-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5">
                  {/* Step number */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-400 to-violet-500 flex items-center justify-center text-space-950 font-bold text-lg mb-4 shadow-lg shadow-violet-500/20 relative z-10 group-hover:scale-110 transition-transform duration-300">
                    {index + 1}
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-space-700/50 flex items-center justify-center mb-3">
                    <step.icon className="w-5 h-5 text-violet-400" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-gray-100 mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-400/10 text-gold-400 text-sm font-medium mb-4">
              <CreditCard className="w-4 h-4" />
              Tarification
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-gray-100 mb-4">
              Des plans adaptés à{' '}
              <span className="text-gradient">vos besoins</span>
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

      {/* Testimonial / Social Proof */}
      <section className="py-24 bg-space-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <p className="text-sm font-medium text-violet-400 mb-2">Ils nous font confiance</p>
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-gold-400 fill-current" />
              ))}
            </div>
            <blockquote className="text-xl sm:text-2xl md:text-3xl font-display text-gray-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              "SEVEN T a transformé notre service client. Nos prospects reçoivent une réponse instantanée et notre taux de conversion a augmenté de 40%."
            </blockquote>
            <div className="inline-flex items-center gap-4 p-4 rounded-2xl bg-space-800/60 border border-space-700 hover:border-violet-500/20 transition-colors duration-300">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-gold-400 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                A
              </div>
              <div className="text-left">
                <p className="text-gray-100 font-medium">Amadou K.</p>
                <p className="text-gray-500 text-sm">Entrepreneur, Dakar</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden border-y border-space-800">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-space-950 to-gold-400/20"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-violet-500/30 to-transparent rounded-full blur-3xl animate-glow-pulse"></div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-gray-100 mb-6">
            Prêt à automatiser vos{' '}
            <span className="text-gradient">conversations</span> ?
          </h2>
          <p className="text-gray-400 mb-8 text-lg max-w-2xl mx-auto">
            Rejoignez les entrepreneurs qui utilisent SEVEN T pour répondre à leurs clients 24h/24 et augmenter leurs ventes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="btn-primary inline-flex items-center justify-center gap-2 text-lg px-8 py-4 shadow-xl shadow-gold-400/20 hover:shadow-glow-gold hover:scale-[1.02] transition-all duration-300"
            >
              Créer mon assistant gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            Sans carte bancaire · Configuration en 5 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-space-900 border-t border-space-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <Logo />
              <p className="mt-4 text-gray-500 text-sm max-w-md">
                La plateforme tout-en-un pour automatiser vos conversations WhatsApp avec l'intelligence artificielle.
              </p>
            </div>
            <div>
              <h4 className="text-gray-100 font-semibold mb-4">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="text-gray-500 hover:text-gray-300 transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="text-gray-500 hover:text-gray-300 transition-colors">Tarifs</a></li>
                <li><a href="#how-it-works" className="text-gray-500 hover:text-gray-300 transition-colors">Comment ça marche</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-100 font-semibold mb-4">Légal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/legal?tab=terms" className="text-gray-500 hover:text-gray-300 transition-colors">CGU</Link></li>
                <li><Link to="/legal?tab=privacy" className="text-gray-500 hover:text-gray-300 transition-colors">Confidentialité</Link></li>
                <li><Link to="/legal?tab=cookies" className="text-gray-500 hover:text-gray-300 transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-space-700 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} SEVEN T. Tous droits réservés.
            </p>
            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-sm">Propulsé par</span>
              <Logo className="h-6 opacity-90" />
              <span className="text-gray-400 text-sm font-medium">IA Générative</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
