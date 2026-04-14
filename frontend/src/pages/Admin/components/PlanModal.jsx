import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle } from 'lucide-react'

export default function PlanModal({ plan, availableModels, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    display_name: plan?.display_name || '',
    description: plan?.description || '',
    price: plan?.price || 0,
    price_currency: plan?.price_currency || 'FCFA',
    is_active: plan?.is_active !== false,
    sort_order: plan?.sort_order || 99,
    limits: plan?.limits || {
      agents: 1,
      whatsapp_accounts: 1,
      outlook_accounts: 0,
      google_calendar_accounts: 0,
      conversations_per_month: 100,
      messages_per_month: 500,
      credits_per_month: 500,
      knowledge_items: 10,
      templates: 5
    },
    features: {
      models: ['gemini-1.5-flash'],
      availability_hours: false,
      voice_responses: false,
      payment_module: false,
      next_best_action: false,
      conversion_score: false,
      daily_briefing: false,
      sentiment_routing: false,
      catalog_import: false,
      human_handoff_alerts: false,
      analytics: false,
      flows: false,
      whatsapp_status: false,
      leads_management: false,
      campaigns: false,
      ...(plan?.features || {})
    }
  })
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('general')

  const handleLimitChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      limits: { ...prev.limits, [key]: value === '' ? 0 : parseInt(value) || 0 }
    }))
  }

  const handleFeatureToggle = (key) => {
    setFormData(prev => ({
      ...prev,
      features: { ...prev.features, [key]: !prev.features[key] }
    }))
  }

  const handleModelToggle = (modelId) => {
    setFormData(prev => {
      const models = prev.features.models || []
      const newModels = models.includes(modelId)
        ? models.filter(m => m !== modelId)
        : [...models, modelId]
      return {
        ...prev,
        features: { ...prev.features, models: newModels }
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...formData,
      limits: {
        ...formData.limits,
        messages_per_month: formData.limits.credits_per_month
      }
    }
    await onSave(payload)
    setSaving(false)
  }

  const limitFields = [
    { key: 'agents', label: 'Agents', desc: '-1 = illimité' },
    { key: 'whatsapp_accounts', label: 'Comptes WhatsApp', desc: '-1 = illimité' },
    { key: 'outlook_accounts', label: 'Comptes Outlook', desc: '-1 = illimité' },
    { key: 'google_calendar_accounts', label: 'Comptes Google Calendar', desc: '-1 = illimité' },
    { key: 'conversations_per_month', label: 'Conversations/mois', desc: '-1 = illimité' },
    { key: 'credits_per_month', label: 'Messages IA / mois', desc: 'Nombre max de réponses IA par mois (1 message IA = 1 crédit). -1 = illimité.' },
    { key: 'knowledge_items', label: 'Items base de connaissance', desc: '-1 = illimité' },
    { key: 'templates', label: 'Templates', desc: '-1 = illimité' }
  ]

  const featureFields = [
    { key: 'availability_hours', label: 'Module 1 : Heures de disponibilité', desc: 'Permet de définir les horaires où l\'agent répond automatiquement.' },
    { key: 'payment_module', label: 'Module 2 : Paiement & Encaissement', desc: 'Intégration des passerelles de paiement pour vendre via l\'IA.' },
    { key: 'next_best_action', label: 'Module 3 : Next Best Action', desc: 'Relances automatiques intelligentes des prospects inactifs.' },
    { key: 'conversion_score', label: 'Module 4 : Score de conversion', desc: 'Analyse la probabilité d\'achat de chaque prospect.' },
    { key: 'daily_briefing', label: 'Module 5 : Daily Briefing', desc: 'Résumé quotidien des activités envoyé sur WhatsApp.' },
    { key: 'sentiment_routing', label: 'Module 6 : Sentiment routing', desc: 'Transfère à un humain si le client semble frustré.' },
    { key: 'catalog_import', label: 'Module 7 : Import catalogue', desc: 'L\'IA connaît vos produits via URL ou fichiers.' },
    { key: 'human_handoff_alerts', label: 'Module 8 : Alertes Transfert Humain', desc: 'Notifications immédiates quand un agent demande de l\'aide.' },
    { key: 'analytics', label: 'Module 9 : Analytics & Statistiques', desc: 'Accès aux tableaux de bord et rapports détaillés sur les performances.' },
    { key: 'flows', label: 'Module 10 : Flows (Flux de travail)', desc: 'Créez des scénarios d\'automatisation visuels.' },
    { key: 'whatsapp_status', label: 'Module 11 : Statut WhatsApp', desc: 'Publication de statuts WhatsApp via l\'IA ou l\'interface.' },
    { key: 'leads_management', label: 'Module 12 : Gestion des Leads', desc: 'Gestion des prospects, analyse d\'intention et conversion par l\'IA.' },
    { key: 'campaigns', label: 'Module 13 : Campagnes WhatsApp', desc: 'Envoi de messages en masse et planification récurrente.' },
    { key: 'voice_responses', label: 'Module 14 : Réponses vocales (TTS)', desc: 'L\'IA peut répondre par message vocal au lieu de texte.' },
    { key: 'polls_module', label: 'Module 15 : Sondages WhatsApp', desc: 'Créez des sondages interactifs et collectez les votes en temps réel.' },
    { key: 'proactive_advisor', label: 'Module 16 : Relance IA (Proactive)', desc: 'Relance automatiquement les commandes abandonnées ou reportées.' }
  ]

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-2xl bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-fadeIn flex flex-col max-h-[90dvh] sm:max-h-[85vh] max-sm:rounded-b-none overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-space-700" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <h3 className="text-lg font-display font-semibold text-gray-100">
            {plan ? 'Modifier le plan' : 'Nouveau plan'}
          </h3>
          <button onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-space-700 overflow-x-auto no-scrollbar">
          {['general', 'limits', 'features', 'models'].map(section => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap min-h-[48px] ${
                activeSection === section 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {section === 'general' && 'Général'}
              {section === 'limits' && 'Limites'}
              {section === 'features' && 'Fonctions'}
              {section === 'models' && 'Modèles'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 overscroll-contain">
            {/* General Section */}
            {activeSection === 'general' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">ID *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                      className="input-dark w-full min-h-[44px]"
                      placeholder="ex: starter"
                      required
                      disabled={!!plan}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Nom *</label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="input-dark w-full min-h-[44px]"
                      placeholder="ex: Starter"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-dark w-full resize-none"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Prix</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                      className="input-dark w-full min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Devise</label>
                    <select
                      value={formData.price_currency}
                      onChange={(e) => setFormData({ ...formData, price_currency: e.target.value })}
                      className="input-dark w-full min-h-[44px]"
                    >
                      <option value="FCFA">FCFA</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Limits Section */}
            {activeSection === 'limits' && (
              <div className="grid grid-cols-2 gap-4">
                {limitFields.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{field.label}</label>
                    <input
                      type="number"
                      value={formData.limits[field.key] ?? 0}
                      onChange={(e) => handleLimitChange(field.key, e.target.value)}
                      className="input-dark w-full min-h-[44px]"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Features Section */}
            {activeSection === 'features' && (
              <div className="grid grid-cols-1 gap-2">
                {featureFields.map((field) => (
                  <label key={field.key} title={field.desc} className="flex items-center gap-3 p-3 bg-space-800 rounded-xl cursor-pointer hover:bg-space-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.features[field.key] || false}
                      onChange={() => handleFeatureToggle(field.key)}
                      className="w-5 h-5 rounded border-space-700 bg-space-800 text-emerald-400"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200">{field.label}</p>
                      <p className="text-[10px] text-gray-500 truncate">{field.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Models Section */}
            {activeSection === 'models' && (
              <div className="grid grid-cols-1 gap-2">
                {availableModels.map(model => (
                  <label key={model.id} className="flex items-center gap-3 p-3 bg-space-800 rounded-xl cursor-pointer hover:bg-space-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.features.models?.includes(model.id) || formData.features.models?.includes(model.name) || false}
                      onChange={() => handleModelToggle(model.id)}
                      className="w-5 h-5 rounded border-space-700 bg-space-800 text-blue-400"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200">{model.name}</p>
                      <p className="text-[10px] text-gray-500">{model.provider}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 border-t border-space-700 bg-space-900/50 flex gap-3" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
            <button type="button" onClick={onClose} className="flex-1 btn-secondary min-h-[48px]">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary min-h-[48px]">
              {saving ? '...' : plan ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
