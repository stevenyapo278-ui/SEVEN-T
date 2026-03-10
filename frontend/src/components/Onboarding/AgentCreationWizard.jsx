import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { 
  Bot, 
  MessageSquare, 
  Package, 
  Users, 
  Calendar,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  X,
  Loader2,
  Zap,
  HelpCircle,
  Target,
  Rocket,
  ShieldCheck,
  ChevronRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const MotionDiv = motion.div

const TEMPLATES = [
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Vente de produits, gestion du stock, commandes',
    icon: Package,
    color: 'gold',
    features: ['Catalogue produits', 'Gestion du stock', 'Détection de commandes', 'Prix et disponibilité']
  },
  {
    id: 'commercial',
    name: 'Commercial',
    description: 'Prospection, vente, conversion de leads',
    icon: Target,
    color: 'blue',
    features: ['Qualification de prospects', 'Présentation des offres', 'Gestion des objections', 'Prise de RDV']
  },
  {
    id: 'support',
    name: 'Support Client',
    description: 'Aide, dépannage, résolution de problèmes',
    icon: MessageSquare,
    color: 'emerald',
    features: ['Résolution de problèmes', 'Instructions étape par étape', 'Transfert humain', 'Suivi satisfaction']
  },
  {
    id: 'faq',
    name: 'FAQ / Informations',
    description: 'Réponses aux questions fréquentes',
    icon: HelpCircle,
    color: 'purple',
    features: ['Réponses rapides', 'Base de connaissances', 'Redirection ressources', 'Factuel et concis']
  },
  {
    id: 'appointment',
    name: 'Prise de RDV',
    description: 'Gestion des rendez-vous et calendrier',
    icon: Calendar,
    color: 'orange',
    features: ['Disponibilités', 'Confirmation RDV', 'Rappels', 'Reports et annulations']
  }
]

const AI_MODELS = [
  { 
    id: 'models/gemini-2.5-flash', 
    name: 'Gemini 2.5 Flash', 
    description: 'Dernier modèle Google, très rapide',
    credits: 1,
    recommended: true
  },
  { 
    id: 'gemini-1.5-flash', 
    name: 'Gemini 1.5 Flash', 
    description: 'Rapide et efficace',
    credits: 1
  },
  { 
    id: 'qwen/qwen3-next-80b-a3b-instruct:free', 
    name: 'Qwen 3 80B', 
    description: 'Gratuit et puissant',
    credits: 0,
    free: true
  },
  { 
    id: 'tngtech/deepseek-r1t-chimera:free', 
    name: 'DeepSeek R1', 
    description: 'Gratuit, bon raisonnement',
    credits: 0,
    free: true
  },
  { 
    id: 'gpt-4o-mini', 
    name: 'GPT-4o Mini', 
    description: 'OpenAI, très intelligent',
    credits: 2
  }
]

const STEPS_CONFIG = [
  { id: 'template', title: 'Mission', icon: Target },
  { id: 'name', title: 'Identité', icon: Bot },
  { id: 'model', title: 'Cerveau', adminOnly: true, icon: Sparkles },
  { id: 'confirm', title: 'Lancement', icon: Rocket }
]

