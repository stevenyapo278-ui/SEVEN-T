import {
  RefreshCw, Activity, CheckCircle, Loader2, Users, Bot,
  CreditCard, Zap, WifiOff, Clock, AlertTriangle, AlertCircle, Package, ShoppingCart
} from 'lucide-react'

function getTypeInfo(type) {
  const types = {
    credits_zero: { label: 'Crédits épuisés', icon: CreditCard, color: 'amber' },
    credits_negative: { label: 'Crédits négatifs', icon: CreditCard, color: 'red' },
    ai_error: { label: 'Erreur IA', icon: Zap, color: 'red' },
    whatsapp_disconnect: { label: 'WhatsApp déconnecté', icon: WifiOff, color: 'orange' },
    rate_limit: { label: 'Rate limit', icon: Clock, color: 'amber' },
    plan_limit_exceeded: { label: 'Limite de plan', icon: AlertTriangle, color: 'amber' },
    system_error: { label: 'Erreur système', icon: AlertCircle, color: 'red' },
    low_stock: { label: 'Stock bas', icon: Package, color: 'orange' },
    order_stuck: { label: 'Commande en attente', icon: ShoppingCart, color: 'amber' },
  }
  return types[type] || { label: type, icon: AlertCircle, color: 'gray' }
}

function getSeverityColor(severity) {
  switch (severity) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}

function formatAnomalyDate(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return "À l'instant"
  if (diffMins < 60) return `Il y a ${diffMins} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`
  return date.toLocaleDateString('fr-FR')
}

export default function AnomaliesContent({ anomalies, stats, loading, onResolve, onResolveByType, onHealthCheck, onRefresh }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold text-gray-100">Anomalies système</h2>
          <p className="text-gray-400 text-sm">Surveillez les problèmes et erreurs de la plateforme</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefresh} disabled={loading} className="p-2 text-gray-400 hover:text-gray-100 transition-colors">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={onHealthCheck} disabled={loading} className="btn-secondary inline-flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Vérification système
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-gray-100">{stats.total}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="card p-4 text-center border-red-500/30">
          <p className="text-3xl font-bold text-red-400">{stats.bySeverity?.critical || 0}</p>
          <p className="text-sm text-gray-500">Critiques</p>
        </div>
        <div className="card p-4 text-center border-orange-500/30">
          <p className="text-3xl font-bold text-orange-400">{stats.bySeverity?.high || 0}</p>
          <p className="text-sm text-gray-500">Hautes</p>
        </div>
        <div className="card p-4 text-center border-amber-500/30">
          <p className="text-3xl font-bold text-amber-400">{stats.bySeverity?.medium || 0}</p>
          <p className="text-sm text-gray-500">Moyennes</p>
        </div>
      </div>

      {Object.keys(stats.byType || {}).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byType).map(([type, count]) => {
            const info = getTypeInfo(type)
            return (
              <button
                key={type}
                onClick={() => onResolveByType(type)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border ${getSeverityColor('medium')} hover:opacity-80 transition-opacity`}
              >
                <info.icon className="w-4 h-4" />
                {info.label} ({count})
                <CheckCircle className="w-4 h-4 opacity-50" />
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
        </div>
      ) : anomalies.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-100 mb-2">Tout va bien !</h3>
          <p className="text-gray-400">Aucune anomalie détectée sur la plateforme.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {anomalies.map((anomaly) => {
            const typeInfo = getTypeInfo(anomaly.type)
            const TypeIcon = typeInfo.icon
            const hasAccount = anomaly.user_id || anomaly.user_email || anomaly.user_name
            const hasAgent = anomaly.agent_id || anomaly.agent_name
            const hasMetadata = anomaly.metadata && Object.keys(anomaly.metadata).length > 0
            return (
              <div key={anomaly.id} className={`card p-4 border ${getSeverityColor(anomaly.severity)}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getSeverityColor(anomaly.severity)}`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-medium text-gray-100">{anomaly.title}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs ${getSeverityColor(anomaly.severity)}`}>{anomaly.severity}</span>
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30">{typeInfo.label}</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{anomaly.message}</p>
                    {hasAccount && (
                      <div className="mb-3 p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Compte concerné</p>
                        <div className="text-sm text-gray-300 space-y-0.5">
                          {anomaly.user_name && <p><span className="text-gray-500">Nom :</span> {anomaly.user_name}</p>}
                          {anomaly.user_email && <p><span className="text-gray-500">Email :</span> {anomaly.user_email}</p>}
                          {anomaly.user_id && <p className="text-xs text-gray-500 font-mono">ID : {anomaly.user_id}</p>}
                        </div>
                      </div>
                    )}
                    {hasAgent && (
                      <div className="mb-3 p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Bot className="w-3.5 h-3.5" /> Agent concerné</p>
                        <div className="text-sm text-gray-300 space-y-0.5">
                          {anomaly.agent_name && <p><span className="text-gray-500">Nom :</span> {anomaly.agent_name}</p>}
                          {anomaly.agent_id && <p className="text-xs text-gray-500 font-mono">ID : {anomaly.agent_id}</p>}
                        </div>
                      </div>
                    )}
                    {hasMetadata && (
                      <div className="mb-3 p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Détails techniques</p>
                        <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap font-sans">{JSON.stringify(anomaly.metadata, null, 2)}</pre>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      <span title={new Date(anomaly.created_at).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'medium' })}>{formatAnomalyDate(anomaly.created_at)}</span>
                      <span className="font-mono text-gray-600" title={`ID anomalie: ${anomaly.id}`}>#{anomaly.id?.slice(0, 8)}…</span>
                    </div>
                  </div>
                  <button onClick={() => onResolve(anomaly.id)} className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors shrink-0" title="Marquer comme résolu">
                    <CheckCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
