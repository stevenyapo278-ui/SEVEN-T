import React from 'react';
import { 
  User, 
  Settings, 
  Trash2, 
  LogIn, 
  Shield, 
  CreditCard, 
  FileText,
  Clock,
  Globe,
  Monitor,
  Search,
  Plus,
  ArrowRight,
  Activity,
  RefreshCw,
  RotateCcw,
  X,
  AlertCircle,
  Copy,
  Zap
} from 'lucide-react';

export default function AuditLogsContent({ logs, loading, pagination, onPageChange, filters, onFilterChange, onRefresh, onRollback, filterUserName }) {
  const getActionStyles = (action) => {
    if (action === 'brute_force_detected' || action === 'login_failed') return { icon: <AlertCircle className="w-4 h-4" />, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' };
    if (action?.includes('login')) return { icon: <LogIn className="w-4 h-4" />, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' };
    if (action?.includes('delete')) return { icon: <Trash2 className="w-4 h-4" />, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' };
    if (action?.includes('create')) return { icon: <Plus className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' };
    if (action?.includes('update')) return { icon: <Settings className="w-4 h-4" />, color: 'text-gold-400', bg: 'bg-gold-400/10', border: 'border-gold-400/20' };
    if (action?.includes('password')) return { icon: <Shield className="w-4 h-4" />, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' };
    if (action?.includes('credits')) return { icon: <CreditCard className="w-4 h-4" />, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' };
    if (action?.includes('agent')) return { icon: <Activity className="w-4 h-4" />, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20' };
    if (action?.includes('knowledge')) return { icon: <FileText className="w-4 h-4" />, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' };
    if (action?.includes('rollback')) return { icon: <RotateCcw className="w-4 h-4" />, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' };
    if (action?.includes('plan')) return { icon: <Zap className="w-4 h-4" />, color: 'text-gold-400', bg: 'bg-gold-400/10', border: 'border-gold-400/20' };
    return { icon: <FileText className="w-4 h-4" />, color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/20' };
  };

  const getActionLabel = (action) => {
    const labels = {
      'login': 'Connexion',
      'register': 'Inscription',
      'create_user': 'Création utilisateur',
      'update_user': 'Mise à jour utilisateur',
      'soft_delete_user': 'Désactivation utilisateur',
      'hard_delete_user': 'Suppression définitive',
      'restore_user': 'Restauration utilisateur',
      'reset_password': 'Réinitialisation mot de passe',
      'add_credits': 'Ajout de crédits',
      'create_agent': 'Création Agent',
      'update_agent': 'Mise à jour Agent',
      'delete_agent': 'Suppression Agent',
      'rollback_action': 'Annulation (Rollback)',
      'add_knowledge': 'Ajout Connaissance',
      'upload_knowledge': 'Upload Document',
      'extract_url_knowledge': 'Extraction URL',
      'update_plan': 'Mise à jour Plan',
      'update_ai_model': 'Mise à jour Modèle IA',
      'add_global_knowledge': 'Ajout Connaissance Globale',
      'upload_global_knowledge': 'Upload Fichier Global',
      'extract_url_global_knowledge': 'Extraction URL Globale',
      'update_global_knowledge': 'Mise à jour Conn. Globale',
      'delete_global_knowledge': 'Suppression Conn. Globale',
      'login_failed': 'Échec de connexion',
      'brute_force_detected': '🚨 Brute Force Détecté',
      'update_api_key': 'Clé API modifiée',
      'forgot_password_request': 'Demande réinit. MDP',
      'reset_password_success': 'MDP réinitialisé',
      'update_profile': 'Profil mis à jour'
    };
    return labels[action] || action;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      full: date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      relative: (() => {
        const now = new Date();
        const diff = (now - date) / 1000;
        if (diff < 60) return "À l'instant";
        if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
        return null;
      })()
    };
  };

  const getAuthorColor = (name) => {
    if (!name || name === 'Système') return 'from-gray-700 to-gray-800';
    const colors = [
      'from-blue-500/20 to-indigo-500/20',
      'from-emerald-500/20 to-teal-500/20',
      'from-purple-500/20 to-pink-500/20',
      'from-amber-500/20 to-orange-500/20',
      'from-cyan-500/20 to-blue-500/20'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast here if available, or just visual feedback on the button
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-8 bg-gold-400 rounded-full" />
            <h2 className="text-2xl font-display font-bold text-gray-100 tracking-tight">Journal d'activité</h2>
          </div>
          <p className="text-gray-400 text-sm max-w-md">
            Supervisez en temps réel toutes les actions critiques effectuées sur la plateforme.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="p-3 bg-space-800/50 border border-space-700/50 rounded-xl text-gray-400 hover:text-gold-400 hover:border-gold-400/30 transition-all"
          title="Rafraîchir"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Panel */}
      <div className="card bg-space-900/60 border-space-700/50 p-4 space-y-4 rounded-2xl">
        {/* Row 1: Search + Action type + Entity type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword / action search */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher (action, mot-clé…)"
              className="input-dark pl-10 w-full h-10 text-sm bg-space-800/50 border-space-700/50 rounded-xl focus:border-gold-400/50"
              value={filters.action || ''}
              onChange={(e) => onFilterChange({ ...filters, action: e.target.value, actionExact: '' })}
            />
          </div>

          {/* Predefined action type */}
          <select
            className="input-dark h-10 text-sm bg-space-800/50 border-space-700/50 rounded-xl px-3 text-white cursor-pointer"
            value={filters.actionExact || ''}
            onChange={(e) => onFilterChange({ ...filters, actionExact: e.target.value, action: '' })}
          >
            <option value="">Toutes les actions</option>
            <optgroup label="Authentification">
              <option value="login">Connexion</option>
              <option value="login_failed">Échec connexion</option>
              <option value="brute_force_detected">Brute Force</option>
              <option value="register">Inscription</option>
              <option value="reset_password">Réinit. MDP</option>
              <option value="forgot_password_request">Demande réinit. MDP</option>
            </optgroup>
            <optgroup label="Utilisateurs">
              <option value="create_user">Création utilisateur</option>
              <option value="update_user">Mise à jour utilisateur</option>
              <option value="soft_delete_user">Désactivation utilisateur</option>
              <option value="hard_delete_user">Suppression définitive</option>
              <option value="restore_user">Restauration utilisateur</option>
            </optgroup>
            <optgroup label="Agents & IA">
              <option value="create_agent">Création Agent</option>
              <option value="update_agent">Mise à jour Agent</option>
              <option value="delete_agent">Suppression Agent</option>
              <option value="update_ai_model">Modèles IA</option>
              <option value="update_api_key">Clé API modifiée</option>
            </optgroup>
            <optgroup label="Connaissances">
              <option value="add_knowledge">Ajout Connaissance</option>
              <option value="upload_knowledge">Upload Document</option>
              <option value="extract_url_knowledge">Extraction URL</option>
            </optgroup>
            <optgroup label="Système">
              <option value="update_plan">Mise à jour Plan</option>
              <option value="rollback_action">Annulation (Rollback)</option>
            </optgroup>
          </select>

          {/* Entity type */}
          <select
            className="input-dark h-10 text-sm bg-space-800/50 border-space-700/50 rounded-xl px-3 text-white cursor-pointer"
            value={filters.entityType || ''}
            onChange={(e) => onFilterChange({ ...filters, entityType: e.target.value })}
          >
            <option value="">Toutes les entités</option>
            <option value="user">Utilisateurs</option>
            <option value="agent">Agents</option>
            <option value="plan">Plans</option>
            <option value="product">Produits</option>
            <option value="ai_model">Modèles IA</option>
            <option value="knowledge">Connaissances</option>
          </select>

          {/* Errors only toggle */}
          <button
            onClick={() => onFilterChange({ ...filters, onlyErrors: !filters.onlyErrors })}
            className={`h-10 px-4 rounded-xl text-sm font-semibold border transition-all flex items-center gap-2 ${
              filters.onlyErrors
                ? 'bg-red-500/20 border-red-500/40 text-red-400'
                : 'bg-space-800/50 border-space-700/50 text-gray-400 hover:text-red-400 hover:border-red-500/30'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Erreurs seulement
          </button>
        </div>

        {/* Row 2: Date range + IP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-space-700/30">
          <div className="relative">
            <label className="absolute -top-2 left-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-space-900 px-1">De</label>
            <input
              type="date"
              className="input-dark h-10 w-full text-sm bg-space-800/50 border-space-700/50 rounded-xl px-3 text-white"
              value={filters.dateFrom || ''}
              onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
            />
          </div>
          <div className="relative">
            <label className="absolute -top-2 left-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-space-900 px-1">À</label>
            <input
              type="date"
              className="input-dark h-10 w-full text-sm bg-space-800/50 border-space-700/50 rounded-xl px-3 text-white"
              value={filters.dateTo || ''}
              onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
            />
          </div>
          <div className="relative">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Filtrer par adresse IP…"
              className="input-dark pl-10 h-10 w-full text-sm bg-space-800/50 border-space-700/50 rounded-xl"
              value={filters.ip || ''}
              onChange={(e) => onFilterChange({ ...filters, ip: e.target.value })}
            />
          </div>
          <button
            onClick={() => onFilterChange({ action: '', actionExact: '', userId: '', entityType: '', dateFrom: '', dateTo: '', ip: '', onlyErrors: false })}
            className="h-10 px-4 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 border border-space-700/50 hover:border-red-500/30 bg-space-800/50 transition-all flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Active Filters Pills */}
      {(filters.action || filters.actionExact || filters.userId || filters.entityType || filters.dateFrom || filters.dateTo || filters.ip || filters.onlyErrors) && (
        <div className="flex flex-wrap gap-2 -mt-2 animate-fadeIn">
          {filters.onlyErrors && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-full">
              🚨 Erreurs seulement
              <button onClick={() => onFilterChange({ ...filters, onlyErrors: false })} className="hover:text-red-200"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.action && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gold-400/10 border border-gold-400/20 text-gold-400 text-xs font-semibold rounded-full">
              Action: {filters.action}
              <button onClick={() => onFilterChange({ ...filters, action: '' })} className="hover:text-gold-200"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.actionExact && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gold-400/10 border border-gold-400/20 text-gold-400 text-xs font-semibold rounded-full">
              Action exacte: {filters.actionExact}
              <button onClick={() => onFilterChange({ ...filters, actionExact: '' })} className="hover:text-gold-200"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.userId && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-400/10 border border-blue-400/20 text-blue-400 text-xs font-semibold rounded-full">
              Utilisateur: {filterUserName || filters.userId.slice(0, 8) + '…'}
              <button onClick={() => onFilterChange({ ...filters, userId: '' })} className="hover:text-blue-200"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.entityType && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-400/10 border border-purple-400/20 text-purple-400 text-xs font-semibold rounded-full">
              Entité: {filters.entityType}
              <button onClick={() => onFilterChange({ ...filters, entityType: '' })} className="hover:text-purple-200"><X className="w-3 h-3" /></button>
            </span>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-xs font-semibold rounded-full">
              📅 {filters.dateFrom || '…'} → {filters.dateTo || '…'}
              <button onClick={() => onFilterChange({ ...filters, dateFrom: '', dateTo: '' })} className="hover:text-emerald-200"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.ip && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-xs font-semibold rounded-full">
              IP: {filters.ip}
              <button onClick={() => onFilterChange({ ...filters, ip: '' })} className="hover:text-cyan-200"><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      )}

      {/* Main Table Card */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-gold-400/10 to-transparent rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
        <div className="relative card overflow-hidden border-space-700/50 bg-space-900/80 backdrop-blur-xl rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-space-800/30 text-gray-500 text-[11px] uppercase tracking-[0.2em] font-bold">
                  <th className="px-8 py-5">Événement</th>
                  <th className="px-6 py-5">Auteur</th>
                  <th className="px-6 py-5">Cible</th>
                  <th className="px-6 py-5">Moment</th>
                  <th className="px-8 py-5 text-right">Infos Réseau</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-800/50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 border-2 border-gold-400/10 border-t-gold-400 rounded-full animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-gold-400/50" />
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-500 animate-pulse">Synchronisation du journal...</p>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-50">
                        <div className="w-16 h-16 bg-space-800/50 rounded-3xl flex items-center justify-center border border-space-700/50">
                          <Activity className="w-8 h-8 text-gray-600" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-gray-300 font-semibold">Aucune activité</p>
                          <p className="text-xs text-gray-500">Les logs apparaîtront ici dès qu'une action sera effectuée.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const details = typeof log.details === 'string' ? JSON.parse(log.details || '{}') : (log.details || {});
                    const styles = getActionStyles(log.action);
                    const time = formatDate(log.created_at);
                    const isReversible = !!details.changes;

                    return (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group/row">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${styles.bg} ${styles.border} border ${styles.color} shadow-lg shadow-black/20`}>
                              {styles.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-gray-100 group-hover/row:text-gold-400 transition-colors">
                                  {getActionLabel(log.action)}
                                </p>
                                {isReversible && onRollback && (
                                  <button 
                                    onClick={() => onRollback(log.id)}
                                    className="p-1 rounded-md bg-white/5 text-[9px] text-gray-500 hover:text-gold-400 hover:bg-gold-400/10 transition-all uppercase tracking-wider font-bold border border-white/5"
                                    title="Annuler cette modification"
                                  >
                                    Rollback
                                  </button>
                                )}
                              </div>
                              <div className="mt-1">
                                {(() => {
                                  // Handle change logs (old vs new)
                                  if (details.changes && typeof details.changes === 'object') {
                                    return (
                                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                                        {Object.entries(details.changes).map(([field, delta]) => {
                                          const oldVal = String(delta.old);
                                          const newVal = String(delta.new);
                                          const isLong = oldVal.length > 20 || newVal.length > 20;

                                          return (
                                            <div key={field} className={`flex items-center gap-1.5 text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/5 ${isLong ? 'w-full' : ''}`}>
                                              <span className="text-gray-500 font-medium">{field}:</span>
                                              <span className={`text-red-400/80 line-through decoration-red-400/30 truncate ${isLong ? 'max-w-[120px]' : 'whitespace-nowrap'}`} title={oldVal}>{oldVal}</span>
                                              <ArrowRight className="w-2.5 h-2.5 text-gray-600 flex-shrink-0" />
                                              <span className={`text-emerald-400 font-bold truncate ${isLong ? 'max-w-[120px]' : 'whitespace-nowrap'}`} title={newVal}>{newVal}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  }

                                  // Handle rollback logs
                                  if (log.action === 'rollback_action') {
                                    return (
                                      <div className="flex flex-col gap-1">
                                        <p className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                                          <AlertCircle className="w-2.5 h-2.5" />
                                          Action annulée (ID: #{details.target_log_id?.slice(-6)})
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                          {details.rolled_back_fields?.map(field => (
                                            <span key={field} className="text-[9px] bg-amber-400/10 text-amber-400 px-1 rounded border border-amber-400/20">
                                              {field}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Handle simple details
                                  const label = details.name || details.title || details.email || details.url || (typeof log.details === 'string' ? log.details : null);
                                  if (label && typeof label === 'string') {
                                    return <p className="text-[10px] text-gray-500 font-mono truncate max-w-[220px]" title={label}>{label}</p>;
                                  }

                                  return null;
                                })()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAuthorColor(log.user_name)} border border-white/5 flex items-center justify-center flex-shrink-0 shadow-inner group-hover/row:scale-110 transition-transform`}>
                              {log.user_name ? (
                                <span className="text-xs font-bold text-gray-200">
                                  {log.user_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </span>
                              ) : (
                                <User className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-200 truncate group-hover/row:text-white transition-colors">
                                {log.user_name || 'Système'}
                              </p>
                              <p className="text-[10px] text-gray-500 truncate">{log.user_email || 'Action automatisée'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {log.entity_type ? (
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/10 uppercase tracking-widest">
                                {log.entity_type}
                              </span>
                              <div className="flex items-center gap-1 group/id">
                                <span className="text-[10px] text-gray-500 font-mono" title={log.entity_id}>
                                  #{log.entity_id?.slice(-6)}
                                </span>
                                <button 
                                  onClick={() => copyToClipboard(log.entity_id)}
                                  className="opacity-0 group-hover/id:opacity-100 p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-gold-400 transition-all"
                                  title="Copier l'ID complet"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-gray-300 font-medium whitespace-nowrap">
                              <Clock className="w-3.5 h-3.5 text-gold-400/50" />
                              {time.full}
                            </div>
                            {time.relative && (
                              <p className="text-[10px] text-gray-500 pl-5">{time.relative}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="inline-flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 bg-black/20 px-2 py-0.5 rounded-full border border-white/5">
                              {details.geo ? (
                                <span title={`${details.geo.city}, ${details.geo.country}`}>{details.geo.emoji}</span>
                              ) : (
                                <Globe className="w-3 h-3 text-emerald-400/70" />
                              )}
                              {log.ip_address || '127.0.0.1'}
                            </div>
                            <div className="flex items-center gap-2 text-[9px] text-gray-600 max-w-[140px] truncate" title={log.user_agent}>
                              <Monitor className="w-3 h-3" />
                              {log.user_agent?.split(') ')[0]?.split(' (')[1] || 'Web Interface'}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Enhanced Pagination */}
          <div className="px-8 py-5 border-t border-space-800/50 bg-space-800/10 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-xs text-gray-500">
                Affichage de <span className="text-gray-300 font-bold">{logs.length}</span> sur <span className="text-gray-300 font-bold">{pagination.total}</span> événements
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                disabled={pagination.offset === 0}
                onClick={() => onPageChange(pagination.offset - pagination.limit)}
                className="p-2 rounded-xl bg-space-800 border border-space-700 text-gray-400 hover:text-gold-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
              <div className="flex gap-1">
                 {[...Array(Math.min(5, Math.ceil(pagination.total / pagination.limit)))].map((_, i) => (
                   <div key={i} className={`w-1.5 h-1.5 rounded-full ${Math.floor(pagination.offset / pagination.limit) === i ? 'bg-gold-400 w-4' : 'bg-space-700'} transition-all`} />
                 ))}
              </div>
              <button 
                disabled={pagination.offset + pagination.limit >= pagination.total}
                onClick={() => onPageChange(pagination.offset + pagination.limit)}
                className="p-2 rounded-xl bg-space-800 border border-space-700 text-gray-400 hover:text-gold-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}
