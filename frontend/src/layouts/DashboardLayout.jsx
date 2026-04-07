import { useState, useRef, useEffect, useMemo } from 'react'
import { Outlet, NavLink, useNavigate, Link, useLocation, useNavigationType } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CurrencyContext from '../contexts/CurrencyContext'
import AnimatedBackground from '../components/AnimatedBackground'
import { useAuth } from '../contexts/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { useTheme } from '../contexts/ThemeContext'
import { useOnboardingTour } from '../components/Onboarding'
import { useModuleAvailability } from '../hooks/useModuleAvailability'
import { AnimatePresence, motion } from 'framer-motion'
import api from '../services/api'
import { saveSessionLocation } from '../utils/sessionLocation'
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  ChevronRight,
  User,
  CreditCard,
  HelpCircle,
  Zap,
  Package,
  BookOpen,
  UserPlus,
  ShoppingCart,
  BarChart3,
  Megaphone,
  FileText,
  Workflow,
  Target,
  FileBarChart,
  Store,
  Send,
  Wrench,
  Wallet,
  Briefcase,
  ChevronLeft,
  Gift,
  LifeBuoy,
  Activity,
  Users,
  Crown,
  Radio,
} from 'lucide-react'
import GlobalAIAssistant from '../components/AI/GlobalAIAssistant'
import GlobalAIAssistantModal from '../components/AI/GlobalAIAssistantModal'
import AIChatbot from '../components/AI/AIChatbot'
import { AssistedConfigWizard } from '../components/Onboarding'


const navigationGroups = [
  {
    nameKey: 'nav.main',
    title: 'Vue globale',
    items: [
      { nameKey: 'nav.dashboard', title: 'Accueil', href: '/dashboard', icon: LayoutDashboard, tourId: 'nav-dashboard' },
      { nameKey: 'nav.notifications', title: 'Mes notifications', href: '/dashboard/notifications', icon: Bell, tourId: 'nav-notifications' },
    ]
  },
  {
    nameKey: 'nav.engage',
    title: '💬 Discuter',
    icon: MessageSquare,
    items: [
      { nameKey: 'nav.conversations', title: 'Boîte de réception', href: '/dashboard/conversations', icon: MessageSquare, tourId: 'nav-conversations' },
      { nameKey: 'nav.campaigns', title: 'Lancer une campagne', href: '/dashboard/campaigns', icon: Megaphone, tourId: 'nav-campaigns' },
      { nameKey: 'nav.templates', title: 'Modèles de messages', href: '/dashboard/templates', icon: FileText, tourId: 'nav-templates' },
    ]
  },
  {
    nameKey: 'nav.ai_agents',
    title: '🤖 Mes Assistantes IA',
    icon: Bot,
    items: [
      { nameKey: 'nav.agents', title: 'Gérer mes équipes IA', href: '/dashboard/agents', icon: Bot, tourId: 'nav-agents' },
      { nameKey: 'nav.knowledge', title: 'Leur apprendre des choses', href: '/dashboard/knowledge', icon: BookOpen, tourId: 'nav-knowledge' },
      { nameKey: 'nav.flowBuilder', title: 'Leur comportement', href: '/dashboard/flows', icon: Workflow, tourId: 'nav-flows' },
      { nameKey: 'nav.workflows', title: 'Règles automatiques', href: '/dashboard/workflows', icon: Zap, tourId: 'nav-workflows' },
    ]
  },
  {
    nameKey: 'nav.sales',
    title: '🛍️ Gérer mes Ventes',
    icon: ShoppingCart,
    items: [
      { nameKey: 'nav.leads', title: 'Mes contacts', href: '/dashboard/leads', icon: UserPlus, tourId: 'nav-leads' },
      { nameKey: 'nav.services', title: 'Catalogue des services', href: '/dashboard/services', icon: Briefcase, tourId: 'nav-services' },
      { nameKey: 'nav.products', title: 'Mon catalogue (Produits)', href: '/dashboard/products', icon: Package, tourId: 'nav-products' },
      { nameKey: 'nav.deals', title: 'Suivi des Deals', href: '/dashboard/deals', icon: Target, tourId: 'nav-deals' },
      { nameKey: 'nav.orders', title: 'Mes commandes', href: '/dashboard/orders', icon: ShoppingCart, tourId: 'nav-orders' },
      { nameKey: 'nav.payments', title: 'Paiements', href: '/dashboard/payments', icon: CreditCard, tourId: 'nav-payments' },
    ]
  },
  {
    nameKey: 'nav.metrics',
    title: '📊 Suivre mes Chiffres',
    icon: Activity,
    items: [
      { nameKey: 'nav.analytics', title: 'Statistiques', href: '/dashboard/analytics', icon: BarChart3, tourId: 'nav-analytics' },
      { nameKey: 'nav.expenses', title: 'Mes dépenses', href: '/dashboard/expenses', icon: Wallet, tourId: 'nav-expenses' },
      { nameKey: 'nav.reports', title: 'Bilan complet', href: '/dashboard/reports', icon: FileBarChart, tourId: 'nav-reports' },
    ]
  },
  {
    nameKey: 'nav.settings',
    title: '⚙️ Configuration',
    icon: Wrench,
    items: [
      { nameKey: 'nav.tools', title: 'Téléphones (WhatsApp)', href: '/dashboard/tools', icon: Wrench, tourId: 'nav-tools' },
      { nameKey: 'nav.whatsappStatus', title: 'Statuts WhatsApp', href: '/dashboard/whatsapp-status', icon: Radio, tourId: 'nav-whatsapp-status' },
      { nameKey: 'nav.pricing', title: 'Mon Abonnement', href: '/dashboard/pricing', icon: CreditCard, tourId: 'nav-pricing' },
    ]
  },
]

const bottomNavigation = [
  { nameKey: 'nav.logs', href: '/dashboard/logs', icon: Activity, tourId: 'nav-logs' },
  { nameKey: 'nav.settings', href: '/dashboard/settings', icon: Settings, tourId: 'nav-settings' },
  { nameKey: 'nav.help', href: '/dashboard/help', icon: HelpCircle, tourId: 'nav-help' },
]


const adminNavigation = [
  { nameKey: 'nav.admin', href: '/dashboard/admin', icon: Shield },
]

const teamNavigation = [
  { nameKey: 'nav.team', title: 'Equipe', href: '/dashboard/team', icon: Users, tourId: 'nav-team' },
]

