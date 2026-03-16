import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bot, MessageSquare, Package, BookOpen, Sparkles, ArrowRight, Zap } from 'lucide-react'

export default function NextBestAction({ data }) {
  const nextAction = useMemo(() => {
    if (!data) return null
    if (data.agentsCount === 0) {
      return {
        title: 'Créer votre premier agent',
        description: 'Construisez une IA sur-mesure pour votre entreprise en quelques clics.',
        icon: Bot,
        color: 'text-blue-400',
        bg: 'bg-blue-400/10',
        border: 'border-blue-400/30',
        href: '/dashboard/agents?create=true',
        cta: 'Créer un agent'
      }
    }
    if (data.whatsappConnected === 0) {
      return {
        title: 'Connecter WhatsApp',
        description: 'Liez votre numéro pour permettre à votre agent de répondre à vos clients.',
        icon: MessageSquare,
        color: 'text-emerald-400',
        bg: 'bg-emerald-400/10',
        border: 'border-emerald-400/30',
        href: '/dashboard/tools',
        cta: 'Connecter'
      }
    }
    if (data.messagesCount === 0) {
      return {
        title: 'Tester votre agent',
        description: 'Envoyez un premier message depuis WhatsApp pour voir la magie opérer.',
        icon: Sparkles,
        color: 'text-gold-400',
        bg: 'bg-gold-400/10',
        border: 'border-gold-400/30',
        href: '/dashboard/conversations',
        cta: 'Voir l\'inbox'
      }
    }
    return null
  }, [data])

  if (!nextAction) return null

  return (
    <div className={`card overflow-hidden border transition-all hover:scale-[1.01] bg-gradient-to-br from-space-800 to-space-900 ${nextAction.border}`}>
      <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className={`p-3 rounded-2xl flex-shrink-0 ${nextAction.bg} ${nextAction.color}`}>
            <nextAction.icon className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-gold-400 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-widest text-gold-400">Prochaine étape</p>
            </div>
            <h3 className="text-xl font-display font-semibold text-gray-100">{nextAction.title}</h3>
            <p className="text-sm text-gray-400 mt-1">{nextAction.description}</p>
          </div>
        </div>
        <Link 
          to={nextAction.href}
          className={`flex-shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${nextAction.bg} ${nextAction.color} hover:brightness-110`}
        >
          {nextAction.cta}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
