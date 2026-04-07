import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { useConfirm } from '../contexts/ConfirmContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  BarChart2, Plus, Send, X, Trash2, CheckCircle2, Clock, Lock,
  Loader2, Users, RefreshCw, ChevronDown, Settings2, VoteIcon, UserPlus, UserCheck, History, Search, Target, Check, ChevronRight
} from 'lucide-react'
import ImportedContactsPicker from '../components/ImportedContactsPicker'

function safeJson(val, fallback) {
  if (!val) return fallback
  if (Array.isArray(val)) return val
  try { return JSON.parse(val) } catch { return fallback }
}

const STATUS_BADGE = {
  draft: { label: 'Brouillon', class: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  active: { label: 'Actif', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  closed: { label: 'Fermé', class: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

export default function Polls() {
  const { isDark } = useTheme()
  const { user } = useAuth()
  const { showConfirm } = useConfirm()
  const [polls, setPolls] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, closed: 0, totalVotes: 0 })
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedPoll, setSelectedPoll] = useState(null)
  const [agents, setAgents] = useState([])
  const [leads, setLeads] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPolls.length && filteredPolls.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredPolls.map(p => p.id)))
    }
  }

  const handleDeleteSelected = async () => {
    const count = selectedIds.size
    if (count === 0) return
    const ok = await showConfirm({
      title: `Supprimer ${count} sondage(s) ?`,
      message: `Cette action supprimera définitivement ${count} sondage(s) et toutes leurs données de vote.`,
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    setBulkLoading(true)
    try {
      await api.delete('/polls/bulk/delete', { data: { ids: Array.from(selectedIds) } })
      toast.success(`${count} sondage(s) supprimé(s)`)
      setSelectedIds(new Set())
      load()
    } catch { toast.error('Erreur lors de la suppression') }
    finally { setBulkLoading(false) }
  }

  const handleCloseSelected = async () => {
    const count = selectedIds.size
    if (count === 0) return
    setBulkLoading(true)
    try {
      await api.post('/polls/bulk/close', { ids: Array.from(selectedIds) })
      toast.success(`${count} sondage(s) fermé(s)`)
      setSelectedIds(new Set())
      load()
    } catch { toast.error('Erreur') }
    finally { setBulkLoading(false) }
  }

  const filteredPolls = polls.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.question.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pollsRes, statsRes, agentsRes, leadsRes] = await Promise.all([
        api.get('/polls' + (statusFilter ? `?status=${statusFilter}` : '')),
        api.get('/polls/stats/overview'),
        api.get('/agents'),
        api.get('/leads').catch(() => ({ data: { leads: [] } }))
      ])
      setPolls(pollsRes.data.polls || [])
      setStats(statsRes.data.stats || {})
      setAgents(agentsRes.data.agents || [])
      setLeads(leadsRes.data.leads || [])
    } catch {
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    const ok = await showConfirm({
      title: 'Supprimer ce sondage ?',
      message: 'Cette action est irréversible et supprimera toutes les données du sondage.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/polls/${id}`)
      toast.success('Sondage supprimé')
      load()
    } catch { toast.error('Erreur lors de la suppression') }
  }

  const handleClose = async (id) => {
    try {
      await api.post(`/polls/${id}/close`)
      toast.success('Sondage fermé')
      load()
    } catch { toast.error('Erreur') }
  }

  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0">
      {/* Header */}
      <div className={`relative rounded-2xl sm:rounded-3xl border p-4 sm:p-8 ${isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-violet-500/10 rounded-xl flex-shrink-0">
                <BarChart2 className="w-6 h-6 text-violet-400" />
              </div>
              <h1 className={`text-2xl sm:text-3xl font-display font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Sondages WhatsApp
              </h1>
            </div>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              Créez des sondages natifs WhatsApp et analysez les votes en temps réel.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/20 transition-all">
              <Plus className="w-5 h-5" />
              Nouveau sondage
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {[
            { label: 'Total', val: stats.total, icon: BarChart2, color: 'violet' },
            { label: 'Actifs', val: stats.active, icon: CheckCircle2, color: 'emerald' },
            { label: 'Fermés', val: stats.closed, icon: Lock, color: 'red' },
            { label: 'Votes', val: stats.totalVotes, icon: Users, color: 'blue' }
          ].map(({ label, val, icon: Icon, color }) => (
            <div key={label} className={`p-4 rounded-2xl border ${isDark ? 'bg-space-800/40 border-space-700/50' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className={`w-8 h-8 rounded-lg bg-${color}-500/10 flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 text-${color}-400`} />
              </div>
              <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{val ?? 0}</p>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 min-w-0">
        <div className={`flex-1 flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-300 ${
          isDark ? 'bg-space-800 border-space-700 focus-within:border-space-600' : 'bg-white border-gray-200'
        }`}>
          <button
            onClick={toggleSelectAll}
            className={`p-1.5 rounded-lg border transition-all flex items-center justify-center flex-shrink-0 ${
              selectedIds.size === filteredPolls.length && filteredPolls.length > 0
                ? 'bg-blue-500 border-blue-500 text-white'
                : isDark ? 'border-space-600 bg-space-800/50' : 'border-gray-200 bg-gray-50'
            }`}
            title="Tout sélectionner"
          >
            <Check className={`w-4 h-4 ${selectedIds.size === filteredPolls.length && filteredPolls.length > 0 ? 'opacity-100' : 'opacity-0'}`} />
          </button>
          <Search className="w-4 h-4 text-gray-500" />
          <input 
            type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un sondage..."
            className="bg-transparent border-none p-0 focus:ring-0 w-full text-base placeholder:text-gray-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[['', 'Tous'], ['draft', 'Brouillons'], ['active', 'Actifs'], ['closed', 'Fermés']].map(([val, l]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${statusFilter === val
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                : isDark ? 'bg-space-800 text-gray-400 hover:bg-space-700' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-violet-500" /></div>
      ) : polls.length === 0 ? (
        <div className={`p-12 rounded-3xl border-2 border-dashed text-center ${isDark ? 'border-space-700' : 'border-gray-200'}`}>
          <BarChart2 className="w-12 h-12 text-violet-400 opacity-30 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Aucun sondage</h3>
          <p className="text-gray-500 mb-6">Créez votre premier sondage WhatsApp natif.</p>
          <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-violet-600 text-white rounded-2xl font-semibold hover:bg-violet-500 transition-all">
            Créer un sondage
          </button>
        </div>
      ) : (
        <>
          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className={`sticky top-4 z-40 flex items-center justify-between p-3 sm:p-4 mb-6 rounded-2xl shadow-2xl animate-slideUp border ${
              isDark ? 'bg-space-800 border-blue-500/50 text-white' : 'bg-white border-blue-200 text-gray-900'
            }`}>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500 text-white font-bold text-sm sm:text-base">
                  {selectedIds.size}
                </div>
                <div className="hidden sm:block">
                  <p className="font-bold text-sm">Sondages sélectionnés</p>
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Actions groupées</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                    isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  Désélectionner
                </button>
                <button
                  onClick={handleCloseSelected}
                  disabled={bulkLoading}
                  className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20 text-xs sm:text-sm"
                >
                  <Lock className="w-4 h-4" />
                  <span className="hidden xs:inline">Fermer</span>
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={bulkLoading}
                  className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/20 text-xs sm:text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden xs:inline">Supprimer</span>
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPolls.map(poll => {
            const results = safeJson(poll.results, [])
            const topResult = [...results].sort((a, b) => (b.count || 0) - (a.count || 0))[0]
            const badge = STATUS_BADGE[poll.status] || STATUS_BADGE.draft
            const isSelected = selectedIds.has(poll.id)
            return (
              <div key={poll.id}
                className={`group relative p-5 rounded-3xl border transition-all duration-300 cursor-pointer hover:shadow-xl ${isSelected ? 'bg-violet-500/10 border-violet-500/50' : isDark ? 'bg-space-800/40 border-space-700/50 hover:bg-space-800/70 hover:border-violet-500/30' : 'bg-white border-gray-100 hover:shadow-violet-100 hover:border-violet-200'}`}
                onClick={() => setSelectedPoll(poll)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelect(poll.id); }}
                      className={`w-6 h-6 flex-shrink-0 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : isDark ? 'border-space-600 bg-space-900/50 hover:border-space-500' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.class}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    {poll.status === 'active' && (
                      <button onClick={() => handleClose(poll.id)} className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg" title="Fermer">
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(poll.id)} className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg" title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className={`font-bold text-base mb-1 line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{poll.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{poll.question}</p>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{poll.total_votes ?? 0} votes</span>
                  <span>{safeJson(poll.options, []).length} options</span>
                  <span className="text-gray-600 font-mono">{poll.agent_name}</span>
                </div>

                {results.length > 0 && topResult && (
                  <div className="space-y-1.5">
                    {results.slice(0, 3).map(r => {
                      const pct = poll.total_votes > 0 ? Math.round((r.count / poll.total_votes) * 100) : 0
                      return (
                        <div key={r.name}>
                          <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                            <span className="truncate max-w-[140px]">{r.name}</span>
                            <span className="font-bold">{pct}%</span>
                          </div>
                          <div className={`h-1.5 rounded-full ${isDark ? 'bg-space-700' : 'bg-gray-100'}`}>
                            <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
          </div>
        </>
      )}

      {/* Create Modal */}
      {showCreate && createPortal(
        <CreatePollModal agents={agents} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); load() }} isDark={isDark} />,
        document.body
      )}

      {/* Detail Modal */}
      {selectedPoll && createPortal(
        <PollDetailModal poll={selectedPoll} leads={leads} onClose={() => setSelectedPoll(null)} onRefresh={load} isDark={isDark} />,
        document.body
      )}
    </div>
  )
}

/* ── Create Poll Modal ─────────────────────────────────────────── */
function CreatePollModal({ agents, onClose, onSuccess, isDark }) {
  const [form, setForm] = useState({ agent_id: agents[0]?.id || '', title: '', question: '', options: ['', ''], allow_multiple: false })
  const [saving, setSaving] = useState(false)

  const addOption = () => form.options.length < 12 && setForm(f => ({ ...f, options: [...f.options, ''] }))
  const removeOption = (i) => form.options.length > 2 && setForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }))
  const setOption = (i, val) => setForm(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? val : o) }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const opts = form.options.map(o => o.trim()).filter(Boolean)
    if (opts.length < 2) return toast.error('Au moins 2 options requises')
    setSaving(true)
    try {
      await api.post('/polls', { ...form, options: opts })
      toast.success('Sondage créé !')
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className={`relative z-10 w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden ${isDark ? 'bg-space-900 border-space-700' : 'bg-white border-gray-100'}`} onClick={e => e.stopPropagation()}>
        <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-space-700' : 'border-gray-100'}`}>
          <h2 className="font-bold text-lg flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-violet-400" />
            Nouveau sondage
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-space-800 rounded-xl transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Agent WhatsApp</label>
            <select value={form.agent_id} onChange={e => setForm(f => ({ ...f, agent_id: e.target.value }))} className={`w-full px-4 py-3 rounded-2xl border bg-transparent outline-none focus:ring-2 focus:ring-violet-500 ${isDark ? 'border-space-700 text-white' : 'border-gray-200'}`} required>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Titre (interne)</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={`w-full px-4 py-3 rounded-2xl border bg-transparent outline-none focus:ring-2 focus:ring-violet-500 ${isDark ? 'border-space-700 text-white' : 'border-gray-200'}`} placeholder="Ex: Sondage satisfaction client" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Question du sondage</label>
            <input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} className={`w-full px-4 py-3 rounded-2xl border bg-transparent outline-none focus:ring-2 focus:ring-violet-500 ${isDark ? 'border-space-700 text-white' : 'border-gray-200'}`} placeholder="Que pensez-vous de notre service ?" required />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Options ({form.options.length}/12)</label>
              <button type="button" onClick={addOption} className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1">
                <Plus className="w-3 h-3" /> Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-5 text-center font-bold">{i + 1}</span>
                  <input value={opt} onChange={e => setOption(i, e.target.value)} className={`flex-1 px-3 py-2.5 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-violet-500 text-sm ${isDark ? 'border-space-700 text-white' : 'border-gray-200'}`} placeholder={`Option ${i + 1}`} />
                  {form.options.length > 2 && (
                    <button type="button" onClick={() => removeOption(i)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`relative w-10 h-5 rounded-full transition-colors ${form.allow_multiple ? 'bg-violet-500' : isDark ? 'bg-space-700' : 'bg-gray-200'}`} onClick={() => setForm(f => ({ ...f, allow_multiple: !f.allow_multiple }))}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.allow_multiple ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-gray-400">Permettre plusieurs réponses</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className={`flex-1 py-3 rounded-2xl font-semibold transition-all ${isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-semibold shadow-lg shadow-violet-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Poll Detail Modal ─────────────────────────────────────────── */
function PollDetailModal({ poll: initialPoll, leads, onClose, onRefresh, isDark }) {
  const { showConfirm } = useConfirm()
  const [poll, setPoll] = useState(initialPoll)
  const [sending, setSending] = useState(false)
  const [jid, setJid] = useState('')
  const [selectedContacts, setSelectedContacts] = useState(new Map())
  const [showLeadSelect, setShowLeadSelect] = useState(false)
  const [contactPickerOpen, setContactPickerOpen] = useState(false)
  const [leadSearch, setLeadSearch] = useState('')

  const results = safeJson(poll.results, [])
  const options = safeJson(poll.options, [])

  const refresh = async () => {
    try {
      const res = await api.get(`/polls/${poll.id}`)
      setPoll(res.data.poll)
    } catch {}
  }

  useEffect(() => {
    const iv = setInterval(refresh, 8000)
    return () => clearInterval(iv)
  }, [poll.id])

  const handleSend = async (targetJids) => {
    if (!targetJids || (Array.isArray(targetJids) && targetJids.length === 0)) {
       if (!jid.trim()) return toast.error('Entrez un numéro ou sélectionnez des contacts')
       targetJids = [jid.trim()]
    }
    
    setSending(true)
    try {
      await api.post(`/polls/${poll.id}/send`, { jids: Array.isArray(targetJids) ? targetJids : [targetJids] })
      toast.success('Sondage envoyé !')
      await refresh()
      onRefresh()
      setJid('')
      setJid('')
      setSelectedContacts(new Map())
      setShowLeadSelect(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur envoi')
    } finally { setSending(false) }
  }

  const normalizePhone = (p) => String(p || '').replace(/\D/g, '')

  const toggleContact = (c) => {
    const rawPhone = c.phone || c.contact_number || c.number
    if (!rawPhone) return
    const phone = normalizePhone(rawPhone)
    const next = new Map(selectedContacts)
    if (next.has(phone)) next.delete(phone)
    else next.set(phone, { 
      name: c.name || c.contact_name || 'Inconnu', 
      phone: rawPhone, 
      jid: c.jid || (phone + '@s.whatsapp.net') 
    })
    setSelectedContacts(next)
  }

  const handleClose = async () => {
    try {
      await api.post(`/polls/${poll.id}/close`)
      toast.success('Sondage fermé')
      await refresh()
      onRefresh()
    } catch { toast.error('Erreur') }
  }

  const badge = STATUS_BADGE[poll.status] || STATUS_BADGE.draft

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className={`relative z-10 w-full max-w-xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[90dvh] ${isDark ? 'bg-space-900 border-space-700' : 'bg-white border-gray-100'}`} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={`p-5 border-b flex-shrink-0 ${isDark ? 'border-space-700' : 'border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <BarChart2 className="w-5 h-5 text-violet-400" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-base truncate">{poll.title}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.class}`}>{badge.label}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-space-800 rounded-xl transition-colors flex-shrink-0 ml-2"><X className="w-4 h-4 text-gray-400" /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Question */}
          <div className={`p-4 rounded-2xl ${isDark ? 'bg-space-800/60 border border-space-700' : 'bg-violet-50 border border-violet-100'}`}>
            <p className="text-xs font-bold text-violet-400 uppercase mb-1 tracking-wider">Question</p>
            <p className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{poll.question}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{poll.total_votes ?? 0} votes</span>
              <span>{poll.allow_multiple ? 'Choix multiple' : 'Choix unique'}</span>
              <span>{poll.agent_name}</span>
            </div>
          </div>

          {/* Results */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Résultats</h4>
            <div className="space-y-3">
              {options.map(opt => {
                const r = results.find(res => res.name === opt) || { count: 0 }
                const pct = poll.total_votes > 0 ? Math.round((r.count / poll.total_votes) * 100) : 0
                return (
                  <div key={opt}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{opt}</span>
                      <span className="font-bold text-violet-400">{r.count} vote{r.count !== 1 ? 's' : ''} • {pct}%</span>
                    </div>
                    <div className={`h-2 rounded-full ${isDark ? 'bg-space-700' : 'bg-gray-100'}`}>
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Send form */}
          {poll.status !== 'closed' && (
            <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${isDark ? 'border-space-700 bg-space-800/40' : 'border-gray-100 bg-gray-50'}`}>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Send className="w-3 h-3" /> Envoyer le sondage
              </h4>
              
              <div className="flex gap-2">
                <input
                  value={jid}
                  onChange={e => setJid(e.target.value)}
                  placeholder="Numéro (ex: 225...)"
                  className={`flex-1 px-3 py-2.5 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-violet-500 text-sm ${isDark ? 'border-space-600 text-white' : 'border-gray-200'}`}
                />
                <button 
                  onClick={() => handleSend([jid.trim()])} 
                  disabled={sending || !jid.trim()} 
                  className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setContactPickerOpen(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all ${isDark ? 'bg-space-800 border-space-700 text-gray-300 hover:bg-space-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  <Users className="w-3.5 h-3.5" /> Importés
                </button>
                <button 
                  onClick={() => setShowLeadSelect(!showLeadSelect)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all ${showLeadSelect ? 'bg-violet-600 border-violet-500 text-white' : isDark ? 'bg-space-800 border-space-700 text-gray-300 hover:bg-space-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Mes Leads
                </button>
              </div>

              {showLeadSelect && (
                <div className="animate-slideDown space-y-3 pt-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="Chercher un lead..."
                      value={leadSearch}
                      onChange={e => setLeadSearch(e.target.value)}
                      className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border bg-transparent focus:ring-1 focus:ring-violet-500 outline-none ${isDark ? 'border-space-700 text-white' : 'border-gray-200'}`}
                    />
                  </div>
                  <div className="max-h-[180px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {leads
                      .filter(l => l.phone && (l.name?.toLowerCase().includes(leadSearch.toLowerCase()) || l.phone.includes(leadSearch)))
                      .map(l => (
                      <label key={l.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selectedContacts.has(normalizePhone(l.phone)) ? 'bg-violet-500/10 border border-violet-500/20' : 'hover:bg-white/5'}`}>
                        <input 
                          type="checkbox" 
                          checked={selectedContacts.has(normalizePhone(l.phone))}
                          onChange={() => toggleContact(l)}
                          className="w-3.5 h-3.5 rounded border-gray-700 bg-black/20 text-violet-500"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-gray-200 truncate">{l.name || 'Inconnu'}</p>
                          <p className="text-[9px] font-mono text-gray-500">{l.phone}</p>
                        </div>
                      </label>
                    ))}
                  {leads.filter(l => l.phone).length === 0 && <p className="text-[10px] text-gray-500 text-center py-2">Aucun lead trouvé</p>}
                </div>
              </div>
            )}

            {selectedContacts.size > 0 && (
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'} mb-4 animate-fadeIn`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">
                      {selectedContacts.size}
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Destinataires</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedContacts(new Map()); }} 
                    className="text-[10px] font-black text-gray-500 hover:text-red-400 uppercase tracking-widest transition-colors"
                  >
                    Vider
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1 custom-scrollbar">
                  {Array.from(selectedContacts.values()).map(c => (
                    <div key={normalizePhone(c.phone)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-space-800 border border-white/5 text-[10px] text-gray-300">
                      <span className="font-bold truncate max-w-[100px]">{c.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); toggleContact(c); }} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedContacts.size > 0 && (
              <button 
                onClick={() => handleSend(Array.from(selectedContacts.values()).map(c => c.jid || c.phone))}
                disabled={sending}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-violet-500/20 transition-all flex items-center justify-center gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer à {selectedContacts.size} contact(s)
              </button>
            )}
              )}
            </div>
          )}
          <ImportedContactsPicker 
            open={contactPickerOpen}
            onClose={() => setContactPickerOpen(false)}
            agentId={poll.agent_id}
            title="Contacts Importés"
            mode="multi"
            onSelect={(contacts) => {
              setContactPickerOpen(false)
              setSelectedContacts(prev => {
                const next = new Map(prev)
                contacts.forEach(c => {
                  const rawPhone = c.contact_number || c.number
                  if (rawPhone) {
                    const phone = normalizePhone(rawPhone)
                    next.set(phone, { 
                      name: c.contact_name || c.name || 'Inconnu', 
                      phone: rawPhone, 
                      jid: c.jid || (phone + '@s.whatsapp.net') 
                    })
                  }
                })
                return next
              })
            }}
          />
        </div>

        {/* Footer actions */}
        <div className={`p-4 border-t flex-shrink-0 flex gap-3 ${isDark ? 'border-space-700' : 'border-gray-100'}`}>
          {poll.status === 'active' && (
            <button onClick={handleClose} className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" /> Fermer le sondage
            </button>
          )}
          <button onClick={async () => {
            const ok = await showConfirm({
              title: 'Confirmer la suppression ?',
              message: 'Cette action est irréversible.',
              variant: 'danger',
              confirmLabel: 'Supprimer'
            })
            if (ok) {
              try {
                await api.delete(`/polls/${poll.id}`)
                toast.success('Sondage supprimé')
                onRefresh()
                onClose()
              } catch { toast.error('Erreur') }
            }
          }} className="py-3 px-5 rounded-2xl text-sm font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={refresh} className={`py-3 px-5 rounded-2xl text-sm font-semibold transition-all ${isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
