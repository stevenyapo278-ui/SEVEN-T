import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, useReducer } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import { X } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

// ─── Tour steps definitions ──────────────────────────────────────────────────

export const TOUR_STEPS = {
  sidebar: [
    { id: 'nav-dashboard', target: '[data-tour="nav-dashboard"]', title: '🏠 Accueil', description: 'Votre tableau de bord avec un résumé de toute votre activité.', position: 'right', desktopOnly: true },
    { id: 'nav-agents', target: '[data-tour="nav-agents"]', title: '🤖 Vos agents IA', description: 'Créez et gérez vos assistants IA pour automatiser vos réponses WhatsApp.', position: 'right', desktopOnly: true },
    { id: 'nav-conversations', target: '[data-tour="nav-conversations"]', title: '💬 Conversations', description: 'Consultez tous les échanges WhatsApp gérés par vos agents.', position: 'right', desktopOnly: true },
    { id: 'nav-tools', target: '[data-tour="nav-tools"]', title: '📱 Téléphones', description: 'Connectez vos comptes WhatsApp ici en scannant un QR code.', position: 'right', desktopOnly: true },
  ],
  dashboard: [
    { id: 'dashboard-stats', target: '[data-tour="stats"]', title: '📊 Vos statistiques', description: 'Suivez vos conversations, messages et crédits IA en temps réel.', position: 'bottom' },
    { id: 'dashboard-agents', target: '[data-tour="agents-list"]', title: '🤖 Vos agents', description: 'Gérez vos assistants IA ici.', position: 'bottom' },
  ],
  agents: [
    { id: 'agents-create', target: '[data-tour="create-agent"]', title: '➕ Créer un agent', description: 'Cliquez ici pour créer votre premier assistant IA.', position: 'bottom-left' },
  ],
  agentDetail: [
    { id: 'agent-overview', target: '[data-tour="tab-overview"]', title: '📋 Vue d\'ensemble', description: 'Statut de connexion et statistiques de votre agent.', position: 'bottom' },
    { id: 'agent-settings', target: '[data-tour="tab-settings"]', title: '⚙️ Paramètres', description: 'Personnalisez le comportement et le modèle IA.', position: 'bottom' },
    { id: 'agent-knowledge', target: '[data-tour="tab-knowledge"]', title: '📚 Base de connaissances', description: 'Ajoutez des informations pour enrichir la mémoire de l\'IA.', position: 'bottom' },
  ],
  whatsapp_connect: [
    { id: 'wc-select-agent', target: '[data-tour="create-tool-whatsapp"]', title: '📱 Connecter un compte', description: 'Cliquez ici pour lier votre compte WhatsApp.', position: 'bottom' },
  ],
  add_knowledge: [
    { id: 'ak-add-button', target: '[data-tour="add-knowledge-button"]', title: '➕ Ajouter du contenu', description: 'Importez des PDF, du texte ou des liens web.', position: 'left' },
  ],
  conversations: [
    { id: 'conv-test', target: '[data-tour="conv-list"]', title: '💬 Vos conversations', description: 'Ici apparaîtront toutes les conversations gérées par vos agents.', position: 'bottom' },
  ],
  products: [
    { id: 'prod-create', target: '[data-tour="create-product"]', title: '➕ Ajouter un produit', description: 'Ajoutez vos produits pour que votre agent puisse les proposer.', position: 'bottom' },
  ],
}

// ─── State Management ────────────────────────────────────────────────────────

const initialState = {
  activeTour: null,
  currentStepIndex: 0,
  completedTours: [],
  guidedTask: null
}

