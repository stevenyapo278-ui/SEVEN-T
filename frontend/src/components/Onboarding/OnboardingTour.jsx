import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight } from 'lucide-react'

const MotionDiv = motion.div

// ─── Tour steps definitions ──────────────────────────────────────────────────
// Each tour is an array of steps. Every step targets a `data-tour="xxx"` element.

export const TOUR_STEPS = {
  // ── Sidebar tour (desktop only) ────────────────────────────────────────────
  sidebar: [
    {
      id: 'nav-dashboard',
      target: '[data-tour="nav-dashboard"]',
      title: '🏠 Accueil',
      description: 'Votre tableau de bord avec un résumé de toute votre activité.',
      position: 'right',
      desktopOnly: true,
    },
    {
      id: 'nav-agents',
      target: '[data-tour="nav-agents"]',
      title: '🤖 Vos agents IA',
      description: 'Créez et gérez vos assistants IA pour automatiser vos réponses WhatsApp.',
      position: 'right',
      desktopOnly: true,
    },
    {
      id: 'nav-conversations',
      target: '[data-tour="nav-conversations"]',
      title: '💬 Conversations',
      description: 'Consultez tous les échanges WhatsApp gérés par vos agents.',
      position: 'right',
      desktopOnly: true,
    },
    {
      id: 'nav-tools',
      target: '[data-tour="nav-tools"]',
      title: '📱 Téléphones',
      description: 'Connectez vos comptes WhatsApp ici en scannant un QR code.',
      position: 'right',
      desktopOnly: true,
    },
  ],

  // ── Dashboard tour ─────────────────────────────────────────────────────────
  dashboard: [
    {
      id: 'dashboard-stats',
      target: '[data-tour="stats"]',
      title: '📊 Vos statistiques',
      description: 'Suivez vos conversations, messages et crédits IA en temps réel.',
      position: 'bottom',
    },
    {
      id: 'dashboard-agents',
      target: '[data-tour="agents-list"]',
      title: '🤖 Vos agents',
      description: 'Gérez vos assistants IA ici. Chaque agent a sa propre personnalité et ses propres compétences.',
      position: 'bottom',
    },
  ],

  // ── Agents page tour ────────────────────────────────────────────────────────
  agents: [
    {
      id: 'agents-create',
      target: '[data-tour="create-agent"]',
      title: '➕ Créer un agent',
      description: 'Cliquez ici pour créer votre premier assistant IA.',
      position: 'bottom-left',
    },
  ],

  // ── Agent detail tour ──────────────────────────────────────────────────────
  agentDetail: [
    {
      id: 'agent-overview',
      target: '[data-tour="tab-overview"]',
      title: '📋 Vue d\'ensemble',
      description: 'Statut de connexion et statistiques de votre agent.',
      position: 'bottom',
    },
    {
      id: 'agent-settings',
      target: '[data-tour="tab-settings"]',
      title: '⚙️ Paramètres',
      description: 'Personnalisez le comportement, le modèle IA et les réponses automatiques.',
      position: 'bottom',
    },
    {
      id: 'agent-knowledge',
      target: '[data-tour="tab-knowledge"]',
      title: '📚 Base de connaissances',
      description: 'Ajoutez des informations pour que l\'IA réponde plus précisément.',
      position: 'bottom',
    },
  ],

  // ── WhatsApp connect tour ──────────────────────────────────────────────────
  whatsapp_connect: [
    {
      id: 'wc-select-agent',
      target: '[data-tour="create-tool-whatsapp"]',
      title: '📱 Connecter un compte',
      description: 'Cliquez ici pour lier votre compte WhatsApp.',
      position: 'bottom',
    },
  ],

  // ── Knowledge tour ─────────────────────────────────────────────────────────
  add_knowledge: [
    {
      id: 'ak-add-button',
      target: '[data-tour="add-knowledge-button"]',
      title: '➕ Ajouter du contenu',
      description: 'Importez des PDF, du texte ou des liens web pour enrichir la mémoire de votre IA.',
      position: 'left',
    },
  ],

  // ── Conversations tour ─────────────────────────────────────────────────────
  conversations: [
    {
      id: 'conv-test',
      target: '[data-tour="conv-list"]',
      title: '💬 Vos conversations',
      description: 'Ici apparaîtront toutes les conversations gérées par vos agents.',
      position: 'bottom',
    },
  ],

  // ── Products tour ──────────────────────────────────────────────────────────
  products: [
    {
      id: 'prod-create',
      target: '[data-tour="create-product"]',
      title: '➕ Ajouter un produit',
      description: 'Ajoutez vos produits pour que votre agent puisse les proposer à vos clients.',
      position: 'bottom',
    },
  ],
}

// ─── Context ──────────────────────────────────────────────────────────────────

const OnboardingTourContext = createContext(null)

