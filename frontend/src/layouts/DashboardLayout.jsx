import { useState, useRef, useEffect, useMemo } from 'react'
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { useTheme } from '../contexts/ThemeContext'
import { OnboardingTourProvider, useOnboardingTour } from '../components/Onboarding'
import api from '../services/api'
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
  ExternalLink,
  Zap,
  Package,
  BookOpen,
  UserPlus,
  ShoppingCart,
  BarChart3,
  Megaphone,
  FileText,
  Workflow,
  FileBarChart,
  Store,
  Send,
  Wrench,
  Building,
  Clock,
  Wallet
} from 'lucide-react'

// Navigation avec sous-menus (nameKey = clé i18n pour la traduction)
const navigationGroups = [
  {
    nameKey: 'nav.main',
    items: [
      { nameKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard, tourId: 'nav-dashboard' },
      { nameKey: 'nav.analytics', href: '/dashboard/analytics', icon: BarChart3, tourId: 'nav-analytics' },
      { nameKey: 'nav.notifications', href: '/dashboard/notifications', icon: Bell, tourId: 'nav-notifications' },
    ]
  },
  {
    nameKey: 'nav.agentsAndMessages',
    icon: Bot,
    items: [
      { nameKey: 'nav.agents', href: '/dashboard/agents', icon: Bot, tourId: 'nav-agents' },
      { nameKey: 'nav.conversations', href: '/dashboard/conversations', icon: MessageSquare, tourId: 'nav-conversations' },
      { nameKey: 'nav.knowledge', href: '/dashboard/knowledge', icon: BookOpen, tourId: 'nav-knowledge' },
      { nameKey: 'nav.tools', href: '/dashboard/tools', icon: Wrench, tourId: 'nav-tools' },
    ]
  },
  {
    nameKey: 'nav.sales',
    icon: Store,
    items: [
      { nameKey: 'nav.products', href: '/dashboard/products', icon: Package, tourId: 'nav-products' },
      { nameKey: 'nav.orders', href: '/dashboard/orders', icon: ShoppingCart, tourId: 'nav-orders' },
      { nameKey: 'nav.payments', href: '/dashboard/payments', icon: CreditCard, tourId: 'nav-payments' },
      { nameKey: 'nav.leads', href: '/dashboard/leads', icon: UserPlus, tourId: 'nav-leads' },
      { nameKey: 'nav.expenses', href: '/dashboard/expenses', icon: Wallet, tourId: 'nav-expenses' },
    ]
  },
  {
    nameKey: 'nav.marketing',
    icon: Send,
    items: [
      { nameKey: 'nav.campaigns', href: '/dashboard/campaigns', icon: Megaphone, tourId: 'nav-campaigns' },
      { nameKey: 'nav.templates', href: '/dashboard/templates', icon: FileText, tourId: 'nav-templates' },
    ]
  },
  {
    nameKey: 'nav.automation',
    icon: Wrench,
    items: [
      { nameKey: 'nav.workflows', href: '/dashboard/workflows', icon: Zap, tourId: 'nav-workflows' },
      { nameKey: 'nav.flowBuilder', href: '/dashboard/flows', icon: Workflow, tourId: 'nav-flows' },
      { nameKey: 'nav.reports', href: '/dashboard/reports', icon: FileBarChart, tourId: 'nav-reports' },
    ]
  },
]

const bottomNavigation = [
  { nameKey: 'nav.settings', href: '/dashboard/settings', icon: Settings, tourId: 'nav-settings' },
]

const adminNavigation = [
  { nameKey: 'nav.admin', href: '/dashboard/admin', icon: Shield },
]