function tourReducer(state, action) {
  switch (action.type) {
    case 'START_TOUR':
      if (state.completedTours.includes(action.tourId)) return state
      return { ...state, activeTour: action.tourId, currentStepIndex: 0 }
    case 'END_TOUR':
      return { 
        ...state, 
        completedTours: state.activeTour && !state.completedTours.includes(state.activeTour) 
          ? [...state.completedTours, state.activeTour] 
          : state.completedTours,
        activeTour: null,
        currentStepIndex: 0
      }
    case 'NEXT_STEP':
      const steps = TOUR_STEPS[state.activeTour]
      if (state.currentStepIndex < steps.length - 1) {
        return { ...state, currentStepIndex: state.currentStepIndex + 1 }
      }
      return { 
        ...state, 
        completedTours: !state.completedTours.includes(state.activeTour) 
          ? [...state.completedTours, state.activeTour] 
          : state.completedTours,
        activeTour: null,
        currentStepIndex: 0
      }
    case 'PREV_STEP':
      return { ...state, currentStepIndex: Math.max(0, state.currentStepIndex - 1) }
    case 'SET_GUIDED_TASK':
      return { ...state, guidedTask: action.task }
    case 'LOAD_PERSISTED':
      return { ...state, ...action.data }
    case 'SKIP_ALL':
      return { ...state, completedTours: Object.keys(TOUR_STEPS), activeTour: null, currentStepIndex: 0 }
    case 'RESET':
      return { ...state, completedTours: [], activeTour: null, currentStepIndex: 0 }
    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const OnboardingTourContext = createContext(null)

export function OnboardingTourProvider({ children, userId }) {
  const [state, dispatch] = useReducer(tourReducer, initialState)
  const storageKey = userId ? `seven-t-tours-v3-${userId}` : null
  const taskKey = userId ? `seven-t-task-v3-${userId}` : null

  // Load persisted state
  useEffect(() => {
    if (storageKey) {
      try {
        const savedTours = localStorage.getItem(storageKey)
        const savedTask = localStorage.getItem(taskKey)
        const data = {}
        if (savedTours) data.completedTours = JSON.parse(savedTours)
        if (savedTask) {
          const parsedTask = JSON.parse(savedTask)
          data.guidedTask = parsedTask
          if (parsedTask.tour) {
            data.activeTour = parsedTask.tour
            data.currentStepIndex = 0
          }
        }
        dispatch({ type: 'LOAD_PERSISTED', data })
      } catch { /* noop */ }
    }
  }, [storageKey, taskKey])

  // Persist state
  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(state.completedTours))
    if (taskKey) {
      if (state.guidedTask) localStorage.setItem(taskKey, JSON.stringify(state.guidedTask))
      else localStorage.removeItem(taskKey)
    }
  }, [state.completedTours, state.guidedTask, storageKey, taskKey])

  const startTour = useCallback((tourId) => dispatch({ type: 'START_TOUR', tourId }), [])
  const endTour = useCallback(() => dispatch({ type: 'END_TOUR' }), [])
  const nextStep = useCallback(() => dispatch({ type: 'NEXT_STEP' }), [])
  const prevStep = useCallback(() => dispatch({ type: 'PREV_STEP' }), [])
  const skipAllTours = useCallback(() => dispatch({ type: 'SKIP_ALL' }), [])
  const resetTours = useCallback(() => dispatch({ type: 'RESET' }), [])
  const startGuidedTask = useCallback((taskId, targetTour = null) => {
    const task = { id: taskId, tour: targetTour || taskId }
    dispatch({ type: 'SET_GUIDED_TASK', task })
    dispatch({ type: 'START_TOUR', tourId: task.tour })
  }, [])
  const completeGuidedTask = useCallback(() => dispatch({ type: 'SET_GUIDED_TASK', task: null }), [])

  const currentStep = state.activeTour ? TOUR_STEPS[state.activeTour]?.[state.currentStepIndex] : null
  const totalSteps = state.activeTour ? TOUR_STEPS[state.activeTour]?.length : 0
  const isTourActive = state.activeTour !== null

  // Handle automatic skipping of desktop-only steps on mobile
  useEffect(() => {
    if (isTourActive && currentStep?.desktopOnly && window.innerWidth < 640) {
      nextStep()
    }
  }, [isTourActive, currentStep, nextStep])

  const value = useMemo(() => ({
    ...state, currentStep, totalSteps, isTourActive,
    startTour, endTour, skipAllTours, nextStep, prevStep, resetTours,
    startGuidedTask, completeGuidedTask,
    isStepActive: (stepId) => currentStep?.id === stepId,
  }), [state, currentStep, totalSteps, isTourActive, startTour, endTour, skipAllTours, nextStep, prevStep, resetTours, startGuidedTask, completeGuidedTask])

  return (
    <OnboardingTourContext.Provider value={value}>
      <LazyMotion features={domAnimation}>
        {children}
        <AnimatePresence>
          {isTourActive && currentStep && (
            <TourOverlay
              key={currentStep.id}
              step={currentStep}
              stepNumber={state.currentStepIndex + 1}
              totalSteps={totalSteps}
              onNext={nextStep}
              onPrev={prevStep}
              onDismiss={endTour}
            />
          )}
        </AnimatePresence>
      </LazyMotion>
    </OnboardingTourContext.Provider>
  )
}

export function useOnboardingTour() {
  const ctx = useContext(OnboardingTourContext)
  if (!ctx) throw new Error('useOnboardingTour must be used within OnboardingTourProvider')
  return ctx
}

// ─── Tour Overlay (unified desktop / mobile) ──────────────────────────────────

