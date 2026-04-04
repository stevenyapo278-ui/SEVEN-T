import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
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
  Briefcase,
  Headset,
  ShoppingCart,
  X,
  ChevronRight,
  ShieldCheck,
  Target,
  Clock,
  Info,
  Megaphone,
  Users
} from 'lucide-react'

const MotionDiv = motion.div

function getSteps(t) {
  return [
    {
      id: 'welcome',
      title: 'Bienvenue sur SEVEN-T',
      description: 'Préparez-vous à automatiser votre croissance sur WhatsApp.',
      image: '/images/onboarding/welcome_bot.png',
      icon: Sparkles,
      content: (
        <div className="space-y-6">
          <p className="text-gray-300 text-center text-base sm:text-lg leading-relaxed">
            Dites adieu aux réponses manuelles. SEVEN-T propulse votre business avec une IA qui gère vos **Ventes**, vos **Statuts** et votre **SAV** 24h/24.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-100">100% Autonome</h4>
                <p className="text-xs text-gray-500">Qualification & Ventes</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-gold-400/20 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-100">Statuts ROI</h4>
                <p className="text-xs text-gray-500">Visibilité automatisée</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'agent',
      title: 'Quelle sera sa mission ?',
      description: 'Choisissez un modèle pour démarrer instantanément. Vous pourrez tout personnaliser plus tard.',
      icon: Bot,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          {[
            { id: 'marketing', icon: Megaphone, color: 'indigo', title: 'Marketing & Statuts', desc: 'Boostez votre visibilité via les statuts et campagnes' },
            { id: 'ecommerce', icon: Package, color: 'gold', title: 'Vente & Stock', desc: 'Vente de produits, gestion du stock, commandes' },
            { id: 'crm', icon: Users, color: 'blue', title: 'CRM / Qualification', desc: 'Qualification de prospects, prise de rdv' },
            { id: 'support', icon: MessageSquare, color: 'emerald', title: 'Support Client', desc: 'Aide, FAQ, résolution de problèmes' }
          ].map((item) => (
            <MotionDiv
              key={item.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => localStorage.setItem('seven-t-onboarding-template', item.id)}
              className="p-6 bg-white/[0.03] border border-white/10 rounded-[2rem] group cursor-pointer hover:border-gold-400/50 transition-all flex items-start gap-4"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${item.color === 'gold' ? 'bg-gold-400/20 text-gold-400' : `bg-${item.color}-500/20 text-${item.color}-400`} group-hover:scale-110 transition-transform`}>
                <item.icon className="w-7 h-7" />
              </div>
              <div className="text-left">
                <h4 className="font-syne font-black text-white italic text-lg leading-none mb-2">
                  {item.title}
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            </MotionDiv>
          ))}
        </div>
      )
    },
    {
      id: 'whatsapp',
      title: t('onboarding.stepWhatsAppTitle'),
      description: t('onboarding.stepWhatsAppDesc'),
      image: '/images/onboarding/whatsapp_connection.png',
      icon: MessageSquare,
      content: (
        <div className="space-y-6">
          <div className="p-4 sm:p-6 bg-emerald-500/10 rounded-2xl sm:rounded-3xl border border-emerald-500/20 text-center">
            <p className="text-emerald-400 font-medium mb-3 sm:mb-4 text-sm sm:text-base">
              Connectez votre compte en 10 secondes
            </p>
            <div className="flex justify-center gap-3 sm:gap-4">
               {[1, 2, 3].map(i => (
                 <div key={i} className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 text-sm sm:text-base">
                      {i}
                    </div>
                 </div>
               ))}
            </div>
          </div>
          <p className="text-gray-400 text-center text-sm px-4">
            {t('onboarding.stepWhatsAppIntro')}
          </p>
          <div className="flex items-center gap-3 p-4 bg-gold-400/5 rounded-2xl border border-gold-400/20">
             <div className="p-2 bg-gold-400/20 rounded-lg">
                <Sparkles className="w-4 h-4 text-gold-400" />
             </div>
             <p className="text-xs text-gold-400/90 italic font-medium">
               {t('onboarding.stepWhatsAppHint')}
             </p>
          </div>
        </div>
      )
    },
    {
      id: 'ready',
      title: 'Prêt pour le décollage ?',
      description: 'Votre configuration de base est terminée. Il est temps de laisser l\'IA travailler.',
      image: '/images/onboarding/success_launch.png',
      icon: CheckCircle,
      content: (
        <div className="space-y-8">
          <div className="flex flex-col gap-4">
            {[
              { text: 'Réponses 24h/24 et 7j/7', icon: Clock, color: 'emerald' },
              { text: 'Qualification intelligente des prospects', icon: Sparkles, color: 'blue' },
              { text: 'Mise à jour auto des statuts WhatsApp', icon: Megaphone, color: 'gold' }
            ].map((item, i) => (
              <MotionDiv
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 * i }}
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl border border-white/10"
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-${item.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                  <item.icon className={`w-5 h-5 sm:w-6 sm:h-6 text-${item.color}-400`} />
                </div>
                <p className="text-gray-200 font-medium text-sm sm:text-base">{item.text}</p>
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 ml-auto" />
              </MotionDiv>
            ))}
          </div>
          <p className="text-gray-400 text-center font-medium italic">
            Cliquez sur Continuer pour créer votre premier agent.
          </p>
        </div>
      )
    }
  ]
}

export default function WelcomeModal({ isOpen, onClose, onComplete, data }) {
  useLockBodyScroll(isOpen)
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(0)
  const navigate = useNavigate()
  const steps = useMemo(() => getSteps(t), [t])

  if (!isOpen) return null

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const StepIcon = step.icon

  const handleNext = () => {
    if (isLastStep) {
      onComplete(true)
      if (!data) {
        navigate('/dashboard/agents?create=true')
      } else if (data.agentsCount === 0) {
        navigate('/dashboard/agents?create=true')
      } else if (data.whatsappConnected === 0) {
        navigate('/dashboard/tools')
      } else if (data.messagesCount === 0) {
        navigate('/dashboard/conversations')
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

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <AnimatePresence>
        <MotionDiv 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-space-950/95 backdrop-blur-xl" 
          onClick={handleSkip}
        />
      </AnimatePresence>
      
      <MotionDiv 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-3xl max-h-[92dvh] sm:max-h-[85vh] flex flex-col lg:flex-row bg-[#0B0F1A] rounded-[2rem] border border-white/10 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        {/* Left Side: Visual/Image */}
        <div className="hidden lg:flex lg:w-[45%] bg-[#0D121F] relative overflow-hidden border-r border-white/5">
           <AnimatePresence mode="wait" custom={direction}>
              <MotionDiv
                key={currentStep}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center"
              >
                  {step.image ? (
                    <img 
                      src={step.image} 
                      alt={step.title}
                      className="w-full h-auto object-contain rounded-3xl shadow-2xl"
                    />
                  ) : (
                    <div className="w-full aspect-square rounded-3xl bg-gradient-to-br from-gold-400/20 to-blue-500/20 flex items-center justify-center p-12">
                       <StepIcon className="w-32 h-32 text-gold-400 drop-shadow-glow" />
                    </div>
                  )}
                  
                  <div className="mt-12 space-y-4">
                     <div className="flex justify-center gap-2">
                        {steps.map((_, i) => (
                           <div 
                             key={i} 
                             className={`h-1.5 rounded-full transition-all duration-500 ${
                               i === currentStep ? 'w-8 bg-gold-400' : 'w-2 bg-white/10'
                             }`} 
                           />
                        ))}
                     </div>
                     <p className="text-[10px] uppercase font-black tracking-[0.3em] text-white/20">
                        Étape {currentStep + 1} sur {steps.length}
                     </p>
                  </div>
              </MotionDiv>
           </AnimatePresence>
           
           {/* Background Decorations */}
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
           <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold-400/10 blur-[120px] rounded-full" />
        </div>

        {/* Right Side: content */}
        <div className="flex-1 flex flex-col min-h-0 p-5 sm:p-10">
          {/* Header Mobile / Info */}
          <div className="flex items-center justify-between mb-6" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gold-400/10 flex items-center justify-center border border-gold-400/20">
                   <Sparkles className="w-4 h-4 text-gold-400" />
                </div>
                <span className="text-[10px] font-syne font-bold uppercase tracking-widest text-white/40">Onboarding</span>
             </div>
             <button 
               onClick={handleSkip}
               className="p-2 hover:bg-white/5 rounded-full transition-colors group min-w-[44px] min-h-[44px] flex items-center justify-center"
             >
               <X className="w-5 h-5 text-gray-500 group-hover:text-white" />
             </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar overscroll-contain">
            <AnimatePresence mode="wait" custom={direction}>
              <MotionDiv
                key={currentStep}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="space-y-6 sm:space-y-8"
              >
                <div className="space-y-2 sm:space-y-3">
                   <h2 className="text-xl sm:text-2xl lg:text-3xl font-syne font-black italic text-white leading-tight">
                     {step.title}
                   </h2>
                   <p className="text-xs sm:text-sm lg:text-base text-gray-400 leading-relaxed max-w-lg">
                     {step.description}
                   </p>
                </div>

                <div className="pt-2 sm:pt-4">
                  {step.content}
                </div>
              </MotionDiv>
            </AnimatePresence>
          </div>

          {/* Footer Actions */}
          <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-between pt-6 sm:pt-8 border-t border-white/5 gap-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
             <div className="flex items-center justify-between w-full sm:w-auto">
                <div className="flex lg:hidden gap-1.5 mr-4">
                    {steps.map((_, i) => (
                      <div 
                        key={i}
                        className={`h-1 rounded-full transition-all duration-300 ${
                          i === currentStep ? 'w-4 bg-gold-400' : 'w-1 bg-white/10'
                        }`}
                      />
                    ))}
                </div>

                {currentStep > 0 && (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-gray-500 hover:text-white font-bold transition-colors text-sm sm:text-base min-h-[44px]"
                  >
                    Précédent
                  </button>
                )}
             </div>

             <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 font-bold">
                {!isLastStep && (
                   <button 
                     onClick={handleSkip}
                     className="text-sm font-bold text-gray-500 hover:text-gray-300 sm:block min-h-[44px]"
                   >
                     Passer
                   </button>
                )}
                
                <button
                  onClick={handleNext}
                  className="group relative flex items-center justify-center sm:justify-start gap-3 bg-white text-black px-5 sm:px-6 py-3 sm:py-4 rounded-xl font-syne font-bold overflow-hidden transition-all hover:scale-105 active:scale-95 flex-1 sm:flex-none min-h-[48px]"
                >
                  <span className="relative z-10 text-xs sm:text-sm">
                    {isLastStep ? (data && data?.agentsCount > 0 ? "Continuer" : t('onboarding.btnCreateAgent')) : t('onboarding.btnContinue')}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform relative z-10" />
                  <div className="absolute inset-0 bg-gold-400 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                </button>
             </div>
          </div>
        </div>
      </MotionDiv>
    </div>,
    document.body
  )
}
