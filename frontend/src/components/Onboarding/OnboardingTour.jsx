import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

const MotionDiv = motion.div

// Define tour steps for different pages
export const TOUR_STEPS = {
  dashboard: [
    {
      id: 'dashboard-stats',
      target: '[data-tour="stats"]',
      title: '📊 Vos statistiques',
      description: 'Suivez vos conversations, messages et crédits en temps réel.',
      position: 'bottom'
    },
    {
      id: 'dashboard-agents',
      target: '[data-tour="agents-list"]',
      title: '🤖 Vos agents',
      description: 'Gérez vos assistants IA ici. Chaque agent peut avoir sa propre personnalité.',
      position: 'bottom'
    },
    {
      id: 'dashboard-checklist',
      target: '[data-tour="checklist"]',
      title: '✅ Guide de démarrage',
      description: 'Suivez ces étapes pour configurer votre premier agent WhatsApp.',
      position: 'bottom'
    }
  ],
  agents: [
    {
      id: 'agents-create',
      target: '[data-tour="create-agent"]',
      title: '➕ Créer un agent',
      description: 'Cliquez ici pour créer votre premier assistant IA.',
      position: 'bottom-left'
    },
    {
      id: 'agents-filters',
      target: '[data-tour="agents-filters"]',
      title: '🔍 Filtrer et trier',
      description: 'Filtrez vos agents par statut ou recherchez par nom.',
      position: 'bottom'
    }
  ],
  agentDetail: [
    {
      id: 'agent-overview',
      target: '[data-tour="tab-overview"]',
      title: '📋 Vue d\'ensemble',
      description: 'Retrouvez ici le statut de connexion et les statistiques de votre agent.',
      position: 'bottom'
    },
    {
      id: 'agent-settings',
      target: '[data-tour="tab-settings"]',
      title: '⚙️ Paramètres',
      description: 'Personnalisez le comportement, le modèle IA et les réponses automatiques.',
      position: 'bottom'
    },
    {
      id: 'agent-knowledge',
      target: '[data-tour="tab-knowledge"]',
      title: '📚 Base de connaissances',
      description: 'Ajoutez des informations pour que l\'IA réponde plus précisément.',
      position: 'bottom'
    }
  ],
  sidebar: [
    {
      id: 'nav-dashboard',
      target: '[data-tour="nav-dashboard"]',
      title: '🏠 Tableau de bord',
      description: 'Votre vue d\'ensemble avec statistiques et activité récente.',
      position: 'right'
    },
    {
      id: 'nav-agents',
      target: '[data-tour="nav-agents"]',
      title: '🤖 Agents',
      description: 'Créez et gérez vos assistants IA.',
      position: 'right'
    },
    {
      id: 'nav-conversations',
      target: '[data-tour="nav-conversations"]',
      title: '💬 Conversations',
      description: 'Consultez tous les échanges avec vos clients.',
      position: 'right'
    },
    {
      id: 'nav-products',
      target: '[data-tour="nav-products"]',
      title: '📦 Produits',
      description: 'Gérez votre catalogue produits (agents type vente / e-commerce).',
      position: 'right'
    }
  ],
  whatsapp_connect: [
    {
      id: 'wc-select-agent',
      target: '[data-tour="create-tool-whatsapp"]',
      title: '📱 Connecter un compte',
      description: 'Cliquez ici pour commencer la connexion de votre compte WhatsApp.',
      position: 'bottom'
    },
    {
      id: 'wc-qr-section',
      target: '[data-tour="whatsapp-connect-section"]',
      title: '🔗 Scanner le QR Code',
      description: 'Scannez ce code avec votre téléphone (WhatsApp > Appareils connectés) pour activer l\'agent.',
      position: 'right'
    }
  ],
  add_knowledge: [
    {
      id: 'ak-tab',
      target: '[data-tour="tab-knowledge"]',
      title: '📚 Base de connaissances',
      description: 'C\'est ici que vous donnez de la "mémoire" à votre IA.',
      position: 'bottom'
    },
    {
      id: 'ak-add-button',
      target: '[data-tour="add-knowledge-button"]',
      title: '➕ Ajouter du contenu',
      description: 'Vous pouvez importer des PDF, du texte ou des liens web.',
      position: 'left'
    }
  ],
  conversations: [
    {
      id: 'conv-test',
      target: '[data-tour="conv-list"]',
      title: '💬 Tester l\'agent',
      description: 'Envoyez un message pour tester la réponse automatique de votre agent.',
      position: 'bottom'
    }
  ],
  products: [
    {
      id: 'prod-list',
      target: '[data-tour="products-list"]',
      title: '📦 Catalogue Produits',
      description: 'Gérez ici vos produits pour que votre agent puisse les proposer à vos clients.',
      position: 'top'
    },
    {
      id: 'prod-create',
      target: '[data-tour="create-product"]',
      title: '➕ Ajouter un produit',
      description: 'Cliquez ici pour ajouter manuellement un nouveau produit à votre catalogue.',
      position: 'bottom'
    }
  ]
}

