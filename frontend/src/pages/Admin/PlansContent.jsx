import { Plus, RefreshCw, Edit, Trash2, Copy, Users, Loader2 } from 'lucide-react'

export default function PlansContent({
  plans,
  availableModels,
  loading,
  onEditPlan,
  onCreatePlan,
  onDeletePlan,
  onTogglePlan,
  onDuplicatePlan,
  onSetDefault,
  onRestoreDefaults,
  onRefresh
}) {
  const formatPrice = (price) => {
    if (price === -1) return 'Sur devis'
    if (price === 0) return 'Gratuit'
    return `${price.toLocaleString()} FCFA`
  }

  const formatLimit = (value) => {
    if (value === -1) return '∞'
    if (value === undefined || value === null || value === 0) return '–'
    return value.toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold text-gray-100">Plans d&apos;abonnement</h2>
          <p className="text-sm text-gray-500 mt-1">Gérez les plans et leurs limites</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onCreatePlan} className="btn-primary order-first sm:order-last flex items-center whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
            Nouveau plan
          </button>
          <button onClick={onRefresh} className="btn-secondary touch-target flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </button>
          {onRestoreDefaults && (
            <button onClick={onRestoreDefaults} className="btn-secondary border-amber-500/50 text-amber-400 hover:bg-amber-500/10 text-sm whitespace-nowrap">
              Restaurer les plans par défaut
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map(plan => (
          <div
            key={plan.id}
            data-plan-card={!plan.is_active ? 'inactive' : plan.is_default ? 'default' : 'active'}
            className={`card p-4 relative border-l-4 ${
              !plan.is_active ? 'opacity-60 border-l-space-600' : plan.is_default ? 'border-l-blue-500 ring-2 ring-blue-500/30' : 'border-l-emerald-500'
            }`}
          >
            <div className="absolute top-3 right-3 flex gap-1">
              {plan.is_default && <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">Défaut</span>}
              {!plan.is_active && <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">Inactif</span>}
            </div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-100">{plan.display_name}</h3>
              <p className="text-2xl font-bold text-blue-400 mt-1">{formatPrice(plan.price)}</p>
              {plan.description && <p className="text-sm text-gray-500 mt-1">{plan.description}</p>}
            </div>
            <div className="space-y-2 mb-4">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Limites</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Agents</span><span className="text-gray-300">{formatLimit(plan.limits?.agents)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">WhatsApp</span><span className="text-gray-300">{formatLimit(plan.limits?.whatsapp_accounts)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Outlook</span><span className="text-gray-300">{formatLimit(plan.limits?.outlook_accounts)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Messages IA / mois</span><span className="text-gray-300">{formatLimit(plan.limits?.credits_per_month)}</span></div>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Fonctionnalités</h4>
              <div className="flex flex-wrap gap-1">
                {plan.features?.availability_hours && <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">Heures de dispo.</span>}
                {plan.features?.voice_responses && <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">Réponses vocales</span>}
                {plan.features?.payment_module && <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">Paiement</span>}
                {plan.features?.next_best_action && <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded">Module 3: Next Best Action</span>}
                {plan.features?.conversion_score && <span className="px-2 py-0.5 text-xs bg-pink-500/20 text-pink-300 rounded">Module 4: Score de conversion</span>}
                {plan.features?.daily_briefing && <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-300 rounded">Module 5: Daily Briefing</span>}
                {plan.features?.sentiment_routing && <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-300 rounded">Module 6: Sentiment routing</span>}
                {plan.features?.catalog_import && <span className="px-2 py-0.5 text-xs bg-teal-500/20 text-teal-300 rounded">Module 7: Import catalogue</span>}
                {plan.features?.human_handoff_alerts && <span className="px-2 py-0.5 text-xs bg-pink-500/20 text-pink-300 rounded">Module 8: Alertes humain</span>}
                {plan.features?.models?.length > 0 && <span className="px-2 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded">{plan.features.models.length} modèle(s) IA</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Users className="w-4 h-4" />
              <span>{plan.user_count || 0} utilisateur(s)</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-3 border-t border-space-700">
              <button onClick={() => onEditPlan(plan)} className="text-xs px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors"><Edit className="w-3 h-3 inline mr-1" /> Modifier</button>
              <button onClick={() => onTogglePlan(plan)} className={`text-xs px-2 py-1 rounded transition-colors ${plan.is_active ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'}`}>{plan.is_active ? 'Désactiver' : 'Activer'}</button>
              <button onClick={() => onDuplicatePlan(plan)} className="text-xs px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors"><Copy className="w-3 h-3 inline mr-1" /> Dupliquer</button>
              {!plan.is_default && <button onClick={() => onSetDefault(plan)} className="text-xs px-2 py-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded transition-colors">Définir par défaut</button>}
              {!plan.is_default && plan.user_count === 0 && <button onClick={() => onDeletePlan(plan)} className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"><Trash2 className="w-3 h-3 inline mr-1" /> Supprimer</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
