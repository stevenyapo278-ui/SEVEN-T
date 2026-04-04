import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  ChevronRight,
  Megaphone
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const MotionDiv = motion.div

const TEMPLATES = [
  {
    id: 'commercial',
    name: 'CRM & Prospection',
    description: 'Qualifiez vos leads et relancez automatiquement vos prospects.',
    icon: Users,
    color: 'blue',
    features: ['Qualification Leads', 'Relances Auto', 'Prise de RDV', 'Notes Clients']
  },
  {
    id: 'ecommerce',
    name: 'Vente & Stock',
    description: 'Gérez votre catalogue, vos stocks et vos commandes en direct.',
    icon: Package,
    color: 'gold',
    features: ['Catalogue IA', 'Gestion Stock', 'Suivi Commandes', 'Paiements Mobiles']
  },
  {
    id: 'support',
    name: 'Support Client',
    description: 'Aidez vos clients 24h/24 et gérez votre SAV avec l\'IA.',
    icon: MessageSquare,
    color: 'emerald',
    features: ['Réponses FAQ 24/7', 'Base Connaissances', 'SAV Assisté', 'Transfert Humain']
  }
]

// AI_MODELS will be loaded from DB for admins to respect sort_order

const STEPS_CONFIG = [
  { id: 'intro', title: 'Bienvenue', icon: Sparkles },
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
  const [aiModels, setAiModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)

  // Filter steps based on user permissions
  const STEPS = STEPS_CONFIG.filter(step => !step.adminOnly || user?.is_admin)

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(`seven-t-wizard-draft-${user?.id}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return parsed.formData || { template: null, name: '', description: '', model: null }
      } catch (e) { console.error(e) }
    }
    const onboardingTemplate = localStorage.getItem('seven-t-onboarding-template')
    return { template: onboardingTemplate || null, name: '', description: '', model: null }
  })

  // Restore step on mount
  useEffect(() => {
    const saved = localStorage.getItem(`seven-t-wizard-draft-${user?.id}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (typeof parsed.currentStep === 'number' && parsed.currentStep < STEPS.length) {
          setCurrentStep(parsed.currentStep)
        }
      } catch (e) { console.error(e) }
    }
  }, [user, STEPS.length])

  // Save to localStorage on change
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`seven-t-wizard-draft-${user.id}`, JSON.stringify({ formData, currentStep }))
    }
  }, [formData, currentStep, user?.id])

  useEffect(() => {
    if (user?.is_admin) {
      const fetchModels = async () => {
        setLoadingModels(true)
        try {
          const res = await api.get('/agents/available-models')
          const models = res.data.models || []
          setAiModels(models)
          if (models.length > 0 && !formData.model) {
            setFormData(prev => ({ ...prev, model: models[0].id }))
          }
        } catch (error) {
          console.error('Failed to fetch models:', error)
        } finally {
          setLoadingModels(false)
        }
      }
      fetchModels()
    }
  }, [user])

  if (!isOpen) return null

  const currentStepId = STEPS[currentStep].id
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === STEPS.length - 1

  const canProceed = () => {
    switch (currentStepId) {
      case 'intro': return true
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
        localStorage.removeItem(`seven-t-wizard-draft-${user?.id}`)
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
  const selectedModel = aiModels.find(m => m.id === formData.model)

  const variants = {
    enter: (direction) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({ x: direction < 0 ? 50 : -50, opacity: 0 })
  }

  // createPortal : contourne le transform de Framer Motion (DashboardLayout)
  // sans ça, `fixed inset-0` est relatif au wrapper animé, pas à la viewport
  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-space-950/95 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* ── MOBILE : Bottom Sheet ── */}
      <MotionDiv
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 40 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.3 }}
        onDragEnd={(_, info) => { if (info.offset.y > 100) onClose() }}
        className="sm:hidden fixed inset-x-0 bottom-0 z-10 flex flex-col bg-[#0B0F1A] rounded-t-[2rem] border-t border-white/10 shadow-2xl overflow-hidden"
        style={{ height: '92dvh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Mobile Header */}
        <div className="flex-shrink-0 px-6 pb-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold-400 flex items-center justify-center">
              <Bot className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-white">{STEPS[currentStep].title}</span>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white"><X /></button>
        </div>

        {/* Mobile Step dots */}
        <div className="flex-shrink-0 flex justify-center gap-1.5 py-3">
          {STEPS.map((_, idx) => (
            <div key={idx} className={`h-1 rounded-full transition-all duration-500 ${
              idx === currentStep ? 'w-6 bg-gold-400' : idx < currentStep ? 'w-2 bg-emerald-400' : 'w-2 bg-white/10'
            }`} />
          ))}
        </div>

        {/* Mobile Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2 custom-scrollbar">
          <AnimatePresence mode="wait" custom={direction}>
            <MotionDiv
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-6 pb-4"
            >
              {/* Step 0: Intro */}
              {currentStepId === 'intro' && (
                <div className="space-y-8 text-center pt-4">
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 bg-gold-400/20 blur-xl rounded-full" />
                    <div className="relative w-24 h-24 bg-gradient-to-br from-gold-400 to-amber-600 rounded-[2rem] flex items-center justify-center shadow-lg">
                      <Sparkles className="w-12 h-12 text-black" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-syne font-black text-white italic">Faisons décoller votre WhatsApp</h2>
                    <p className="text-gray-400 leading-relaxed text-sm">
                      Dites adieu au chaos. SEVEN-T automatise vos **Statuts**, vos **Ventes** et votre **SAV** pendant que vous vous concentrez sur l'essentiel.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 pt-4">
                    {[
                      { icon: Megaphone, text: 'Visibilité boostée via les Statuts' },
                      { icon: Bot, text: 'Qualification de Leads 24/7' },
                      { icon: Zap, text: 'Gestion Assistée du Stock' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                         <item.icon className="w-5 h-5 text-gold-400" />
                         <span className="text-xs font-bold text-white/80">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 1: Template */}
              {currentStepId === 'template' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-syne font-black text-white italic">Choisissez son expertise</h2>
                    <p className="text-sm text-gray-400 mt-1">Quel sera le rôle de votre agent ?</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {TEMPLATES.map((template) => {
                      const Icon = template.icon
                      const isSelected = formData.template === template.id
                      return (
                        <MotionDiv
                          key={template.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setFormData({ ...formData, template: template.id, name: template.name })}
                          className={`p-5 rounded-[1.5rem] border-2 cursor-pointer transition-all relative ${
                            isSelected ? 'bg-white/5 border-gold-400 shadow-[0_0_20px_rgba(245,212,122,0.1)]' : 'bg-white/[0.02] border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center ${
                              isSelected ? 'bg-gold-400 text-black' : 'bg-white/5 text-gray-500'
                            }`}><Icon className="w-6 h-6" /></div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-syne font-bold text-white">{template.name}</h4>
                              <p className="text-xs text-gray-500 line-clamp-1">{template.description}</p>
                            </div>
                            {isSelected && (
                              <div className="w-7 h-7 rounded-full bg-gold-400 flex items-center justify-center flex-shrink-0">
                                <Check className="w-4 h-4 text-black" />
                              </div>
                            )}
                          </div>
                        </MotionDiv>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Name */}
              {currentStepId === 'name' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-syne font-black text-white italic">Son identité</h2>
                    <p className="text-sm text-gray-400 mt-1">Comment vos clients l'appelleront ?</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Nom de l'expert</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Sophie, Assistant Commercial..."
                        className="w-full bg-white/[0.02] border-white/10 border-2 rounded-2xl py-4 px-5 text-lg font-bold text-white placeholder:text-white/20 focus:border-gold-400 transition-all outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Personnalité (optionnel)</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Ex: Très poli, passionné par la mode..."
                        className="w-full bg-white/[0.02] border-white/10 border-2 rounded-2xl p-4 h-24 text-base text-white placeholder:text-white/20 focus:border-gold-400 transition-all outline-none resize-none"
                      />
                    </div>
                    <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-start gap-3">
                      <MessageSquare className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-white italic">
                        "Bonjour ! 👋 Je suis <span className="text-gold-400">{formData.name || 'votre assistant'}</span>. Comment puis-je vous aider ?"
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Model (admin only) */}
              {currentStepId === 'model' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-syne font-black text-white italic">Son cerveau</h2>
                    <p className="text-sm text-gray-400 mt-1">L'IA qui pilote les réponses.</p>
                  </div>
                  <div className="space-y-3">
                    {loadingModels ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gold-400" /></div>
                    ) : aiModels.map((model, idx) => {
                      const isSelected = formData.model === model.id
                      return (
                        <div key={model.id} onClick={() => setFormData({ ...formData, model: model.id })}
                          className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                            isSelected ? 'bg-white/5 border-gold-400' : 'bg-white/[0.02] border-white/5'
                          }`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-gold-400 text-black' : 'bg-white/5 text-gray-500'
                          }`}><Sparkles className="w-5 h-5" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-white text-sm">{model.name}</h4>
                              {idx === 0 && <span className="text-[10px] font-black uppercase text-gold-400 bg-gold-400/10 px-1.5 py-0.5 rounded">Recommandé</span>}
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-1">{model.description}</p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-gold-400 flex-shrink-0" />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Step 4: Confirm */}
              {currentStepId === 'confirm' && (
                <div className="space-y-6">
                  <div className="text-center pt-2">
                    <MotionDiv
                      animate={{ y: [0, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-20 h-20 mx-auto bg-gradient-to-br from-gold-400 to-amber-600 rounded-[1.5rem] flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(245,212,122,0.2)]"
                    >
                      <Rocket className="w-10 h-10 text-black" />
                    </MotionDiv>
                    <h2 className="text-2xl font-syne font-black text-white italic">Prêt pour le décollage ?</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <span className="text-[10px] font-black uppercase text-white/20 block mb-2">Mission</span>
                      <p className="text-white font-black text-sm">{selectedTemplate?.name}</p>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <span className="text-[10px] font-black uppercase text-white/20 block mb-2">Identité</span>
                      <p className="text-white font-black text-sm">{formData.name}</p>
                    </div>
                  </div>
                  <div className="p-5 bg-gold-400/5 rounded-2xl border border-gold-400/10">
                    <h4 className="font-bold text-gold-400 text-xs uppercase mb-3 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" />Prochaines étapes</h4>
                    <ul className="space-y-2">
                      {['Connexion WhatsApp Business', 'Enrichir la base de connaissances', 'Mettre en ligne l\'expert'].map((s, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-400">
                          <div className="w-5 h-5 rounded-full bg-gold-400/20 text-gold-400 flex items-center justify-center text-[10px] font-black flex-shrink-0">{i+1}</div>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </MotionDiv>
          </AnimatePresence>
        </div>

        {/* Mobile Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-white/5 bg-[#0B0F1A] flex items-center justify-between gap-3">
          <button
            onClick={handleBack}
            disabled={creating || isFirstStep}
            className={`flex items-center gap-1.5 font-bold py-3.5 px-5 rounded-xl transition-all text-sm ${
              isFirstStep ? 'opacity-0 pointer-events-none' : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed() || creating}
            className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-3.5 px-6 rounded-xl font-syne font-bold transition-all active:scale-95 disabled:opacity-50 disabled:grayscale text-sm"
          >
            {creating ? (<><Loader2 className="w-4 h-4 animate-spin" />Initialisation...</>) :
             isLastStep ? (<><Rocket className="w-4 h-4" />Générer l'expert</>) :
             (<>Étape suivante <ChevronRight className="w-4 h-4" /></>)}
          </button>
        </div>
      </MotionDiv>

      {/* ── DESKTOP : Modal centré (inchangé) ── */}
      <div className="hidden sm:flex fixed inset-0 z-10 items-center justify-center p-4">

      
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
              <span className="font-syne font-black text-white italic">SEVEN T</span>
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
                      <span className={`font-syne font-bold transition-colors ${idx === currentStep ? 'text-white' : 'text-white/20'}`}>{step.title}</span>
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
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Close button Desktop */}
          <button 
            onClick={onClose} 
            className="hidden lg:flex absolute top-8 right-8 p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all z-10"
          >
            <X className="w-6 h-6" />
          </button>

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
                {/* Step 0: Intro (Desktop) */}
                {currentStepId === 'intro' && (
                  <div className="space-y-10 py-4">
                    <div className="flex items-start gap-8">
                       <div className="relative w-32 h-32 flex-shrink-0">
                          <div className="absolute inset-0 bg-gold-400/20 blur-2xl rounded-full animate-pulse" />
                          <div className="relative w-32 h-32 bg-gradient-to-br from-gold-400 to-amber-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
                            <Sparkles className="w-16 h-16 text-black" />
                          </div>
                       </div>
                       <div className="space-y-4">
                          <h2 className="text-4xl sm:text-5xl font-syne font-black text-white italic leading-tight">
                            Votre business <br /> en <span className="text-gold-400">pilote automatique</span>.
                          </h2>
                          <p className="text-xl text-gray-400 leading-relaxed max-w-lg">
                            Bienvenue sur SEVEN-T. L'IA qui ne se contente pas de répondre, elle **propulse** votre croissance sur WhatsApp.
                          </p>
                       </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 pt-6">
                      {[
                        { icon: Megaphone, title: 'Statuts ROI', desc: 'Attirez des clients sans effort' },
                        { icon: Bot, title: 'IA Vendeuse', desc: 'Relancez et concluez 24/7' },
                        { icon: Zap, title: 'CRM Assisté', desc: 'Videz votre stock, remplissez votre CRM' }
                      ].map((item, i) => (
                        <div key={i} className="p-6 bg-white/[0.02] border border-white/10 rounded-3xl group hover:border-gold-400/30 transition-all">
                           <item.icon className="w-8 h-8 text-gold-400 mb-4 group-hover:scale-110 transition-transform" />
                           <h4 className="text-white font-bold text-lg mb-1 italic">{item.title}</h4>
                           <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 1: Template Selection */}
                {currentStepId === 'template' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-3xl sm:text-4xl font-syne font-black text-white mb-2 italic">Choisissez son expertise</h2>
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
                            <h4 className="font-syne font-bold text-lg text-white mb-2">{template.name}</h4>
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
                      <h2 className="text-3xl sm:text-4xl font-syne font-black text-white mb-2 italic">Son identité</h2>
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
                      <h2 className="text-3xl sm:text-4xl font-syne font-black text-white mb-2 italic">Son cerveau</h2>
                      <p className="text-gray-400">L'intelligence artificielle qui pilote les réponses.</p>
                    </div>

                    <div className="space-y-4">
                      {loadingModels ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                           <Loader2 className="w-8 h-8 animate-spin text-gold-400" />
                           <p className="text-gray-500 font-medium">Chargement des cerveaux disponibles...</p>
                        </div>
                      ) : (
                        aiModels.map((model, idx) => {
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
                                    <h4 className="font-syne font-bold text-white mb-0.5">{model.name}</h4>
                                    {idx === 0 && <span className="text-[10px] font-black uppercase text-gold-400 bg-gold-400/10 px-2 py-0.5 rounded">Recommandé</span>}
                                    {model.is_free === 1 && <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">Gratuit</span>}
                                 </div>
                                 <p className="text-xs text-gray-500">{model.description}</p>
                              </div>
                              <div className="text-right">
                                 <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-gold-400/50">
                                    {isSelected && <Check className="w-4 h-4 text-gold-400" />}
                                 </div>
                              </div>
                            </div>
                          )
                        })
                      )}
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
                       <h2 className="text-4xl font-syne font-black text-white italic">Prêt pour le décollage ?</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                          <span className="text-[10px] font-black uppercase text-white/20 block mb-2">Configuration</span>
                          <div className="flex items-center gap-3">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${selectedTemplate?.color}-500/20 text-${selectedTemplate?.color}-400`}>
                                {selectedTemplate && <selectedTemplate.icon className="w-5 h-5" />}
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

                    <div className="p-8 bg-gradient-to-br from-gold-400/5 to-amber-600/5 rounded-[2rem] border border-gold-400/10">
                       <h4 className="font-syne font-bold text-gold-400 uppercase text-xs mb-4 flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Capacités de votre expert
                       </h4>
                       <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          {(selectedTemplate?.features || []).map((feature, i) => (
                             <div key={i} className="flex items-center gap-2 text-gray-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-gold-400" />
                                <span className="text-xs font-medium">{feature}</span>
                             </div>
                          ))}
                       </div>
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
                className="group relative flex items-center gap-4 bg-white text-black px-10 py-5 rounded-2xl font-syne font-bold overflow-hidden transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:grayscale"
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
                        <span className="font-syne font-bold uppercase tracking-tight">Étape suivante</span>
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
    </div>,
    document.body
  )
}
