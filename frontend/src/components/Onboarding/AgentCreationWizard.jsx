import { useState, useEffect, useMemo, useCallback } from 'react'
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
  ArrowLeft,
  Check,
  Sparkles,
  X,
  Loader2,
  Zap,
  Target,
  Rocket,
  ShieldCheck,
  ChevronRight,
  Megaphone
} from 'lucide-react'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

// ─── Sub-components for Steps ───────────────────────────────────────────────

const StepIntro = ({ isDark }) => (
  <div className="space-y-8 sm:space-y-10 text-center sm:text-left pt-4">
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
      <div className="relative size-24 sm:size-32 flex-shrink-0">
        <div className="absolute inset-0 bg-gold-400/20 blur-2xl rounded-full animate-pulse" />
        <div className="relative size-24 sm:size-32 bg-gradient-to-br from-gold-400 to-amber-600 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center shadow-2xl">
          <Sparkles className={`size-12 sm:size-16 ${isDark ? 'text-black' : 'text-white'}`} />
        </div>
      </div>
      <div className="space-y-4">
        <h2 className={`text-3xl sm:text-5xl font-syne font-black italic leading-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Votre business <br className="hidden sm:block" /> en <span className="text-gold-400">pilote automatique</span>.
        </h2>
        <p className={`text-base sm:text-xl leading-relaxed max-w-lg ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Bienvenue sur SEVEN-T. L'IA qui ne se contente pas de répondre, elle **propulse** votre croissance sur WhatsApp.
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 pt-4 sm:pt-6">
      {[
        { id: 'feat-1', icon: Megaphone, title: 'Statuts ROI', desc: 'Attirez des clients sans effort' },
        { id: 'feat-2', icon: Bot, title: 'IA Vendeuse', desc: 'Relancez et concluez 24/7' },
        { id: 'feat-3', icon: Zap, title: 'CRM Assisté', desc: 'Videz votre stock, remplissez votre CRM' }
      ].map((item) => (
        <div key={item.id} className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl group transition-all border ${
          isDark ? 'bg-white/[0.02] border-white/10 hover:border-gold-400/30' : 'bg-zinc-50 border-zinc-100 hover:border-gold-400/30 shadow-sm'
        }`}>
          <item.icon className="size-5 sm:size-8 text-gold-400 mb-2 sm:mb-4 group-hover:scale-110 transition-transform" />
          <h4 className={`font-semibold text-sm sm:text-lg mb-1 italic ${isDark ? 'text-white' : 'text-zinc-900'}`}>{item.title}</h4>
          <p className={`text-[10px] sm:text-xs leading-relaxed ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{item.desc}</p>
        </div>
      ))}
    </div>
  </div>
)

const StepTemplate = ({ isDark, templates, selectedId, onSelect }) => (
  <div className="space-y-6 sm:space-y-8">
    <div>
      <h2 className={`text-2xl sm:text-4xl font-syne font-black mb-2 italic ${isDark ? 'text-white' : 'text-zinc-900'}`}>Choisissez son expertise</h2>
      <p className={`text-sm sm:text-base ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Quel sera le rôle principal de votre futur agent ?</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {templates.map((template) => {
        const Icon = template.icon
        const isSelected = selectedId === template.id
        return (
          <m.div
            key={template.id}
            whileTap={{ scale: 0.98 }}
            whileHover={{ y: -4 }}
            onClick={() => onSelect(template)}
            className={`p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-2 text-left transition-all cursor-pointer relative group overflow-hidden ${
              isSelected 
                ? 'bg-gold-400/5 border-gold-400 shadow-[0_0_30px_rgba(245,212,122,0.1)]' 
                : isDark ? 'bg-white/[0.02] border-white/5 hover:border-white/20' : 'bg-zinc-50 border-zinc-100 hover:border-gold-400/30 shadow-sm'
            }`}
          >
            <div className={`size-12 sm:size-14 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 flex items-center justify-center transition-all ${
              isSelected ? `bg-gold-400 ${isDark ? 'text-black' : 'text-white'}` : isDark ? 'bg-white/5 text-zinc-500 group-hover:text-white' : 'bg-zinc-200 text-zinc-500 group-hover:text-zinc-900'
            }`}>
              <Icon className="size-6 sm:size-7" />
            </div>
            <h4 className={`font-syne font-semibold text-base sm:text-lg mb-1 sm:mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{template.name}</h4>
            <p className={`text-xs sm:text-sm leading-snug line-clamp-2 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{template.description}</p>
            {isSelected && (
              <div className="absolute top-4 sm:top-6 right-4 sm:right-6 size-7 sm:size-8 rounded-full bg-gold-400 flex items-center justify-center">
                <Check className={`size-4 sm:size-5 ${isDark ? 'text-black' : 'text-white'}`} />
              </div>
            )}
          </m.div>
        )
      })}
    </div>
  </div>
)

const StepIdentity = ({ isDark, name, description, onChange }) => (
  <div className="space-y-6 sm:space-y-10">
    <div>
      <h2 className={`text-2xl sm:text-4xl font-syne font-black mb-2 italic ${isDark ? 'text-white' : 'text-zinc-900'}`}>Son identité</h2>
      <p className={`text-sm sm:text-base ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Comment vos clients doivent-ils l'appeler ?</p>
    </div>
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-2 sm:space-y-3">
        <label htmlFor="agent-name-input" className={`text-[10px] font-black uppercase tracking-[0.2em] ml-1 ${isDark ? 'text-white/30' : 'text-zinc-400'}`}>Nom de l'expert</label>
        <div className="relative group">
           <div className={`absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 size-9 sm:size-10 rounded-lg sm:rounded-xl flex items-center justify-center border group-focus-within:border-gold-400/50 transition-colors ${
             isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-200 border-zinc-300'
           }`}>
              <Bot className={`size-5 group-focus-within:text-gold-400 transition-colors ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`} />
           </div>
           <input
            id="agent-name-input"
            type="text"
            value={name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Ex: Sophie, Assistant Commercial…"
            className={`w-full border-2 rounded-2xl sm:rounded-3xl py-4 sm:py-6 pl-16 sm:pl-20 pr-6 sm:pr-8 text-lg sm:text-xl font-bold transition-all outline-none ${
              isDark 
                ? 'bg-white/[0.02] border-white/10 text-white placeholder:text-white/10 focus:border-gold-400 focus:bg-white/5' 
                : 'bg-zinc-50 border-zinc-100 text-zinc-900 placeholder:text-zinc-300 focus:border-gold-400 focus:bg-white shadow-sm'
            }`}
          />
        </div>
      </div>
      <div className="space-y-2 sm:space-y-3">
        <label htmlFor="agent-desc-input" className={`text-[10px] font-black uppercase tracking-[0.2em] ml-1 ${isDark ? 'text-white/30' : 'text-zinc-400'}`}>Sa personnalité (optionnel)</label>
        <textarea
          id="agent-desc-input"
          value={description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Ex: Très poli, passionné par la mode, réponds avec des emojis…"
          className={`w-full border-2 rounded-2xl sm:rounded-3xl p-4 sm:p-6 h-24 sm:h-32 text-base sm:text-lg transition-all outline-none resize-none ${
            isDark 
              ? 'bg-white/[0.02] border-white/10 text-white placeholder:text-white/10 focus:border-gold-400 focus:bg-white/5' 
              : 'bg-zinc-50 border-zinc-100 text-zinc-900 placeholder:text-zinc-300 focus:border-gold-400 focus:bg-white shadow-sm'
          }`}
        />
      </div>
    </div>
    <div className={`p-5 sm:p-8 rounded-2xl sm:rounded-3xl border flex items-start gap-3 sm:gap-4 ${
      isDark ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50 border-blue-100'
    }`}>
       <div className="size-8 sm:size-10 rounded-lg sm:rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="size-4 sm:size-5 text-blue-400" />
       </div>
       <div>
          <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-blue-400/50' : 'text-blue-300'}`}>Aperçu du premier contact</p>
          <p className={`text-sm sm:text-base font-medium italic ${isDark ? 'text-white' : 'text-blue-900'}`}>
             "Bonjour ! 👋 Je suis <span className="text-gold-400">{name || 'votre assistant'}</span>. Comment puis-je vous aider aujourd'hui ?"
          </p>
       </div>
    </div>
  </div>
)

const StepBrain = ({ isDark, models, selectedId, loading, onSelect }) => (
  <div className="space-y-6 sm:space-y-8">
    <div>
      <h2 className={`text-2xl sm:text-4xl font-syne font-black mb-2 italic ${isDark ? 'text-white' : 'text-zinc-900'}`}>Son cerveau</h2>
      <p className={`text-sm sm:text-base ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>L'intelligence artificielle qui pilote les réponses.</p>
    </div>
    <div className="space-y-3 sm:space-y-4">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
           <Loader2 className="size-8 animate-spin text-gold-400" />
           <p className="text-zinc-500 font-medium">Chargement des cerveaux disponibles…</p>
        </div>
      ) : models.map((model, idx) => {
        const isSelected = selectedId === model.id
        return (
          <div
            key={model.id}
            onClick={() => onSelect(model.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(model.id) }}
            className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 cursor-pointer transition-all flex items-center gap-3 sm:gap-4 ${
              isSelected 
                ? 'bg-gold-400/5 border-gold-400 shadow-[0_0_20px_rgba(245,212,122,0.1)]' 
                : isDark ? 'bg-white/[0.02] border-white/5 hover:border-white/20' : 'bg-zinc-50 border-zinc-100 hover:border-gold-400/30 shadow-sm'
            }`}
          >
            <div className={`size-10 sm:size-12 rounded-lg sm:rounded-2xl flex items-center justify-center ${isSelected ? `bg-gold-400 ${isDark ? 'text-black' : 'text-white'}` : isDark ? 'bg-white/5 text-zinc-500' : 'bg-zinc-200 text-zinc-500'}`}>
              <Sparkles className="size-5 sm:size-6" />
            </div>
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 flex-wrap">
                  <h4 className={`font-syne font-semibold text-sm sm:text-base ${isDark ? 'text-white' : 'text-zinc-900'}`}>{model.name}</h4>
                  {idx === 0 && <span className="text-[9px] sm:text-[10px] font-black uppercase text-gold-400 bg-gold-400/10 px-1.5 sm:px-2 py-0.5 rounded">Recommandé</span>}
                  {model.is_free === 1 && <span className="text-[9px] sm:text-[10px] font-black uppercase text-emerald-400 bg-emerald-400/10 px-1.5 sm:px-2 py-0.5 rounded">Gratuit</span>}
               </div>
               <p className={`text-[10px] sm:text-xs line-clamp-1 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{model.description}</p>
            </div>
            {isSelected && <Check className="size-4 sm:size-5 text-gold-400 flex-shrink-0" />}
          </div>
        )
      })}
    </div>
  </div>
)

const StepConfirm = ({ isDark, selectedTemplate, formData }) => (
  <div className="space-y-6 sm:space-y-8">
    <div className="text-center">
       <m.div 
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="size-20 sm:size-24 mx-auto bg-gradient-to-br from-gold-400 to-amber-600 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center mb-4 sm:mb-6 shadow-[0_0_50px_rgba(245,212,122,0.25)]"
       >
          <Rocket className={`size-10 sm:size-12 ${isDark ? 'text-black' : 'text-white'}`} />
       </m.div>
       <h2 className={`text-2xl sm:text-4xl font-syne font-black italic ${isDark ? 'text-white' : 'text-zinc-900'}`}>Prêt pour le décollage ?</h2>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
       <div className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-zinc-50 border-zinc-100 shadow-sm'}`}>
          <span className={`text-[10px] font-black uppercase block mb-2 ${isDark ? 'text-white/20' : 'text-zinc-400'}`}>Configuration</span>
          <div className="flex items-center gap-3">
             <div className={`size-9 sm:size-10 rounded-lg sm:rounded-xl flex items-center justify-center bg-blue-500/20 text-blue-400`}>
                {selectedTemplate && <selectedTemplate.icon className="size-4 sm:size-5" />}
             </div>
             <div>
                <p className="text-[10px] text-blue-400 font-bold uppercase">Mission</p>
                <p className={`text-sm sm:text-base font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>{selectedTemplate?.name}</p>
             </div>
          </div>
       </div>
       <div className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-zinc-50 border-zinc-100 shadow-sm'}`}>
          <span className={`text-[10px] font-black uppercase block mb-2 ${isDark ? 'text-white/20' : 'text-zinc-400'}`}>Identité</span>
          <div className="flex items-center gap-3">
             <div className="size-9 sm:size-10 rounded-lg sm:rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Bot className="size-4 sm:size-5" />
             </div>
             <div>
                <p className="text-[10px] text-emerald-400 font-bold uppercase">Nom</p>
                <p className={`text-sm sm:text-base font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>{formData.name}</p>
             </div>
          </div>
       </div>
    </div>

    <div className={`p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border ${
      isDark ? 'bg-gradient-to-br from-gold-400/5 to-amber-600/5 border-gold-400/10' : 'bg-gold-50 border-gold-100 shadow-sm'
    }`}>
       <h4 className="font-syne font-semibold text-gold-400 uppercase text-xs mb-4 flex items-center gap-2">
          <Zap className="size-4" />
          Capacités de votre expert
       </h4>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {(selectedTemplate?.features || []).map((feature) => (
             <div key={feature} className={`flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                <div className="size-1.5 rounded-full bg-gold-400" />
                <span className="text-xs font-medium">{feature}</span>
             </div>
          ))}
       </div>
    </div>
  </div>
)

// ─── Main Component ──────────────────────────────────────────────────────────

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
  const { isDark } = useTheme()
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(0)
  const [creating, setCreating] = useState(false)
  const [aiModels, setAiModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)

  // Filter steps based on user permissions
  const STEPS = useMemo(() => STEPS_CONFIG.filter(step => !step.adminOnly || user?.is_admin), [user?.is_admin])

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

  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleTemplateSelect = useCallback((template) => {
    setFormData(prev => ({ ...prev, template: template.id, name: template.name }))
  }, [])

  const handleBrainSelect = useCallback((modelId) => {
    setFormData(prev => ({ ...prev, model: modelId }))
  }, [])

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
  }, [user, formData.model])

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

  const selectedTemplate = useMemo(() => TEMPLATES.find(t => t.id === formData.template), [formData.template])

  const variants = {
    enter: (direction) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({ x: direction < 0 ? 50 : -50, opacity: 0 })
  }

  return createPortal(
    <LazyMotion features={domAnimation}>
      <div className="fixed inset-0 z-50">
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 backdrop-blur-xl ${isDark ? 'bg-space-950/95' : 'bg-zinc-950/40'}`}
          onClick={onClose}
        />

        <div className="fixed inset-0 flex items-center justify-center p-0 sm:p-4 pointer-events-none">
          <m.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className={`relative z-10 w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col lg:flex-row sm:rounded-[2.5rem] border shadow-2xl overflow-hidden pointer-events-auto ${
              isDark ? 'bg-[#0B0F1A] border-white/10' : 'bg-white border-zinc-200'
            }`}
          >
            <div className={`hidden lg:flex lg:w-72 border-r p-8 flex-col ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
               <div className="flex items-center gap-3 mb-12">
                  <div className="size-10 rounded-xl bg-gold-400 flex items-center justify-center">
                     <Bot className={`size-6 ${isDark ? 'text-black' : 'text-white'}`} />
                  </div>
                  <span className={`font-syne font-black italic ${isDark ? 'text-white' : 'text-zinc-900'}`}>SEVEN T</span>
               </div>

               <div className="space-y-6">
                  {STEPS.map((step) => {
                    const idx = STEPS.indexOf(step)
                    const isActive = idx === currentStep
                    const isDone = idx < currentStep
                    return (
                      <div key={step.id} className="flex items-center gap-4 group">
                        <div className={`size-10 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                          isActive ? `bg-gold-400 border-gold-400 ${isDark ? 'text-black' : 'text-white'} shadow-[0_0_20px_rgba(245,212,122,0.3)]` : 
                          isDone ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : isDark ? 'bg-white/5 border-white/10 text-white/20' : 'bg-zinc-200 border-zinc-300 text-zinc-400'
                        }`}>
                            {isDone ? <Check className="size-5" /> : <step.icon className="size-5" />}
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-[10px] uppercase font-black tracking-widest ${isActive ? 'text-gold-400/50' : isDark ? 'text-white/10' : 'text-zinc-300'}`}>Étape {idx + 1}</span>
                            <span className={`font-syne font-bold transition-colors ${isActive ? isDark ? 'text-white' : 'text-zinc-900' : isDark ? 'text-white/20' : 'text-zinc-300'}`}>{step.title}</span>
                        </div>
                      </div>
                    )
                  })}
               </div>

               <div className={`mt-auto p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-100/50 border-zinc-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                     <ShieldCheck className="size-4 text-emerald-400" />
                     <span className="text-[10px] font-black uppercase text-emerald-400">Sécurisé par IA</span>
                  </div>
                  <p className={`text-[10px] leading-relaxed ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                     Votre agent sera prêt à répondre à vos clients dès la fin de cette configuration.
                  </p>
               </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 relative">
              <div className={`p-6 sm:p-8 border-b flex items-center justify-between ${isDark ? 'border-white/5' : 'border-zinc-100'}`}>
                 <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-gold-400 flex items-center justify-center">
                       <Bot className={`size-5 ${isDark ? 'text-black' : 'text-white'}`} />
                    </div>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{STEPS[currentStep].title}</span>
                 </div>
                 <button 
                  onClick={onClose} 
                  className={`p-2 rounded-xl transition-all ${isDark ? 'text-zinc-500 hover:text-white hover:bg-white/5' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'}`}
                  aria-label="Fermer"
                 >
                   <X className="size-6" />
                 </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-12 custom-scrollbar">
                <AnimatePresence mode="wait" custom={direction}>
                  <m.div
                    key={currentStepId}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                  >
                    {currentStepId === 'intro' && <StepIntro isDark={isDark} />}
                    {currentStepId === 'template' && <StepTemplate isDark={isDark} templates={TEMPLATES} selectedId={formData.template} onSelect={handleTemplateSelect} />}
                    {currentStepId === 'name' && <StepIdentity isDark={isDark} name={formData.name} description={formData.description} onChange={handleFormChange} />}
                    {currentStepId === 'model' && <StepBrain isDark={isDark} models={aiModels} selectedId={formData.model} loading={loadingModels} onSelect={handleBrainSelect} />}
                    {currentStepId === 'confirm' && <StepConfirm isDark={isDark} selectedTemplate={selectedTemplate} formData={formData} />}
                  </m.div>
                </AnimatePresence>
              </div>

              <div className={`mt-auto p-6 sm:p-8 border-t flex items-center justify-between gap-4 ${
                isDark ? 'border-white/5 bg-[#0B0F1A]' : 'border-zinc-100 bg-zinc-50/50'
              }`}>
                 <button
                    type="button"
                    onClick={handleBack}
                    disabled={creating || isFirstStep}
                    className={`flex items-center gap-2 font-black uppercase py-3.5 sm:py-4 px-5 sm:px-6 rounded-xl sm:rounded-2xl transition-all text-sm sm:text-base ${
                      isFirstStep ? 'opacity-0 pointer-events-none' : isDark ? 'text-zinc-500 hover:text-white hover:bg-white/10' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                  >
                    <ArrowLeft className="size-4 sm:size-5" />
                    <span>Retour</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed() || creating}
                    className={`flex-1 sm:flex-none group relative flex items-center justify-center gap-3 sm:gap-4 px-6 sm:px-10 py-3.5 sm:py-5 rounded-xl sm:rounded-2xl font-syne font-bold overflow-hidden transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:grayscale ${
                      isDark ? 'bg-white text-black' : 'bg-zinc-900 text-white shadow-xl shadow-zinc-200'
                    }`}
                  >
                    <span className="relative z-10 flex items-center gap-2 sm:gap-3">
                       {creating ? (
                          <>
                            <Loader2 className="size-4 sm:size-5 animate-spin" />
                            Initialisation…
                          </>
                        ) : isLastStep ? (
                          <>
                            <Rocket className="size-4 sm:size-5" />
                            Générer l'expert
                          </>
                        ) : (
                          <>
                            <span className="font-syne font-bold uppercase tracking-tight">Étape suivante</span>
                            <ChevronRight className="size-4 sm:size-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                    </span>
                    <div className={`absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ${isDark ? 'bg-gold-400' : 'bg-zinc-800'}`} />
                  </button>
              </div>
            </div>
          </m.div>
        </div>
      </div>
    </LazyMotion>,
    document.body
  )
}
