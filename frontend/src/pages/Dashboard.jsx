import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import { WelcomeModal, OnboardingChecklist, useOnboardingTour } from '../components/Onboarding'
import {
  Bot, MessageSquare, Sparkles, TrendingUp,
  Plus, ArrowRight, AlertCircle, Zap, Crown, RefreshCw, XCircle
} from 'lucide-react'
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import NextBestAction from '../components/NextBestAction'
import useSWR from 'swr'

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { startTour, completedTours } = useOnboardingTour()

  const [showWelcome, setShowWelcome] = useState(false)
  const [selectedAlertView, setSelectedAlertView] = useState(null)
  const [selectedAgentView, setSelectedAgentView] = useState(null)
  const tourTimerRef = useRef(null)

  const fetchDashboardData = async () => {
    if (!isAuthenticated) return null;
    const [statsRes, agentsRes, quotasRes, weeklyRes] = await Promise.all([
      api.get('/stats/dashboard'),
      api.get('/agents'),
      api.get('/agents/quotas').catch(() => ({ data: null })),
      api.get('/stats/weekly-activity').catch(() => ({ data: { data: [] } })),
    ])
    return {
      stats: statsRes.data.stats,
      agents: agentsRes.data.agents,
      quotas: quotasRes.data,
      weeklyActivity: weeklyRes.data?.data || []
    }
  }

  const { data, isLoading: loading, mutate } = useSWR(
    isAuthenticated ? 'dashboardData' : null, 
    fetchDashboardData, 
    { 
      revalidateOnFocus: true, 
      dedupingInterval: 60000 
    }
  )

  const stats = data?.stats || null
  const agents = data?.agents || []
  const quotas = data?.quotas || null
  const weeklyActivity = data?.weeklyActivity || []

  useEffect(() => {
    return () => { if (tourTimerRef.current) clearTimeout(tourTimerRef.current) }
  }, [])

  // ── Welcome modal (first visit only) ────────────────────────────────────────
  useEffect(() => {
    if (user?.id) {
      const key = `has_seen_welcome_v2_${user.id}`
      if (!localStorage.getItem(key)) {
        setShowWelcome(true)
        localStorage.setItem(key, 'true')
      }
    }
  }, [user?.id])

  const handleWelcomeComplete = (shouldTour = false) => {
    setShowWelcome(false)
    if (shouldTour) return
    // Start sidebar tour after welcome modal closes
    if (!completedTours.includes('sidebar')) {
      tourTimerRef.current = setTimeout(() => startTour('sidebar'), 600)
    } else if (!completedTours.includes('dashboard')) {
      tourTimerRef.current = setTimeout(() => startTour('dashboard'), 800)
    }
  }



  // ── Alerts ──────────────────────────────────────────────────────────────────
  const alerts = []
  if (quotas?.credit_warning?.level === 'critical') {
    alerts.push({ type: 'error', message: quotas.credit_warning.warning, action: t('dashboard.alerts.upgrade'), link: '/dashboard/settings' })
  } else if (quotas?.credit_warning?.level === 'warning') {
    alerts.push({ type: 'warning', message: quotas.credit_warning.warning, action: t('dashboard.alerts.view'), link: '/dashboard/settings' })
  }
  if (user?.plan === 'free_expired') {
    alerts.unshift({ type: 'error', message: t('dashboard.alerts.trialExpired'), action: 'Mettre à niveau', link: '/dashboard/settings' })
  } else if (user?.plan === 'free' && user?.subscription_end_date) {
    const end = new Date(user.subscription_end_date)
    if (end > new Date()) {
      const diffMs = end - new Date()
      const days = Math.floor(diffMs / 86400000)
      const hours = Math.floor((diffMs % 86400000) / 3600000)
      alerts.unshift({
        type: 'warning',
        message: days > 0 ? `Il vous reste ${days}j et ${hours}h d'essai.` : `Moins de ${hours}h d'essai restants !`,
        action: 'Voir les plans',
        link: '/dashboard/settings',
      })
    }
  }

  // ── Onboarding data ─────────────────────────────────────────────────────────
  const onboardingData = {
    agentsCount: agents?.length || 0,
    whatsappConnected: agents?.filter(a => a.whatsapp_connected)?.length || 0,
    productsCount: stats?.products || 0,
    knowledgeCount: (stats?.knowledge_items || 0) + (stats?.global_knowledge || 0),
    messagesCount: stats?.messages?.total || 0,
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0">
      <WelcomeModal isOpen={showWelcome} onClose={() => setShowWelcome(false)} onComplete={handleWelcomeComplete} data={onboardingData} />

      {/* Disconnected agents warning */}
      {!loading && agents?.some(a => !a.whatsapp_connected) && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-100 text-red-700'}`}>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold">Un ou plusieurs agents sont déconnectés de WhatsApp.</p>
          </div>
          <Link to="/dashboard/whatsapp-status" className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isDark ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-red-600 text-white hover:bg-red-700'}`}>
            Réparer maintenant
          </Link>
        </div>
      )}

      {/* Hero section */}
      <div data-tour="stats" className={`relative rounded-2xl sm:rounded-3xl border p-4 sm:p-8 ${
        isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200'
      }`}>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gold-400/10 rounded-xl"><Sparkles className="w-6 h-6 text-gold-400" /></div>
                <h1 className={`text-2xl sm:text-3xl font-display font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t('dashboard.welcomeGreeting', { name: user?.name?.split(' ')[0] || '' })}
                </h1>
              </div>
              <p className={`text-base sm:text-lg ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{t('dashboard.welcomeSubtitle')}</p>
            </div>
            <button onClick={() => mutate()} disabled={loading} className={`p-2 rounded-xl border transition-all flex-shrink-0 ${isDark ? 'bg-space-800 border-space-700 text-gray-400 hover:text-white' : 'bg-white border-gray-200 text-gray-500'}`}>
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
            {!loading && stats ? (
              <>
                <StatCard icon={Bot} color="blue" value={stats.agents?.total || 0} label={t('dashboard.stats.agents')} isDark={isDark} />
                <StatCard icon={MessageSquare} color="emerald" value={stats.conversations?.total || 0} label={t('dashboard.stats.conversations')} isDark={isDark} />
                <StatCard icon={TrendingUp} color="blue" value={stats.messages?.total || 0} label={t('dashboard.stats.messages')} isDark={isDark} />
                <StatCard icon={Zap} color="gold" value={stats.credits || quotas?.credits || 0} label={t('dashboard.stats.credits')} isDark={isDark} />
              </>
            ) : (
              [1, 2, 3, 4].map(i => <SkeletonStatCard key={i} isDark={isDark} />)
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400" /></div>
      ) : (
        <>
          <NextBestAction data={onboardingData} />
          <OnboardingChecklist data={onboardingData} />

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-3">
              {alerts.map((alert, i) => (
                <div key={i} onClick={() => setSelectedAlertView(alert)} className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${
                  alert.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                  alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                  'bg-blue-500/10 border-blue-500/30 text-blue-400'
                }`}>
                  <div className="flex items-center gap-3 truncate"><AlertCircle className="w-5 h-5 flex-shrink-0" /><span className="truncate text-sm">{alert.message}</span></div>
                  <div className="px-2 py-1 bg-white/10 rounded text-xs font-medium">{t('common.details')}</div>
                </div>
              ))}
            </div>
          )}

          {/* Main content grid */}
          <div data-tour="agents-list" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card overflow-hidden">
              <div className="p-6 border-b border-space-700/60 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-100">{t('dashboard.agents.title')}</h2>
                <Link to="/dashboard/agents" className="text-gold-400 hover:text-gold-300 text-sm font-medium flex items-center gap-1">{t('dashboard.agents.viewAll')} <ArrowRight className="w-4 h-4" /></Link>
              </div>
              {agents.length === 0 ? (
                <div className="p-12 text-center">
                  <Bot className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">{t('dashboard.agents.none')}</p>
                  <Link to="/dashboard/agents" className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" /> {t('dashboard.agents.create')}</Link>
                </div>
              ) : (
                <div className="divide-y divide-space-700/40">
                  {agents.slice(0, 5).map(agent => (
                    <div key={agent.id} onClick={() => setSelectedAgentView(agent)} className="flex items-center justify-between p-4 hover:bg-space-800/50 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${agent.whatsapp_connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-400/10 text-orange-400'}`}><Bot className="w-5 h-5" /></div>
                        <div>
                          <p className="font-medium text-gray-200 group-hover:text-gold-400 transition-colors">{agent.name}</p>
                          <p className="text-xs text-gray-500">{agent.total_conversations || 0} conversations</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Raccourcis</h3>
                <div className="grid gap-3">
                  <QuickActionLink to="/dashboard/conversations" icon={MessageSquare} color="emerald" title={t('nav.conversations')} subtitle="Gérer les chats" isDark={isDark} />
                  <QuickActionLink to="/dashboard/settings" icon={Crown} color="gold" title={t('nav.settings')} subtitle={quotas?.plan?.displayName} isDark={isDark} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detail overlays */}
      {selectedAlertView && <DetailOverlay onClose={() => setSelectedAlertView(null)}><AlertContent alert={selectedAlertView} onClose={() => setSelectedAlertView(null)} t={t} /></DetailOverlay>}
      {selectedAgentView && <DetailOverlay onClose={() => setSelectedAgentView(null)}><AgentContent agent={selectedAgentView} onClose={() => setSelectedAgentView(null)} t={t} /></DetailOverlay>}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, color, value, label, isDark }) {
  const colorMap = { blue: 'text-blue-400 bg-blue-400/10', emerald: 'text-emerald-400 bg-emerald-400/10', gold: 'text-gold-400 bg-gold-400/10' }
  return (
    <div className={`rounded-xl p-4 border transition-all ${isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800' : 'bg-white border-gray-100 shadow-sm'}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl flex-shrink-0 ${colorMap[color] || colorMap.blue}`}><Icon className="w-5 h-5" /></div>
        <div className="min-w-0 flex-1">
          <p className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          <p className={`text-[10px] uppercase font-bold tracking-wider truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
        </div>
      </div>
    </div>
  )
}

function SkeletonStatCard({ isDark }) {
  return (
    <div className={`rounded-xl p-4 border ${isDark ? 'bg-space-800/50 border-space-700/50' : 'bg-white border-gray-100'}`}>
      <div className="animate-pulse flex items-center space-x-3">
        <div className="rounded-lg bg-gray-700/50 h-9 w-9" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-4 bg-gray-700/50 rounded w-1/2" />
          <div className="h-2 bg-gray-700/50 rounded w-3/4" />
        </div>
      </div>
    </div>
  )
}

function QuickActionLink({ to, icon: Icon, color, title, subtitle, isDark }) {
  const colorMap = { emerald: 'bg-emerald-500/10 text-emerald-400', gold: 'bg-gold-400/10 text-gold-400' }
  return (
    <Link to={to} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isDark ? 'bg-space-800/50 hover:bg-space-800' : 'bg-gray-50 hover:bg-gray-100'}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="font-medium text-gray-200">{title}</p>
        <p className="text-[10px] text-gray-500">{subtitle}</p>
      </div>
    </Link>
  )
}

function AlertContent({ alert, onClose, t }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${alert.type === 'error' ? 'bg-red-500/20 text-red-400' : alert.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}><AlertCircle className="w-8 h-8" /></div>
      <h3 className="text-xl font-bold text-gray-100 mb-2">Notification</h3>
      <p className="text-gray-400 mb-8 text-sm">{alert.message}</p>
      <div className="flex flex-col w-full gap-2">
        {alert.link && <Link to={alert.link} onClick={onClose} className="btn-primary py-2 text-sm">{alert.action}</Link>}
        <button onClick={onClose} className="text-gray-500 hover:text-white text-sm py-2">{t('common.close')}</button>
      </div>
    </div>
  )
}

function AgentContent({ agent, onClose, t }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${agent.whatsapp_connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-400/10 text-orange-400'}`}><Bot className="w-8 h-8" /></div>
      <h3 className="text-2xl font-bold text-gray-100 mb-1">{agent.name}</h3>
      <p className={`text-sm mb-8 ${agent.whatsapp_connected ? 'text-emerald-400' : 'text-orange-400'}`}>{agent.whatsapp_connected ? 'Connecté' : 'Déconnecté'}</p>
      <div className="flex flex-col w-full gap-2">
        <Link to={`/dashboard/agents/${agent.id}`} className="btn-primary py-2 text-sm">Ouvrir l'agent</Link>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-sm py-2">{t('common.close')}</button>
      </div>
    </div>
  )
}

function DetailOverlay({ children, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[101] w-full max-w-sm bg-space-900 border border-space-700/50 rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><XCircle className="w-5 h-5" /></button>
        {children}
      </div>
    </div>,
    document.body
  )
}
