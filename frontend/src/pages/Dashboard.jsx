import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  CheckCircle2,
  UserPlus,
  ShoppingCart,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

export default function Dashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const { startTour, completedTours } = useOnboardingTour()
  const [stats, setStats] = useState(null)
  const [agents, setAgents] = useState([])
  const [quotas, setQuotas] = useState(null)
  const [weeklyActivity, setWeeklyActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)
  const [selectedAlertView, setSelectedAlertView] = useState(null)
  const [selectedAgentView, setSelectedAgentView] = useState(null)

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
      const [statsRes, agentsRes, quotasRes, weeklyRes] = await Promise.all([
        api.get('/stats/dashboard'),
        api.get('/agents'),
        api.get('/agents/quotas').catch(() => ({ data: null })),
        api.get('/stats/weekly-activity').catch(() => ({ data: { data: [] } }))
      ])
      setStats(statsRes.data.stats)
      setAgents(agentsRes.data.agents)
      setQuotas(quotasRes.data)
      setWeeklyActivity(weeklyRes.data?.data || [])
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
      action: t('dashboard.alerts.upgrade'),
      link: '/dashboard/settings'
    })
  } else if (quotas?.credit_warning?.level === 'warning') {
    alerts.push({ 
      type: 'warning', 
      message: quotas.credit_warning.warning,
      action: t('dashboard.alerts.view'),
      link: '/dashboard/settings'
    })
  }
  
  const disconnectedAgents = agents.filter(a => a.is_active && !a.whatsapp_connected)
  if (disconnectedAgents.length > 0) {
    alerts.push({
      type: 'warning',
      message: t('dashboard.alerts.disconnectedAgents', { count: disconnectedAgents.length }),
      action: t('dashboard.alerts.reconnect'),
      link: `/dashboard/agents/${disconnectedAgents[0].id}`
    })
  }

  const inactiveAgents = agents.filter(a => !a.is_active)
  if (inactiveAgents.length > 0 && agents.length > 1) {
    alerts.push({
      type: 'info',
      message: t('dashboard.alerts.inactiveAgents', { count: inactiveAgents.length }),
      action: t('dashboard.alerts.manage'),
      link: '/dashboard/agents'
    })
  }

  // Stats for pie chart
  const agentStatusData = [
    { name: t('common.connected'), value: agents.filter(a => a.whatsapp_connected).length, color: '#22c55e' },
    { name: t('common.disconnected'), value: agents.filter(a => !a.whatsapp_connected && a.is_active).length, color: '#f59e0b' },
    { name: t('common.inactive'), value: agents.filter(a => !a.is_active).length, color: '#6b7280' },
  ].filter(d => d.value > 0)

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center min-h-64 py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 flex-shrink-0" aria-hidden />
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
    <div className="max-w-6xl mx-auto w-full space-y-6">
      {/* Welcome Modal for first-time users */}
      <WelcomeModal 
        isOpen={showWelcome} 
        onClose={() => setShowWelcome(false)}
        onComplete={handleWelcomeComplete}
      />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold text-gray-100 truncate">
            {t('dashboard.welcomeGreeting', { name: user?.name?.split(' ')[0] || '' })}
          </h1>
          <p className="text-gray-400">{t('dashboard.welcomeSubtitle')}</p>
        </div>
        <button 
          onClick={loadData}
          className="p-2 text-gray-400 hover:text-gray-100 hover:bg-space-800 rounded-lg transition-colors touch-target flex items-center justify-center flex-shrink-0"
          title={t('dashboard.refresh')}
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Onboarding Checklist */}
      <div data-tour="checklist">
        <OnboardingChecklist data={onboardingData} />
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div 
              key={index}
              onClick={() => setSelectedAlertView(alert)}
              className={`flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border animate-fadeIn cursor-pointer hover:scale-[1.02] transition-all ${
                alert.type === 'error' 
                  ? 'bg-red-500/10 border-red-500/30' 
                  : alert.type === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-blue-500/10 border-blue-500/30'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <AlertCircle className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${
                  alert.type === 'error' ? 'text-red-400' : 
                  alert.type === 'warning' ? 'text-amber-400' : 'text-blue-400'
                }`} />
                <span className={`text-sm sm:text-base truncate ${
                  alert.type === 'error' ? 'text-red-400' : 
                  alert.type === 'warning' ? 'text-amber-400' : 'text-blue-400'
                }`}>
                  {alert.message}
                </span>
              </div>
              <div className={`px-2 py-1 rounded-lg text-[10px] sm:text-sm font-medium ${
                alert.type === 'error' 
                  ? 'bg-red-500/20 text-red-400' 
                  : alert.type === 'warning'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-blue-500/20 text-blue-400'
              }`}>
                {t('common.details')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" data-tour="stats">
        <div className="card p-3 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            </div>
            <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium truncate ${
              stats?.agents?.active > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
            }`}>
              {stats?.agents?.active || 0} {t('dashboard.stats.active')}
            </span>
          </div>
          <h3 className="text-xl sm:text-3xl font-display font-bold text-gray-100">{stats?.agents?.total || 0}</h3>
          <p className="text-[10px] sm:text-sm text-gray-500 uppercase tracking-wider">{t('dashboard.stats.agents')}</p>
        </div>

        <div className="card p-3 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            {stats?.conversations?.this_week > 0 && (
              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium bg-emerald-500/20 text-emerald-400 truncate">
                +{stats.conversations.this_week}
              </span>
            )}
          </div>
          <h3 className="text-xl sm:text-3xl font-display font-bold text-gray-100">{stats?.conversations?.total || 0}</h3>
          <p className="text-[10px] sm:text-sm text-gray-500 uppercase tracking-wider">{t('dashboard.stats.conversations')}</p>
        </div>

        <div className="card p-3 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            </div>
            {stats?.messages?.today > 0 && (
              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium bg-blue-500/20 text-blue-400 truncate">
                +{stats.messages.today}
              </span>
            )}
          </div>
          <h3 className="text-xl sm:text-3xl font-display font-bold text-gray-100">{stats?.messages?.total || 0}</h3>
          <p className="text-[10px] sm:text-sm text-gray-500 uppercase tracking-wider">{t('dashboard.stats.messages')}</p>
        </div>

        <div className="card p-3 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gold-400/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-gold-400" />
            </div>
          </div>
          <h3 className="text-xl sm:text-3xl font-display font-bold text-gold-400">{stats?.credits || quotas?.credits || 0}</h3>
          <p className="text-[10px] sm:text-sm text-gray-500 uppercase tracking-wider">{t('dashboard.stats.credits')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agents Section */}
        <div className="lg:col-span-2 card" data-tour="agents-list">
          <div className="p-6 border-b border-space-700 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-display font-semibold text-gray-100 min-w-0 truncate">{t('dashboard.agents.title')}</h2>
            <Link
              to="/dashboard/agents"
              className="text-gold-400 hover:text-gold-300 text-sm font-medium flex items-center justify-center gap-1 transition-colors touch-target flex-shrink-0"
            >
              {t('dashboard.agents.viewAll')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {agents.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-space-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-100 mb-2">
                {t('dashboard.agents.none')}
              </h3>
              <p className="text-gray-400 mb-4">
                {t('dashboard.agents.createFirst')}
              </p>
              <Link
                to="/dashboard/agents"
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                {t('dashboard.agents.create')}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-space-700">
              {agents.slice(0, 4).map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgentView(agent)}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-space-800 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      !agent.is_active 
                        ? 'bg-gray-500/20' 
                        : agent.whatsapp_connected 
                          ? 'bg-emerald-500/20' 
                          : 'bg-orange-500/20'
                    }`}>
                      <Bot className={`w-4 h-4 sm:w-5 sm:h-5 ${
                        !agent.is_active 
                          ? 'text-gray-500' 
                          : agent.whatsapp_connected 
                            ? 'text-emerald-400' 
                            : 'text-orange-400'
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-gray-100 truncate group-hover:text-gold-400 transition-colors">{agent.name}</h3>
                        {!agent.is_active && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400">
                            {t('dashboard.agents.inactive')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {agent.total_conversations || 0} {t('dashboard.agents.conv')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    {agent.is_active ? (
                      agent.whatsapp_connected ? (
                        <div className="w-2 h-2 rounded-full bg-emerald-400" title="Connecté" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-orange-400" title="Déconnecté" />
                      )
                    ) : null}
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions Column */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Actions</h2>
            <div className="grid grid-cols-1 gap-3">
              <Link 
                to="/dashboard/conversations"
                className="flex items-center gap-3 p-3 bg-space-800/50 rounded-xl hover:bg-space-800 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-100">{t('nav.conversations')}</p>
                  <p className="text-xs text-gray-500">{t('dashboard.agents.manage')}</p>
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
                  <p className="font-medium text-gray-100">{t('nav.settings')}</p>
                  <p className="text-xs text-gray-500">{quotas?.plan?.displayName || t('settings.free')}</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Credit usage info */}
      {quotas && quotas.usage && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-gray-100">{t('dashboard.usage.title')}</h2>
            <Link to="/dashboard/settings" className="text-gold-400 hover:text-gold-300 text-sm">
              {t('common.details')} →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-space-800/50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">{t('dashboard.usage.aiMessages')}</p>
              <p className="text-2xl font-bold text-gray-100">{quotas.usage.ai_messages_this_month || 0}</p>
            </div>
            <div className="bg-space-800/50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">{t('dashboard.usage.creditsUsed')}</p>
              <p className="text-2xl font-bold text-gray-100">{quotas.usage.credits_used_this_month || 0}</p>
            </div>
            <div className="bg-space-800/50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">{t('dashboard.usage.conversations')}</p>
              <p className="text-2xl font-bold text-gray-100">{quotas.usage.conversations_this_month || 0}</p>
            </div>
            <div className="bg-space-800/50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">{t('dashboard.usage.totalMessages')}</p>
              <p className="text-2xl font-bold text-gray-100">{quotas.usage.messages_this_month || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Alert Detail Zoom View */}
      {selectedAlertView && (
        <DetailOverlay onClose={() => setSelectedAlertView(null)}>
          <div className="flex flex-col items-center text-center">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-lg ${
              selectedAlertView.type === 'error' ? 'bg-red-500/20' : 
              selectedAlertView.type === 'warning' ? 'bg-amber-500/20' : 'bg-blue-500/20'
            }`}>
              <AlertCircle className={`w-10 h-10 ${
                selectedAlertView.type === 'error' ? 'text-red-400' : 
                selectedAlertView.type === 'warning' ? 'text-amber-400' : 'text-blue-400'
              }`} />
            </div>
            <h3 className="text-2xl font-display font-bold text-gray-100 mb-4">Notification</h3>
            <p className="text-gray-300 mb-8 leading-relaxed">{selectedAlertView.message}</p>
            
            <div className="flex flex-col w-full gap-3">
              {selectedAlertView.link && (
                <Link 
                  to={selectedAlertView.link}
                  onClick={() => setSelectedAlertView(null)}
                  className="btn-primary w-full text-center"
                >
                  {selectedAlertView.action}
                </Link>
              )}
              <button onClick={() => setSelectedAlertView(null)} className="btn-secondary w-full">
                {t('common.close')}
              </button>
            </div>
          </div>
        </DetailOverlay>
      )}

      {/* Agent Quick View */}
      {selectedAgentView && (
        <DetailOverlay onClose={() => setSelectedAgentView(null)}>
          <div className="flex flex-col items-center text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-xl ring-4 ${
              selectedAgentView.whatsapp_connected ? 'bg-emerald-500/20 ring-emerald-500/20' : 'bg-orange-500/20 ring-orange-500/20'
            }`}>
              <Bot className={`w-10 h-10 ${
                selectedAgentView.whatsapp_connected ? 'text-emerald-400' : 'text-orange-400'
              }`} />
            </div>
            <h3 className="text-2xl sm:text-4xl font-display font-black text-gray-100 mb-2">{selectedAgentView.name}</h3>
            <div className="flex items-center gap-2 mb-8">
              <div className={`w-2 h-2 rounded-full ${selectedAgentView.whatsapp_connected ? 'bg-emerald-400' : 'bg-orange-400'}`} />
              <span className={`text-sm font-medium ${selectedAgentView.whatsapp_connected ? 'text-emerald-400' : 'text-orange-400'}`}>
                {selectedAgentView.whatsapp_connected ? 'Connecté à WhatsApp' : 'Déconnecté'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full mb-8">
              <div className="p-4 bg-space-800/50 rounded-2xl border border-space-700">
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Conversations</p>
                <p className="text-xl font-bold text-gray-100">{selectedAgentView.total_conversations || 0}</p>
              </div>
              <div className="p-4 bg-space-800/50 rounded-2xl border border-space-700">
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Messages</p>
                <p className="text-xl font-bold text-gray-100">{selectedAgentView.total_messages || 0}</p>
              </div>
            </div>

            <div className="flex flex-col w-full gap-3">
              <Link 
                to={`/dashboard/agents/${selectedAgentView.id}`}
                className="btn-primary w-full text-center"
              >
                {t('dashboard.agents.create')}
              </Link>
              <button onClick={() => setSelectedAgentView(null)} className="btn-secondary w-full">
                {t('common.close')}
              </button>
            </div>
          </div>
        </DetailOverlay>
      )}
    </div>
  )
}

function DetailOverlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-space-950/90 backdrop-blur-md animate-fade-in" />
      <div 
        className="relative z-10 w-full max-w-sm bg-space-900/50 border border-white/10 backdrop-blur-xl rounded-[2rem] shadow-2xl p-8 animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white">
          <XCircle className="w-6 h-6" />
        </button>
        {children}
      </div>
    </div>
  )
}
