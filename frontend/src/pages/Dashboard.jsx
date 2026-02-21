import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { WelcomeModal, OnboardingChecklist, useOnboardingTour } from '../components/Onboarding'
import { 
  Bot, 
  MessageSquare, 
  Sparkles, 
  TrendingUp,
  Plus,
  ArrowRight,
  AlertTriangle,
  Zap,
  Users,
  Clock,
  RefreshCw,
  Crown,
  WifiOff,
  CheckCircle2
} from 'lucide-react'
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function Dashboard() {
  const { user } = useAuth()
  const location = useLocation()
  const { startTour, completedTours } = useOnboardingTour()
  const [stats, setStats] = useState(null)
  const [agents, setAgents] = useState([])
  const [quotas, setQuotas] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)

  // Reload data when navigating to this page
  useEffect(() => {
    loadData()
  }, [location.key])

  useEffect(() => {
    // Check if first visit for THIS user (user-specific key)
    if (user?.id) {
      const welcomeKey = `has_seen_welcome_${user.id}`
      const hasSeenWelcome = localStorage.getItem(welcomeKey)
      if (!hasSeenWelcome) {
        setShowWelcome(true)
        // Mark as seen immediately to prevent reappearing on navigation
        localStorage.setItem(welcomeKey, 'true')
      }
    }

    // Refresh data when tab becomes visible (user returns from another page)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData()
      }
    }

    // Refresh data when window gets focus
    const handleFocus = () => {
      loadData()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user?.id])

  const handleWelcomeComplete = () => {
    if (user?.id) {
      localStorage.setItem(`has_seen_welcome_${user.id}`, 'true')
    }
    setShowWelcome(false)
    // Start sidebar tour after welcome modal
    setTimeout(() => {
      startTour('sidebar')
    }, 500)
  }

  const loadData = async () => {
    try {
      const [statsRes, agentsRes, quotasRes] = await Promise.all([
        api.get('/stats/dashboard'),
        api.get('/agents'),
        api.get('/agents/quotas').catch(() => ({ data: null }))
      ])
      setStats(statsRes.data.stats)
      setAgents(agentsRes.data.agents)
      setQuotas(quotasRes.data)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate alerts
  const alerts = []
  
  if (quotas?.credit_warning?.level === 'critical') {
    alerts.push({ 
      type: 'error', 
      message: quotas.credit_warning.warning,
      action: 'Upgrader',
      link: '/dashboard/settings'
    })
  } else if (quotas?.credit_warning?.level === 'warning') {
    alerts.push({ 
      type: 'warning', 
      message: quotas.credit_warning.warning,
      action: 'Voir',
      link: '/dashboard/settings'
    })
  }
  
  const disconnectedAgents = agents.filter(a => a.is_active && !a.whatsapp_connected)
  if (disconnectedAgents.length > 0) {
    alerts.push({
      type: 'warning',
      message: `${disconnectedAgents.length} agent(s) déconnecté(s) de WhatsApp`,
      action: 'Reconnecter',
      link: `/dashboard/agents/${disconnectedAgents[0].id}`
    })
  }

  const inactiveAgents = agents.filter(a => !a.is_active)
  if (inactiveAgents.length > 0 && agents.length > 1) {
    alerts.push({
      type: 'info',
      message: `${inactiveAgents.length} agent(s) désactivé(s)`,
      action: 'Gérer',
      link: '/dashboard/agents'
    })
  }

  // Stats for pie chart
  const agentStatusData = [
    { name: 'Connectés', value: agents.filter(a => a.whatsapp_connected).length, color: '#22c55e' },
    { name: 'Déconnectés', value: agents.filter(a => !a.whatsapp_connected && a.is_active).length, color: '#f59e0b' },
    { name: 'Inactifs', value: agents.filter(a => !a.is_active).length, color: '#6b7280' },
  ].filter(d => d.value > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    )
  }

  // Prepare onboarding data
  const onboardingData = {
    agentsCount: agents?.length || 0,
    whatsappConnected: agents?.filter(a => a.whatsapp_connected)?.length || 0,
    productsCount: stats?.products || 0,
    knowledgeCount: (stats?.knowledge_items || 0) + (stats?.global_knowledge || 0),
    messagesCount: stats?.messages?.total || 0
  }

  return (
    <div className="space-y-6">
      {/* Welcome Modal for first-time users */}
      <WelcomeModal 
        isOpen={showWelcome} 
        onClose={() => setShowWelcome(false)}
        onComplete={handleWelcomeComplete}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-100">
            Bonjour, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-400">Voici un aperçu de votre activité</p>
        </div>
        <button 
          onClick={loadData}
          className="p-2 text-gray-400 hover:text-gray-100 hover:bg-space-800 rounded-lg transition-colors"
          title="Actualiser"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Onboarding Checklist */}
      <div data-tour="checklist">
        <OnboardingChecklist data={onboardingData} />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div 
              key={index}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                alert.type === 'error' 
                  ? 'bg-red-500/10 border-red-500/30' 
                  : alert.type === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-blue-500/10 border-blue-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-5 h-5 ${
                  alert.type === 'error' ? 'text-red-400' : 
                  alert.type === 'warning' ? 'text-amber-400' : 'text-blue-400'
                }`} />
                <span className={`${
                  alert.type === 'error' ? 'text-red-400' : 
                  alert.type === 'warning' ? 'text-amber-400' : 'text-blue-400'
                }`}>
                  {alert.message}
                </span>
              </div>
              <Link 
                to={alert.link}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  alert.type === 'error' 
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                    : alert.type === 'warning'
                      ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                      : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                }`}
              >
                {alert.action} →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-violet-400" />
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              stats?.agents?.active > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
            }`}>
              {stats?.agents?.active || 0} actifs
            </span>
          </div>
          <h3 className="text-3xl font-display font-bold text-gray-100">{stats?.agents?.total || 0}</h3>
          <p className="text-sm text-gray-500">Agents IA</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            {stats?.conversations?.this_week > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/20 text-emerald-400">
                +{stats.conversations.this_week} cette semaine
              </span>
            )}
          </div>
          <h3 className="text-3xl font-display font-bold text-gray-100">{stats?.conversations?.total || 0}</h3>
          <p className="text-sm text-gray-500">Conversations</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            {stats?.messages?.today > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-500/20 text-blue-400">
                +{stats.messages.today} aujourd'hui
              </span>
            )}
          </div>
          <h3 className="text-3xl font-display font-bold text-gray-100">{stats?.messages?.total || 0}</h3>
          <p className="text-sm text-gray-500">Messages</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gold-400/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-gold-400" />
            </div>
            {quotas && (
              <Link to="/dashboard/settings" className="text-xs px-2 py-0.5 rounded-full font-medium bg-gold-400/20 text-gold-400 hover:bg-gold-400/30">
                {quotas.plan.displayName}
              </Link>
            )}
          </div>
          <h3 className="text-3xl font-display font-bold text-gold-400">{stats?.credits || quotas?.credits || 0}</h3>
          <p className="text-sm text-gray-500">Crédits restants</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Link
          to="/dashboard/analytics"
          className="text-sm text-gray-400 hover:text-gold-400 transition-colors flex items-center gap-1"
        >
          Évolution et détails
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Charts Row: Analytics CTA + Agent Status */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Analytics détaillés - évite doublon avec page Analytics */}
        <div className="lg:col-span-2">
          <Link
            to="/dashboard/analytics"
            className="card p-6 block h-full border border-space-700 hover:border-gold-400/40 bg-gradient-to-br from-space-800/80 to-space-800/40 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gold-400/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-gold-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-display font-semibold text-gray-100 mb-1">Analytics détaillés</h2>
                <p className="text-sm text-gray-400 mb-4">
                  Messages dans le temps, performances par agent, heures de pointe, tunnel de conversion et top produits.
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-gold-400">
                  Voir les analytics
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Agent Status Pie */}
        <div className="card p-6">
          <h2 className="text-lg font-display font-semibold text-gray-100 mb-6">Statut des agents</h2>
          
          {agentStatusData.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="w-full min-h-[180px]" style={{ height: 180, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={160}>
                <PieChart>
                  <Pie
                    data={agentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {agentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a2e', 
                      border: '1px solid #2d2d44',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {agentStatusData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-gray-400">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-gray-500">
              Aucun agent
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions & Agents */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">Actions rapides</h2>
          <div className="space-y-3">
            <Link 
              to="/dashboard/agents"
              className="flex items-center gap-3 p-3 bg-space-800/50 rounded-xl hover:bg-space-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="font-medium text-gray-100">Créer un agent</p>
                <p className="text-xs text-gray-500">Nouveau chatbot IA</p>
              </div>
            </Link>
            <Link 
              to="/dashboard/conversations"
              className="flex items-center gap-3 p-3 bg-space-800/50 rounded-xl hover:bg-space-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-gray-100">Voir conversations</p>
                <p className="text-xs text-gray-500">{stats?.conversations?.total || 0} au total</p>
              </div>
            </Link>
            <Link 
              to="/dashboard/settings"
              className="flex items-center gap-3 p-3 bg-space-800/50 rounded-xl hover:bg-space-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-gold-400/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <p className="font-medium text-gray-100">Gérer mon plan</p>
                <p className="text-xs text-gray-500">{quotas?.plan?.displayName || 'Gratuit'}</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Agents Section */}
        <div className="lg:col-span-2 card">
          <div className="p-6 border-b border-space-700 flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-gray-100">Mes Agents</h2>
            <Link
              to="/dashboard/agents"
              className="text-gold-400 hover:text-gold-300 text-sm font-medium flex items-center gap-1 transition-colors"
            >
              Voir tout
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {agents.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-space-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-100 mb-2">
                Aucun agent créé
              </h3>
              <p className="text-gray-400 mb-4">
                Créez votre premier assistant IA
              </p>
              <Link
                to="/dashboard/agents"
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Créer un agent
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-space-700">
              {agents.slice(0, 4).map((agent) => (
                <Link
                  key={agent.id}
                  to={`/dashboard/agents/${agent.id}`}
                  className="flex items-center justify-between p-4 hover:bg-space-800 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      !agent.is_active 
                        ? 'bg-gray-500/20' 
                        : agent.whatsapp_connected 
                          ? 'bg-emerald-500/20' 
                          : 'bg-orange-500/20'
                    }`}>
                      <Bot className={`w-5 h-5 ${
                        !agent.is_active 
                          ? 'text-gray-500' 
                          : agent.whatsapp_connected 
                            ? 'text-emerald-400' 
                            : 'text-orange-400'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-100">{agent.name}</h3>
                        {!agent.is_active && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400">
                            Inactif
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {agent.total_conversations || 0} conv. · {agent.total_messages || 0} msg
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {agent.is_active ? (
                      agent.whatsapp_connected ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          Connecté
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-orange-400">
                          <WifiOff className="w-4 h-4" />
                          Déconnecté
                        </span>
                      )
                    ) : null}
                    <ArrowRight className="w-5 h-5 text-gray-500" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Credit usage info */}
      {quotas && quotas.usage && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-gray-100">Utilisation ce mois</h2>
            <Link to="/dashboard/settings" className="text-gold-400 hover:text-gold-300 text-sm">
              Détails →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-space-800/50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">Messages IA</p>
              <p className="text-2xl font-bold text-gray-100">{quotas.usage.ai_messages_this_month || 0}</p>
            </div>
            <div className="bg-space-800/50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">Crédits utilisés</p>
              <p className="text-2xl font-bold text-gray-100">{quotas.usage.credits_used_this_month || 0}</p>
            </div>
            <div className="bg-space-800/50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">Conversations</p>
              <p className="text-2xl font-bold text-gray-100">{quotas.usage.conversations_this_month || 0}</p>
            </div>
            <div className="bg-space-800/50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">Messages total</p>
              <p className="text-2xl font-bold text-gray-100">{quotas.usage.messages_this_month || 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
