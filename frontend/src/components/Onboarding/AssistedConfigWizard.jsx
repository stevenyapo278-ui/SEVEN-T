import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { 
  Bot, 
  MessageSquare, 
  Package, 
  Rocket, 
  Sparkles, 
  ArrowRight,
  X,
  Loader2,
  Zap,
  ShoppingBag
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const MotionDiv = motion.div

export default function AssistedConfigWizard({ isOpen, onClose, onComplete, initialData }) {
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(0)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    productName: '',
    productPrice: '',
    agentName: '',
    template: 'ecommerce'
  })

  // Sync initialData when opening
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        // Map productPrice if specifically passed (productName is already mapped via spread)
        productPrice: initialData.productPrice || prev.productPrice
      }))
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  const steps = [
    { id: 'intro', title: 'Bienvenue', icon: Sparkles },
    { id: 'product', title: 'Votre produit', icon: ShoppingBag },
    { id: 'agent', title: 'Votre agent', icon: Bot },
    { id: 'whatsapp', title: 'WhatsApp', icon: MessageSquare }
  ]

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1
  const step = steps[currentStep]

  const handleNext = async () => {
    if (step.id === 'product') {
      if (!formData.productName.trim() || !formData.productPrice) {
        return toast.error('Veuillez remplir le nom et le prix du produit.')
      }
    }
    
    if (step.id === 'agent') {
      if (!formData.agentName.trim()) {
        return toast.error('Veuillez donner un nom à votre agent.')
      }
      
      // Perform automated creations
      setLoading(true)
      try {
        // 1. Create product
        await api.post('/products', {
          name: formData.productName,
          price: parseFloat(formData.productPrice),
          description: `Produit généré par la configuration assistée`,
          status: 'active'
        }).catch(err => console.log('Product error, continuing', err))

        // 2. Create agent
        await api.post('/agents', {
          name: formData.agentName,
          template: formData.template,
          description: `Bonjour ! Je suis ${formData.agentName}. Je suis là pour vous aider avec ${formData.productName}.`
        }).catch(err => console.log('Agent error, continuing', err))

        toast.success('Tout est prêt ! 🚀')
      } catch (error) {
         console.error('Setup error', error)
         toast.error('Erreur mineure pendant la configuration, mais nous pouvons continuer.')
      } finally {
        setLoading(false)
      }
    }

    if (isLastStep) {
      onComplete?.()
      onClose()
      navigate('/dashboard/tools')
    } else {
      setDirection(1)
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    setDirection(-1)
    setCurrentStep(prev => prev - 1)
  }

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir < 0 ? 50 : -50, opacity: 0 })
  }

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`absolute inset-0 backdrop-blur-xl ${isDark ? 'bg-space-950/95' : 'bg-zinc-950/40'}`}
        onClick={onClose}
      />

      <MotionDiv
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className={`relative z-10 w-full max-w-xl rounded-[2rem] border shadow-2xl overflow-hidden flex flex-col ${
          isDark ? 'bg-[#0B0F1A] border-white/10' : 'bg-white border-zinc-200'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-white/5' : 'border-zinc-100'}`}>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gold-400 flex items-center justify-center shadow-lg shadow-gold-400/20">
              <Zap className="size-5 text-black" />
            </div>
            <div>
              <h3 className={`font-syne font-black italic leading-none ${isDark ? 'text-white' : 'text-zinc-900'}`}>Configuration Assistée</h3>
              <p className="text-[10px] uppercase font-bold tracking-widest text-gold-400">En 3 minutes top chrono</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={`p-2 transition-colors rounded-xl ${isDark ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'}`}
          >
             <X className="size-5" />
          </button>
        </div>

        {/* content */}
        <div className="p-8 pb-12 relative min-h-[350px]">
           <AnimatePresence mode="wait" custom={direction}>
              <MotionDiv
                key={currentStep}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {step.id === 'intro' && (
                  <div className="text-center space-y-6">
                    <div className="size-24 mx-auto rounded-3xl bg-gradient-to-br from-gold-400/20 to-amber-600/20 flex items-center justify-center border border-gold-400/30">
                       <Rocket className="size-12 text-gold-400" />
                    </div>
                    <div>
                       <h2 className={`text-2xl font-syne font-black italic ${isDark ? 'text-white' : 'text-zinc-900'}`}>Faisons ça ensemble</h2>
                       <p className={`text-sm mt-2 max-w-sm mx-auto ${isDark ? 'text-gray-400' : 'text-zinc-500'}`}>
                          Je vais vous guider pas à pas pour créer votre premier produit, configurer votre assistant IA et le connecter à WhatsApp.
                       </p>
                    </div>
                  </div>
                )}

                {step.id === 'product' && (
                  <div className="space-y-6">
                    <div>
                       <h2 className={`text-2xl font-syne font-black italic flex items-center gap-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                          <Package className="size-6 text-gold-400" /> Que vendez-vous ?
                       </h2>
                       <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-zinc-500'}`}>
                          Commençons par votre produit ou service principal.
                       </p>
                    </div>
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <label htmlFor="product-name" className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Nom du produit/service *</label>
                          <input 
                            id="product-name"
                            type="text"
                            value={formData.productName}
                            onChange={(e) => setFormData(prev => ({...prev, productName: e.target.value}))}
                            placeholder="Ex: Formation Marketing, Chaussures Nike…"
                            className={`w-full border-2 rounded-2xl p-4 transition-colors outline-none ${
                              isDark ? 'bg-white/5 border-white/10 text-white focus:border-gold-400' : 'bg-zinc-50 border-zinc-100 text-zinc-900 focus:border-gold-400'
                            }`}
                          />
                       </div>
                       <div className="space-y-2">
                          <label htmlFor="product-price" className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Prix (en FCFA) *</label>
                          <input 
                            id="product-price"
                            type="number"
                            value={formData.productPrice}
                            onChange={(e) => setFormData(prev => ({...prev, productPrice: e.target.value}))}
                            placeholder="Ex: 15000"
                            className={`w-full border-2 rounded-2xl p-4 transition-colors outline-none ${
                              isDark ? 'bg-white/5 border-white/10 text-white focus:border-gold-400' : 'bg-zinc-50 border-zinc-100 text-zinc-900 focus:border-gold-400'
                            }`}
                          />
                       </div>
                    </div>
                  </div>
                )}

                {step.id === 'agent' && (
                  <div className="space-y-6">
                    <div>
                       <h2 className={`text-2xl font-syne font-black italic flex items-center gap-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                          <Bot className="size-6 text-gold-400" /> Votre Assistant IA
                       </h2>
                       <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-zinc-500'}`}>
                          Comment voulez-vous appeler l'IA qui s'occupera de répondre à vos clients ?
                       </p>
                    </div>
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <label htmlFor="agent-name" className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Nom de l'assistant *</label>
                          <input 
                            id="agent-name"
                            type="text"
                            value={formData.agentName}
                            onChange={(e) => setFormData(prev => ({...prev, agentName: e.target.value}))}
                            placeholder="Ex: Sophie, Assistant Support…"
                            className={`w-full border-2 rounded-2xl p-4 transition-colors outline-none ${
                              isDark ? 'bg-white/5 border-white/10 text-white focus:border-gold-400' : 'bg-zinc-50 border-zinc-100 text-zinc-900 focus:border-gold-400'
                            }`}
                          />
                       </div>
                       
                       <div className={`p-4 rounded-2xl border flex gap-3 ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                          <MessageSquare className="size-5 text-blue-400 flex-shrink-0" />
                          <p className={`text-sm italic ${isDark ? 'text-blue-100' : 'text-blue-700'}`}>
                             "Bonjour ! Je suis {formData.agentName || 'votre assistant'}. Comment puis-je vous aider avec {formData.productName || 'nos services'} ?"
                          </p>
                       </div>
                    </div>
                  </div>
                )}

                {step.id === 'whatsapp' && (
                  <div className="text-center space-y-6">
                    <div className="size-24 mx-auto rounded-3xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                       <MessageSquare className="size-10 text-emerald-400" />
                    </div>
                    <div>
                       <h2 className={`text-2xl font-syne font-black italic ${isDark ? 'text-white' : 'text-zinc-900'}`}>Dernière étape !</h2>
                       <p className={`text-sm mt-2 max-w-sm mx-auto leading-relaxed ${isDark ? 'text-gray-400' : 'text-zinc-500'}`}>
                          Votre produit et votre agent sont créés. <br/>
                          Il ne reste plus qu'à lier votre numéro WhatsApp pour que l'agent puisse commencer à répondre.
                       </p>
                    </div>
                  </div>
                )}
              </MotionDiv>
           </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={`px-6 py-5 border-t flex items-center justify-between ${
          isDark ? 'border-white/5 bg-[#0D121F]' : 'border-zinc-100 bg-zinc-50/50'
        }`}>
           <button 
             onClick={handleBack}
             disabled={isFirstStep || loading}
             className={`px-4 py-2 text-sm font-bold transition-colors ${
               isFirstStep ? 'opacity-0 pointer-events-none' : isDark ? 'text-gray-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'
             }`}
           >
             Retour
           </button>
           <button 
             onClick={handleNext}
             disabled={loading}
             className={`flex items-center gap-2 px-6 py-3 rounded-xl font-syne font-bold overflow-hidden transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
               isDark ? 'bg-white text-black' : 'bg-zinc-900 text-white'
             }`}
           >
             {loading ? (
                <><Loader2 className="size-4 animate-spin" /> Préparation…</>
             ) : step.id === 'whatsapp' ? (
                <>Ouvrir les réglages WhatsApp <ArrowRight className="size-4" /></>
             ) : (
                <>Continuer <ArrowRight className="size-4" /></>
             )}
           </button>
        </div>
      </MotionDiv>
    </div>,
    document.body
  )
}
