import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, LifeBuoy, ChevronRight, Filter, Search, Clock } from 'lucide-react'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'

const STATUS_LABEL = {
  open: 'Ouvert',
  in_progress: 'En cours',
  waiting_on_customer: 'En attente client',
  resolved: 'Résolu',
  closed: 'Fermé',
}

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

export default function Tickets() {
  const { isDark } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')

  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '')
  const [priorityFilter, setPriorityFilter] = useState(() => searchParams.get('priority') || '')
  const [q, setQ] = useState(() => searchParams.get('q') || '')

  useEffect(() => {
    const s = searchParams.get('status')
    const p = searchParams.get('priority')
    const qp = searchParams.get('q')
    if (s !== null) setStatusFilter(s || '')
    if (p !== null) setPriorityFilter(p || '')
    if (qp !== null) setQ(qp || '')
  }, [searchParams])

  const syncToUrl = useCallback((updates) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(updates).forEach(([k, v]) => {
        if (v) next.set(k, v)
        else next.delete(k)
      })
      return next
    }, { replace: true })
  }, [setSearchParams])

  const queryParams = useMemo(() => {
    const p = {}
    if (statusFilter) p.status = statusFilter
    if (priorityFilter) p.priority = priorityFilter
    if (q.trim()) p.q = q.trim()
    p.limit = 50
    p.offset = 0
    return p
  }, [statusFilter, priorityFilter, q])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/tickets', { params: queryParams })
      setTickets(res.data?.tickets || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams])

  const submit = async (e) => {
    e.preventDefault()
    if (!subject.trim()) return
    setCreating(true)
    try {
      await api.post('/tickets', { subject: subject.trim(), description: description.trim(), priority })
      setSubject('')
      setDescription('')
      setPriority('medium')
      setShowCreate(false)
      await load()
    } finally {
      setCreating(false)
    }
  }

  const openCreate = () => {
    setShowCreate(true)
    // Let the DOM update then scroll
    setTimeout(() => {
      document.getElementById('new-ticket')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Tickets support</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Crée et suis tes demandes au support.</p>
        </div>
        <button
          type="button"
          onClick={() => (showCreate ? setShowCreate(false) : openCreate())}
          title={showCreate ? 'Fermer le formulaire' : 'Créer un nouveau ticket'}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            isDark ? 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/15' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
          }`}
        >
          <Plus className="w-4 h-4" />
          {showCreate ? 'Fermer' : 'Nouveau ticket'}
        </button>
      </div>

      <div className={`rounded-2xl border p-4 ${isDark ? 'bg-space-900 border-space-700/60' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <select value={statusFilter} onChange={(e) => { const v = e.target.value; setStatusFilter(v); syncToUrl({ status: v || undefined }); }}
              className={`px-2 py-1 rounded-lg text-sm border ${isDark ? 'bg-space-950 border-space-700 text-gray-200' : 'bg-white border-gray-200 text-gray-900'}`}>
              <option value="">Tous les statuts</option>
              <option value="open">Ouvert</option>
              <option value="in_progress">En cours</option>
              <option value="resolved">Résolu</option>
              <option value="closed">Fermé</option>
            </select>
            <select value={priorityFilter} onChange={(e) => { const v = e.target.value; setPriorityFilter(v); syncToUrl({ priority: v || undefined }); }}
              className={`px-2 py-1 rounded-lg text-sm border ${isDark ? 'bg-space-950 border-space-700 text-gray-200' : 'bg-white border-gray-200 text-gray-900'}`}>
              <option value="">Toutes les priorités</option>
              <option value="low">Basse</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
            </select>
          </div>
          <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${isDark ? 'bg-space-950 border-space-700' : 'bg-white border-gray-200'}`}>
            <Search className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              value={q}
              onChange={(e) => { const v = e.target.value; setQ(v); syncToUrl({ q: v || undefined }); }}
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
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Aucun ticket pour le moment.</p>
            </div>
          ) : (
            tickets.map((t) => (
              <Link
                key={t.id}
                to={`/dashboard/tickets/${t.id}`}
                className={`group flex items-center justify-between gap-3 py-3 transition-colors ${
                  isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                } px-2 rounded-lg`}
              >
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t.subject}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={badgeClass(isDark, `status:${t.status}`)}>{STATUS_LABEL[t.status] || t.status}</span>
                    <span className={badgeClass(isDark, `prio:${t.priority}`)}>{PRIORITY_LABEL[t.priority] || t.priority}</span>
                    <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-500'}`}>#{t.id.slice(0, 8)}</span>
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

      <div
        id="new-ticket"
        className={`mt-6 rounded-2xl border overflow-hidden ${isDark ? 'bg-space-900 border-space-700/60' : 'bg-white border-gray-200'}`}
      >
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={`w-full flex items-center justify-between gap-3 px-4 py-3 border-b ${isDark ? 'border-space-700/60 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}
        >
          <div className="min-w-0 text-left">
            <p className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Créer un ticket</p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              {showCreate ? 'Renseigne le sujet et la description.' : 'Clique pour ouvrir le formulaire.'}
            </p>
          </div>
          <span className={`text-xs font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
            {showCreate ? 'Masquer' : 'Ouvrir'}
          </span>
        </button>

        {showCreate && (
          <div className="p-4">
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Sujet</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm ${isDark ? 'bg-space-950 border-space-700 text-gray-200' : 'bg-white border-gray-200 text-gray-900'}`}
                  placeholder="Ex: Problème de connexion WhatsApp"
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm ${isDark ? 'bg-space-950 border-space-700 text-gray-200' : 'bg-white border-gray-200 text-gray-900'}`}
                  placeholder="Décris le problème et les étapes pour le reproduire…"
                />
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className={`px-3 py-2 rounded-xl border text-sm ${isDark ? 'bg-space-950 border-space-700 text-gray-200' : 'bg-white border-gray-200 text-gray-900'}`}
                >
                  <option value="low">Priorité: basse</option>
                  <option value="medium">Priorité: moyenne</option>
                  <option value="high">Priorité: haute</option>
                </select>
                <button
                  type="submit"
                  disabled={creating || !subject.trim()}
                  className={`ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-60 ${
                    isDark ? 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/15' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  {creating ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

