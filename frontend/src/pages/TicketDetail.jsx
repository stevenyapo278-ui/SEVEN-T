import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Send, LifeBuoy, Clock, Flag } from 'lucide-react'
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

export default function TicketDetail() {
  const { isDark } = useTheme()
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  const canReply = useMemo(() => ticket && ticket.status !== 'closed', [ticket])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/tickets/${id}`)
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async (e) => {
    e.preventDefault()
    const msg = text.trim()
    if (!msg) return
    setSending(true)
    try {
      await api.post(`/tickets/${id}/messages`, { message: msg })
      setText('')
      await load()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link to="/dashboard/tickets" className={`mt-0.5 inline-flex items-center gap-2 text-sm ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`}>
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          <div className="min-w-0">
            <h1 className={`text-lg font-semibold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{ticket?.subject || 'Ticket'}</h1>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-500'}`}>
              Statut: <span className="font-semibold">{ticket ? (STATUS_LABEL[ticket.status] || ticket.status) : '—'}</span> · #{id?.slice(0, 8)}
            </p>
            <div className={`flex items-center gap-3 mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              <span className="inline-flex items-center gap-1">
                <Flag className="w-3 h-3" />
                Priorité: <span className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{ticket?.priority ? (PRIORITY_LABEL[ticket.priority] || ticket.priority) : '—'}</span>
              </span>
              {!!ticket?.updated_at && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Maj: <span className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{new Date(ticket.updated_at).toLocaleString('fr-FR')}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-space-900 border-space-700/60' : 'bg-white border-gray-200'}`}>
        <div className={`px-4 py-3 border-b flex items-center gap-2 ${isDark ? 'border-space-700/60' : 'border-gray-200'}`}>
          <LifeBuoy className={`w-4 h-4 ${isDark ? 'text-blue-300' : 'text-blue-700'}`} />
          <p className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Conversation</p>
        </div>

        <div className="px-4 py-4 space-y-3 max-h-[55vh] overflow-y-auto">
          {loading ? (
            <div className={`py-10 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Chargement…</div>
          ) : messages.length === 0 ? (
            <div className={`py-10 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Aucun message.</div>
          ) : (
            messages.map((m) => {
              const isUser = m.sender_role === 'user'
              return (
                <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap border ${
                    isUser
                      ? (isDark ? 'bg-blue-500/15 text-gray-100 border-blue-500/30' : 'bg-blue-50 text-gray-900 border-blue-200')
                      : (isDark ? 'bg-space-950 text-gray-100 border-space-700' : 'bg-gray-50 text-gray-900 border-gray-200')
                  }`}>
                    <div className="text-[10px] opacity-70 mb-1 flex items-center justify-between gap-2">
                      <span className="truncate">{isUser ? 'Vous' : (m.sender_role === 'admin' ? 'Admin' : 'Support')}</span>
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
            placeholder={canReply ? 'Écrire une réponse…' : 'Ticket fermé'}
            className={`flex-1 resize-none px-3 py-2 rounded-xl border text-sm outline-none ${isDark ? 'bg-space-950 border-space-700 text-gray-100 placeholder:text-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'} disabled:opacity-70`}
          />
          <button
            type="submit"
            disabled={!canReply || sending || !text.trim()}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-60 ${
              isDark ? 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/15' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <Send className="w-4 h-4" />
            Envoyer
          </button>
        </form>
      </div>
    </div>
  )
}

