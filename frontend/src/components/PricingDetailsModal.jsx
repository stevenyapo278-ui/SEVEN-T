import { createPortal } from 'react-dom'
import { CheckCircle, X } from 'lucide-react'

export const FEATURE_DESCRIPTIONS = {
  agents: "Nombre d'agents IA simultanés capables de gérer les conversations avec vos clients.",
  messages: "Nombre maximal de messages ou crédits que votre IA peut envoyer et traiter chaque mois.",
  models: "Choix de modèles d'intelligence artificielle avancés (GPT-4, Gemini, Claude...) configurables selon vos besoins en performance.",
  analytics: "Accédez à un tableau de bord complet pour analyser en temps réel vos ventes, vos conversions et le temps de réponse moyen.",
  payment_module: "Recevez vos paiements Mobile Money et cartes bancaires directement dans WhatsApp sans que le client ne quitte l'application grâce à notre intégration GeniusPay.",
  voice_responses: "Permettez à votre agent IA de générer et d'envoyer des notes vocales naturelles (Text-to-Speech) pour plus d'humanité.",
  flows: "Créez des parcours clients et scénarios d'automatisation complexes (tunnels de vente, séquences relationnelles personnalisées).",
  next_best_action: "L'IA analyse le contexte en direct et suggère la meilleure action pour conclure une vente et booster votre conversion.",
  catalog_import: "Importez facilement votre catalogue de produits depuis un fichier externe ou un site web compatible pour l'intégrer aux réponses IA.",
  human_handoff_alerts: "Recevez une notification instantanée et transférez le contrôle à un humain lorsque l'IA détecte une situation délicate (plainte, requête très spécifique).",
  whatsapp_status: "L'IA est capable d'analyser vos statuts WhatsApp et de répondre automatiquement avec le bon produit lorsqu'un client réagit à une story.",
  daily_briefing: "Recevez automatiquement chaque matin un résumé complet de l'activité générée lors des dernières 24h par votre agent.",
  leads_management: "Un CRM miniature intégré pour taguer automatiquement, classer et organiser vos prospects les plus chauds qualifiés par l'IA.",
  knowledgeBase: "Le cerveau de votre agent : transmettez des documents PDF, règles et informations pour que l'IA connaisse tout de votre business sur le bout des doigts.",
  prioritySupport: "Assistance technique dédiée et prioritaire avec un accès direct à notre équipe pour résoudre d'éventuels soucis dans l'heure."
}

export default function PricingDetailsModal({ plan, isOpen, onClose }) {
  if (!isOpen || !plan) return null

  const limits = typeof plan.limits === 'string' ? JSON.parse(plan.limits) : (plan.limits || {})
  const feats = typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || {})

  const getFeaturesDetails = () => {
    const items = []
    
    // Limits
    if (limits?.agents) {
      items.push({
        title: limits.agents === -1 ? 'Agents illimités' : `${limits.agents} agent${limits.agents > 1 ? 's' : ''} IA`,
        description: FEATURE_DESCRIPTIONS.agents
      })
    }
    
    const messages = limits.messages_per_month !== undefined ? limits.messages_per_month : limits.monthlyCredits
    if (messages !== undefined) {
      items.push({
         title: messages === -1 ? 'Messages illimités' : `${messages.toLocaleString('fr-FR')} messages/mois`,
         description: FEATURE_DESCRIPTIONS.messages
      })
    }

    // Features
    if (feats?.models?.length) items.push({ title: `${feats.models.length} modèle(s) IA`, description: FEATURE_DESCRIPTIONS.models })
    if (feats?.analytics) items.push({ title: 'Statistiques avancées', description: FEATURE_DESCRIPTIONS.analytics })
    if (feats?.payment_module) items.push({ title: 'Module paiement', description: FEATURE_DESCRIPTIONS.payment_module })
    if (feats?.voice_responses) items.push({ title: 'Réponses vocales (TTS)', description: FEATURE_DESCRIPTIONS.voice_responses })
    if (feats?.flows) items.push({ title: 'Flows & automatisations', description: FEATURE_DESCRIPTIONS.flows })
    if (feats?.next_best_action) items.push({ title: 'Next Best Action', description: FEATURE_DESCRIPTIONS.next_best_action })
    if (feats?.catalog_import) items.push({ title: 'Import catalogue', description: FEATURE_DESCRIPTIONS.catalog_import })
    if (feats?.human_handoff_alerts) items.push({ title: 'Alertes intervention humaine', description: FEATURE_DESCRIPTIONS.human_handoff_alerts })
    if (feats?.whatsapp_status) items.push({ title: 'WhatsApp Status', description: FEATURE_DESCRIPTIONS.whatsapp_status })
    if (feats?.daily_briefing) items.push({ title: 'Briefing quotidien', description: FEATURE_DESCRIPTIONS.daily_briefing })
    if (feats?.leads_management) items.push({ title: 'Gestion leads', description: FEATURE_DESCRIPTIONS.leads_management })
    
    if (items.length <= 2) {
       if (feats?.knowledgeBase) items.push({ title: 'Base de connaissances IA', description: FEATURE_DESCRIPTIONS.knowledgeBase })
       if (feats?.prioritySupport) items.push({ title: 'Support prioritaire', description: FEATURE_DESCRIPTIONS.prioritySupport })
    }
    
    return items
  }

  const features = getFeaturesDetails()

  const modalContent = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 shadow-2xl" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div 
        className="absolute inset-0 backdrop-blur-sm"
        onClick={onClose} 
      />
      <div className="relative w-full max-w-3xl bg-space-950 border border-space-700/50 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-space-900 to-space-950">
          <div>
            <h3 className="text-2xl font-bold text-white">
              Détails du forfait <span className="text-amber-500 uppercase tracking-wide">{plan.display_name || plan.name}</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">Toutes les fonctionnalités incluses</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {features.map((feat, idx) => (
            <div key={idx} className="flex gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
              <div className="mt-0.5">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-white mb-2">{feat.title}</h4>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-space-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-2xl font-bold bg-white/10 hover:bg-white/20 text-white transition-all shadow-lg"
          >
            Compris, fermer
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

