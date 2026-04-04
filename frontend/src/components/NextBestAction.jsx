import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bot, MessageSquare, Sparkles, ArrowRight, Zap } from 'lucide-react'

export default function NextBestAction({ data }) {
  const action = useMemo(() => {
    if (!data) return null

    if (data.agentsCount === 0) {
      return {
        title: 'Créer votre premier agent',
        description: 'Construisez une IA sur-mesure pour votre entreprise en quelques clics.',
        icon: Bot,
        color: 'blue',
        href: '/dashboard/agents?create=true',
        cta: 'Créer un agent',
      }
    }

    if (data.whatsappConnected === 0) {
      return {
        title: 'Connecter WhatsApp',
        description: 'Liez votre numéro pour permettre à votre agent de répondre à vos clients.',
        icon: MessageSquare,
        color: 'emerald',
        href: '/dashboard/tools',
        cta: 'Connecter',
      }
    }

    if (data.messagesCount === 0) {
      return {
        title: 'Tester votre agent',
        description: 'Envoyez un premier message depuis WhatsApp pour voir la magie opérer.',
        icon: Sparkles,
        color: 'gold',
        href: '/dashboard/conversations',
        cta: 'Voir les conversations',
      }
    }

    // No action needed – everything is set up
    return null
  }, [data])

  if (!action) return null

  const colorMap = {
    blue:    { bg: 'bg-blue-400/10',    text: 'text-blue-400',    border: 'border-blue-500/20' },
    emerald: { bg: 'bg-emerald-400/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    gold:    { bg: 'bg-gold-400/10',    text: 'text-gold-400',    border: 'border-gold-400/20' },
  }
  const c = colorMap[action.color] || colorMap.blue
  const Icon = action.icon

  return (
    <div className={`card overflow-hidden border transition-all hover:scale-[1.005] bg-gradient-to-br from-space-800 to-space-900 ${c.border} mb-6`}>
      <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className={`p-3 rounded-2xl flex-shrink-0 ${c.bg} ${c.text}`}>
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-3.5 h-3.5 text-gold-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gold-400">Prochaine étape</span>
            </div>
            <h3 className="text-lg font-display font-semibold text-gray-100">{action.title}</h3>
            <p className="text-sm text-gray-400 mt-0.5">{action.description}</p>
          </div>
        </div>
        <Link
          to={action.href}
          className={`flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${c.bg} ${c.text} hover:brightness-110`}
        >
          {action.cta}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