// ─── Page title map ──────────────────────────────────────────────────────────
const pathToTitle = (pathname) => {
  if (pathname === '/dashboard' || pathname === '/dashboard/') return 'Dashboard'
  if (pathname.startsWith('/dashboard/agents/') && pathname !== '/dashboard/agents') return 'Agent'
  if (pathname.startsWith('/dashboard/conversations/') && pathname !== '/dashboard/conversations') return 'Conversation'
  const segments = pathname.replace(/^\/dashboard\/?/, '').split('/')
  const first = segments[0] || 'dashboard'
  const map = {
    agents: 'Agents', analytics: 'Analytics', campaigns: 'Campagnes',
    conversations: 'Conversations', flows: 'Flows', knowledge: 'Base de connaissances',
    leads: 'Leads', notifications: 'Notifications', orders: 'Commandes',
    payments: 'Paiements', products: 'Produits', services: 'Services',
    reports: 'Rapports', settings: 'Paramètres', help: 'Aide',
    templates: 'Templates', tools: 'Outils', workflows: 'Workflows',
    admin: 'Admin', expenses: 'Dépenses', influencer: 'Influenceur',
    'whatsapp-status': 'Statut WhatsApp',
  }
  return map[first] || first
}

// ─── Logo ────────────────────────────────────────────────────────────────────
const Logo = ({ className = '' }) => (
  <img src="/logo.svg" alt="SEVEN T" className={`h-7 w-auto object-contain object-left ${className}`} />
)

// ─── Language Switcher ───────────────────────────────────────────────────────
const LanguageSwitcher = ({ className = '' }) => {
  const { i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage || i18n.language || 'fr').split('-')[0]
  const setLang = (lng) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('locale', lng)
    i18n.changeLanguage(lng)
  }
  return (
    <div className={`flex items-center gap-0.5 rounded-lg overflow-hidden border ${className}`} style={{ borderColor: 'var(--border-color)' }}>
      <button type="button" onClick={() => setLang('fr')} className={`px-2 py-1 text-xs font-medium ${lang === 'fr' ? 'bg-blue-500/20 text-blue-400' : 'opacity-60 hover:opacity-100'}`}>FR</button>
      <button type="button" onClick={() => setLang('en')} className={`px-2 py-1 text-xs font-medium ${lang === 'en' ? 'bg-blue-500/20 text-blue-400' : 'opacity-60 hover:opacity-100'}`}>EN</button>
    </div>
  )
}

// ─── Prefetch utils ──────────────────────────────────────────────────────────
const prefetchRouteData = (href, isAuthenticated) => {
  if (!isAuthenticated) return
  if (href === '/dashboard' || href === '/dashboard/') {
    api.get('/analytics/overview?period=7d').catch(() => { })
    api.get('/analytics/messages-timeline?period=7d').catch(() => { })
    import('../pages/Dashboard')
  } else if (href === '/dashboard/tickets') {
    api.get('/tickets', { params: { limit: 25, offset: 0 } }).catch(() => { })
    import('../pages/Tickets')
  } else if (href === '/dashboard/support') {
    api.get('/admin/tickets', { params: { limit: 50, offset: 0 } }).catch(() => { })
    import('../pages/SupportTickets')
  } else if (href === '/dashboard/agents') {
    api.get('/agents').catch(() => { })
    import('../pages/Agents')
  } else if (href === '/dashboard/campaigns') {
    api.get('/campaigns').catch(() => { })
    import('../pages/Campaigns')
  } else if (href === '/dashboard/conversations') {
    api.get('/conversations').catch(() => { })
    import('../pages/Conversations')
  } else if (href === '/dashboard/products') {
    api.get('/products').catch(() => { })
    import('../pages/Products')
  } else if (href === '/dashboard/analytics') {
    api.get('/analytics/overview?period=7d').catch(() => { })
    import('../pages/Analytics')
  } else if (href === '/dashboard/settings') {
    import('../pages/Settings')
  }
}

// ─── Theme Toggle ────────────────────────────────────────────────────────────
const ThemeToggle = ({ className = '', size = 'md' }) => {
  const { theme, toggleTheme } = useTheme()
  const sizeClass = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9'
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-4 h-4'
  return (
    <button
      onClick={toggleTheme}
      className={`relative flex items-center justify-center ${sizeClass} rounded-lg transition-all duration-300 ${theme === 'dark' ? 'hover:bg-space-800 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-800'
        } ${className}`}
      title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
    >
      <div className={`relative ${iconSize}`}>
        <Sun className={`absolute inset-0 ${iconSize} transition-all duration-300 ${theme === 'dark' ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`} />
        <Moon className={`absolute inset-0 ${iconSize} transition-all duration-300 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`} />
      </div>
    </button>
  )
}