export function OnboardingTourProvider({ children, userId }) {
  const [activeTour, setActiveTour] = useState(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [guidedTask, setGuidedTask] = useState(null)

  const storageKey = userId ? `seven-t-tours-v2-${userId}` : null
  const taskKey = userId ? `seven-t-task-v2-${userId}` : null
  const [completedTours, setCompletedTours] = useState([])

  // Load persisted state
  useEffect(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) setCompletedTours(JSON.parse(saved))
      } catch { /* noop */ }
    }
    if (taskKey) {
      try {
        const saved = localStorage.getItem(taskKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          setGuidedTask(parsed)
          if (!activeTour && parsed.tour) {
            setActiveTour(parsed.tour)
            setCurrentStepIndex(0)
          }
        }
      } catch { /* noop */ }
    }
  }, [storageKey, taskKey])

  // Persist completedTours
  useEffect(() => {
    if (storageKey && completedTours.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(completedTours))
    }
  }, [completedTours, storageKey])

  // Persist guidedTask
  useEffect(() => {
    if (taskKey) {
      if (guidedTask) localStorage.setItem(taskKey, JSON.stringify(guidedTask))
      else localStorage.removeItem(taskKey)
    }
  }, [guidedTask, taskKey])

  const startTour = useCallback((tourId) => {
    if (!userId || !TOUR_STEPS[tourId]) return
    if (!completedTours.includes(tourId)) {
      setActiveTour(tourId)
      setCurrentStepIndex(0)
    }
  }, [completedTours, userId])

  const endTour = useCallback(() => {
    if (activeTour) {
      setCompletedTours(prev => prev.includes(activeTour) ? prev : [...prev, activeTour])
    }
    setActiveTour(null)
    setCurrentStepIndex(0)
  }, [activeTour])

  const skipAllTours = useCallback(() => {
    setCompletedTours(Object.keys(TOUR_STEPS))
    setActiveTour(null)
    setCurrentStepIndex(0)
  }, [])

  const nextStep = useCallback(() => {
    if (!activeTour) return
    const steps = TOUR_STEPS[activeTour]
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
    } else {
      endTour()
    }
  }, [activeTour, currentStepIndex, endTour])

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1)
  }, [currentStepIndex])

  const resetTours = useCallback(() => {
    setCompletedTours([])
    if (storageKey) localStorage.removeItem(storageKey)
  }, [storageKey])

  const startGuidedTask = useCallback((taskId, targetTour = null) => {
    setGuidedTask({ id: taskId, tour: targetTour || taskId })
    if (targetTour || taskId) startTour(targetTour || taskId)
  }, [startTour])

  const completeGuidedTask = useCallback(() => {
    setGuidedTask(null)
  }, [])

  const currentStep = activeTour ? TOUR_STEPS[activeTour]?.[currentStepIndex] : null
  const totalSteps = activeTour ? TOUR_STEPS[activeTour]?.length : 0
  const isTourActive = activeTour !== null

  const value = useMemo(() => ({
    activeTour, currentStep, currentStepIndex, totalSteps, isTourActive,
    completedTours, guidedTask,
    startTour, endTour, skipAllTours, nextStep, prevStep, resetTours,
    startGuidedTask, completeGuidedTask,
    isStepActive: (stepId) => currentStep?.id === stepId,
  }), [
    activeTour, currentStep, currentStepIndex, totalSteps, isTourActive,
    completedTours, guidedTask,
    startTour, endTour, skipAllTours, nextStep, prevStep, resetTours,
    startGuidedTask, completeGuidedTask,
  ])

  return (
    <OnboardingTourContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {isTourActive && currentStep && (
          <TourOverlay
            key={currentStep.id}
            step={currentStep}
            stepNumber={currentStepIndex + 1}
            totalSteps={totalSteps}
            onNext={nextStep}
            onPrev={prevStep}
            onDismiss={endTour}
          />
        )}
      </AnimatePresence>
    </OnboardingTourContext.Provider>
  )
}

export function useOnboardingTour() {
  const ctx = useContext(OnboardingTourContext)
  if (!ctx) throw new Error('useOnboardingTour must be used within OnboardingTourProvider')
  return ctx
}

// ─── Mobile detection ─────────────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  )
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)')
    const handler = (e) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return isMobile
}

// ─── Tour Overlay (unified desktop / mobile) ──────────────────────────────────

