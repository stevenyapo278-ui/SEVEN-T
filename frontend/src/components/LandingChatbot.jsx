/**
 * Landing page chatbot – conversion-oriented widget.
 * Auto welcome, guided questions, quick replies, optional lead capture (email/WhatsApp).
 * English + French via i18n; API: POST/GET /api/landing-chat.
 */
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import api from '../services/api'

const STORAGE_KEY = 'landing_chat_session_id'
const WELCOME_DELAY_MS = 2500

export default function LandingChatbot() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0]

  const [open, setOpen] = useState(false)
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [messages, setMessages] = useState([])
  const [quickReplies, setQuickReplies] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [welcomeSent, setWelcomeSent] = useState(false)
  const messagesEndRef = useRef(null)
  const welcomeTimerRef = useRef(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  useEffect(() => {
    if (open && messages.length === 0 && !welcomeSent) {
      welcomeTimerRef.current = setTimeout(() => {
        setWelcomeSent(true)
        fetchWelcome()
      }, WELCOME_DELAY_MS)
      return () => {
        if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current)
      }
    }
  }, [open, messages.length, welcomeSent])

  useEffect(() => {
    if (messages.length > 0) scrollToBottom()
  }, [messages])

  const fetchWelcome = async () => {
    setLoading(true)
    try {
      // Ne pas envoyer sessionId pour toujours recevoir le message de bienvenue à l'ouverture
      const { data } = await api.post('/landing-chat', {
        language: lang,
      })
      if (data.reply) setMessages([{ role: 'assistant', content: data.reply }])
      setQuickReplies(data.quickReplies || [])
      if (data.sessionId) {
        setSessionId(data.sessionId)
        localStorage.setItem(STORAGE_KEY, data.sessionId)
      }
    } catch (err) {
      setMessages([{ role: 'assistant', content: t('chatbot.welcome') }])
      setQuickReplies([
        { id: 'create_account', label: t('chatbot.createAccount') },
        { id: 'request_demo', label: t('chatbot.requestDemo') },
        { id: 'see_features', label: t('chatbot.seeFeatures') },
      ])
    } finally {
      setLoading(false)
    }
  }

  const send = async (payload) => {
    setLoading(true)
    try {
      const { data } = await api.post('/landing-chat', {
        sessionId: sessionId || undefined,
        language: lang,
        ...payload,
      })
      if (data.sessionId) {
        setSessionId(data.sessionId)
        localStorage.setItem(STORAGE_KEY, data.sessionId)
      }
      if (data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
      }
      setQuickReplies(data.quickReplies || [])
      setInput('')
      if (data.action === 'goto_register') {
        // Let the user read the message; they can click the chip to go
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: t('chatbot.error') }])
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading) return
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    send({ message: text })
  }

  const handleQuickReply = (qr) => {
    if (qr.id === 'goto_register') {
      window.location.href = '/register'
      return
    }
    setMessages((prev) => [...prev, { role: 'user', content: qr.label }])
    send({ action: qr.id })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-gold-400 to-amber-500 text-space-950 shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        aria-label={t('chatbot.open')}
      >
        <MessageCircle className="w-7 h-7" />
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-md h-[min(75vh,520px)] flex flex-col bg-space-900 border border-space-700 rounded-2xl shadow-2xl overflow-hidden"
      style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-space-700 bg-space-800/80">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-gold-400 to-amber-500 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-space-950" />
          </div>
          <div>
            <p className="font-semibold text-gray-100 text-sm">SEVEN T</p>
            <p className="text-xs text-gray-500">{t('chatbot.subtitle')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-space-700 transition-colors"
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-gold-400/20 to-amber-500/20 text-gray-100 border border-gold-400/30'
                  : 'bg-space-800 text-gray-200 border border-space-600'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-2.5 bg-space-800 border border-space-600">
              <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies */}
      {quickReplies.length > 0 && !loading && (
        <div className="flex-shrink-0 px-4 pb-2 flex flex-wrap gap-2">
          {quickReplies.map((qr) => (
            qr.id === 'goto_register' ? (
              <Link
                key={qr.id}
                to="/register"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold-400/20 border border-gold-400/40 text-gold-400 hover:bg-gold-400/30 text-sm font-medium transition-colors"
              >
                {qr.label}
              </Link>
            ) : (
              <button
                key={qr.id}
                type="button"
                onClick={() => handleQuickReply(qr)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-space-700 border border-space-600 text-gray-300 hover:bg-space-600 hover:border-space-500 text-sm font-medium transition-colors"
              >
                {qr.label}
              </button>
            )
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 p-3 border-t border-space-700 bg-space-800/50 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={t('chatbot.placeholder')}
          className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-space-800 border border-space-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/30 text-sm"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="p-2.5 rounded-xl bg-gradient-to-r from-gold-400 to-amber-500 text-space-950 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          aria-label={t('chatbot.send')}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