// ─── Nav Group (sidebar) ─────────────────────────────────────────────────────
const NavGroup = ({ group, onItemClick, isMobile = false, forceExpand = false, collapsed = false, unreadCount = 0, unreadConversationsCount = 0 }) => {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const isGroupActive = group.items.some(item => location.pathname === item.href || location.pathname.startsWith(item.href + '/'))
  const [isExpanded, setIsExpanded] = useState(isGroupActive)
  const isFirstGroup = group.nameKey === 'nav.main'

  // Sync expansion with active state on route changes
  useEffect(() => {
    if (isGroupActive) setIsExpanded(true)
  }, [isGroupActive])

  useEffect(() => {
    if (forceExpand && isMobile) setIsExpanded(true)
  }, [forceExpand, isMobile])

  const shouldBeOpen = isFirstGroup || forceExpand || isExpanded

  if (isFirstGroup) {
    return (
      <div className="space-y-0.5">
        {group.items.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            viewTransition
            onMouseEnter={() => prefetchRouteData(item.href, Boolean(isAuthenticated))}
            end={item.href === '/dashboard'}
            onClick={onItemClick}
            data-tour={item.tourId}
            className={({ isActive }) =>
              `nav-item group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${isActive
                ? isDark
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'bg-blue-50 text-blue-600'
                : isDark
                  ? 'text-gray-400 hover:bg-white/5 hover:text-gray-100'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`nav-active-bar absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full transition-all duration-200 ${isActive ? 'bg-blue-400 opacity-100' : 'opacity-0'}`} />
                <item.icon className={`flex-shrink-0 w-4 h-4 transition-colors ${isActive ? (isDark ? 'text-blue-400' : 'text-blue-600') : 'text-gray-400 group-hover:text-gray-600'}`} />
                {(!collapsed || isMobile) && (
                  <div className="flex-1 flex items-center justify-between min-w-0" title={item.title || t(item.nameKey)}>
                    <span className="truncate">{item.title || t(item.nameKey)}</span>
                    {item.href === '/dashboard/notifications' && unreadCount > 0 && (
                      <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded-full leading-none min-w-[18px] text-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    {item.href === '/dashboard/conversations' && unreadConversationsCount > 0 && (
                      <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full leading-none min-w-[18px] text-center">
                        {unreadConversationsCount > 99 ? '99+' : unreadConversationsCount}
                      </span>
                    )}
                  </div>
                )}
                {collapsed && !isMobile && item.href === '/dashboard/notifications' && unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border border-white dark:border-space-900" />
                )}
                {collapsed && !isMobile && item.href === '/dashboard/conversations' && unreadConversationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white dark:border-space-900" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {/* Group label */}
      {(!collapsed || isMobile) && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 ${isGroupActive
              ? isDark ? 'text-blue-400' : 'text-blue-600'
              : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
            } ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            {group.icon && <group.icon className={`w-4 h-4 flex-shrink-0 ${isGroupActive ? (isDark ? 'text-blue-400' : 'text-blue-600') : 'text-gray-400'}`} />}
            <span className="truncate text-sm font-medium">{group.title || t(group.nameKey)}</span>
          </span>
          <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${shouldBeOpen ? 'rotate-90' : ''}`} />
        </button>
      )}

      <div className={`overflow-hidden transition-all duration-200 ease-out ${shouldBeOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} ${collapsed && !isMobile ? 'max-h-96 opacity-100' : ''}`}>
        <div className={collapsed && !isMobile ? 'space-y-0.5' : 'ml-4 pl-1.5 space-y-0.5 border-l border-gray-500/10 dark:border-white/5'}>
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              viewTransition
              onMouseEnter={() => prefetchRouteData(item.href, Boolean(isAuthenticated))}
              onClick={onItemClick}
              data-tour={item.tourId}
              className={({ isActive }) =>
                `nav-item group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${isActive
                  ? isDark ? 'bg-blue-500/15 text-blue-400 font-medium' : 'bg-blue-50 text-blue-600 font-medium'
                  : isDark ? 'text-gray-400 hover:bg-white/5 hover:text-gray-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`nav-active-bar absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full transition-all duration-200 ${isActive ? 'bg-blue-400 opacity-100' : 'opacity-0'}`} />
                  <item.icon className={`flex-shrink-0 w-4 h-4 transition-colors ${isActive ? (isDark ? 'text-blue-400' : 'text-blue-600') : 'text-gray-400 group-hover:text-gray-600'}`} />
                  {(!collapsed || isMobile) && (
                    <div className="flex-1 flex items-center justify-between min-w-0" title={item.title || t(item.nameKey)}>
                      <span className="truncate">{item.title || t(item.nameKey)}</span>
                      {item.href === '/dashboard/notifications' && unreadCount > 0 && (
                        <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded-full leading-none min-w-[18px] text-center">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                      {item.href === '/dashboard/conversations' && unreadConversationsCount > 0 && (
                        <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full leading-none min-w-[18px] text-center">
                          {unreadConversationsCount > 99 ? '99+' : unreadConversationsCount}
                        </span>
                      )}
                    </div>
                  )}
                  {collapsed && !isMobile && item.href === '/dashboard/notifications' && unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border border-white dark:border-space-900" />
                  )}
                  {collapsed && !isMobile && item.href === '/dashboard/conversations' && unreadConversationsCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white dark:border-space-900" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar nav groups (with onboarding support) ────────────────────────────
function SidebarNavGroups({ navGroups, onItemClick, isMobile, collapsed, unreadCount, unreadConversationsCount }) {
  const { activeTour, currentStep } = useOnboardingTour()
  const expandForStep = activeTour === 'sidebar' ? currentStep?.id : null
  return (
    <>
      {navGroups.map((group) => (
        <NavGroup
          key={group.nameKey}
          group={group}
          onItemClick={onItemClick}
          isMobile={isMobile}
          collapsed={collapsed}
          unreadCount={unreadCount}
          unreadConversationsCount={unreadConversationsCount}
          forceExpand={expandForStep != null && group.items.some(item => item.tourId === expandForStep)}
        />
      ))}
    </>
  )
}

// ─── User Dropdown ────────────────────────────────────────────────────────────
const UserMenu = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)
  const { isDark } = useTheme()
  const { t, i18n } = useTranslation()

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-space-800' : 'hover:bg-gray-100'}`}
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${user?.is_admin ? 'bg-gradient-to-br from-gold-400 to-blue-500' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
          {user?.is_admin
            ? <Shield className="w-3.5 h-3.5 text-white" />
            : <span className="text-white font-bold text-xs">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          }
        </div>
        <div className="hidden md:block text-left min-w-0 max-w-[120px]">
          <p className={`text-xs font-medium truncate leading-tight ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{user?.name?.split(' ')[0]}</p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute right-0 top-full mt-2 w-72 rounded-xl shadow-xl border z-50 overflow-hidden ${isDark ? 'bg-space-800 border-space-700' : 'bg-white border-gray-200'}`}>
          {/* User Info */}
          <div className={`p-4 border-b ${isDark ? 'border-space-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${user?.is_admin ? 'bg-gradient-to-br from-gold-400 to-blue-500' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
                {user?.is_admin ? <Shield className="w-5 h-5 text-white" /> : <span className="text-white font-bold">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-medium truncate text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{user?.name}</p>
                  {user?.is_admin === 1 && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gold-400/20 text-gold-400 rounded">Admin</span>}
                </div>
                <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{user?.email}</p>
              </div>
            </div>
            {/* Credits - Hidden for influencers */}
            {user?.influencer_only !== true && (
              <div className={`mt-3 flex items-center justify-between px-3 py-2 rounded-lg ${isDark ? 'bg-space-900' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-gold-400" />
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Crédits</span>
                </div>
                <span className="font-bold text-sm text-gold-400">{user?.credits || 0}</span>
              </div>
            )}
          </div>
          {/* Links */}
          <div className="p-1.5">
            {(user?.influencer_only === true
              ? [{ to: `/dashboard/${user.name?.toLowerCase().trim().replace(/\s+/g, '-') || 'partenaire'}`, icon: Gift, label: 'Tableau de bord' }]
              : [
                { to: '/dashboard/settings', icon: User, label: 'Mon profil' },
                { to: '/dashboard/pricing', icon: CreditCard, label: 'Abonnement' },
                { to: '/dashboard/settings', icon: Settings, label: 'Paramètres' },
                { to: '/dashboard/help', icon: HelpCircle, label: 'Aide' },
              ]
            ).map(({ to, icon: Icon, label }) => (
              <Link key={label} to={to} onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${isDark ? 'text-gray-300 hover:bg-space-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Icon className="w-4 h-4 text-gray-400" />
                {label}
              </Link>
            ))}
          </div>
          <div className={`p-1.5 border-t ${isDark ? 'border-space-700' : 'border-gray-100'}`}>
            <button onClick={() => { setIsOpen(false); onLogout() }}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors text-sm ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}>
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Notifications Menu ───────────────────────────────────────────────────────
const NotificationsMenu = ({ unreadCount: externalUnreadCount, onRefresh }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCountInternal, setUnreadCountInternal] = useState(0)
  const unreadCount = externalUnreadCount !== undefined ? externalUnreadCount : unreadCountInternal
  const menuRef = useRef(null)
  const { isDark } = useTheme()
  const { isAuthenticated } = useAuth()

  const formatRelativeTime = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString('fr-FR')
  }

  const fetchNotifications = async () => {
    try {
      if (!isAuthenticated) return
      const response = await api.get('/notifications?limit=40')
      const allNotifs = response.data.notifications || []
      const filtered = allNotifs.slice(0, 20);

      setNotifications(filtered)
      setUnreadCountInternal(response.data.unreadCount || 0)
    } catch (error) {
      if (error?.response?.status === 401) return
      console.error('Error fetching notifications:', error)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return
    fetchNotifications()
    const interval = setInterval(() => {
      if (onRefresh) onRefresh()
      fetchNotifications()
    }, 60000)
    return () => clearInterval(interval)
  }, [onRefresh, isAuthenticated])

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n))
      setUnreadCountInternal(prev => Math.max(0, prev - 1))
    } catch (error) { console.error(error) }
  }

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
      setUnreadCountInternal(0)
    } catch (error) { console.error(error) }
  }

  const deleteNotification = async (id, e) => {
    e.stopPropagation(); e.preventDefault()
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications(prev => {
        const notif = prev.find(n => n.id === id)
        if (notif && !notif.is_read) setUnreadCountInternal(c => Math.max(0, c - 1))
        return prev.filter(n => n.id !== id)
      })
    } catch (error) { console.error(error) }
  }

  const typeColor = { success: 'bg-emerald-400', warning: 'bg-amber-400', error: 'bg-red-400', lead: 'bg-blue-400', whatsapp: 'bg-emerald-400', credit: 'bg-gold-400' }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isDark ? 'hover:bg-space-800 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-800'}`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute right-0 top-full mt-2 w-80 rounded-xl shadow-xl border z-50 overflow-hidden ${isDark ? 'bg-space-800 border-space-700' : 'bg-white border-gray-200'}`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-space-700' : 'border-gray-100'}`}>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Notifications</h3>
            {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs text-blue-400 hover:text-blue-300">Tout lire</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Aucune notification</p>
              </div>
            ) : notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.is_read && markAsRead(notif.id)}
                className={`group relative px-4 py-3 cursor-pointer transition-colors border-b ${isDark ? 'border-space-700 last:border-0' : 'border-gray-50 last:border-0'} ${isDark ? (notif.is_read ? 'hover:bg-space-700' : 'bg-blue-500/5 hover:bg-space-700') : (notif.is_read ? 'hover:bg-gray-50' : 'bg-blue-50/50 hover:bg-gray-50')}`}
              >
                <button onClick={(e) => deleteNotification(notif.id, e)} className={`absolute top-2.5 right-2.5 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'hover:bg-space-600 text-gray-500' : 'hover:bg-gray-200 text-gray-400'}`}>
                  <X className="w-3 h-3" />
                </button>
                <div className="flex items-start gap-2.5 pr-5">
                  <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${typeColor[notif.type] || 'bg-blue-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{notif.title}</p>
                    <p className={`text-xs mt-0.5 line-clamp-2 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>{notif.message}</p>
                    <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{formatRelativeTime(notif.created_at)}</p>
                  </div>
                  {!notif.is_read && <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0 mt-2" />}
                </div>
              </div>
            ))}
          </div>
          <Link to="/dashboard/notifications" onClick={() => setIsOpen(false)}
            className={`flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors border-t ${isDark ? 'border-space-700 text-blue-400 hover:bg-space-700' : 'border-gray-100 text-blue-600 hover:bg-gray-50'}`}>
            Voir toutes les notifications <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── Trial Countdown ──────────────────────────────────────────────────────────
const TrialBadge = ({ user, isDark }) => {
  const [currentTime, setCurrentTime] = useState(() => new Date())
  useEffect(() => {
    const tick = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(tick)
  }, [])

  if (user?.plan !== 'free' || !user?.subscription_end_date || user?.influencer_only === true) return null
  const end = new Date(user.subscription_end_date)
  if (end < currentTime) return null
  const diffMs = end - currentTime
  const days = Math.floor(diffMs / 86400000)
  const hours = Math.floor((diffMs % 86400000) / 3600000)
  const text = days > 0 ? `${days}j restants` : `${hours}h restantes`

  return (
    <Link to="/dashboard/settings" className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'}`}>
      <Zap className="w-3 h-3" />
      Essai · {text}
    </Link>
  )
}

