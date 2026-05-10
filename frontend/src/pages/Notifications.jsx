import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, Trash2, RefreshCw, Search, Calendar, X, MessageSquare, UserPlus, AlertTriangle, ShieldCheck, CreditCard, Bot, Info, MoreHorizontal, Sparkles, LayoutDashboard, History } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { useNotificationSocket } from '../hooks/useNotificationSocket'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { registerLocale } from 'react-datepicker'
import fr from 'date-fns/locale/fr'
registerLocale('fr', fr)

export default function Notifications() {
  const { t, i18n } = useTranslation()
  const { isDark } = useTheme()
  const { showConfirm } = useConfirm()
  const { permission, isSubscribed, subscribe, unsubscribe } = usePushNotifications()

  // Real-time updates
  useNotificationSocket(useCallback((newNotif) => {
    setNotifications(prev => {
        // Prevent duplicates
        if (prev.some(n => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
    });
    setUnreadCount(prev => prev + 1);
  }, []))
  
  const FILTERS = [
    { id: 'all', label: t('common.all') },
    { id: 'unread', label: t('notifications.unreadOnly') }
  ]
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState(false)
  
  // New Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const formatRelativeTime = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return t('common.justNow', 'À l\'instant')
    if (diffMins < 60) return `${diffMins} min`
    if (diffHours < 24) return `${diffHours}h`
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const groupNotifications = (notifs) => {
    const groups = {}
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    
    notifs.forEach(n => {
      const d = new Date(n.created_at)
      d.setHours(0, 0, 0, 0)
      
      let key = d.toLocaleDateString()
      if (d.getTime() === now.getTime()) key = t('common.today', 'Aujourd\'hui')
      else if (d.getTime() === yesterday.getTime()) key = t('common.yesterday', 'Hier')
      else key = d.toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long' })
      
      if (!groups[key]) groups[key] = []
      groups[key].push(n)
    })
    return groups
  }

  const loadNotifications = useCallback(async (filter = activeFilter) => {
    try {
      setLoading(true)
      const unreadOnly = filter === 'unread'
      
      let url = `/notifications?limit=200${unreadOnly ? '&unread=true' : ''}`
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`
      if (startDate) url += `&startDate=${startDate}`
      if (endDate) url += `&endDate=${endDate}`

      const response = await api.get(url)
      const all = response.data.notifications || []

      // On inclut désormais toutes les notifications pour éviter les décalages avec le badge,
      // même si elles sont aussi visibles dans l'onglet Activité.
      const businessNotifications = all;

      setNotifications(businessNotifications)
      const unread = businessNotifications.filter(n => !n.is_read).length
      setUnreadCount(unread)
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast.error(t('notifications.errorLoading'))
    } finally {
      setLoading(false)
    }
  }, [activeFilter, searchTerm, startDate, endDate, t])

  useEffect(() => {
    const timer = setTimeout(() => {
        loadNotifications()
    }, 300) // Debounce search
    return () => clearTimeout(timer)
  }, [loadNotifications])

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking as read:', error)
      toast.error(t('messages.errorGeneric'))
    }
  }

  const markAllAsRead = async () => {
    try {
      setActionLoading(true)
      await api.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
      setUnreadCount(0)
      toast.success(t('notifications.successReadAll'))
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error(t('common.error'))
    } finally {
      setActionLoading(false)
    }
  }

  const deleteNotification = async (id) => {
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
      toast.error(t('messages.errorDelete'))
    }
  }

  const deleteReadAll = async () => {
    const readIds = notifications.filter(n => n.is_read).map(n => n.id)
    if (readIds.length === 0) return
    
    const ok = await showConfirm({
      title: t('notifications.confirmDeleteRead', 'Supprimer toutes les notifications lues ?'),
      message: 'Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return

    try {
      setActionLoading(true)
      // On boucle sur les deletes car le backend n'a peut-être pas de delete-all pour le moment
      // Ou on pourrait ajouter une route backend delete-read-all
      await Promise.all(readIds.map(id => api.delete(`/notifications/${id}`)))
      setNotifications(prev => prev.filter(n => !n.is_read))
      toast.success(t('notifications.successDeleteRead', 'Notifications lues supprimées'))
    } catch (error) {
      console.error('Error deleting read notifications:', error)
      toast.error(t('common.error'))
    } finally {
      setActionLoading(false)
    }
  }

  const getTypeBadge = (type) => {
    const styles = {
      success: 'bg-green-500/10 text-green-500',
      warning: 'bg-amber-500/10 text-amber-500',
      error: 'bg-red-500/10 text-red-500',
      lead: 'bg-blue-500/10 text-blue-500',
      whatsapp: 'bg-emerald-500/10 text-emerald-500',
      credit: 'bg-yellow-500/10 text-yellow-500',
      agent: 'bg-indigo-500/10 text-indigo-500',
      relance: 'bg-gold-400/10 text-gold-400',
      info: 'bg-blue-500/10 text-blue-500'
    }
    return styles[type] || styles.info
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />
      case 'lead': return <UserPlus className="w-4 h-4" />
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      case 'error': return <AlertTriangle className="w-4 h-4" />
      case 'success': return <ShieldCheck className="w-4 h-4" />
      case 'credit': return <CreditCard className="w-4 h-4" />
      case 'agent': return <Bot className="w-4 h-4" />
      case 'relance': return <Sparkles className="w-4 h-4" />
      default: return <Info className="w-4 h-4" />
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStartDate('')
    setEndDate('')
    setActiveFilter('all')
  }

  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0 pb-12">
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
                <div className="p-2 bg-blue-500/10 rounded-xl flex-shrink-0">
                  <Bell className="w-6 h-6 text-blue-400" />
                </div>
                <h1 className={`text-2xl sm:text-3xl font-display font-bold break-words ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('notifications.title')}</h1>
              </div>
              <p className={`text-base sm:text-lg break-words ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                {unreadCount} {unreadCount <= 1 ? t('notifications.unread', 'unread') : t('notifications.unread_plural', 'unread')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0 relative z-20">
               <div className="grid grid-cols-2 sm:flex gap-3 mr-4">
                  <div className={`px-4 py-2 rounded-2xl border ${isDark ? 'bg-space-900/40 border-space-700' : 'bg-white border-gray-100'} flex items-center gap-3`}>
                     <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Check className="w-4 h-4 text-emerald-500" />
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Lues</p>
                        <p className={`text-sm font-black ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{notifications.length - unreadCount}</p>
                     </div>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl border ${isDark ? 'bg-space-900/40 border-space-700' : 'bg-white border-gray-100'} flex items-center gap-3`}>
                     <div className="w-8 h-8 rounded-lg bg-gold-400/10 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-gold-400" />
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Total</p>
                        <p className={`text-sm font-black ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{notifications.length}</p>
                     </div>
                  </div>
               </div>

              <button
                onClick={() => loadNotifications(activeFilter)}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 min-h-[44px] ${
                  isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700 hover:text-white border border-space-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{t('dashboard.refresh')}</span>
              </button>
              
              <div className="flex bg-space-800/50 p-1 rounded-xl border border-space-700/50">
                <button
                  onClick={markAllAsRead}
                  disabled={actionLoading || unreadCount === 0}
                  className="p-2.5 text-gray-400 hover:text-emerald-400 disabled:opacity-30 transition-colors"
                  title={t('notifications.markAllRead')}
                >
                  <Check className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-space-700 my-auto mx-1" />
                <button
                  onClick={deleteReadAll}
                  disabled={actionLoading || notifications.filter(n => n.is_read).length === 0}
                  className="p-2.5 text-gray-400 hover:text-red-400 disabled:opacity-30 transition-colors"
                  title={t('notifications.deleteRead', 'Supprimer les lues')}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Push Notifications Setup */}
      {!isSubscribed && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-xl">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('notifications.enablePushTitle', 'Activer les notifications push')}
              </h3>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('notifications.enablePushDesc', 'Soyez alerté en temps réel même lorsque vous n\'êtes pas sur l\'application.')}
              </p>
            </div>
          </div>
          <button
            onClick={subscribe}
            className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25"
          >
            {t('common.enable', 'Activer')}
          </button>
        </div>
      )}

      {isSubscribed && (
         <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
            isDark ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-100'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className={`text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  {t('notifications.pushEnabled', 'Notifications push actives')}
                </p>
              </div>
            </div>
            <button
              onClick={unsubscribe}
              className={`text-xs font-medium ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {t('common.disable', 'Désactiver')}
            </button>
          </div>
      )}

      {/* Filters Section */}
      <div className={`p-6 rounded-2xl border transition-all duration-300 ${
        isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'
      } space-y-4`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Term */}
          <div className="relative md:col-span-2">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder={t('notifications.filterSearch')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                isDark ? 'bg-space-900 border-space-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
              }`}
            />
          </div>

          {/* Start Date */}
          <div className="relative">
            <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <DatePicker
              selected={startDate ? new Date(startDate) : null}
              onChange={(date) => setStartDate(date ? date.toISOString().slice(0, 10) : '')}
              dateFormat="dd/MM/yyyy"
              placeholderText="Date début"
              locale="fr"
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                isDark ? 'bg-space-900 border-space-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
              }`}
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <DatePicker
              selected={endDate ? new Date(endDate) : null}
              onChange={(date) => setEndDate(date ? date.toISOString().slice(0, 10) : '')}
              dateFormat="dd/MM/yyyy"
              placeholderText="Date fin"
              locale="fr"
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                isDark ? 'bg-space-900 border-space-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
              }`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-space-700">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors touch-target ${
                  activeFilter === filter.id
                    ? 'bg-blue-600 text-white'
                    : isDark
                      ? 'bg-space-700 text-gray-300 hover:bg-space-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {(searchTerm || startDate || endDate || activeFilter !== 'all') && (
            <button
              onClick={clearFilters}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              {t('notifications.clearFilters')}
            </button>
          )}
        </div>
      </div>

      <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'
      }`}>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-8 h-8 mx-auto mb-2 text-icon" />
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              {t('notifications.noNotifications')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-space-700">
            {Object.entries(groupNotifications(notifications)).map(([dateKey, groupNotifs]) => (
              <div key={dateKey}>
                <div className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-space-900/50 text-gray-500 border-y border-space-700/50' : 'bg-gray-50 text-gray-400 border-y border-gray-100'}`}>
                  {dateKey}
                </div>
                <div className="divide-y divide-gray-100 dark:divide-space-700">
                  {groupNotifs.map((notif, idx) => (
                    <div
                      key={notif.id}
                      className={`group p-4 md:p-5 transition-all duration-300 hover:bg-space-800/40 animate-fadeIn ${
                        isDark
                          ? notif.is_read ? 'bg-transparent' : 'bg-blue-500/5 border-l-2 border-l-blue-500'
                          : notif.is_read ? 'bg-white' : 'bg-blue-50/40 border-l-2 border-l-blue-500'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Type Icon Indicator */}
                        <div className={`mt-1 h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${getTypeBadge(notif.type)}`}>
                          {getTypeIcon(notif.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              {!notif.is_read && (
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              )}
                              <p className={`text-sm font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                {notif.title}
                              </p>
                            </div>
                            <span className={`text-[10px] whitespace-nowrap ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {formatRelativeTime(notif.created_at)}
                            </span>
                          </div>

                          <p className={`text-sm break-words leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {notif.message}
                          </p>

                          {notif.metadata && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {Object.entries(typeof notif.metadata === 'string' ? JSON.parse(notif.metadata) : notif.metadata).map(([key, value]) => (
                                    <div key={key} className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
                                        isDark ? 'bg-space-900/60 border-white/5 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'
                                    }`}>
                                        <span className="opacity-50">{key}</span>
                                        <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>{String(value)}</span>
                                    </div>
                                ))}
                            </div>
                          )}

                          <div className="mt-4 flex items-center justify-between">
                            <div>
                               {notif.link && (
                                <Link
                                  to={notif.link}
                                  onClick={() => {
                                    if (!notif.is_read) markAsRead(notif.id)
                                  }}
                                  className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                                    isDark ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                  }`}
                                >
                                  {t('common.open', 'Consulter')}
                                  <MoreHorizontal className="w-3 h-3" />
                                </Link>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                              {!notif.is_read && (
                                <button
                                  onClick={() => markAsRead(notif.id)}
                                  className={`p-2 rounded-xl transition-colors ${
                                    isDark ? 'hover:bg-emerald-500/10 text-emerald-500/60 hover:text-emerald-400' : 'hover:bg-emerald-50 text-emerald-600'
                                  }`}
                                  title={t('notifications.markRead')}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => deleteNotification(notif.id)}
                                className={`p-2 rounded-xl transition-colors ${
                                  isDark ? 'hover:bg-red-500/10 text-red-500/60 hover:text-red-400' : 'hover:bg-red-50 text-red-600'
                                }`}
                                title={t('common.delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
