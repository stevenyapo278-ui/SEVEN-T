import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import { 
  TrendingUp, 
  TrendingDown, 
  MessageSquare, 
  Users, 
  ShoppingCart, 
  DollarSign,
  BarChart3,
  Clock,
  Bot,
  ArrowUpRight,
  RefreshCw,
  Calendar,
  Filter,
  ChevronDown,
  Target,
  Heart,
  Zap
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts'
import toast from 'react-hot-toast'

const COLORS = ['#F5D47A', '#8B5CF6', '#22C55E', '#3B82F6', '#EF4444']


export default function Analytics() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('7d')
  const [activeTab, setActiveTab] = useState('overview') // 'overview' or 'social'
  const [insights, setInsights] = useState([])
  const [overview, setOverview] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [agentPerformance, setAgentPerformance] = useState([])
  const [peakHours, setPeakHours] = useState({ data: [], peakHours: [] })
  const [funnel, setFunnel] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [productsSeasonality, setProductsSeasonality] = useState({ data: [], products: [] })
  const [heatmapData, setHeatmapData] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('all')
  const [showAgentFilter, setShowAgentFilter] = useState(false)
  const [relanceROI, setRelanceROI] = useState(null)
  const [sentimentStats, setSentimentStats] = useState([])
  const [conversionStats, setConversionStats] = useState([])

  const isModuleEnabled = (() => {
    const feat = user?.plan_features?.analytics
    const override = user?.analytics_module_enabled
    const isOverrideTrue = override === 1 || override === '1' || override === true
    const isOverrideFalse = override === 0 || override === '0'
    if (!user?.parent_user_id || user?.role === 'owner') {
      if (isOverrideFalse) return false
      return !!feat || isOverrideTrue
    }
    return isOverrideTrue
  })()

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const agentParam = selectedAgent !== 'all' ? `&agentId=${selectedAgent}` : ''
      const [overviewRes, timelineRes, agentsRes, peakRes, funnelRes, productsRes, seasonalityRes, heatmapRes, roiRes, sentimentRes, conversionRes] = await Promise.all([
        api.get(`/analytics/overview?period=${period}${agentParam}`),
        api.get(`/analytics/messages-timeline?period=${period}${agentParam}`),
        api.get('/analytics/agent-performance'),
        api.get('/analytics/peak-hours'),
        api.get('/analytics/conversion-funnel'),
        api.get(`/analytics/top-products?period=${period}${agentParam}`),
        api.get(`/analytics/products-seasonality`),
        api.get(`/analytics/weekly-heatmap`),
        api.get(`/analytics/relance-roi?period=${period}${agentParam}`),
        api.get('/analytics/sentiment-stats'),
        api.get('/analytics/conversion-stats')
      ])

      setOverview(overviewRes.data.overview)
      setTimeline(timelineRes.data.data)
      setAgentPerformance(agentsRes.data.agents)
      setPeakHours(peakRes.data)
      setFunnel(funnelRes.data.funnel)
      setTopProducts(productsRes.data.products)
      setProductsSeasonality(seasonalityRes.data)
      setHeatmapData(heatmapRes.data.data)
      setRelanceROI(roiRes.data)
      setSentimentStats(sentimentRes.data.stats)
      setConversionStats(conversionRes.data.stats)

      // Fetch Insights
      const insightsRes = await api.get('/analytics/insights')
      setInsights(insightsRes.data.insights || [])
    } catch (error) {
      console.error('Error loading analytics:', error)
      toast.error('Erreur lors du chargement des analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isModuleEnabled) {
      loadAnalytics()
    }
  }, [period, selectedAgent, isModuleEnabled])

  if (!isModuleEnabled) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0">
      {/* Header Hero */}
      <div className={`relative rounded-2xl sm:rounded-3xl border p-4 sm:p-8 mb-4 sm:mb-8 ${
        isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200'
      }`}>
        <div
          className="absolute inset-0 opacity-50"
          style={{ backgroundImage: `url(${isDark ? "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+" : "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2NDc0OGIiIGZpbGwtb3BhY2l0eT0iMC4wNiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+"})` }}
          aria-hidden
        />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2 min-w-0">
                <div className="p-2 bg-gold-400/10 rounded-xl flex-shrink-0">
                  <BarChart3 className="size-6 text-gold-400" />
                </div>
                <h1 className={`text-2xl sm:text-3xl font-display font-bold break-words ${isDark ? 'text-white' : 'text-gray-900'}`}>Tableau de Bord</h1>
              </div>
              <p className={`text-base sm:text-lg break-words ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                Analysez vos performances et prévoyez vos besoins futurs
              </p>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex items-center gap-6 mt-8 border-b border-white/5">
             <button
               onClick={() => setActiveTab('overview')}
               className={`pb-4 text-sm font-bold tracking-wider uppercase transition-all relative ${activeTab === 'overview' ? 'text-gold-400' : 'text-gray-500 hover:text-gray-300'}`}
             >
               Performances
               {activeTab === 'overview' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-400 rounded-full" />}
             </button>
             <button
               onClick={() => setActiveTab('social')}
               className={`pb-4 text-sm font-bold tracking-wider uppercase transition-all relative flex items-center gap-2 ${activeTab === 'social' ? 'text-gold-400' : 'text-gray-500 hover:text-gray-300'}`}
             >
               Social Listening
               <span className="bg-gold-400/20 text-gold-400 text-[10px] px-1.5 py-0.5 rounded-full">BÊTA IA</span>
               {activeTab === 'social' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-400 rounded-full" />}
             </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0 relative z-20 mt-6">
            {activeTab === 'overview' && (
              <>
                {/* Agent selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowAgentFilter(!showAgentFilter)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 min-h-[40px] ${
                      isDark ? 'bg-space-800 border-space-700 text-gray-300 hover:border-gold-400/50' : 'bg-white border-gray-300 text-gray-700 hover:border-gold-400'
                    }`}
                  >
                    <Bot className="size-4" />
                    <span className="max-w-[120px] truncate">
                      {selectedAgent === 'all' ? 'Tous les agents' : agentPerformance.find(a => a.id === selectedAgent)?.name || 'Agent'}
                    </span>
                    <ChevronDown className="size-4 opacity-50" />
                  </button>
                  {showAgentFilter && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowAgentFilter(false)} />
                      <div className="absolute right-0 top-full mt-2 w-56 bg-space-900 border border-space-700 rounded-xl shadow-2xl z-40 py-2 animate-fadeIn">
                        <button
                          onClick={() => { setSelectedAgent('all'); setShowAgentFilter(false); }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-space-800 transition-colors ${selectedAgent === 'all' ? 'text-gold-400 font-bold' : 'text-gray-400'}`}
                        >
                          Tous les agents
                        </button>
                        {agentPerformance.map(agent => (
                          <button
                            key={agent.id}
                            onClick={() => { setSelectedAgent(agent.id); setShowAgentFilter(false); }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-space-800 transition-colors ${selectedAgent === agent.id ? 'text-gold-400 font-bold' : 'text-gray-400'}`}
                          >
                            {agent.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className={`flex rounded-xl p-1 ${isDark ? 'bg-space-800' : 'bg-gray-100'}`}>
                  {['7d', '30d', '90d'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                        period === p
                          ? isDark ? 'bg-gold-400 text-space-950 shadow-lg' : 'bg-white text-gray-900 shadow-sm'
                          : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {p === '7d' ? '7j' : p === '30d' ? '30j' : '90j'}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button
              onClick={loadAnalytics}
              disabled={loading}
              className={`p-2 rounded-xl transition-all duration-200 ${
                isDark ? 'bg-space-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'
              }`}
            >
              <RefreshCw className={`size-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
              {loading && !overview ? (
                [1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-24 rounded-xl border animate-pulse ${isDark ? 'bg-space-800/50 border-space-700/50' : 'bg-gray-100 border-gray-200'}`} />
                ))
              ) : (
                <>
                  <StatSmall
                    title="Conversations"
                    value={overview?.conversations?.value}
                    growth={overview?.conversations?.growth}
                    icon={MessageSquare}
                    color="blue"
                  />
                  <StatSmall
                    title="Messages"
                    value={overview?.messages?.value}
                    growth={overview?.messages?.growth}
                    icon={BarChart3}
                    color="gold"
                  />
                  <StatSmall
                    title="Leads"
                    value={overview?.leads?.value}
                    growth={overview?.leads?.growth}
                    icon={Users}
                    color="emerald"
                  />
                  <StatSmall
                    title="Commandes"
                    value={overview?.orders?.value}
                    growth={overview?.orders?.growth}
                    icon={ShoppingCart}
                    color="amber"
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>


      {activeTab === 'overview' ? (
        <>
          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Messages Timeline */}
            <div className="card p-6">
              <h3 className="text-lg font-display font-semibold text-zinc-100 mb-4">Messages dans le temps</h3>
              <div className="w-full" style={{ width: '100%', minWidth: 200, height: 320, minHeight: 200 }}>
                <ResponsiveContainer width="100%" height={320} minWidth={200} minHeight={200}>
                  <AreaChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#F3F4F6' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="incoming"
                      stackId="1"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.5}
                      name="Entrants"
                    />
                    <Area
                      type="monotone"
                      dataKey="outgoing"
                      stackId="1"
                      stroke="#F5D47A"
                      fill="#F5D47A"
                      fillOpacity={0.5}
                      name="Sortants"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Peak Hours */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-semibold text-zinc-100">Heures de pointe</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="size-4" />
                  <span>Pics: {peakHours.peakHours?.join(', ') || 'N/A'}</span>
                </div>
              </div>
              <div className="w-full" style={{ width: '100%', minWidth: 200, height: 320, minHeight: 200 }}>
                <ResponsiveContainer width="100%" height={320} minWidth={200} minHeight={200}>
                  <BarChart data={peakHours.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="label" stroke="#9CA3AF" fontSize={10} interval={2} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#F3F4F6' }}
                    />
                    <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Messages" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Relance Adoption Timeline */}
            <div className="card p-6 lg:col-span-2">
              <h3 className="text-lg font-display font-semibold text-zinc-100 mb-4">Adoption des Relances AI</h3>
              <div className="w-full" style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={relanceROI?.daily_performance || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} />
                    <YAxis stroke="#9CA3AF" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
                    />
                    <Area type="monotone" dataKey="generated" stroke="#9CA3AF" fill="#9CA3AF" fillOpacity={0.1} name="Suggérées" />
                    <Area type="monotone" dataKey="sent" stroke="#F5D47A" fill="#F5D47A" fillOpacity={0.3} name="Confirmées" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sentiment & Conversion row */}
            <div className="card p-6">
                <h3 className="text-lg font-display font-semibold text-zinc-100 mb-4">Sentiment Client</h3>
                <div className="w-full h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={sentimentStats}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="count"
                                nameKey="sentiment"
                            >
                                {sentimentStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.sentiment === 'positive' ? '#22C55E' : entry.sentiment === 'negative' ? '#EF4444' : '#3B82F6'} />
                                ))}
                            </Pie>
                            <Tooltip 
                                 contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <div className="size-2 rounded-full bg-emerald-500" /> Positif
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <div className="size-2 rounded-full bg-blue-500" /> Neutre
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <div className="size-2 rounded-full bg-red-500" /> Négatif
                    </div>
                </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agent Performance */}
            <div className="card p-6 lg:col-span-2">
              <h3 className="text-lg font-display font-semibold text-zinc-100 mb-4">Performance des agents</h3>
              <div className="space-y-4">
                {agentPerformance.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Aucun agent créé</p>
                ) : (
                  agentPerformance.map((agent) => (
                    <div key={agent.id} className="flex items-center gap-4 p-4 bg-space-800 rounded-xl">
                      <div className={`size-10 rounded-lg flex items-center justify-center ${
                        agent.whatsapp_connected ? 'bg-emerald-500/20' : 'bg-gray-500/20'
                      }`}>
                        <Bot className={`size-5 ${agent.whatsapp_connected ? 'text-emerald-400' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-zinc-100 truncate">{agent.name}</p>
                          {agent.is_active ? (
                            <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">Actif</span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded">Inactif</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                          <span>{agent.conversations} conv.</span>
                          <span>{agent.messages} msgs</span>
                          <span>{agent.responses} réponses</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gold-400">{agent.messages}</p>
                        <p className="text-xs text-gray-500">messages</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Conversion Funnel */}
            <div className="card p-6">
              <h3 className="text-lg font-display font-semibold text-zinc-100 mb-4">Tunnel de conversion</h3>
              <div className="space-y-3">
                {funnel.map((stage, index) => {
                  const maxCount = Math.max(...funnel.map(f => f.count), 1)
                  const percentage = Math.round((stage.count / maxCount) * 100)
                  
                  return (
                    <div key={stage.stage} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">{stage.stage}</span>
                        <span className="font-medium text-zinc-100">{stage.count}</span>
                      </div>
                      <div className="h-2 bg-space-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="pb-8">
            {topProducts.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-display font-semibold text-zinc-100 mb-4">Top produits ({period === '7d' ? '7 derniers jours' : period === '30d' ? '30 derniers jours' : '90 derniers jours'})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-400 border-b border-space-700">
                        <th className="pb-3 font-medium">Produit</th>
                        <th className="pb-3 font-medium text-right">Vendus</th>
                        <th className="pb-3 font-medium text-right">Revenus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.slice(0, 10).map((product) => (
                        <tr key={product.id} className="border-b border-space-800">
                          <td className="py-3 text-zinc-100">{product.name}</td>
                          <td className="py-3 text-right font-medium text-gold-400">{product.total_sold}</td>
                          <td className="py-3 text-right font-medium text-emerald-400">
                            {product.revenue?.toLocaleString()} <span className="text-[10px] opacity-70">XOF</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Seasonality & Heatmap Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
             {/* Potential Conversion Distribution */}
             <div className="card p-6">
                <h3 className="text-lg font-display font-semibold text-zinc-100 mb-1">Potentiel de Conversion</h3>
                <p className="text-xs text-gray-400 mb-6">Volume de conversations par score de potentiel</p>
                <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={conversionStats}>
                            <XAxis dataKey="bucket" stroke="#9CA3AF" fontSize={10} />
                            <YAxis stroke="#9CA3AF" fontSize={10} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
                            />
                            <Bar dataKey="count" fill="#F5D47A" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
             </div>

             {/* Yearly Seasonality - Seasonal supply forecasting */}
             <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                   <div>
                      <h3 className="text-lg font-display font-semibold text-zinc-100">Saisonnalité Annuelle</h3>
                      <p className="text-xs text-gray-400">Ventes mensuelles pour prévoir vos stocks</p>
                   </div>
                   <Calendar className="size-5 text-gold-400 opacity-50" />
                </div>
                {productsSeasonality.data.length > 0 ? (
                   <div className="w-full h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={productsSeasonality.data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip
                               contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                               itemStyle={{ fontSize: '10px' }}
                            />
                            {productsSeasonality.products.map((name, index) => (
                               <Bar 
                                  key={name}
                                  dataKey={name}
                                  stackId="a"
                                  fill={COLORS[index % COLORS.length]}
                                  radius={[0, 0, 0, 0]}
                               />
                            ))}
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                ) : (
                   <div className="flex items-center justify-center h-[300px] bg-space-800/20 rounded-2xl border border-dashed border-space-700">
                      <p className="text-gray-500 italic">Données insuffisantes pour la saisonnalité</p>
                   </div>
                )}
             </div>

             {/* Weekly Heatmap */}
             <div className="card p-6">
                <h3 className="text-lg font-display font-semibold text-zinc-100 mb-1">Pics d'Heures & Jours</h3>
                <p className="text-xs text-gray-400 mb-6">Activité des clients sur les 30 derniers jours</p>
                
                <div className="grid grid-cols-1 gap-1">
                   {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                      <div key={day} className="flex items-center gap-2">
                         <span className="text-[10px] text-gray-500 w-6 font-bold uppercase">{day}</span>
                         <div className="flex-1 flex gap-0.4 sm:gap-1">
                            {Array.from({ length: 24 }).map((_, h) => {
                               const d = heatmapData.find(item => item.day === day && item.hour === h)
                               const count = d?.count || 0
                               let bgColor = 'bg-space-800'
                               if (count > 0) bgColor = 'bg-gold-400/10'
                               if (count > 5) bgColor = 'bg-gold-400/30'
                               if (count > 15) bgColor = 'bg-gold-400/60'
                               if (count > 30) bgColor = 'bg-gold-400'
                               
                               return (
                                  <div 
                                     key={h}
                                     className={`flex-1 h-3 sm:h-4 rounded-[2px] transition-all duration-500 ${bgColor}`}
                                     title={`${day} ${h}h: ${count} messages`}
                                  />
                               )
                            })}
                         </div>
                      </div>
                   ))}
                   <div className="flex gap-2 mt-2 ml-8">
                      <span className="text-[8px] text-gray-600">0h</span>
                      <div className="flex-1" />
                      <span className="text-[8px] text-gray-600">12h</span>
                      <div className="flex-1" />
                      <span className="text-[8px] text-gray-600">23h</span>
                   </div>
                </div>
                
                <div className="mt-6 flex items-center justify-end gap-3">
                   <span className="text-[10px] text-gray-500">Calme</span>
                   <div className="flex gap-1">
                      <div className="size-3 rounded-[2px] bg-space-800" />
                      <div className="size-3 rounded-[2px] bg-gold-400/30" />
                      <div className="size-3 rounded-[2px] bg-gold-400" />
                   </div>
                   <span className="text-[10px] text-gray-500">Intense</span>
                </div>
             </div>
          </div>
        </>
      ) : (
        <div className="space-y-6 pb-20 animate-fadeIn">
          {insights.length > 0 ? (
            insights.map((insight, idx) => (
              <div key={insight.id} className="space-y-6 border-b border-white/5 pb-12 last:border-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-display font-bold text-white flex items-center gap-3">
                    <Bot className="size-5 text-gold-400" />
                    Rapport du {new Date(insight.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {idx === 0 && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold ml-2">Dernière analyse</span>}
                  </h2>
                </div>

                {/* Summary Hero */}
                <div className="card p-8 bg-gradient-to-br from-gold-400/10 via-space-900 to-space-900 border-gold-400/20 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Zap className="size-32 text-gold-400" />
                   </div>
                   <div className="relative z-10">
                      <h3 className="text-gold-400 font-display font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
                        <Bot className="size-4" /> Analyse SEVEN-T Intelligence
                      </h3>
                      <p className="text-xl sm:text-2xl text-zinc-100 leading-relaxed max-w-4xl font-display font-medium">
                        "{insight.content.summary}"
                      </p>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                   {/* Topics */}
                   <div className="card p-6 bg-space-900/50 border-blue-400/10">
                      <h3 className="text-sm font-display font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                         <Target className="size-4 text-blue-400" />
                         Points d'Intérêt Clients
                      </h3>
                      <div className="flex flex-wrap gap-2">
                         {insight.content.top_topics?.map(topic => (
                            <span key={topic} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                               {topic}
                            </span>
                         ))}
                      </div>
                   </div>

                   {/* Sentiment Trend */}
                   <div className="card p-6 bg-space-900/50 border-white/5">
                      <h3 className="text-sm font-display font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                         <Heart className={`size-4 ${insight.content.sentiment_trend === 'positive' ? 'text-emerald-400' : insight.content.sentiment_trend === 'negative' ? 'text-red-400' : 'text-gray-400'}`} />
                         Tonalité Globale
                      </h3>
                      <div className="flex items-center gap-4">
                         <div className={`size-14 rounded-2xl flex items-center justify-center ${
                            insight.content.sentiment_trend === 'positive' ? 'bg-emerald-500/20 text-emerald-400' : 
                            insight.content.sentiment_trend === 'negative' ? 'bg-red-500/20 text-red-400' : 
                            'bg-gray-500/20 text-gray-400'
                         }`}>
                            {insight.content.sentiment_trend === 'positive' ? <TrendingUp className="size-8" /> : 
                             insight.content.sentiment_trend === 'negative' ? <TrendingDown className="size-8" /> : 
                             <RefreshCw className="size-8" />}
                         </div>
                         <div>
                            <p className="text-2xl font-display font-bold text-white capitalize">{insight.content.sentiment_trend === 'positive' ? 'Positive' : insight.content.sentiment_trend === 'negative' ? 'Négative' : 'Neutre'}</p>
                            <p className="text-xs text-gray-500">Moyenne pondérée des échanges</p>
                         </div>
                      </div>
                   </div>

                   {/* Friction Points */}
                   <div className="card p-6 bg-space-900/50 border-red-500/10">
                      <h3 className="text-sm font-display font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                         <Filter className="size-4 text-red-400" />
                         Alertes & Frictions
                      </h3>
                      <div className="space-y-3">
                         {insight.content.friction_points?.map((point, i) => (
                            <div key={i} className="group flex items-center justify-between p-3 bg-red-400/5 rounded-xl border border-red-400/10 hover:border-red-400/30 transition-all">
                               <span className="text-xs text-gray-300 font-medium">{point.issue}</span>
                               <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm ${
                                  point.frequency === 'high' ? 'bg-red-500 text-white' : 'bg-orange-500/20 text-orange-400'
                               }`}>
                                  {point.frequency === 'high' ? 'CRITIQUE' : 'Moyen'}
                               </span>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Opportunities List */}
                <div className="card p-8 border-gold-400/20 bg-gold-400/5 relative overflow-hidden group">
                   <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity">
                      <ArrowUpRight className="size-64 text-gold-400" />
                   </div>
                   <h3 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-3">
                      <div className="p-2 bg-gold-400/20 rounded-lg">
                        <Zap className="size-5 text-gold-400 animate-pulse" />
                      </div>
                      Recommandations de Croissance
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                      {insight.content.opportunities?.map((opp, i) => (
                         <div key={i} className="flex gap-5 p-5 bg-space-800/80 backdrop-blur-xl rounded-2xl border border-white/5 hover:border-gold-400/50 transition-all group/item shadow-2xl">
                            <div className="size-12 rounded-xl bg-gradient-to-br from-gold-400/30 to-transparent flex items-center justify-center flex-shrink-0 group-hover/item:scale-110 transition-transform shadow-inner">
                               <ArrowUpRight className="size-6 text-gold-400" />
                            </div>
                            <div className="flex-1">
                               <p className="text-base text-gray-200 font-medium leading-tight group-hover/item:text-white transition-colors">{opp}</p>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
              </div>
            ))
          ) : (
            <div className="card p-20 text-center flex flex-col items-center gap-6 border-dashed border-2 border-space-700 bg-space-900/20">
               <div className="relative">
                  <div className="absolute inset-0 bg-gold-400/20 blur-3xl animate-pulse" />
                  <div className="size-24 bg-space-800 rounded-[2.5rem] flex items-center justify-center relative rotate-12 hover:rotate-0 transition-transform duration-500 border border-space-700 shadow-2xl">
                     <Bot className="size-12 text-gold-400" />
                  </div>
               </div>
               <div className="max-w-md">
                  <h3 className="text-2xl font-display font-bold text-white mb-3">Intelligence en incubation...</h3>
                  <p className="text-gray-400 leading-relaxed font-medium">
                     L'IA SEVEN-T compile vos échanges récents pour générer un rapport stratégique. 
                     <span className="block mt-4 text-sm text-gold-400/70 italic">Astuce : Plus vous avez de conversations, plus les insights seront précis.</span>
                  </p>
               </div>
               <div className="flex gap-2">
                 {[1,2,3].map(i => <div key={i} className="size-2 rounded-full bg-gold-400 animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />)}
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatSmall({ title, value, growth, icon: Icon, color = 'blue' }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const isPositive = growth >= 0

  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    gold: 'bg-gold-400/10 text-gold-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    purple: 'bg-purple-500/10 text-purple-400'
  }

  return (
    <div className={`rounded-xl p-4 border transition-all duration-300 ${isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg flex-shrink-0 ${colorClasses[color]}`}>
          <Icon className="size-5" />
        </div>
        {growth !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            <span>{isPositive ? '+' : ''}{growth}%</span>
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{value?.toLocaleString() || 0}</p>
        <p className={`text-[10px] uppercase font-bold tracking-wider truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{title}</p>
      </div>
    </div>
  )
}
