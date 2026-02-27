import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { MessageCircle, X, Send, Loader2, User, Mail, Phone, ChevronRight } from 'lucide-react'
import api from '../services/api'

const STORAGE_KEY = 'landing_chat_session_id'
const WELCOME_DELAY_MS = 2500
const PROACTIVE_BUBBLE_DELAY = 6000

export default function LandingChatbot() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0]

  const [open, setOpen] = useState(false)
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [messages, setMessages] = useState([])
  const [quickReplies, setQuickReplies] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [welcomeSent, setWelcomeSent] = useState(false)
  const [showProactive, setShowProactive] = useState(false)
  const [isLeadForm, setIsLeadForm] = useState(false)
  const [leadData, setLeadData] = useState({ name: '', email: '', phone: '' })
  
  const messagesEndRef = useRef(null)
  const welcomeTimerRef = useRef(null)
  const proactiveTimerRef = useRef(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  useEffect(() => {
    // Proactive bubble delay
    proactiveTimerRef.current = setTimeout(() => {
      if (!open) setShowProactive(true)
    }, PROACTIVE_BUBBLE_DELAY)

    return () => {
      if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current)
    }
  }, [open])

  useEffect(() => {
    if (open && messages.length === 0 && !welcomeSent) {
      setShowProactive(false)
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
    if (messages.length > 0 || isTyping) scrollToBottom()
  }, [messages, isTyping])

  const fetchWelcome = async () => {
    setIsTyping(true)
    try {
      const { data } = await api.post('/landing-chat', { language: lang })
      // Simulate thinking
      await new Promise(r => setTimeout(r, 1000))
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
      setIsTyping(false)
    }
  }

  const send = async (payload) => {
    setIsTyping(true)
    try {
      const { data } = await api.post('/landing-chat', {
        sessionId: sessionId || undefined,
        language: lang,
        ...payload,
      })
      
      // Simulate thinking time
      const delay = Math.max(800, Math.min(2000, data.reply?.length * 10 || 1000))
      await new Promise(r => setTimeout(r, delay))

      if (data.sessionId) {
        setSessionId(data.sessionId)
        localStorage.setItem(STORAGE_KEY, data.sessionId)
      }
      if (data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
      }
      setQuickReplies(data.quickReplies || [])
      setInput('')
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: t('chatbot.error') }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading || isTyping) return
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    send({ message: text })
  }

  const handleQuickReply = (qr) => {
    if (qr.id === 'goto_register') {
      window.location.href = '/register'
      return
    }
    if (qr.id === 'request_demo') {
        setIsLeadForm(true)
        return
    }
    setMessages((prev) => [...prev, { role: 'user', content: qr.label }])
    send({ action: qr.id })
  }

  const handleLeadSubmit = (e) => {
    e.preventDefault()
    if (!leadData.email || loading) return
    setMessages((prev) => [...prev, { role: 'user', content: `${leadData.name} - ${leadData.email}` }])
    send({ contact: leadData })
    setIsLeadForm(false)
  }

  if (!open) {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 translate-y-0 animate-fade-in duration-700">
        {showProactive && (
            <div className="relative group">
                <div onClick={() => setOpen(true)} className="cursor-pointer bg-space-900/90 backdrop-blur-md border border-space-700 px-4 py-3 rounded-2xl shadow-xl max-w-[200px] animate-bounce-subtle">
                    <p className="text-sm text-gray-100 font-medium">{t('chatbot.proactiveBubble')}</p>
                    <div className="absolute -bottom-1 right-6 w-3 h-3 bg-space-900 border-r border-b border-space-700 rotate-45"></div>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowProactive(false) }}
                    className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-space-800 border border-space-700 flex items-center justify-center text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        )}
        <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-400 via-amber-500 to-orange-500 text-space-950 shadow-2xl shadow-gold-400/20 hover:shadow-gold-400/40 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center relative overflow-hidden group"
            aria-label={t('chatbot.open')}
        >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <MessageCircle className="w-8 h-8 relative z-10" />
            <span className="absolute top-0 right-0 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-space-950"></span>
            </span>
        </button>
      </div>
    )
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-[380px] h-[580px] flex flex-col bg-space-950 border border-space-700/50 rounded-3xl shadow-2xl overflow-hidden animate-zoom-in"
      style={{ boxShadow: '0 30px 60px -12px rgba(0,0,0,0.6)' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-space-700/30 bg-space-900/60 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl overflow-hidden border border-gold-400/30">
              <img src="/ai-avatar.png" alt="AI Agent" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-space-900"></div>
          </div>
          <div>
            <p className="font-bold text-gray-100 text-sm tracking-tight">Assistant SEVEN T</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{t('chatbot.subtitle')}</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-space-800 transition-all active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in duration-300`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-gold-400 to-amber-600 text-space-950 font-medium shadow-lg shadow-gold-400/10'
                  : 'bg-space-900 border border-space-800 text-gray-200'
              }`}
            >
              {msg.content}
            </div>
            <span className="text-[10px] text-gray-600 mt-1 px-1">
                {msg.role === 'user' ? 'Vous' : 'AI Assistant'}
            </span>
          </div>
        ))}
        
        {isLeadForm && (
            <div className="bg-space-900 border border-space-800 rounded-2xl p-5 animate-fade-in duration-500">
                <h4 className="text-gray-100 font-bold text-sm mb-1">{t('chatbot.leadTitle')}</h4>
                <p className="text-xs text-gray-500 mb-4">{t('chatbot.leadSubtitle')}</p>
                <form onSubmit={handleLeadSubmit} className="space-y-3">
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type="text" 
                            placeholder={t('chatbot.leadName')}
                            value={leadData.name}
                            onChange={e => setLeadData({...leadData, name: e.target.value})}
                            className="w-full bg-space-800 border border-space-700 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-gold-400/50" 
                            required
                        />
                    </div>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type="email" 
                            placeholder={t('chatbot.leadEmail')}
                            value={leadData.email}
                            onChange={e => setLeadData({...leadData, email: e.target.value})}
                            className="w-full bg-space-800 border border-space-700 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-gold-400/50"
                            required
                        />
                    </div>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type="tel" 
                            placeholder={t('chatbot.leadPhone')}
                            value={leadData.phone}
                            onChange={e => setLeadData({...leadData, phone: e.target.value})}
                            className="w-full bg-space-800 border border-space-700 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-gold-400/50"
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-gold-400 to-amber-500 text-space-950 font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                        {t('chatbot.leadSubmit')}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setIsLeadForm(false)}
                        className="w-full text-xs text-gray-500 hover:text-gray-300 py-1"
                    >
                        {t('common.cancel')}
                    </button>
                </form>
            </div>
        )}

        {isTyping && (
          <div className="flex flex-col items-start animate-fade-in duration-300">
            <div className="bg-space-900 border border-space-800 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gold-400/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-gold-400/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-gold-400/60 rounded-full animate-bounce"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies */}
      {!isLeadForm && quickReplies.length > 0 && !isTyping && (
        <div className="px-5 pb-4 flex flex-wrap gap-2 animate-fade-in duration-500">
          {quickReplies.map((qr) => (
            qr.id === 'goto_register' || qr.id === 'create_account' ? (
              <Link
                key={qr.id}
                to="/register"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gold-400/20 border border-gold-400/30 text-gold-400 hover:bg-gold-400/30 text-xs font-bold transition-all hover:scale-105 active:scale-95"
              >
                {qr.label}
              </Link>
            ) : (
              <button
                key={qr.id}
                type="button"
                onClick={() => handleQuickReply(qr)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-space-900 border border-space-800 text-gray-400 hover:bg-space-800 hover:text-white text-xs font-semibold transition-all hover:scale-105 active:scale-95"
              >
                {qr.label}
              </button>
            )
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-space-700/30 bg-space-900/40 backdrop-blur-sm">
        <div className="flex gap-2 p-1.5 rounded-2xl bg-space-900 border border-space-800 focus-within:border-gold-400/40 focus-within:ring-4 focus-within:ring-gold-400/5 transition-all">
            <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={isLeadForm ? '...' : t('chatbot.placeholder')}
            disabled={isLeadForm || isTyping}
            className="flex-1 min-w-0 px-3 py-2 bg-transparent text-gray-100 placeholder-gray-600 focus:outline-none text-sm disabled:opacity-50"
            />
            <button
            type="button"
            onClick={handleSend}
            disabled={isTyping || !input.trim() || isLeadForm}
            className="p-2.5 rounded-xl bg-gradient-to-br from-gold-400 to-amber-600 text-space-950 font-bold hover:brightness-110 disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-gold-400/10 active:scale-90"
            aria-label={t('chatbot.send')}
            >
            <Send className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  )
}