export default function AgentCreationWizard({ isOpen, onClose, onSuccess }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(0)
  const [creating, setCreating] = useState(false)

  // Filter steps based on user permissions
  const STEPS = STEPS_CONFIG.filter(step => !step.adminOnly || user?.is_admin)

  const [formData, setFormData] = useState({
    template: null,
    name: '',
    description: '',
    model: 'models/gemini-2.5-flash'
  })

  if (!isOpen) return null

  const currentStepId = STEPS[currentStep].id
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === STEPS.length - 1

  const canProceed = () => {
    switch (currentStepId) {
      case 'template': return formData.template !== null
      case 'name': return formData.name.trim().length >= 2
      case 'model': return formData.model !== null
      case 'confirm': return true
      default: return false
    }
  }

  const handleNext = async () => {
    if (isLastStep) {
      setCreating(true)
      try {
        const response = await api.post('/agents', {
          name: formData.name,
          description: formData.description || TEMPLATES.find(t => t.id === formData.template)?.description,
          template: formData.template,
          model: user?.is_admin ? formData.model : undefined
        })
        
        toast.success('Agent créé avec succès ! 🎉')
        onSuccess?.(response.data.agent)
        onClose()
        navigate(`/dashboard/agents/${response.data.agent.id}`)
      } catch (error) {
        toast.error(error.response?.data?.error || 'Erreur lors de la création')
      } finally {
        setCreating(false)
      }
    } else {
      setDirection(1)
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setDirection(-1)
      setCurrentStep(prev => prev - 1)
    }
  }

  const selectedTemplate = TEMPLATES.find(t => t.id === formData.template)
  const selectedModel = AI_MODELS.find(m => m.id === formData.model)

  const variants = {
    enter: (direction) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({ x: direction < 0 ? 50 : -50, opacity: 0 })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <MotionDiv 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="fixed inset-0 bg-space-950/95 backdrop-blur-xl" 
        onClick={onClose} 
      />
      
      <MotionDiv 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col lg:flex-row bg-[#0B0F1A] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Sidebar Steps (Desktop) */}
        <div className="hidden lg:flex lg:w-72 bg-white/[0.02] border-r border-white/5 p-8 flex-col">
           <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 rounded-xl bg-gold-400 flex items-center justify-center">
                 <Bot className="w-6 h-6 text-black" />
              </div>
              <span className="font-display font-black text-white italic">SEVEN T</span>
           </div>

           <div className="space-y-6">
              {STEPS.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-4 group">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                     idx === currentStep ? 'bg-gold-400 border-gold-400 text-black shadow-[0_0_20px_rgba(245,212,122,0.3)]' : 
                     idx < currentStep ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 text-white/20'
                   }`}>
                      {idx < currentStep ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                   </div>
                   <div className="flex flex-col">
                      <span className={`text-[10px] uppercase font-black tracking-widest ${idx === currentStep ? 'text-gold-400/50' : 'text-white/10'}`}>Étape {idx + 1}</span>
                      <span className={`font-bold transition-colors ${idx === currentStep ? 'text-white' : 'text-white/20'}`}>{step.title}</span>
                   </div>
                </div>
              ))}
           </div>

           <div className="mt-auto p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                 <ShieldCheck className="w-4 h-4 text-emerald-400" />
                 <span className="text-[10px] font-black uppercase text-emerald-400">Sécurisé par IA</span>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                 Votre agent sera prêt à répondre à vos clients dès la fin de cette configuration.
              </p>
           </div>
        </div>

        {/* content Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header Mobile */}
          <div className="lg:hidden p-6 border-b border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gold-400 flex items-center justify-center">
                   <Bot className="w-5 h-5 text-black" />
                </div>
                <span className="font-bold text-white">{STEPS[currentStep].title}</span>
             </div>
             <button onClick={onClose} className="p-2 text-gray-500"><X /></button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-8 sm:p-12 custom-scrollbar">
            <AnimatePresence mode="wait" custom={direction}>
              <MotionDiv
                key={currentStep}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Step 1: Template Selection */}
                {currentStepId === 'template' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-3xl sm:text-4xl font-display font-black text-white mb-2 italic">Choisissez son expertise</h2>
                      <p className="text-gray-400">Quel sera le rôle principal de votre futur agent ?</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {TEMPLATES.map((template) => {
                        const Icon = template.icon
                        const isSelected = formData.template === template.id
                        return (
                          <MotionDiv
                            key={template.id}
                            whileHover={{ y: -4 }}
                            onClick={() => setFormData({ ...formData, template: template.id, name: template.name })}
                            className={`p-6 rounded-[2rem] border-2 text-left transition-all cursor-pointer relative group overflow-hidden ${
                              isSelected ? 'bg-white/5 border-gold-400 shadow-[0_0_30px_rgba(245,212,122,0.1)]' : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center transition-all ${
                              isSelected ? 'bg-gold-400 text-black scale-110' : 'bg-white/5 text-gray-500 group-hover:text-white'
                            }`}>
                              <Icon className="w-7 h-7" />
                            </div>
                            <h4 className="font-black text-xl text-white mb-2">{template.name}</h4>
                            <p className="text-sm text-gray-500 leading-snug line-clamp-2">{template.description}</p>
                            
                            {isSelected && (
                              <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gold-400 flex items-center justify-center">
                                 <Check className="w-5 h-5 text-black" />
                              </div>
                            )}
                          </MotionDiv>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Step 2: Name and Identity */}
                {currentStepId === 'name' && (
                  <div className="space-y-10">
                    <div>
                      <h2 className="text-3xl sm:text-4xl font-display font-black text-white mb-2 italic">Son identité</h2>
                      <p className="text-gray-400">Comment vos clients doivent-ils l'appeler ?</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Nom de l'expert</label>
                        <div className="relative group">
                           <div className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-focus-within:border-gold-400/50 transition-colors">
                              <Bot className="w-5 h-5 text-gray-500 group-focus-within:text-gold-400" />
                           </div>
                           <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Sophie, Assistant Commercial..."
                            className="w-full bg-white/[0.02] border-white/10 border-2 rounded-3xl py-6 pl-20 pr-8 text-xl font-bold text-white placeholder:text-white/10 focus:border-gold-400 focus:bg-white/5 transition-all outline-none"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Sa personnalité (optionnel)</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Ex: Très poli, passionné par la mode, réponds avec des emojis..."
                          className="w-full bg-white/[0.02] border-white/10 border-2 rounded-3xl p-6 h-32 text-lg text-white placeholder:text-white/10 focus:border-gold-400 focus:bg-white/5 transition-all outline-none resize-none"
                        />
                      </div>
                    </div>

                    <div className="p-8 bg-blue-500/5 rounded-3xl border border-blue-500/10 flex items-start gap-4">
                       <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-5 h-5 text-blue-400" />
                       </div>
                       <div>
                          <p className="text-xs font-black uppercase tracking-widest text-blue-400/50 mb-1">Aperçu du premier contact</p>
                          <p className="text-white font-medium italic">
                             "Bonjour ! 👋 Je suis <span className="text-gold-400">{formData.name || 'votre assistant'}</span>. Comment puis-je vous aider aujourd'hui ?"
                          </p>
                       </div>
                    </div>
                  </div>
                )}

                {/* Step 3: AI Brain Selection */}
                {currentStepId === 'model' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-3xl sm:text-4xl font-display font-black text-white mb-2 italic">Son cerveau</h2>
                      <p className="text-gray-400">L'intelligence artificielle qui pilote les réponses.</p>
                    </div>

                    <div className="space-y-4">
                      {AI_MODELS.map((model) => {
                        const isSelected = formData.model === model.id
                        return (
                          <div
                            key={model.id}
                            onClick={() => setFormData({ ...formData, model: model.id })}
                            className={`p-6 rounded-3xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
                              isSelected ? 'bg-white/5 border-gold-400 shadow-[0_0_20px_rgba(245,212,122,0.1)]' : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSelected ? 'bg-gold-400 text-black' : 'bg-white/5 text-gray-500'}`}>
                              <Sparkles className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-white mb-0.5">{model.name}</h4>
                                  {model.recommended && <span className="text-[10px] font-black uppercase text-gold-400 bg-gold-400/10 px-2 py-0.5 rounded">Recommandé</span>}
                                  {model.free && <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">Gratuit</span>}
                               </div>
                               <p className="text-xs text-gray-500">{model.description}</p>
                            </div>
                            <div className="text-right">
                               <span className={`text-xl font-black ${model.credits === 0 ? 'text-emerald-400' : 'text-gold-400'}`}>{model.credits}</span>
                               <span className="text-[10px] block font-bold text-gray-600 uppercase">Credits</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Step 4: Final Launch */}
                {currentStepId === 'confirm' && (
                  <div className="space-y-8">
                    <div className="text-center">
                       <MotionDiv 
                        animate={{ y: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-24 h-24 mx-auto bg-gradient-to-br from-gold-400 to-amber-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(245,212,122,0.2)]"
                       >
                          <Rocket className="w-12 h-12 text-black" />
                       </MotionDiv>
                       <h2 className="text-4xl font-display font-black text-white italic">Prêt pour le décollage ?</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                          <span className="text-[10px] font-black uppercase text-white/20 block mb-2">Configuration</span>
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <Target className="w-5 h-5" />
                             </div>
                             <div>
                                <p className="text-xs text-blue-400 font-bold uppercase">Mission</p>
                                <p className="text-white font-black">{selectedTemplate?.name}</p>
                             </div>
                          </div>
                       </div>
                       <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                          <span className="text-[10px] font-black uppercase text-white/20 block mb-2">Identité</span>
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <Bot className="w-5 h-5" />
                             </div>
                             <div>
                                <p className="text-xs text-emerald-400 font-bold uppercase">Nom</p>
                                <p className="text-white font-black">{formData.name}</p>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="p-8 bg-gold-400/5 rounded-[2rem] border border-gold-400/10">
                       <h4 className="text-gold-400 font-black uppercase text-xs mb-4 flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Prochaines étapes
                       </h4>
                       <ul className="space-y-3">
                          {[
                            'Connexion de votre numéro WhatsApp Business',
                            'Enrichissement de la base de connaissances',
                            'Mise en ligne de l\'expert'
                          ].map((step, i) => (
                            <li key={i} className="flex items-center gap-3 text-gray-400">
                               <div className="w-5 h-5 rounded-full bg-gold-400/20 text-gold-400 flex items-center justify-center text-[10px] font-black">{i+1}</div>
                               <span className="text-sm font-medium">{step}</span>
                            </li>
                          ))}
                       </ul>
                    </div>
                  </div>
                )}
              </MotionDiv>
            </AnimatePresence>
          </div>

          {/* Footer Controls */}
          <div className="mt-auto p-8 border-t border-white/5 bg-[#0B0F1A] flex items-center justify-between">
             <button
                type="button"
                onClick={handleBack}
                disabled={creating || isFirstStep}
                className={`flex items-center gap-2 font-black uppercase py-4 px-6 rounded-2xl transition-all ${
                  isFirstStep ? 'opacity-0 pointer-events-none' : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Retour</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed() || creating}
                className="group relative flex items-center gap-4 bg-white text-black px-10 py-5 rounded-2xl font-black overflow-hidden transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:grayscale"
              >
                <span className="relative z-10 flex items-center gap-3">
                   {creating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Initialisation...
                      </>
                    ) : isLastStep ? (
                      <>
                        <Rocket className="w-5 h-5" />
                        Générer l'expert
                      </>
                    ) : (
                      <>
                        Étape suivante
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                </span>
                <div className="absolute inset-0 bg-gold-400 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              </button>
          </div>
        </div>
      </MotionDiv>
    </div>
  )
}
