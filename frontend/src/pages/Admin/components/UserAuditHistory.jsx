import { useState, useEffect } from 'react'
import { Activity, Clock, Loader2 } from 'lucide-react'
import api from '../../../services/api'
import { ACTION_LABELS } from '../constants'

export default function UserAuditHistory({ userId }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    api.get(`/admin/audit-logs?userId=${userId}&limit=30`)
      .then(res => setLogs(res.data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [userId])

  const getColor = (action) => {
    if (action?.includes('delete') || action === 'login_failed') return 'text-red-400 bg-red-400/10'
    if (action?.includes('create')) return 'text-emerald-400 bg-emerald-400/10'
    if (action?.includes('login')) return 'text-blue-400 bg-blue-400/10'
    if (action?.includes('rollback')) return 'text-amber-400 bg-amber-400/10'
    return 'text-gray-400 bg-gray-400/10'
  }

  const formatRelTime = (d) => {
    // Standardize time calculation
    const diff = (Date.now() - new Date(d).getTime()) / 1000
    if (diff < 60) return "À l'instant"
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}m`
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`
    return new Date(d).toLocaleDateString('fr-FR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 text-sm">
        <Activity className="w-10 h-10 mb-3 opacity-30" />
        Aucune activité enregistrée
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-space-800/50" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      {logs.map(log => {
        const details = typeof log.details === 'string' ? JSON.parse(log.details || '{}') : (log.details || {})
        const colorClass = getColor(log.action)
        return (
          <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
            <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs ${colorClass}`}>
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-200">
                {ACTION_LABELS[log.action] || log.action}
              </p>
              {details.geo && (
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <span title={`${details.geo.city}, ${details.geo.country}`}>{details.geo.emoji}</span>
                  {log.ip_address}
                </p>
              )}
              {!details.geo && log.ip_address && (
                <p className="text-[10px] text-gray-500 font-mono">{log.ip_address}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-gray-500 whitespace-nowrap flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelTime(log.created_at)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
