import { createPortal } from 'react-dom'
import { CheckCircle, X } from 'lucide-react'

export const FEATURE_DESCRIPTIONS = {
  agents: "Nombre d'agents IA simultanés capables de gérer les conversations avec vos clients.",
  messages: "Nombre maximal de messages ou crédits que votre IA peut envoyer et traiter chaque mois.",
  models: "Choix de modèles d'intelligence artificielle avancés (GPT-4, Gemini, Claude...) configurables selon vos besoins en performance.",
  availability_hours: "Permet de définir les horaires où l'agent répond automatiquement.",
  payment_module: "Intégration des passerelles de paiement pour vendre via l'IA.",
  next_best_action: "Relances automatiques intelligentes des prospects inactifs.",
  conversion_score: "Analyse la probabilité d'achat de chaque prospect.",
  daily_briefing: "Résumé quotidien des activités envoyé sur WhatsApp.",
  sentiment_routing: "Transfère à un humain si le client semble frustré.",
  catalog_import: "L'IA connaît vos produits via URL ou fichiers.",
  human_handoff_alerts: "Notifications immédiates quand un agent demande de l'aide.",
  analytics: "Accès aux tableaux de bord et rapports détaillés sur les performances.",
  flows: "Créez des scénarios d'automatisation visuels.",
  whatsapp_status: "Publication de statuts WhatsApp via l'IA ou l'interface.",
  leads_management: "Gestion des prospects, analyse d'intention et conversion par l'IA.",
  campaigns: "Envoi de messages en masse et planification récurrente.",
  voice_responses: "L'IA peut répondre par message vocal au lieu de texte.",
  polls_module: "Créez des sondages interactifs et collectez les votes en temps réel.",
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
    if (feats?.availability_hours) items.push({ title: 'Heures de disponibilité', description: FEATURE_DESCRIPTIONS.availability_hours })
    if (feats?.payment_module) items.push({ title: 'Paiement & Encaissement', description: FEATURE_DESCRIPTIONS.payment_module })
    if (feats?.next_best_action) items.push({ title: 'Next Best Action', description: FEATURE_DESCRIPTIONS.next_best_action })
    if (feats?.conversion_score) items.push({ title: 'Score de conversion', description: FEATURE_DESCRIPTIONS.conversion_score })
    if (feats?.daily_briefing) items.push({ title: 'Daily Briefing', description: FEATURE_DESCRIPTIONS.daily_briefing })
    if (feats?.sentiment_routing) items.push({ title: 'Sentiment routing', description: FEATURE_DESCRIPTIONS.sentiment_routing })
    if (feats?.catalog_import) items.push({ title: 'Import catalogue', description: FEATURE_DESCRIPTIONS.catalog_import })
    if (feats?.human_handoff_alerts) items.push({ title: 'Alertes Transfert Humain', description: FEATURE_DESCRIPTIONS.human_handoff_alerts })
    if (feats?.analytics) items.push({ title: 'Analytics & Statistiques', description: FEATURE_DESCRIPTIONS.analytics })
    if (feats?.flows) items.push({ title: 'Flows (Flux de travail)', description: FEATURE_DESCRIPTIONS.flows })
    if (feats?.whatsapp_status) items.push({ title: 'Statut WhatsApp', description: FEATURE_DESCRIPTIONS.whatsapp_status })
    if (feats?.leads_management) items.push({ title: 'Gestion des Leads', description: FEATURE_DESCRIPTIONS.leads_management })
    if (feats?.campaigns) items.push({ title: 'Campagnes WhatsApp', description: FEATURE_DESCRIPTIONS.campaigns })
    if (feats?.voice_responses) items.push({ title: 'Réponses vocales (TTS)', description: FEATURE_DESCRIPTIONS.voice_responses })
    if (feats?.polls_module) items.push({ title: 'Sondages WhatsApp', description: FEATURE_DESCRIPTIONS.polls_module })
    
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

