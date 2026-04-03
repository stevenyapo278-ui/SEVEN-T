import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Bot, X, Send, Sparkles, Loader2,
  CheckCircle2, AlertCircle, Package, UserPlus,
  Megaphone, LayoutDashboard, MessageSquare, Settings,
  ArrowRight, BarChart3, Zap, TrendingUp
} from 'lucide-react'
import api from '../../services/api'
import { useTheme } from '../../contexts/ThemeContext'
import toast from 'react-hot-toast'

// ─── Action executor: runs the action returned by the backend LLM ─────────────

async function executeAction(action, navigate, userId) {
  if (typeof action === 'string') {
    action = { type: action, data: {} }
  }
  if (!action?.type) return null

  switch (action.type) {
    case 'CREATE_PRODUCT': {
      const { name, price = 0, description = '' } = action.data || {}
      const res = await api.post('/products', {
        name,
        price: parseFloat(price) || 0,
        description: description || 'Créé via l\'assistant IA',
        status: 'active'
      })
      return {
        ok: true,
        icon: Package,
        color: 'emerald',
        label: `Produit "${name}" créé`,
        to: '/dashboard/products'
      }
    }

    case 'CREATE_LEAD': {
      const { name, phone = null, status = 'new' } = action.data || {}
      await api.post('/leads', { name, phone, source: 'AI Chatbot', status })
      return {
        ok: true,
        icon: UserPlus,
        color: 'blue',
        label: `Contact "${name}" ajouté`,
        to: '/dashboard/leads'
      }
    }

    case 'NAVIGATE': {
      const { to } = action.data || {}
      if (to) {
        navigate(to)
        return { ok: true, navigated: true }
      }
      return null
    }

    case 'SHOW_STATS': {
      const res = await api.get('/stats/dashboard')
      const s = res.data.stats
      return {
        ok: true,
        stats: s,
        icon: BarChart3,
        color: 'gold'
      }
    }

    default:
      return null
  }
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function renderMarkdown(text) {
  if (!text) return null
  return text.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.+?)\*\*/g)
    return (
      <p key={i} className={i > 0 ? 'mt-1' : ''}>
        {parts.map((part, j) =>
          j % 2 === 1
            ? <strong key={j} className="font-bold text-white">{part}</strong>
            : part
        )}
      </p>
    )
  })
}

