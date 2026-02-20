import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  HelpCircle
} from 'lucide-react'

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
    icon: Zap,
    color: 'violet',
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
    color: 'blue',
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

const STEPS = [
  { id: 'template', title: 'Type d\'agent' },
  { id: 'name', title: 'Nom et description' },
  { id: 'model', title: 'Modèle IA' },
  { id: 'confirm', title: 'Confirmation' }
]

export default function AgentCreationWizard({ isOpen, onClose, onSuccess }) {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    template: null,
    name: '',
    description: '',
    model: 'gemini-1.5-flash'
  })

  if (!isOpen) return null

  const currentStepId = STEPS[currentStep].id
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === STEPS.length - 1

  const canProceed = () => {
    switch (currentStepId) {
      case 'template':
        return formData.template !== null
      case 'name':
        return formData.name.trim().length >= 2
      case 'model':
        return formData.model !== null
      case 'confirm':
        return true
      default:
        return false
    }
  }

  const handleNext = async () => {
    if (isLastStep) {
      // Create the agent
      setCreating(true)
      try {
        const response = await api.post('/agents', {
          name: formData.name,
          description: formData.description || TEMPLATES.find(t => t.id === formData.template)?.description,
          template: formData.template,
          model: formData.model
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
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const selectedTemplate = TEMPLATES.find(t => t.id === formData.template)
  const selectedModel = AI_MODELS.find(m => m.id === formData.model)

  const getColorClass = (color) => {
    const colors = {
      gold: 'from-gold-400/20 to-gold-400/5 border-gold-400/30 text-gold-400',
      violet: 'from-violet-400/20 to-violet-400/5 border-violet-400/30 text-violet-400',
      emerald: 'from-emerald-400/20 to-emerald-400/5 border-emerald-400/30 text-emerald-400',
      blue: 'from-blue-400/20 to-blue-400/5 border-blue-400/30 text-blue-400',
      orange: 'from-orange-400/20 to-orange-400/5 border-orange-400/30 text-orange-400'
    }
    return colors[color] || colors.gold
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-space-950/90 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-space-900 rounded-2xl border border-space-700 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-space-900 border-b border-space-700 p-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gold-400 to-violet-500 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-gray-100">Créer un agent</h2>
                <p className="text-sm text-gray-400">Étape {currentStep + 1} sur {STEPS.length}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress */}
          <div className="flex gap-2 mt-4">
            {STEPS.map((step, index) => (
              <div 
                key={step.id}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-gold-400' : 'bg-space-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Template Selection */}
          {currentStepId === 'template' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-xl font-display font-bold text-gray-100">
                  Quel type d'agent souhaitez-vous créer ?
                </h3>
                <p className="text-gray-400">Choisissez un modèle pré-configuré</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TEMPLATES.map((template) => {
                  const Icon = template.icon
                  const isSelected = formData.template === template.id
                  
                  return (
                    <button
                      key={template.id}
                      onClick={() => setFormData({ ...formData, template: template.id, name: template.name })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected 
                          ? `bg-gradient-to-br ${getColorClass(template.color)} border-2`
                          : 'bg-space-800 border-space-700 hover:border-space-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-white/10' : 'bg-space-700'
                        }`}>
                          <Icon className={`w-6 h-6 ${isSelected ? '' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-100">{template.name}</h4>
                            {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{template.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {template.features.slice(0, 2).map(f => (
                              <span key={f} className="text-xs px-2 py-0.5 bg-space-700/50 text-gray-400 rounded">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2: Name and Description */}
          {currentStepId === 'name' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-display font-bold text-gray-100">
                  Comment s'appelle votre agent ?
                </h3>
                <p className="text-gray-400">Donnez-lui une identité unique</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nom de l'agent *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Sophie, Assistant Boutique, Support Pro..."
                  className="input-dark w-full text-lg"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ce nom sera utilisé dans les messages (ex: "Bonjour, je suis {formData.name || 'votre assistant'}")
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (optionnelle)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrivez le rôle de cet agent..."
                  className="input-dark w-full h-24 resize-none"
                />
              </div>

              {/* Preview */}
              <div className="p-4 bg-space-800 rounded-xl border border-space-700">
                <p className="text-sm text-gray-400 mb-2">Aperçu du message de bienvenue :</p>
                <p className="text-gray-100">
                  "Bonjour ! 👋 Je suis <span className="text-gold-400 font-medium">{formData.name || 'votre assistant'}</span>. 
                  Comment puis-je vous aider aujourd'hui ?"
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Model Selection */}
          {currentStepId === 'model' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-xl font-display font-bold text-gray-100">
                  Quel modèle IA utiliser ?
                </h3>
                <p className="text-gray-400">Choisissez l'intelligence de votre agent</p>
              </div>

              <div className="space-y-3">
                {AI_MODELS.map((model) => {
                  const isSelected = formData.model === model.id
                  
                  return (
                    <button
                      key={model.id}
                      onClick={() => setFormData({ ...formData, model: model.id })}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected 
                          ? 'bg-gold-400/10 border-gold-400/50'
                          : 'bg-space-800 border-space-700 hover:border-space-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-gold-400/20' : 'bg-space-700'
                          }`}>
                            <Sparkles className={`w-5 h-5 ${isSelected ? 'text-gold-400' : 'text-gray-400'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-100">{model.name}</h4>
                              {model.recommended && (
                                <span className="text-xs px-2 py-0.5 bg-gold-400/20 text-gold-400 rounded">
                                  Recommandé
                                </span>
                              )}
                              {model.free && (
                                <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">
                                  Gratuit
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{model.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-bold ${model.credits === 0 ? 'text-emerald-400' : 'text-gold-400'}`}>
                            {model.credits}
                          </span>
                          <span className="text-xs text-gray-500 block">crédits/msg</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <p className="text-xs text-gray-500 text-center">
                💡 Les modèles gratuits ont des limites de requêtes. Gemini Flash offre le meilleur équilibre.
              </p>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStepId === 'confirm' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-gold-400 to-violet-500 rounded-2xl flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-display font-bold text-gray-100">
                  Prêt à créer votre agent !
                </h3>
                <p className="text-gray-400">Vérifiez les informations</p>
              </div>

              <div className="bg-space-800 rounded-xl border border-space-700 divide-y divide-space-700">
                <div className="p-4 flex items-center justify-between">
                  <span className="text-gray-400">Type</span>
                  <span className="text-gray-100 font-medium">{selectedTemplate?.name}</span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-gray-400">Nom</span>
                  <span className="text-gray-100 font-medium">{formData.name}</span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-gray-400">Modèle IA</span>
                  <span className="text-gray-100 font-medium">{selectedModel?.name}</span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-gray-400">Coût par message</span>
                  <span className={`font-bold ${selectedModel?.credits === 0 ? 'text-emerald-400' : 'text-gold-400'}`}>
                    {selectedModel?.credits} crédit{selectedModel?.credits !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <p className="text-sm text-emerald-400">
                  ✨ Après la création, vous pourrez connecter WhatsApp et personnaliser 
                  davantage le comportement de votre agent.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-space-900 border-t border-space-700 p-4">
          <div className="flex gap-3">
            {!isFirstStep && (
              <button
                onClick={handleBack}
                disabled={creating}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed() || creating}
              className="flex-1 btn-primary inline-flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Création...
                </>
              ) : isLastStep ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Créer l'agent
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
