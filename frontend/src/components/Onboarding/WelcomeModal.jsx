import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../contexts/ThemeContext'
import { 
  Sparkles, Bot, MessageSquare, Package, CheckCircle,
  ChevronRight, Clock, Users, ShieldCheck, Megaphone, X
} from 'lucide-react'

const MotionDiv = motion.div

// ─── Step definitions ─────────────────────────────────────────────────────────

const AGENT_TEMPLATES = [
  { id: 'commercial', icon: Users,          label: 'CRM & Prospection',   sub: 'Qualifiez vos leads et relancez automatiquement vos prospects.',   color: 'blue' },
  { id: 'ecommerce',  icon: Package,        label: 'Vente & Catalogue',   sub: 'Gérez votre catalogue, stocks et commandes en direct.',            color: 'amber' },
  { id: 'support',    icon: MessageSquare,   label: 'Support Client',      sub: 'Aidez vos clients 24 h/24 et gérez votre SAV avec l\'IA.',         color: 'emerald' },
]

function buildSteps(t, isDark) {
  return [
    // ─ Étape 1 : Bienvenue
    {
      id: 'welcome',
      title: 'Bienvenue sur SEVEN-T 🚀',
      description: 'Automatisez votre business WhatsApp grâce à l\'IA.',
      icon: Sparkles,
      content: (
        <div className="space-y-6">
          <p className={`${isDark ? 'text-zinc-400' : 'text-zinc-500'} text-center text-base leading-relaxed`}>
            Dites adieu aux réponses manuelles. SEVEN-T propulse votre business avec une IA 
            qui gère vos <strong className={isDark ? 'text-white' : 'text-zinc-900'}>Ventes</strong>, vos <strong className={isDark ? 'text-white' : 'text-zinc-900'}>Statuts</strong> et 
            votre <strong className={isDark ? 'text-white' : 'text-zinc-900'}>SAV</strong> 24 h/24.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: ShieldCheck, title: '100 % Autonome',  sub: 'Qualification & Ventes', color: 'blue' },
              { icon: Megaphone,   title: 'Statuts ROI',     sub: 'Visibilité automatisée', color: 'amber' },
              { icon: Clock,       title: '24 h / 7 j',      sub: 'Toujours disponible',    color: 'emerald' },
            ].map((item) => (
              <div key={item.title} className={`flex items-center gap-3 p-4 rounded-2xl border ${
                isDark ? 'bg-white/[0.04] border-white/10' : 'bg-zinc-50 border-zinc-100 shadow-sm'
              }`}>
                <div className={`w-10 h-10 rounded-xl bg-${item.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                  <item.icon className={`w-5 h-5 text-${item.color}-400`} />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>{item.title}</h4>
                  <p className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },

    // ─ Étape 2 : Choisir le template d'agent
    {
      id: 'agent',
      title: 'Quelle sera la mission de votre IA ?',
      description: 'Choisissez un modèle pour démarrer instantanément. Tout est personnalisable par la suite.',
      icon: Bot,
      content: (
        <div className="grid grid-cols-1 gap-3">
          {AGENT_TEMPLATES.map((item) => (
            <MotionDiv
              key={item.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                localStorage.setItem('seven-t-onboarding-template', item.id)
                document.querySelectorAll('[data-template-card]').forEach(el => el.classList.remove('ring-2', 'ring-gold-400'))
                document.querySelector(`[data-template-card="${item.id}"]`)?.classList.add('ring-2', 'ring-gold-400')
              }}
              data-template-card={item.id}
              className={`p-5 rounded-2xl cursor-pointer transition-all flex items-center gap-4 border ${
                isDark 
                  ? 'bg-white/[0.03] border-white/10 hover:border-gold-400/50' 
                  : 'bg-zinc-50 border-zinc-200 hover:border-gold-400/50 shadow-sm'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-${item.color}-500/20`}>
                <item.icon className={`w-6 h-6 text-${item.color}-400`} />
              </div>
              <div className="text-left flex-1 min-w-0">
                <h4 className={`font-syne font-black italic text-lg leading-none mb-1.5 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{item.label}</h4>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{item.sub}</p>
              </div>
              <ChevronRight className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
            </MotionDiv>
          ))}
        </div>
      ),
    },

    // ─ Étape 3 : Prêt
    {
      id: 'ready',
      title: 'Prêt pour le décollage ! ✨',
      description: 'Votre configuration de base est terminée.',
      icon: CheckCircle,
      content: (
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            {[
              { text: 'Réponses 24 h/24, 7 j/7',           icon: Clock,     color: 'emerald' },
              { text: 'Qualification intelligente des leads', icon: Sparkles,  color: 'blue' },
              { text: 'Statuts WhatsApp automatisés',        icon: Megaphone, color: 'amber' },
            ].map((item, i) => (
              <MotionDiv
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 * i }}
                className={`flex items-center gap-4 p-4 rounded-2xl border ${
                  isDark ? 'bg-white/[0.04] border-white/10' : 'bg-zinc-50 border-zinc-100 shadow-sm'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-${item.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                  <item.icon className={`w-5 h-5 text-${item.color}-400`} />
                </div>
                <p className={`font-medium text-sm flex-1 ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>{item.text}</p>
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              </MotionDiv>
            ))}
          </div>
          <p className={`${isDark ? 'text-zinc-500' : 'text-zinc-400'} text-center text-sm italic`}>
            Cliquez sur « Créer mon agent » pour commencer.
          </p>
        </div>
      ),
    },
  ]
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WelcomeModal({ isOpen, onClose, onComplete, data }) {
  useLockBodyScroll(isOpen)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(0)
  const steps = useMemo(() => buildSteps(t, isDark), [t, isDark])

  if (!isOpen) return null

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const StepIcon = step.icon

  const handleNext = () => {
    if (isLastStep) {
      onComplete(true)
      // Redirect based on progress
      if (!data || data.agentsCount === 0) {
        navigate('/dashboard/agents?create=true')
      } else if (data.whatsappConnected === 0) {
        navigate('/dashboard/tools')
      } else {
        navigate('/dashboard')
      }
    } else {
      setDirection(1)
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    setDirection(-1)
    setCurrentStep(prev => prev - 1)
  }

  const handleSkip = () => {
    onComplete()
    onClose()
  }

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir < 0 ? 200 : -200, opacity: 0 }),
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      {/* Backdrop */}
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 backdrop-blur-xl ${isDark ? 'bg-space-950/95' : 'bg-zinc-950/40'}`}
        onClick={handleSkip}
      />

      {/* Modal */}
      <MotionDiv
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className={`relative z-10 w-full max-w-lg max-h-[92dvh] flex flex-col rounded-[2rem] border shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] overflow-hidden ${
          isDark ? 'bg-[#0B0F1A] border-white/10' : 'bg-white border-zinc-200'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-5 border-b ${isDark ? 'border-white/5' : 'border-zinc-100'}`} style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              isDark ? 'bg-gold-400/10 border-gold-400/20' : 'bg-gold-50 border-gold-200'
            }`}>
              <StepIcon className="w-4.5 h-4.5 text-gold-400" />
            </div>
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-white/30' : 'text-zinc-300'}`}>Étape {currentStep + 1} / {steps.length}</span>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className={`p-2 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
              isDark ? 'hover:bg-white/5' : 'hover:bg-zinc-100'
            }`}
          >
            <X className={`w-5 h-5 transition-colors ${isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 overscroll-contain">
          <AnimatePresence mode="wait" custom={direction}>
            <MotionDiv
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <h2 className={`text-2xl font-syne font-black italic leading-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{step.title}</h2>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{step.description}</p>
              </div>
              <div className="pt-2">{step.content}</div>
            </MotionDiv>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={`px-6 py-5 border-t flex items-center justify-between gap-4 ${isDark ? 'border-white/5' : 'border-zinc-100'}`} style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-6 bg-gold-400' : i < currentStep ? 'w-3 bg-gold-400/40' : isDark ? 'w-1.5 bg-white/10' : 'w-1.5 bg-zinc-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button onClick={handleBack} className={`text-sm font-bold transition-colors min-h-[44px] px-3 ${
                isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'
              }`}>
                Précédent
              </button>
            )}
            {!isLastStep && (
              <button onClick={handleSkip} className={`text-sm font-bold transition-colors min-h-[44px] px-3 ${
                isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
              }`}>
                Passer
              </button>
            )}
            <button
              onClick={handleNext}
              className={`group relative flex items-center gap-2 px-5 py-3 rounded-xl font-syne font-bold overflow-hidden transition-all hover:scale-105 active:scale-95 min-h-[44px] ${
                isDark ? 'bg-white text-black' : 'bg-zinc-900 text-white shadow-lg shadow-zinc-200'
              }`}
            >
              <span className="relative z-10 text-sm">
                {isLastStep ? (data?.agentsCount > 0 ? 'Continuer' : 'Créer mon agent') : 'Continuer'}
              </span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform relative z-10" />
              <div className="absolute inset-0 bg-gold-400 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            </button>
          </div>
        </div>
      </MotionDiv>
    </div>,
    document.body
  )
}ition-transform relative z-10" />
              <div className="absolute inset-0 bg-gold-400 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            </button>
          </div>
        </div>
      </MotionDiv>
    </div>,
    document.body
  )
}