// ─── Sidebar Content ──────────────────────────────────────────────────────────
const SidebarContent = ({ navGroups, bottomNav, onItemClick, isMobile, collapsed, user, isDark, t, onLogout, unreadCount, unreadConversationsCount }) => {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const influencerSlug = user?.name ? user.name.toLowerCase().trim().replace(/\s+/g, '-') : 'partenaire';

  // Use the server-computed flag for reliability
  const isInfluencerOnly = user?.influencer_only === true;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className={`flex h-14 flex-shrink-0 items-center gap-2.5 px-4 border-b ${isDark ? 'border-space-700/60' : 'border-gray-200'}`}>
        <Logo className="flex-shrink-0" />
        {(!collapsed || isMobile) && (
          <span className={`font-semibold text-sm truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('landing.title')}</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-3 px-2 space-y-3 scrollbar-hide">
        <SidebarNavGroups navGroups={navGroups} onItemClick={onItemClick} isMobile={isMobile} collapsed={collapsed} unreadCount={unreadCount} unreadConversationsCount={unreadConversationsCount} />

        {/* Divider */}
        {!isInfluencerOnly && <div className={`pt-2 mt-2 border-t ${isDark ? 'border-space-700/60' : 'border-gray-200'}`} />}

        {/* Team (Owners only) */}
        {!isInfluencerOnly && user?.role === 'owner' && (
          <div className="space-y-0.5">
            {(!collapsed || isMobile) && (
              <p className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Gérer</p>
            )}
            {teamNavigation.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                viewTransition
                onMouseEnter={() => prefetchRouteData(item.href, Boolean(isAuthenticated))}
                onClick={onItemClick}
                className={({ isActive }) =>
                  `nav-item group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${isActive
                    ? isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'
                    : isDark ? 'text-gray-400 hover:bg-white/5 hover:text-gray-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`nav-active-bar absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full transition-all duration-200 ${isActive ? 'bg-blue-400 opacity-100' : 'opacity-0'}`} />
                    <item.icon className={`flex-shrink-0 w-4 h-4 ${isActive ? (isDark ? 'text-blue-400' : 'text-blue-600') : 'text-gray-400 group-hover:text-gray-600'}`} />
                    {(!collapsed || isMobile) && <span className="truncate">{item.title || t(item.nameKey)}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        )}

        {/* Bottom nav */}
        {!isInfluencerOnly && (
          <div className="space-y-0.5">
            {bottomNav.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                viewTransition
                onMouseEnter={() => prefetchRouteData(item.href, Boolean(isAuthenticated))}
                data-tour={item.tourId}
                onClick={onItemClick}
                className={({ isActive }) =>
                  `nav-item group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${isActive
                    ? isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'
                    : isDark ? 'text-gray-400 hover:bg-white/5 hover:text-gray-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`nav-active-bar absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full transition-all duration-200 ${isActive ? 'bg-blue-400 opacity-100' : 'opacity-0'}`} />
                    <item.icon className={`flex-shrink-0 w-4 h-4 ${isActive ? (isDark ? 'text-blue-400' : 'text-blue-600') : 'text-gray-400 group-hover:text-gray-600'}`} />
                    {(!collapsed || isMobile) && <span className="truncate">{t(item.nameKey)}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        )}

        {isInfluencerOnly && <div className="flex-1" />}

        {/* Influencer (Only shown here for non-influencer-only accounts with permissions) */}
        {!isInfluencerOnly && user?.is_admin !== 1 && user?.permissions?.includes('influencer.dashboard') && (
          <div className="space-y-0.5">
            {(!collapsed || isMobile) && (
              <p className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-gold-400' : 'text-blue-600'}`}>Partenariat</p>
            )}
            <NavLink
              to={`/dashboard/${influencerSlug}`}
              viewTransition
              onClick={onItemClick}
              className={({ isActive }) =>
                `nav-item group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${isActive
                  ? isDark ? 'bg-gold-400/15 text-gold-400 font-medium' : 'bg-blue-50 text-blue-600 font-medium'
                  : isDark ? 'text-gray-400 hover:bg-white/5 hover:text-gray-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`nav-active-bar absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full transition-all duration-200 ${isActive ? 'bg-gold-400 opacity-100' : 'opacity-0'}`} />
                  <Gift className={`flex-shrink-0 w-4 h-4 ${isActive ? 'text-gold-400' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  {(!collapsed || isMobile) && <span className="truncate">Statistiques Partenaire</span>}
                </>
              )}
            </NavLink>
          </div>
        )}

        {/* Admin */}
        {!isInfluencerOnly && (user?.is_admin === 1 || user?.can_manage_users === 1 || user?.can_manage_plans === 1 || user?.can_view_stats === 1 || user?.can_manage_ai === 1) && (
          <div className="space-y-0.5">
            {(!collapsed || isMobile) && (
              <p className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-gold-400' : 'text-amber-600'}`}>Admin</p>
            )}
            {adminNavigation.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                viewTransition
                onMouseEnter={() => prefetchRouteData(item.href, Boolean(isAuthenticated))}
                onClick={onItemClick}
                className={({ isActive }) =>
                  `nav-item group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${isActive
                    ? isDark ? 'bg-gold-400/15 text-gold-400 font-medium' : 'bg-amber-50 text-amber-600 font-medium'
                    : isDark ? 'text-gray-400 hover:bg-white/5 hover:text-gray-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`nav-active-bar absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full transition-all duration-200 ${isActive ? 'bg-gold-400 opacity-100' : 'opacity-0'}`} />
                    <item.icon className={`flex-shrink-0 w-4 h-4 ${isActive ? 'text-gold-400' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    {(!collapsed || isMobile) && <span className="truncate">{t(item.nameKey)}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        )}

        {/* Support (tickets) */}
        {!isInfluencerOnly && (user?.permissions?.includes('support.tickets.read') || user?.is_admin === 1) && (
          <div className="space-y-0.5 mt-2">
            {(!collapsed || isMobile) && (
              <p className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-gold-400' : 'text-amber-600'}`}>Support</p>
            )}
            <NavLink
              to="/dashboard/support"
              viewTransition
              onMouseEnter={() => prefetchRouteData('/dashboard/support', Boolean(isAuthenticated))}
              onClick={onItemClick}
              className={({ isActive }) =>
                `nav-item group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${isActive
                  ? isDark ? 'bg-gold-400/15 text-gold-400 font-medium' : 'bg-amber-50 text-amber-600 font-medium'
                  : isDark ? 'text-gray-400 hover:bg-white/5 hover:text-gray-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`nav-active-bar absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full transition-all duration-200 ${isActive ? 'bg-gold-400 opacity-100' : 'opacity-0'}`} />
                  <LifeBuoy className={`flex-shrink-0 w-4 h-4 ${isActive ? 'text-gold-400' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  {(!collapsed || isMobile) && <span className="truncate">{t('nav.support', 'Support')}</span>}
                </>
              )}
            </NavLink>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className={`flex-shrink-0 sticky bottom-0 px-3 py-3 border-t ${isDark ? 'border-space-700/60 bg-space-900' : 'border-gray-200 bg-white'}`}>
        <div className={`flex items-center gap-2.5 ${collapsed && !isMobile ? 'justify-center' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${user?.is_admin ? 'bg-gradient-to-br from-gold-400 to-blue-500' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
            {user?.is_admin
              ? <Shield className="w-4 h-4 text-white" />
              : <span className="text-white font-bold text-xs">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            }
          </div>
          {(!collapsed || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold truncate leading-tight ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{user?.name}</p>
              {!isInfluencerOnly && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Zap className="w-2.5 h-2.5 text-gold-400 flex-shrink-0" />
                  <span className={`text-[10px] font-medium text-gold-400`}>{user?.credits ?? 0} crédits</span>
                </div>
              )}
            </div>
          )}
          <button
            onClick={onLogout}
            title="Déconnexion"
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Semantic Route Map ───────────────────────────────────────────────────────
// Chaque route a une zone (groupe logique) et un index (position dans la zone).
// La zone détermine l'AXE de transition : vertical dans une zone, horizontal entre zones.
const ROUTE_SEMANTICS = {
  '/dashboard': { zone: 'main', idx: 0 },
  '/dashboard/analytics': { zone: 'main', idx: 1 },
  '/dashboard/notifications': { zone: 'main', idx: 2 },
  '/dashboard/leads': { zone: 'crm', idx: 0 },
  '/dashboard/deals': { zone: 'crm', idx: 1 },
  '/dashboard/orders': { zone: 'crm', idx: 2 },
  '/dashboard/agents': { zone: 'agents', idx: 0 },
  '/dashboard/conversations': { zone: 'agents', idx: 1 },
  '/dashboard/knowledge': { zone: 'agents', idx: 2 },
  '/dashboard/campaigns': { zone: 'marketing', idx: 0 },
  '/dashboard/templates': { zone: 'marketing', idx: 1 },
  '/dashboard/whatsapp-status': { zone: 'marketing', idx: 2 },
  '/dashboard/products': { zone: 'products', idx: 0 },
  '/dashboard/services': { zone: 'products', idx: 1 },
  '/dashboard/tools': { zone: 'products', idx: 2 },
  '/dashboard/workflows': { zone: 'automation', idx: 0 },
  '/dashboard/flows': { zone: 'automation', idx: 1 },
  '/dashboard/reports': { zone: 'automation', idx: 2 },
  '/dashboard/settings': { zone: 'config', idx: 0 },
  '/dashboard/help': { zone: 'config', idx: 1 },
  '/dashboard/admin': { zone: 'config', idx: 2 },
}

// Résoudre les routes dynamiques (ex: /dashboard/agents/123 → zone 'agents')
const resolveSemantics = (pathname) => {
  if (ROUTE_SEMANTICS[pathname]) return ROUTE_SEMANTICS[pathname]
  // Match par préfixe pour les routes dynamiques
  const matched = Object.keys(ROUTE_SEMANTICS).find(route =>
    route !== '/dashboard' && pathname.startsWith(route + '/')
  )
  return matched ? { ...ROUTE_SEMANTICS[matched], isDynamic: true } : null
}

// Zones dans leur ordre d'apparition dans la sidebar (pour la direction horizontale)
const ZONE_ORDER = ['main', 'crm', 'agents', 'marketing', 'products', 'automation', 'config']

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function DashboardLayout() {
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      if (typeof window === 'undefined') return false
      return localStorage.getItem('seven-t-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })
  const { user, isAuthenticated, logout } = useAuth()
  const { theme, isDark } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const navigationType = useNavigationType() // 'PUSH', 'POP', 'REPLACE'
  const { activeTour } = useOnboardingTour()
  const prevPathRef = useRef(location.pathname)
  // transition state : { direction: 1|-1|0, axis: 'x'|'y' }
  const [transition, setTransition] = useState({ direction: 0, axis: 'y' })
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadConversationsCount, setUnreadConversationsCount] = useState(0)

  // Global UI States
  const [isGlobalAIOpen, setIsGlobalAIOpen] = useState(false)
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)
  const [isAssistedConfigOpen, setIsAssistedConfigOpen] = useState(false)
  const [assistedConfigData, setAssistedConfigData] = useState(null)

  const {
    payment: paymentModuleEnabled,
    analytics: analyticsModuleEnabled,
    flows: flowsModuleEnabled,
    leads: leadsModuleEnabled,
    whatsappStatus: whatsappStatusModuleEnabled,
    catalogImport: catalogImportModuleEnabled,
    knowledgeBase: knowledgeBaseModuleEnabled,
    campaigns: campaignsModuleEnabled,
    isAdmin,
    isInfluencerOnly
  } = useModuleAvailability();

  const fetchUnreadCounts = async () => {
    try {
      if (!isAuthenticated) return
      const [notifRes, convRes] = await Promise.all([
        api.get('/notifications/unread-count').catch(() => ({ data: { count: 0 } })),
        api.get('/conversations/unread-count').catch(() => ({ data: { count: 0 } }))
      ])
      setUnreadCount(notifRes.data.count || 0)
      setUnreadConversationsCount(convRes.data.count || 0)
    } catch (error) {
      if (error?.response?.status === 401) return
      console.error('Error fetching unread counts:', error)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return
    fetchUnreadCounts()
    const interval = setInterval(fetchUnreadCounts, 60000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  // ── Influencer Redirection ──────────────────────────────────────────────────
  useEffect(() => {
    if (isInfluencerOnly && (location.pathname === '/dashboard' || location.pathname === '/dashboard/')) {
      const slug = user?.name ? user.name.toLowerCase().trim().replace(/\s+/g, '-') : 'partenaire';
      navigate(`/dashboard/${slug}`, { replace: true });
    }
  }, [isInfluencerOnly, location.pathname, navigate, user?.name]);

  const systemPrefersReducedMotion = useMemo(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
    , [])

  const [reduceMotionOverride, setReduceMotionOverride] = useState(() => {
    try {
      if (typeof window === 'undefined') return null
      const v = localStorage.getItem('seven-t-reduce-motion')
      if (v === null) return null
      return v === 'true'
    } catch {
      return null
    }
  })

  const prefersReducedMotion = reduceMotionOverride ?? systemPrefersReducedMotion

  // Apply UI prefs (sidebar + reduce motion) globally
  useEffect(() => {
    try {
      localStorage.setItem('seven-t-sidebar-collapsed', String(sidebarCollapsed))
    } catch { }
  }, [sidebarCollapsed])

  useEffect(() => {
    const root = document.documentElement
    if (prefersReducedMotion) root.classList.add('reduce-motion')
    else root.classList.remove('reduce-motion')
  }, [prefersReducedMotion])

  useEffect(() => {
    const onSidebarPref = (e) => {
      const next = Boolean(e?.detail?.collapsed)
      setSidebarCollapsed(next)
    }
    const onReduceMotionPref = (e) => {
      if (typeof e?.detail?.value !== 'boolean') return
      setReduceMotionOverride(e.detail.value)
      try { localStorage.setItem('seven-t-reduce-motion', String(e.detail.value)) } catch { }
    }
    const onRefreshUnreadCounts = () => {
      fetchUnreadCounts()
    }

    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsChatbotOpen(prev => !prev)
      }
    }

    const onOpenGlobalAI = () => setIsGlobalAIOpen(true)
    const onOpenChatbot = () => setIsChatbotOpen(prev => !prev)
    const onOpenAssistedConfig = (e) => {
      if (e.detail?.initialData) setAssistedConfigData(e.detail.initialData)
      setIsAssistedConfigOpen(true)
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    window.addEventListener('seven-t:open-global-ai', onOpenGlobalAI)
    window.addEventListener('seven-t:open-chatbot', onOpenChatbot)
    window.addEventListener('seven-t:open-assisted-config', onOpenAssistedConfig)
    window.addEventListener('seven-t:sidebar-collapsed', onSidebarPref)
    window.addEventListener('seven-t:reduce-motion', onReduceMotionPref)
    window.addEventListener('seven-t:refresh-unread-counts', onRefreshUnreadCounts)

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
      window.removeEventListener('seven-t:open-global-ai', onOpenGlobalAI)
      window.removeEventListener('seven-t:open-chatbot', onOpenChatbot)
      window.removeEventListener('seven-t:open-assisted-config', onOpenAssistedConfig)
      window.removeEventListener('seven-t:sidebar-collapsed', onSidebarPref)
      window.removeEventListener('seven-t:reduce-motion', onReduceMotionPref)
      window.removeEventListener('seven-t:refresh-unread-counts', onRefreshUnreadCounts)
    }
  }, [])

  usePageTitle(pathToTitle(location.pathname))

  // ── Calcul de la direction et de l'axe de transition ──────────────────────
  useEffect(() => {
    const prev = resolveSemantics(prevPathRef.current)
    const curr = resolveSemantics(location.pathname)

    let dir = 0
    let axis = 'y'

    if (prev && curr) {
      if (prev.zone === curr.zone) {
        // Même section → animation verticale par index
        axis = 'y'
        if (navigationType === 'POP') {
          // Bouton retour : inverser la direction
          dir = curr.idx < prev.idx ? -1 : 1
        } else {
          dir = curr.idx > prev.idx ? 1 : -1
        }
      } else {
        // Changement de zone → animation horizontale par position de zone
        axis = 'x'
        const prevZoneIdx = ZONE_ORDER.indexOf(prev.zone)
        const currZoneIdx = ZONE_ORDER.indexOf(curr.zone)
        if (navigationType === 'POP') {
          dir = currZoneIdx < prevZoneIdx ? -1 : 1
        } else {
          dir = currZoneIdx > prevZoneIdx ? 1 : -1
        }
      }
    }

    setTransition({ direction: dir, axis })
    prevPathRef.current = location.pathname
  }, [location.pathname, navigationType])

  // ── Variants Framer Motion ─────────────────────────────────────────────────
  const variants = prefersReducedMotion
    ? {
      // Accessibilité : simple fondu, zéro mouvement
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.15 } },
      exit: { opacity: 0, transition: { duration: 0.15 } }
    }
    : {
      initial: ({ direction: dir, axis }) => ({
        [axis]: dir > 0 ? '40%' : dir < 0 ? '-40%' : 0,
        opacity: 0,
      }),
      animate: {
        x: 0, y: 0,
        opacity: 1,
        transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } // OutQuint
      },
      exit: ({ direction: dir, axis }) => ({
        [axis]: dir > 0 ? '-20%' : dir < 0 ? '20%' : 0,
        opacity: 0,
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
      })
    }




  const navGroups = useMemo(() => {
    if (isInfluencerOnly) {
      const slug = user?.name ? user.name.toLowerCase().trim().replace(/\s+/g, '-') : 'partenaire';
      return [
        {
          nameKey: 'nav.main',
          items: [
            { nameKey: 'nav.influencerStats', href: `/dashboard/${slug}`, icon: BarChart3, tourId: 'nav-influencer-stats' }
          ]
        }
      ];
    }
    return navigationGroups.map(g => ({
      ...g,
      items: g.items.filter(item => {
        if (item.href === '/dashboard/tickets') return true;
        
        // Modules mapping
        if (item.href === '/dashboard/payments') return paymentModuleEnabled;

        if (item.href === '/dashboard/analytics') return analyticsModuleEnabled;
        if (item.href === '/dashboard/reports') return analyticsModuleEnabled;
        
        if (item.href === '/dashboard/flows') return flowsModuleEnabled;
        if (item.href === '/dashboard/workflows') return flowsModuleEnabled;
        
        if (item.href === '/dashboard/leads') return leadsModuleEnabled;
        
        if (item.href === '/dashboard/whatsapp-status') return whatsappStatusModuleEnabled;
        
        if (item.href === '/dashboard/products') return catalogImportModuleEnabled;
        if (item.href === '/dashboard/services') return catalogImportModuleEnabled;

        if (item.href === '/dashboard/campaigns') {
           // On affiche si le module est activé OU si on est sur la page (pour éviter que le lien disparaisse quand on y est)
           return campaignsModuleEnabled || window.location.pathname === '/dashboard/campaigns';
        }
        if (item.href === '/dashboard/knowledge') return true; // knowledgeBaseModuleEnabled
        return true;
      })
    })).filter(g => g.items.length > 0);
  }, [paymentModuleEnabled, analyticsModuleEnabled, flowsModuleEnabled, leadsModuleEnabled, whatsappStatusModuleEnabled, catalogImportModuleEnabled, knowledgeBaseModuleEnabled, campaignsModuleEnabled, isInfluencerOnly, user?.name])


  const bottomNav = useMemo(() => {
    if (isInfluencerOnly) return [];
    return bottomNavigation;
  }, [isInfluencerOnly])

  // Open sidebar during tour on mobile
  useEffect(() => {
    if (activeTour === 'sidebar') {
      const mql = window.matchMedia('(max-width: 1023px)')
      if (mql.matches) setSidebarOpen(true)
    }
  }, [activeTour])

  // Lock scroll on mobile sidebar open
  useEffect(() => {
    if (!sidebarOpen) return
    const mql = window.matchMedia('(max-width: 1023px)')
    if (!mql.matches) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [sidebarOpen])

  // Sauvegarder la page actuelle à chaque changement (pour restauration après reconnexion)
  useEffect(() => {
    if (isAuthenticated && user?.id && location.pathname.startsWith('/dashboard')) {
      saveSessionLocation(user.id, location.pathname, location.search)
    }
  }, [isAuthenticated, user?.id, location.pathname, location.search])

  const handleLogout = () => {
    // On sauvegarde simplement la page courante pour l'utilisateur courant
    if (user?.id) {
      saveSessionLocation(user.id, location.pathname, location.search)
    }
    logout()
  }

  const sidebarW = sidebarCollapsed ? 'lg:w-14' : 'lg:w-56'
  const contentPl = sidebarCollapsed ? 'lg:pl-14' : 'lg:pl-56'

  const pageTitle = pathToTitle(location.pathname)

  return (
    <div className={`min-h-screen ${isDark ? 'bg-space-950/50' : 'bg-gray-50/50'} relative overflow-hidden`}>
      <AnimatedBackground />

      {/* ── Mobile overlay sidebar ── */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div
          className={`fixed inset-0 backdrop-blur-sm transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${isDark ? 'bg-space-950/80' : 'bg-slate-900/40'}`}
          onClick={() => setSidebarOpen(false)}
        />
        <div className={`fixed inset-y-0 left-0 w-60 shadow-2xl border-r transition-transform duration-300 flex flex-col min-h-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isDark ? 'bg-space-900 border-space-700' : 'bg-white border-gray-200'}`}>
          <div className="absolute top-3 right-3">
            <button onClick={() => setSidebarOpen(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-space-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <SidebarContent
            navGroups={navGroups}
            bottomNav={bottomNav}
            onItemClick={() => setSidebarOpen(false)}
            isMobile={true} collapsed={false}
            user={user} isDark={isDark} t={t} onLogout={handleLogout}
            unreadCount={unreadCount}
            unreadConversationsCount={unreadConversationsCount}
          />
        </div>
      </div>

      {/* ── Desktop sidebar ── */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${sidebarW}`}>
        <div className={`flex flex-col flex-grow min-h-0 border-r ${isDark ? 'bg-space-900 border-space-700/60' : 'bg-white border-gray-200'}`}>
          <SidebarContent
            navGroups={navGroups}
            bottomNav={bottomNav}
            onItemClick={() => { }}
            isMobile={false} collapsed={sidebarCollapsed}
            user={user} isDark={isDark} t={t} onLogout={handleLogout}
            unreadCount={unreadCount}
            unreadConversationsCount={unreadConversationsCount}
          />
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${contentPl}`}>

        {/* ── Mobile header ── */}
        <div className={`sticky top-0 z-40 flex h-14 items-center justify-between border-b backdrop-blur-md px-4 lg:hidden ${isDark ? 'border-space-700/60 bg-space-900/90' : 'border-gray-200 bg-white/95'}`}
          style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className={`touch-target flex items-center justify-center w-8 h-8 rounded-lg ${isDark ? 'hover:bg-space-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <Menu className="w-5 h-5" />
            </button>
            <Logo />
          </div>
          <div className="flex items-center gap-1.5">
            <TrialBadge user={user} isDark={isDark} />
            <ThemeToggle size="sm" />
            {!isInfluencerOnly && (
              <Link to="/dashboard/conversations" title="Conversations non lues"
                className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isDark ? 'hover:bg-space-800 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-800'}`}>
                <MessageSquare className="w-4 h-4" />
                {unreadConversationsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadConversationsCount > 9 ? '9+' : unreadConversationsCount}
                  </span>
                )}
              </Link>
            )}
            {!isInfluencerOnly && <NotificationsMenu unreadCount={unreadCount} onRefresh={fetchUnreadCounts} />}
            <UserMenu user={user} onLogout={handleLogout} />
          </div>
        </div>

        {/* ── Desktop top bar ── */}
        <div className={`hidden lg:flex sticky top-0 z-40 h-14 items-center justify-between border-b px-5 ${isDark ? 'border-space-700/60 bg-space-900/95 backdrop-blur-md' : 'border-gray-200 bg-white/95 backdrop-blur-md'}`}>
          {/* Left: collapse toggle + page title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Développer la sidebar' : 'Réduire la sidebar'}
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isDark ? 'hover:bg-space-800 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}
            >
              <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
            <div className={`w-px h-4 ${isDark ? 'bg-space-700' : 'bg-gray-200'}`} />
            <h1 className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{pageTitle}</h1>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5">
            <TrialBadge user={user} isDark={isDark} />
            <LanguageSwitcher />
            {/* Credits pill */}
            {!isInfluencerOnly && (
              <Link to="/dashboard/settings" title="Crédits et abonnement"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-space-800' : 'hover:bg-gray-100'}`}>
                <Zap className="w-3.5 h-3.5 text-gold-400" />
                <span className="text-xs font-semibold text-gold-400 tabular-nums">{user?.credits ?? 0}</span>
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>crédits</span>
              </Link>
            )}
            <ThemeToggle size="sm" />
            {!isInfluencerOnly && (
              <Link to="/dashboard/conversations" title="Conversations non lues"
                className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isDark ? 'hover:bg-space-800 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-800'}`}>
                <MessageSquare className="w-4 h-4" />
                {unreadConversationsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadConversationsCount > 9 ? '9+' : unreadConversationsCount}
                  </span>
                )}
              </Link>
            )}
            {!isInfluencerOnly && <NotificationsMenu unreadCount={unreadCount} onRefresh={fetchUnreadCounts} />}
            <div className={`w-px h-4 mx-0.5 ${isDark ? 'bg-space-700' : 'bg-gray-200'}`} />
            <UserMenu user={user} onLogout={handleLogout} />
          </div>
        </div>

        {/* ── Page content ── */}
        <main className="flex-1 min-w-0 relative bg-inherit overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={transition}>
            <motion.div
              key={location.pathname}
              custom={transition}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ willChange: prefersReducedMotion ? 'auto' : 'transform, opacity' }}
              className="w-full p-4 sm:p-5 lg:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global AI Search & Assistants */}
      <AnimatePresence>
        {isChatbotOpen && (
          <AIChatbot
            isOpen={isChatbotOpen}
            onClose={() => setIsChatbotOpen(false)}
          />
        )}
      </AnimatePresence>

      <GlobalAIAssistant />
      <GlobalAIAssistantModal
        isOpen={isGlobalAIOpen}
        onClose={() => setIsGlobalAIOpen(false)}
      />

      <AssistedConfigWizard
        isOpen={isAssistedConfigOpen}
        onClose={() => {
          setIsAssistedConfigOpen(false)
          setAssistedConfigData(null)
        }}
        initialData={assistedConfigData}
      />
    </div>
  )
}
