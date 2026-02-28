import { useState, useEffect } from 'react'
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
  Calendar
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
  const { isDark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('7d')
  const [overview, setOverview] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [agentPerformance, setAgentPerformance] = useState([])
  const [peakHours, setPeakHours] = useState({ data: [], peakHours: [] })
  const [funnel, setFunnel] = useState([])
  const [topProducts, setTopProducts] = useState([])

  useEffect(() => {
    loadAnalytics()
  }, [period])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const [overviewRes, timelineRes, agentsRes, peakRes, funnelRes, productsRes] = await Promise.all([
        api.get(`/analytics/overview?period=${period}`),
        api.get(`/analytics/messages-timeline?period=${period}`),
        api.get('/analytics/agent-performance'),
        api.get('/analytics/peak-hours'),
        api.get('/analytics/conversion-funnel'),
        api.get('/analytics/top-products')
      ])

      setOverview(overviewRes.data.overview)
      setTimeline(timelineRes.data.data)
      setAgentPerformance(agentsRes.data.agents)
      setPeakHours(peakRes.data)
      setFunnel(funnelRes.data.funnel)
      setTopProducts(productsRes.data.products)
    } catch (error) {
      console.error('Error loading analytics:', error)
      toast.error('Erreur lors du chargement des analytics')
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, growth, icon: Icon, color = 'gold' }) => {
    const isPositive = growth >= 0
    const colorStyles = {
      gold: {
        gradient: 'from-gold-400/20 to-gold-400/5 border-gold-400/30',
        iconBg: 'bg-gold-400/20',
        iconText: 'text-gold-400'
      },
      blue: {
        gradient: 'from-blue-400/20 to-blue-400/5 border-blue-400/30',
        iconBg: 'bg-blue-400/20',
        iconText: 'text-blue-400'
      },
      emerald: {
        gradient: 'from-emerald-400/20 to-emerald-400/5 border-emerald-400/30',
        iconBg: 'bg-emerald-400/20',
        iconText: 'text-emerald-400'
      }
    }
    const styles = colorStyles[color] || colorStyles.gold

    return (
      <div className={`card p-4 sm:p-6 bg-gradient-to-br ${styles.gradient} border`}>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${styles.iconBg}`}>
            <Icon className={`w-4 h-4 sm:w-6 sm:h-6 ${styles.iconText}`} />
          </div>
          {growth !== undefined && (
            <div className={`flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />}
              <span>{Math.abs(growth)}%</span>
            </div>
          )}
        </div>
        <p className="text-xl sm:text-3xl font-display font-bold text-gray-100">{value?.toLocaleString() || 0}</p>
        <p className="text-[10px] sm:text-sm text-gray-400 mt-1 uppercase tracking-wider font-medium">{title}</p>
      </div>
    )
  }

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold text-gray-100">Analytics</h1>
          <p className="text-gray-400 text-sm sm:text-base">Performances et métriques de votre activité</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Period selector */}
          <div className="flex bg-space-800 rounded-lg p-1">
            {['7d', '30d', '90d'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  period === p
                    ? 'bg-gold-400 text-space-900'
                    : 'text-gray-400 hover:text-gray-100'
                }`}
              >
                {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : '90 jours'}
              </button>
            ))}
          </div>
          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-100 hover:bg-space-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Conversations"
          value={overview?.conversations?.value}
          growth={overview?.conversations?.growth}
          icon={MessageSquare}
          color="gold"
        />
        <StatCard
          title="Messages"
          value={overview?.messages?.value}
          growth={overview?.messages?.growth}
          icon={BarChart3}
          color="blue"
        />
        <StatCard
          title="Leads"
          value={overview?.leads?.value}
          growth={overview?.leads?.growth}
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="Commandes"
          value={overview?.orders?.value}
          growth={overview?.orders?.growth}
          icon={ShoppingCart}
          color="blue"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages Timeline */}
        <div className="card p-6">
          <h3 className="text-lg font-display font-semibold text-gray-100 mb-4">Messages dans le temps</h3>
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
            <h3 className="text-lg font-display font-semibold text-gray-100">Heures de pointe</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
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
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Performance */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="text-lg font-display font-semibold text-gray-100 mb-4">Performance des agents</h3>
          <div className="space-y-4">
            {agentPerformance.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Aucun agent créé</p>
            ) : (
              agentPerformance.map((agent) => (
                <div key={agent.id} className="flex items-center gap-4 p-4 bg-space-800 rounded-xl">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    agent.whatsapp_connected ? 'bg-emerald-500/20' : 'bg-gray-500/20'
                  }`}>
                    <Bot className={`w-5 h-5 ${agent.whatsapp_connected ? 'text-emerald-400' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-100 truncate">{agent.name}</p>
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
          <h3 className="text-lg font-display font-semibold text-gray-100 mb-4">Tunnel de conversion</h3>
          <div className="space-y-3">
            {funnel.map((stage, index) => {
              const maxCount = Math.max(...funnel.map(f => f.count), 1)
              const percentage = Math.round((stage.count / maxCount) * 100)
              
              return (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{stage.stage}</span>
                    <span className="font-medium text-gray-100">{stage.count}</span>
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
      {topProducts.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-display font-semibold text-gray-100 mb-4">Top produits vendus</h3>
          <div className="overflow-x-auto table-responsive">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-space-700">
                  <th className="pb-3 font-medium">Produit</th>
                  <th className="pb-3 font-medium text-right">Prix</th>
                  <th className="pb-3 font-medium text-right">Vendus</th>
                  <th className="pb-3 font-medium text-right">Revenus</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.slice(0, 5).map((product) => (
                  <tr key={product.id} className="border-b border-space-800">
                    <td className="py-3 text-gray-100">{product.name}</td>
                    <td className="py-3 text-right text-gray-400">{product.price?.toLocaleString()} XOF</td>
                    <td className="py-3 text-right font-medium text-gold-400">{product.total_sold}</td>
                    <td className="py-3 text-right font-medium text-emerald-400">{product.revenue?.toLocaleString()} XOF</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