// Composant pour un groupe de navigation avec sous-menu (ouverture au survol)
const NavGroup = ({ group, onItemClick, isMobile = false, forceExpand = false }) => {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const location = useLocation()
  const [isHovered, setIsHovered] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false) // Pour mobile
  const timeoutRef = useRef(null)
  
  // Vérifier si un élément du groupe est actif
  const isGroupActive = group.items.some(item => location.pathname === item.href)
  
  // Premier groupe (Principal) toujours ouvert
  const isFirstGroup = group.nameKey === 'nav.main'
  
  // Ouvrir le groupe quand le tour d'onboarding cible un item de ce groupe (sidebar visible)
  useEffect(() => {
    if (forceExpand && isMobile) setIsExpanded(true)
  }, [forceExpand, isMobile])
  
  // En mobile: clic pour ouvrir. En desktop: survol. forceExpand pour le tour sidebar.
  const shouldBeOpen = isFirstGroup || isGroupActive || forceExpand || (isMobile ? isExpanded : isHovered)

  // Gestion du survol avec délai pour éviter les fermetures accidentelles
  const handleMouseEnter = () => {
    if (isMobile) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    if (isMobile) return
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 200) // Délai de 200ms avant fermeture
  }

  // Toggle pour mobile
  const handleToggle = (e) => {
    if (isMobile) {
      e.preventDefault()
      setIsExpanded(!isExpanded)
    }
  }

  // Cleanup du timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (isFirstGroup) {
    // Afficher directement les items sans header de groupe
    return (
      <div className="space-y-1">
        {group.items.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/dashboard'}
            onClick={onItemClick}
            data-tour={item.tourId}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
: isDark 
                    ? 'text-gray-400 hover:bg-space-800 hover:text-gray-100'
                    : 'text-gray-800 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-5 h-5 text-icon" />
            {t(item.nameKey)}
          </NavLink>
        ))}
      </div>
    )
  }

  return (
    <div
      className="space-y-0.5"
      onMouseEnter={!isMobile ? handleMouseEnter : undefined}
      onMouseLeave={!isMobile ? handleMouseLeave : undefined}
    >
      {/* Header du groupe - En desktop: navigue vers le premier item. En mobile: toggle */}
      {isMobile ? (
        <button
          onClick={handleToggle}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 ${
            isGroupActive
              ? isDark 
                ? 'bg-blue-500/10 text-blue-400' 
                : 'bg-blue-50 text-blue-600'
              : isDark 
                ? 'text-gray-400 hover:bg-space-800 hover:text-gray-100' 
                : 'text-gray-800 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {group.icon && <group.icon className="w-5 h-5 text-icon" />}
            <span className="text-sm font-medium">{t(group.nameKey)}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-icon transition-transform duration-200 ${shouldBeOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <NavLink
          to={group.items[0]?.href || '#'}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 ${
            isGroupActive
              ? isDark 
                ? 'bg-blue-500/10 text-blue-400' 
                : 'bg-blue-50 text-blue-600'
              : isDark 
                ? 'text-gray-400 hover:bg-space-800 hover:text-gray-100' 
                : 'text-gray-800 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {group.icon && <group.icon className="w-5 h-5 text-icon" />}
            <span className="text-sm font-medium">{t(group.nameKey)}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-icon transition-transform duration-200 ${shouldBeOpen ? 'rotate-180' : ''}`} />
        </NavLink>
      )}

      {/* Items du groupe - s'affiche au survol */}
      <div 
        className={`overflow-hidden transition-all duration-200 ease-out ${
          shouldBeOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className={`ml-3 pl-3 space-y-0.5 border-l-2 ${
          isDark ? 'border-space-700' : 'border-gray-200'
        }`}>
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onItemClick}
              data-tour={item.tourId}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                  isActive
                    ? isDark
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-blue-100 text-blue-700'
                    : isDark 
                      ? 'text-gray-400 hover:bg-space-800 hover:text-gray-100'
                      : 'text-gray-800 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-4 h-4 text-icon" />
              {t(item.nameKey)}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}

// Rendu des groupes de nav avec ouverture forcée pour l’étape courante du tour sidebar
function SidebarNavGroups({ navGroups, onItemClick, isMobile }) {
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
          forceExpand={expandForStep != null && group.items.some(item => item.tourId === expandForStep)}
        />
      ))}
    </>
  )
}

// Logo du SaaS (fichier public/logo.svg)
const Logo = ({ className = '' }) => (
  <img
    src="/logo.svg"
    alt="SEVEN T"
    className={`h-8 w-auto object-contain object-left sm:h-9 ${className}`}
  />
)

// Language switcher (FR | EN)
const LanguageSwitcher = ({ className = '' }) => {
  const { i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage || i18n.language || 'fr').split('-')[0]
  const setLang = (lng) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('locale', lng)
    i18n.changeLanguage(lng)
  }
  return (
    <div className={`flex items-center gap-0.5 rounded-lg overflow-hidden border ${className}`} style={{ borderColor: 'var(--border-color)' }}>
      <button
        type="button"
        onClick={() => setLang('fr')}
        className={`px-2 py-1 text-xs font-medium ${lang === 'fr' ? 'bg-blue-500/20 text-blue-400' : 'opacity-70 hover:opacity-100'}`}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2 py-1 text-xs font-medium ${lang === 'en' ? 'bg-blue-500/20 text-blue-400' : 'opacity-70 hover:opacity-100'}`}
      >
        EN
      </button>
    </div>
  )
}

// Theme Toggle Component
const ThemeToggle = ({ className = '', size = 'md' }) => {
  const { theme, toggleTheme } = useTheme()
  const sizeClass = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  
  return (
    <button
      onClick={toggleTheme}
      className={`relative flex items-center justify-center ${sizeClass} rounded-xl transition-all duration-300 ${
        theme === 'dark' 
          ? 'bg-space-800 hover:bg-space-700 text-gold-400' 
          : 'bg-amber-100 hover:bg-amber-200 text-amber-600'
      } ${className}`}
      title={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
    >
      <div className={`relative ${iconSize}`}>
        <Sun className={`absolute inset-0 ${iconSize} transition-all duration-300 ${
          theme === 'dark' ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
        }`} />
        <Moon className={`absolute inset-0 ${iconSize} transition-all duration-300 ${
          theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
        }`} />
      </div>
    </button>
  )
}

// User Dropdown Menu Component
const UserMenu = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)
  const { isDark } = useTheme()

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
          isDark 
            ? 'hover:bg-space-800' 
            : 'hover:bg-gray-100'
        }`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          user?.is_admin ? 'bg-gradient-to-br from-gold-400 to-blue-500' : 'bg-gradient-to-br from-blue-500 to-gold-400'
        }`}>
          {user?.is_admin ? (
            <Shield className="w-4 h-4 icon-on-gradient" />
          ) : (
            <span className="text-space-950 font-bold text-xs">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          )}
        </div>
        <div className="hidden md:block text-left">
          <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            {user?.name?.split(' ')[0]}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-icon transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute right-0 top-full mt-2 w-72 rounded-2xl shadow-xl border z-50 overflow-hidden ${
          isDark 
            ? 'bg-space-800 border-space-700' 
            : 'bg-white border-gray-200'
        }`}>
          {/* User Info Header */}
          <div className={`p-4 border-b ${isDark ? 'border-space-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                user?.is_admin ? 'bg-gradient-to-br from-gold-400 to-blue-500' : 'bg-gradient-to-br from-blue-500 to-gold-400'
              }`}>
                {user?.is_admin ? (
                  <Shield className="w-6 h-6 icon-on-gradient" />
                ) : (
                  <span className="text-space-950 font-bold text-lg">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-medium truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {user?.name}
                  </p>
                  {user?.is_admin === 1 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gold-400/20 text-gold-400 rounded">
                      Admin
                    </span>
                  )}
                </div>
                <p className={`text-sm truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {user?.email}
                </p>
                {user?.company?.trim() ? (
                  <p className={`text-xs mt-1 truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {user.company.trim()}
                  </p>
                ) : (
                  <Link
                    to="/dashboard/settings"
                    className={`text-xs mt-1 inline-block ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                  >
                    Ajouter mon entreprise
                  </Link>
                )}
              </div>
            </div>
            
            {/* Credits Display */}
            <div className={`mt-3 p-3 rounded-xl ${isDark ? 'bg-space-900' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-gold-400" />
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Crédits</span>
                </div>
                <span className="font-bold text-gold-400">{user?.credits || 0}</span>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <Link
              to="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isDark 
                  ? 'text-gray-300 hover:bg-space-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <User className="w-4 h-4 text-icon" />
              Mon profil
            </Link>
            <Link
              to="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isDark 
                  ? 'text-gray-300 hover:bg-space-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <CreditCard className="w-4 h-4 text-icon" />
              Abonnement
            </Link>
            <Link
              to="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isDark 
                  ? 'text-gray-300 hover:bg-space-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-4 h-4 text-icon" />
              Paramètres
            </Link>
            <a
              href="https://docs.seven-t.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isDark 
                  ? 'text-gray-300 hover:bg-space-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-icon" />
              Aide
              <ExternalLink className="w-3 h-3 ml-auto opacity-50 text-icon" />
            </a>
          </div>

          {/* Logout */}
          <div className={`p-2 border-t ${isDark ? 'border-space-700' : 'border-gray-100'}`}>
            <button
              onClick={() => { setIsOpen(false); onLogout(); }}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors ${
                isDark 
                  ? 'text-red-400 hover:bg-red-500/10' 
                  : 'text-red-500 hover:bg-red-50'
              }`}
            >
              <LogOut className="w-4 h-4 text-icon" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Notifications Menu Component
const NotificationsMenu = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const menuRef = useRef(null)
  const { isDark } = useTheme()

  // Format relative time
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

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications?limit=20')
      setNotifications(response.data.notifications || [])
      setUnreadCount(response.data.unreadCount || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (id, e) => {
    e.stopPropagation() // Prevent triggering the click on the notification
    e.preventDefault()
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications(prev => {
        const notif = prev.find(n => n.id === id)
        if (notif && !notif.is_read) {
          setUnreadCount(count => Math.max(0, count - 1))
        }
        return prev.filter(n => n.id !== id)
      })
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      markAsRead(notif.id)
    }
    if (notif.link) {
      setIsOpen(false)
      // Navigation will be handled by Link component
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'success': return <div className="w-2 h-2 bg-green-400 rounded-full" />
      case 'warning': return <div className="w-2 h-2 bg-amber-400 rounded-full" />
      case 'error': return <div className="w-2 h-2 bg-red-400 rounded-full" />
      case 'lead': return <div className="w-2 h-2 bg-blue-400 rounded-full" />
      case 'whatsapp': return <div className="w-2 h-2 bg-green-400 rounded-full" />
      case 'credit': return <div className="w-2 h-2 bg-gold-400 rounded-full" />
      default: return <div className="w-2 h-2 bg-blue-400 rounded-full" />
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-colors ${
          isDark 
            ? 'hover:bg-space-800' 
            : 'hover:bg-gray-100'
        }`}
      >
        <Bell className="w-5 h-5 text-icon" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-gold-400 text-space-900 text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-xl border z-50 overflow-hidden ${
          isDark 
            ? 'bg-space-800 border-space-700' 
            : 'bg-white border-gray-200'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-space-700' : 'border-gray-100'}`}>
            <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2 text-icon" />
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 cursor-pointer transition-colors group relative ${
                    isDark 
                      ? `${notif.is_read ? 'bg-space-800' : 'bg-space-700'} hover:bg-space-700`
                      : `${notif.is_read ? 'bg-white' : 'bg-blue-50'} hover:bg-gray-50`
                  } ${isDark ? 'border-b border-space-700' : 'border-b border-gray-100'}`}
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => deleteNotification(notif.id, e)}
                    className={`absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                      isDark 
                        ? 'hover:bg-space-600 text-gray-400 hover:text-gray-200' 
                        : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'
                    }`}
                    title="Supprimer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  
                  {notif.link ? (
                    <Link to={notif.link} className="flex items-start gap-3 pr-6">
                      <div className="mt-1.5">{getTypeIcon(notif.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                          {notif.title}
                        </p>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {notif.message}
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                          {formatRelativeTime(notif.created_at)}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 pr-6">
                      <div className="mt-1.5">{getTypeIcon(notif.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                          {notif.title}
                        </p>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {notif.message}
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                          {formatRelativeTime(notif.created_at)}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <Link
            to="/dashboard/notifications"
            onClick={() => setIsOpen(false)}
            className={`flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors ${
              isDark 
                ? 'text-blue-400 hover:bg-space-700 border-t border-space-700'
                : 'text-blue-600 hover:bg-gray-50 border-t border-gray-100'
            }`}
          >
            Voir toutes les notifications
          </Link>
        </div>
      )}
    </div>
  )
}

const pathToTitle = (pathname) => {
  if (pathname === '/dashboard' || pathname === '/dashboard/') return 'Dashboard'
  if (pathname.startsWith('/dashboard/agents/') && pathname !== '/dashboard/agents') return 'Agent'
  if (pathname.startsWith('/dashboard/conversations/') && pathname !== '/dashboard/conversations') return 'Conversation'
  const segments = pathname.replace(/^\/dashboard\/?/, '').split('/')
  const first = segments[0] || 'dashboard'
  const map = {
    agents: 'Agents',
    analytics: 'Analytics',
    campaigns: 'Campagnes',
    conversations: 'Conversations',
    flows: 'Flows',
    knowledge: 'Base de connaissances',
    leads: 'Leads',
    notifications: 'Notifications',
    orders: 'Commandes',
    payments: 'Paiements',
    products: 'Produits',
    reports: 'Rapports',
    settings: 'Paramètres',
    templates: 'Templates',
    tools: 'Outils',
    workflows: 'Workflows',
    admin: 'Admin'
  }
  return map[first] || first
}

export default function DashboardLayout() {
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const { user, logout } = useAuth()
  const { theme, isDark } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  usePageTitle(pathToTitle(location.pathname))

  const paymentModuleEnabled = !!(user?.payment_module_enabled === 1 || user?.payment_module_enabled === true)
  const navGroups = useMemo(() => {
    if (paymentModuleEnabled) return navigationGroups
    return navigationGroups.map(g => ({
      ...g,
      items: g.items.filter(item => item.href !== '/dashboard/payments')
    }))
  }, [paymentModuleEnabled])

  useEffect(() => {
    const tick = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  // Bloquer le défilement de la page quand la sidebar mobile est ouverte (mobile uniquement)
  useEffect(() => {
    if (!sidebarOpen) return
    const mql = window.matchMedia('(max-width: 1023px)')
    if (!mql.matches) return
    const prevOverflow = document.body.style.overflow
    const prevTouchAction = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.touchAction = prevTouchAction
    }
  }, [sidebarOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <OnboardingTourProvider userId={user?.id}>
    <div className={`min-h-screen ${isDark ? 'bg-space-950' : 'bg-gray-50'}`}>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className={`fixed inset-0 backdrop-blur-sm ${isDark ? 'bg-space-950/90' : 'bg-slate-900/40'}`} onClick={() => setSidebarOpen(false)} />
        <div className={`fixed inset-y-0 left-0 w-64 max-w-[85vw] shadow-2xl border-r flex flex-col ${isDark ? 'bg-space-900 border-space-700' : 'bg-white border-gray-200'}`} style={{ paddingLeft: 'env(safe-area-inset-left)' }}>
          <div className={`flex h-16 flex-shrink-0 items-center justify-between px-4 border-b ${isDark ? 'border-space-700' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <Logo className="flex-shrink-0" />
              <span className={`font-semibold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('landing.title')}</span>
            </div>
            <button type="button" onClick={() => setSidebarOpen(false)} className={`touch-target flex items-center justify-center p-2 -mr-2 rounded-lg transition-colors text-icon ${isDark ? 'hover:text-gray-100 hover:bg-space-800' : 'hover:text-gray-800 hover:bg-gray-100'}`} aria-label="Fermer le menu">
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="p-4 space-y-1 overflow-y-auto flex-1 min-h-0">
            <SidebarNavGroups
              navGroups={navGroups}
              onItemClick={() => setSidebarOpen(false)}
              isMobile={true}
            />
            
            {/* Bottom navigation */}
            <div className={`pt-4 mt-4 border-t ${isDark ? 'border-space-700' : 'border-gray-200'}`}>
              {bottomNavigation.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : isDark 
                          ? 'text-gray-400 hover:bg-space-800 hover:text-gray-100'
                          : 'text-gray-800 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 text-icon" />
                  {t(item.nameKey)}
                </NavLink>
              ))}
            </div>
            
            {/* Admin Navigation */}
            {user?.is_admin === 1 && (
              <>
                <div className={`pt-4 mt-4 border-t ${isDark ? 'border-space-700' : 'border-gray-200'}`}>
                  <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gold-400' : 'text-amber-600'}`}>Admin</span>
                </div>
                {adminNavigation.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-gold-400/20 text-gold-400 border border-gold-400/30'
                          : isDark 
                            ? 'text-gray-400 hover:bg-space-800 hover:text-gray-100'
                            : 'text-gray-800 hover:bg-gray-100 hover:text-gray-900'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5 text-icon" />
                    {t(item.nameKey)}
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          {/* User section — nom + email visibles en mobile */}
          <div className={`flex-shrink-0 p-4 border-t ${isDark ? 'border-space-700' : 'border-gray-200'}`} style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                user?.is_admin ? 'bg-gradient-to-br from-gold-400 to-blue-500' : 'bg-gradient-to-br from-blue-500 to-gold-400'
              }`}>
                {user?.is_admin ? (
                  <Shield className="w-5 h-5 icon-on-gradient" />
                ) : (
                  <span className="text-white font-bold text-sm">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{user?.name}</p>
                  {user?.is_admin === 1 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gold-400/20 text-gold-400 rounded shrink-0">
                      Admin
                    </span>
                  )}
                </div>
                <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{user?.email}</p>
              </div>
            </div>
            <div className={`flex items-center justify-between text-sm px-2 py-2 rounded-lg ${isDark ? 'bg-space-800' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-gold-400" />
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Crédits</span>
              </div>
              <span className="font-semibold text-gold-400">{user?.credits ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className={`flex flex-col flex-grow border-r ${isDark ? 'bg-space-900 border-space-700' : 'bg-white border-gray-200'}`}>
          <div className={`flex h-16 items-center gap-2 px-4 border-b min-w-0 ${isDark ? 'border-space-700' : 'border-gray-200'}`}>
            <Logo className="flex-shrink-0" />
            <span className={`font-semibold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('landing.title')}</span>
          </div>
          
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <SidebarNavGroups
              navGroups={navGroups}
              onItemClick={() => {}}
              isMobile={false}
            />
            
            {/* Bottom navigation */}
            <div className={`pt-4 mt-4 border-t ${isDark ? 'border-space-700' : 'border-gray-200'}`}>
              {bottomNavigation.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  data-tour={item.tourId}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : isDark 
                          ? 'text-gray-400 hover:bg-space-800 hover:text-gray-100'
                          : 'text-gray-800 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 text-icon" />
                  {t(item.nameKey)}
                </NavLink>
              ))}
            </div>
            
            {/* Admin Navigation */}
            {user?.is_admin === 1 && (
              <>
                <div className={`pt-4 mt-4 border-t ${isDark ? 'border-space-700' : 'border-gray-200'}`}>
                  <span className={`px-3 text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gold-400' : 'text-amber-600'}`}>Admin</span>
                </div>
                {adminNavigation.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-gold-400/20 text-gold-400 border border-gold-400/30'
                          : isDark 
                            ? 'text-gray-400 hover:bg-space-800 hover:text-gray-100'
                            : 'text-gray-800 hover:bg-gray-100 hover:text-gray-900'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5 text-icon" />
                    {t(item.nameKey)}
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          {/* User section - Compact */}
          <div className={`p-4 border-t ${isDark ? 'border-space-700' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                user?.is_admin ? 'bg-gradient-to-br from-gold-400 to-blue-500' : 'bg-gradient-to-br from-blue-500 to-gold-400'
              }`}>
                {user?.is_admin ? (
                  <Shield className="w-5 h-5 icon-on-gradient" />
                ) : (
                  <span className="text-white font-bold text-sm">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{user?.name}</p>
                  {user?.is_admin === 1 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gold-400/20 text-gold-400 rounded">
                      Admin
                    </span>
                  )}
                </div>
                <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{user?.email}</p>
              </div>
            </div>
            <div className={`flex items-center justify-between text-sm px-2 py-2 rounded-lg ${isDark ? 'bg-space-800' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-gold-400" />
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Crédits</span>
              </div>
              <span className="font-semibold text-gold-400">{user?.credits || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`lg:pl-64 min-h-screen ${isDark ? 'bg-space-950' : 'bg-gray-50'}`}>
        {/* Mobile header — heure centrée, nom entreprise en dessous pour voir la totalité (Android / mobile) */}
        <div className={`relative sticky top-0 z-40 flex h-[4.5rem] min-h-16 items-center border-b backdrop-blur-md px-4 lg:hidden ${
          isDark ? 'border-space-700 bg-space-900/80' : 'border-gray-200 bg-white/90'
        }`} style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button type="button" onClick={() => setSidebarOpen(true)} className={`touch-target flex-shrink-0 flex items-center justify-center p-2 -ml-2 rounded-lg transition-colors text-icon ${isDark ? 'hover:text-gray-100 hover:bg-space-800' : 'hover:text-gray-800 hover:bg-gray-100'}`} aria-label="Ouvrir le menu">
              <Menu className="w-6 h-6" />
            </button>
            <Logo className="flex-shrink-0" />
          </div>
          {/* Heure + nom entreprise en dessous (centré) pour afficher le nom en entier sur mobile */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-0.5 pointer-events-none min-w-0 max-w-[50vw] text-icon"
            aria-live="polite"
          >
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-medium tabular-nums whitespace-nowrap">
                {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <span className={`text-[10px] sm:text-xs font-medium text-center break-words line-clamp-2 leading-tight ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              {user?.company?.trim() ? user.company.trim() : 'Mon espace'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <LanguageSwitcher className="hidden sm:flex" />
            <ThemeToggle size="sm" />
            <UserMenu user={user} onLogout={handleLogout} />
          </div>
        </div>

        {/* Desktop top navbar */}
        <div className={`hidden lg:flex relative sticky top-0 z-40 h-14 items-center justify-between border-b px-6 ${
          isDark ? 'border-space-700/80 bg-space-900/95 backdrop-blur-md' : 'border-gray-200/80 bg-white/95 backdrop-blur-md'
        }`}>
          {/* Left - Company / space name */}
          <Link
            to="/dashboard/settings"
            className={`flex items-center gap-2 min-w-0 max-w-[220px] rounded-lg px-3 py-2 -ml-2 transition-colors ${
              isDark ? 'text-gray-300 hover:text-gray-100 hover:bg-space-800/80' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100/80'
            }`}
            title={user?.company ? user.company : 'Renseigner mon entreprise'}
          >
            <Building className="w-4 h-4 flex-shrink-0 text-icon" />
            <span className="text-sm font-medium truncate">
              {user?.company?.trim() ? user.company.trim() : 'Mon espace'}
            </span>
          </Link>

          {/* Center - Heure */}
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none ${
              'text-icon'
            }`}
            aria-live="polite"
          >
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium tabular-nums">
              {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Right - Lang, credits, theme, notifications, user */}
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Link
              to="/dashboard/settings"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-space-800/80' : 'hover:bg-gray-100/80'
              }`}
              title="Crédits et abonnement"
            >
              <Zap className="w-4 h-4 text-gold-400" />
              <span className="text-sm font-semibold text-gold-400 tabular-nums">{user?.credits ?? 0}</span>
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>crédits</span>
            </Link>
            <ThemeToggle size="sm" />
            <NotificationsMenu />
            <div className="w-px h-6 mx-1 self-center bg-current opacity-20" aria-hidden />
            <UserMenu user={user} onLogout={handleLogout} />
          </div>
        </div>

        {/* Page content - safe area bottom for Android gesture bar */}
        <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6 xl:p-8 overflow-x-hidden pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Outlet />
        </main>
      </div>
    </div>
    </OnboardingTourProvider>
  )
}