function BotBubble({ msg, navigate, isDark }) {
  const { text, actionResult, isError } = msg

  const colorMap = {
    emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', icon: 'text-emerald-400' },
    blue:    { border: 'border-blue-500/30',    bg: 'bg-blue-500/10',    icon: 'text-blue-400' },
    gold:    { border: 'border-gold-400/30',    bg: 'bg-gold-400/10',    icon: 'text-gold-400' },
    red:     { border: 'border-red-500/30',     bg: 'bg-red-500/10',     icon: 'text-red-400' },
    default: { border: 'border-white/10',       bg: 'bg-white/5',        icon: 'text-gray-400' },
  }

  const color = isError ? colorMap.red : (actionResult?.color ? colorMap[actionResult.color] : colorMap.default)
  const Icon = isError ? AlertCircle : (actionResult?.icon || Bot)

  return (
    <div className="flex justify-start">
      <div className="flex gap-2.5 max-w-[88%]">
        <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${isDark ? 'bg-space-700' : 'bg-gray-100'}`}>
          <Bot className="w-4 h-4 text-gold-400" />
        </div>
        <div className={`flex-1 rounded-2xl rounded-tl-sm border px-4 py-3 ${color.bg} ${color.border}`}>
          {/* Action badge */}
          {actionResult?.label && (
            <div className={`flex items-center gap-1.5 mb-2 ${color.icon}`}>
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-bold">{actionResult.label}</span>
            </div>
          )}

          {/* Stats display */}
          {actionResult?.stats && (
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {[
                { label: 'Agents IA', value: actionResult.stats.agents?.total ?? 0 },
                { label: 'Conversations', value: actionResult.stats.conversations?.total ?? 0 },
                { label: 'Messages', value: actionResult.stats.messages?.total ?? 0 },
                { label: 'Crédits', value: actionResult.stats.credits ?? 0 },
              ].map(item => (
                <div key={item.label} className={`rounded-lg px-2 py-1.5 border ${isDark ? 'bg-space-800 border-space-700' : 'bg-white border-gray-200'}`}>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{item.label}</p>
                  <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Text response */}
          <div className="text-sm text-gray-400 leading-relaxed">
            {renderMarkdown(text)}
          </div>

          {/* CTA link */}
          {actionResult?.to && !actionResult.navigated && (
            <button
              onClick={() => navigate(actionResult.to)}
              className="mt-2.5 flex items-center gap-1 text-xs font-bold text-gold-400 hover:text-gold-300 transition-colors"
            >
              Voir <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function UserBubble({ text }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-gold-400 text-black px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm font-medium shadow-sm">
        {text}
      </div>
    </div>
  )
}

// ─── Main Chatbot Component ────────────────────────────────────────────────────

const WELCOME = {
  id: 'welcome',
  role: 'bot',
  text: `Bonjour ! Je suis votre assistant IA alimenté par vos modèles configurés.

Dites-moi ce que vous voulez faire :
- **Créer** un produit ou un contact
- **Naviguer** vers une page
- **Consulter** vos statistiques
- Ou posez-moi simplement une question !`,
  actionResult: null
}

export default function AIChatbot({ isOpen, onClose }) {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // History for backend context (last 8 messages)
  const historyRef = useRef([])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    // Add user message & reset input
    const userMsg = { id: Date.now(), role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Build history for LLM context
    const historyPayload = historyRef.current.slice(-8)

    try {
      // 1. Call backend LLM
      const { data } = await api.post('/chatbot/message', {
        message: text,
        history: historyPayload
      })

      const botText = data.response || 'Je n\'ai pas pu répondre.'
      let actionResult = null

      // 2. Execute the action if any
      if (data.action) {
        try {
          actionResult = await executeAction(data.action, navigate, null)
          if (actionResult?.navigated) {
            setTimeout(onClose, 600)
          }
        } catch (actionErr) {
          const errMsg = actionErr?.response?.data?.error || actionErr.message
          toast.error(`Action échouée : ${errMsg}`)
          actionResult = { ok: false, isError: true, label: `Erreur: ${errMsg}` }
        }
      }

      // 3. Add bot response
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        text: botText,
        actionResult,
        isError: actionResult?.ok === false
      }])

      // 4. Update history ref for next round
      historyRef.current = [
        ...historyRef.current,
        { role: 'user', content: text },
        { role: 'assistant', content: botText }
      ].slice(-16) // keep last 16 turns

    } catch (err) {
      const errMsg = err?.response?.data?.response || err?.response?.data?.error || 'Erreur inattendue. Réessayez.'
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        text: errMsg,
        actionResult: null,
        isError: true
      }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, navigate, onClose])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[998] pointer-events-none">
      {/* Backdrop (mobile touch outside to close) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 pointer-events-auto lg:pointer-events-none"
        onClick={onClose}
      />

      {/* Chat Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        className={`
          pointer-events-auto
          fixed bottom-24 right-6
          w-[400px] max-w-[calc(100vw-2rem)]
          flex flex-col
          rounded-2xl shadow-2xl border overflow-hidden
          ${isDark
            ? 'bg-space-900 border-space-700 shadow-black/60'
            : 'bg-white border-gray-200 shadow-gray-400/20'
          }
        `}
        style={{ maxHeight: 'min(600px, calc(100vh - 80px))', zIndex: 999 }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b flex-shrink-0 ${isDark ? 'border-space-700 bg-space-800/50' : 'border-gray-100 bg-gray-50'}`}>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gold-400/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-gold-400" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-space-900" />
            </div>
            <div>
              <p className={`text-sm font-bold leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Assistant IA
              </p>
              <p className="text-[10px] text-emerald-400 font-medium mt-0.5">● En ligne · Alimenté par vos modèles IA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-space-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
          style={{ minHeight: 0 }}
        >
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {msg.role === 'user'
                  ? <UserBubble text={msg.text} />
                  : <BotBubble msg={msg} navigate={navigate} isDark={isDark} />
                }
              </motion.div>
            ))}

            {loading && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-space-700' : 'bg-gray-100'}`}>
                  <Bot className="w-4 h-4 text-gold-400" />
                </div>
                <div className={`px-4 py-3 rounded-2xl rounded-tl-sm border ${isDark ? 'border-space-700 bg-space-800' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center gap-1.5">
                    {[0, 150, 300].map(delay => (
                      <div
                        key={delay}
                        className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Quick suggestions */}
        {messages.length === 1 && !loading && (
          <div className={`px-4 pb-1 flex gap-2 flex-wrap flex-shrink-0 border-t pt-3 ${isDark ? 'border-space-700' : 'border-gray-100'}`}>
            {[
              'Mes statistiques',
              'Voir mes contacts',
              'Créer un produit',
            ].map(suggestion => (
              <button
                key={suggestion}
                onClick={() => { setInput(suggestion); setTimeout(send, 50) }}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  isDark
                    ? 'border-space-700 text-gray-400 hover:border-gold-400/40 hover:text-white'
                    : 'border-gray-200 text-gray-500 hover:border-gold-400/60 hover:text-gray-900'
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className={`flex-shrink-0 px-3 py-3 border-t ${isDark ? 'border-space-700 bg-space-800/30' : 'border-gray-100 bg-gray-50/50'}`}>
          <div className={`flex items-end gap-2 rounded-xl border px-3 py-2 ${isDark ? 'border-space-700 bg-space-800' : 'border-gray-200 bg-white'}`}>
            <Sparkles className="w-4 h-4 text-gold-400 flex-shrink-0 mb-1" />
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Que voulez-vous faire ?"
              rows={1}
              disabled={loading}
              className={`flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed max-h-24 ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
              style={{ scrollbarWidth: 'none' }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-7 h-7 rounded-lg bg-gold-400 flex items-center justify-center transition-all hover:bg-gold-300 disabled:opacity-40 disabled:cursor-not-allowed mb-0.5"
            >
              {loading
                ? <Loader2 className="w-3.5 h-3.5 text-black animate-spin" />
                : <Send className="w-3.5 h-3.5 text-black" />
              }
            </button>
          </div>
          <p className={`text-[10px] text-center mt-1.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Entrée pour envoyer · Shift+Entrée pour nouvelle ligne
          </p>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