// Context for managing tour state
const OnboardingTourContext = createContext(null)

export function OnboardingTourProvider({ children, userId }) {
  const [activeTour, setActiveTour] = useState(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [guidedTask, setGuidedTask] = useState(null)
  
  const storageKey = userId ? `seven-t-completed-tours-${userId}` : null
  const taskKey = userId ? `seven-t-guided-task-${userId}` : null
  const [completedTours, setCompletedTours] = useState([])

  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey)
      setCompletedTours(saved ? JSON.parse(saved) : [])
    }
    if (taskKey) {
      const savedTask = localStorage.getItem(taskKey)
      if (savedTask) {
        const parsed = JSON.parse(savedTask)
        setGuidedTask(parsed)
        // If we have a saved task and no active tour, try rebooting it
        if (!activeTour && parsed.tour) {
          setActiveTour(parsed.tour)
          setCurrentStepIndex(0)
        }
      }
    }
  }, [storageKey, taskKey])

  useEffect(() => {
    if (storageKey && completedTours.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(completedTours))
    }
  }, [completedTours, storageKey])

  useEffect(() => {
    if (taskKey) {
      if (guidedTask) {
        localStorage.setItem(taskKey, JSON.stringify(guidedTask))
      } else {
        localStorage.removeItem(taskKey)
      }
    }
  }, [guidedTask, taskKey])

  const startTour = useCallback((tourId) => {
    if (!userId) return
    if ((!completedTours.includes(tourId) || tourId === 'force') && TOUR_STEPS[tourId]) {
      setActiveTour(tourId)
      setCurrentStepIndex(0)
    }
  }, [completedTours, userId])

  const endTour = useCallback(() => {
    if (activeTour && activeTour !== 'force') {
      setCompletedTours(prev => prev.includes(activeTour) ? prev : [...prev, activeTour])
    }
    setActiveTour(null)
    setCurrentStepIndex(0)
  }, [activeTour])

  const skipAllTours = useCallback(() => {
    const allTourIds = Object.keys(TOUR_STEPS)
    setCompletedTours(allTourIds)
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
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }, [currentStepIndex])

  const resetTours = useCallback(() => {
    setCompletedTours([])
    if (storageKey) {
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  const currentStep = activeTour ? TOUR_STEPS[activeTour]?.[currentStepIndex] : null
  const totalSteps = activeTour ? TOUR_STEPS[activeTour]?.length : 0
  const isTourActive = activeTour !== null

  const startGuidedTask = useCallback((taskId, targetTour = null) => {
    setGuidedTask({ id: taskId, tour: targetTour || taskId })
    if (targetTour || taskId) {
      startTour(targetTour || taskId)
    }
  }, [startTour])

  const completeGuidedTask = useCallback(() => {
    setGuidedTask(null)
  }, [])

  const value = {
    activeTour,
    currentStep,
    currentStepIndex,
    totalSteps,
    isTourActive,
    completedTours,
    guidedTask,
    startTour,
    endTour,
    skipAllTours,
    nextStep,
    prevStep,
    resetTours,
    startGuidedTask,
    completeGuidedTask,
    isStepActive: (stepId) => currentStep?.id === stepId
  }

  return (
    <OnboardingTourContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {isTourActive && currentStep && (
          <FloatingTourTooltip
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
  const context = useContext(OnboardingTourContext)
  if (!context) {
    throw new Error('useOnboardingTour must be used within OnboardingTourProvider')
  }
  return context
}

function FloatingTourTooltip({ step, stepNumber, totalSteps, onNext, onPrev, onDismiss }) {
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [targetRect, setTargetRect] = useState(null)
  const tooltipRef = useRef(null)

  useEffect(() => {
    const candidates = document.querySelectorAll(step.target)
    const targetElement = Array.from(candidates).find((el) => {
      const rect = el.getBoundingClientRect()
      const style = window.getComputedStyle(el)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
    }) || candidates[0]

    if (!targetElement) return

    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect()
      setTargetRect(rect)

      let top = 0
      let left = 0
      const tooltipWidth = 320
      const tooltipHeight = 180
      const offset = 20

      switch (step.position) {
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.right + offset
          break
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.left - tooltipWidth - offset
          break
        case 'top':
          top = rect.top - tooltipHeight - offset
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'bottom':
        case 'bottom-left':
        default:
          top = rect.bottom + offset
          left = step.position === 'bottom-left' ? rect.left : rect.left + rect.width / 2 - tooltipWidth / 2
          break
      }

      top = Math.max(10, Math.min(top, window.innerHeight - tooltipHeight - 10))
      left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10))

      setPosition({ top, left })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [step])

  if (!targetRect) return null

  // Check if a major modal is open (WelcomeModal, Wizard, etc.)
  // We check for some common modal classes or IDs
  const isBlockingModalOpen = !!(
    document.querySelector('[role="dialog"]') || 
    document.querySelector('.wizard-modal') ||
    document.querySelector('.welcome-modal')
  )

  if (isBlockingModalOpen) return null

  const padding = 8

  return createPortal(
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* Backdrop Spotlight Effect */}
      <MotionDiv 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-space-950/60 backdrop-blur-[2px] pointer-events-auto"
        onClick={onDismiss}
        style={{
          clipPath: `polygon(
            0% 0%, 
            0% 100%, 
            ${targetRect.left - padding}px 100%, 
            ${targetRect.left - padding}px ${targetRect.top - padding}px, 
            ${targetRect.left + targetRect.width + padding}px ${targetRect.top - padding}px, 
            ${targetRect.left + targetRect.width + padding}px ${targetRect.top + targetRect.height + padding}px, 
            ${targetRect.left - padding}px ${targetRect.top + targetRect.height + padding}px, 
            ${targetRect.left - padding}px 100%, 
            100% 100%, 
            100% 0%
          )`
        }}
      />

      {/* Target Highlight Ring */}
      <MotionDiv
        layoutId="tour-highlight"
        className="absolute z-[9999] rounded-2xl border-2 border-gold-400 shadow-[0_0_30px_rgba(245,212,122,0.3)] pointer-events-none"
        initial={false}
        animate={{
          top: targetRect.top - padding,
          left: targetRect.left - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />

      {/* Tooltip */}
      <MotionDiv
        ref={tooltipRef}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1, top: position.top, left: position.left }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed z-[10000] w-80 pointer-events-auto"
      >
        <div className="bg-[#0B0F1A] border border-white/10 rounded-[1.5rem] shadow-2xl shadow-black overflow-hidden pointer-events-auto">
          {/* Header */}
          <div className="px-5 py-4 bg-white/5 border-b border-white/5">
            <div className="flex items-center justify-between">
              <h4 className="font-syne font-black text-white italic tracking-tight">{step.title}</h4>
              <button 
                onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                className="text-gray-500 hover:text-white transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-5">
            <p className="text-sm text-gray-400 leading-relaxed">{step.description}</p>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div 
                  key={i}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i === stepNumber - 1 ? 'w-4 bg-gold-400' : 'w-1 bg-white/10'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              {stepNumber > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPrev(); }}
                  className="text-xs font-bold text-gray-500 hover:text-white transition-colors"
                >
                  Précédent
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); stepNumber === totalSteps ? onDismiss() : onNext(); }}
                className="px-5 py-2 text-xs font-black bg-white text-black rounded-xl hover:bg-gold-400 transition-all hover:scale-105 active:scale-95"
              >
                {stepNumber === totalSteps ? 'Terminer ✓' : 'Suivant'}
              </button>
            </div>
          </div>
        </div>
      </MotionDiv>
    </div>,
    document.body
  )
}

export default OnboardingTourProvider
