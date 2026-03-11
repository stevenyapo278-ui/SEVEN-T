import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOnboardingTour } from './OnboardingTour'
import { 
  CheckCircle, 
  Circle, 
  Bot, 
  MessageSquare, 
  Package, 
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Rocket,
  ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'

const CHECKLIST_ITEMS = [
  {
    id: 'create_agent',
    titleKey: 'onboarding.checklistCreateAgent',
    descKey: 'onboarding.checklistCreateAgentDesc',
    icon: Bot,
    href: '/dashboard/agents?create=true',
    tourId: 'agents',
    check: (data) => data.agentsCount > 0
  },
  {
    id: 'connect_whatsapp',
    titleKey: 'onboarding.checklistWhatsApp',
    descKey: 'onboarding.checklistWhatsAppDesc',
    icon: MessageSquare,
    href: '/dashboard/tools',
    tourId: 'whatsapp_connect',
    check: (data) => data.whatsappConnected > 0
  },
  {
    id: 'add_product',
    titleKey: 'onboarding.checklistAddProduct',
    descKey: 'onboarding.checklistAddProductDesc',
    icon: Package,
    href: '/dashboard/products?create=true',
    tourId: 'products',
    check: (data) => data.productsCount > 0,
    optional: true
  },
  {
    id: 'add_knowledge',
    titleKey: 'onboarding.checklistAddKnowledge',
    descKey: 'onboarding.checklistAddKnowledgeDesc',
    icon: BookOpen,
    href: '/dashboard/knowledge',
    tourId: 'add_knowledge',
    check: (data) => data.knowledgeCount > 0,
    optional: true
  },
  {
    id: 'test_agent',
    titleKey: 'onboarding.checklistTestAgent',
    descKey: 'onboarding.checklistTestAgentDesc',
    icon: Sparkles,
    href: '/dashboard/conversations',
    tourId: 'conversations',
    check: (data) => data.messagesCount > 0
  }
]

export default function OnboardingChecklist({ data, onDismiss }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { startGuidedTask } = useOnboardingTour()
  const [isExpanded, setIsExpanded] = useState(true)

  const handleItemClick = (e, item) => {
    e.preventDefault()
    if (item.tourId) {
      startGuidedTask(item.id, item.tourId)
    }
    navigate(item.href)
  }
  const [dismissed, setDismissed] = useState(false)
  const prevCompletedRef = useRef([])

  // Check localStorage for dismissed state
  useEffect(() => {
    const isDismissed = localStorage.getItem('onboarding_checklist_dismissed')
    if (isDismissed === 'true') {
      setDismissed(true)
    }
  }, [])

  // Confetti effect when a new item is completed
  useEffect(() => {
    if (!data) return

    const currentCompleted = CHECKLIST_ITEMS.filter(item => item.check(data)).map(i => i.id)
    const newlyCompleted = currentCompleted.filter(id => !prevCompletedRef.current.includes(id))

    if (newlyCompleted.length > 0 && prevCompletedRef.current.length > 0) {
      // Trigger confetti
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F5D47A', '#8B5CF6', '#3B82F6']
      })
    }
    
    prevCompletedRef.current = currentCompleted
  }, [data])

  if (!data || dismissed) return null

  const requiredItems = CHECKLIST_ITEMS.filter(item => !item.optional)
  const totalItems = CHECKLIST_ITEMS.length
  const completedItems = CHECKLIST_ITEMS.filter(item => item.check(data))
  const completedCount = completedItems.length
  const requiredCompletedCount = requiredItems.filter(item => item.check(data)).length
  const allRequiredDone = requiredCompletedCount === requiredItems.length
  const progress = Math.round((completedCount / totalItems) * 100)
  
  // SVG circle calculation
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  if (allRequiredDone && completedCount === totalItems) {
    return null
  }

  const handleDismiss = () => {
    localStorage.setItem('onboarding_checklist_dismissed', 'true')
    setDismissed(true)
    if (onDismiss) onDismiss()
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden mb-8 rounded-[2rem] border transition-all duration-500 shadow-2xl ${
        progress >= 100 ? 'border-emerald-500/30' : 'border-gold-400/20'
      }`}
    >
      {/* Background Glow */}
      <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] rounded-full -mr-32 -mt-32 transition-colors duration-1000 ${
        progress >= 100 ? 'bg-emerald-500/10' : 'bg-gold-400/10'
      }`} />

      {/* Header */}
      <div 
        className="relative z-10 p-6 sm:p-8 cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg ${
               progress >= 100 ? 'bg-emerald-500 text-white' : 'bg-gradient-to-br from-gold-400 to-amber-600 text-black'
            }`}>
              {progress >= 100 ? <CheckCircle className="w-7 h-7" /> : <Rocket className="w-7 h-7" />}
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-syne font-black text-white italic tracking-tight">
                {progress >= 100 ? 'C\'est presque prêt ! 🎊' : t('onboarding.checklistTitle')}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                 <div className="flex -space-x-2">
                    {CHECKLIST_ITEMS.map((item, i) => (
                      <div 
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full border-2 border-[#0B0F1A] ${
                          item.check(data) ? 'bg-emerald-400' : 'bg-white/10'
                        }`}
                      />
                    ))}
                 </div>
                 <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                    {completedCount} / {totalItems} complétés
                 </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden sm:block">
               <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-white/5"
                  />
                  <motion.circle
                    cx="28"
                    cy="28"
                    r={radius}
                    stroke="url(#onboarding-gradient)"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="onboarding-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#F5D47A" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-100">
                  {progress}%
                </span>
              </div>
            </div>
            <div className="p-2 bg-white/5 rounded-full group-hover:bg-white/10 transition-colors">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Checklist Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative z-10 px-6 sm:px-8 pb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CHECKLIST_ITEMS.map((item, index) => {
                const isComplete = item.check(data)
                const ItemIcon = item.icon
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <button
                      onClick={(e) => handleItemClick(e, item)}
                      className={`flex flex-col h-full w-full text-left gap-4 p-5 rounded-[1.5rem] transition-all relative overflow-hidden group ${
                        isComplete 
                          ? 'bg-emerald-500/5 border border-emerald-500/10' 
                          : 'bg-white/5 border border-white/10 hover:border-gold-400/50 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="flex items-center justify-between pointer-events-none">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                          isComplete 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-white/5 text-gray-500 group-hover:text-gold-400'
                        }`}>
                          <ItemIcon className="w-6 h-6" />
                        </div>
                        {isComplete ? (
                          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 rounded-lg">
                             <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                             <span className="text-[10px] font-black text-emerald-400 uppercase">Fait</span>
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-white/10 flex items-center justify-center group-hover:border-gold-400/50 transition-colors">
                             <ArrowRight className="w-3 h-3 text-gray-600 group-hover:text-gold-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="pointer-events-none relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-syne font-bold text-lg tracking-tight ${
                            isComplete ? 'text-emerald-400' : 'text-gray-100'
                          }`}>
                            {t(item.titleKey)}
                          </h4>
                          {item.optional && (
                            <span className="px-1.5 py-0.5 text-[10px] font-black uppercase bg-white/5 text-gray-500 rounded">
                              Optionnel
                            </span>
                          )}
                        </div>
                        <p className={`text-sm leading-snug ${isComplete ? 'text-emerald-400/60' : 'text-gray-500'}`}>
                          {t(item.descKey)}
                        </p>
                      </div>

                      {/* Hover decoration */}
                      {!isComplete && (
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Sparkles className="w-4 h-4 text-gold-400/30" />
                        </div>
                      )}
                    </button>
                  </motion.div>
                )
              })}
            </div>

            {/* Completion reward / Footer */}
            {completedCount >= 3 && (
              <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gold-400 animate-pulse" />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                       {progress}% du chemin parcouru. Vous y êtes presque !
                    </p>
                 </div>
                 <button
                    onClick={handleDismiss}
                    className="text-xs font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors py-2"
                  >
                    Masquer ce guide définitivement
                  </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
