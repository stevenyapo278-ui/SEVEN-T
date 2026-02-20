import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, Trash2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'

const FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'unread', label: 'Non lues' }
]

export default function Notifications() {
  const { isDark } = useTheme()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState(false)

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

  const loadNotifications = async (filter = activeFilter) => {
    try {
      setLoading(true)
      const unreadOnly = filter === 'unread'
      const response = await api.get(`/notifications?limit=200${unreadOnly ? '&unread=true' : ''}`)
      setNotifications(response.data.notifications || [])
      setUnreadCount(response.data.unreadCount || 0)
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast.error('Erreur lors du chargement des notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [activeFilter])

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking as read:', error)
      toast.error('Impossible de marquer comme lu')
    }
  }

  const markAllAsRead = async () => {
    try {
      setActionLoading(true)
      await api.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
      setUnreadCount(0)
      toast.success('Toutes les notifications sont lues')
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('Erreur lors de la mise à jour')
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
      toast.error('Suppression impossible')
    }
  }

  const getTypeBadge = (type) => {
    const styles = {
      success: 'bg-green-500/10 text-green-500',
      warning: 'bg-amber-500/10 text-amber-500',
      error: 'bg-red-500/10 text-red-500',
      lead: 'bg-violet-500/10 text-violet-500',
      whatsapp: 'bg-emerald-500/10 text-emerald-500',
      credit: 'bg-yellow-500/10 text-yellow-500',
      agent: 'bg-violet-500/10 text-violet-500',
      info: 'bg-blue-500/10 text-blue-500'
    }
    return styles[type] || styles.info
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-space-800 text-violet-400' : 'bg-violet-50 text-violet-600'
          }`}>
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {unreadCount} non lue(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadNotifications(activeFilter)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Rafraîchir
          </button>
          <button
            onClick={markAllAsRead}
            disabled={actionLoading || unreadCount === 0}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              actionLoading || unreadCount === 0
                ? 'opacity-50 cursor-not-allowed'
                : isDark
                  ? 'bg-violet-500/10 text-violet-300 hover:bg-violet-500/20'
                  : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
            }`}
          >
            <Check className="w-4 h-4" />
            Tout marquer comme lu
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              activeFilter === filter.id
                ? isDark
                  ? 'bg-violet-500 text-white'
                  : 'bg-violet-600 text-white'
                : isDark
                  ? 'bg-space-800 text-gray-300 hover:bg-space-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className={`rounded-2xl border ${isDark ? 'border-space-700 bg-space-800' : 'border-gray-200 bg-white'}`}>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500 mx-auto"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Aucune notification
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-space-700">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 md:p-5 ${
                  isDark
                    ? notif.is_read ? 'bg-space-800' : 'bg-space-700/60'
                    : notif.is_read ? 'bg-white' : 'bg-violet-50/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getTypeBadge(notif.type)}`}>
                        {notif.type}
                      </span>
                      {!notif.is_read && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-violet-500/10 text-violet-400">
                          Non lue
                        </span>
                      )}
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
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
                        isDark ? 'bg-space-900/60 text-gray-400' : 'bg-gray-50 text-gray-500'
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
                            isDark ? 'text-violet-300 hover:text-violet-200' : 'text-violet-600 hover:text-violet-500'
                          }`}
                        >
                          Ouvrir
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!notif.is_read && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className={`p-2 rounded-lg ${
                          isDark ? 'hover:bg-space-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                        }`}
                        title="Marquer comme lu"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className={`p-2 rounded-lg ${
                        isDark ? 'hover:bg-space-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                      }`}
                      title="Supprimer"
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
