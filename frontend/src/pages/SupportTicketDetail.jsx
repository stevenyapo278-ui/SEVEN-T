import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Send, LifeBuoy, User, Shield, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const STATUS_LABEL = { open: 'Ouvert', in_progress: 'En cours', waiting_on_customer: 'En attente client', resolved: 'Résolu', closed: 'Fermé' }
const PRIORITY_LABEL = { low: 'Basse', medium: 'Moyenne', high: 'Haute' }

export default function SupportTicketDetail() {
  const { isDark } = useTheme()
  const { user } = useAuth()
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  const canReply = useMemo(() => ticket && ticket.status !== 'closed' && (user?.permissions?.includes('support.tickets.reply') || user?.is_admin), [ticket, user])
  const canAssign = useMemo(() => Boolean(user?.permissions?.includes('support.tickets.assign') || user?.is_admin), [user])
  const canChangeStatus = useMemo(() => Boolean(user?.permissions?.includes('support.tickets.status') || user?.is_admin), [user])
  const [agents, setAgents] = useState([])
  const [updatingMeta, setUpdatingMeta] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/tickets/${id}`)
      setTicket(res.data.ticket)
      setMessages(res.data.messages || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!canAssign) return
    api.get('/admin/support-agents').then((r) => setAgents(r.data?.agents || [])).catch(() => {})
  }, [canAssign])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async (e) => {
    e.preventDefault()
    const msg = text.trim()
    if (!msg) return
    setSending(true)
    try {
      await api.post(`/admin/tickets/${id}/messages`, { message: msg })
      setText('')
      await load()
    } finally {
      setSending(false)
    }
  }

  const updateStatus = async (nextStatus) => {
    if (!canChangeStatus) return
    if (!nextStatus || nextStatus === ticket?.status) return
    setUpdatingMeta(true)
    try {
      await api.patch(`/admin/tickets/${id}/status`, { status: nextStatus })
      await load()
      toast.success('Statut mis à jour')
    } catch (err) {
      const msg = err?.response?.data?.error || 'Impossible de changer le statut'
      toast.error(msg)
    } finally {
      setUpdatingMeta(false)
    }
  }

  const updateAssign = async (assignedTo) => {
    if (!canAssign) return
    setUpdatingMeta(true)
    try {
      await api.patch(`/admin/tickets/${id}/assign`, { assigned_to: assignedTo })
      await load()
      toast.success('Assignation mise à jour')
    } catch (err) {
      const msg = err?.response?.data?.error || 'Impossible de changer l’assignation'
      toast.error(msg)
    } finally {
      setUpdatingMeta(false)
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link to="/dashboard/support" className={`mt-0.5 inline-flex items-center gap-2 text-sm ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`}>
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          <div className="min-w-0">
            <h1 className={`text-lg font-semibold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{ticket?.subject || 'Ticket'}</h1>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-500'}`}>
              Statut: <span className="font-semibold">{ticket ? (STATUS_LABEL[ticket.status] || ticket.status) : '—'}</span> · #{id?.slice(0, 8)} · {ticket?.user_email || ''}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-space-900 border-space-700/60' : 'bg-white border-gray-200'}`}>
          <div className={`px-4 py-3 border-b flex items-center gap-2 ${isDark ? 'border-space-700/60' : 'border-gray-200'}`}>
            <LifeBuoy className={`w-4 h-4 ${isDark ? 'text-gold-400' : 'text-amber-700'}`} />
            <p className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Conversation</p>
            <div className="ml-auto text-xs text-gray-500 flex items-center gap-2">
              {!!ticket?.updated_at && <span>Maj: {new Date(ticket.updated_at).toLocaleString('fr-FR')}</span>}
            </div>
          </div>

          <div className="px-4 py-4 space-y-3 max-h-[62vh] overflow-y-auto">
            {loading ? (
              <div className={`py-10 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Chargement...</div>
            ) : messages.length === 0 ? (
              <div className={`py-10 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Aucun message.</div>
            ) : (
              messages.map((m) => {
                const isUser = m.sender_role === 'user'
                const label = isUser ? (ticket?.user_name || 'Client') : (m.sender_role === 'admin' ? 'Admin' : (m.sender_name || 'Support'))
                return (
                  <div key={m.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap border ${
                      isUser
                        ? (isDark ? 'bg-space-950 text-gray-100 border-space-700' : 'bg-gray-50 text-gray-900 border-gray-200')
                        : (isDark ? 'bg-gold-400/15 text-gray-100 border-gold-400/30' : 'bg-amber-50 text-gray-900 border-amber-200')
                    }`}>
                      <div className="text-[10px] opacity-70 mb-1 flex items-center justify-between gap-2">
                        <span className="truncate">{label}</span>
                        <span className="opacity-70">{m.created_at ? new Date(m.created_at).toLocaleString('fr-FR') : ''}</span>
                      </div>
                      {m.message}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={send} className={`p-3 border-t flex items-end gap-2 ${isDark ? 'border-space-700/60' : 'border-gray-200'}`}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              disabled={!canReply}
              placeholder={canReply ? 'Écrire une réponse...' : 'Droits insuffisants ou ticket fermé'}
              className={`flex-1 resize-none px-3 py-2 rounded-xl border text-sm outline-none ${isDark ? 'bg-space-950 border-space-700 text-gray-100 placeholder:text-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'} disabled:opacity-70`}
            />
            <button
              type="submit"
              disabled={!canReply || sending || !text.trim()}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-60 ${
                isDark ? 'bg-gold-400/15 text-gold-400 border-gold-400/30 hover:bg-gold-400/20' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Send className="w-4 h-4" />
              Envoyer
            </button>
          </form>
        </div>

        <div className={`rounded-2xl border p-4 h-fit ${isDark ? 'bg-space-900 border-space-700/60' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Actions</p>
            <button
              type="button"
              onClick={load}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                isDark ? 'bg-space-950 border-space-700 text-gray-200 hover:bg-white/5' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${updatingMeta ? 'animate-spin' : ''}`} />
              Rafraîchir
            </button>
          </div>

          <div className="space-y-4">
            <div className={`rounded-2xl border p-3 ${isDark ? 'border-space-700/60 bg-space-950/30' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <User className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                <p className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Client</p>
              </div>
              <div className={`text-sm mt-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{ticket?.user_name || '—'}</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>{ticket?.user_email || '—'}</div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2">
                Statut
              </label>
              <select
                value={ticket?.status || 'open'}
                onChange={(e) => updateStatus(e.target.value)}
                disabled={!canChangeStatus || updatingMeta}
                className="input px-3 py-2 text-sm font-semibold disabled:opacity-60"
              >
                <option value="open">Ouvert</option>
                <option value="in_progress">En cours</option>
                <option value="waiting_on_customer">En attente client</option>
                <option value="resolved">Résolu</option>
                <option value="closed">Fermé</option>
              </select>
              <div className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                Priorité: <span className="font-semibold">{ticket?.priority ? (PRIORITY_LABEL[ticket.priority] || ticket.priority) : '—'}</span>
              </div>
            </div>

            {canAssign && (
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2">
                  Assignation
                </label>
                <select
                  value={ticket?.assigned_to || 'unassigned'}
                  onChange={(e) => updateAssign(e.target.value === 'unassigned' ? 'unassigned' : e.target.value)}
                  disabled={updatingMeta}
                  className="input px-3 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  <option value="unassigned">Non assigné</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name || a.email}</option>
                  ))}
                </select>
                <div className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                  Actuel: <span className="font-semibold">{ticket?.assigned_name || ticket?.assigned_email || '—'}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                <p className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Actions rapides</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateStatus('waiting_on_customer')}
                  disabled={!canChangeStatus || updatingMeta}
                  className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-60 ${
                    isDark ? 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/15' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Attente client
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus('resolved')}
                  disabled={!canChangeStatus || updatingMeta}
                  className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-60 ${
                    isDark ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Résolu
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus('closed')}
                  disabled={!canChangeStatus || updatingMeta}
                  className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-60 ${
                    isDark ? 'bg-gray-500/10 text-gray-200 border-gray-500/30 hover:bg-gray-500/15' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  Clôturer
                </button>
              </div>
              <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-600'}`}>
                “Attente client” = on attend une réponse du client. “Fermé” bloque les réponses. “Résolu” reste ré‑ouvrable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

