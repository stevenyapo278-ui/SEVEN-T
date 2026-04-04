import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOnboardingTour } from './OnboardingTour'
import {
  CheckCircle, Bot, MessageSquare, Package, BookOpen,
  Sparkles, ChevronDown, ChevronUp, Rocket, ArrowRight, X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'

// ─── Checklist items ──────────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  {
    id: 'create_agent',
    titleKey: 'onboarding.checklistCreateAgent',
    descKey: 'onboarding.checklistCreateAgentDesc',
    icon: Bot,
    href: '/dashboard/agents?create=true',
    tourId: 'agents',
    color: 'blue',
    check: (d) => d.agentsCount > 0,
  },
  {
    id: 'connect_whatsapp',
    titleKey: 'onboarding.checklistWhatsApp',
    descKey: 'onboarding.checklistWhatsAppDesc',
    icon: MessageSquare,
    href: '/dashboard/tools',
    tourId: 'whatsapp_connect',
    color: 'emerald',
    check: (d) => d.whatsappConnected > 0,
  },
  {
    id: 'add_product',
    titleKey: 'onboarding.checklistAddProduct',
    descKey: 'onboarding.checklistAddProductDesc',
    icon: Package,
    href: '/dashboard/products?create=true',
    tourId: 'products',
    color: 'amber',
    check: (d) => d.productsCount > 0,
    optional: true,
  },
  {
    id: 'add_knowledge',
    titleKey: 'onboarding.checklistAddKnowledge',
    descKey: 'onboarding.checklistAddKnowledgeDesc',
    icon: BookOpen,
    href: '/dashboard/knowledge',
    tourId: 'add_knowledge',
    color: 'purple',
    check: (d) => d.knowledgeCount > 0,
    optional: true,
  },
  {
    id: 'test_agent',
    titleKey: 'onboarding.checklistTestAgent',
    descKey: 'onboarding.checklistTestAgentDesc',
    icon: Sparkles,
    href: '/dashboard/conversations',
    tourId: 'conversations',
    color: 'gold',
    check: (d) => d.messagesCount > 0,
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingChecklist({ data, onDismiss }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { startGuidedTask } = useOnboardingTour()
  const [isExpanded, setIsExpanded] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const prevCompletedRef = useRef([])

  // Persistence
  useEffect(() => {
    if (localStorage.getItem('onboarding_checklist_dismissed') === 'true') {
      setDismissed(true)
    }
  }, [])

  // Confetti on new completion
  useEffect(() => {
    if (!data) return
    const completed = CHECKLIST_ITEMS.filter(i => i.check(data)).map(i => i.id)
    const newlyDone = completed.filter(id => !prevCompletedRef.current.includes(id))
    if (newlyDone.length > 0 && prevCompletedRef.current.length > 0) {
      confetti({ particleCount: 120, spread: 60, origin: { y: 0.6 }, colors: ['#F5D47A', '#8B5CF6', '#3B82F6'] })
    }
    prevCompletedRef.current = completed
  }, [data])

  if (!data || dismissed) return null

  const completedCount = CHECKLIST_ITEMS.filter(i => i.check(data)).length
  const total = CHECKLIST_ITEMS.length
  const progress = Math.round((completedCount / total) * 100)

  // Hide once everything is done
  if (completedCount === total) return null

  const handleItemClick = (e, item) => {
    e.preventDefault()
    if (item.tourId) startGuidedTask(item.id, item.tourId)
    navigate(item.href)
  }

  const handleDismiss = () => {
    localStorage.setItem('onboarding_checklist_dismissed', 'true')
    setDismissed(true)
    onDismiss?.()
  }

  // Find the first uncompleted required item
  const nextItem = CHECKLIST_ITEMS.find(i => !i.optional && !i.check(data)) || CHECKLIST_ITEMS.find(i => !i.check(data))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden mb-6 rounded-2xl border border-gold-400/20 bg-gradient-to-br from-space-800/80 to-space-900"
    >
      {/* Header */}
      <div
        className="relative z-10 p-5 cursor-pointer group flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
            progress >= 100
              ? 'bg-emerald-500 text-white'
              : 'bg-gradient-to-br from-gold-400 to-amber-600 text-black'
          }`}>
            {progress >= 100 ? <CheckCircle className="w-5 h-5" /> : <Rocket className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-syne font-black text-white italic tracking-tight truncate">
              {t('onboarding.checklistTitle')}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              {/* Mini progress bar */}
              <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gold-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <span className="text-[11px] font-bold text-gray-500">{completedCount}/{total}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss() }}
            className="p-1.5 text-gray-600 hover:text-gray-300 transition-colors rounded-lg hover:bg-white/5"
            title="Masquer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="p-1.5 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors">
            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
      </div>

      {/* Items */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-2">
              {CHECKLIST_ITEMS.map((item, idx) => {
                const done = item.check(data)
                const isNext = item === nextItem
                const Icon = item.icon
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={(e) => handleItemClick(e, item)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      done
                        ? 'bg-emerald-500/5 border border-emerald-500/10'
                        : isNext
                          ? 'bg-gold-400/5 border border-gold-400/20 hover:border-gold-400/40'
                          : 'bg-white/[0.02] border border-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* Status indicator */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      done
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isNext
                          ? `bg-${item.color}-500/20 text-${item.color}-400`
                          : 'bg-white/5 text-gray-600'
                    }`}>
                      {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium truncate ${done ? 'text-emerald-400 line-through opacity-70' : 'text-gray-200'}`}>
                          {t(item.titleKey)}
                        </span>
                        {item.optional && !done && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-white/5 text-gray-500 rounded flex-shrink-0">
                            Optionnel
                          </span>
                        )}
                      </div>
                      {!done && (
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">{t(item.descKey)}</p>
                      )}
                    </div>

                    {/* Arrow */}
                    {!done && (
                      <ArrowRight className={`w-4 h-4 flex-shrink-0 ${isNext ? 'text-gold-400' : 'text-gray-600'}`} />
                    )}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
