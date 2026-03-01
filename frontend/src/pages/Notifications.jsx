import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, Trash2, RefreshCw, Search, Calendar, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'

export default function Notifications() {
  const { t, i18n } = useTranslation()
  const { isDark } = useTheme()
  
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
    const diffDays = Math.floor(diffMs / 86400000)

    const locale = (i18n.resolvedLanguage || i18n.language || 'fr').split('-')[0]

    if (diffMins < 1) return t('common.justNow', 'Just now')
    if (diffMins < 60) return t('common.minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('common.hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('common.daysAgo', { count: diffDays })
    return date.toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')
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
      setNotifications(response.data.notifications || [])
      setUnreadCount(response.data.unreadCount || 0)
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

  const getTypeBadge = (type) => {
    const styles = {
      success: 'bg-green-500/10 text-green-500',
      warning: 'bg-amber-500/10 text-amber-500',
      error: 'bg-red-500/10 text-red-500',
      lead: 'bg-blue-500/10 text-blue-500',
      whatsapp: 'bg-emerald-500/10 text-emerald-500',
      credit: 'bg-yellow-500/10 text-yellow-500',
      agent: 'bg-blue-500/10 text-blue-500',
      info: 'bg-blue-500/10 text-blue-500'
    }
    return styles[type] || styles.info
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStartDate('')
    setEndDate('')
    setActiveFilter('all')
  }

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6 px-3 sm:px-4 min-w-0 pb-12">
      {/* Header Hero */}
      <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border p-4 sm:p-8 mb-4 sm:mb-8 ${
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
              <button
                onClick={() => loadNotifications(activeFilter)}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 min-h-[44px] ${
                  isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{t('dashboard.refresh')}</span>
              </button>
              <button
                onClick={markAllAsRead}
                disabled={actionLoading || unreadCount === 0}
                className="btn-primary flex items-center gap-2 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-5 h-5" />
                <span>{t('notifications.markAllRead')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

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
            <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                isDark ? 'bg-space-900 border-space-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
              }`}
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
            {notifications.map((notif, index) => (
              <div
                key={notif.id}
                className={`p-4 md:p-5 animate-fadeIn ${
                  isDark
                    ? notif.is_read ? 'bg-space-800' : 'bg-space-700/60'
                    : notif.is_read ? 'bg-white' : 'bg-blue-50/40'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getTypeBadge(notif.type)}`}>
                        {notif.type}
                      </span>
                      {!notif.is_read && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-400">
                          {t('notifications.unread', 'Unread')}
                        </span>
                      )}
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                        {notif.title}
                      </p>
                      {notif.message && (
                        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {notif.message}
                        </p>
                      )}
                    </div>
                    {notif.metadata && (
                      <div className={`mt-3 text-xs rounded-lg px-3 py-2 ${
                        isDark ? 'bg-space-900/60 text-gray-400' : 'bg-gray-50 text-gray-600'
                      }`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                          {Object.entries(notif.metadata).map(([key, value]) => (
                            <div key={key} className="truncate">
                              <span className="font-medium">{key}:</span> {String(value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {notif.link && (
                      <div className="mt-3">
                        <Link
                          to={notif.link}
                          onClick={() => {
                            if (!notif.is_read) markAsRead(notif.id)
                          }}
                          className={`text-xs font-medium ${
                            isDark ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-500'
                          }`}
                        >
                          {t('common.open', 'Open')}
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!notif.is_read && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className={`p-2 rounded-lg ${
                          isDark ? 'hover:bg-space-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                        title={t('notifications.markRead', 'Mark as read')}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className={`p-2 rounded-lg ${
                        isDark ? 'hover:bg-space-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