function TourOverlay({ step, stepNumber, totalSteps, onNext, onPrev, onDismiss }) {
  const [targetRect, setTargetRect] = useState(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const isMobile = useIsMobile()

  useEffect(() => {
    // Skip desktop-only steps on mobile
    if (step.desktopOnly && isMobile) { onNext(); return }

    const findTarget = () => {
      const candidates = document.querySelectorAll(step.target)
      return Array.from(candidates).find((el) => {
        const rect = el.getBoundingClientRect()
        const style = window.getComputedStyle(el)
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
      }) || candidates[0]
    }

    const update = () => {
      const el = findTarget()
      if (!el) { setTargetRect(null); return }

      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) { setTargetRect(null); return }

      setTargetRect(rect)

      if (!isMobile) {
        const tw = 320, th = 180, off = 16
        let top = 0, left = 0
        switch (step.position) {
          case 'right':       top = rect.top + rect.height / 2 - th / 2; left = rect.right + off; break
          case 'left':        top = rect.top + rect.height / 2 - th / 2; left = rect.left - tw - off; break
          case 'top':         top = rect.top - th - off; left = rect.left + rect.width / 2 - tw / 2; break
          case 'bottom-left': top = rect.bottom + off; left = rect.left; break
          default:            top = rect.bottom + off; left = rect.left + rect.width / 2 - tw / 2; break
        }
        top = Math.max(8, Math.min(top, window.innerHeight - th - 8))
        left = Math.max(8, Math.min(left, window.innerWidth - tw - 8))
        setPosition({ top, left })
      }
    }

    update()
    // Retry after short delay in case elements need to render
    const retryTimeout = setTimeout(update, 300)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      clearTimeout(retryTimeout)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [step, isMobile, onNext])

  // Don't render if blocking modal is open
  const isBlocked = !!(document.querySelector('[role="dialog"]') || document.querySelector('.wizard-modal'))
  if (isBlocked || !targetRect) return null

  const pad = 8

  return createPortal(
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* Spotlight backdrop */}
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-space-950/60 backdrop-blur-[2px] pointer-events-auto"
        onClick={onDismiss}
        style={{
          clipPath: `polygon(
            0% 0%, 0% 100%,
            ${targetRect.left - pad}px 100%,
            ${targetRect.left - pad}px ${targetRect.top - pad}px,
            ${targetRect.left + targetRect.width + pad}px ${targetRect.top - pad}px,
            ${targetRect.left + targetRect.width + pad}px ${targetRect.top + targetRect.height + pad}px,
            ${targetRect.left - pad}px ${targetRect.top + targetRect.height + pad}px,
            ${targetRect.left - pad}px 100%,
            100% 100%, 100% 0%
          )`,
        }}
      />

      {/* Highlight ring */}
      <MotionDiv
        layoutId="tour-ring"
        className="absolute z-[9999] rounded-xl border-2 border-gold-400 shadow-[0_0_20px_rgba(245,212,122,0.25)] pointer-events-none"
        initial={false}
        animate={{
          top: targetRect.top - pad,
          left: targetRect.left - pad,
          width: targetRect.width + pad * 2,
          height: targetRect.height + pad * 2,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />

      {/* Tooltip */}
      {isMobile ? (
        <MobileSheet step={step} stepNumber={stepNumber} totalSteps={totalSteps} onNext={onNext} onPrev={onPrev} onDismiss={onDismiss} />
      ) : (
        <MotionDiv
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1, top: position.top, left: position.left }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="fixed z-[10000] w-80 pointer-events-auto"
        >
          <TooltipCard step={step} stepNumber={stepNumber} totalSteps={totalSteps} onNext={onNext} onPrev={onPrev} onDismiss={onDismiss} />
        </MotionDiv>
      )}
    </div>,
    document.body
  )
}

// ─── Mobile bottom sheet ──────────────────────────────────────────────────────

function MobileSheet({ step, stepNumber, totalSteps, onNext, onPrev, onDismiss }) {
  return (
    <MotionDiv
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      drag="y"
      dragConstraints={{ top: 0 }}
      dragElastic={{ top: 0, bottom: 0.4 }}
      onDragEnd={(_, info) => { if (info.offset.y > 80) onDismiss() }}
      className="fixed bottom-0 left-0 right-0 z-[10000] pointer-events-auto rounded-t-2xl overflow-hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-[#0B0F1A] pt-3 pb-0 flex justify-center">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>
      <TooltipCard step={step} stepNumber={stepNumber} totalSteps={totalSteps} onNext={onNext} onPrev={onPrev} onDismiss={onDismiss} isMobile />
    </MotionDiv>
  )
}

// ─── Shared tooltip card ──────────────────────────────────────────────────────

function TooltipCard({ step, stepNumber, totalSteps, onNext, onPrev, onDismiss, isMobile = false }) {
  return (
    <div
      className="bg-[#0B0F1A] border border-white/10 shadow-2xl shadow-black overflow-hidden"
      style={{ borderRadius: isMobile ? 0 : '1.25rem' }}
    >
      {/* Header */}
      <div className="px-5 py-3.5 bg-white/[0.03] border-b border-white/5 flex items-center justify-between">
        <h4 className="font-syne font-bold text-white text-sm">{step.title}</h4>
        <button onClick={(e) => { e.stopPropagation(); onDismiss() }} className="text-gray-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <p className="text-sm text-gray-400 leading-relaxed">{step.description}</p>
        {isMobile && <p className="text-[10px] text-gray-600 mt-3 text-center">Glissez vers le bas pour fermer</p>}
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === stepNumber - 1 ? 'w-4 bg-gold-400' : 'w-1 bg-white/10'}`} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {stepNumber > 1 && (
            <button onClick={(e) => { e.stopPropagation(); onPrev() }} className="text-xs font-bold text-gray-500 hover:text-white transition-colors px-2 py-1">
              Précédent
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); stepNumber === totalSteps ? onDismiss() : onNext() }}
            className="px-4 py-2 text-xs font-black bg-white text-black rounded-lg hover:bg-gold-400 transition-all hover:scale-105 active:scale-95"
          >
            {stepNumber === totalSteps ? 'Terminer ✓' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default OnboardingTourProvider
