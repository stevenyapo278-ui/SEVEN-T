import { 
  Users, 
  Bot, 
  MessageSquare, 
  Activity, 
  UserPlus, 
  AlertCircle, 
  Zap, 
  TrendingUp, 
  ShieldAlert, 
  Lock, 
  Shield,
  Clock,
  ArrowRight,
  FileText,
  Loader2
} from 'lucide-react'
import StatCard from './StatCard'
import { useTheme } from '../../contexts/ThemeContext'

export default function DashboardContent({ stats, loading, anomalyStats, onTabChange, bruteforceSettings, loadingBruteforce, savingBruteforce, onChangeBruteforce }) {
  const { isDark } = useTheme()
  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    )
  }

  const getActionStyles = (action) => {
    if (action?.includes('login_failed')) return { icon: <Lock className="w-3 h-3" />, color: 'text-red-400', bg: 'bg-red-400/10' };
    if (action?.includes('delete')) return { icon: <ShieldAlert className="w-3 h-3" />, color: 'text-orange-400', bg: 'bg-orange-400/10' };
    if (action?.includes('reset_password')) return { icon: <Lock className="w-3 h-3" />, color: 'text-purple-400', bg: 'bg-purple-400/10' };
    if (action === 'add_credits') return { icon: <Zap className="w-3 h-3" />, color: 'text-cyan-400', bg: 'bg-cyan-400/10' };
    if (action?.includes('plan')) return { icon: <Zap className="w-3 h-3" />, color: 'text-gold-400', bg: 'bg-gold-400/10' };
    if (action?.includes('rollback')) return { icon: <Activity className="w-3 h-3" />, color: 'text-amber-400', bg: 'bg-amber-400/10' };
    if (action?.includes('knowledge')) return { icon: <FileText className="w-3 h-3" />, color: 'text-blue-400', bg: 'bg-blue-400/10' };
    return { icon: <Shield className="w-3 h-3" />, color: 'text-blue-400', bg: 'bg-blue-400/10' };
  };

  const getActionLabel = (action) => {
    const labels = {
      'login_failed': 'Échec de connexion',
      'hard_delete_user': 'Suppression définitive',
      'reset_password': 'Réinitialisation MDP',
      'add_credits': 'Ajout de crédits',
      'update_plan': 'Mise à jour Plan',
      'update_ai_model': 'Mise à jour Modèle IA',
      'rollback_action': 'Annulation Action',
      'add_global_knowledge': 'Conn. Globale',
      'upload_global_knowledge': 'Fichier Global',
      'delete_global_knowledge': 'Suppr. Conn. Globale'
    };
    return labels[action] || action;
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString();
  };

  const bf = bruteforceSettings || {
    enabled: false,
    threshold: 5,
    windowMinutes: 10,
    blockMinutes: 30
  }

  return (
    <div className="space-y-6">
      {anomalyStats?.total > 0 && (
        <div className={`p-4 rounded-xl flex items-center gap-4 ${
          anomalyStats?.bySeverity?.critical > 0 
            ? 'bg-red-500/20 border border-red-500/30' 
            : anomalyStats?.bySeverity?.high > 0
            ? 'bg-orange-500/20 border border-orange-500/30'
            : 'bg-amber-500/20 border border-amber-500/30'
        }`}>
          <AlertCircle className={`w-6 h-6 ${
            anomalyStats?.bySeverity?.critical > 0 ? 'text-red-400' :
            anomalyStats?.bySeverity?.high > 0 ? 'text-orange-400' : 'text-amber-400'
          }`} />
          <div className="flex-1">
            <p className="font-medium text-gray-100">
              {anomalyStats?.total} anomalie{anomalyStats?.total > 1 ? 's' : ''} détectée{anomalyStats?.total > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-gray-400">
              {anomalyStats?.bySeverity?.critical > 0 && `${anomalyStats?.bySeverity.critical} critique(s) • `}
              {anomalyStats?.bySeverity?.high > 0 && `${anomalyStats?.bySeverity.high} haute(s) • `}
              {anomalyStats?.bySeverity?.medium > 0 && `${anomalyStats?.bySeverity.medium} moyenne(s)`}
            </p>
          </div>
          <button 
            onClick={() => onTabChange('anomalies')}
            className="text-sm text-gold-400 hover:underline flex items-center gap-1"
          >
            Voir les anomalies <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Utilisateurs" value={stats.stats.users} subValue={`${stats.stats.activeUsers} actifs`} color="gold" />
        <StatCard icon={Bot} label="Agents IA" value={stats.stats.agents} subValue={`${stats.stats.activeAgents} connectés`} color="blue" />
        <StatCard icon={MessageSquare} label="Conversations" value={stats.stats.conversations} color="emerald" />
        <StatCard icon={Activity} label="Messages" value={stats.stats.messages} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Security Summary Card */}
        <div className="lg:col-span-2 card p-6 border border-red-500/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
          
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-display font-semibold text-gray-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Sécurité & Audit
            </h3>
            <button 
              onClick={() => onTabChange('activity')}
              className="text-xs text-gold-400 hover:text-gold-300 font-medium uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
              Journal Complet <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="p-4 bg-space-800/40 rounded-2xl border border-space-700/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Lock className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-sm text-gray-400">Échecs connexion (24h)</span>
              </div>
              <p className="text-2xl font-bold text-gray-100">{stats.security?.failedLogins24h || 0}</p>
            </div>
            <div className="p-4 bg-space-800/40 rounded-2xl border border-space-700/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <ShieldAlert className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-sm text-gray-400">Actions Critiques (24h)</span>
              </div>
              <p className="text-2xl font-bold text-gray-100">{stats.security?.criticalActions24h || 0}</p>
            </div>
            <div 
              className="p-4 bg-space-800/40 rounded-2xl border border-space-700/50 cursor-pointer hover:bg-space-800/60 transition-colors group"
              onClick={() => onTabChange('anomalies')}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${(anomalyStats?.unresolved_count || 0) > 0 ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                  <AlertCircle className={`w-4 h-4 ${(anomalyStats?.unresolved_count || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                </div>
                <span className="text-sm text-gray-400">Anomalies Actives</span>
              </div>
              <div className="flex items-center justify-between">
                <p className={`text-2xl font-bold ${(anomalyStats?.unresolved_count || 0) > 0 ? 'text-amber-400' : 'text-gray-100'}`}>
                  {anomalyStats?.unresolved_count || 0}
                </p>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-4 h-4 text-gold-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Événements Récents</h4>
            {stats.security?.recentSecurityEvents?.length > 0 ? (
              stats.security.recentSecurityEvents.map((log) => {
                const style = getActionStyles(log.action);
                return (
                  <div key={log.id} className={`flex items-center gap-4 p-3 border border-space-700/30 rounded-xl transition-all group ${
                    isDark ? 'bg-space-800/20 hover:bg-space-800/40' : 'bg-gray-50/50 hover:bg-gray-100/50'
                  }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.bg} ${style.color} border border-white/5`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-200">
                          {getActionLabel(log.action)}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {log.ip_address}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {log.user_name || 'Anonyme'} • {log.user_email || 'Système'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-[10px] text-gray-600 font-medium">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(log.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm italic">
                Aucun événement critique récent
              </div>
            )}
          </div>
        </div>

        {/* Top Consumers Sidebar */}
        <div className="space-y-6">
          <div className="card p-6 border border-gold-400/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-display font-semibold text-gray-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gold-400" />
                Top Consommateurs
              </h3>
            </div>
            
            <div className="space-y-3">
              {stats.stats.topTokenUsers?.slice(0, 5).map((user, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-space-800/40 border border-space-700/50 rounded-xl">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm font-semibold text-gray-100 truncate">{user.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-gold-400/10 text-gold-400 px-1.5 py-0.5 rounded border border-gold-400/20 font-bold">
                        {(user.total_tokens || 0).toLocaleString()} tokens
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-blue-400">{user.message_count} msg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-base font-display font-semibold text-gray-100 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Plans
            </h3>
            <div className="space-y-4">
              {stats.usersByPlan.map((item) => (
                <div key={item.plan} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-medium capitalize">{item.plan}</span>
                    <span className="text-gray-100 font-bold">{item.count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-space-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-gold-400 to-blue-500 rounded-full" 
                      style={{ width: `${(item.count / stats.stats.users) * 100}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Charts / Other Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-display font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-gold-400" />
            Utilisation Tokens
          </h3>
          <div className="flex items-center gap-6 p-4 bg-gold-400/5 rounded-2xl border border-gold-400/10">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Consommé</p>
              <p className="text-3xl font-bold text-gold-400">{stats.stats.totalTokens?.toLocaleString() || 0}</p>
            </div>
            <div className="w-px h-12 bg-space-700" />
            <div>
              <p className="text-sm text-gray-500 mb-1">Moyenne / utilisateur</p>
              <p className="text-xl font-bold text-gray-100">
                {Math.round((stats.stats.totalTokens || 0) / (stats.stats.users || 1)).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <h3 className="text-lg font-display font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            Inscriptions
          </h3>
          <div className="flex items-center justify-between p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
            <div>
              <p className="text-sm text-gray-500 mb-1">Derniers 7 jours</p>
              <p className="text-3xl font-bold text-emerald-400">+{stats.recentSignups}</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Activité quotidienne</span>
              <div className="flex items-end gap-1.5 h-12">
                {stats.messagesPerDay.slice(-7).map((day, i) => (
                  <div 
                    key={i} 
                    className="w-2 bg-emerald-500/30 rounded-t-sm hover:bg-emerald-500/60 transition-colors"
                    style={{ height: `${Math.min(100, (day.count / (Math.max(...stats.messagesPerDay.map(d => d.count)) || 1)) * 100)}%` }}
                    title={`${day.date}: ${day.count} messages`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/15 border border-red-500/30">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-display font-semibold text-gray-100">
                Sécurité / Protection brute force
              </h3>
              <p className="text-xs text-gray-500">
                Bloque les tentatives répétées de connexion sur une courte période.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium ${bf.enabled ? 'text-emerald-400' : 'text-gray-500'}`}>
              {bf.enabled ? 'Activée' : 'Désactivée'}
            </span>
            <button
              type="button"
              onClick={() => onChangeBruteforce?.({ enabled: !bf.enabled })}
              disabled={savingBruteforce || loadingBruteforce}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                bf.enabled ? 'bg-emerald-500' : 'bg-space-700'
              } ${savingBruteforce || loadingBruteforce ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  bf.enabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {loadingBruteforce ? (
          <div className="flex items-center justify-center h-24 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Chargement de la configuration de sécurité...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  Tentatives avant blocage
                </span>
                <span className="text-sm font-semibold text-gray-100">
                  {bf.threshold}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={bf.threshold}
                disabled={savingBruteforce}
                onChange={(e) => onChangeBruteforce?.({ threshold: Number(e.target.value) })}
                className="w-full accent-red-500"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Nombre d&apos;échecs de connexion autorisés dans la fenêtre glissante.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  Fenêtre d&apos;observation (min)
                </span>
                <span className="text-sm font-semibold text-gray-100">
                  {bf.windowMinutes} min
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={60}
                step={1}
                value={bf.windowMinutes}
                disabled={savingBruteforce}
                onChange={(e) => onChangeBruteforce?.({ windowMinutes: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Période sur laquelle les tentatives échouées sont comptabilisées.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  Durée de blocage (min)
                </span>
                <span className="text-sm font-semibold text-gray-100">
                  {bf.blockMinutes} min
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={180}
                step={5}
                value={bf.blockMinutes}
                disabled={savingBruteforce}
                onChange={(e) => onChangeBruteforce?.({ blockMinutes: Number(e.target.value) })}
                className="w-full accent-red-500"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Temps pendant lequel l&apos;adresse IP est bloquée après détection.
              </p>
            </div>
          </div>
        )}

        {savingBruteforce && !loadingBruteforce && (
          <p className="flex items-center gap-2 text-xs text-amber-400 mt-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Sauvegarde de la configuration...
          </p>
        )}
      </div>
    </div>
  )
}