function TourOverlay({ step, stepNumber, totalSteps, onNext, onPrev, onDismiss }) {
  const [targetRect, setTargetRect] = useState(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const { isDark } = useTheme()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
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

      if (window.innerWidth >= 640) {
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
    const retryTimeout = setTimeout(update, 300)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      clearTimeout(retryTimeout)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [step])

  const isBlocked = !!(document.querySelector('[role="dialog"]') || document.querySelector('.wizard-modal'))
  if (isBlocked || !targetRect) return null
  const pad = 8

  return createPortal(
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`absolute inset-0 backdrop-blur-[2px] pointer-events-auto ${isDark ? 'bg-space-950/60' : 'bg-zinc-950/40'}`}
        onClick={onDismiss}
        style={{
          clipPath: `polygon(0% 0%, 0% 100%, ${targetRect.left - pad}px 100%, ${targetRect.left - pad}px ${targetRect.top - pad}px, ${targetRect.left + targetRect.width + pad}px ${targetRect.top - pad}px, ${targetRect.left + targetRect.width + pad}px ${targetRect.top + targetRect.height + pad}px, ${targetRect.left - pad}px ${targetRect.top + targetRect.height + pad}px, ${targetRect.left - pad}px 100%, 100% 100%, 100% 0%)`,
        }}
      />
      <m.div
        layoutId="tour-ring"
        className="absolute z-[9999] rounded-xl border-2 border-gold-400 shadow-[0_0_20px_rgba(245,212,122,0.25)] pointer-events-none"
        initial={false}
        animate={{ top: targetRect.top - pad, left: targetRect.left - pad, width: targetRect.width + pad * 2, height: targetRect.height + pad * 2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
      {isMobile ? (
        <MobileSheet step={step} stepNumber={stepNumber} totalSteps={totalSteps} onNext={onNext} onPrev={onPrev} onDismiss={onDismiss} />
      ) : (
        <m.div
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1, top: position.top, left: position.left }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="fixed z-[10000] w-80 pointer-events-auto"
        >
          <TooltipCard step={step} stepNumber={stepNumber} totalSteps={totalSteps} onNext={onNext} onPrev={onPrev} onDismiss={onDismiss} />
        </m.div>
      )}
    </div>,
    document.body
  )
}

function MobileSheet({ step, stepNumber, totalSteps, onNext, onPrev, onDismiss }) {
  const { isDark } = useTheme()
  return (
    <m.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      drag="y"
      dragConstraints={{ top: 0 }}
      dragElastic={{ top: 0, bottom: 0.4 }}
      onDragEnd={(_, info) => { if (info.offset.y > 80) onDismiss() }}
      className={`fixed bottom-0 left-0 right-0 z-[10000] pointer-events-auto rounded-t-2xl overflow-hidden ${isDark ? 'bg-[#0B0F1A]' : 'bg-white'}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className={`pt-3 pb-0 flex justify-center ${isDark ? 'bg-[#0B0F1A]' : 'bg-white'}`}>
        <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-white/20' : 'bg-zinc-200'}`} />
      </div>
      <TooltipCard step={step} stepNumber={stepNumber} totalSteps={totalSteps} onNext={onNext} onPrev={onPrev} onDismiss={onDismiss} isMobile />
    </m.div>
  )
}

function TooltipCard({ step, stepNumber, totalSteps, onNext, onPrev, onDismiss, isMobile = false }) {
  const { isDark } = useTheme()
  return (
    <div
      className={`shadow-2xl shadow-black overflow-hidden border ${isDark ? 'bg-[#0B0F1A] border-white/10' : 'bg-white border-zinc-200'}`}
      style={{ borderRadius: isMobile ? 0 : '1.25rem' }}
    >
      <div className={`px-5 py-3.5 border-b flex items-center justify-between ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
        <h4 className={`font-syne font-bold text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>{step.title}</h4>
        <button onClick={(e) => { e.stopPropagation(); onDismiss() }} className={`transition-colors p-1 rounded-lg ${isDark ? 'text-zinc-600 hover:text-white hover:bg-white/10' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'}`} aria-label="Fermer">
          <X className="size-4" />
        </button>
      </div>
      <div className="px-5 py-4">
        <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{step.description}</p>
        {isMobile && <p className={`text-[10px] mt-3 text-center ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Glissez vers le bas pour fermer</p>}
      </div>
      <div className={`px-5 py-3.5 border-t flex items-center justify-between ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === stepNumber - 1 ? 'w-4 bg-gold-400' : isDark ? 'w-1 bg-white/10' : 'w-1 bg-zinc-200'}`} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {stepNumber > 1 && (
            <button onClick={(e) => { e.stopPropagation(); onPrev() }} className={`text-xs font-bold transition-colors px-2 py-1 ${isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}>Précédent</button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); stepNumber === totalSteps ? onDismiss() : onNext() }}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-white text-black hover:bg-gold-400' : 'bg-zinc-900 text-white hover:bg-gold-400'}`}
          >
            {stepNumber === totalSteps ? 'Terminer ✓' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default OnboardingTourProvider
