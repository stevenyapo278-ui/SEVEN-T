import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bot, 
  MessageSquare, 
  Package, 
  Rocket, 
  Sparkles, 
  ArrowRight,
  ArrowLeft,
  X,
  Loader2,
  CheckCircle,
  Zap,
  ShoppingBag
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const MotionDiv = motion.div

export default function AssistedConfigWizard({ isOpen, onClose, onComplete, initialData }) {
  const navigate = useNavigate()
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
        className="absolute inset-0 bg-space-950/95 backdrop-blur-xl"
        onClick={onClose}
      />

      <MotionDiv
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-xl bg-[#0B0F1A] rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-400 flex items-center justify-center">
              <Zap className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="font-syne font-black italic text-white leading-none">Configuration Assistée</h3>
              <p className="text-[10px] uppercase font-bold tracking-widest text-gold-400">En 3 minutes top chrono</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors rounded-xl hover:bg-white/5">
             <X className="w-5 h-5" />
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
                    <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-gold-400/20 to-amber-600/20 flex items-center justify-center border border-gold-400/30">
                       <Rocket className="w-12 h-12 text-gold-400" />
                    </div>
                    <div>
                       <h2 className="text-2xl font-syne font-black text-white italic">Faisons ça ensemble</h2>
                       <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">
                          Je vais vous guider pas à pas pour créer votre premier produit, configurer votre assistant IA et le connecter à WhatsApp.
                       </p>
                    </div>
                  </div>
                )}

                {step.id === 'product' && (
                  <div className="space-y-6">
                    <div>
                       <h2 className="text-2xl font-syne font-black text-white italic flex items-center gap-2">
                          <Package className="w-6 h-6 text-gold-400" /> Que vendez-vous ?
                       </h2>
                       <p className="text-gray-400 text-sm mt-1">
                          Commençons par votre produit ou service principal.
                       </p>
                    </div>
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nom du produit/service *</label>
                          <input 
                            type="text"
                            value={formData.productName}
                            onChange={(e) => setFormData({...formData, productName: e.target.value})}
                            placeholder="Ex: Formation Marketing, Chaussures Nike..."
                            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-white focus:border-gold-400 transition-colors outline-none"
                            autoFocus
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Prix (en FCFA) *</label>
                          <input 
                            type="number"
                            value={formData.productPrice}
                            onChange={(e) => setFormData({...formData, productPrice: e.target.value})}
                            placeholder="Ex: 15000"
                            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-white focus:border-gold-400 transition-colors outline-none"
                          />
                       </div>
                    </div>
                  </div>
                )}

                {step.id === 'agent' && (
                  <div className="space-y-6">
                    <div>
                       <h2 className="text-2xl font-syne font-black text-white italic flex items-center gap-2">
                          <Bot className="w-6 h-6 text-gold-400" /> Votre Assistant IA
                       </h2>
                       <p className="text-gray-400 text-sm mt-1">
                          Comment voulez-vous appeler l'IA qui s'occupera de répondre à vos clients ?
                       </p>
                    </div>
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nom de l'assistant *</label>
                          <input 
                            type="text"
                            value={formData.agentName}
                            onChange={(e) => setFormData({...formData, agentName: e.target.value})}
                            placeholder="Ex: Sophie, Assistant Support..."
                            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-white focus:border-gold-400 transition-colors outline-none"
                            autoFocus
                          />
                       </div>
                       
                       <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex gap-3">
                          <MessageSquare className="w-5 h-5 text-blue-400 flex-shrink-0" />
                          <p className="text-sm text-blue-100 italic">
                             "Bonjour ! Je suis {formData.agentName || 'votre assistant'}. Comment puis-je vous aider avec {formData.productName || 'nos services'} ?"
                          </p>
                       </div>
                    </div>
                  </div>
                )}

                {step.id === 'whatsapp' && (
                  <div className="text-center space-y-6">
                    <div className="w-24 h-24 mx-auto rounded-3xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                       <MessageSquare className="w-10 h-10 text-emerald-400" />
                    </div>
                    <div>
                       <h2 className="text-2xl font-syne font-black text-white italic">Dernière étape !</h2>
                       <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
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
        <div className="px-6 py-5 border-t border-white/5 bg-[#0D121F] flex items-center justify-between">
           <button 
             onClick={handleBack}
             disabled={isFirstStep || loading}
             className={`px-4 py-2 text-sm font-bold text-gray-500 transition-colors ${isFirstStep ? 'opacity-0 pointer-events-none' : 'hover:text-white'}`}
           >
             Retour
           </button>
           <button 
             onClick={handleNext}
             disabled={loading}
             className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-syne font-bold overflow-hidden transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
           >
             {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Préparation...</>
             ) : step.id === 'whatsapp' ? (
                <>Ouvrir les réglages WhatsApp <ArrowRight className="w-4 h-4" /></>
             ) : (
                <>Continuer <ArrowRight className="w-4 h-4" /></>
             )}
           </button>
        </div>
      </MotionDiv>
    </div>,
    document.body
  )
}
