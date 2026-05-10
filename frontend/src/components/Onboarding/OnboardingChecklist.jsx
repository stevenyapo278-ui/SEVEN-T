import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOnboardingTour } from './OnboardingTour'
import { useTheme } from '../../contexts/ThemeContext'
import {
  CheckCircle, Bot, MessageSquare, Package, BookOpen,
  Sparkles, ChevronDown, ChevronUp, Rocket, ArrowRight, X
} from 'lucide-react'
import { motion, AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
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
  const { isDark } = useTheme()
  const { startGuidedTask } = useOnboardingTour()
  const [isExpanded, setIsExpanded] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const prevCompletedRef = useRef([])

  // Calculate completed items in one pass
  const completedIds = useMemo(() => {
    if (!data) return []
    return CHECKLIST_ITEMS.reduce((acc, item) => {
      if (item.check(data)) acc.push(item.id)
      return acc
    }, [])
  }, [data])

  const completedCount = completedIds.length
  const total = CHECKLIST_ITEMS.length
  const progress = Math.round((completedCount / total) * 100)

  // Persistence
  useEffect(() => {
    if (localStorage.getItem('onboarding_checklist_dismissed') === 'true') {
      setDismissed(true)
    }
  }, [])

  // Confetti on new completion
  useEffect(() => {
    if (!data) return
    const newlyDone = completedIds.filter(id => !prevCompletedRef.current.includes(id))
    if (newlyDone.length > 0 && prevCompletedRef.current.length > 0) {
      confetti({ particleCount: 120, spread: 60, origin: { y: 0.6 }, colors: ['#F5D47A', '#8B5CF6', '#3B82F6'] })
    }
    prevCompletedRef.current = completedIds
  }, [data, completedIds])

  if (!data || dismissed) return null

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
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden mb-6 rounded-2xl border ${
          isDark 
            ? 'border-gold-400/20 bg-gradient-to-br from-space-800/80 to-space-900' 
            : 'border-zinc-200 bg-white shadow-sm'
        }`}
      >
        {/* Header */}
        <div
          className={`relative z-10 p-5 cursor-pointer group flex items-center justify-between ${
            !isDark && 'hover:bg-zinc-50 transition-colors'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsExpanded(!isExpanded) }}
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className={`size-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
              progress >= 100
                ? 'bg-emerald-500 text-white'
                : 'bg-gradient-to-br from-gold-400 to-amber-600 text-black'
            }`}>
              {progress >= 100 ? <CheckCircle className="size-5" /> : <Rocket className="size-5" />}
            </div>
            <div className="min-w-0">
              <h3 className={`text-base font-syne font-black italic tracking-tight truncate ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}>
                {t('onboarding.checklistTitle')}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                {/* Mini progress bar */}
                <div className={`w-24 h-1.5 rounded-full overflow-hidden ${
                  isDark ? 'bg-white/10' : 'bg-zinc-100'
                }`}>
                  <m.div
                    className="h-full bg-gold-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <span className={`text-[11px] font-bold ${
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                }`}>{completedCount}/{total}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleDismiss() }}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark 
                  ? 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5' 
                  : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
              }`}
              title="Masquer"
              aria-label="Masquer la checklist"
            >
              <X className="size-4" />
            </button>
            <div className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'bg-white/5 group-hover:bg-white/10' : 'bg-zinc-100 group-hover:bg-zinc-200'
            }`}>
              {isExpanded ? (
                <ChevronUp className={`size-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
              ) : (
                <ChevronDown className={`size-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        <AnimatePresence>
          {isExpanded && (
            <m.div
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
                  
                  const iconColors = {
                    blue: { dark: 'bg-blue-500/20 text-blue-400', light: 'bg-blue-50 text-blue-600' },
                    emerald: { dark: 'bg-emerald-500/20 text-emerald-400', light: 'bg-emerald-50 text-emerald-600' },
                    amber: { dark: 'bg-amber-500/20 text-amber-400', light: 'bg-amber-50 text-amber-600' },
                    purple: { dark: 'bg-purple-500/20 text-purple-400', light: 'bg-purple-50 text-purple-600' },
                    gold: { dark: 'bg-gold-500/20 text-gold-400', light: 'bg-gold-50 text-gold-600' },
                  }
                  const colors = iconColors[item.color] || iconColors.blue

                  return (
                    <m.button
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      onClick={(e) => handleItemClick(e, item)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                        done
                          ? isDark 
                            ? 'bg-emerald-500/5 border border-emerald-500/10' 
                            : 'bg-emerald-50/30 border border-emerald-500/10'
                          : isNext
                            ? isDark
                              ? 'bg-gold-400/5 border border-gold-400/20 hover:border-gold-400/40'
                              : 'bg-gold-50/50 border border-gold-200 hover:bg-gold-50'
                            : isDark
                              ? 'bg-white/[0.02] border border-white/5 hover:border-white/10'
                              : 'bg-zinc-50 border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-100/50'
                      }`}
                    >
                      <div className={`size-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        done
                          ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                          : isNext
                            ? isDark ? colors.dark : colors.light
                            : isDark ? 'bg-white/5 text-zinc-600' : 'bg-zinc-200/50 text-zinc-400'
                      }`}>
                        {done ? <CheckCircle className="size-4" /> : <Icon className="size-4" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium truncate ${
                            done 
                              ? isDark ? 'text-emerald-400 line-through opacity-70' : 'text-emerald-600/60 line-through' 
                              : isDark ? 'text-zinc-200' : 'text-zinc-800'
                          }`}>
                            {t(item.titleKey)}
                          </span>
                          {item.optional && !done && (
                            <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase rounded flex-shrink-0 ${
                              isDark ? 'bg-white/5 text-zinc-500' : 'bg-zinc-100 text-zinc-400'
                            }`}>
                              {t('onboarding.optional')}
                            </span>
                          )}
                        </div>
                        {!done && (
                          <p className={`text-[11px] truncate mt-0.5 ${
                            isDark ? 'text-zinc-500' : 'text-zinc-500'
                          }`}>{t(item.descKey)}</p>
                        )}
                      </div>

                      {!done && (
                        <ArrowRight className={`size-4 flex-shrink-0 ${
                          isNext 
                            ? isDark ? 'text-gold-400' : 'text-gold-600' 
                            : isDark ? 'text-zinc-600' : 'text-zinc-300'
                        }`} />
                      )}
                    </m.button>
                  )
                })}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </m.div>
    </LazyMotion>
  )
}
