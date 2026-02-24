import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

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
      id: 'agent-whatsapp',
      target: '[data-tour="whatsapp-connect"]',
      title: '📱 Connecter WhatsApp',
      description: 'Scannez le QR code pour lier votre compte WhatsApp à cet agent.',
      position: 'bottom'
    },
    {
      id: 'agent-settings',
      target: '[data-tour="agent-settings"]',
      title: '⚙️ Paramètres',
      description: 'Personnalisez le comportement, le modèle IA et les réponses automatiques.',
      position: 'bottom'
    },
    {
      id: 'agent-knowledge',
      target: '[data-tour="agent-knowledge"]',
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
  ]
}

// Context for managing tour state
const OnboardingTourContext = createContext(null)

export function OnboardingTourProvider({ children, userId }) {
  const [activeTour, setActiveTour] = useState(null) // 'dashboard', 'agents', etc.
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  
  // Use user-specific key for completed tours - only use key when userId is available
  const storageKey = userId ? `seven-t-completed-tours-${userId}` : null
  
  const [completedTours, setCompletedTours] = useState([])

  // Load completed tours when userId becomes available
  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey)
      setCompletedTours(saved ? JSON.parse(saved) : [])
    }
  }, [storageKey])

  // Save completed tours to localStorage only when we have a valid userId
  useEffect(() => {
    if (storageKey && completedTours.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(completedTours))
    }
  }, [completedTours, storageKey])

  const startTour = useCallback((tourId) => {
    // Don't start tours until we have a valid userId to ensure proper storage
    if (!userId) {
      console.log('[Tour] Skipping tour start - no userId yet')
      return
    }
    if (!completedTours.includes(tourId) && TOUR_STEPS[tourId]) {
      setActiveTour(tourId)
      setCurrentStepIndex(0)
    }
  }, [completedTours, userId])

  const endTour = useCallback(() => {
    if (activeTour) {
      setCompletedTours(prev => [...prev, activeTour])
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

  const value = {
    activeTour,
    currentStep,
    currentStepIndex,
    totalSteps,
    isTourActive,
    completedTours,
    startTour,
    endTour,
    skipAllTours,
    nextStep,
    prevStep,
    resetTours,
    isStepActive: (stepId) => currentStep?.id === stepId
  }

  return (
    <OnboardingTourContext.Provider value={value}>
      {children}
      {isTourActive && currentStep && (
        <FloatingTourTooltip
          step={currentStep}
          stepNumber={currentStepIndex + 1}
          totalSteps={totalSteps}
          onNext={nextStep}
          onPrev={prevStep}
          onDismiss={endTour}
        />
      )}
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

// Floating tooltip that positions itself next to the target element
function FloatingTourTooltip({ step, stepNumber, totalSteps, onNext, onPrev, onDismiss }) {
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [targetRect, setTargetRect] = useState(null)
  const tooltipRef = useRef(null)

  useEffect(() => {
    const targetElement = document.querySelector(step.target)
    if (!targetElement) {
      console.warn(`Tour target not found: ${step.target}`)
      return
    }

    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect()
      setTargetRect(rect)

      // Calculate tooltip position based on step.position
      let top = 0
      let left = 0
      const tooltipWidth = 320
      const tooltipHeight = 180
      const offset = 12

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

      // Keep tooltip within viewport
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

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-space-950/80 backdrop-blur-sm z-[9998]"
        onClick={onDismiss}
      />

      {/* Highlight ring around target */}
      <div
        className="fixed z-[9999] pointer-events-none"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          boxShadow: '0 0 0 4px rgba(245, 212, 122, 0.5), 0 0 0 9999px rgba(10, 10, 20, 0.8)',
          borderRadius: '12px',
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[10000] w-80 animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{ top: position.top, left: position.left }}
      >
        <div className="bg-space-800 border border-gold-400/30 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-gold-400/10 to-blue-500/10 border-b border-space-700">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-semibold text-gray-100">{step.title}</h4>
              <button 
                onClick={onDismiss}
                className="text-gray-500 hover:text-white transition-colors p-1"
                title="Fermer le guide"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 py-3">
            <p className="text-sm text-gray-300 leading-relaxed">{step.description}</p>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-space-900/50 border-t border-space-700 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div 
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === stepNumber - 1 ? 'bg-gold-400' : 'bg-space-600'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {stepNumber > 1 && (
                <button
                  onClick={onPrev}
                  className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Précédent
                </button>
              )}
              <button
                onClick={stepNumber === totalSteps ? onDismiss : onNext}
                className="px-4 py-1.5 text-xs font-medium bg-gold-400 text-space-900 rounded-lg hover:bg-gold-300 transition-colors"
              >
                {stepNumber === totalSteps ? 'Terminer ✓' : 'Suivant →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

// Component to wrap elements that should have tour tooltips (legacy, can be removed)
export function TourStep({ stepId, children, className = '' }) {
  const { currentStep, nextStep, prevStep, endTour, currentStepIndex, totalSteps } = useOnboardingTour()
  
  const isActive = currentStep?.id === stepId
  const step = isActive ? currentStep : null

  if (!isActive) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={`relative ${className}`}>
      {/* Highlight ring */}
      <div className="relative z-50 ring-2 ring-gold-400 ring-offset-2 ring-offset-space-900 rounded-lg">
        {children}
      </div>

      {/* Tooltip */}
      <TourTooltip
        step={step}
        stepNumber={currentStepIndex + 1}
        totalSteps={totalSteps}
        onNext={nextStep}
        onPrev={prevStep}
        onDismiss={endTour}
      />
    </div>
  )
}

function TourTooltip({ step, stepNumber, totalSteps, onNext, onPrev, onDismiss }) {
  if (!step) return null

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
    left: 'right-full top-1/2 -translate-y-1/2 mr-3',
    right: 'left-full top-1/2 -translate-y-1/2 ml-3',
    'bottom-left': 'top-full left-0 mt-3',
    'bottom-right': 'top-full right-0 mt-3'
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-space-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-space-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-space-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-space-800',
    'bottom-left': 'bottom-full left-4 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-space-800',
    'bottom-right': 'bottom-full right-4 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-space-800'
  }

  return (
    <div className={`absolute z-[60] w-80 ${positionClasses[step.position] || positionClasses.bottom}`}>
      {/* Arrow */}
      <div className={`absolute w-0 h-0 ${arrowClasses[step.position] || arrowClasses.bottom}`} />
      
      {/* Content */}
      <div className="bg-space-800 border border-gold-400/30 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-gold-400/10 to-blue-500/10 border-b border-space-700">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-semibold text-gray-100">{step.title}</h4>
            <button 
              onClick={onDismiss}
              className="text-gray-500 hover:text-white transition-colors p-1"
              title="Fermer le guide"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          <p className="text-sm text-gray-300 leading-relaxed">{step.description}</p>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-space-900/50 border-t border-space-700 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div 
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === stepNumber - 1 ? 'bg-gold-400' : 'bg-space-600'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {stepNumber > 1 && (
              <button
                onClick={onPrev}
                className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
              >
                Précédent
              </button>
            )}
            <button
              onClick={stepNumber === totalSteps ? onDismiss : onNext}
              className="px-4 py-1.5 text-xs font-medium bg-gold-400 text-space-900 rounded-lg hover:bg-gold-300 transition-colors"
            >
              {stepNumber === totalSteps ? 'Terminer ✓' : 'Suivant →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingTourProvider
