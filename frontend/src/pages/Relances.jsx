import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import toast from 'react-hot-toast';
import { BellRing, Check, X, Clock, RefreshCw, Send, Loader2, MessageSquare, TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Relances() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const STATUS_LABELS = { pending: 'À confirmer', sent: 'Envoyées', ignored: 'Ignorées' };

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'sent' | 'ignored'
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [editingContent, setEditingContent] = useState({});
  const [showHelp, setShowHelp] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/relances/stats');
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchRelances = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/relances?status=${activeTab}`);
      setLogs(data);
      // Initialize edit states
      const newEdits = {};
      data.forEach(log => {
        newEdits[log.id] = log.message_content;
      });
      setEditingContent(newEdits);
    } catch (err) {
      toast.error('Erreur lors du chargement des relances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelances();
    fetchStats();
  }, [activeTab]);

  const handleSend = async (id) => {
    setProcessingId(id);
    try {
      await api.post(`/relances/${id}/send`, { message_content: editingContent[id] });
      toast.success('Relance envoyée avec succès');
      setLogs(logs.filter(log => log.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l’envoi');
    } finally {
      setProcessingId(null);
    }
  };

  const handleIgnore = async (id) => {
    setProcessingId(id);
    try {
      await api.post(`/relances/${id}/ignore`);
      toast.success('Relance ignorée');
      setLogs(logs.filter(log => log.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l’annulation');
    } finally {
      setProcessingId(null);
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'abandoned_cart': return 'Panier Abandonné';
      case 'cold_relance': return 'Relance Froide';
      case 'postponed_order': return 'Commande Reportée';
      default: return type;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className={`relative rounded-2xl sm:rounded-3xl border p-4 sm:p-8 ${
          isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50 border-blue-100'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-xl flex-shrink-0">
                <BellRing className="w-6 h-6 text-blue-400" />
              </div>
              <h1 className={`text-2xl sm:text-3xl font-display font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Suivi des Relances
              </h1>
              <div 
                className="group relative cursor-help"
                onMouseEnter={() => setShowHelp(true)}
                onMouseLeave={() => setShowHelp(false)}
              >
                <div className="p-1.5 bg-gold-400/10 rounded-full border border-gold-400/20">
                    <span className="text-gold-400 font-bold text-sm">!</span>
                </div>
                
                {showHelp && (
                  <div className={`absolute left-0 top-10 z-[100] w-72 sm:w-80 p-5 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-top-2 ${
                    isDark ? 'bg-space-800 border-space-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
                  }`}>
                    <h4 className="font-bold flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-gold-400 animate-pulse" />
                      Fonctionnement de l'IA
                    </h4>
                    <ul className="space-y-3 text-xs sm:text-sm">
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">1.</span>
                        <span><b>Demande de Prix :</b> Détecte si un client a demandé un tarif sans donner suite après 24h.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">2.</span>
                        <span><b>Panier Abandonné :</b> Détecte l'intention d'achat réelle (produits listés) via analyse sémantique.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">3.</span>
                        <span><b>Filtrage Politesse :</b> Ignore automatiquement les messages de clôture ("Merci", "Bonne journée").</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">4.</span>
                        <span><b>Zéro Doublon :</b> Une seule relance intelligente générée par cycle.</span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <p className={`text-base flex-1 pr-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Gérez les requêtes de l'assistant proactif pour vos clients inactifs.
            </p>
          </div>
          <button
            onClick={fetchRelances}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm flex-shrink-0 ${
              isDark ? 'bg-space-800 hover:bg-space-700 text-gray-200 border border-space-700' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Statistics Section */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
          {/* Trend Chart */}
          <div className={`lg:col-span-2 p-6 rounded-2xl border ${isDark ? 'bg-space-900/50 border-space-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Tendance des Relances</h3>
              </div>
              <span className="text-xs text-gray-500 font-medium">7 derniers jours</span>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.dailyTrends}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1E293B' : '#F1F5F9'} vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748B', fontSize: 10}} 
                    tickFormatter={(val) => format(new Date(val), 'dd/MM')}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 10}} />
                  <ReTooltip 
                    contentStyle={{ backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#F1F5F9', borderRadius: '12px' }}
                    labelStyle={{ color: isDark ? '#94A3B8' : '#64748B' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" name="Générées" />
                  <Area type="monotone" dataKey="sent" stroke="#10B981" strokeWidth={2} fill="transparent" name="Envoyées" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribution Card */}
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-space-900/50 border-space-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <PieChartIcon className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Répartition des États</h3>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusDist}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="status"
                  >
                    {stats.statusDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#EF4444'][index % 3]} />
                    ))}
                  </Pie>
                  <ReTooltip 
                    contentStyle={{ backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#F1F5F9', borderRadius: '12px' }}
                  />
                  <Legend 
                    formatter={(val) => <span className="text-xs font-medium">{STATUS_LABELS[val] || val}</span>}
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-space-700">
               <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Suggestion</span>
                  <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {stats.statusDist.reduce((acc, curr) => acc + Number(curr.count), 0)}
                  </span>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={`flex items-center gap-2 p-1 rounded-xl overflow-x-auto whitespace-nowrap hide-scrollbar border ${
        isDark ? 'bg-space-900/50 border-space-700/50' : 'bg-gray-100/50 border-gray-200'
      }`}>
        {[
          { id: 'pending', label: 'À confirmer', icon: Clock },
          { id: 'sent', label: 'Historique', icon: Check },
          { id: 'ignored', label: 'Ignorées', icon: X }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 justify-center sm:flex-none sm:justify-start ${
              activeTab === tab.id
                ? isDark 
                  ? 'bg-space-800 text-white shadow-sm ring-1 ring-space-700' 
                  : 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                : isDark
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-space-800/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'pending' && activeTab === 'pending' && logs.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                {logs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className={`text-center py-12 rounded-2xl border ${isDark ? 'border-space-700/50 bg-space-800/20' : 'border-gray-200 bg-white'}`}>
            <BellRing className={`w-12 h-12 mx-auto mb-3 opacity-20 ${isDark ? 'text-white' : 'text-gray-900'}`} />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Aucune relance {activeTab === 'pending' ? 'en attente' : activeTab === 'sent' ? 'envoyée' : 'ignorée'}</h3>
            <p className={`text-sm mt-1 max-w-sm mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              L'assistant proactif génère automatiquement des suggestions ici lorsqu'il détecte des paniers abandonnés ou des clients inactifs.
            </p>
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className={`rounded-xl border p-5 transition-all ${
              isDark ? 'border-space-700 bg-space-800/40 hover:bg-space-800/60' : 'border-gray-200 bg-white hover:border-blue-200'
            }`}>
              <div className="flex flex-col md:flex-row gap-5">
                {/* Info & Reason */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold">
                      {(log.contact_name || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {log.contact_name || log.contact_number || 'Utilisateur inconnu'}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {format(new Date(log.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </div>
                    </div>
                    <div className="ml-auto flex flex-col items-end gap-1">
                       <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400">
                        {getTypeLabel(log.type)}
                      </span>
                    </div>
                  </div>

                  {log.reason && (
                    <div className={`text-sm py-2 px-3 rounded-lg border-l-2 border-gold-400 ${
                      isDark ? 'bg-gold-400/5 text-gray-300' : 'bg-gold-50 text-gray-700'
                    }`}>
                      <span className="font-semibold text-gold-500">Raison IA :</span> {log.reason}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className={`text-sm font-medium flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      <MessageSquare className="w-4 h-4 text-gray-400" /> Message proposé
                    </label>
                    <textarea 
                      value={editingContent[log.id] || ''}
                      onChange={(e) => setEditingContent({...editingContent, [log.id]: e.target.value})}
                      disabled={activeTab !== 'pending'}
                      className={`w-full min-h-[80px] p-3 rounded-xl text-sm border focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-y ${
                        isDark 
                          ? 'bg-space-900/50 border-space-600 text-gray-200 placeholder-gray-600' 
                          : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                      placeholder="Contenu du message..."
                    />
                  </div>
                </div>

                {/* Actions */}
                {activeTab === 'pending' && (
                  <div className={`flex flex-row md:flex-col items-center gap-2 md:pl-5 border-t md:border-t-0 md:border-l pt-4 md:pt-0 ${
                    isDark ? 'border-space-700' : 'border-gray-200'
                  }`}>
                    <button
                      onClick={() => handleSend(log.id)}
                      disabled={processingId === log.id}
                      className="w-full flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
                    >
                      {processingId === log.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      Envoyer
                    </button>
                    <button
                      onClick={() => handleIgnore(log.id)}
                      disabled={processingId === log.id}
                      className={`w-full flex-1 flex items-center justify-center gap-2 py-2.5 px-4 font-semibold rounded-xl transition-all ${
                        isDark ? 'hover:bg-space-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                      } disabled:opacity-50`}
                    >
                      <X className="w-5 h-5" />
                      Ignorer
                    </button>
                  </div>
                )}
                
                {activeTab === 'sent' && log.sent_at && (
                    <div className={`flex items-center gap-2 text-sm md:w-32 md:justify-center font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                        <Check className="w-4 h-4" /> Envoyé le {format(new Date(log.sent_at), "dd/MM", { locale: fr })}
                    </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
