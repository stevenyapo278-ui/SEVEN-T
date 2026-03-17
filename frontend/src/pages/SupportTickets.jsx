import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LifeBuoy, Search, Filter, ChevronRight, User, BadgeCheck, Clock } from 'lucide-react'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

const STATUS_LABEL = { open: 'Ouvert', in_progress: 'En cours', waiting_on_customer: 'En attente client', resolved: 'Résolu', closed: 'Fermé' }
const PRIORITY_LABEL = { low: 'Basse', medium: 'Moyenne', high: 'Haute' }

function badgeClass(isDark, kind) {
  const base = 'px-2 py-0.5 rounded-full text-xs font-semibold border'
  if (kind === 'status:open') return `${base} ${isDark ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'}`
  if (kind === 'status:in_progress') return `${base} ${isDark ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200'}`
  if (kind === 'status:waiting_on_customer') return `${base} ${isDark ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200'}`
  if (kind === 'status:resolved') return `${base} ${isDark ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`
  if (kind === 'status:closed') return `${base} ${isDark ? 'bg-gray-500/10 text-gray-300 border-gray-500/30' : 'bg-gray-50 text-gray-700 border-gray-200'}`
  if (kind === 'prio:high') return `${base} ${isDark ? 'bg-red-500/10 text-red-300 border-red-500/30' : 'bg-red-50 text-red-700 border-red-200'}`
  if (kind === 'prio:medium') return `${base} ${isDark ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200'}`
  return `${base} ${isDark ? 'bg-gray-500/10 text-gray-300 border-gray-500/30' : 'bg-gray-50 text-gray-700 border-gray-200'}`
}

export default function SupportTickets() {
  const { isDark } = useTheme()
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [agents, setAgents] = useState([])

  const canAssign = Boolean(user?.permissions?.includes('support.tickets.assign') || user?.is_admin)

  const params = useMemo(() => {
    const p = { limit: 100, offset: 0 }
    if (q.trim()) p.q = q.trim()
    if (status) p.status = status
    if (priority) p.priority = priority
    if (assignedTo) p.assignedTo = assignedTo
    return p
  }, [q, status, priority, assignedTo])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/tickets', { params })
      setTickets(res.data?.tickets || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  useEffect(() => {
    api.get('/admin/tickets/stats', { params: { days: 30 } })
      .then((r) => setStats(r.data || null))
      .catch(() => setStats(null))
  }, [])

  useEffect(() => {
    if (!canAssign) return
    api.get('/admin/support-agents').then((r) => setAgents(r.data?.agents || [])).catch(() => {})
  }, [canAssign])

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Support · Tickets</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Tri, réponse et suivi des tickets support.</p>
        </div>
      </div>

      {stats && (
        <div className={`rounded-2xl border p-4 mb-4 ${isDark ? 'bg-space-900 border-space-700/60' : 'bg-white border-gray-200'}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`rounded-xl border p-3 ${isDark ? 'border-space-700/60 bg-space-950/30' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Résolus (30j)</div>
              <div className={`text-lg font-semibold mt-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{stats.resolvedInWindow ?? 0}</div>
            </div>
            <div className={`rounded-xl border p-3 ${isDark ? 'border-space-700/60 bg-space-950/30' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">1ère réponse</div>
              <div className={`text-lg font-semibold mt-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {Math.round(stats.avgFirstReplyMinutes ?? 0)} min
              </div>
            </div>
            <div className={`rounded-xl border p-3 ${isDark ? 'border-space-700/60 bg-space-950/30' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Résolution moy.</div>
              <div className={`text-lg font-semibold mt-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {Number(stats.avgResolutionHours ?? 0).toFixed(1)} h
              </div>
              <div className="text-[10px] text-gray-500 mt-1">Échantillon: {stats.resolutionSampleSize ?? 0}</div>
            </div>
            <div className={`rounded-xl border p-3 ${isDark ? 'border-space-700/60 bg-space-950/30' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Par statut</div>
              <div className={`text-xs mt-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {(stats.byStatus || []).map((s) => (
                  <div key={s.status} className="flex items-center justify-between gap-2">
                    <span className="capitalize">{String(s.status).replace('_', ' ')}</span>
                    <span className="tabular-nums font-semibold">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`rounded-2xl border p-4 ${isDark ? 'bg-space-900 border-space-700/60' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className={`px-2 py-1 rounded-lg text-sm border ${isDark ? 'bg-space-950 border-space-700 text-gray-200' : 'bg-white border-gray-200 text-gray-900'}`}>
              <option value="">Tous les statuts</option>
              <option value="open">Ouvert</option>
              <option value="in_progress">En cours</option>
              <option value="resolved">Résolu</option>
              <option value="closed">Fermé</option>
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}
              className={`px-2 py-1 rounded-lg text-sm border ${isDark ? 'bg-space-950 border-space-700 text-gray-200' : 'bg-white border-gray-200 text-gray-900'}`}>
              <option value="">Toutes les priorités</option>
              <option value="low">Basse</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
            </select>
            {canAssign && (
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
                className={`px-2 py-1 rounded-lg text-sm border ${isDark ? 'bg-space-950 border-space-700 text-gray-200' : 'bg-white border-gray-200 text-gray-900'}`}>
                <option value="">Assignation: toutes</option>
                <option value="unassigned">Non assigné</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name || a.email}</option>
                ))}
              </select>
            )}
          </div>
          <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${isDark ? 'bg-space-950 border-space-700' : 'bg-white border-gray-200'}`}>
            <Search className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher…"
              className={`bg-transparent outline-none text-sm w-56 ${isDark ? 'text-gray-200 placeholder:text-gray-600' : 'text-gray-900 placeholder:text-gray-400'}`}
            />
          </div>
        </div>

        <div className="mt-4 divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {loading ? (
            <div className={`py-10 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Chargement…</div>
          ) : tickets.length === 0 ? (
            <div className="py-10 text-center">
              <LifeBuoy className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Aucun ticket.</p>
            </div>
          ) : (
            tickets.map((t) => (
              <Link
                key={t.id}
                to={`/dashboard/support/tickets/${t.id}`}
                className={`group flex items-center justify-between gap-3 py-3 transition-colors ${
                  isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                } px-2 rounded-lg`}
              >
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t.subject}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={badgeClass(isDark, `status:${t.status}`)}>{STATUS_LABEL[t.status] || t.status}</span>
                    <span className={badgeClass(isDark, `prio:${t.priority}`)}>{PRIORITY_LABEL[t.priority] || t.priority}</span>
                    <span className={`text-xs inline-flex items-center gap-1 ${isDark ? 'text-gray-600' : 'text-gray-500'}`}>
                      <User className="w-3 h-3" />{t.user_email}
                    </span>
                    <span className={`text-xs inline-flex items-center gap-1 ${isDark ? 'text-gray-600' : 'text-gray-500'}`}>
                      <BadgeCheck className="w-3 h-3" />
                      {t.assigned_name || t.assigned_email || 'Non assigné'}
                    </span>
                    {!!t.updated_at && (
                      <span className={`text-xs inline-flex items-center gap-1 ${isDark ? 'text-gray-600' : 'text-gray-500'}`}>
                        <Clock className="w-3 h-3" />
                        {new Date(t.updated_at).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-600 group-hover:text-gray-400' : 'text-gray-300 group-hover:text-gray-500'}`} />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

