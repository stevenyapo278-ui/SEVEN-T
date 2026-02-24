import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  Sparkles, 
  Bot, 
  MessageSquare, 
  Package,
  ArrowRight,
  CheckCircle,
  Rocket,
  Zap,
  Users,
  X
} from 'lucide-react'

function getSteps(t) {
  return [
    {
      id: 'welcome',
      title: t('onboarding.welcomeTitle'),
      description: t('onboarding.welcomeDesc'),
      icon: Sparkles,
      content: (
        <div className="space-y-4 text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gold-400 to-blue-500 rounded-2xl flex items-center justify-center">
            <Rocket className="w-10 h-10 icon-on-gradient" />
          </div>
          <p className="text-gray-300">{t('onboarding.welcomeIntro')}</p>
        </div>
      )
    },
    {
      id: 'agent',
      title: t('onboarding.stepAgentTitle'),
      description: t('onboarding.stepAgentDesc'),
      icon: Bot,
      content: (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-space-800 rounded-xl border border-space-700">
            <Bot className="w-8 h-8 text-blue-400 mb-2" />
            <h4 className="font-medium text-gray-100">{t('onboarding.stepAgentCommercial')}</h4>
            <p className="text-sm text-gray-400">{t('onboarding.stepAgentCommercialSub')}</p>
          </div>
          <div className="p-4 bg-space-800 rounded-xl border border-space-700">
            <MessageSquare className="w-8 h-8 text-emerald-400 mb-2" />
            <h4 className="font-medium text-gray-100">{t('onboarding.stepAgentSupport')}</h4>
            <p className="text-sm text-gray-400">{t('onboarding.stepAgentSupportSub')}</p>
          </div>
          <div className="p-4 bg-space-800 rounded-xl border border-space-700">
            <Package className="w-8 h-8 text-gold-400 mb-2" />
            <h4 className="font-medium text-gray-100">{t('onboarding.stepAgentEcommerce')}</h4>
            <p className="text-sm text-gray-400">{t('onboarding.stepAgentEcommerceSub')}</p>
          </div>
          <div className="p-4 bg-space-800 rounded-xl border border-space-700">
            <Users className="w-8 h-8 text-blue-400 mb-2" />
            <h4 className="font-medium text-gray-100">{t('onboarding.stepAgentFaq')}</h4>
            <p className="text-sm text-gray-400">{t('onboarding.stepAgentFaqSub')}</p>
          </div>
        </div>
      )
    },
    {
      id: 'whatsapp',
      title: t('onboarding.stepWhatsAppTitle'),
      description: t('onboarding.stepWhatsAppDesc'),
      icon: MessageSquare,
      content: (
        <div className="text-center space-y-4">
          <div className="w-32 h-32 mx-auto bg-white rounded-xl flex items-center justify-center">
            <div className="w-24 h-24 bg-space-800 rounded-lg flex items-center justify-center">
              <Zap className="w-12 h-12 text-gold-400" />
            </div>
          </div>
          <p className="text-gray-300">{t('onboarding.stepWhatsAppIntro')}</p>
          <p className="text-sm text-gold-400/90">{t('onboarding.stepWhatsAppHint')}</p>
        </div>
      )
    },
    {
      id: 'ready',
      title: t('onboarding.stepReadyTitle'),
      description: t('onboarding.stepReadyDesc'),
      icon: CheckCircle,
      content: (
        <div className="text-center space-y-6">
          <div className="flex justify-center gap-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm text-gray-400">{t('onboarding.stepReady24')}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-sm text-gray-400">{t('onboarding.stepReadyAI')}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-gold-400/20 rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="w-6 h-6 text-gold-400" />
              </div>
              <p className="text-sm text-gray-400">{t('onboarding.stepReadySimple')}</p>
            </div>
          </div>
          <p className="text-gray-300">{t('onboarding.stepReadyFollow')}</p>
        </div>
      )
    }
  ]
}

export default function WelcomeModal({ isOpen, onClose, onComplete }) {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const navigate = useNavigate()
  const steps = useMemo(() => getSteps(t), [t])

  if (!isOpen) return null

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const StepIcon = step.icon

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
      navigate('/dashboard/agents?create=true')
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleSkip = () => {
    onComplete()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-space-950/90 backdrop-blur-sm" />
      
      <div className="relative w-full max-w-lg bg-space-900 rounded-2xl border border-space-700 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-space-800">
          <div 
            className="h-full bg-gradient-to-r from-gold-400 to-blue-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Skip button */}
        <button 
          onClick={handleSkip}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Step indicator */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div 
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep 
                    ? 'bg-gold-400' 
                    : index < currentStep 
                    ? 'bg-blue-500' 
                    : 'bg-space-700'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-gold-400/20 to-blue-500/20 rounded-2xl flex items-center justify-center">
              <StepIcon className="w-8 h-8 text-gold-400" />
            </div>
          </div>

          {/* Title & Description */}
          <h2 className="text-2xl font-display font-bold text-center text-gray-100 mb-2">
            {step.title}
          </h2>
          <p className="text-center text-gray-400 mb-8">
            {step.description}
          </p>

          {/* Step content */}
          <div className="mb-8">
            {step.content}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="flex-1 btn-secondary"
              >
                {t('onboarding.btnBack')}
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 btn-primary inline-flex items-center justify-center gap-2"
            >
              {isLastStep ? t('onboarding.btnCreateAgent') : t('onboarding.btnContinue')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Skip link */}
          {!isLastStep && (
            <button 
              onClick={handleSkip}
              className="w-full mt-4 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              {t('onboarding.skipIntro')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
